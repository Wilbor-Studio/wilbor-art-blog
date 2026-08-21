'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useHiveAuth } from './HiveAuthProvider';
import HivePostEditor from './HivePostEditor';
import SiteSettingsPanel from './SiteSettingsPanel';

/**
 * Barra flutuante do artista. Só aparece para a conta dona do site — para o
 * público o site continua exatamente como era.
 */
export default function AdminBar() {
  const { isAdmin, isReady, username, logout } = useHiveAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  // A barra é fixa no rodapé e cobre o conteúdo dessa faixa da página —
  // atrapalha justamente ao conferir o rodapé e o fim das seções.
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();

  if (!isReady || !isAdmin) return null;

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        aria-label="Mostrar controles do artista"
        title="Controles do artista"
        className="wilbor-admin fixed z-40 bottom-3 left-1/2 -translate-x-1/2
                   rounded-full border border-zinc-700 bg-zinc-950/95 backdrop-blur-md
                   px-3 py-1.5 font-mono text-xs text-zinc-400 shadow-2xl
                   hover:text-white hover:border-zinc-500 transition"
      >
        editar
      </button>
    );
  }

  return (
    <>
      <div
        className="wilbor-admin fixed z-40 bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5
                   rounded-full border border-zinc-700 bg-zinc-950/95 backdrop-blur-md
                   px-2 py-1.5 shadow-2xl max-w-[calc(100vw-1.5rem)]"
        aria-label="Controles do artista"
      >
        <span className="hidden sm:inline pl-2 pr-1 font-mono text-xs text-zinc-500 whitespace-nowrap">
          @{username}
        </span>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="rounded-full bg-white px-3 py-1.5 font-mono text-xs font-semibold
                     text-zinc-950 hover:bg-zinc-200 transition whitespace-nowrap"
        >
          + novo projeto
        </button>

        <button
          type="button"
          onClick={() => setIsConfiguring(true)}
          title="Barra de aviso, SEO e títulos das seções"
          className="rounded-full border border-zinc-700 px-3 py-1.5 font-mono text-xs
                     text-zinc-300 hover:border-white hover:text-white transition whitespace-nowrap"
        >
          site
        </button>

        <button
          type="button"
          onClick={() => router.refresh()}
          title="Buscar de novo o conteúdo no Hive. Útil logo após publicar,
                 já que a rede leva alguns segundos para servir a versão nova."
          className="rounded-full border border-zinc-700 px-3 py-1.5 font-mono text-xs
                     text-zinc-300 hover:border-white hover:text-white transition whitespace-nowrap"
        >
          recarregar
        </button>

        <button
          type="button"
          onClick={logout}
          className="rounded-full px-3 py-1.5 font-mono text-xs text-zinc-500
                     hover:text-white transition whitespace-nowrap"
        >
          sair
        </button>

        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          aria-label="Recolher os controles"
          title="Recolher"
          className="rounded-full px-2 py-1.5 font-mono text-xs text-zinc-600
                     hover:text-white transition"
        >
          ×
        </button>
      </div>

      {isConfiguring && (
        <SiteSettingsPanel onClose={() => setIsConfiguring(false)} />
      )}

      {isCreating && (
        <HivePostEditor
          mode="create"
          onClose={() => setIsCreating(false)}
          onSaved={() => {
            // O post recém-publicado leva alguns segundos para aparecer na API
            // do Hive; o refresh busca os dados do servidor de novo.
            setTimeout(() => router.refresh(), 3000);
          }}
        />
      )}
    </>
  );
}
