'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_SITE_CONFIG, type SiteConfig, fetchSiteConfig } from './site-content';

/**
 * Configurações do site para componentes de cliente.
 *
 * A promessa é guardada em escopo de módulo: várias seções podem usar o hook
 * na mesma página sem multiplicar a ida à rede.
 *
 * Começa sempre pelo padrão do código, então o primeiro render (inclusive o
 * do servidor) já tem conteúdo e não há descompasso na hidratação.
 */
let pending: Promise<SiteConfig> | null = null;

export function useSiteConfig(): SiteConfig {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);

  useEffect(() => {
    let active = true;
    pending = pending ?? fetchSiteConfig();
    pending.then(loaded => {
      if (active) setConfig(loaded);
    });
    return () => { active = false; };
  }, []);

  return config;
}
