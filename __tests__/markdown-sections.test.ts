import { splitMarkdownSections } from '../src/utility/markdown-sections';

// Mesma forma do post "Parceiros" no Hive: títulos de nível 2 separados por
// régua, e uma nota de encerramento depois da última régua.
const PARTNERS = [
  '## Marcas e Instituições',
  '',
  '- ONErpm  ',
  '- Circo Voador  ',
  '- OffStep',
  '',
  '---',
  '',
  '##  Artists & Musicians',
  '',
  '- Planet Hemp  ',
  '- Bnegão',
  '',
  '---',
  '',
  '##  Skaters',
  '',
  '- Leo Lopes  ',
  '- Paul Rodriguez',
  '',
  '---',
  '',
  '_This list represents only a portion of the partners._',
].join('\n');

describe('splitMarkdownSections', () => {
  it('separa as três categorias de parceiros', () => {
    const { sections } = splitMarkdownSections(PARTNERS);

    expect(sections.map(s => s.title)).toEqual([
      'Marcas e Instituições',
      'Artists & Musicians',
      'Skaters',
    ]);
  });

  it('conta os itens de cada categoria', () => {
    const { sections } = splitMarkdownSections(PARTNERS);
    expect(sections.map(s => s.itemCount)).toEqual([3, 2, 2]);
  });

  it('mantém a nota final fora das seções', () => {
    const { sections, loose } = splitMarkdownSections(PARTNERS);

    expect(loose).toBe('_This list represents only a portion of the partners._');
    // a régua não pode deixar a nota grudada na última categoria
    expect(sections[2].content).not.toContain('This list represents');
  });

  it('não deixa a régua nem o título dentro do conteúdo', () => {
    const { sections } = splitMarkdownSections(PARTNERS);

    sections.forEach(section => {
      expect(section.content).not.toMatch(/^---$/m);
      expect(section.content).not.toContain('## ');
    });
    expect(sections[0].content.split('\n').map(l => l.trim())).toEqual([
      '- ONErpm',
      '- Circo Voador',
      '- OffStep',
    ]);
  });

  it('ignora títulos de outro nível', () => {
    const { sections } = splitMarkdownSections(
      '# Título\n\n## Um\n\n- a\n\n### Sub\n\n- b',
    );

    expect(sections.map(s => s.title)).toEqual(['Um']);
    expect(sections[0].content).toContain('### Sub');
  });

  it('devolve vazio para markdown vazio', () => {
    expect(splitMarkdownSections('')).toEqual({ sections: [], loose: '' });
  });
});
