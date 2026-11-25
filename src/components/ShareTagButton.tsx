"use client";
import { clsx } from 'clsx/lite';
import { useState } from 'react';
import { BiCheck, BiShareAlt } from 'react-icons/bi';
import { buildTagsUrl, shareLink } from '@/utility/tag-filter';

/**
 * Botão para o artista compartilhar o portfólio filtrado pelas tags marcadas
 * com um cliente. Monta a URL pública (/projects?tag=a&tag=b), tenta o
 * compartilhamento nativo do sistema (WhatsApp, e-mail, etc. no celular) e
 * cai para copiar o link no desktop.
 */
export default function ShareTagButton({
  tags,
  className,
  compact = false,
}: {
  tags: string[];
  className?: string;
  /** Variante inline/compacta (ao lado da barra de filtro) em vez de bloco (drawer) */
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const label = tags.join(', ');

  const handleShare = async () => {
    const result = await shareLink(buildTagsUrl(tags), {
      title: 'Portfólio Wilbor',
      text: `Confira este portfólio (${label}):`,
    });
    if (result === 'copied') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={clsx(
        'inline-flex items-center gap-2 rounded-full font-mono transition-colors',
        'bg-white text-black border border-gray-300 hover:bg-gray-100 focus:outline-none',
        compact
          ? 'px-3 min-h-[40px] text-xs sm:text-sm'
          : 'w-full justify-center px-4 py-3 rounded-lg text-base',
        className
      )}
      style={{ outline: 'none', boxShadow: 'none' }}
      aria-label={`Compartilhar portfólio de ${label}`}
      title={`Compartilhar portfólio de ${label}`}
    >
      {copied ? <BiCheck size={compact ? 16 : 18} /> : <BiShareAlt size={compact ? 16 : 18} />}
      <span>{copied ? 'Link copiado!' : compact ? 'Compartilhar' : 'Enviar portfólio'}</span>
    </button>
  );
}
