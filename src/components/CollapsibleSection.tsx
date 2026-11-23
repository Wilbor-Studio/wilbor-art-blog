'use client';

import { useId, useState } from 'react';

/**
 * Bloco recolhível: mostra só o rótulo e expande o conteúdo quando a pessoa
 * clica. Usado para não despejar textos e listas longas de uma vez na página.
 *
 * O selo (`badge`) é opcional e hoje não é usado em nenhuma seção.
 */
export default function CollapsibleSection({
  children,
  label,
  labelOpen = 'mostrar menos',
  badge,
  count,
  size = 'default',
  action,
}: {
  children: React.ReactNode
  label: string
  labelOpen?: string
  badge?: string
  /** Quantidade de itens escondidos, exibida à direita do rótulo. */
  count?: number
  /** 'title' usa o tamanho dos títulos de seção; 'default' é o rótulo menor. */
  size?: 'default' | 'title'
  /**
   * Ação ao lado do título (ex.: o "editar" do artista). Fica fora do botão
   * que abre e fecha, então tocar nela não mexe no acordeão.
   */
  action?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useId();

  return (
    <div>
      <div className="flex items-center gap-3">
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
          'group flex flex-1 min-w-0 items-center gap-3 text-left',
          'py-4 sm:py-5',
          // Cor forte fixa, sem mudar no hover: a maior parte do público
          // entra pelo iPhone e pelo iPad, onde hover não existe, e o
          // rótulo ficava sempre no cinza apagado.
          'text-neutral-900 dark:text-neutral-100',
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
            'uppercase',
            size === 'title'
              // Mesmo tamanho dos títulos de seção (ex.: "Exposições").
              ? 'text-2xl font-extrabold tracking-[0.02em] leading-tight text-gray-900 dark:text-gray-100'
              // Subseção (categorias de Parceiros, "saber mais" do Sobre): em
              // negrito, como os títulos, só que menor.
              : 'text-sm sm:text-base font-bold tracking-wide',
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
            // Fechado aponta para o rótulo (esquerda); aberto, para o conteúdo.
            isOpen ? '' : 'rotate-90',
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
      {action && <div className="shrink-0">{action}</div>}
      </div>

      {isOpen && (
        <div id={contentId} className="pb-5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
