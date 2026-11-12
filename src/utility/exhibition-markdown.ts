// Mesma regra de data usada por Markdown.tsx para marcar .exhibition-date.
const DATE_PATTERN = /^(\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{4}|\d{4}(?:\s*[–-]\s*\d{4})?)$/;

function dateFromLine(line: string): string | null {
  const text = line.trim().replace(/^#{1,6}\s+/, '').trim();
  return DATE_PATTERN.test(text) ? text : null;
}

function isEntryHeading(line: string): boolean {
  return /^##\s+\S/.test(line.trim());
}

/**
 * No post de exposições, parte das entradas foi escrita com a data ANTES do
 * título (`###### 01/2017` seguido de `## Graffiti on Debate`). Renderizado
 * como veio, a data cola no fim da entrada anterior e cada item fica com a
 * data do vizinho. Aqui a data é movida para logo depois do título dela, que
 * é o formato das primeiras entradas do post.
 */
export function normalizeExhibitionMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const date = dateFromLine(line);

    if (date !== null) {
      let next = i + 1;
      while (next < lines.length && !lines[next].trim()) next++;

      if (next < lines.length && isEntryHeading(lines[next])) {
        out.push(lines[next], line);
        i = next;
        continue;
      }
    }

    out.push(line);
  }

  return out.join('\n');
}

export interface ExhibitionSection {
  /** Texto do `# título`; null para o que vier antes do primeiro `#`. */
  title: string | null;
  body: string;
}

/**
 * Separa o post nos títulos de nível 1 (`# EXPOSIÇÕES / EXIBIÇÕES`,
 * `# PUBLICAÇÕES`). Cada um vira um bloco à parte, mostrado como acordeão.
 */
export function splitExhibitionSections(markdown: string): ExhibitionSection[] {
  const sections: ExhibitionSection[] = [{ title: null, body: '' }];
  const bodies: string[][] = [[]];

  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const h1 = line.match(/^#\s+(.+?)\s*#*\s*$/);
    if (h1) {
      sections.push({ title: h1[1], body: '' });
      bodies.push([]);
      continue;
    }
    bodies[bodies.length - 1].push(line);
  }

  sections.forEach((section, i) => { section.body = bodies[i].join('\n').trim(); });
  return sections.filter(section => section.title !== null || section.body);
}
