/**
 * Login e publicação pelo app Hive Keychain via HiveAuth (iPhone/iPad).
 *
 * Um WebSocket falso faz o papel do servidor HAS e do app: lê o link
 * has://auth_req/ como o Keychain mobile, decifra o pedido com a chave do link
 * e assina o desafio com a chave de posting, como o app faz (signBuffer).
 */
import { cryptoUtils, PrivateKey } from '@hiveio/dhive';
import CryptoJS from 'crypto-js';

const POSTING = PrivateKey.fromSeed('wilbor-teste-posting');
const OTHER = PrivateKey.fromSeed('outra-conta');
let accountPostingKeys = [POSTING.createPublic().toString()];

jest.mock('@hiveio/dhive', () => {
  const actual = jest.requireActual('@hiveio/dhive');
  return {
    ...actual,
    Client: jest.fn().mockImplementation(() => ({
      database: {
        getAccounts: async () => [{ posting: { key_auths: accountPostingKeys.map(key => [key, 1]) } }],
      },
    })),
  };
});

type Sent = Record<string, unknown>;

class FakeSocket {
  static OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: Sent[] = [];
  onopen?: () => void;
  onerror?: () => void;
  onclose?: () => void;
  onmessage?: (event: { data: string }) => void;
  constructor(public url: string) {
    FakeSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.();
      this.receive({ cmd: 'connected', timeout: 60, protocol: 1 });
    }, 0);
  }
  send(raw: string) {
    const message = JSON.parse(raw);
    this.sent.push(message);
    FakeSocket.onSend?.(this, message);
  }
  receive(message: Sent) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
  static onSend?: (socket: FakeSocket, message: Sent) => void;
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function readDeepLink(link: string) {
  expect(link.startsWith('has://auth_req/')).toBe(true);
  return JSON.parse(atob(link.replace('has://auth_req/', ''))) as {
    account: string, uuid: string, key: string, host: string
  };
}

function signLikeKeychain(key: PrivateKey, message: string) {
  return key.sign(cryptoUtils.sha256(message)).toString();
}

type HiveAuthModule = typeof import('../src/admin/hiveauth');
let has: HiveAuthModule;

beforeEach(() => {
  FakeSocket.instances = [];
  FakeSocket.onSend = undefined;
  accountPostingKeys = [POSTING.createPublic().toString()];
  (global as unknown as { WebSocket: unknown }).WebSocket = FakeSocket;
  localStorage.clear();
  jest.isolateModules(() => { has = require('../src/admin/hiveauth'); });
});

/** Responde ao auth_req como o app aprovando com `signer`. */
function approveLoginWith(signer: PrivateKey, publicKey = signer.createPublic().toString()) {
  FakeSocket.onSend = (socket, message) => {
    if (message.cmd === 'auth_req') {
      setTimeout(() => socket.receive({ cmd: 'auth_wait', uuid: 'u-1', expire: Date.now() + 60_000 }), 0);
    }
  };
  return async (link: string) => {
    const { key, uuid, account } = readDeepLink(link);
    expect(account).toBe('wilbor.art');
    const socket = FakeSocket.instances[FakeSocket.instances.length - 1];
    const req = socket.sent.find(m => m.cmd === 'auth_req')!;
    const decrypted = JSON.parse(CryptoJS.AES.decrypt(req.data as string, key).toString(CryptoJS.enc.Utf8));
    expect(decrypted.app.name).toBe('wilbor.art');
    expect(decrypted.challenge.key_type).toBe('posting');
    const ack = {
      token: 'tok-1',
      expire: Date.now() + 3_600_000,
      challenge: { challenge: signLikeKeychain(signer, decrypted.challenge.challenge), pubkey: publicKey },
    };
    await flush();
    socket.receive({ cmd: 'auth_ack', uuid, data: CryptoJS.AES.encrypt(JSON.stringify(ack), key).toString() });
  };
}

