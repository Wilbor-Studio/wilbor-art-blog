export interface ContactTargets {
  /** Número do WhatsApp só com dígitos, como o wa.me espera. */
  whatsapp?: string;
  email?: string;
}

/**
 * Lê os destinos de contato do corpo do post "contato" no Hive.
 *
 * Preferimos extrair a partir do post a fixar no código: o artista muda o
 * número ou o e-mail editando o próprio site, sem precisar de deploy.
 */
export function extractContactTargets(body: string): ContactTargets {
  const whatsapp = body.match(/wa\.me\/(\d{6,})/i)?.[1];
  const email = body.match(/mailto:([^\s"'<>)]+@[^\s"'<>)]+)/i)?.[1];

  return { whatsapp, email };
}

/** Link do WhatsApp já com a mensagem preenchida. */
export function buildWhatsAppUrl(number: string, message: string) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Link mailto já com assunto e corpo preenchidos. */
export function buildMailtoUrl(
  email: string,
  subject: string,
  message: string,
) {
  const params = new URLSearchParams({ subject, body: message });
  // URLSearchParams usa '+' para espaço; mailto espera %20.
  return `mailto:${email}?${params.toString().replace(/\+/g, '%20')}`;
}
