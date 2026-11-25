'use client';

import AdminLoginLink from '@/admin/AdminLoginLink';
import { useEffect, useState } from 'react';

const MESSAGE = 'Welcome, Wilbor.';
/**
 * Caracteres do "ruído" antes de cada letra se resolver: katakana de meia
 * largura, os mesmos da chuva verde do Matrix (os de largura cheia não
 * cabem na caixa de 1ch e se sobrepunham), mais dígitos e símbolos.
 */
const GLYPHS = '01ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ<>/\\{}[]#$%&*+=';
const FRAME_MS = 45;
/**
 * Espera a faixa deslizar (500ms) e a página rolar até ela antes de
 * começar: senão a pessoa chega e a mensagem já está pela metade.
 */
const START_DELAY_MS = 1000;
/** Quadros só de ruído antes da primeira letra assentar. */
const NOISE_FRAMES = 10;
/** Quadros por letra resolvida. */
const FRAMES_PER_CHAR = 2;
/** Pausa entre a mensagem completa e o botão aparecer. */
const BUTTON_DELAY_MS = 350;

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/**
 * A porta do artista, revelada pelo easter egg do rodapé: "Welcome, Wilbor."
 * se decodifica letra por letra a partir de ruído, com um cursor piscando,
 * e então surge o botão de entrar, com borda e um brilho que respira.
 *
 * Começa quando `active` vira true. Com movimento reduzido no sistema,
 * mostra tudo pronto, sem animação.
 */
export default function ArtistDoor({ active }: { active: boolean }) {
  const [text, setText] = useState('');
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (!active) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setText(MESSAGE);
      setShowButton(true);
      return;
    }

    let frame = 0;
    let interval: ReturnType<typeof setInterval> | undefined;
    let buttonTimer: ReturnType<typeof setTimeout> | undefined;
    // Até começar, só ruído: a linha já aparece "chiando".
    setText(Array.from(MESSAGE, char => (char === ' ' ? ' ' : randomGlyph())).join(''));
    const startTimer = setTimeout(() => { interval = setInterval(() => {
      frame += 1;
      const resolved = Math.max(0, Math.floor((frame - NOISE_FRAMES) / FRAMES_PER_CHAR));
      setText(Array.from(MESSAGE, (char, i) =>
        i < resolved || char === ' ' ? char : randomGlyph()).join(''));
      if (resolved >= MESSAGE.length) {
        clearInterval(interval);
        buttonTimer = setTimeout(() => setShowButton(true), BUTTON_DELAY_MS);
      }
    }, FRAME_MS); }, START_DELAY_MS);

    return () => {
      clearTimeout(startTimer);
      if (interval) clearInterval(interval);
      if (buttonTimer) clearTimeout(buttonTimer);
    };
  }, [active]);

  return (
    <div className="flex flex-col items-center gap-5 font-mono">
      <p
        className="m-0 flex items-center gap-2 text-sm sm:text-base tracking-wider text-neutral-300"
        aria-label={MESSAGE}
      >
        <span aria-hidden="true" className="text-neutral-500">&gt;</span>
        {/* Cada caractere numa caixa de 1ch: o katakana do ruído é mais
            largo que as letras, e sem isso a linha dançava enquanto
            resolvia. */}
        <span aria-hidden="true" className="inline-flex">
          {Array.from(text || MESSAGE, (char, i) => (
            <span key={i} className="inline-block w-[1ch] text-center whitespace-pre">
              {char}
            </span>
          ))}
        </span>
        <span aria-hidden="true" className="artist-door-cursor">_</span>
      </p>

      {/* O espaço do botão já fica reservado: a faixa não pula quando ele
          aparece. */}
      <div
        className={[
          'transition-all duration-500 ease-out motion-reduce:transition-none',
          showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none',
        ].join(' ')}
        aria-hidden={!showButton}
      >
        <AdminLoginLink
          className={[
            'artist-door-button',
            '!border !border-solid !border-neutral-500 !rounded-md',
            '!px-6 !py-2.5 !text-xs !tracking-[0.25em]',
            '!text-neutral-200 hover:!text-white hover:!border-neutral-200',
          ].join(' ')}
        />
      </div>
    </div>
  );
}
