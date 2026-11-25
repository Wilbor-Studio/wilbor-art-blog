'use client';

import { useEffect } from 'react';

/** Respiro extra (em cima e embaixo) de cada faixa de título. */
const VAR_EXTRA = '--band-extra';
/** Altura do header quando ele entra na divisão. */
const VAR_HEADER = '--band-header-h';

/**
 * Faz as faixas da página principal dividirem a altura da tela por igual:
 * o header (`data-band-header`), cada faixa de título (`data-band-row`:
 * Sobre, Exposições, Publicações…) e a faixa final do rodapé
 * (`data-band-bar`). Com tudo fechado, elas enchem a tela exatamente, todas
 * da mesma altura e com o título centralizado.
 *
 * A altura depende só da tela e de quantas faixas existem, nunca do que
 * está aberto: abrir uma seção só acrescenta o conteúdo dela abaixo do
 * título, sem o header nem as outras faixas mudarem de tamanho.
 *
 * As faixas de título e a final crescem pelo respiro em cima e embaixo
 * (--band-extra); o header, que de base é mais baixo (64px/90px contra
 * 82px/98px), recebe a altura final direto (--band-header-h). Numa tela
 * baixa demais para isso, tudo fica no tamanho de base.
 */
export default function useFillViewportBands() {
  useEffect(() => {
    const root = document.documentElement;
    let extra = 0; // respiro por lado de cada faixa, em px
    let headerAdd = 0; // quanto o header cresceu além da altura base, em px
    let frame = 0;

    const measure = () => {
      frame = 0;
      const visible = (el: Element) => el.getClientRects().length > 0;
      const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-band-row]')).filter(visible);
      const bar = document.querySelector<HTMLElement>('[data-band-bar]');
      const header = document.querySelector<HTMLElement>('[data-band-header]');
      if (!rows.length || !bar || !header) return;

      // Alturas de base, descontando o que já foi acrescentado.
      // getBoundingClientRect, e não offsetHeight: este arredonda para
      // inteiro, e a soma dos arredondamentos chegava a criar rolagem.
      const height = (el: Element) => el.getBoundingClientRect().height;
      const bandBase = height(bar) - 2 * extra;
      const headerBase = height(header) - headerAdd;

      const banner = document.getElementById('construction-banner');
      // 1px de folga: arredondamento de subpixel não pode criar rolagem; a
      // seção Contato (flex-1) absorve a sobra.
      const available = window.innerHeight - (banner ? height(banner) : 0) - 1;
      const bands = rows.length + 2; // títulos + faixa final + header
      const target = available / bands;

      const nextExtra = target > bandBase ? (target - bandBase) / 2 : 0;
      const nextHeaderAdd = target > bandBase ? target - headerBase : 0;

      if (Math.abs(nextExtra - extra) < 0.25 && Math.abs(nextHeaderAdd - headerAdd) < 0.5) return;
      extra = nextExtra;
      headerAdd = nextHeaderAdd;
      root.style.setProperty(VAR_EXTRA, `${extra}px`);
      if (headerAdd > 0) root.style.setProperty(VAR_HEADER, `${headerBase + headerAdd}px`);
      else root.style.removeProperty(VAR_HEADER);
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    // A conta só muda com o tamanho da tela ou com faixas entrando na
    // página (o Bota o Som e as Publicações chegam depois, do Hive). O
    // observer do corpo pega essas chegadas; abrir e fechar seções também o
    // dispara, mas aí o resultado é o mesmo e nada muda.
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    window.addEventListener('resize', schedule);
    schedule();

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
      root.style.removeProperty(VAR_EXTRA);
      root.style.removeProperty(VAR_HEADER);
    };
  }, []);
}
