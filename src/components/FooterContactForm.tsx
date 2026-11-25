'use client';

import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';
import { HiOutlineMail } from 'react-icons/hi';
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

  // contact-button (tailwind.css): um feixe de luz percorre a borda o tempo
  // todo, com ou sem mensagem.
  const buttonBase = [
    'contact-button flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5',
    'font-mono text-[11px] uppercase tracking-wider',
    'border transition-colors',
  ].join(' ');

  const enabled = [
    'border-neutral-500 text-neutral-800',
    'hover:border-neutral-900 hover:text-neutral-950',
    'dark:border-neutral-400 dark:text-neutral-100',
    'dark:hover:border-white dark:hover:text-white',
  ].join(' ');

  // Antes da mensagem os botões ficam legíveis, só sem ação: apagados demais
  // eles pareciam quebrados.
  const disabled = [
    'pointer-events-none',
    'border-neutral-400 text-neutral-500',
    'dark:border-neutral-600 dark:text-neutral-400',
  ].join(' ');

  return (
    <div className={`${className} text-center`}>
      <label
        htmlFor="footer-message"
        className={showLabel
          ? [
            'block font-mono text-sm sm:text-base uppercase tracking-[0.18em]',
            'text-neutral-700 dark:text-neutral-200 mb-3',
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
          'mb-2 w-full rounded-md px-3 py-2 text-left text-sm',
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
          'mb-3 w-full resize-y rounded-md px-3 py-2 text-left text-sm',
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
            <FaWhatsapp aria-hidden="true" className="size-4 shrink-0" />
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
            <HiOutlineMail aria-hidden="true" className="size-4 shrink-0" />
            E-mail
          </a>
        )}
      </div>
    </div>
  );
}
