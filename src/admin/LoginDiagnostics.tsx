'use client';

import { Component, type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  clearDiagEntries,
  DIAG_EVENT,
  diag,
  disableDiag,
  getDiagEntries,
  isDiagEnabled,
  type DiagEntry,
} from './diagnostics';
import { getKeychain } from './keychain';

// Lido direto do env (e não do HiveAuthProvider) para não criar import circular.
const SITE_HIVE_USERNAME = process.env.NEXT_PUBLIC_HIVE_USERNAME || '';

/**
 * Painel de diagnóstico (`?debug=1`). Fica no topo da tela — no iPad o
 * teclado cobre a parte de baixo — recolhido numa linha até ser tocado.
 *
 * Mostra o ambiente (aparelho, navegador, Keychain detectado), cada pedido
 * ao Keychain com a resposta completa, as respostas do servidor e qualquer
 * erro de JavaScript da página. "Compartilhar" manda o relatório pelo menu
 * do iPad (WhatsApp, e-mail…).
 */

const KEYCHAIN_POLL_MS = 500;
// Em dev o React roda efeitos duas vezes; o ambiente só precisa sair uma.
let environmentLogged = false;
const KEYCHAIN_POLL_LIMIT_MS = 15_000;

function collectEnvironment() {
  const nav = navigator as Navigator & { standalone?: boolean };
  let storage = 'ok';
  try {
    localStorage.setItem('wilbor_diag_probe', '1');
    localStorage.removeItem('wilbor_diag_probe');
  } catch (error) {
    storage = `bloqueado (${error instanceof Error ? error.name : 'erro'})`;
  }
  const keychain = getKeychain();
  return {
    url: window.location.href,
    userAgent: navigator.userAgent,
    plataforma: navigator.platform,
    toque: navigator.maxTouchPoints,
    tela: `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}x`,
    visualViewport: window.visualViewport
      ? `${Math.round(window.visualViewport.width)}x${Math.round(window.visualViewport.height)} zoom ${window.visualViewport.scale}`
      : 'n/d',
    contextoSeguro: window.isSecureContext,
    appNaTelaInicial: Boolean(nav.standalone),
    localStorage: storage,
    cookies: navigator.cookieEnabled,
    keychain: keychain ? Object.keys(keychain).filter(k => k.startsWith('request')).length + ' métodos' : 'não detectado',
    donoDoSite: SITE_HIVE_USERNAME || '(vazio)',
    idioma: navigator.language,
  };
}

function formatReport(env: Record<string, unknown>, entries: DiagEntry[]) {
  const lines = [
    `Diagnóstico wilbor.studio — ${new Date().toISOString()}`,
    '',
    '## Ambiente',
    ...Object.entries(env).map(([field, value]) => `${field}: ${value}`),
    '',
    '## Eventos',
    ...entries.map(entry =>
      `[${(entry.t / 1000).toFixed(1)}s] ${entry.event}${entry.data === undefined ? '' : ' ' + JSON.stringify(entry.data)}`),
  ];
  return lines.join('\n');
}

/** O painel nunca pode derrubar a página que ele observa. */
class DiagnosticsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { diag('painel.erro', error); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Panel() {
  const [entries, setEntries] = useState<DiagEntry[]>(() => getDiagEntries());
  const [env, setEnv] = useState<Record<string, unknown>>({});
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [closed, setClosed] = useState(false);

  // Eventos novos re-renderizam o painel
  useEffect(() => {
    const update = () => setEntries(getDiagEntries());
    window.addEventListener(DIAG_EVENT, update);
    return () => window.removeEventListener(DIAG_EVENT, update);
  }, []);

  // Ambiente + espera o Keychain ser injetado (o app pode injetar tarde)
  useEffect(() => {
    const initial = collectEnvironment();
    setEnv(initial);
    if (!environmentLogged) {
      environmentLogged = true;
      diag('ambiente', initial);
    }

    const started = performance.now();
    if (getKeychain()) {
      diag('keychain.detectado', { aposMs: 0 });
      return;
    }
    const timer = window.setInterval(() => {
      const elapsed = Math.round(performance.now() - started);
      if (getKeychain()) {
        window.clearInterval(timer);
        diag('keychain.detectado', { aposMs: elapsed });
        setEnv(collectEnvironment());
      } else if (elapsed > KEYCHAIN_POLL_LIMIT_MS) {
        window.clearInterval(timer);
        diag('keychain.nao-detectado', { esperouMs: elapsed });
      }
    }, KEYCHAIN_POLL_MS);
    return () => window.clearInterval(timer);
  }, []);

