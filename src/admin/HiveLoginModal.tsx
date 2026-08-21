'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { hiveServerLoginWithPassword } from '../../lib/hive/server-functions';
import type { HiveAuthMethod } from './HiveAuthProvider';
import { SITE_HIVE_USERNAME } from './HiveAuthProvider';
import SplashCursor from './SplashCursor';

interface HiveKeychainWindow extends Window {
  hive_keychain?: {
    requestSignBuffer: (
      username: string,
      message: string,
      keyType: string,
      callback: (res: { success: boolean; message?: string }) => void,
    ) => void;
  };
}

export default function HiveLoginModal({
  onLogin,
  onClose,
}: {
  onLogin: (username: string, method: HiveAuthMethod, key?: string) => void
  onClose: () => void
}) {
  const [username, setUsername] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState('');
  const [keychainLoading, setKeychainLoading] = useState(false);
  const [privateKeyLoading, setPrivateKeyLoading] = useState(false);

  const anyLoading = keychainLoading || privateKeyLoading;
  const clearError = () => { if (error) setError(''); };

  // Trava o scroll do site enquanto o modal está aberto
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !anyLoading) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [anyLoading, onClose]);

  /**
   * Só a conta dona do site pode editar. Barrar aqui evita mostrar botões de
   * edição que a blockchain recusaria mais tarde.
   */
  function checkIsSiteOwner(candidate: string) {
    if (!SITE_HIVE_USERNAME) {
      setError('Site sem NEXT_PUBLIC_HIVE_USERNAME configurado.');
      return false;
    }
    if (candidate !== SITE_HIVE_USERNAME) {
      setError(`Esta conta não administra o site. Entre como @${SITE_HIVE_USERNAME}.`);
      return false;
    }
    return true;
  }

  const handleKeychainLogin = () => {
    setError('');
    const candidate = username.trim().toLowerCase();
    if (!checkIsSiteOwner(candidate)) return;

    const win = window as HiveKeychainWindow;
    if (!win.hive_keychain) {
      setError('Hive Keychain não está instalado neste navegador.');
      return;
    }

    setKeychainLoading(true);
    win.hive_keychain.requestSignBuffer(
      candidate,
      'login-wilbor.art',
      'Posting',
      (res) => {
        setKeychainLoading(false);
        if (res.success) {
          onLogin(candidate, 'keychain');
        } else {
          setError(res.message || 'Falha ao autenticar com Hive Keychain.');
        }
      },
    );
  };

  const handlePrivateKeyLogin = async () => {
    setError('');
    const candidate = username.trim().toLowerCase();
    if (!checkIsSiteOwner(candidate)) return;
    if (!privateKey) {
      setError('Informe a chave privada.');
      return;
    }

    setPrivateKeyLoading(true);
    try {
      const result = await hiveServerLoginWithPassword(candidate, privateKey);
      if (result.validation.success && result.key) {
        onLogin(candidate, 'private', result.key);
      } else {
        setError(result.validation.message || 'Falha na autenticação.');
      }
    } catch {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setPrivateKeyLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes wilbor-border-sweep {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .wilbor-border-sweep { animation: wilbor-border-sweep 3.5s linear infinite; }
        @keyframes wilbor-card-glow {
          0%, 100% { box-shadow: 0 0 35px -8px rgba(255,255,255,0.05), 0 25px 50px -12px rgba(0,0,0,0.9); }
          50%      { box-shadow: 0 0 55px -8px rgba(255,255,255,0.12), 0 25px 50px -12px rgba(0,0,0,0.9); }
        }
        .wilbor-card-glow { animation: wilbor-card-glow 3.5s ease-in-out infinite; }
      `}</style>

      {/* Simulação de fluido — z-50, pointer-events: none */}
      <SplashCursor
        DENSITY_DISSIPATION={4}
        VELOCITY_DISSIPATION={2.5}
        SPLAT_RADIUS={0.18}
        CURL={4}
        RAINBOW_MODE={true}
        TRANSPARENT={true}
        BACK_COLOR={{ r: 0, g: 0, b: 0 }}
      />

      <div
        className="wilbor-admin fixed inset-0 z-[51] flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Entrar com conta Hive"
      >
        <div className="relative w-full max-w-sm">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{ padding: '1px', background: 'rgba(255,255,255,0.07)' }}
          >
            {/* Rastro de cometa girando na borda */}
            <div
              className="wilbor-border-sweep absolute"
              style={{
                width: '700px',
                height: '700px',
                top: '50%',
                left: '50%',
                background: [
                  'conic-gradient(from 0deg,',
                  '  transparent 0%,',
                  '  transparent 56%,',
                  '  rgba(255,255,255,0.03) 62%,',
                  '  rgba(220,220,235,0.40) 68%,',
                  '  rgba(245,245,255,0.88) 72%,',
                  '  rgba(255,255,255,1.00) 73%,',
                  '  rgba(245,245,255,0.88) 74%,',
                  '  rgba(220,220,235,0.40) 77%,',
                  '  rgba(255,255,255,0.03) 81%,',
                  '  transparent 84%,',
                  '  transparent 100%)',
                ].join(''),
              }}
            />

            <div className="wilbor-card-glow relative bg-zinc-950 rounded-[15px] overflow-hidden">
              <button
                type="button"
                onClick={onClose}
                disabled={anyLoading}
                aria-label="Fechar"
                className="absolute top-3 right-3 z-10 rounded-md p-1.5 text-zinc-500
                           hover:text-white hover:bg-zinc-800 transition disabled:opacity-40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Cabeçalho */}
              <div className="flex flex-col items-center gap-3 px-8 pt-8 pb-6 border-b border-zinc-800/50">
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-2xl blur-md"
                    style={{ background: 'rgba(161,161,170,0.12)' }}
                  />
                  <Image
                    src="/favicons/FAVCOM_WILBOR.png"
                    alt="Wilbor"
                    width={48}
                    height={48}
                    className="relative rounded-xl"
                  />
                </div>
                <div className="text-center">
                  <h2 className="text-base font-semibold text-white font-mono tracking-tight">
                    área do artista
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Autentique com sua conta Hive
                  </p>
                </div>
              </div>

              {/* Corpo */}
              <div className="flex flex-col gap-4 px-8 py-6">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="hive-username"
                    className="text-xs font-medium text-zinc-300 font-mono uppercase tracking-wider"
                  >
                    Usuário Hive
                  </label>
                  <input
                    id="hive-username"
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-mono
                               border border-zinc-800 placeholder:text-zinc-500
                               focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600
                               transition disabled:opacity-40"
                    placeholder={SITE_HIVE_USERNAME || 'seu-usuario'}
                    value={username}
                    onChange={e => { setUsername(e.target.value); clearError(); }}
                    disabled={anyLoading}
                    autoComplete="username"
                  />
                </div>

                <button
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg
                             bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600
                             text-sm font-medium text-zinc-200 font-mono transition
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handleKeychainLogin}
                  disabled={anyLoading || !username.trim()}
                >
                  {keychainLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
                    </svg>
                  )}
                  Login com Hive Keychain
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-zinc-800" />
                  <span className="text-xs text-zinc-500 font-mono">ou</span>
                  <div className="flex-1 h-px bg-zinc-800" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="hive-posting-key"
                    className="text-xs font-medium text-zinc-300 font-mono uppercase tracking-wider"
                  >
                    Chave privada (posting)
                  </label>
                  <input
                    id="hive-posting-key"
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 text-white text-sm font-mono
                               border border-zinc-800 placeholder:text-zinc-500
                               focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600
                               transition disabled:opacity-40"
                    type="password"
                    placeholder="5K…"
                    value={privateKey}
                    onChange={e => { setPrivateKey(e.target.value); clearError(); }}
                    disabled={anyLoading}
                    autoComplete="current-password"
                  />
                </div>

                <button
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg
                             bg-white hover:bg-zinc-100 text-zinc-950
                             text-sm font-semibold font-mono transition
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handlePrivateKeyLogin}
                  disabled={anyLoading || !username.trim() || !privateKey}
                >
                  {privateKeyLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  )}
                  Entrar com chave privada
                </button>

                {error && (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-950/40 border border-red-900/50">
                    <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    <p className="text-xs text-red-400 font-mono">{error}</p>
                  </div>
                )}

                {process.env.NODE_ENV === 'development' && (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-zinc-800" />
                      <span className="text-xs text-zinc-600 font-mono">dev only</span>
                      <div className="flex-1 h-px bg-zinc-800" />
                    </div>
                    <button
                      className="w-full px-4 py-2 rounded-lg border border-dashed border-yellow-900/60
                                 text-xs font-mono text-yellow-700 hover:text-yellow-500 hover:border-yellow-700
                                 transition"
                      onClick={() => {
                        if (process.env.NODE_ENV !== 'development') return;
                        onLogin(username.trim().toLowerCase() || SITE_HIVE_USERNAME, 'keychain');
                      }}
                    >
                      Dev Bypass
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
