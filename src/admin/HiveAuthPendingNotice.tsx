'use client';

import { useEffect, useState } from 'react';
import { HAS_OPEN_APP_URL, onHiveAuthPending } from './hiveauth-session';

/**
 * Enquanto uma publicação espera aprovação no app (login via HiveAuth no
 * iPhone/iPad), avisa o artista e oferece o botão para abrir o Keychain.
 * O iOS só abre outro app a partir de um toque, então o link é o caminho certo.
 */
export default function HiveAuthPendingNotice() {
  const [pending, setPending] = useState(false);

  useEffect(() => onHiveAuthPending(setPending), []);

  if (!pending) return null;

  return (
    <div
      className="wilbor-admin fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-950/95
                      px-5 py-4 shadow-2xl backdrop-blur flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-block w-4 h-4 shrink-0 border-2 border-zinc-600 border-t-zinc-200 rounded-full animate-spin" />
          <p className="text-sm text-zinc-200 font-mono">
            Aprove a publicação no app Hive Keychain e volte para esta página.
          </p>
        </div>
        <a
          href={HAS_OPEN_APP_URL}
          className="flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-white text-zinc-950
                     text-sm font-semibold font-mono hover:bg-zinc-100 transition"
        >
          Abrir Hive Keychain
        </a>
      </div>
    </div>
  );
}
