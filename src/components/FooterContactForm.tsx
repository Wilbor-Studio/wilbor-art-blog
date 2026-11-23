'use client';

import { useState } from 'react';
import {
  buildMailtoUrl,
  buildWhatsAppUrl,
  type ContactTargets,
} from '@/utility/contact-targets';

const SUBJECT = 'Contato pelo site — Wilbor Studio';

/**
 * Caixa de mensagem do rodapé.
 *
 * Não há backend: os botões montam um link `mailto:` ou `wa.me` já com o texto
 * preenchido e abrem o app de e-mail ou o WhatsApp da pessoa. Assim a mensagem
 * sai da conta dela, e o artista responde no canal de sempre.
 */
export default function FooterContactForm({
  targets,
  className = 'mx-auto w-full max-w-sm px-4 pt-6',
  showLabel = true,
}: {
  targets: ContactTargets
  /** Largura e posição da caixa; o rodapé decide onde ela fica. */
  className?: string
  /**
   * Rótulo visível "Fale com o estúdio". Quem já mostra um título próprio
   * passa false, e o rótulo fica só para leitores de tela.
   */
  showLabel?: boolean
}) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');

  const hasMessage = message.trim().length > 0;
  const { whatsapp, email } = targets;

  // Sem nenhum destino no post de contato, não faz sentido mostrar a caixa.
  if (!whatsapp && !email) return null;

  const composed = name.trim()
    ? `${message.trim()}\n\n— ${name.trim()}`
    : message.trim();

  const buttonBase = [
    'flex-1 rounded-md px-3 py-2',
    'font-mono text-[11px] uppercase tracking-wider',
    'border transition-colors text-center',
  ].join(' ');

  const enabled = [
    'border-neutral-300 text-neutral-600',
    'hover:border-neutral-900 hover:text-neutral-900',
    'dark:border-neutral-700 dark:text-neutral-300',
    'dark:hover:border-neutral-100 dark:hover:text-neutral-100',
  ].join(' ');

  // Antes da mensagem os botões ficam legíveis, só sem ação: apagados demais
  // eles pareciam quebrados.
  const disabled = [
    'pointer-events-none',
    'border-neutral-300 text-neutral-400',
    'dark:border-neutral-800 dark:text-neutral-500',
  ].join(' ');

  return (
    <div className={`${className} text-left`}>
      <label
        htmlFor="footer-message"
        className={showLabel
          ? [
            'block font-mono text-[10px] uppercase tracking-[0.18em]',
            'text-neutral-500 dark:text-neutral-400 mb-2',
          ].join(' ')
          : 'sr-only'}
      >
        Fale com o estúdio
      </label>

      <input
        id="footer-name"
        value={name}
        onChange={event => setName(event.target.value)}
        placeholder="Seu nome (opcional)"
        aria-label="Seu nome"
        className={[
          'mb-2 w-full rounded-md px-3 py-2 text-sm',
          'border bg-white/70 dark:bg-neutral-950',
          'border-neutral-300 dark:border-neutral-800',
          'placeholder:text-neutral-400 dark:placeholder:text-neutral-600',
          'focus:outline-none focus:ring-1',
          'focus:ring-neutral-400 dark:focus:ring-neutral-500',
        ].join(' ')}
      />

      <textarea
        id="footer-message"
        value={message}
        onChange={event => setMessage(event.target.value)}
        rows={3}
        placeholder="Escreva sua mensagem…"
        className={[
          'mb-3 w-full resize-y rounded-md px-3 py-2 text-sm',
          'border bg-white/70 dark:bg-neutral-950',
          'border-neutral-300 dark:border-neutral-800',
          'placeholder:text-neutral-400 dark:placeholder:text-neutral-600',
          'focus:outline-none focus:ring-1',
          'focus:ring-neutral-400 dark:focus:ring-neutral-500',
        ].join(' ')}
      />

      <div className="flex gap-2">
        {whatsapp && (
          <a
            href={hasMessage ? buildWhatsAppUrl(whatsapp, composed) : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!hasMessage}
            className={`${buttonBase} ${hasMessage ? enabled : disabled}`}
          >
            WhatsApp
          </a>
        )}

        {email && (
          <a
            href={hasMessage
              ? buildMailtoUrl(email, SUBJECT, composed)
              : undefined}
            aria-disabled={!hasMessage}
            className={`${buttonBase} ${hasMessage ? enabled : disabled}`}
          >
            E-mail
          </a>
        )}
      </div>

      <p className="mt-2 text-[10px] text-neutral-400 dark:text-neutral-600">
        {hasMessage
          ? 'Abre o WhatsApp ou seu app de e-mail com a mensagem pronta.'
          : 'Escreva a mensagem e escolha por onde enviar.'}
      </p>
    </div>
  );
}
