'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHiveAuth } from './HiveAuthProvider';
import HivePostEditor from './HivePostEditor';
import { readPostForEditor, toggleProjectTag } from './hive-post';

interface ProjectAdminMenuProps {
  post: {
    title?: string
    body?: string
    author?: string
    permlink?: string
    json_metadata?: string
  }
  isHidden?: boolean
  isFeatured?: boolean
  /**
   * 'card': sobre a capa do card fechado — selo de status à esquerda e o
   * botão ⋯ à direita, que some até o hover em telas com mouse.
   * 'header': na linha do título do card aberto, ao lado de tela cheia e
   * fechar, no mesmo traço desses ícones.
   */
  variant: 'card' | 'header'
}

type Flag = 'hidden' | 'destaque';

const MENU_WIDTH = 224;

/**
 * Controles do artista num projeto: editar, destacar e esconder/mostrar.
 *
 * Tudo fica atrás de um único botão ⋯ para não cobrir a capa nem o botão de
 * fechar do card aberto. O menu e o editor são renderizados num portal e
 * barram a propagação de cliques: num portal, o clique ainda sobe pela
 * árvore do React até o card, e o card abre/fecha o projeto ao ser clicado.
 */
export default function ProjectAdminMenu({
  post,
  isHidden,
  isFeatured,
  variant,
}: ProjectAdminMenuProps) {
  const { isAdmin, isReady, username, postingKey } = useHiveAuth();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [busy, setBusy] = useState<Flag | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // O Hive leva alguns segundos para servir a versão nova; até lá o card já
  // mostra o estado escolhido.
  const [hidden, setHidden] = useState(Boolean(isHidden));
  const [featured, setFeatured] = useState(Boolean(isFeatured));
  // Um segundo clique precisa partir das tags gravadas pelo primeiro.
  const [metadata, setMetadata] = useState(post.json_metadata);

  useEffect(() => setHidden(Boolean(isHidden)), [isHidden]);
  useEffect(() => setFeatured(Boolean(isFeatured)), [isFeatured]);
  useEffect(() => setMetadata(post.json_metadata), [post.json_metadata]);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const close = useCallback(() => setIsOpen(false), []);

  // Posiciona o menu abaixo do botão, alinhado à direita e dentro da tela.
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - 8,
    );
    setPosition({ top: rect.bottom + 6, left });
  }, [isOpen]);

  // Fecha ao tocar fora, com Esc, ou se a página rolar (o menu é fixo e
  // ficaria solto do botão).
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', close);
      window.removeEventListener('resize', close);
    };
  }, [isOpen, close]);

  // Foco no primeiro item ao abrir, para teclado e leitores de tela.
  useEffect(() => {
    if (isOpen && position) {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    }
  }, [isOpen, position]);

  if (!isReady || !isAdmin || !username) return null;

  const initial = readPostForEditor({ ...post, json_metadata: metadata });
  if (!initial.permlink) return null;

  async function toggle(tag: Flag, enabled: boolean) {
    close();
    setBusy(tag);
    setError(null);
    try {
      const nextMetadata = await toggleProjectTag({
        username: username!,
        postingKey,
        author: initial.author,
        permlink: initial.permlink,
        title: initial.title,
        body: initial.content,
        jsonMetadata: metadata,
        tag,
        enabled,
      });
      setMetadata(nextMetadata);
      if (tag === 'hidden') setHidden(enabled);
      else setFeatured(enabled);
      setTimeout(() => router.refresh(), 3000);
    } catch (toggleError) {
      setError(toggleError instanceof Error
        ? toggleError.message
        : 'Falha ao salvar.');
    } finally {
      setBusy(null);
    }
  }

  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  const trigger = (
    <button
      ref={triggerRef}
      type="button"
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-label="Opções do projeto"
      title="Opções do projeto"
      onClick={event => {
        event.stopPropagation();
        setIsOpen(open => !open);
      }}
      className={variant === 'card'
        ? [
          // Alvo de 40px: confortável no toque do iPad.
          'pointer-events-auto flex h-10 w-10 items-center justify-center',
          'rounded-full border-0 bg-black/55 p-0 text-white shadow-none',
          'backdrop-blur-sm transition-opacity duration-150 hover:bg-black/75',
          // Com mouse, só aparece no hover do card; no toque, sempre.
          isOpen || busy
            ? 'opacity-100'
            : '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100',
        ].join(' ')
        : [
          // Mesmo traço dos botões de tela cheia e fechar ao lado.
          'flex h-10 w-10 items-center justify-center rounded-full border-0',
          'bg-transparent p-0 shadow-none transition-colors',
          '!text-gray-500 dark:!text-[#888888]',
          'hover:bg-neutral-100 dark:hover:bg-neutral-800',
          isOpen ? 'bg-neutral-100 dark:bg-neutral-800' : '',
        ].join(' ')}
    >
      {busy ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      )}
    </button>
  );

  const menu = isOpen && position && createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Opções do projeto"
      onClick={stop}
      onPointerDown={stop}
      style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
      className="fixed z-[70] overflow-hidden rounded-xl border border-neutral-200
                 bg-white py-1 shadow-xl animate-fade-in
                 dark:border-neutral-800 dark:bg-neutral-950"
    >
      <MenuItem
        icon={<PencilIcon />}
        label="Editar projeto"
        onSelect={() => { close(); setIsEditing(true); }}
      />
      <MenuItem
        icon={<span aria-hidden="true">{featured ? '★' : '☆'}</span>}
        label={featured ? 'Tirar do destaque' : 'Destacar no topo'}
        onSelect={() => toggle('destaque', !featured)}
      />
      <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />
      <MenuItem
        icon={<EyeIcon open={hidden} />}
        label={hidden ? 'Mostrar no site' : 'Esconder do site'}
        hint={hidden ? 'hoje só você vê' : 'só você vai continuar vendo'}
        tone={hidden ? 'accent' : 'default'}
        onSelect={() => toggle('hidden', !hidden)}
      />
    </div>,
    document.body,
  );

  const editor = isEditing && createPortal(
    // Barra cliques e teclas do editor antes de chegarem ao card.
    <div onClick={stop} onPointerDown={stop} onKeyDown={stop}>
      <HivePostEditor
        mode="edit"
        permlink={initial.permlink}
        author={initial.author}
        initialTitle={initial.title}
        initialContent={initial.content}
        initialTags={initial.tags}
        initialImages={initial.images}
        initialThumbnail={initial.thumbnail}
        onClose={() => setIsEditing(false)}
        onSaved={() => setTimeout(() => router.refresh(), 3000)}
      />
    </div>,
    document.body,
  );

  const status = (hidden || featured || busy || error) && (
    <StatusChips
      hidden={hidden}
      featured={featured}
      busy={busy}
      error={error}
      onDismissError={() => setError(null)}
    />
  );

  if (variant === 'header') {
    return (
      <>
        {status}
        {trigger}
        {menu}
        {editor}
      </>
    );
  }

  return (
    <>
      {status && (
        <div className="pointer-events-none absolute left-2 top-2 z-30">
          {status}
        </div>
      )}
      <div className="pointer-events-none absolute right-2 top-2 z-30">
        {trigger}
      </div>
      {menu}
      {editor}
    </>
  );
}

