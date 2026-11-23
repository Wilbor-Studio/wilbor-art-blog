/**
 * Tags que controlam o comportamento do site e não são assunto de projeto.
 * Nunca aparecem como filtro no menu nem como chips no editor.
 */
export const CONTROL_TAGS = new Set(['hidden', 'destaque', 'site']);

/**
 * Diz se um post é conteúdo de seção do site (rodapé, contato, parceiros,
 * exposições, configurações) e não um projeto.
 *
 * Esses posts moram na mesma conta do Hive que os projetos e ficam ocultos
 * com a tag 'hidden'. Como a grade mostra projetos ocultos para o artista
 * (para ele poder reexibi-los), eles apareciam lá como cards "oculto" sem
 * sentido — o do rodapé confundia mais. O que os distingue: a tag 'site',
 * ou nenhuma tag de assunto. Todo projeto tem ao menos uma tag de assunto,
 * que o editor exige para publicar.
 */
export function isSiteContentTags(tags: unknown): boolean {
  if (!Array.isArray(tags)) return false;
  const names = tags.filter((tag): tag is string => typeof tag === 'string');
  if (names.includes('site')) return true;
  return names.length > 0 && names.every(tag => CONTROL_TAGS.has(tag));
}

/** Mesma regra, lendo o json_metadata cru de um post do Hive. */
export function isSiteContentPost(post: { json_metadata?: string }): boolean {
  try {
    return isSiteContentTags(JSON.parse(post.json_metadata || '{}').tags);
  } catch {
    return false;
  }
}