describe('HiveAuth', () => {
  test('login: abre o app com o link e confere a assinatura da posting key', async () => {
    const onLink = jest.fn(approveLoginWith(POSTING));
    const session = await has.hiveAuthLogin('wilbor.art', onLink);
    expect(onLink).toHaveBeenCalledTimes(1);
    expect(session).toMatchObject({ username: 'wilbor.art', token: 'tok-1' });
    expect(readDeepLink(onLink.mock.calls[0][0]).host).toBe(has.HAS_HOST);
  });

  test('login: recusa assinatura de chave que não é posting da conta', async () => {
    await expect(has.hiveAuthLogin('wilbor.art', approveLoginWith(OTHER)))
      .rejects.toThrow('não é uma chave de posting');
  });

  test('login: recusa assinatura que não bate com a chave declarada', async () => {
    await expect(has.hiveAuthLogin('wilbor.art', approveLoginWith(OTHER, POSTING.createPublic().toString())))
      .rejects.toThrow('Assinatura do login não confere');
  });

  test('login: recusado no app vira HiveAuthRejectedError', async () => {
    FakeSocket.onSend = (socket, message) => {
      if (message.cmd === 'auth_req') {
        setTimeout(() => {
          socket.receive({ cmd: 'auth_wait', uuid: 'u-2', expire: Date.now() + 60_000 });
          socket.receive({ cmd: 'auth_nack', uuid: 'u-2' });
        }, 0);
      }
    };
    await expect(has.hiveAuthLogin('wilbor.art', () => {}))
      .rejects.toBeInstanceOf(has.HiveAuthRejectedError);
  });

  test('login: aba volta do app com o socket caído reanexa o pedido e recebe a resposta', async () => {
    jest.useFakeTimers({ doNotFake: ['performance'] });
    try {
      let key = '';
      FakeSocket.onSend = (socket, message) => {
        if (message.cmd === 'auth_req') {
          setTimeout(() => socket.receive({ cmd: 'auth_wait', uuid: 'u-3', expire: Date.now() + 60_000 }), 0);
        }
        if (message.cmd === 'attach_req') {
          expect(message.uuid).toBe('u-3');
          const req = FakeSocket.instances[0].sent.find(m => m.cmd === 'auth_req')!;
          const decrypted = JSON.parse(CryptoJS.AES.decrypt(req.data as string, key).toString(CryptoJS.enc.Utf8));
          const ack = {
            token: 'tok-3',
            expire: Date.now() + 3_600_000,
            challenge: {
              challenge: signLikeKeychain(POSTING, decrypted.challenge.challenge),
              pubkey: POSTING.createPublic().toString(),
            },
          };
          setTimeout(() => socket.receive({
            cmd: 'auth_ack', uuid: 'u-3', data: CryptoJS.AES.encrypt(JSON.stringify(ack), key).toString(),
          }), 0);
        }
      };
      const promise = has.hiveAuthLogin('wilbor.art', link => {
        key = readDeepLink(link).key;
        // O Safari congela a aba ao abrir o app: o WebSocket cai.
        FakeSocket.instances[0].close();
      });
      await jest.advanceTimersByTimeAsync(3_000);
      const session = await promise;
      expect(session.token).toBe('tok-3');
      expect(FakeSocket.instances).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });

  test('publicação: manda as operações cifradas e avisa enquanto espera o app', async () => {
    const session = { username: 'wilbor.art', token: 'tok', key: 'chave-cifra', expire: Date.now() + 60_000 };
    const ops = [['vote', { voter: 'wilbor.art', author: 'a', permlink: 'p', weight: 1 }]];
    const pending: boolean[] = [];
    has.onHiveAuthPending(value => pending.push(value));
    FakeSocket.onSend = (socket, message) => {
      if (message.cmd !== 'sign_req') return;
      expect(message.token).toBe('tok');
      const decrypted = JSON.parse(CryptoJS.AES.decrypt(message.data as string, 'chave-cifra').toString(CryptoJS.enc.Utf8));
      expect(decrypted).toMatchObject({ key_type: 'posting', ops, broadcast: true });
      setTimeout(() => {
        socket.receive({ cmd: 'sign_wait', uuid: 's-1', expire: Date.now() + 60_000 });
        socket.receive({ cmd: 'sign_ack', uuid: 's-1', data: 'txid' });
      }, 0);
    };
    await has.hiveAuthBroadcast(session, ops as any);
    expect(pending).toEqual([true, false]);
  });

  test('sessão: vencida ou de outra conta não é usada', () => {
    has.saveHiveAuthSession({ username: 'wilbor.art', token: 't', key: 'k', expire: Date.now() + 1000 });
    expect(has.loadHiveAuthSession('wilbor.art')).not.toBeNull();
    expect(has.loadHiveAuthSession('outra')).toBeNull();
    has.saveHiveAuthSession({ username: 'wilbor.art', token: 't', key: 'k', expire: Date.now() - 1 });
    expect(has.loadHiveAuthSession('wilbor.art')).toBeNull();
  });
});

describe('isMobileKeychainDevice', () => {
  const setNavigator = (userAgent: string, maxTouchPoints: number) => {
    Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
    Object.defineProperty(navigator, 'maxTouchPoints', { value: maxTouchPoints, configurable: true });
  };

  test.each([
    ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15', 5, true],
    ['iPad em modo desktop', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 5, true],
    ['Chrome no iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/130.0', 5, true],
    ['Android', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/130.0 Mobile', 5, true],
    ['Mac', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15', 0, false],
    ['notebook Windows com touch', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0', 10, false],
  ])('%s', (_name, userAgent, touchPoints, expected) => {
    setNavigator(userAgent, touchPoints);
    expect(has.isMobileKeychainDevice()).toBe(expected);
  });
});
