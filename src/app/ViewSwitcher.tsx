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
    /** Projetos visíveis por tag, mostrado ao lado de cada uma no menu. */
    tagCounts?: Record<string, number>;
    selectedTags: string[];
    setSelectedTags?: (tags: string[]) => void;
  }
  onMenuItemClick?: (href: string) => void;
  /** Grade de projetos aberta? Com onToggleProjects, a faixa do header abre e fecha a grade. */
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
    tagCounts: drawerTagsProps?.tagCounts,
    selectedTags: drawerTagsProps?.selectedTags ?? [],
    setSelectedTags: drawerTagsProps?.setSelectedTags,
    menuItems,
    onMenuItemClick,
  };

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
      {/* --band-header-h: com tudo fechado, o header fica da altura das
          faixas das seções (useFillViewportBands). */}
      <div
        data-band-header=""
        className="relative h-[var(--band-header-h,4rem)] w-full md:h-[var(--band-header-h,90px)]"
      >
        {/* A faixa toda (fora o menu) abre e fecha a grade de projetos, como
            o título das outras seções. Fora da página de projetos, a logo
            continua levando para lá. */}
        <div className="h-full w-full overflow-hidden">
          <BannerWilborSwitcher
            forceWhiteLogo
            onClick={onToggleProjects}
            expanded={onToggleProjects ? Boolean(projectsOpen) : undefined}
          />
        </div>

        {/* O menu fica na mesma coluna do conteúdo das seções (mesmo padding
            e largura máxima de textSection), com o centro do ícone alinhado
            ao centro das setas de abrir/fechar. */}
        <div className="pointer-events-none absolute inset-0 z-10 px-4 sm:px-8 md:px-12">
          <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-end">
            {/* Botão de 64px com -mr-4 próprio: centro 16px antes da borda. */}
            <div className="pointer-events-auto -mr-1.5 flex h-11 items-center md:hidden">
              <DrawerTagsMobile {...drawerProps} />
            </div>
            {/* Botão de 44px: centro 22px antes da borda. */}
            <div className="pointer-events-auto -mr-3 hidden h-11 w-11 md:block">
              <DrawerTagsDesktop {...drawerProps} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
