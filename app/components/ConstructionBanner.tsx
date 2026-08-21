import { fetchSiteConfig } from '@/lib/hive/site-content';

/**
 * Barra de aviso do topo. Texto, link e liga/desliga vêm das configurações
 * que o artista edita pelo painel — no lançamento ele desliga sozinho, sem
 * precisar de deploy.
 *
 * Roda no servidor: o conteúdo já sai no HTML, sem piscar na tela.
 */
export default async function ConstructionBanner() {
  const { banner } = await fetchSiteConfig();

  if (!banner.enabled || !banner.text.trim()) return null;

  const hasLink = Boolean(banner.linkUrl.trim() && banner.linkLabel.trim());

  return (
    <div
      // O botão fixo do menu mede este elemento para se alinhar à faixa do
      // header enquanto o banner estiver visível.
      id="construction-banner"
      className={[
        'w-full border-b',
        'border-neutral-200 dark:border-neutral-800',
        'bg-neutral-100 dark:bg-neutral-900',
        'text-neutral-600 dark:text-neutral-400',
      ].join(' ')}
    >
      <p
        className={[
          'mx-auto max-w-7xl',
          'px-4 py-2',
          'text-center text-xs',
        ].join(' ')}
      >
        {banner.text}
        {hasLink && (
          <>
            {' '}
            <a
              href={banner.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={[
                // No mobile o link vira bloco: cai numa linha própria e o
                // text-center do pai o centraliza. A partir de sm volta a
                // fluir na mesma linha da frase.
                'block sm:inline',
                'mt-1 sm:mt-0',
                'underline underline-offset-2',
                'text-neutral-900 dark:text-neutral-100',
                'hover:opacity-70',
              ].join(' ')}
            >
              {banner.linkLabel}
            </a>
          </>
        )}
      </p>
    </div>
  );
}
