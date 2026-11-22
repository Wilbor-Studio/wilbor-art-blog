import { Client, cryptoUtils, Signature, type Operation } from '@hiveio/dhive';
import CryptoJS from 'crypto-js';
import { diag } from './diagnostics';
import {
  HiveAuthRejectedError,
  type HiveAuthSession,
  HiveAuthTimeoutError,
  setHiveAuthPending,
} from './hiveauth-session';

// Tudo que é leve (sessão salva, aviso, erros) mora em hiveauth-session.ts e
// fica no bundle de todas as páginas; este módulo (dhive + crypto-js) só é
// baixado quando o artista entra ou publica pelo HiveAuth.
export * from './hiveauth-session';

/**
 * HiveAuth (HAS): login e assinatura pelo app Hive Keychain a partir do
 * Safari/Chrome do iPhone e iPad, onde não existe `window.hive_keychain`.
 *
 * Fluxo: o site manda um pedido cifrado ao servidor HAS por WebSocket, abre o
 * app com o link `has://auth_req/…` (que leva a chave da cifra), o artista
 * aprova no app e a resposta volta pelo mesmo WebSocket.
 *
 * Protocolo: https://docs.hiveauth.com — mesmo formato de hive-auth-wrapper e
 * do Keychain mobile (src/utils/hiveAuthenticationService).
 */

export const HAS_HOST = 'wss://hive-auth.arcange.eu/';

function appData() {
  return {
    name: 'wilbor.art',
    description: 'Área do artista do site wilbor.art',
    icon: `${window.location.origin}/favicons/FAVCOM_WILBOR.png`,
  };
}

const CONNECT_TIMEOUT_MS = 15_000;

interface HasMessage {
  cmd: string
  uuid?: string
  expire?: number
  data?: string
  error?: string
  timeout?: number
  protocol?: number
}

// ─── WebSocket ────────────────────────────────────────────────────────────

let socket: WebSocket | null = null;
let opening: Promise<WebSocket> | null = null;
let serverTimeoutMs = 60_000;
const messageListeners = new Set<(message: HasMessage) => void>();

function connect(): Promise<WebSocket> {
  if (socket && socket.readyState === WebSocket.OPEN) return Promise.resolve(socket);
  if (opening) return opening;

  opening = new Promise<WebSocket>((resolve, reject) => {
    const ws = new WebSocket(HAS_HOST);
    const timer = window.setTimeout(() => {
      ws.close();
      reject(new Error('Não foi possível conectar ao HiveAuth. Verifique a internet.'));
    }, CONNECT_TIMEOUT_MS);

    ws.onopen = () => {
      window.clearTimeout(timer);
      socket = ws;
      diag('hiveauth.conectado');
      resolve(ws);
    };
    ws.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Não foi possível conectar ao HiveAuth. Verifique a internet.'));
    };
    ws.onclose = () => {
      if (socket === ws) socket = null;
      diag('hiveauth.desconectado');
    };
    ws.onmessage = event => {
      let message: HasMessage;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (message.cmd === 'connected' && typeof message.timeout === 'number') {
        serverTimeoutMs = message.timeout * 1000;
      }
      diag('hiveauth.recebido', { cmd: message.cmd, uuid: message.uuid, expire: message.expire });
      messageListeners.forEach(listener => listener(message));
    };
  }).finally(() => { opening = null; });

  return opening;
}

/**
 * Manda um pedido ao HAS e espera a resposta do app.
 *
 * No iPhone, ao trocar para o app Keychain o Safari congela a aba e o
 * WebSocket cai. Quando a aba volta, reconecta e manda `attach_req` com o uuid
 * do pedido: o HAS reenvia a resposta que chegou enquanto estava fora.
 */
