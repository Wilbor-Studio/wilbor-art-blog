/**
 * Moldura comum das seções de texto da landing (Sobre, Exposições,
 * Parceiros). Fechadas, cada seção é só a linha do título; o respiro em
 * cima e embaixo dela vem só daqui + o padding do próprio título
 * (CollapsibleSection: py-4 / sm:py-5), então o título fica centralizado
 * na faixa e todas as seções têm a mesma altura por linha.
 *
 * A faixa de Publicações (.publications-band, em exhibitions.css) usa o
 * mesmo valor de padding para manter a simetria.
 */
export const TEXT_SECTION_SHELL =
  'w-full px-4 sm:px-8 md:px-12 py-3 sm:py-4 dark:text-gray-200 text-left';

export const TEXT_SECTION_INNER = 'w-full max-w-4xl mx-auto text-left';
