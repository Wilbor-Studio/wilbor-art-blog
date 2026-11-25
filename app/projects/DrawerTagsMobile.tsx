"use client";
import IconMenu from '@/app/IconMenu';
import { IconX } from '@/components/IconX';
import ShareTagButton from '@/components/ShareTagButton';
import { buildTagsUrl, toggleTag } from '@/utility/tag-filter';
import { clsx } from 'clsx/lite';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { BiDesktop, BiMoon, BiSun } from 'react-icons/bi';

export default function DrawerTagsMobile({ tags, selectedTags = [], setSelectedTags, menuItems, onMenuItemClick }: {
    tags: string[];
    selectedTags?: string[];
    /** Sem ele (outras rotas), tocar numa tag leva para /projects filtrado. */
    setSelectedTags?: (tags: string[]) => void;
    menuItems: { text: string; mobileText: string; href: string; active: boolean }[];
    onMenuItemClick?: (href: string) => void;
}) {
    const [showMobileTags, setShowMobileTags] = useState(false);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [drawerActive, setDrawerActive] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (showMobileTags) {
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
    }, [showMobileTags, drawerVisible]);

    // Várias tags podem ficar marcadas (o filtro mostra projetos com qualquer
    // uma delas). No celular a gaveta cobre a tela, então ela fecha ao
    // marcar, para a pessoa ver o resultado; para somar outra tag, reabre.
    const handleTagSelection = (tag: string) => {
        if (isAnimating) return;
        if (typeof setSelectedTags === 'function') {
            setSelectedTags(toggleTag(selectedTags, tag));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.location.href = buildTagsUrl([tag]);
        }
        setTimeout(() => setShowMobileTags(false), 100);
    };

    return (
        <div className="flex items-center -mr-4 bg-transparent">
            <button
                className="flex items-center justify-center gap-2 rounded-md text-base font-bold transition-colors bg-transparent border-none shadow-none outline-none ring-0 focus:ring-0 focus:outline-none focus:border-none"
                style={{ outline: 'none', boxShadow: 'none', cursor: 'pointer', width: 64, height: 44, padding: 0 }}
                onClick={() => {
                    if (!isAnimating) {
                        setShowMobileTags(true);
                    }
                }}
                disabled={isAnimating}
                aria-label="Abrir menu lateral"
                title="Abrir menu lateral"
            >
                <IconMenu width={44} />
            </button>
            {drawerVisible && (
                <>
                    <div
                        className={clsx(
                            'fixed inset-0 z-40 bg-black/30 dark:bg-black/60',
                            showMobileTags && drawerActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        )}
                        style={{ 
                            backdropFilter: 'blur(4px)', 
                            transition: 'opacity 0.3s ease-in-out'
                        }}
                        onClick={() => {
                            if (!isAnimating) {
                                setShowMobileTags(false);
                            }
                        }}
                        aria-label="Fechar menu de navegação"
                        title="Fechar menu de navegação"
                    ></div>
                    <aside
                        id="mobile-tags-drawer"
                        className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-neutral-900 w-screen h-[100dvh] shadow-2xl border border-gray-200 dark:border-neutral-800 rounded-xl"
                        style={{
                            transform: drawerActive ? 'translateX(0)' : 'translateX(100%)',
                            transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            willChange: 'transform'
                        }}
                        aria-label="Menu lateral de navegação"
                    >
                        <div className="flex items-center justify-end px-4 py-4 bg-white dark:bg-neutral-900 rounded-t-xl border-b border-gray-100 dark:border-neutral-800">
                            <button
                                onClick={() => {
                                    if (!isAnimating) {
                                        setShowMobileTags(false);
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
                            <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
                                {menuItems.map((item, idx) => {
                                    const isLink = !onMenuItemClick;
                                    const Component = isLink ? 'a' : 'button';
                                    return (
                                    <Component
                                        key={item.text + idx}
                                        href={isLink ? item.href : undefined}
                                        onClick={(e: any) => {
                                            if (onMenuItemClick) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setShowMobileTags(false);
                                                requestAnimationFrame(() => {
                                                    onMenuItemClick(item.href);
                                                });
                                            } else {
                                                // Navegação normal (âncora /projects#rota) mas fechando o drawer
                                                setShowMobileTags(false);
                                            }
                                        }}
                                        className={clsx(
                                            'w-full text-left px-4 py-3 text-lg transition-colors font-mono border-0 rounded-lg',
                                            item.active
                                                ? 'text-red-600 dark:text-red-400 bg-gray-100 dark:bg-neutral-800 shadow'
                                                : 'text-gray-900 dark:text-gray-100 hover:text-red-700 dark:hover:text-red-300 hover:bg-gray-50 dark:hover:bg-neutral-800'
                                        )}
                                        style={{ 
                                            outline: 'none', 
                                            boxShadow: 'none', 
                                            border: 'none', 
                                            display: 'block'
                                        }}
                                        aria-label={item.mobileText}
                                        title={item.mobileText}
                                        type={isLink ? undefined : "button"}
                                    >
                                        {item.mobileText}
                                    </Component>
                                    );
                                })}
                                {/* Separador visual elegante */}
                                {Array.isArray(tags) && tags.length > 0 && (
                                    <div className="flex items-center justify-center my-4">
                                        <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-700" />
                                        <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-700" />
                                    </div>
                                )}
                                {/* Compartilhar o portfólio das tags marcadas com um cliente */}
                                {selectedTags.length > 0 && (
                                    <>
                                        <ShareTagButton tags={selectedTags} />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedTags?.([]);
                                                setTimeout(() => setShowMobileTags(false), 100);
                                            }}
                                            className="w-full px-4 py-2 font-mono text-sm text-gray-500 dark:text-gray-400 bg-transparent border-0 shadow-none hover:underline"
                                        >
                                            Limpar filtro
                                        </button>
                                    </>
                                )}
                                {/* Tags */}
                                {Array.isArray(tags) && tags.length > 0 && (
                                    <div className="flex flex-col gap-2">
                                        {tags.map((tag) => (
                                            <button
                                                key={tag}
                                                onClick={() => handleTagSelection(tag)}
                                                className={clsx(
                                                    // mesma "força" visual do menu: fonte em negrito (sem forçar maiúsculas)
                                                    'w-full text-left px-4 py-3 text-lg transition-colors font-mono border-0 rounded-lg',
                                                    selectedTags.includes(tag)
                                                        ? 'text-red-600 dark:text-red-400 bg-gray-100 dark:bg-neutral-800 shadow'
                                                        : 'text-gray-900 dark:text-gray-100 hover:text-red-700 dark:hover:text-red-300 hover:bg-gray-50 dark:hover:bg-neutral-800'
                                                )}
                                                style={{ 
                                                    outline: 'none', 
                                                    boxShadow: 'none', 
                                                    border: 'none'
                                                }}
                                                aria-pressed={selectedTags.includes(tag)}
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
