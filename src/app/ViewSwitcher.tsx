"use client";
import {
    PATH_GRID
} from '@/app/paths';
import BannerWilborSwitcher from '@/components/BannerWilborSwitcher';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import DrawerTagsDesktop from '../../app/projects/DrawerTagsDesktop';
import DrawerTagsMobile from '../../app/projects/DrawerTagsMobile';

export type SwitcherSelection = 'projects' | 'about' | 'exhibitions' | 'partners' | 'contact';

export default function ViewSwitcher({
  currentSelection,
  drawerTagsProps,
  tags,
  isLandingPage = false,
  onMenuItemClick,
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
}) {
  const [fetchedTags, setFetchedTags] = useState<string[]>([]);
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // Deslocamento do botão fixo do menu para ele ficar dentro da faixa do
  // header, que o banner de construção empurra para baixo. Vai a zero assim
  // que o banner sai de cena no scroll, devolvendo o botão ao topo.
  const [menuTopOffset, setMenuTopOffset] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const banner = document.getElementById('construction-banner');
    if (!banner) return;

    let ticking = false;

    const measure = () => {
      ticking = false;
      setMenuTopOffset(Math.max(0, banner.getBoundingClientRect().bottom));
    };

    const schedule = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
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

  return (
    <>
      {/* Mobile: logo à esquerda e Drawer à direita */}
      <div className="md:hidden w-full flex items-center justify-between pr-4" style={{ height: '64px', backgroundColor: headerBgColor }}>
        {/* Logo/thumbnail centralizado e contido no topo */}
        <div className="h-full overflow-hidden flex-1 flex items-center">
          <BannerWilborSwitcher forceWhiteLogo />
        </div>
        <div className="flex items-center flex-shrink-0 mr-0 w-[64px] h-[44px]" aria-hidden="true" />
      </div>
      {/* Desktop: Header com faixa preta e menu separado */}
      <div className="hidden md:flex w-full items-center justify-between relative" style={{ height: '90px' }}>
        {/* Faixa preta que ocupa 100% mas fica por trás do menu */}
        <div className="absolute inset-0 z-10" style={{ backgroundColor: headerBgColor, right: '90px' }}>
          <div className="h-full w-full flex items-center relative">
            <BannerWilborSwitcher forceWhiteLogo />
          </div>
        </div>

        {/* Espaçador para empurrar o menu para a direita */}
        <div className="flex-grow" />

        {/* Menu quadrado na extrema direita, sobrepondo ou ao lado da faixa */}
        <div className="flex items-center justify-center flex-shrink-0 z-20 bg-white dark:bg-[#222222] relative" style={{ width: '90px', height: '90px' }}>
          <span className="sr-only">Espaço reservado para o botão do drawer</span>
        </div>
      </div>
      <div
        className="fixed right-0 z-50 hidden md:flex pointer-events-none"
        style={{ top: menuTopOffset, width: '90px', height: '90px' }}
        aria-label="Atalho para o menu de tags"
      >
        <div
          className="pointer-events-auto flex items-center justify-center w-full h-full bg-white dark:bg-[#222222] border border-gray-200 dark:border-neutral-800 rounded-l-xl"
        >
          <DrawerTagsDesktop
            tags={tagsToUse}
            selectedTag={drawerTagsProps?.selectedTag ?? null}
            setSelectedTag={drawerTagsProps?.setSelectedTag}
            menuItems={menuItems}
            onMenuItemClick={onMenuItemClick}
          />
        </div>
      </div>
      <div
        className="fixed right-0 z-50 md:hidden pointer-events-none"
        style={{ top: menuTopOffset, width: '64px', height: '64px' }}
        aria-label="Atalho móvel para o menu de tags"
      >
        <div
          className="pointer-events-auto flex items-center justify-center w-full h-full"
          style={{ background: 'transparent' }}
        >
          <DrawerTagsMobile
            tags={tagsToUse}
            selectedTag={drawerTagsProps?.selectedTag ?? null}
            setSelectedTag={drawerTagsProps?.setSelectedTag}
            menuItems={menuItems}
            onMenuItemClick={onMenuItemClick}
          />
        </div>
      </div>
    </>
  );
}
