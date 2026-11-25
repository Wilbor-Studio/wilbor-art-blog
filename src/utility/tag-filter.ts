/**
 * Filtro de projetos por tags, guardado na URL como `?tag=a&tag=b` (uma
 * entrada por tag). O filtro mostra os projetos que têm qualquer uma das
 * tags marcadas. Links antigos, com uma `?tag=` só, continuam valendo.
 */

const TAG_PARAM = 'tag';
const PROJECT_PARAM = 'project';

/** Tags marcadas na URL, sem repetição e na ordem em que aparecem. */
export function readTagsFromParams(params: Pick<URLSearchParams, 'getAll'>): string[] {
  return Array.from(new Set(params.getAll(TAG_PARAM).map(tag => tag.trim()).filter(Boolean)));
}

/** Grava as tags na URL, substituindo as que estavam lá. */
export function writeTagsToUrl(url: URL, tags: string[]) {
  url.searchParams.delete(TAG_PARAM);
  tags.forEach(tag => url.searchParams.append(TAG_PARAM, tag));
}

/** Marca a tag se ela não estiver marcada; desmarca se estiver. */
export function toggleTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
}

/** O projeto entra no filtro se tiver qualquer uma das tags marcadas. */
export function matchesTags(projectTags: string[] | undefined, selected: string[]) {
  if (selected.length === 0) return true;
  return Boolean(projectTags?.some(tag => selected.includes(tag)));
}

/** URL pública da página de projetos com as tags marcadas. */
export function buildTagsUrl(tags: string[]) {
  const url = new URL('/projects', window.location.origin);
  writeTagsToUrl(url, tags);
  return url.toString();
}

/**
 * URL pública de um projeto: abre o site com o projeto aberto e as tags
 * dele marcadas no filtro, para quem recebe ver os trabalhos parecidos.
 */
export function buildProjectShareUrl(permlink: string, tags: string[] = []) {
  const url = new URL('/projects', window.location.origin);
  writeTagsToUrl(url, tags);
  url.searchParams.set(PROJECT_PARAM, permlink);
  return url.toString();
}

/**
 * Compartilha um link: no celular abre o compartilhamento do sistema
 * (WhatsApp, e-mail…); no desktop, copia para a área de transferência.
 * Devolve 'copied' quando copiou, para o botão mostrar a confirmação.
 */
export async function shareLink(
  url: string,
  { title, text }: { title: string, text: string },
): Promise<'shared' | 'copied' | 'cancelled' | 'prompted'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text, url });
      return 'shared';
    } catch (err) {
      // A pessoa fechou o menu do sistema: não insiste.
      if ((err as Error)?.name === 'AbortError') return 'cancelled';
      // Outro erro: tenta copiar.
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    // Sem acesso à área de transferência: mostra o link para copiar à mão.
    window.prompt('Copie o link:', url);
    return 'prompted';
  }
}
