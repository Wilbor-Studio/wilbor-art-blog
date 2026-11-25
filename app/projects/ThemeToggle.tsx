"use client";
import { clsx } from 'clsx/lite';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { LuMoon, LuSun } from 'react-icons/lu';

const OPTIONS = [
  { value: 'light', label: 'Claro', Icon: LuSun },
  { value: 'dark', label: 'Escuro', Icon: LuMoon },
] as const;

/**
 * Seletor de tema do menu (desktop e celular). Uma pílula desliza até a
 * opção escolhida e o ícone dela gira (sol) ou cresce (lua). Segue o tema
 * em uso, mesmo quando ele vem do sistema. Com movimento reduzido, troca
 * sem animação.
 *
 * A página toda passa de um tema para o outro num esmaecimento (View
 * Transitions; duração em tailwind.css). Sem suporte no navegador, troca
 * direto, como antes.
 */
function switchTheme(value: string, setTheme: (theme: string) => void) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || typeof document.startViewTransition !== 'function') {
    setTheme(value);
    return;
  }
  document.startViewTransition(() => {
    // O next-themes só aplica a classe depois de renderizar; aqui ela entra
    // na hora, para o navegador capturar o tema novo. Ele aplica a mesma.
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(value);
    root.style.colorScheme = value;
    setTheme(value);
  });
}

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // O tema só é conhecido no cliente; antes disso não marca nenhuma opção.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const current = mounted ? resolvedTheme : undefined;

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className="relative grid grid-cols-2 rounded-full bg-gray-100 p-1 dark:bg-neutral-800"
    >
      {/* Pílula da opção ativa: desliza entre as duas metades. */}
      <span
        aria-hidden="true"
        className={clsx(
          'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full',
          'bg-white shadow-sm dark:bg-neutral-950',
          'transition-[translate,opacity] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)]',
          'motion-reduce:transition-none',
          current ? 'opacity-100' : 'opacity-0',
          current === 'dark' ? 'translate-x-full' : 'translate-x-0',
        )}
      />
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => switchTheme(value, setTheme)}
            className={clsx(
              'relative z-10 flex min-h-[40px] items-center justify-center gap-1.5',
              'rounded-full border-0 bg-transparent px-2 shadow-none',
              'font-mono text-xs transition-colors duration-300',
              active
                ? 'text-neutral-950 dark:text-white'
                : 'text-gray-500 hover:text-gray-800 dark:text-neutral-400 dark:hover:text-neutral-100',
            )}
          >
            <Icon
              aria-hidden="true"
              size={14}
              strokeWidth={2.25}
              className={clsx(
                'transition-[rotate,scale] duration-700 ease-out motion-reduce:transition-none',
                active && (value === 'light' ? 'rotate-90 scale-110' : 'scale-110'),
              )}
            />
            {label}
          </button>
        );
      })}
    </div>
  );
}
