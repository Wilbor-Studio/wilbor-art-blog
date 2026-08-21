/**
 * Resumo da seção "sobre". Diferente do restante da página, este texto é
 * conteúdo do site — fica versionado aqui, não vem de um post do Hive.
 * Serve de abertura para o texto completo que aparece logo abaixo.
 */

const SUMMARIES = [
  {
    title: 'Wilbor Studio',
    text: 'Estúdio de criação multimídia fundado por Wilson Domingues em ' +
      '2010, com raízes na contracultura do skate dos anos 90, no punk rock ' +
      'e no hip hop. Reúne artes visuais, gravura, design, fotografia e ' +
      'cinema para criar comunicação e identidade visual de marcas e ' +
      'instituições ligadas a música, tecnologia, moda, arte e ativismo — ' +
      'de videoclipes e documentários a murais, capas de álbum e projetos ' +
      'gráficos.',
  },
  {
    title: 'Wilson Domingues “Wilbor”',
    text: 'Artista visual, diretor e skatista carioca. Dirigiu “021 RSRJ” ' +
      '(2002), o primeiro vídeo de street skate do Rio, e fundou o Coletivo ' +
      'XV, que levou à legalização do skate na Praça XV. No trabalho ' +
      'plástico, transforma shapes de skate em matrizes de xilogravura — o ' +
      'projeto XILOSHAPES — com obras no acervo do The Skateboard Museum, ' +
      'em Berlim, e mostras no Rio, em Nova Iorque, na Alemanha, na Romênia ' +
      'e na China.',
  },
];

export default function AboutSummary() {
  return (
    <div className="space-y-5 sm:space-y-6 mb-8 sm:mb-10">
      {SUMMARIES.map(({ title, text }) => (
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
          <p
            className={[
              'text-sm sm:text-base leading-relaxed',
              'text-neutral-600 dark:text-neutral-300',
            ].join(' ')}
          >
            {text}
          </p>
        </section>
      ))}
    </div>
  );
}
