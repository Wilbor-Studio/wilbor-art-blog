'use client';

import Markdown from '@/components/Markdown';
import type { Operation } from '@hiveio/dhive';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHiveAuth } from './HiveAuthProvider';
import {
  broadcastOperations,
  createPermlink,
  mediaToMarkdown,
  normalizeTags,
  removeUrlFromMarkdown,
  transformExternalMedia,
  uploadMediaToIpfs,
} from './hive-post';

type EditorMode = 'create' | 'edit';

interface NewMedia {
  id: string;
  file: File;
  preview: string;
  isVideo: boolean;
  url?: string;
  status: 'uploading' | 'done' | 'error';
}

type ThumbnailChoice =
  | { source: 'existing'; index: number }
  | { source: 'new'; id: string }
  | null;

export interface HivePostEditorProps {
  mode: EditorMode;
  onClose: () => void;
  /** Chamado após publicar/salvar com sucesso. */
  onSaved?: () => void;
  /** Obrigatórios no modo edit. */
  permlink?: string;
  author?: string;
  initialTitle?: string;
  initialContent?: string;
  initialTags?: string[];
  initialImages?: string[];
  initialThumbnail?: string;
}

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime';

export default function HivePostEditor({
  mode,
  onClose,
  onSaved,
  permlink,
  author,
  initialTitle = '',
  initialContent = '',
  initialTags = [],
  initialImages = [],
  initialThumbnail,
}: HivePostEditorProps) {
  const { username, postingKey } = useHiveAuth();

  // A thumbnail declarada no metadata pode não estar na lista de imagens.
  const existingImages = useMemo(() => {
    if (initialThumbnail && !initialImages.includes(initialThumbnail)) {
      return [initialThumbnail, ...initialImages];
    }
    return initialImages;
  }, [initialImages, initialThumbnail]);

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [tags, setTags] = useState<string[]>(() => normalizeTags(initialTags));
  const [tagInput, setTagInput] = useState('');
  const [newMedia, setNewMedia] = useState<NewMedia[]>([]);
  const [thumbnailChoice, setThumbnailChoice] = useState<ThumbnailChoice>(
    existingImages.length > 0 ? { source: 'existing', index: 0 } : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const gifInputRef = useRef<HTMLInputElement | null>(null);
  const previewsRef = useRef<string[]>([]);

  const isUploading = newMedia.some(item => item.status === 'uploading');

  // Trava o scroll do site enquanto o editor está aberto
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.setProperty('overflow', 'hidden', 'important');
    body.style.setProperty('overflow', 'hidden', 'important');
    return () => {
      html.style.setProperty('overflow', previousHtmlOverflow);
      body.style.setProperty('overflow', previousBodyOverflow);
    };
  }, []);

  // Libera as URLs de preview ao desmontar
  useEffect(() => () => {
    previewsRef.current.forEach(preview => URL.revokeObjectURL(preview));
  }, []);

  function addTagsFromInput(raw: string) {
    const pieces = raw.split(/[,\s]+/g).map(piece => piece.trim()).filter(Boolean);
    if (pieces.length === 0) return;
    setTags(prev => normalizeTags([...prev, ...pieces]));
    setTagInput('');
  }

  function handleTagKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTagsFromInput(tagInput);
    }
  }

  function applyMarkdown(type: string) {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selected = content.slice(start, end);

    const commit = (next: string, cursor: number) => {
      setContent(next);
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
    };

    const wrap = (before: string, after: string = before) => commit(
      content.slice(0, start) + before + selected + after + content.slice(end),
      start + before.length + selected.length,
    );

    const insertLine = (prefix: string) => commit(
      content.slice(0, start) + prefix + selected + content.slice(end),
      start + prefix.length + selected.length,
    );

    const actions: Record<string, () => void> = {
      h1: () => insertLine('# '),
      bold: () => wrap('**'),
      italic: () => wrap('*'),
      strike: () => wrap('~~'),
      code: () => wrap('`'),
      codeblock: () => wrap('\n```\n', '\n```\n'),
      quote: () => insertLine('> '),
      ul: () => insertLine('- '),
      ol: () => insertLine('1. '),
      link: () => wrap('[', '](url)'),
      hr: () => insertLine('\n\n---\n\n'),
    };

    actions[type]?.();
  }

  const processFiles = useCallback(async (files: File[]) => {
    const accepted = files.filter(file =>
      file.type.startsWith('image/') || file.type.startsWith('video/'));
    if (accepted.length === 0) return;

    const entries: NewMedia[] = accepted.map(file => {
      const preview = URL.createObjectURL(file);
      previewsRef.current.push(preview);
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        preview,
        isVideo: file.type.startsWith('video/'),
        status: 'uploading' as const,
      };
    });

    setNewMedia(prev => [...prev, ...entries]);
    setError(null);

    await Promise.all(entries.map(async entry => {
      try {
        const url = await uploadMediaToIpfs(entry.file);
        setNewMedia(prev => prev.map(item =>
          item.id === entry.id ? { ...item, url, status: 'done' } : item));
        setContent(prev => [
          prev.trim(),
          mediaToMarkdown([{ url, isVideo: entry.isVideo }]),
        ].filter(Boolean).join('\n\n'));
      } catch (uploadError) {
        setNewMedia(prev => prev.map(item =>
          item.id === entry.id ? { ...item, status: 'error' } : item));
        setError(uploadError instanceof Error
          ? uploadError.message
          : 'Falha ao enviar mídia.');
      }
    }));
  }, []);

  async function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    await processFiles(files);
  }

  function removeMedia(id: string) {
    setNewMedia(prev => {
      const target = prev.find(item => item.id === id);
      if (target?.url) {
        setContent(current => removeUrlFromMarkdown(current, target.url!));
      }
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter(item => item.id !== id);
    });
    setThumbnailChoice(prev =>
      prev?.source === 'new' && prev.id === id ? null : prev);
  }

  const thumbnailCandidates = useMemo(() => ([
    ...existingImages.map((url, index) => ({
      key: `existing-${index}`,
      preview: url,
      choice: { source: 'existing' as const, index },
    })),
    ...newMedia
      .filter(item => !item.isVideo && item.status === 'done')
      .map(item => ({
        key: `new-${item.id}`,
        preview: item.preview,
        choice: { source: 'new' as const, id: item.id },
      })),
  ]), [existingImages, newMedia]);

  function isChosen(choice: NonNullable<ThumbnailChoice>) {
    if (!thumbnailChoice || thumbnailChoice.source !== choice.source) return false;
    if (choice.source === 'existing' && thumbnailChoice.source === 'existing') {
      return thumbnailChoice.index === choice.index;
    }
    if (choice.source === 'new' && thumbnailChoice.source === 'new') {
      return thumbnailChoice.id === choice.id;
    }
    return false;
  }

  async function handleSubmit() {
    if (!username) {
      setError('Sessão expirada. Entre novamente.');
      return;
    }
    if (!title.trim()) {
      setError('Título obrigatório.');
      return;
    }
    if (isUploading) {
      setError('Aguarde o envio das mídias terminar.');
      return;
    }

    const pendingTags = tagInput.trim()
      ? normalizeTags([...tags, ...tagInput.split(/[,\s]+/g)])
      : normalizeTags(tags);

    if (pendingTags.length === 0) {
      setError(`Adicione pelo menos 1 tag antes de ${mode === 'create' ? 'publicar' : 'salvar'}.`);
      return;
    }

    // No modo criar, o permlink normalmente sai do título. Quando vem por
    // prop, é conteúdo do site, que precisa de endereço fixo para a página
    // sempre encontrar o mesmo post.
    const targetPermlink = permlink || createPermlink(title);
    if (!targetPermlink) {
      setError('Permlink do post não encontrado.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const uploaded = newMedia
        .filter(item => item.status === 'done' && item.url)
        .map(item => ({ url: item.url!, isVideo: item.isVideo, id: item.id }));

      const newImageUrls = uploaded.filter(item => !item.isVideo).map(item => item.url);
      const allImages = [...existingImages, ...newImageUrls];

      let selectedThumbnail: string | undefined;
      if (thumbnailChoice?.source === 'existing') {
        selectedThumbnail = existingImages[thumbnailChoice.index];
      } else if (thumbnailChoice?.source === 'new') {
        selectedThumbnail = uploaded.find(item => item.id === thumbnailChoice.id)?.url;
      }
      if (!selectedThumbnail) selectedThumbnail = allImages[0];

      // A thumbnail é mantida no corpo: o carrossel do site monta a galeria a
      // partir de [thumbnail, ...imagens do corpo] e deduplica, então manter
      // deixa a edição idempotente (salvar sem mudar nada não altera o post).
      const enrichedContent = transformExternalMedia(content.trim());
      const missingMedia = uploaded.filter(item => !enrichedContent.includes(item.url));
      const finalBody = [enrichedContent, mediaToMarkdown(missingMedia)]
        .filter(Boolean)
        .join('\n\n');

      const orderedImages = selectedThumbnail
        ? [selectedThumbnail, ...allImages.filter(url => url !== selectedThumbnail)]
        : allImages;

      const metadata: Record<string, unknown> = {
        app: 'wilbor.art',
        tags: pendingTags,
        image: orderedImages,
        ...selectedThumbnail && { thumbnail: selectedThumbnail },
      };

      const operations: Operation[] = [[
        'comment',
        {
          parent_author: '',
          parent_permlink: pendingTags[0],
          author: mode === 'edit' ? (author || username) : username,
          permlink: targetPermlink,
          title: title.trim(),
          body: finalBody,
          json_metadata: JSON.stringify(metadata),
        },
      ]];

      await broadcastOperations(username, operations, postingKey);

      onSaved?.();
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error
        ? submitError.message
        : `Falha ao ${mode === 'create' ? 'publicar' : 'salvar'}.`);
    } finally {
      setIsSubmitting(false);
    }
  }

  const toolbarButton =
    'text-xs text-zinc-200 px-1.5 py-0.5 rounded hover:bg-zinc-800 hover:text-white';

  return (
    <div
      className="wilbor-admin fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-0 sm:p-4"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'create' ? 'Criar projeto' : 'Editar projeto'}
    >
      <div className="relative w-full h-full sm:h-auto sm:max-h-[95vh] max-w-[1400px] flex flex-col bg-zinc-900 sm:rounded-xl border border-zinc-700/70 shadow-2xl overflow-hidden">

        {/* Cabeçalho */}
        <div className="flex items-center gap-3 px-4 md:px-5 py-3 border-b border-zinc-800 flex-shrink-0">
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-500 whitespace-nowrap">
            {mode === 'create' ? 'novo projeto' : 'editar'}
          </span>
          <input
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder="Título"
            aria-label="Título"
            className="flex-1 h-10 rounded-lg bg-zinc-800/80 border border-zinc-700 px-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-5 py-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2 items-start">

              {/* Editor */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 overflow-hidden shadow-inner flex flex-col h-[45vh] lg:h-[62vh] min-h-[280px]">
                <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800/80 px-2 py-1.5">
                  <button
                    type="button"
                    className={toolbarButton}
                    onClick={() => imageInputRef.current?.click()}
                    title="Imagem"
                    aria-label="Inserir imagem"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                      <path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 9.5A1.5 1.5 0 1 1 10 8a1.5 1.5 0 0 1-1.5 1.5ZM5 19l4.5-6 3.5 4.5 2.5-3L19 19Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={toolbarButton}
                    onClick={() => videoInputRef.current?.click()}
                    title="Vídeo"
                    aria-label="Inserir vídeo"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                      <path fill="currentColor" d="M17 10.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5l4 4v-11Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={toolbarButton}
                    onClick={() => gifInputRef.current?.click()}
                    title="GIF"
                    aria-label="Inserir GIF"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
                      <path fill="currentColor" d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3.5 6.5v3h2.5v-1h-1.5v-.5h1.5v-1h-2.5Zm4 0v3h1v-1h1.5a1 1 0 0 0 0-2H11.5Zm1 1h1.5v-.5H12.5v.5ZM16.5 11.5v3h1v-3h-1Z" />
                    </svg>
                  </button>
                  <span className="h-4 w-px bg-zinc-700 mx-1" aria-hidden="true" />
                  <button type="button" className={toolbarButton} onClick={() => applyMarkdown('h1')} title="Título">H</button>
                  <button type="button" className={`${toolbarButton} font-bold`} onClick={() => applyMarkdown('bold')} title="Negrito">B</button>
                  <button type="button" className={`${toolbarButton} italic`} onClick={() => applyMarkdown('italic')} title="Itálico">I</button>
                  <button type="button" className={`${toolbarButton} line-through`} onClick={() => applyMarkdown('strike')} title="Riscado">S</button>
                  <button type="button" className={toolbarButton} onClick={() => applyMarkdown('code')} title="Código">{'</>'}</button>
                  <button type="button" className={toolbarButton} onClick={() => applyMarkdown('codeblock')} title="Bloco de código">{'{}'}</button>
                  <span className="h-4 w-px bg-zinc-700 mx-1" aria-hidden="true" />
                  <button type="button" className={toolbarButton} onClick={() => applyMarkdown('quote')} title="Citação">&quot;</button>
                  <button type="button" className={toolbarButton} onClick={() => applyMarkdown('ul')} title="Lista">*</button>
                  <button type="button" className={toolbarButton} onClick={() => applyMarkdown('ol')} title="Lista numerada">1.</button>
                  <button type="button" className={toolbarButton} onClick={() => applyMarkdown('link')} title="Link">[ ]( )</button>
                  <button type="button" className={toolbarButton} onClick={() => applyMarkdown('hr')} title="Divisória">--</button>
                </div>

                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={event => setContent(event.target.value)}
                  onDragOver={event => { event.preventDefault(); setIsDraggingOver(true); }}
                  onDragLeave={() => setIsDraggingOver(false)}
                  onDrop={async event => {
                    event.preventDefault();
                    setIsDraggingOver(false);
                    await processFiles(Array.from(event.dataTransfer.files || []));
                  }}
                  placeholder={'Escreva em Markdown — arraste imagens ou vídeos aqui.\n\n# Título\n**Negrito** *Itálico*\n\n- Lista'}
                  className={`w-full flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white placeholder:text-zinc-600 outline-none font-mono ${isDraggingOver ? 'ring-2 ring-inset ring-green-500/60' : ''}`}
                />

                <input ref={imageInputRef} type="file" multiple accept={IMAGE_ACCEPT} onChange={handleInputChange} className="hidden" />
                <input ref={videoInputRef} type="file" multiple accept={VIDEO_ACCEPT} onChange={handleInputChange} className="hidden" />
                <input ref={gifInputRef} type="file" multiple accept="image/gif" onChange={handleInputChange} className="hidden" />
              </div>

              {/* Preview com os estilos do site */}
              <div className="rounded-xl border border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden flex flex-col h-[45vh] lg:h-[62vh] min-h-[280px]">
                <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 bg-zinc-900">
                  <span className="text-[11px] uppercase tracking-wide text-zinc-500">
                    Preview (como aparece no site)
                  </span>
                </div>
                <div className="flex-1 overflow-auto px-4 py-3">
                  <Markdown className="exhibition-content">
                    {transformExternalMedia(content) || '*Nada para mostrar ainda*'}
                  </Markdown>
                </div>
              </div>
            </div>

            {/* Mídias enviadas */}
            {newMedia.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">
                  Mídias enviadas
                </p>
                <div className="flex flex-wrap gap-2">
                  {newMedia.map(item => (
                    <div
                      key={item.id}
                      className="relative h-16 w-16 rounded-lg border border-zinc-700 overflow-hidden"
                    >
                      {item.isVideo ? (
                        <video src={item.preview} className="h-full w-full object-cover" muted />
                      ) : (
                        <img src={item.preview} alt="" className="h-full w-full object-cover" />
                      )}
                      {item.status === 'uploading' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                      {item.status === 'error' && (
                        <div className="absolute inset-0 bg-red-950/70 flex items-center justify-center">
                          <span className="text-[10px] text-red-200 font-mono">erro</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMedia(item.id)}
                        aria-label="Remover mídia"
                        className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-1 text-white hover:bg-red-600"
                      >
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Escolha da capa */}
            {thumbnailCandidates.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">
                  Capa do projeto (thumbnail)
                </p>
                <div className="flex flex-wrap gap-2">
                  {thumbnailCandidates.map(candidate => (
                    <button
                      key={candidate.key}
                      type="button"
                      onClick={() => setThumbnailChoice(candidate.choice)}
                      aria-pressed={isChosen(candidate.choice)}
                      className={`relative h-20 w-20 rounded-lg border-2 overflow-hidden transition ${
                        isChosen(candidate.choice)
                          ? 'border-green-400 ring-2 ring-green-400/30'
                          : 'border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      <img src={candidate.preview} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            <div>
              <label
                htmlFor="post-tags"
                className="block text-[11px] uppercase tracking-wide text-zinc-500 mb-2"
              >
                Tags — a primeira define a categoria do post
              </label>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs bg-zinc-800/80 border border-zinc-700 text-zinc-200 px-2 py-1 rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        className="ml-1 text-zinc-400 hover:text-white"
                        onClick={() => setTags(prev => prev.filter(item => item !== tag))}
                        aria-label={`Remover tag ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                id="post-tags"
                value={tagInput}
                onChange={event => setTagInput(event.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => addTagsFromInput(tagInput)}
                placeholder="Digite tags e pressione Enter"
                className="w-full h-11 rounded-lg bg-zinc-800/80 border border-zinc-700 px-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-950/40 border border-red-900/50 px-3 py-2.5">
                <p className="text-xs text-red-400 font-mono">{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-4 md:px-5 py-3 border-t border-zinc-800 flex-shrink-0 flex items-center justify-end gap-2">
          {isUploading && (
            <span className="mr-auto text-xs text-zinc-500 font-mono">
              Enviando mídias…
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? (mode === 'create' ? 'Publicando…' : 'Salvando…')
              : (mode === 'create' ? 'Publicar' : 'Salvar')}
          </button>
        </div>
      </div>
    </div>
  );
}