function runRequest<T>({
  label,
  payload,
  waitCmd,
  ackCmd,
  nackCmd,
  errCmd,
  onWait,
  onAck,
  onErr,
}: {
  label: string
  payload: Record<string, unknown>
  waitCmd: string
  ackCmd: string
  nackCmd: string
  errCmd: string
  onWait?: (message: HasMessage) => void
  /** undefined = mensagem não é deste pedido (cifra não confere): ignora. */
  onAck: (message: HasMessage) => T | undefined
  onErr?: (message: HasMessage) => Error
}): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let uuid: string | undefined;
    let expire = Date.now() + serverTimeoutMs + 5_000;
    let settled = false;
    let reattaching = false;

    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      messageListeners.delete(onMessage);
      window.clearInterval(watch);
      document.removeEventListener('visibilitychange', reattach);
      action();
    };

    const onMessage = (message: HasMessage) => {
      if (!uuid) {
        if (message.cmd === waitCmd && message.uuid) {
          uuid = message.uuid;
          if (message.expire) expire = message.expire;
          diag(`hiveauth.${label}.aguardando-app`, { uuid, expire });
          onWait?.(message);
        } else if (message.cmd === 'error') {
          finish(() => reject(new Error(message.error || 'Erro no servidor HiveAuth.')));
        }
        return;
      }
      if (message.uuid !== uuid) return;

      if (message.cmd === ackCmd) {
        const result = onAck(message);
        if (result !== undefined) finish(() => resolve(result));
      } else if (message.cmd === nackCmd) {
        finish(() => reject(new HiveAuthRejectedError('Pedido recusado no app Hive Keychain.')));
      } else if (message.cmd === errCmd) {
        finish(() => reject(onErr ? onErr(message) : new Error(message.error || 'Erro no app Hive Keychain.')));
      } else if (message.cmd === 'attach_nack') {
        finish(() => reject(new HiveAuthTimeoutError('O pedido expirou enquanto o app estava aberto.')));
      }
    };

    async function reattach() {
      if (settled || !uuid || reattaching) return;
      if (document.visibilityState === 'hidden') return;
      if (socket && socket.readyState === WebSocket.OPEN) return;
      reattaching = true;
      try {
        const ws = await connect();
        diag(`hiveauth.${label}.reanexa`, { uuid });
        ws.send(JSON.stringify({ cmd: 'attach_req', uuid }));
      } catch (error) {
        diag(`hiveauth.${label}.reanexa-falhou`, error);
      } finally {
        reattaching = false;
      }
    }

    const watch = window.setInterval(() => {
      if (Date.now() > expire) {
        diag(`hiveauth.${label}.expirou`);
        finish(() => reject(new HiveAuthTimeoutError('O app Hive Keychain não respondeu a tempo.')));
        return;
      }
      void reattach();
    }, 1_000);

    messageListeners.add(onMessage);
    document.addEventListener('visibilitychange', reattach);

    connect()
      .then(ws => {
        diag(`hiveauth.${label}.pedido`, { cmd: payload.cmd });
        ws.send(JSON.stringify(payload));
      })
      .catch(error => finish(() => reject(error)));
  });
}

function encrypt(value: unknown, key: string) {
  return CryptoJS.AES.encrypt(JSON.stringify(value), key).toString();
}

function decrypt(data: string | undefined, key: string): string {
  if (!data) return '';
  try {
    return CryptoJS.AES.decrypt(data, key).toString(CryptoJS.enc.Utf8);
  } catch {
    // Texto não cifrado ou com outra chave: o Utf8 do CryptoJS lança.
    return '';
  }
}

