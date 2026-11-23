"use client";
import {
    PATH_GRID
} from '@/app/paths';
import BannerWilborSwitcher from '@/components/BannerWilborSwitcher';
import { useTheme } from 'next-themes';
import { useHasSoundSection } from '@/components/SoundContent';
import { useEffect, useState } from 'react';
import DrawerTagsDesktop from '../../app/projects/DrawerTagsDesktop';
import DrawerTagsMobile from '../../app/projects/DrawerTagsMobile';

export type SwitcherSelection = 'projects' | 'about' | 'exhibitions' | 'som' | 'partners' | 'contact';

export default function ViewSwitcher({
  currentSelection,
  drawerTagsProps,
  tags,
  isLandingPage = false,
  onMenuItemClick,
  projectsOpen,
  onToggleProjects,
}: {
  currentSelection?: SwitcherSelection
  tags?: any
  showAdmin?: boolean
  isLandingPage?: boolean
  drawerTagsProps?: {
    tags: string[];
    selectedTag: string | null;
    setSelectedTag?: (tag: string | null) => void;
  }
  onMenuItemClick?: (href: string) => void;
  /** Grade de projetos aberta? Com onToggleProjects, mostra o botão da grade no header. */
  projectsOpen?: boolean;
  onToggleProjects?: () => void;
}) {
  const [fetchedTags, setFetchedTags] = useState<string[]>([]);
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // O header acompanha a página: some ao rolar para baixo (para não cobrir
  // o que se lê) e volta ao rolar para cima ou perto do topo.
  const [headerHidden, setHeaderHidden] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const delta = y - lastY;
      if (y < 120) setHeaderHidden(false);
      else if (delta > 8) setHeaderHidden(true);
      else if (delta < -8) setHeaderHidden(false);
      if (Math.abs(delta) > 8) lastY = y;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // If the page didn't provide tags, fetch them from the API so other routes also
  // show the same tags as the projects page.
  useEffect(() => {
    if (!drawerTagsProps?.tags || drawerTagsProps?.tags.length === 0) {
      fetch('/api/tags')
        .then(res => res.ok ? res.json() : [])
        .then((data: any[]) => {
          if (Array.isArray(data)) setFetchedTags(data.map(d => d.tag));
        })
        .catch(() => {
          // ignore errors silently
        });
    }
  }, [drawerTagsProps?.tags]);

  const hasSoundSection = useHasSoundSection();
  const menuItems = [
    {
      text: "PROJETOS",
      mobileText: "PROJETOS",
      href: PATH_GRID,
      active: currentSelection === 'projects',
    },
    {
      text: "SOBRE WILBOR",
      mobileText: "SOBRE WILBOR",
      href: `${PATH_GRID}#about`,
      active: currentSelection === 'about',
    },
    {
      text: "EXPOSIÇÕES / EXIBIÇÕES",
      mobileText: "EXPOSIÇÕES / EXIBIÇÕES",
      href: `${PATH_GRID}#exhibitions`,
      active: currentSelection === 'exhibitions',
    },
    // Só entra no menu depois que o artista publica a seção.
    ...hasSoundSection ? [{
      text: "BOTA O SOM",
      mobileText: "BOTA O SOM",
      href: `${PATH_GRID}#som`,
      active: currentSelection === 'som',
    }] : [],
    {
      text: "PARCEIROS",
      mobileText: "PARCEIROS",
      href: `${PATH_GRID}#partners`,
      active: currentSelection === 'partners',
    },
    {
      text: "CONTATO",
      mobileText: "CONTATO",
      href: `${PATH_GRID}#contact`,
      active: currentSelection === 'contact',
    },
   

  ];
  const tagsToUse = (drawerTagsProps?.tags && drawerTagsProps.tags.length > 0)
    ? drawerTagsProps.tags
    : (Array.isArray(tags) && tags.length > 0) ? tags : fetchedTags;

  const isDarkMode = mounted && (theme === 'dark' || (theme === 'system' && systemTheme === 'dark'));
  // Header: preto no dark, uma faixa cinza-clara no light, com o restante da página permanecendo branco
  const headerBgColor = isDarkMode ? '#000000' : '#e5e5e5'; // gray-200 aproximado do fundo cinza do header

  const drawerProps = {
    tags: tagsToUse,
    selectedTag: drawerTagsProps?.selectedTag ?? null,
    setSelectedTag: drawerTagsProps?.setSelectedTag,
    menuItems,
    onMenuItemClick,
  };

  const controlButton = [
    'flex h-11 w-11 items-center justify-center rounded-full border-0 p-0 shadow-none',
    // Mesma cor do ícone do menu (IconMenu: text-gray-500).
    'bg-transparent text-gray-500 transition-colors',
    'hover:bg-black/5 dark:hover:bg-white/10',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500',
  ].join(' ');

  return (
    // Um header só, fixo no topo: logo à esquerda e controles dentro da
    // faixa, à direita. Antes o menu era uma caixa branca solta, fixa sobre
    // o conteúdo. Escondido, sobe com transform; visível fica sem transform,
    // porque a gaveta do menu usa position: fixed aqui dentro e um transform
    // a prenderia ao header.
    <header
      className="sticky top-0 z-40 w-full transition-transform duration-300 ease-out motion-reduce:transition-none"
      style={{
        backgroundColor: headerBgColor,
        transform: headerHidden ? 'translateY(-100%)' : undefined,
      }}
    >
      <div className="relative flex h-16 w-full items-center md:h-[90px]">
        <div className="h-full min-w-0 flex-1 overflow-hidden">
          <div className="relative flex h-full w-full items-center">
            <BannerWilborSwitcher forceWhiteLogo />
          </div>
        </div>

        <div className="relative z-10 flex shrink-0 items-center gap-1 pl-2 pr-2 md:gap-2 md:pr-6">
          {onToggleProjects && (
            <button
              type="button"
              onClick={onToggleProjects}
              aria-pressed={Boolean(projectsOpen)}
              aria-controls="projects-grid"
              aria-label={projectsOpen ? 'Recolher projetos' : 'Mostrar projetos'}
              title={projectsOpen ? 'Recolher projetos' : 'Mostrar projetos'}
              className={controlButton}
            >
              <GridToggleIcon open={Boolean(projectsOpen)} />
            </button>
          )}
          {/* O botão do menu no celular tem 64px de largura próprios. */}
          <div className="flex h-11 items-center md:hidden">
            <DrawerTagsMobile {...drawerProps} />
          </div>
          <div className="hidden h-11 w-11 md:block">
            <DrawerTagsDesktop {...drawerProps} />
          </div>
        </div>
      </div>
    </header>
  );
}

/** Ícone da grade de projetos: aberta, quatro blocos cheios; recolhida, só o contorno. */
function GridToggleIcon({ open }: { open: boolean }) {
  return (
    <svg className="h-7 w-7 md:h-6 md:w-6" viewBox="0 0 24 24" aria-hidden="true">
      {open
        // Aberta: quadrados cheios, com espaço entre eles.
        ? [[4, 4], [13.5, 4], [4, 13.5], [13.5, 13.5]].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="6.5" height="6.5" rx="1" fill="currentColor" />
        ))
        // Recolhida: só o contorno.
        : [[4.5, 4.5], [14, 4.5], [4.5, 14], [14, 14]].map(([x, y]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="5.5"
            height="5.5"
            rx="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        ))}
    </svg>
  );
}
