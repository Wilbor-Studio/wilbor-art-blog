import {
  DEFAULT_SITE_CONFIG,
  buildSiteConfigBody,
  parseSiteConfig,
} from '../src/lib/hive/site-content';

describe('parseSiteConfig', () => {
  it('usa o padrão quando não há post', () => {
    expect(parseSiteConfig(null)).toEqual(DEFAULT_SITE_CONFIG);
    expect(parseSiteConfig('')).toEqual(DEFAULT_SITE_CONFIG);
  });

  it('usa o padrão quando o corpo não tem bloco json', () => {
    expect(parseSiteConfig('um texto qualquer')).toEqual(DEFAULT_SITE_CONFIG);
  });

  it('não derruba o site com json inválido', () => {
    const body = '```json\n{ isso não é json }\n```';
    expect(parseSiteConfig(body)).toEqual(DEFAULT_SITE_CONFIG);
  });

  it('lê os valores personalizados', () => {
    const body = buildSiteConfigBody({
      ...DEFAULT_SITE_CONFIG,
      banner: {
        enabled: false,
        text: 'Novo aviso',
        linkLabel: 'clique',
        linkUrl: 'https://exemplo.com',
      },
    });

    const config = parseSiteConfig(body);
    expect(config.banner.enabled).toBe(false);
    expect(config.banner.text).toBe('Novo aviso');
    expect(config.banner.linkUrl).toBe('https://exemplo.com');
  });

  it('completa campos ausentes com o padrão', () => {
    const body = '```json\n{"seo":{"title":"Só o título"}}\n```';
    const config = parseSiteConfig(body);

    expect(config.seo.title).toBe('Só o título');
    // descrição não foi informada: mantém a do código
    expect(config.seo.description).toBe(DEFAULT_SITE_CONFIG.seo.description);
    expect(config.banner).toEqual(DEFAULT_SITE_CONFIG.banner);
    expect(config.sectionTitles).toEqual(DEFAULT_SITE_CONFIG.sectionTitles);
  });

  it('faz ida e volta pelo corpo do post', () => {
    const custom = {
      ...DEFAULT_SITE_CONFIG,
      sectionTitles: { about: 'Quem é Wilbor', partners: 'Com quem trabalhou' },
    };

    expect(parseSiteConfig(buildSiteConfigBody(custom))).toEqual(custom);
  });

  it('aceita banner desligado sem confundir com ausente', () => {
    const body = '```json\n{"banner":{"enabled":false}}\n```';
    expect(parseSiteConfig(body).banner.enabled).toBe(false);
    // os demais campos do banner seguem os padrões
    expect(parseSiteConfig(body).banner.text)
      .toBe(DEFAULT_SITE_CONFIG.banner.text);
  });
});
