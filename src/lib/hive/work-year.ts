import { PROJECT_YEARS, PROJECT_YEARS_BY_TITLE } from '@/lib/hive/project-years';

/** Título em minúsculas, sem acento, só letras e números (como na tabela). */
function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const CARGO_TITLES = Object.keys(PROJECT_YEARS_BY_TITLE);

/**
 * Título parecido com um só do Cargo: um começa como o outro, ou os dois
 * dividem um começo de pelo menos 6 letras que nenhum outro título tem.
 * Pega os posts repetidos na Hive ("SENSEI", "SENSEI - Marcelimho…").
 */
function similarTitleYear(title: string): number | undefined {
  if (title.length < 6) return undefined;
  const starts = CARGO_TITLES.filter(t => t.startsWith(title) || title.startsWith(t));
  if (starts.length === 1) return PROJECT_YEARS_BY_TITLE[starts[0]];
  const prefix = title.slice(0, Math.max(6, title.indexOf(' ', 6) > 0 ? title.indexOf(' ', 6) : 6));
  const shared = CARGO_TITLES.filter(t => t.startsWith(prefix));
  return shared.length === 1 ? PROJECT_YEARS_BY_TITLE[shared[0]] : undefined;
}

/**
 * Ano em que o trabalho foi feito, não o da publicação: os projetos
 * migrados do Cargo entram como posts novos, mas são de 2007, 2011…
 *
 * Ordem: o campo "year" do json_metadata (posts migrados agora); a tabela
 * gerada pela migração (pelo permlink, depois pelo título); e, para
 * trabalhos que nunca estiveram no Cargo, o ano da publicação.
 */
export function workYear(post: {
  permlink: string;
  title: string;
  created: string;
  json_metadata?: string;
}): number {
  try {
    const year = Number(JSON.parse(post.json_metadata || '{}').year);
    if (year > 1900) return year;
  } catch {
    // json_metadata inválido: segue para a tabela
  }
  const title = normalizeTitle(post.title);
  return PROJECT_YEARS[post.permlink]
    ?? PROJECT_YEARS_BY_TITLE[title]
    ?? similarTitleYear(title)
    ?? new Date(post.created + 'Z').getUTCFullYear();
}

/**
 * Mais novos primeiro pelo ano do trabalho; no mesmo ano, o publicado por
 * último vem antes.
 */
export function byWorkYear<T extends { permlink: string; title: string; created: string; json_metadata?: string }>(
  a: T,
  b: T,
): number {
  return workYear(b) - workYear(a) || b.created.localeCompare(a.created);
}
