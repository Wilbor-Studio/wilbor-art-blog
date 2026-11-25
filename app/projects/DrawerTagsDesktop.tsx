"use client";
import IconMenu from '@/app/IconMenu';
import { IconX } from '@/components/IconX';
import { buildTagsUrl, toggleTag } from '@/utility/tag-filter';
import { clsx } from 'clsx/lite';
import { useEffect, useState } from 'react';
import TagFilterList from './TagFilterList';
import ThemeToggle from './ThemeToggle';

export default function DrawerTagsDesktop({ tags, tagCounts, selectedTags = [], setSelectedTags, menuItems, onMenuItemClick }: {
  tags: string[];
  tagCounts?: Record<string, number>;
  selectedTags?: string[];
  /** Sem ele (outras rotas), tocar numa tag leva para /projects filtrado. */
  setSelectedTags?: (tags: string[]) => void;
  menuItems: { text: string; href: string; active: boolean }[];
  onMenuItemClick?: (href: string) => void;
}) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerActive, setDrawerActive] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showDrawer) {
      setIsAnimating(true);
      setDrawerVisible(true);
      document.body.style.overflow = 'hidden';
      // Força o browser a renderizar primeiro com translate-x-full antes de animar
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDrawerActive(true);
          setTimeout(() => setIsAnimating(false), 400);
        });
      });
    } else {
      if (drawerVisible) {
        setIsAnimating(true);
        setDrawerActive(false);
        // Aguarda a animação de fechamento terminar antes de remover do DOM
        const timeout = setTimeout(() => {
          setDrawerVisible(false);
          setIsAnimating(false);
          document.body.style.overflow = '';
        }, 400);
        return () => clearTimeout(timeout);
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showDrawer, drawerVisible]);

  // Várias tags podem ficar marcadas (o filtro mostra projetos com qualquer
  // uma delas). A gaveta do desktop fica aberta ao marcar: a grade
  // aparece ao lado e a pessoa pode ir somando tags.
  const handleTagSelection = (tag: string) => {
    if (isAnimating) return;
    if (typeof setSelectedTags === 'function') {
      setSelectedTags(toggleTag(selectedTags, tag));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.location.href = buildTagsUrl([tag]);
    }
  };

  return (
    <div className="inline-flex items-center justify-center w-full h-full">
      <button
        className="inline-flex items-center justify-center rounded-none transition-colors bg-transparent border-none shadow-none outline-none ring-0 focus:ring-0 focus:outline-none focus:border-none hover:bg-black/5 dark:hover:bg-white/10"
        style={{ width: '100%', height: '100%', outline: 'none', boxShadow: 'none' }}
        onClick={() => {
          if (!isAnimating) {
            setShowDrawer(true);
          }
        }}
        disabled={isAnimating}
        aria-label="Abrir menu de tags"
        title="Abrir menu de tags"
      >
        <IconMenu width={32} />
      </button>
      {drawerVisible && (
        <>
          <div
            className={clsx(
              'fixed inset-0 z-40 bg-black/30 dark:bg-black/60',
              showDrawer && drawerActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
            style={{ 
              backdropFilter: 'blur(4px)', 
              transition: 'opacity 0.3s ease-in-out'
            }}
            onClick={() => {
              if (!isAnimating) {
                setShowDrawer(false);
              }
            }}
            aria-label="Fechar menu de tags"
            title="Fechar menu de tags"
          ></div>
          <aside
            id="desktop-tags-drawer"
            className="fixed top-0 right-0 h-[100dvh] w-80 max-w-[90vw] shadow-2xl z-50 flex flex-col bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-l-xl"
            style={{
              transform: drawerActive ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform'
            }}
            aria-label="Menu lateral de tags"
          >
            <div className="flex items-center justify-end px-4 py-4 bg-white dark:bg-neutral-900 rounded-t-xl border-b border-gray-100 dark:border-neutral-800">
              <button
                onClick={() => {
                  if (!isAnimating) {
                    setShowDrawer(false);
                  }
                }}
                className="rounded-full transition-colors p-2 flex items-center justify-center focus:outline-none hover:bg-gray-200 dark:hover:bg-neutral-800"
                aria-label="Fechar"
                title="Fechar"
                style={{ width: 44, height: 44, background: 'transparent', border: 'none', boxShadow: 'none' }}
              >
                <IconX size={28} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900 px-4 pt-2 pb-24">
              <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
                {/* Navegação */}
                {menuItems.map((item, idx) => (
                  <a
                    key={item.text + idx}
                    href={item.href}
                    onClick={(e) => {
                      if (onMenuItemClick) {
                        e.preventDefault();
                        onMenuItemClick(item.href);
                      }
                      // Sempre fechar o drawer, mesmo em navegação por âncora
                      setShowDrawer(false);
                    }}
                    className={clsx(
                      'w-full text-left px-4 py-3 text-lg font-semibold tracking-wide transition font-mono border-0 rounded-lg',
                      item.active
                        ? 'text-red-600 dark:text-red-400 bg-gray-100 dark:bg-neutral-800 shadow'
                        : 'text-gray-900 dark:text-gray-100 hover:text-red-700 dark:hover:text-red-300 hover:bg-gray-50 dark:hover:bg-neutral-800'
                    )}
                    style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
                    aria-label={item.text}
                    title={item.text}
                  >
                    {item.text}
                  </a>
                ))}
                {/* Filtro por tags */}
                {Array.isArray(tags) && (
                  <TagFilterList
                    tags={tags}
                    tagCounts={tagCounts}
                    selectedTags={selectedTags}
                    onToggle={handleTagSelection}
                    onClear={() => setSelectedTags?.([])}
                  />
                )}
              </div>
            </div>
            {/* Seletor de tema */}
            {mounted && (
              <div className="w-full px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 sticky bottom-0 z-10">
                <ThemeToggle />
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
