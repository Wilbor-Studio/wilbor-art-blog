import type { Operation } from '@hiveio/dhive';
import { diag } from './diagnostics';

export interface KeychainResponse {
  success: boolean
  message?: string
  error?: unknown
  result?: unknown
  [field: string]: unknown
}

interface HiveKeychain {
  requestSignBuffer: (
    username: string,
    message: string,
    keyType: string,
    callback: (response: KeychainResponse) => void,
  ) => void
  requestBroadcast: (
    username: string,
    operations: Operation[],
    keyType: string,
    callback: (response: KeychainResponse) => void,
  ) => void
}

export function getKeychain(): HiveKeychain | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { hive_keychain?: HiveKeychain }).hive_keychain;
}

/** Login: o artista confirma no app, então o prazo é generoso. */
const SIGN_TIMEOUT_MS = 90_000;
/** Publicação pode incluir aprovação + envio à rede. */
const BROADCAST_TIMEOUT_MS = 120_000;

export class KeychainTimeoutError extends Error {}

/**
 * Chama o Keychain com prazo. Sem prazo, se o app nunca responder (WebView
 * que perdeu a ponte, pedido cancelado sem callback), o botão ficava girando
 * para sempre e nada indicava o que aconteceu.
 */
function callKeychain(
  label: string,
  timeoutMs: number,
  invoke: (keychain: HiveKeychain, callback: (response: KeychainResponse) => void) => void,
): Promise<KeychainResponse> {
  const keychain = getKeychain();
  if (!keychain) {
    diag(`keychain.${label}.indisponivel`);
    return Promise.reject(new Error('Hive Keychain não encontrado nesta página.'));
  }

  const started = performance.now();
  diag(`keychain.${label}.pedido`);

  return new Promise<KeychainResponse>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      diag(`keychain.${label}.sem-resposta`, { aposMs: timeoutMs });
      reject(new KeychainTimeoutError(
        `O Keychain não respondeu em ${Math.round(timeoutMs / 1000)}s.`,
      ));
    }, timeoutMs);

    try {
      invoke(keychain, response => {
        if (settled) {
          // Resposta chegou depois do prazo: registra para o diagnóstico.
          diag(`keychain.${label}.resposta-tardia`, response);
          return;
        }
        settled = true;
        window.clearTimeout(timer);
        diag(`keychain.${label}.resposta`, {
          ms: Math.round(performance.now() - started),
          response,
        });
        resolve(response ?? { success: false, message: 'Resposta vazia do Keychain.' });
      });
    } catch (error) {
      settled = true;
      window.clearTimeout(timer);
      diag(`keychain.${label}.excecao`, error);
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

export function keychainSignBuffer(username: string, message: string) {
  return callKeychain('login', SIGN_TIMEOUT_MS, (keychain, callback) =>
    keychain.requestSignBuffer(username, message, 'Posting', callback));
}

export function keychainBroadcast(username: string, operations: Operation[]) {
  return callKeychain('publicar', BROADCAST_TIMEOUT_MS, (keychain, callback) =>
    // 'posting' minúsculo como no código original — não mudar sem testar no app.
    keychain.requestBroadcast(username, operations, 'posting', callback));
}

/** Texto de erro legível a partir da resposta do Keychain. */
export function keychainErrorMessage(response: KeychainResponse, fallback: string) {
  if (response.message) return response.message;
  if (typeof response.error === 'string') return response.error;
  return fallback;
}
