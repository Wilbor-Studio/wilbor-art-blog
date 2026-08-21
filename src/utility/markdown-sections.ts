export interface MarkdownSection {
  /** Texto do título (sem os `#`). */
  title: string;
  /** Conteúdo abaixo do título, já sem o próprio título. */
  content: string;
  /** Itens de lista encontrados na seção — usado para exibir a contagem. */
  itemCount: number;
}

export interface SplitMarkdownResult {
  sections: MarkdownSection[];
  /** Texto solto que não pertence a nenhuma seção (nota de rodapé, intro). */
  loose: string;
}

const HEADING = /^(#{1,6})\s+(.*\S)\s*$/;
const RULE = /^\s*-{3,}\s*$/;
const LIST_ITEM = /^\s*[-*+]\s+\S/;

/**
 * Quebra um markdown em seções a partir dos títulos de um nível.
 *
 * Uma seção termina no próximo título do mesmo nível ou numa linha `---`.
 * Tratar o `---` como fim importa porque os posts do Wilbor usam a régua para
 * separar blocos, e sem isso a última seção engoliria a nota de encerramento.
 *
 * O que sobra fora de qualquer seção volta em `loose`, para a página decidir
 * onde mostrar.
 */
export function splitMarkdownSections(
  markdown: string,
  level = 2,
): SplitMarkdownResult {
  const sections: MarkdownSection[] = [];
  const loose: string[] = [];

  let current: { title: string; lines: string[] } | null = null;

  const closeCurrent = () => {
    if (!current) return;
    const content = current.lines.join('\n').trim();
    sections.push({
      title: current.title,
      content,
      itemCount: current.lines.filter(line => LIST_ITEM.test(line)).length,
    });
    current = null;
  };

  for (const line of (markdown || '').split('\n')) {
    const heading = line.match(HEADING);

    if (heading && heading[1].length === level) {
      closeCurrent();
      current = { title: heading[2].trim(), lines: [] };
      continue;
    }

    if (RULE.test(line)) {
      closeCurrent();
      continue;
    }

    if (current) {
      current.lines.push(line);
    } else if (line.trim()) {
      loose.push(line);
    }
  }

  closeCurrent();

  return { sections, loose: loose.join('\n').trim() };
}
