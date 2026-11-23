'use client';

import ImageCarousel from '@/components/ImageCarousel';
import ImageLightbox from '@/components/ImageLightbox';
import Image from 'next/image';
import { useCallback, useState } from 'react';

interface ExpandableCarouselProps {
  images: { src: string; alt?: string }[];
  inExpandedCard?: boolean;
  hasLittleContent?: boolean;
}

/**
 * Carrossel do card aberto com o próprio botão de tela cheia.
 *
 * Cada carrossel (ou imagem sozinha) do post se expande separado: a tela
 * cheia abre na imagem que estava visível e só passa pelas imagens deste
 * carrossel. Antes havia um botão só, no card, que misturava as imagens
 * de todos os carrosséis do post.
 */
export default function ExpandableCarousel({
  images,
  inExpandedCard,
  hasLittleContent,
}: ExpandableCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <div className="relative">
      <ImageCarousel
        images={images}
        inExpandedCard={inExpandedCard}
        hasLittleContent={hasLittleContent}
        currentIndex={index}
        onIndexChange={setIndex}
      />

      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          setIsOpen(true);
        }}
        aria-label={images.length > 1
          ? `Ver imagem ${index + 1} de ${images.length} em tela cheia`
          : 'Ver imagem em tela cheia'}
        title="Tela cheia"
        className={[
          // 40px: alvo de toque confortável no iPhone e no iPad.
          'absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center',
          'rounded-full border-0 bg-black/45 p-0 shadow-none backdrop-blur-sm',
          'transition hover:bg-black/70',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
        ].join(' ')}
      >
        <Image
          src="/wilborPhotos/Full-Screen-Icon-Wilbor-site.png"
          alt=""
          width={22}
          height={22}
          // O ícone é cinza; sobre o fundo escuro do botão fica branco.
          className="brightness-0 invert"
        />
      </button>

      {isOpen && (
        <ImageLightbox images={images} startIndex={index} onClose={close} />
      )}
    </div>
  );
}
