'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useHiveAuth } from './HiveAuthProvider';
import HivePostEditor from './HivePostEditor';
import SiteSettingsPanel from './SiteSettingsPanel';

/** Espaço que a barra ocupa no fim da página (altura + margem). */
const BAR_SPACE = '5.5rem';
const COLLAPSED_SPACE = '4.5rem';

/**
 * Barra flutuante do artista. Só aparece para a conta dona do site — para o
 * público o site continua exatamente como era.
 *
 * Pensada para o toque (o artista usa mais iPhone e iPad):
 * - botões de 44px, com ícone; no celular só "Novo projeto" mantém o texto;
 * - some ao rolar para baixo e volta ao rolar para cima ou no fim da
 *   página, como a barra do Safari, para não ficar em cima do que se lê;
 * - reserva espaço no fim do rodapé (--admin-bar-space, em admin.css), para
 *   nada do rodapé ficar escondido atrás dela;
 * - recolhida, vira um botão redondo no canto, fora do meio da tela.
 */
export default function AdminBar() {
  const { isAdmin, isReady, username, logout } = useHiveAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHiddenByScroll, setIsHiddenByScroll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();
  const lastScrollY = useRef(0);

  const isVisible = isReady && isAdmin;

  // Reserva o espaço da barra no fim do rodapé enquanto ela existe.
  useEffect(() => {
    if (!isVisible) return;
    const root = document.documentElement;
    root.style.setProperty('--admin-bar-space', isCollapsed ? COLLAPSED_SPACE : BAR_SPACE);
    return () => { root.style.removeProperty('--admin-bar-space'); };
  }, [isVisible, isCollapsed]);

  // Some ao rolar para baixo; volta ao rolar para cima, no topo e no fim.
  useEffect(() => {
    if (!isVisible) return;
    lastScrollY.current = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      const nearTop = y < 80;
      const nearBottom = window.innerHeight + y
        >= document.documentElement.scrollHeight - 120;

      if (nearTop || nearBottom) setIsHiddenByScroll(false);
      // Pequenos tremores do toque não devem fazer a barra piscar.
      else if (delta > 8) setIsHiddenByScroll(true);
      else if (delta < -8) setIsHiddenByScroll(false);

      if (Math.abs(delta) > 8) lastScrollY.current = y;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isVisible]);

  if (!isVisible) return null;

  const hiddenClass = isHiddenByScroll
    ? 'translate-y-[calc(100%+2rem)] opacity-0 pointer-events-none'
    : 'translate-y-0 opacity-100';

  // Acima da área segura do iPhone/iPad (barra de gestos).
  const bottomStyle = { bottom: 'max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))' };

  return (
    <>
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          aria-label="Mostrar controles do artista"
          title="Controles do artista"
          style={bottomStyle}
          className={[
            'wilbor-admin fixed right-3 z-40 flex h-12 w-12 items-center justify-center',
            'rounded-full border border-zinc-700 bg-zinc-950/95 text-zinc-200 shadow-2xl',
            'backdrop-blur-md transition duration-300 ease-out hover:text-white',
            'motion-reduce:transition-none',
            hiddenClass,
          ].join(' ')}
        >
          <PencilIcon />
        </button>
      ) : (
        <nav
          aria-label="Controles do artista"
          style={bottomStyle}
          className={[
            'wilbor-admin fixed left-1/2 z-40 -translate-x-1/2',
            'max-w-[calc(100vw-1.5rem)]',
            'transition duration-300 ease-out motion-reduce:transition-none',
            hiddenClass,
          ].join(' ')}
        >
          <div
            className={[
              'flex items-center gap-1 rounded-full border border-zinc-700',
              'bg-zinc-950/95 p-1 shadow-2xl backdrop-blur-md',
            ].join(' ')}
          >
            <span className="hidden lg:inline pl-3 pr-1 font-mono text-xs text-zinc-500 whitespace-nowrap">
              @{username}
            </span>

            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className={[
                'flex h-11 items-center gap-2 rounded-full bg-white px-4',
                'font-mono text-xs font-semibold text-zinc-950',
                'hover:bg-zinc-200 transition whitespace-nowrap',
              ].join(' ')}
            >
              <PlusIcon />
              Novo projeto
            </button>

            <BarButton
              label="Site"
              title="Barra de aviso, SEO e títulos das seções"
              onClick={() => setIsConfiguring(true)}
              icon={<GearIcon />}
            />

            <BarButton
              label="Atualizar"
              title="Buscar de novo o conteúdo no Hive. Útil logo após publicar, já que a rede leva alguns segundos para servir a versão nova."
              onClick={() => {
                setIsRefreshing(true);
                router.refresh();
                setTimeout(() => setIsRefreshing(false), 1200);
              }}
              icon={<RefreshIcon spinning={isRefreshing} />}
            />

            <BarButton
              label="Sair"
              title={`Sair da conta @${username}`}
              onClick={logout}
              icon={<LogoutIcon />}
              muted
            />

            <span className="mx-0.5 h-6 w-px bg-zinc-800" aria-hidden="true" />

            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              aria-label="Recolher os controles"
              title="Recolher"
              className={[
                'flex h-11 w-11 items-center justify-center rounded-full',
                'text-zinc-500 hover:bg-zinc-800 hover:text-white transition',
              ].join(' ')}
            >
              <ChevronDownIcon />
            </button>
          </div>
        </nav>
      )}

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

/**
 * Botão secundário da barra: ícone sempre; o texto aparece a partir do
 * tablet. No celular fica só o ícone, com o nome no aria-label.
 */
function BarButton({
  label,
  title,
  icon,
  onClick,
  muted = false,
}: {
  label: string
  title: string
  icon: React.ReactNode
  onClick: () => void
  muted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title}
      className={[
        'flex h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3',
        'font-mono text-xs whitespace-nowrap transition',
        'hover:bg-zinc-800 hover:text-white',
        muted ? 'text-zinc-500' : 'text-zinc-300',
      ].join(' ')}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

const iconProps = {
  className: 'h-4 w-4 shrink-0',
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  'aria-hidden': true,
} as const;

function PlusIcon() {
  return (
    <svg {...iconProps} strokeWidth={2.2}>
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg {...iconProps} className={`h-4 w-4 shrink-0 ${spinning ? 'animate-spin' : ''}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg {...iconProps} className="h-5 w-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
    </svg>
  );
}
