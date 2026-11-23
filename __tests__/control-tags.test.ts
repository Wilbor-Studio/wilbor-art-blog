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
