'use client';

import { useId, useState } from 'react';

/**
 * Recolhe o conteúdo vindo do Hive atrás de um botão, deixando explícito de
 * onde o texto vem. A página mostra o resumo próprio do site e só expande o
 * post completo se a pessoa pedir.
 */
export default function HivePostDisclosure({
  children,
  label = 'saber mais',
  labelOpen = 'mostrar menos',
}: {
  children: React.ReactNode
  label?: string
  labelOpen?: string
}) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-800 pt-4">
      <button
        type="button"
        onClick={() => setIsOpen(open => !open)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={[
          'group flex items-center gap-3 w-full text-left',
          'py-1 transition-colors',
          'text-neutral-500 dark:text-neutral-400',
          'hover:text-neutral-900 dark:hover:text-neutral-100',
        ].join(' ')}
      >
        <span
          className={[
            'shrink-0 rounded px-1.5 py-0.5',
            'text-[10px] uppercase tracking-[0.18em]',
            'border border-neutral-300 dark:border-neutral-700',
            'group-hover:border-current',
          ].join(' ')}
        >
          hive
        </span>

        <span className="text-xs sm:text-sm uppercase tracking-wide">
          {isOpen ? labelOpen : label}
        </span>

        <svg
          className={[
            'ml-auto h-4 w-4 shrink-0 transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div id={contentId} className="mt-4 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
