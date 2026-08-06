const PORTFOLIO_URL = 'https://cargocollective.com/wilbor';

export default function ConstructionBanner() {
  return (
    <div
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
        Site em construção. Enquanto isso, acesse o{' '}
        <a
          href={PORTFOLIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={[
            'underline underline-offset-2',
            'text-neutral-900 dark:text-neutral-100',
            'hover:opacity-70',
          ].join(' ')}
        >
          portfólio completo
        </a>
        .
      </p>
    </div>
  );
}
