"use client";
import IconMenu from '@/app/IconMenu';
import { IconX } from '@/components/IconX';
import ShareTagButton from '@/components/ShareTagButton';
import { clsx } from 'clsx/lite';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { BiDesktop, BiMoon, BiSun } from 'react-icons/bi';

export default function DrawerTagsDesktop({ tags, selectedTag, setSelectedTag, menuItems, onMenuItemClick }: {
  tags: string[];
  selectedTag?: string | null;
  setSelectedTag?: (tag: string | null) => void;
  menuItems: { text: string; href: string; active: boolean }[];
  onMenuItemClick?: (href: string) => void;
}) {
  const [showDrawer, setShowDrawer] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerActive, setDrawerActive] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const searchParams = useSearchParams();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tagFromUrl = new URL(window.location.href).searchParams.get('tag');
    if (tagFromUrl && tags.includes(tagFromUrl)) {
      if (typeof setSelectedTag === 'function' && tagFromUrl !== selectedTag) {
        setSelectedTag(tagFromUrl);
      }
    } else if (!tagFromUrl && selectedTag) {
      // Se não há tag na URL, limpa o estado
      if (typeof setSelectedTag === 'function') {
        setSelectedTag(null);
      }
    }
  }, [searchParams, tags, setSelectedTag, selectedTag]);

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

  const handleTagSelection = (tag: string | null) => {
    // Previne qualquer comportamento padrão
    if (isAnimating) return;
    
    if (typeof setSelectedTag === 'function') {
      // Atualiza a URL primeiro
      if (tag) {
        const url = new URL(window.location.href);
        url.searchParams.set('tag', tag);
        window.history.pushState({}, '', url.toString());
      } else {
        const url = new URL(window.location.href);
        url.searchParams.delete('tag');
        window.history.pushState({}, '', url.toString());
      }
      
      // Depois atualiza o estado
      setSelectedTag(tag);
    } else {
      // Se não houver setSelectedTag (usando ViewSwitcher em outras rotas),
      // navegamos para a página de projetos com o query param 'tag'
      if (tag) {
        window.location.href = `/projects?tag=${encodeURIComponent(tag)}`;
      } else {
        window.location.href = '/projects';
      }
    }

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Fecha o drawer após um pequeno delay para garantir que o clique foi processado
    setTimeout(() => {
      setShowDrawer(false);
    }, 100);
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
                      'w-full text-left px-4 py-3 text-lg transition font-mono border-0 rounded-lg',
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
                {/* Separador visual elegante */}
                {Array.isArray(tags) && tags.length > 0 && (
                  <div className="flex items-center justify-center my-4">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-700" />
                    <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-700" />
                  </div>
                )}
                {/* Compartilhar portfólio da tag selecionada com um cliente */}
                {selectedTag && (
                  <ShareTagButton tag={selectedTag} />
                )}
                {/* Tags */}
                {Array.isArray(tags) && tags.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleTagSelection(tag)}
                        className={clsx(
                          // mesma força visual do menu e do drawer mobile: fonte em negrito
                          'w-full text-left px-4 py-3 text-lg transition font-mono border-0 rounded-lg',
                          selectedTag === tag
                            ? 'text-red-600 dark:text-red-400 bg-gray-100 dark:bg-neutral-800 shadow'
                            : 'text-gray-900 dark:text-gray-100 hover:text-red-700 dark:hover:text-red-300 hover:bg-gray-50 dark:hover:bg-neutral-800'
                        )}
                        style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
                        aria-label={`Filtrar por tag ${tag}`}
                        title={`Filtrar por tag ${tag}`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Seletor de tema */}
            {mounted && (
              <div className="w-full px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 bg-white dark:bg-neutral-900 border-t border-gray-100 dark:border-neutral-800 sticky bottom-0 z-10">
                <div className="flex gap-1.5">
                
                  <button
                    onClick={() => setTheme('light')}
                    className={clsx(
                      'flex-1 px-2 py-2 text-center font-medium rounded-lg transition border-none shadow focus:outline-none flex items-center justify-center gap-1.5',
                      theme === 'light'
                        ? 'bg-gray-100 dark:bg-neutral-800 text-red-600 dark:text-red-400'
                        : 'bg-gray-50 dark:bg-neutral-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
                    )}
                    style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
                    aria-label="Tema claro"
                    title="Tema claro"
                  >
                    <BiSun size={14} />
                    <span className="text-xs font-mono">Claro</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={clsx(
                      'flex-1 px-2 py-2 text-center font-medium rounded-lg transition border-none shadow focus:outline-none flex items-center justify-center gap-1.5',
                      theme === 'dark'
                        ? 'bg-gray-100 dark:bg-neutral-800 text-red-600 dark:text-red-400'
                        : 'bg-gray-50 dark:bg-neutral-800/50 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700'
                    )}
                    style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
                    aria-label="Tema escuro"
                    title="Tema escuro"
                  >
                    <BiMoon size={14} />
                    <span className="text-xs font-mono">Escuro</span>
                  </button>
                </div>
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
}
