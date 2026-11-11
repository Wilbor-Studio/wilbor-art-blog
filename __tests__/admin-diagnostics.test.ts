/**
 * Diagnóstico do login: nada sensível no log, desligado por padrão, e o
 * Keychain com prazo — o botão não pode mais girar para sempre.
 */

const WIF = '5JdeC9P7Pbd1uGdFVEsJ41EkEnADbbHGq6p1BwFxm6txNBsQnsw';

type DiagModule = typeof import('../src/admin/diagnostics');
type KeychainModule = typeof import('../src/admin/keychain');

function loadModules(enabled: boolean): { d: DiagModule; k: KeychainModule } {
  sessionStorage.clear();
  if (enabled) sessionStorage.setItem('wilbor_diag', '1');
  let d!: DiagModule;
  let k!: KeychainModule;
  jest.isolateModules(() => {
    d = require('../src/admin/diagnostics');
    k = require('../src/admin/keychain');
  });
  return { d, k };
}

afterEach(() => {
  delete (window as unknown as { hive_keychain?: unknown }).hive_keychain;
  jest.useRealTimers();
});

describe('diag', () => {
  it('não registra nada quando desligado', () => {
    const { d } = loadModules(false);
    d.diag('qualquer', { a: 1 });
    expect(d.getDiagEntries()).toHaveLength(0);
  });

  it('oculta chave privada em texto e em campos sensíveis', () => {
    const { d } = loadModules(true);
    d.diag('teste', {
      mensagem: `colou ${WIF} aqui`,
      postingKey: 'iv:cifrado',
      privateKey: WIF,
      publicKey: 'STM6abc',
      keyType: 'Posting',
      keychain: '7 métodos',
      aninhado: [{ password: 'segredo' }],
    });
    const dump = JSON.stringify(d.getDiagEntries());
    expect(dump).not.toContain(WIF);
    expect(dump).not.toContain('iv:cifrado');
    expect(dump).not.toContain('segredo');
    expect(dump).toContain('STM6abc');
    expect(dump).toContain('Posting');
    expect(dump).toContain('7 métodos');
  });
});

describe('keychain', () => {
  it('rejeita com erro claro quando o Keychain não existe', async () => {
    const { k } = loadModules(true);
    await expect(k.keychainSignBuffer('wilbor.art', 'msg')).rejects.toThrow('não encontrado');
  });

  it('devolve a resposta do Keychain e registra no diagnóstico', async () => {
    const { d, k } = loadModules(true);
    (window as unknown as { hive_keychain: unknown }).hive_keychain = {
      requestSignBuffer: (_u: string, _m: string, _t: string, cb: (r: unknown) => void) =>
        cb({ success: false, message: 'user_cancel' }),
    };
    const response = await k.keychainSignBuffer('wilbor.art', 'msg');
    expect(response).toEqual({ success: false, message: 'user_cancel' });
    expect(d.getDiagEntries().map(e => e.event)).toContain('keychain.login.resposta');
  });

  it('desiste com erro quando o Keychain nunca responde', async () => {
    jest.useFakeTimers();
    const { d, k } = loadModules(true);
    (window as unknown as { hive_keychain: unknown }).hive_keychain = {
      requestSignBuffer: () => { /* nunca chama o callback */ },
    };
    const pending = k.keychainSignBuffer('wilbor.art', 'msg');
    jest.advanceTimersByTime(90_001);
    await expect(pending).rejects.toBeInstanceOf(k.KeychainTimeoutError);
    expect(d.getDiagEntries().map(e => e.event)).toContain('keychain.login.sem-resposta');
  });

  it('transforma exceção síncrona do Keychain em erro, sem travar', async () => {
    const { k } = loadModules(true);
    (window as unknown as { hive_keychain: unknown }).hive_keychain = {
      requestSignBuffer: () => { throw new Error('ponte quebrada'); },
    };
    await expect(k.keychainSignBuffer('wilbor.art', 'msg')).rejects.toThrow('ponte quebrada');
  });
});
