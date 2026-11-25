'use client';

import { useEffect, useRef } from 'react';

/** Folga para considerar que a página chegou ao fim (arredondamentos). */
const BOTTOM_SLACK = 4;
/** Pausa entre eventos de rodinha/touchpad que separa um empurrão do outro. */
const WHEEL_BURST_GAP = 200;
/** Sem novo empurrão nesse tempo, a contagem recomeça. */
const STREAK_TIMEOUT = 2500;
/** Arrasto mínimo do dedo para contar como empurrão. */
const MIN_SWIPE = 30;

/**
 * Easter egg: chama `onReveal` quando a pessoa, já no fim da página, insiste
 * em rolar mais `times` vezes seguidas, como se forçasse a página a ceder.
 *
 * Conta como empurrão, sempre com a página no fim:
 * - rodinha ou touchpad para baixo (uma rajada de eventos vale um);
 * - no celular, arrastar o dedo para cima (o gesto de rolar para baixo);
 * - seta para baixo, Page Down, espaço ou End no teclado.
 *
 * Rolar para cima, sair do fim ou demorar demais entre um e outro zera a
 * contagem. Depois de disparar, não conta mais.
 */
export default function useBottomPushReveal(
  onReveal: () => void,
  { times = 5, enabled = true }: { times?: number, enabled?: boolean } = {},
) {
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  useEffect(() => {
    if (!enabled) return;

    let count = 0;
    let lastPush = 0;
    let lastWheel = 0;
    // Força (|deltaY|) do empurrão atual: o pico e o menor valor desde ele.
    let peak = 0;
    let trough = 0;
    let touchStartY: number | null = null;
    let touchStartedAtBottom = false;
    let done = false;

    const atBottom = () =>
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - BOTTOM_SLACK;

    const reset = () => { count = 0; };

    const push = () => {
      if (done) return;
      const now = Date.now();
      if (now - lastPush > STREAK_TIMEOUT) count = 0;
      lastPush = now;
      count += 1;
      if (count >= times) {
        done = true;
        onRevealRef.current();
      }
    };

    // Um empurrão de rodinha ou touchpad é uma rajada de eventos. Começa um
    // novo depois de uma pausa ou, no touchpad, quando a pessoa arrasta de
    // novo antes de a inércia do anterior acabar: a força, que vinha caindo
    // (menos da metade do pico), volta a subir de repente.
    const onWheel = (event: WheelEvent) => {
      const now = Date.now();
      const force = Math.abs(event.deltaY);
      const paused = now - lastWheel > WHEEL_BURST_GAP;
      lastWheel = now;
      if (event.deltaY < 0) { reset(); peak = trough = 0; return; }
      if (event.deltaY === 0) return;

      const swipedAgain = !paused && trough < peak * 0.5 && force > trough * 2 + 4;
      if (paused || swipedAgain) {
        peak = trough = force;
        if (atBottom()) push();
        return;
      }
      if (force > peak) peak = trough = force;
      else if (force < trough) trough = force;
    };

    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? null;
      touchStartedAtBottom = atBottom();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (touchStartY === null) return;
      const endY = event.changedTouches[0]?.clientY ?? touchStartY;
      const dragUp = touchStartY - endY; // dedo para cima = rolar para baixo
      touchStartY = null;
      if (dragUp < -MIN_SWIPE) { reset(); return; }
      if (dragUp > MIN_SWIPE && touchStartedAtBottom && atBottom()) push();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Digitando num campo (a caixa de mensagem), o teclado é do campo.
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (['ArrowUp', 'PageUp', 'Home'].includes(event.key)) { reset(); return; }
      if (['ArrowDown', 'PageDown', 'End', ' '].includes(event.key) && atBottom()) push();
    };

    // Saiu do fim rolando para cima: a sequência quebrou.
    const onScroll = () => { if (!atBottom()) reset(); };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll);
    };
  }, [times, enabled]);
}
