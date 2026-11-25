'use client';

import { IconX } from '@/components/IconX';
import ImageCarousel from '@/components/ImageCarousel';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
  images: { src: string; alt?: string }[];
  /** Imagem que abre primeiro. */
  startIndex?: number;
  onClose: () => void;
}

/**
 * Tela cheia de um carrossel: mostra só as imagens dele, a partir da que
 * estava visível, e permite passar para os lados (toque, clique nas
 * laterais, setas do teclado).
 *
 * Renderizado num portal no <body>. O clique ainda sobe pela árvore do
 * React até o card que abriu a tela cheia, então ele é barrado aqui.
 */
export default function ImageLightbox({ images, startIndex = 0, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Trava a rolagem do fundo, acompanha a altura real da tela (barra do
  // Safari no iPhone) e responde ao teclado enquanto aberto.
  useEffect(() => {
    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const prev = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      bodyBackground: body.style.backgroundColor,
      bodyOverscroll: body.style.overscrollBehavior,
      docOverflow: documentElement.style.overflow,
      docOverscroll: documentElement.style.overscrollBehavior,
      docBackground: documentElement.style.backgroundColor,
      fullscreenVh: documentElement.style.getPropertyValue('--fullscreen-vh'),
    };

    documentElement.style.overflow = 'hidden';
    documentElement.style.overscrollBehavior = 'none';
    documentElement.style.backgroundColor = '#000';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    body.style.backgroundColor = '#000';
    // iOS/Android: fixa o body para impedir a rolagem de fundo.
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    const setViewportHeight = () => {
      const height = window.visualViewport?.height ?? window.innerHeight;
      documentElement.style.setProperty('--fullscreen-vh', `${Math.round(height)}px`);
    };
    setViewportHeight();

    const count = images.length;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (count < 2) return;
      if (event.key === 'ArrowRight') setIndex(i => (i + 1) % count);
      if (event.key === 'ArrowLeft') setIndex(i => (i - 1 + count) % count);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', setViewportHeight);
    window.visualViewport?.addEventListener('resize', setViewportHeight);
    window.visualViewport?.addEventListener('scroll', setViewportHeight);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', setViewportHeight);
      window.visualViewport?.removeEventListener('resize', setViewportHeight);
      window.visualViewport?.removeEventListener('scroll', setViewportHeight);

      documentElement.style.overflow = prev.docOverflow;
      documentElement.style.overscrollBehavior = prev.docOverscroll;
      documentElement.style.backgroundColor = prev.docBackground;
      body.style.overflow = prev.bodyOverflow;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      body.style.backgroundColor = prev.bodyBackground;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      if (prev.fullscreenVh) {
        documentElement.style.setProperty('--fullscreen-vh', prev.fullscreenVh);
      } else {
        documentElement.style.removeProperty('--fullscreen-vh');
      }
      window.scrollTo(0, scrollY);
    };
  }, [images.length, onClose]);

  if (!mounted || images.length === 0) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Imagem ${index + 1} de ${images.length}`}
      onClick={event => event.stopPropagation()}
      className="fixed inset-x-0 top-0 z-[9999] bg-black"
      style={{
        width: '100vw',
        height: 'var(--fullscreen-vh, 100svh)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <button
        type="button"
        onClick={event => {
          event.stopPropagation();
          onClose();
        }}
        aria-label="Fechar tela cheia"
        className="fixed right-4 top-4 z-[10000] flex items-center justify-center rounded-full p-1 focus:outline-none sm:right-6 sm:top-6 sm:p-2"
        style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
      >
        {/* Na tela cheia o X é sempre preto: no tema claro ele seria branco
            (o padrão do IconX), e o artista quer o mesmo X do tema escuro. */}
        <IconX size={35} lineColor="black" />
      </button>

      <ImageCarousel
        images={images}
        fullscreen
        currentIndex={index}
        onIndexChange={setIndex}
      />
    </div>,
    document.body,
  );
}
