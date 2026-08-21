/**
 * Conteúdo do site editável pelo artista.
 *
 * O site já usa o Hive como CMS para os posts. Aqui a mesma ideia é aplicada
 * ao que antes estava fixo no código: dois posts com permlink conhecido
 * guardam o resumo da seção "sobre" e as configurações gerais.
 *
 * Toda leitura tem fallback para o valor embutido no código. Assim a página
 * nunca fica em branco se o post não existir ou o Hive estiver fora do ar, e
 * o conteúdo padrão continua saindo no HTML do servidor.
 */

export const SITE_AUTHOR = process.env.NEXT_PUBLIC_HIVE_USERNAME || '';

/** Post com os parágrafos de resumo, em markdown livre. */
export const PERMLINK_ABOUT_SUMMARY = 'site-resumo-sobre';

/** Post com as configurações estruturadas. */
export const PERMLINK_SITE_CONFIG = 'site-configuracoes';

export interface BannerConfig {
  enabled: boolean;
  text: string;
  linkLabel: string;
  linkUrl: string;
}

export interface SeoConfig {
  title: string;
  description: string;
}

export interface SectionTitles {
  about: string;
  partners: string;
}

export interface SiteConfig {
  banner: BannerConfig;
  seo: SeoConfig;
  sectionTitles: SectionTitles;
}

/** Valores usados enquanto o artista não personalizar nada. */
export const DEFAULT_SITE_CONFIG: SiteConfig = {
  banner: {
    enabled: true,
    text: 'Site em construção. Enquanto isso, acesse o',
    linkLabel: 'portfólio completo',
    linkUrl: 'https://cargocollective.com/wilbor',
  },
  seo: {
    title: 'Wilbor Art',
    description: 'Wilson Domingues, conhecido como Wilbor, é um artista ' +
      'multifacetado do Rio de Janeiro que une skate, arte e audiovisual.',
  },
  sectionTitles: {
    about: 'Sobre Wilbor',
    partners: 'Parceiros',
  },
};

const JSON_BLOCK = /```json\s*([\s\S]*?)```/i;

/**
 * As configurações moram num bloco ```json dentro do corpo do post, e não no
 * json_metadata: o editor de posts reescreve o metadata inteiro ao salvar, e
 * apagaria os ajustes sem aviso. No corpo elas sobrevivem e ficam legíveis.
 */
export function parseSiteConfig(body?: string | null): SiteConfig {
  if (!body) return DEFAULT_SITE_CONFIG;

  const match = body.match(JSON_BLOCK);
  if (!match) return DEFAULT_SITE_CONFIG;

  try {
    const parsed = JSON.parse(match[1]) as Partial<SiteConfig>;
    return {
      banner: { ...DEFAULT_SITE_CONFIG.banner, ...parsed.banner },
      seo: { ...DEFAULT_SITE_CONFIG.seo, ...parsed.seo },
      sectionTitles: {
        ...DEFAULT_SITE_CONFIG.sectionTitles,
        ...parsed.sectionTitles,
      },
    };
  } catch {
    // JSON quebrado: melhor o site subir com o padrão do que não subir.
    return DEFAULT_SITE_CONFIG;
  }
}

/** Monta o corpo do post de configuração a partir do objeto. */
export function buildSiteConfigBody(config: SiteConfig) {
  return [
    'Configurações do site, editadas pelo painel do artista.',
    'Prefira alterar pelo site — o bloco abaixo precisa continuar sendo',
    'um JSON válido.',
    '',
    '```json',
    JSON.stringify(config, null, 2),
    '```',
  ].join('\n');
}

/**
 * Busca um post pelo permlink. Devolve null se não existir.
 *
 * O timeout não é opcional aqui: esta chamada entra no render de toda página
 * (metadados e barra de aviso). Sem ele, um nó do Hive que aceite a conexão e
 * pare de responder deixaria a página pendurada em vez de cair no padrão.
 */
export async function fetchPostBody(permlink: string): Promise<string | null> {
  if (!SITE_AUTHOR) return null;

  try {
    const response = await fetch('https://api.hive.blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_content',
        params: [SITE_AUTHOR, permlink],
        id: 1,
      }),
      signal: AbortSignal.timeout(5000),
      // O conteúdo muda raramente; evita uma ida à rede a cada navegação.
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const body = data?.result?.body;
    return typeof body === 'string' && body.trim() ? body : null;
  } catch {
    return null;
  }
}

export async function fetchSiteConfig(): Promise<SiteConfig> {
  return parseSiteConfig(await fetchPostBody(PERMLINK_SITE_CONFIG));
}
