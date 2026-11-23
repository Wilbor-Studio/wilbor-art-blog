import { isSiteContentPost, isSiteContentTags } from '@/lib/hive/control-tags';

describe('isSiteContentTags', () => {
  it('reconhece posts de seção: só tags de controle', () => {
    expect(isSiteContentTags(['hidden'])).toBe(true); // footer, contato…
    expect(isSiteContentTags(['site', 'hidden'])).toBe(true); // configurações
    expect(isSiteContentTags(['site'])).toBe(true);
  });

  it('projeto oculto continua sendo projeto', () => {
    expect(isSiteContentTags(['art', 'motion', 'hidden'])).toBe(false);
    expect(isSiteContentTags(['destaque', 'video'])).toBe(false);
  });

  it('não descarta posts sem tags ou com metadata inválido', () => {
    expect(isSiteContentTags([])).toBe(false);
    expect(isSiteContentTags(undefined)).toBe(false);
    expect(isSiteContentPost({ json_metadata: '{oops' })).toBe(false);
  });

  it('lê do json_metadata cru', () => {
    expect(isSiteContentPost({ json_metadata: '{"tags":["hidden"]}' })).toBe(true);
    expect(isSiteContentPost({ json_metadata: '{"tags":["art"]}' })).toBe(false);
  });
});

describe('players de música no editor', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { transformExternalMedia } = require('../src/admin/hive-post');

  it('link do Spotify sozinho na linha vira player', () => {
    const out = transformExternalMedia(
      'https://open.spotify.com/intl-pt/playlist/37i9dQZF1DX0FOF1IUWK1W?si=abc',
    );
    expect(out).toContain('src="https://open.spotify.com/embed/playlist/37i9dQZF1DX0FOF1IUWK1W"');
  });

  it('link do SoundCloud sozinho na linha vira player', () => {
    const out = transformExternalMedia('https://soundcloud.com/artista/faixa');
    expect(out).toContain('w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartista%2Ffaixa');
  });

  it('link no meio do texto continua link', () => {
    const line = 'ouça em https://open.spotify.com/track/abc';
    expect(transformExternalMedia(line)).toBe(line);
  });
});
