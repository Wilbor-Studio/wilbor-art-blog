// Componentes de UI importados pela seção não rodam em jsdom sem mocks.
jest.mock('../src/components/Markdown', () => ({ __esModule: true, default: () => null }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh: jest.fn() }) }));

/* eslint-disable @typescript-eslint/no-var-requires */
const { publishedSoundBody, STARTER_MARKDOWN } = require('../src/components/SoundContent');

describe('publishedSoundBody', () => {
  it('trata o texto-modelo do editor como não publicado', () => {
    expect(publishedSoundBody(STARTER_MARKDOWN)).toBeNull();
    expect(publishedSoundBody(`\n${STARTER_MARKDOWN}\n\n`)).toBeNull();
  });

  it('trata post vazio ou ausente como não publicado', () => {
    expect(publishedSoundBody(null)).toBeNull();
    expect(publishedSoundBody('   ')).toBeNull();
  });

  it('devolve o conteúdo quando o artista escreveu algo', () => {
    expect(publishedSoundBody('Minha playlist da semana')).toBe('Minha playlist da semana');
  });
});
