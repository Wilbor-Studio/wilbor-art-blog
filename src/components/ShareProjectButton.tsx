'use client';

import { clsx } from 'clsx/lite';
import { useState } from 'react';
import { BiCheck, BiShareAlt } from 'react-icons/bi';
import { buildProjectShareUrl, shareLink } from '@/utility/tag-filter';

/**
 * Compartilha um projeto: o link abre o site com o projeto aberto e as tags
 * dele marcadas no filtro, para quem recebe ver também os trabalhos
 * parecidos. No celular abre o compartilhamento do sistema; no desktop,
 * copia o link e mostra um ✓.
 *
 * Fica dentro do card, que abre ao ser tocado: o clique aqui não chega a ele.
 */
export default function ShareProjectButton({
  permlink,
  tags = [],
  title,
  size = 'sm',
  className,
}: {
  permlink: string
  tags?: string[]
  title?: string
  /** 'sm' no rodapé do card fechado; 'lg' no cabeçalho do card aberto. */
  size?: 'sm' | 'lg'
  className?: string
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const result = await shareLink(buildProjectShareUrl(permlink, tags), {
      title: title ? `${title} · Wilbor` : 'Wilbor',
      text: title ? `Confira este projeto: ${title}` : 'Confira este projeto:',
    });
    if (result === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const label = copied ? 'Link copiado' : 'Compartilhar projeto';
  const iconSize = size === 'lg' ? 24 : 16;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={clsx(
        // Zera o cromo que o tailwind.css dá a todo <button>.
        'border-0 bg-transparent shadow-none p-0',
        'inline-flex shrink-0 items-center justify-center rounded-full',
        'transition-opacity hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500',
        // Área de toque confortável sem aumentar o ícone.
        size === 'lg' ? 'h-11 w-11' : 'h-8 w-8 -my-1.5 -mr-1.5',
        className,
      )}
    >
      {copied ? <BiCheck size={iconSize} /> : <BiShareAlt size={iconSize} />}
    </button>
  );
}
