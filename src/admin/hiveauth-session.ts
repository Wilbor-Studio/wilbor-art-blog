/**
 * Parte leve do HiveAuth, carregada em todas as páginas pelo HiveAuthProvider:
 * sessão salva, aviso de "aprove no app" e tipos de erro. O protocolo em si
 * (WebSocket, cifra, verificação da assinatura) fica em hiveauth.ts e só é
 * baixado sob demanda.
 */

/** Abre o app sem pedido: o app reconecta ao HAS e mostra o que está pendente. */
export const HAS_OPEN_APP_URL = 'has://';

/**
 * iPhone, iPad e Android: onde o Keychain é app, não extensão. O iPad em modo
 * desktop se apresenta como Mac, mas tem toque; notebook com tela touch não
 * entra aqui (lá a extensão é o caminho).
 */
export function isMobileKeychainDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

const STORAGE_SESSION = 'wilbor_admin_hiveauth';

export interface HiveAuthSession {
  username: string
  token: string
  /** Chave da cifra combinada com o app (não é chave Hive). */
  key: string
  /** Fim da sessão no app, em ms. */
  expire: number
}

export class HiveAuthRejectedError extends Error {}
export class HiveAuthTimeoutError extends Error {}

// ─── Sessão salva ─────────────────────────────────────────────────────────

export function loadHiveAuthSession(username?: string | null): HiveAuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION);
    if (!raw) return null;
    const session = JSON.parse(raw) as HiveAuthSession;
    if (!session.key || !session.token || !session.expire) return null;
    if (session.expire <= Date.now()) return null;
    if (username && session.username !== username) return null;
    return session;
  } catch {
    return null;
  }
}

export function saveHiveAuthSession(session: HiveAuthSession) {
  try { localStorage.setItem(STORAGE_SESSION, JSON.stringify(session)); } catch { /* só nesta aba */ }
}

export function clearHiveAuthSession() {
  try { localStorage.removeItem(STORAGE_SESSION); } catch { /* nada */ }
}

// ─── Aviso de "aprove no app" para a publicação ───────────────────────────

type PendingListener = (pending: boolean) => void;
const pendingListeners = new Set<PendingListener>();

/** A UI mostra um aviso com botão para abrir o app enquanto houver assinatura pendente. */
export function onHiveAuthPending(listener: PendingListener) {
  pendingListeners.add(listener);
  return () => { pendingListeners.delete(listener); };
}

export function setHiveAuthPending(pending: boolean) {
  pendingListeners.forEach(listener => listener(pending));
}
