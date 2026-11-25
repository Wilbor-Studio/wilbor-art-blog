'use client';

import ImageLightbox from '@/components/ImageLightbox';
import type { SectionImageSlot } from '@/lib/hive/site-content';
import { useSiteConfig } from '@/lib/hive/useSiteConfig';
import Image from 'next/image';
import { useState } from 'react';

/**
 * Imagem de abertura de uma seção, no topo do conteúdo dela: 16:9, na
 * largura da coluna (em telas pequenas encolhe junto, sem cortar). Um
 * clique em qualquer ponto dela abre em tela cheia; o ícone no canto, o
 * mesmo dos carrosséis dos projetos, indica isso.
 *
 * A imagem vem das configurações do site (sectionImages). Enquanto o
 * artista não definir uma, fica o espaço vazio no tamanho certo, visível
 * para todos, marcando onde ela vai entrar.
 */
export default function SectionBanner({
  slot,
  alt,
}: {
  slot: SectionImageSlot
  /** Texto alternativo da imagem (nome da seção). */
  alt: string
}) {
  const { sectionImages } = useSiteConfig();
  const [fullscreen, setFullscreen] = useState(false);

  const src = sectionImages[slot];

  if (!src) {
    // Espaço vazio 16:9, sem texto nem tela cheia: só marca o lugar.
    return (
      <div
        aria-hidden="true"
        className={[
          'mb-5 aspect-video w-full rounded-lg',
          'border-2 border-dashed border-neutral-300 dark:border-neutral-700',
          'bg-neutral-200/60 dark:bg-neutral-800/60',
        ].join(' ')}
      />
    );
  }

  return (
    <figure className="relative m-0 mb-5 w-full overflow-hidden rounded-lg bg-neutral-200 dark:bg-neutral-800">
      {/* A imagem inteira é o botão: um clique abre em tela cheia. Caixa
          16:9 fixa: reserva o espaço antes de a imagem carregar, e a imagem
          cobre sem distorcer. */}
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          setFullscreen(true);
        }}
        aria-label={`Ver imagem de ${alt} em tela cheia`}
        title="Tela cheia"
        className="group relative block aspect-video w-full cursor-zoom-in border-0 bg-transparent p-0 shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Mesmo ícone de tela cheia dos carrosséis dos projetos. */}
        <span
          aria-hidden="true"
          className={[
            'absolute right-2 top-2 flex h-10 w-10 items-center justify-center',
            'rounded-full bg-black/45 backdrop-blur-sm transition group-hover:bg-black/70',
          ].join(' ')}
        >
          <Image
            src="/wilborPhotos/Full-Screen-Icon-Wilbor-site.png"
            alt=""
            width={22}
            height={22}
            className="brightness-0 invert"
          />
        </span>
      </button>

      {fullscreen && (
        <ImageLightbox images={[{ src, alt }]} onClose={() => setFullscreen(false)} />
      )}
    </figure>
  );
}
