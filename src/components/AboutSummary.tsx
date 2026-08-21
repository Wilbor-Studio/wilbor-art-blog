'use client';

import EditSiteContentButton from '@/admin/EditSiteContentButton';
import Markdown from '@/components/Markdown';
import {
  PERMLINK_ABOUT_SUMMARY,
  fetchPostBody,
} from '@/lib/hive/site-content';
import { splitMarkdownSections } from '@/utility/markdown-sections';
import { useEffect, useState } from 'react';

/**
 * Resumo da seção "sobre".
 *
 * O texto abaixo é o padrão que vai no HTML do servidor — bom para SEO e para
 * a página não ficar vazia se o Hive falhar. Se o artista tiver publicado uma
 * versão própria, ela substitui isto depois da hidratação.
 */
const FALLBACK_MARKDOWN = [
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

export default function AboutSummary() {
  const [markdown, setMarkdown] = useState(FALLBACK_MARKDOWN);
  const [published, setPublished] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPostBody(PERMLINK_ABOUT_SUMMARY).then(body => {
      if (!active || !body) return;
      setPublished(body);
      setMarkdown(body);
    });
    return () => { active = false; };
  }, []);

  const { sections } = splitMarkdownSections(markdown);

  return (
    <div className="mb-8 sm:mb-10">
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

      <div className="mt-3">
        <EditSiteContentButton
          permlink={PERMLINK_ABOUT_SUMMARY}
          title="resumo sobre"
          currentMarkdown={published}
          fallbackMarkdown={FALLBACK_MARKDOWN}
          label="editar resumo"
        />
      </div>
    </div>
  );
}