function randomKey() {
  // randomUUID só existe no iOS 15.4+; getRandomValues cobre os anteriores.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Link que abre o app Keychain com o pedido de login (formato do Keychain mobile). */
export function buildAuthDeepLink(username: string, uuid: string, key: string) {
  const payload = JSON.stringify({ account: username, uuid, key, host: HAS_HOST });
  return `has://auth_req/${btoa(payload)}`;
}

// ─── Prova de posse da chave ──────────────────────────────────────────────

/**
 * Sem isto, qualquer app que fale HAS poderia "aprovar" o login como
 * wilbor.art. O app assina o desafio com a chave de posting; confere a
 * assinatura e que a chave pública é mesmo uma posting key da conta.
 */
export function recoverChallengeSigner(challenge: string, signatureHex: string) {
  const signature = Signature.fromString(signatureHex);
  return signature.recover(cryptoUtils.sha256(challenge)).toString();
}

async function fetchPostingKeys(username: string): Promise<string[]> {
  const client = new Client(['https://api.hive.blog', 'https://api.deathwing.me', 'https://anyx.io']);
  const [account] = await client.database.getAccounts([username]);
  if (!account) throw new Error(`Conta @${username} não encontrada no Hive.`);
  return account.posting.key_auths.map(([key]) => String(key));
}

export async function verifyChallenge(
  username: string,
  challenge: string,
  answer: { challenge?: string, pubkey?: string } | undefined,
) {
  if (!answer?.challenge || !answer.pubkey) {
    throw new Error('O app não assinou o desafio de login. Atualize o Hive Keychain.');
  }
  const signer = recoverChallengeSigner(challenge, answer.challenge);
  if (signer !== answer.pubkey) {
    throw new Error('Assinatura do login não confere.');
  }
  const postingKeys = await fetchPostingKeys(username);
  if (!postingKeys.includes(signer)) {
    throw new Error(`A chave usada não é uma chave de posting de @${username}.`);
  }
}

// ─── Login ────────────────────────────────────────────────────────────────

export async function hiveAuthLogin(
  username: string,
  onDeepLink: (url: string) => void,
): Promise<HiveAuthSession> {
  const key = randomKey();
  // Texto simples (não JSON): o app trata JSON com Buffer de outro jeito ao assinar.
  const challenge = `wilbor.art login @${username} ${window.location.host} ${Date.now()}`;

  const data = encrypt({ app: appData(), challenge: { key_type: 'posting', challenge } }, key);

  const ack = await runRequest({
    label: 'login',
    payload: { cmd: 'auth_req', account: username, data },
    waitCmd: 'auth_wait',
    ackCmd: 'auth_ack',
    nackCmd: 'auth_nack',
    errCmd: 'auth_err',
    onWait: message => onDeepLink(buildAuthDeepLink(username, message.uuid as string, key)),
    onAck: message => {
      try {
        return JSON.parse(decrypt(message.data, key)) as {
          token?: string
          expire?: number
          challenge?: { challenge?: string, pubkey?: string }
        };
      } catch {
        return undefined;
      }
    },
  });

  diag('hiveauth.login.aprovado', { expire: ack.expire, temDesafio: Boolean(ack.challenge) });
  if (!ack.token || !ack.expire) throw new Error('Resposta incompleta do app Hive Keychain.');

  await verifyChallenge(username, challenge, ack.challenge);
  diag('hiveauth.login.desafio-ok');

  return { username, token: ack.token, key, expire: ack.expire };
}

// ─── Publicação ───────────────────────────────────────────────────────────

export async function hiveAuthBroadcast(session: HiveAuthSession, operations: Operation[]) {
  const data = encrypt({ key_type: 'posting', ops: operations, broadcast: true, nonce: Date.now() }, session.key);

  setHiveAuthPending(true);
  try {
    await runRequest({
      label: 'publicar',
      payload: { cmd: 'sign_req', account: session.username, token: session.token, data },
      waitCmd: 'sign_wait',
      ackCmd: 'sign_ack',
      nackCmd: 'sign_nack',
      errCmd: 'sign_err',
      onAck: message => message,
      onErr: message => {
        const text = decrypt(message.error, session.key) || message.error;
        return new Error(text || 'Erro no app Hive Keychain.');
      },
    });
  } finally {
    setHiveAuthPending(false);
  }
}
