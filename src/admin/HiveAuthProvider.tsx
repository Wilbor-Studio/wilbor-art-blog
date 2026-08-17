'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import HiveLoginModal from './HiveLoginModal';

export type HiveAuthMethod = 'keychain' | 'private';

const STORAGE_LOGGED_IN = 'wilbor_admin_logged_in';
const STORAGE_USERNAME = 'wilbor_admin_username';
const STORAGE_POSTING_KEY = 'wilbor_admin_posting_key';
const STORAGE_METHOD = 'wilbor_admin_method';

/** Conta dona do site — só ela vê os controles de edição. */
export const SITE_HIVE_USERNAME = process.env.NEXT_PUBLIC_HIVE_USERNAME || '';

interface HiveAuthValue {
  /** Usuário Hive autenticado, ou null. */
  username: string | null;
  /** Chave de posting cifrada (só existe no login por chave privada). */
  postingKey: string | null;
  authMethod: HiveAuthMethod | null;
  /** true quando o usuário logado é o dono do site: libera a edição. */
  isAdmin: boolean;
  /** false até o estado ser restaurado do localStorage (evita flash de UI). */
  isReady: boolean;
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  login: (username: string, method: HiveAuthMethod, key?: string) => void;
  logout: () => void;
}

const HiveAuthContext = createContext<HiveAuthValue | null>(null);

export function useHiveAuth() {
  const context = useContext(HiveAuthContext);
  if (!context) {
    throw new Error('useHiveAuth precisa estar dentro de <HiveAuthProvider>');
  }
  return context;
}

export default function HiveAuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [username, setUsername] = useState<string | null>(null);
  const [postingKey, setPostingKey] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<HiveAuthMethod | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Restaura a sessão salva
  useEffect(() => {
    try {
      const storedLoggedIn = localStorage.getItem(STORAGE_LOGGED_IN);
      const storedUsername = localStorage.getItem(STORAGE_USERNAME);
      if (storedLoggedIn === 'true' && storedUsername) {
        setUsername(storedUsername);
        setPostingKey(localStorage.getItem(STORAGE_POSTING_KEY));
        setAuthMethod(localStorage.getItem(STORAGE_METHOD) as HiveAuthMethod | null);
      }
    } catch {
      // localStorage indisponível (modo privado, etc.) — segue deslogado
    }
    setIsReady(true);
  }, []);

  const login = useCallback((
    nextUsername: string,
    method: HiveAuthMethod,
    key?: string,
  ) => {
    setUsername(nextUsername);
    setAuthMethod(method);
    setPostingKey(method === 'private' && key ? key : null);
    setIsLoginOpen(false);

    try {
      localStorage.setItem(STORAGE_LOGGED_IN, 'true');
      localStorage.setItem(STORAGE_USERNAME, nextUsername);
      localStorage.setItem(STORAGE_METHOD, method);
      if (method === 'private' && key) {
        localStorage.setItem(STORAGE_POSTING_KEY, key);
      } else {
        localStorage.removeItem(STORAGE_POSTING_KEY);
      }
    } catch {
      // sessão só nesta aba
    }
  }, []);

  const logout = useCallback(() => {
    setUsername(null);
    setPostingKey(null);
    setAuthMethod(null);
    setIsLoginOpen(false);

    try {
      localStorage.removeItem(STORAGE_LOGGED_IN);
      localStorage.removeItem(STORAGE_USERNAME);
      localStorage.removeItem(STORAGE_POSTING_KEY);
      localStorage.removeItem(STORAGE_METHOD);
    } catch {
      // nada a limpar
    }
  }, []);

  const openLogin = useCallback(() => setIsLoginOpen(true), []);
  const closeLogin = useCallback(() => setIsLoginOpen(false), []);

  const value = useMemo<HiveAuthValue>(() => ({
    username,
    postingKey,
    authMethod,
    isAdmin: Boolean(
      username && SITE_HIVE_USERNAME && username === SITE_HIVE_USERNAME,
    ),
    isReady,
    isLoginOpen,
    openLogin,
    closeLogin,
    login,
    logout,
  }), [
    username, postingKey, authMethod, isReady, isLoginOpen,
    openLogin, closeLogin, login, logout,
  ]);

  return (
    <HiveAuthContext.Provider value={value}>
      {children}
      {isLoginOpen && (
        <HiveLoginModal onLogin={login} onClose={closeLogin} />
      )}
    </HiveAuthContext.Provider>
  );
}