function MenuItem({
  icon,
  label,
  hint,
  tone = 'default',
  onSelect,
}: {
  icon: React.ReactNode
  label: string
  hint?: string
  tone?: 'default' | 'accent'
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={event => {
        event.stopPropagation();
        onSelect();
      }}
      className={[
        // 44px de altura: alvo de toque recomendado no iPad.
        'flex min-h-[44px] w-full items-center gap-3 rounded-none border-0',
        'bg-transparent px-3 py-2 text-left text-sm shadow-none',
        'transition-colors focus:outline-none',
        'hover:bg-neutral-100 focus-visible:bg-neutral-100',
        'dark:hover:bg-neutral-900 dark:focus-visible:bg-neutral-900',
        tone === 'accent'
          ? 'text-amber-700 dark:text-amber-400'
          : 'text-neutral-800 dark:text-neutral-200',
      ].join(' ')}
    >
      <span className="flex w-4 shrink-0 justify-center">{icon}</span>
      <span className="flex flex-col">
        <span>{label}</span>
        {hint && (
          <span className="text-[11px] text-neutral-500 dark:text-neutral-500">
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

/** Selos de estado: só o artista vê, e só quando há algo a dizer. */
function StatusChips({
  hidden,
  featured,
  busy,
  error,
  onDismissError,
}: {
  hidden: boolean
  featured: boolean
  busy: Flag | null
  error: string | null
  onDismissError: () => void
}) {
  const chip = 'rounded-full px-2 py-0.5 font-mono text-[10px] whitespace-nowrap';
  return (
    <div className="flex flex-wrap items-center gap-1">
      {busy && (
        <span className={`${chip} bg-black/70 text-white`}>salvando…</span>
      )}
      {!busy && hidden && (
        <span
          className={`${chip} bg-amber-400 text-black`}
          title="Quem visita o site não vê este projeto."
        >
          oculto · só você vê
        </span>
      )}
      {!busy && featured && (
        <span className={`${chip} bg-black/70 text-white`}>★ destaque</span>
      )}
      {error && (
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            onDismissError();
          }}
          title="Fechar aviso"
          className={`${chip} pointer-events-auto border-0 bg-red-950/90 text-red-200 shadow-none`}
        >
          {error} ×
        </button>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      {open ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </>
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
      )}
    </svg>
  );
}