  // Erros de JavaScript da página inteira
  useEffect(() => {
    const onError = (event: ErrorEvent) => diag('js.erro', {
      message: event.message,
      arquivo: event.filename?.split('/').slice(-1)[0],
      linha: event.lineno,
      coluna: event.colno,
    });
    const onRejection = (event: PromiseRejectionEvent) => diag('js.promise-rejeitada', event.reason);
    const originalConsoleError = console.error;
    let insideDiag = false;
    console.error = (...args: unknown[]) => {
      // Reentrada: um erro logado enquanto o próprio diag roda não volta ao diag.
      if (!insideDiag) {
        insideDiag = true;
        try {
          diag('console.error', args.map(arg => (arg instanceof Error ? arg : String(arg).slice(0, 500))));
        } finally {
          insideDiag = false;
        }
      }
      originalConsoleError.apply(console, args);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      console.error = originalConsoleError;
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2500);
  };

  const report = useCallback(() => formatReport(env, entries), [env, entries]);

  const copy = async () => {
    const text = report();
    try {
      await navigator.clipboard.writeText(text);
      flash('copiado');
    } catch {
      // Fallback para WebViews sem clipboard API
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      flash(ok ? 'copiado' : 'não deu para copiar — use compartilhar');
    }
  };

  const share = async () => {
    const text = report();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Diagnóstico wilbor.studio', text });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    copy();
  };

  const turnOff = () => {
    disableDiag();
    setClosed(true);
  };

  if (closed) return null;

  const errorCount = entries.filter(entry =>
    entry.event.startsWith('js.') || entry.event.includes('erro') || entry.event.includes('sem-resposta') || entry.event.includes('excecao')).length;
  const keychainState = String(env.keychain ?? '…');

  const buttonClass = 'border border-neutral-600 rounded px-2 py-1 bg-neutral-800 text-neutral-100 text-[11px] font-mono';

  return (
    <div
      className="wilbor-admin fixed left-0 right-0 top-0 z-[200] font-mono text-[11px] leading-snug text-neutral-100"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="bg-black/90 border-b border-yellow-600/60">
        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-expanded={open}
          aria-controls="wilbor-diag-report"
          className="w-full text-left px-3 py-1.5 border-0 bg-transparent rounded-none text-yellow-300 text-[11px] font-mono"
        >
          DIAGNÓSTICO · keychain: {keychainState} · {entries.length} eventos ·{' '}
          <span className={errorCount ? 'text-red-400' : 'text-green-400'}>{errorCount} erros</span>
          {' '}· {open ? 'recolher ▲' : 'abrir ▼'}
        </button>

        {open && (
          <div className="px-3 pb-2">
            <div className="flex flex-wrap gap-2 py-1.5">
              <button type="button" className={buttonClass} onClick={share}>compartilhar</button>
              <button type="button" className={buttonClass} onClick={copy}>copiar</button>
              <button type="button" className={buttonClass} onClick={clearDiagEntries}>limpar</button>
              <button type="button" className={buttonClass} onClick={turnOff}>desligar diagnóstico</button>
              {notice && <span className="self-center text-green-400">{notice}</span>}
            </div>
            <pre id="wilbor-diag-report" className="max-h-[45vh] overflow-auto whitespace-pre-wrap break-all bg-neutral-950 border border-neutral-800 rounded p-2 m-0 text-[10.5px] text-neutral-200">
              {report()}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginDiagnostics() {
  // Decide no cliente, depois de montar: evita divergência de hidratação.
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { setEnabled(isDiagEnabled()); }, []);

  if (!enabled) return null;
  return (
    <DiagnosticsBoundary>
      <Panel />
    </DiagnosticsBoundary>
  );
}
