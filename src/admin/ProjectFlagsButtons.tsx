'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useHiveAuth } from './HiveAuthProvider';
import { toggleProjectTag } from './hive-post';

interface ProjectFlagsButtonsProps {
  author: string;
  permlink: string;
  title: string;
  body: string;
  jsonMetadata?: string;
  isHidden?: boolean;
  isFeatured?: boolean;
}

const BUTTON = [
  'inline-flex items-center gap-1 rounded-full border px-2 py-1',
  'font-mono text-[10px] backdrop-blur-sm transition',
  'border-zinc-500/70 bg-black/70 text-white',
  'hover:border-white hover:bg-black',
  'disabled:opacity-50 disabled:cursor-wait',
].join(' ');

/**
 * Controles de curadoria no card: tirar um projeto da grade e fixá-lo no topo.
 *
 * Ambos são tags no post ('hidden' e 'destaque'), que já é como o site decide
 * o que mostrar — nada de estado paralelo para sair do lugar.
 */
export default function ProjectFlagsButtons({
  author,
  permlink,
  title,
  body,
  jsonMetadata,
  isHidden,
  isFeatured,
}: ProjectFlagsButtonsProps) {
  const { isAdmin, isReady, username, postingKey } = useHiveAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!isReady || !isAdmin || !username) return null;

  async function toggle(tag: string, enabled: boolean) {
    setBusy(tag);
    setError(null);
    try {
      await toggleProjectTag({
        username: username!,
        postingKey,
        author,
        permlink,
        title,
        body,
        jsonMetadata,
        tag,
        enabled,
      });
      setTimeout(() => router.refresh(), 3000);
    } catch (toggleError) {
      setError(toggleError instanceof Error
        ? toggleError.message
        : 'Falha ao salvar.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <button
          type="button"
          className={BUTTON}
          disabled={busy !== null}
          title={isFeatured ? 'Tirar do destaque' : 'Fixar no topo da grade'}
          onClick={event => {
            event.stopPropagation();
            toggle('destaque', !isFeatured);
          }}
        >
          {busy === 'destaque' ? '…' : (isFeatured ? '★' : '☆')}
        </button>

        <button
          type="button"
          className={BUTTON}
          disabled={busy !== null}
          title={isHidden
            ? 'Voltar a mostrar no site'
            : 'Esconder do site (só você continua vendo)'}
          onClick={event => {
            event.stopPropagation();
            toggle('hidden', !isHidden);
          }}
        >
          {busy === 'hidden' ? '…' : (isHidden ? 'oculto' : 'esconder')}
        </button>
      </div>

      {error && (
        <span className="rounded bg-red-950/80 px-1.5 py-0.5 font-mono text-[10px] text-red-300">
          {error}
        </span>
      )}
    </div>
  );
}
