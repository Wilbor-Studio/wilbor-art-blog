"use client";
import ShareTagButton from '@/components/ShareTagButton';
import { clsx } from 'clsx/lite';
import { BiCheck } from 'react-icons/bi';

/**
 * Parte de filtro do menu (desktop e celular): um título que diz que é
 * filtro, as tags como etiquetas lado a lado (marcada = preenchida, com ✓)
 * e a quantidade de projetos de cada uma. Antes as tags eram linhas do
 * mesmo tamanho dos links de navegação e pareciam páginas.
 */
export default function TagFilterList({
  tags,
  tagCounts,
  selectedTags,
  onToggle,
  onClear,
}: {
  tags: string[];
  /** Projetos visíveis por tag; sem ele, as etiquetas saem sem número. */
  tagCounts?: Record<string, number>;
  selectedTags: string[];
  onToggle: (tag: string) => void;
  onClear: () => void;
}) {
  if (tags.length === 0) return null;

  return (
    <section
      aria-labelledby="tag-filter-title"
      className="mt-4 border-t border-gray-200 pt-6 dark:border-neutral-700"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
        <h2
          id="tag-filter-title"
          className="font-mono text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-neutral-400"
        >
          Filtrar projetos
        </h2>
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="min-h-0 border-0 bg-transparent p-0 font-mono text-xs text-gray-500 shadow-none hover:underline dark:text-neutral-400"
          >
            limpar
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map(tag => {
          const selected = selectedTags.includes(tag);
          const count = tagCounts?.[tag];
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              aria-pressed={selected}
              title={selected ? `Tirar o filtro ${tag}` : `Filtrar por ${tag}`}
              className={clsx(
                'inline-flex min-h-[40px] items-center gap-1.5 rounded-full border px-3.5',
                'font-mono text-sm shadow-none transition-colors touch-manipulation',
                selected
                  ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-black'
                  : [
                    'border-gray-300 bg-transparent text-gray-800',
                    'hover:border-neutral-900 dark:border-neutral-600 dark:text-neutral-100',
                    'dark:hover:border-white',
                  ].join(' '),
              )}
            >
              {selected && <BiCheck aria-hidden="true" size={16} className="-ml-1" />}
              {tag}
              {count !== undefined && (
                <span
                  className={clsx(
                    'text-xs',
                    selected ? 'opacity-70' : 'text-gray-400 dark:text-neutral-500',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Compartilhar o portfólio das tags marcadas com um cliente */}
      {selectedTags.length > 0 && (
        <div className="mt-5">
          <ShareTagButton tags={selectedTags} />
        </div>
      )}
    </section>
  );
}
