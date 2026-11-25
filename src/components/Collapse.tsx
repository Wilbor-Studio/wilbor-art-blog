'use client';

import { useEffect, useState } from 'react';

/** Duração da animação de abrir e fechar, em ms. */
const DURATION = 500;

/**
 * Conteúdo que abre e fecha deslizando: a altura vai de 0 até a do conteúdo
 * (grid-template-rows 0fr → 1fr, que anima qualquer altura sem medir nada)
 * enquanto o conteúdo aparece em fade. Fechar faz o caminho inverso.
 *
 * Fechado, o conteúdo fica invisível (fora da navegação por teclado e dos
 * leitores de tela) e, sem `keepMounted`, é desmontado ao fim da animação.
 */
export default function Collapse({
  open,
  keepMounted = false,
  id,
  className,
  children,
}: {
  open: boolean
  /** Fechado, só esconde em vez de desmontar (preserva o estado do conteúdo). */
  keepMounted?: boolean
  id?: string
  /** Classes do conteúdo (padding etc.), que recolhe junto com ele. */
  className?: string
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(open);
  const [expanded, setExpanded] = useState(open);
  // Aberto e parado: libera o overflow, para sombras, zoom de hover e
  // elementos sticky do conteúdo não ficarem cortados.
  const [settled, setSettled] = useState(open);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (open) {
      setMounted(true);
      // Espera o conteúdo montar fechado antes de expandir; no mesmo frame
      // o navegador não veria a transição.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (!cancelled) setExpanded(true);
        });
      });
      timer = setTimeout(() => { if (!cancelled) setSettled(true); }, DURATION + 50);
    } else {
      setSettled(false);
      setExpanded(false);
      if (!keepMounted) {
        timer = setTimeout(() => { if (!cancelled) setMounted(false); }, DURATION + 50);
      }
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      if (timer) clearTimeout(timer);
    };
  }, [open, keepMounted]);

  if (!mounted && !keepMounted) return null;

  return (
    <div
      id={id}
      className={[
        // Coluna travada na largura disponível: sem isso, a coluna do grid
        // crescia até a largura mínima do conteúdo (um link longo, por
        // exemplo) e tudo dentro vazava da tela no celular.
        'grid grid-cols-[minmax(0,1fr)] ease-in-out motion-reduce:transition-none',
        'transition-[grid-template-rows,opacity,visibility]',
        expanded ? 'grid-rows-[1fr] opacity-100 visible' : 'grid-rows-[0fr] opacity-0 invisible',
      ].join(' ')}
      style={{ transitionDuration: `${DURATION}ms` }}
    >
      <div className={`min-h-0 min-w-0 ${settled ? 'overflow-visible' : 'overflow-hidden'}`}>
        <div className={className}>{children}</div>
      </div>
    </div>
  );
}
