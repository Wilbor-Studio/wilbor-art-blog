import { useTheme } from 'next-themes';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ImageCarouselProps {
  images: { src: string; alt?: string }[];
  fullscreen?: boolean;
  inExpandedCard?: boolean;
  hasLittleContent?: boolean;
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
}

/** Faixa de proporção aceita para o carrossel (largura / altura). */
const MIN_RATIO = 0.75;
const MAX_RATIO = 2;

/**
 * Carrossel no estilo do Instagram.
 *
 * Usa a rolagem nativa com encaixe (scroll-snap): no toque a imagem
 * acompanha o dedo, com a inércia do próprio iPhone/iPad, e para sempre
 * alinhada. As setas nas laterais deslizam até a vizinha; a anterior some
 * na primeira imagem e a próxima, na última (sem dar a volta).
 *
 * Fora da tela cheia, a proporção vem da primeira imagem (dentro de
 * 3:4 a 2:1) e as outras são recortadas nesse formato, como no Instagram:
 * a altura não pula e não sobra faixa entre uma foto e outra ao deslizar.
 * A foto inteira fica na tela cheia.
 *
 * Aceita índice controlado (currentIndex/onIndexChange) para a tela cheia
 * abrir na imagem certa e responder às setas do teclado.
 */
export default function ImageCarousel({
  images,
  fullscreen = false,
  inExpandedCard = false,
  currentIndex,
  onIndexChange,
}: ImageCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [internalIndex, setInternalIndex] = useState(currentIndex ?? 0);
  const current = currentIndex ?? internalIndex;
  const [ratio, setRatio] = useState<number | null>(null);
  const [srcOverrides, setSrcOverrides] = useState<Record<string, string>>({});
  const hasInteracted = useRef(false);

  const { theme, systemTheme } = useTheme();
  const isDark = (theme === 'system' ? systemTheme : theme) === 'dark';
  // Mesma cor de cinza escuro do ícone de fechar (IconX) no modo escuro.
  const inactiveDotBg = isDark ? '#626262' : '#e5e7eb';
  const activeDotBg = '#ef4444';

  const count = images.length;

  const changeIndex = useCallback((next: number) => {
    setInternalIndex(next);
    onIndexChange?.(next);
  }, [onIndexChange]);

  /** Desliza até a imagem (sem animação na abertura, com animação depois). */
  const scrollToIndex = useCallback((index: number, smooth: boolean) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // A rolagem é a fonte da verdade: ao assentar numa imagem, atualiza o índice.
  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== current && index >= 0 && index < count) changeIndex(index);
  }, [current, count, changeIndex]);

  // Índice vindo de fora (tela cheia abrindo numa imagem, teclado): rola até ela.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !el.clientWidth) return;
    const shown = Math.round(el.scrollLeft / el.clientWidth);
    if (shown !== current) scrollToIndex(current, hasInteracted.current);
    hasInteracted.current = true;
  }, [current, scrollToIndex]);

  // Mantém a imagem atual alinhada quando a largura muda (girar o iPad).
  // Só reage a mudança real de largura: realinhar a cada troca de imagem
  // cortaria a animação das setas no meio.
  const currentRef = useRef(current);
  currentRef.current = current;
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      scrollToIndex(currentRef.current, false);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollToIndex]);

  const go = (step: number) => {
    const next = Math.min(count - 1, Math.max(0, current + step));
    if (next !== current) scrollToIndex(next, true);
  };

  if (count === 0) return null;

  const aspectRatio = fullscreen
    ? undefined
    : ratio ? Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio)) : 4 / 3;

  const arrowBase = [
    'absolute top-1/2 z-10 -translate-y-1/2',
    'flex items-center justify-center rounded-full border-0 p-0',
    'bg-white/90 text-neutral-900 shadow-md backdrop-blur-sm',
    'transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white',
    fullscreen ? 'h-11 w-11' : 'h-9 w-9',
  ].join(' ');

  return (
    <div
      className={fullscreen
        ? 'relative h-full w-full'
        : inExpandedCard
          ? 'relative flex w-full flex-col items-center'
          : 'relative my-6 flex w-full flex-col items-center'}
    >
      <div className={fullscreen ? 'relative h-full w-full' : 'relative w-full'}>
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="carousel-scroller flex w-full overflow-x-auto overflow-y-hidden"
          style={{
            scrollSnapType: 'x mandatory',
            overscrollBehaviorX: 'contain',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            height: fullscreen ? '100%' : undefined,
            aspectRatio,
            borderRadius: fullscreen ? undefined : 8,
          }}
          role="region"
          aria-roledescription="carrossel"
          aria-label={count > 1 ? `Imagem ${current + 1} de ${count}` : undefined}
        >
          {images.map((img, idx) => {
            const src = srcOverrides[img.src] || img.src;
            return (
              <div
                key={`${img.src}-${idx}`}
                className="flex h-full w-full shrink-0 items-center justify-center"
                style={{
                  flex: '0 0 100%',
                  scrollSnapAlign: 'center',
                  scrollSnapStop: 'always',
                }}
              >
                <img
                  src={src}
                  alt={img.alt || ''}
                  loading={idx === current ? 'eager' : 'lazy'}
                  decoding="async"
                  draggable={false}
                  className="block h-full w-full select-none"
                  // Como no Instagram: no card, toda foto preenche o carrossel
                  // (recortada no formato da primeira), sem faixas que, ao
                  // deslizar, parecem uma borda entre as imagens. Na tela
                  // cheia ela aparece inteira, sobre o fundo preto.
                  style={{ objectFit: fullscreen ? 'contain' : 'cover', objectPosition: 'center' }}
                  onLoad={event => {
                    if (idx !== 0) return;
                    const { naturalWidth, naturalHeight } = event.currentTarget;
                    if (naturalWidth && naturalHeight) setRatio(naturalWidth / naturalHeight);
                  }}
                  onError={() => {
                    // Gateway original fora (404/timeout): tenta pelo proxy da Hive.
                    setSrcOverrides(prev => prev[img.src]
                      ? prev
                      : { ...prev, [img.src]: `https://images.hive.blog/0x0/${img.src}` });
                  }}
                />
              </div>
            );
          })}
        </div>

        {count > 1 && current > 0 && (
          <button
            type="button"
            aria-label="Imagem anterior"
            onClick={event => {
              event.stopPropagation();
              go(-1);
            }}
            className={`${arrowBase} left-2 sm:left-3`}
          >
            <Chevron direction="left" />
          </button>
        )}
        {count > 1 && current < count - 1 && (
          <button
            type="button"
            aria-label="Próxima imagem"
            onClick={event => {
              event.stopPropagation();
              go(1);
            }}
            className={`${arrowBase} right-2 sm:right-3`}
          >
            <Chevron direction="right" />
          </button>
        )}
      </div>

      {count > 1 && (
        <div
          className={fullscreen
            ? 'pointer-events-none absolute inset-x-0 bottom-2 z-10 flex flex-wrap items-center justify-center gap-2 sm:bottom-3 sm:gap-3'
            : 'mt-1 flex flex-wrap items-center justify-center gap-2'}
        >
          {images.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={event => {
                event.stopPropagation();
                scrollToIndex(idx, true);
              }}
              aria-label={`Ir para imagem ${idx + 1}`}
              aria-current={idx === current}
              className="pointer-events-auto rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              style={{
                width: fullscreen ? 16 : 13,
                height: fullscreen ? 16 : 13,
                padding: 0,
                border: 0,
                background: idx === current
                  ? activeDotBg
                  : (fullscreen ? 'rgba(255,255,255,0.3)' : inactiveDotBg),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'}
      />
    </svg>
  );
}
