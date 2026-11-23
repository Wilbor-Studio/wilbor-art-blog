'use client';

import { useEffect, useState } from 'react';
import { fetchPostBody } from './site-content';

/**
 * Corpo de um post de conteúdo do site (permlink fixo), para componentes de
 * cliente. A promessa fica em cache por permlink: a seção e o item do menu
 * podem perguntar pelo mesmo post sem duas idas ao Hive.
 *
 * `loaded` distingue "ainda buscando" de "o post não existe".
 */
const pending = new Map<string, Promise<string | null>>();

export function useSitePost(permlink: string) {
  const [body, setBody] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    if (!pending.has(permlink)) pending.set(permlink, fetchPostBody(permlink));
    pending.get(permlink)!.then(result => {
      if (!active) return;
      setBody(result);
      setLoaded(true);
    });
    return () => { active = false; };
  }, [permlink]);

  return { body, loaded };
}
