'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useHiveAuth } from './HiveAuthProvider';
import HivePostEditor from './HivePostEditor';
import { readPostForEditor } from './hive-post';

interface EditPostButtonProps {
  /** Post do Hive a editar — aceita o formato cru da API ou o hiveMetadata do card. */
  post: {
    title?: string
    body?: string
    permlink?: string
    author?: string
    json_metadata?: string
  }
  /** Título do card, quando não vem dentro de `post`. */
  fallbackTitle?: string
  label?: string
  className?: string
  /** Impede que o clique acione o card/seção em volta. */
  stopPropagation?: boolean
}

/** Estilo padrão: pensado para ficar sobre a imagem de um card. */
const DEFAULT_CLASS =
  'inline-flex items-center gap-1.5 rounded-full border border-zinc-500/70 ' +
  'bg-black/70 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur-sm ' +
  'hover:border-white hover:bg-black transition';

/** Estilo para seções de texto (sobre, exposições, parceiros, contato). */
export const SECTION_EDIT_CLASS =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono ' +
  'text-[11px] transition border-neutral-400 bg-white/80 text-neutral-700 ' +
  'hover:border-black hover:text-black dark:border-neutral-600 ' +
  'dark:bg-black/70 dark:text-neutral-200 dark:hover:border-white ' +
  'dark:hover:text-white';

/**
 * Botão "editar" que só existe para a conta dona do site.
 * Abre o editor já preenchido com o conteúdo atual do post.
 */
export default function EditPostButton({
  post,
  fallbackTitle,
  label = 'editar',
  className = DEFAULT_CLASS,
  stopPropagation = true,
}: EditPostButtonProps) {
  const { isAdmin, isReady } = useHiveAuth();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (!isReady || !isAdmin) return null;

  const initial = readPostForEditor(post);
  if (!initial.permlink) return null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={event => {
          if (stopPropagation) event.stopPropagation();
          setIsOpen(true);
        }}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
        </svg>
        {label}
      </button>

      {isOpen && (
        <HivePostEditor
          mode="edit"
          permlink={initial.permlink}
          author={initial.author}
          initialTitle={initial.title || fallbackTitle || ''}
          initialContent={initial.content}
          initialTags={initial.tags}
          initialImages={initial.images}
          initialThumbnail={initial.thumbnail}
          onClose={() => setIsOpen(false)}
          onSaved={() => setTimeout(() => router.refresh(), 3000)}
        />
      )}
    </>
  );
}
