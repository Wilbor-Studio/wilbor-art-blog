/**
 * Registro de diagnóstico do login/edição, para depurar no iPad sem Mac.
 *
 * Liga com `?debug=1` na URL (fica salvo na aba via sessionStorage) e desliga
 * com `?debug=0` ou pelo botão do painel. Desligado, `diag()` não faz nada —
 * visitantes nunca pagam por isso.
 *
 * Nada sensível entra no log: chaves privadas (WIF) e campos com nome de
 * chave/senha são trocados por "[oculto]" antes de guardar.
 */

const STORAGE_KEY = 'wilbor_diag';
const MAX_ENTRIES = 300;
export const DIAG_EVENT = 'wilbor-diag';

export interface DiagEntry {
  /** ms desde o carregamento da página */
  t: number
  event: string
  data?: unknown
}

const entries: DiagEntry[] = [];
let enabledCache: boolean | null = null;

export function isDiagEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (enabledCache !== null) return enabledCache;

  let enabled = false;
  try {
    const param = new URLSearchParams(window.location.search).get('debug');
    if (param === '1') sessionStorage.setItem(STORAGE_KEY, '1');
    if (param === '0') sessionStorage.removeItem(STORAGE_KEY);
    enabled = sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    // sessionStorage bloqueado: vale só o parâmetro da URL
    enabled = new URLSearchParams(window.location.search).get('debug') === '1';
  }
  enabledCache = enabled;
  return enabled;
}

export function disableDiag() {
  enabledCache = false;
  try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* nada */ }
}

const WIF_PATTERN = /\b5[HJK][1-9A-HJ-NP-Za-km-z]{49}\b/g;
const SENSITIVE_FIELD = /key|senha|password|secret|wif/i;
// Campos públicos que contêm "key" no nome mas não são segredo.
const PUBLIC_FIELDS = new Set(['publicKey', 'keyType', 'method', 'keychain']);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[…]';
  if (typeof value === 'string') return value.replace(WIF_PATTERN, '[oculto]');
  if (value instanceof Error) {
    return { name: value.name, message: redact(value.message), stack: redact(value.stack?.split('\n').slice(0, 4).join('\n')) };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map(item => redact(item, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [field, inner] of Object.entries(value as Record<string, unknown>)) {
      out[field] = SENSITIVE_FIELD.test(field) && !PUBLIC_FIELDS.has(field)
        ? (inner ? '[oculto]' : inner)
        : redact(inner, depth + 1);
    }
    return out;
  }
  return value;
}

export function diag(event: string, data?: unknown) {
  if (!isDiagEnabled()) return;
  try {
    const entry: DiagEntry = {
      t: Math.round(performance.now()),
      event,
      data: data === undefined ? undefined : redact(data),
    };
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) entries.shift();
    window.dispatchEvent(new CustomEvent(DIAG_EVENT));
  } catch {
    // diagnóstico nunca pode derrubar o fluxo que ele observa
  }
}

export function getDiagEntries(): DiagEntry[] {
  return entries.slice();
}

export function clearDiagEntries() {
  entries.length = 0;
  try { window.dispatchEvent(new CustomEvent(DIAG_EVENT)); } catch { /* nada */ }
}
