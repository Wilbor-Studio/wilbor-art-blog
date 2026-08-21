'use client';

import type { Operation } from '@hiveio/dhive';
import { useEffect, useState } from 'react';
import { useHiveAuth } from './HiveAuthProvider';
import { broadcastOperations } from './hive-post';
import {
  DEFAULT_SITE_CONFIG,
  PERMLINK_SITE_CONFIG,
  type SiteConfig,
  buildSiteConfigBody,
  fetchSiteConfig,
} from '@/lib/hive/site-content';

/**
 * Ajustes gerais do site.
 *
 * São campos curtos e estruturados — diferente dos textos, que o artista
 * escreve em markdown livre. Por isso ficam num formulário com campos
 * próprios, e não numa caixa de markdown: um erro de digitação numa chave
 * quebraria a leitura, e aqui isso não é possível.
 */
export default function SiteSettingsPanel({
  onClose,
}: {
  onClose: () => void
}) {
  const { username, postingKey } = useHiveAuth();
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_SITE_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchSiteConfig().then(loaded => {
      if (!active) return;
      setConfig(loaded);
      setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);

  function update<K extends keyof SiteConfig>(
    key: K,
    value: Partial<SiteConfig[K]>,
  ) {
    setConfig(prev => ({ ...prev, [key]: { ...prev[key], ...value } }));
  }

  async function handleSave() {
    if (!username) {
      setError('Sessão expirada. Entre novamente.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const operations: Operation[] = [[
        'comment',
        {
          parent_author: '',
          parent_permlink: 'site',
          author: username,
          permlink: PERMLINK_SITE_CONFIG,
          title: 'configurações do site',
          body: buildSiteConfigBody(config),
          json_metadata: JSON.stringify({
            app: 'wilbor.art',
            // A tag 'hidden' mantém este post fora da grade de projetos.
            tags: ['site', 'hidden'],
          }),
        },
      ]];

      await broadcastOperations(username, operations, postingKey);
      onClose();
      // O Hive leva alguns segundos para servir a versão nova.
      setTimeout(() => window.location.reload(), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error
        ? saveError.message
        : 'Falha ao salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  }

  const field = [
    'w-full rounded-lg bg-zinc-800/80 border border-zinc-700 px-3 py-2',
    'text-sm text-white placeholder:text-zinc-500',
    'focus:outline-none focus:ring-1 focus:ring-zinc-500',
  ].join(' ');

  const labelClass =
    'block text-[11px] uppercase tracking-wide text-zinc-500 mb-1.5';

  return (
    <div
      className={[
        'wilbor-admin fixed inset-0 z-[60]',
        'flex items-center justify-center bg-black/80 p-0 sm:p-4',
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Configurações do site"
    >
      <div
        className={[
          'relative w-full h-full sm:h-auto sm:max-h-[90vh] max-w-lg',
          'flex flex-col bg-zinc-900 sm:rounded-xl',
          'border border-zinc-700/70 shadow-2xl overflow-hidden',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
            configurações do site
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-md p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {isLoading ? (
            <p className="text-sm text-zinc-500 font-mono">Carregando…</p>
          ) : (
            <>
              {/* Barra de aviso */}
              <section className="space-y-3">
                <h3 className="font-mono text-xs uppercase tracking-wider text-zinc-300">
                  Barra de aviso do topo
                </h3>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.banner.enabled}
                    onChange={event =>
                      update('banner', { enabled: event.target.checked })}
                    className="h-4 w-4 accent-green-500"
                  />
                  <span className="text-sm text-zinc-200">
                    Mostrar a barra no site
                  </span>
                </label>

                <div>
                  <label htmlFor="banner-text" className={labelClass}>Texto</label>
                  <input
                    id="banner-text"
                    className={field}
                    value={config.banner.text}
                    onChange={event =>
                      update('banner', { text: event.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="banner-label" className={labelClass}>
                    Texto do link
                  </label>
                  <input
                    id="banner-label"
                    className={field}
                    value={config.banner.linkLabel}
                    onChange={event =>
                      update('banner', { linkLabel: event.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="banner-url" className={labelClass}>
                    Endereço do link
                  </label>
                  <input
                    id="banner-url"
                    className={field}
                    value={config.banner.linkUrl}
                    onChange={event =>
                      update('banner', { linkUrl: event.target.value })}
                  />
                </div>
              </section>

              {/* SEO */}
              <section className="space-y-3 border-t border-zinc-800 pt-5">
                <h3 className="font-mono text-xs uppercase tracking-wider text-zinc-300">
                  Google e compartilhamento
                </h3>

                <div>
                  <label htmlFor="seo-title" className={labelClass}>
                    Título do site
                  </label>
                  <input
                    id="seo-title"
                    className={field}
                    value={config.seo.title}
                    onChange={event =>
                      update('seo', { title: event.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="seo-description" className={labelClass}>
                    Descrição
                  </label>
                  <textarea
                    id="seo-description"
                    rows={3}
                    className={`${field} resize-y`}
                    value={config.seo.description}
                    onChange={event =>
                      update('seo', { description: event.target.value })}
                  />
                  <p className="mt-1 text-[11px] text-zinc-600">
                    Aparece abaixo do título nos resultados de busca. Cerca de
                    160 caracteres. Você usou {config.seo.description.length}.
                  </p>
                </div>
              </section>

              {/* Títulos das seções */}
              <section className="space-y-3 border-t border-zinc-800 pt-5">
                <h3 className="font-mono text-xs uppercase tracking-wider text-zinc-300">
                  Títulos das seções
                </h3>

                <div>
                  <label htmlFor="title-about" className={labelClass}>
                    Seção sobre
                  </label>
                  <input
                    id="title-about"
                    className={field}
                    value={config.sectionTitles.about}
                    onChange={event =>
                      update('sectionTitles', { about: event.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="title-partners" className={labelClass}>
                    Seção parceiros
                  </label>
                  <input
                    id="title-partners"
                    className={field}
                    value={config.sectionTitles.partners}
                    onChange={event =>
                      update('sectionTitles', {
                        partners: event.target.value,
                      })}
                  />
                </div>
              </section>

              {error && (
                <div className="rounded-lg bg-red-950/40 border border-red-900/50 px-3 py-2.5">
                  <p className="text-xs text-red-400 font-mono">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm text-zinc-300 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className={[
              'px-4 py-2 rounded-md bg-green-600 text-white text-sm',
              'font-medium hover:bg-green-500',
              'disabled:opacity-60 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {isSaving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
