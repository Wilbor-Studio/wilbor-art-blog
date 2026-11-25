'use client';

import { useEffect, useState } from 'react';

/**
 * Brilho que percorre as faixas da página principal (header, títulos das
 * seções e rodapé) de tempos em tempos, de cima para baixo: cada faixa, na
 * sua vez, acende por dentro (luz que nasce do centro dela) e cresce um
 * pouco, depois volta (band-glow em tailwind.css).
 *
 * Só acontece com tudo fechado: a grade de projetos (`gridOpen`), todas as
 * seções (nenhuma faixa com aria-expanded="true") e o menu.
 */
export default function ClosedBandsShimmer({ gridOpen }: { gridOpen: boolean }) {
  const [sectionsClosed, setSectionsClosed] = useState(false);

  useEffect(() => {
    const check = () => {
      const anyOpen = document.querySelector('button[data-band-row][aria-expanded="true"]');
      const menuOpen = document.getElementById('desktop-tags-drawer')
        || document.getElementById('mobile-tags-drawer');
      setSectionsClosed(!anyOpen && !menuOpen);
    };
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['aria-expanded'],
    });
    return () => observer.disconnect();
  }, []);

  const active = sectionsClosed && !gridOpen;

  useEffect(() => {
    if (!active) return;

    // A faixa que brilha é o elemento que pinta o fundo dela (a seção
    // inteira, não só o botão do título): o marcador, ou o primeiro
    // ancestral com cor de fundo.
    const markers = document.querySelectorAll<HTMLElement>(
      '[data-band-header], button[data-band-row], [data-band-bar]',
    );
    const bands: HTMLElement[] = [];
    markers.forEach(marker => {
      let el: HTMLElement | null = marker;
      while (el && el !== document.body) {
        const bg = getComputedStyle(el).backgroundColor;
        if (bg && bg !== 'transparent' && !bg.endsWith(', 0)')) break;
        el = el.parentElement;
      }
      const band = el && el !== document.body ? el : marker;
      if (!bands.includes(band)) bands.push(band);
    });

    bands.forEach((band, i) => {
      band.style.setProperty('--glow-i', String(i));
      band.classList.add('band-glow');
      // Para subir acima das vizinhas enquanto cresce; o header já é sticky.
      if (getComputedStyle(band).position === 'static') {
        band.classList.add('band-glow-relative');
      }
    });

    return () => {
      bands.forEach(band => {
        band.classList.remove('band-glow', 'band-glow-relative');
        band.style.removeProperty('--glow-i');
      });
    };
  }, [active]);

  return null;
}
