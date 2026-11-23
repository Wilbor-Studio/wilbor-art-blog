'use client';

import Markdown from '@/components/Markdown';
import { splitMarkdownSections } from '@/utility/markdown-sections';

/**
 * Resumo da seção "sobre".
 *
 * O texto abaixo é o padrão que vai no HTML do servidor — bom para SEO e para
 * a página não ficar vazia se o Hive falhar. Se o artista tiver publicado uma
 * versão própria (lida pela página com useSitePost), ela substitui isto
 * depois da hidratação.
 */
export const ABOUT_SUMMARY_FALLBACK = [
  '## Wilbor Studio',
  '',
  'Estúdio de criação multimídia fundado por Wilson Domingues em 2010, com ' +
  'raízes na contracultura do skate dos anos 90, no punk rock e no hip hop. ' +
  'Reúne artes visuais, gravura, design, fotografia e cinema para criar ' +
  'comunicação e identidade visual de marcas e instituições ligadas a ' +
  'música, tecnologia, moda, arte e ativismo — de videoclipes e ' +
  'documentários a murais, capas de álbum e projetos gráficos.',
  '',
  '## Wilson Domingues “Wilbor”',
  '',
  'Artista visual, diretor e skatista carioca. Dirigiu “021 RSRJ” (2002), o ' +
  'primeiro vídeo de street skate do Rio, e fundou o Coletivo XV, que levou ' +
  'à legalização do skate na Praça XV. No trabalho plástico, transforma ' +
  'shapes de skate em matrizes de xilogravura — o projeto XILOSHAPES — com ' +
  'obras no acervo do The Skateboard Museum, em Berlim, e mostras no Rio, em ' +
  'Nova Iorque, na Alemanha, na Romênia e na China.',
].join('\n');

export default function AboutSummary({
  markdown,
}: {
  /** Versão publicada no Hive; sem ela, vale o texto padrão acima. */
  markdown?: string | null
}) {
  const { sections } = splitMarkdownSections(markdown || ABOUT_SUMMARY_FALLBACK);

  return (
    <div className="mb-4 sm:mb-6">
      <div className="space-y-5 sm:space-y-6">
        {sections.map(({ title, content }) => (
          <section
            key={title}
            className={[
              'border-l-2 pl-4 sm:pl-5',
              'border-neutral-300 dark:border-neutral-700',
            ].join(' ')}
          >
            <h3 className="text-base sm:text-lg font-bold mb-1.5">
              {title}
            </h3>
            <div
              className={[
                'text-sm sm:text-base leading-relaxed',
                'text-neutral-600 dark:text-neutral-300',
              ].join(' ')}
            >
              <Markdown>{content}</Markdown>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
