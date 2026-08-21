'use client';

import { useHiveAuth } from './HiveAuthProvider';

/**
 * Entrada discreta para a área do artista, pensada para o rodapé.
 * Para o público é só um link pequeno; logado, some (a barra assume).
 */
export default function AdminLoginLink({ className = '' }: { className?: string }) {
  const { isAdmin, isReady, openLogin } = useHiveAuth();

  if (!isReady || isAdmin) return null;

  return (
    <button
      type="button"
      onClick={openLogin}
      className={[
        // Zera a borda/fundo que o tailwind.css aplica a todo <button>.
        'border-0 bg-transparent shadow-none rounded-none px-0',
        'font-mono text-[10px] uppercase tracking-wider',
        'text-neutral-400 hover:text-neutral-700',
        'dark:text-neutral-600 dark:hover:text-neutral-300',
        'transition-colors',
        className,
      ].filter(Boolean).join(' ')}
    >
      entrar
    </button>
  );
}
