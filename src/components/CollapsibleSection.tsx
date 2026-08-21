'use client';

import { useId, useState } from 'react';

/**
 * Bloco recolhível: mostra só o rótulo e expande o conteúdo quando a pessoa
 * clica. Usado para não despejar textos e listas longas de uma vez na página.
 *
 * O selo (`badge`) é opcional — na seção "sobre" ele marca o texto que vem do
 * Hive; nas subseções de parceiros não é usado.
 */
export default function CollapsibleSection({
  children,
  label,
  labelOpen = 'mostrar menos',
  badge,
  count,
}: {
  children: React.ReactNode
  label: string
  labelOpen?: string
  badge?: string
  /** Quantidade de itens escondidos, exibida à direita do rótulo. */
  count?: number
}) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-800">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={[
          // O tailwind.css dá borda, fundo, sombra e padding a todo <button>
          // do projeto (com dark:border-gray-700, um cinza azulado). Aqui o
          // gatilho ocupa a largura toda, e essa caixa vira linhas azuladas
          // atravessando a seção — por isso o cromo é zerado explicitamente.
          'border-0 bg-transparent shadow-none rounded-none px-0',
          'group flex items-center gap-3 w-full text-left',
          'py-4 sm:py-5 transition-colors',
          'text-neutral-500 dark:text-neutral-400',
          'hover:text-neutral-900 dark:hover:text-neutral-100',
        ].join(' ')}
      >
        {badge && (
          <span
            className={[
              'shrink-0 rounded px-1.5 py-0.5',
              'text-[10px] uppercase tracking-[0.18em]',
              'border border-neutral-300 dark:border-neutral-700',
              'group-hover:border-current',
            ].join(' ')}
          >
            {badge}
          </span>
        )}

        <span
          className={[
            'text-sm sm:text-base uppercase tracking-wide',
            'font-medium',
          ].join(' ')}
        >
          {isOpen ? labelOpen : label}
        </span>

        {typeof count === 'number' && !isOpen && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {count}
          </span>
        )}

        <svg
          className={[
            'ml-auto h-5 w-5 shrink-0 transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {isOpen && (
        <div id={contentId} className="pb-5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
