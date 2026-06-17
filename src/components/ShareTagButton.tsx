"use client";
import { clsx } from 'clsx/lite';
import { useState } from 'react';
import { BiCheck, BiShareAlt } from 'react-icons/bi';

/**
 * Botão para o artista compartilhar um portfólio filtrado por tag com um cliente.
 * Monta a URL pública (/projects?tag=...), tenta o compartilhamento nativo do
 * sistema (WhatsApp, e-mail, etc. no celular) e cai para copiar o link no desktop.
 */
export default function ShareTagButton({
  tag,
  className,
  compact = false,
}: {
  tag: string;
  className?: string;
  /** Variante inline/compacta (ao lado da barra de filtro) em vez de bloco (drawer) */
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const buildUrl = () => {
    if (typeof window === 'undefined') return '';
    const url = new URL(`${window.location.origin}/projects`);
    url.searchParams.set('tag', tag);
    return url.toString();
  };

  const handleShare = async () => {
    const url = buildUrl();
    if (!url) return;

    const shareData = {
      title: 'Portfólio Wilbor',
      text: `Confira este portfólio (${tag}):`,
      url,
    };

    // Compartilhamento nativo (principalmente em celulares)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Usuário cancelou o menu nativo: não faz fallback
        if ((err as Error)?.name === 'AbortError') return;
        // Qualquer outro erro: cai para copiar o link
      }
    }

    // Fallback desktop: copia o link para a área de transferência
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Último recurso, caso clipboard não esteja disponível
      window.prompt('Copie o link do portfólio:', url);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={clsx(
        'inline-flex items-center gap-2 rounded-full font-mono transition-colors',
        'bg-red-600 text-white hover:bg-red-700 focus:outline-none',
        compact
          ? 'px-3 min-h-[40px] text-xs sm:text-sm'
          : 'w-full justify-center px-4 py-3 rounded-lg text-base',
        className
      )}
      style={{ outline: 'none', boxShadow: 'none', border: 'none' }}
      aria-label={`Compartilhar portfólio da tag ${tag}`}
      title={`Compartilhar portfólio da tag ${tag}`}
    >
      {copied ? <BiCheck size={compact ? 16 : 18} /> : <BiShareAlt size={compact ? 16 : 18} />}
      <span>{copied ? 'Link copiado!' : compact ? 'Compartilhar' : 'Enviar portfólio'}</span>
    </button>
  );
}
