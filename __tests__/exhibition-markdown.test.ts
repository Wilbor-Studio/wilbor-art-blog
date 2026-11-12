import { normalizeExhibitionMarkdown, splitExhibitionSections } from '@/utility/exhibition-markdown';

describe('normalizeExhibitionMarkdown', () => {
  it('move a data escrita antes do título para depois dele', () => {
    const input = [
      '## Despina',
      '###### 01/2017',
      'Rio de Janeiro',
      '',
      '',
      '###### 01/2017',
      '## Graffiti on Debate',
      '',
      'Debate',
    ].join('\n');

    expect(normalizeExhibitionMarkdown(input)).toBe([
      '## Despina',
      '###### 01/2017',
      'Rio de Janeiro',
      '',
      '',
      '## Graffiti on Debate',
      '###### 01/2017',
      '',
      'Debate',
    ].join('\n'));
  });

  it('mantém entradas que já estão no formato título → data', () => {
    const input = '## MULTIVERSO\n07/05/2022\n\nInstalação';
    expect(normalizeExhibitionMarkdown(input)).toBe(input);
  });

  it('aceita intervalo de anos', () => {
    const input = '###### 2008–2007\n## Mostra Livre\nTexto';
    expect(normalizeExhibitionMarkdown(input)).toBe('## Mostra Livre\n###### 2008–2007\nTexto');
  });

  it('não confunde número no meio do texto com data', () => {
    const input = 'Exposição de 2015\n## Próxima';
    expect(normalizeExhibitionMarkdown(input)).toBe(input);
  });
});

describe('splitExhibitionSections', () => {
  it('separa o post em cada # e tira o título do corpo', () => {
    const input = '# EXPOSIÇÕES\n## Multiverso\n2023\n\n# PUBLICAÇÕES\n## Dumbo Magazine\n2015';
    expect(splitExhibitionSections(input)).toEqual([
      { title: 'EXPOSIÇÕES', body: '## Multiverso\n2023' },
      { title: 'PUBLICAÇÕES', body: '## Dumbo Magazine\n2015' },
    ]);
  });

  it('mantém o texto antes do primeiro # sem título', () => {
    expect(splitExhibitionSections('Intro\n# A\ntexto')).toEqual([
      { title: null, body: 'Intro' },
      { title: 'A', body: 'texto' },
    ]);
  });

  it('não separa em ## nem em # sem espaço', () => {
    const input = '## B\n#hashtag';
    expect(splitExhibitionSections(input)).toEqual([{ title: null, body: input }]);
  });
});
