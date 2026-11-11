'use client';

import { PATH_GRID } from '@/app/paths';
import { useHiveAuth } from '@/admin/HiveAuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * Atalho de login. Substitui o projeto wilbor.dashboard: abre o modal de
 * autenticação e, já logado, devolve o artista ao site — onde os controles de
 * edição aparecem direto em cima do conteúdo.
 */
export default function DashboardPage() {
  const { isAdmin, isReady, isLoginOpen, openLogin } = useHiveAuth();
  const router = useRouter();
  // Abre o modal sozinho só na primeira vez. Antes, fechar o modal disparava
  // o efeito de novo e ele reabria na hora — não dava para sair dele.
  const autoOpened = useRef(false);

  useEffect(() => {
    if (!isReady) return;
    if (isAdmin) {
      router.replace(PATH_GRID);
    } else if (!isLoginOpen && !autoOpened.current) {
      autoOpened.current = true;
      openLogin();
    }
  }, [isAdmin, isReady, isLoginOpen, openLogin, router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-sm text-neutral-500 dark:text-neutral-400">
        {isAdmin ? 'Redirecionando…' : 'Entre com sua conta Hive para editar o site.'}
      </p>
      {isReady && !isAdmin && !isLoginOpen && (
        <button
          type="button"
          onClick={openLogin}
          className="rounded-full border border-neutral-400 px-4 py-2 font-mono text-xs
                     text-neutral-700 hover:border-black hover:text-black
                     dark:text-neutral-300 dark:hover:border-white dark:hover:text-white
                     transition"
        >
          entrar
        </button>
      )}
    </div>
  );
}
