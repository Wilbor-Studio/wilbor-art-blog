'use client';

import EditSiteContentButton from '@/admin/EditSiteContentButton';
import { useHiveAuth } from '@/admin/HiveAuthProvider';
import CollapsibleSection from '@/components/CollapsibleSection';
import Markdown from '@/components/Markdown';
import { embedMusicLinks } from '@/utility/music-embed';
import SectionBanner from '@/components/SectionBanner';
import { TEXT_SECTION_INNER, TEXT_SECTION_SHELL } from '@/components/textSection';
import { PERMLINK_SOUND } from '@/lib/hive/site-content';
import { useSiteConfig } from '@/lib/hive/useSiteConfig';
import { useSitePost } from '@/lib/hive/useSitePost';

/**
 * Ponto de partida do editor na primeira vez. Link sozinho numa linha vira
 * player ao publicar (Spotify, SoundCloud, Apple Music, YouTube, Vimeo).
 */
export const STARTER_MARKDOWN = [
  'Escreva aqui uma apresentação curta, se quiser.',
  '',
  'Cole cada link numa linha sozinha — ele vira player ao publicar:',
  '',
  'https://open.spotify.com/playlist/…',
].join('\n');

/**
 * Como o texto da seção é exibido, no site e no preview do editor: sem a
 * classe das Exposições e com as quebras de linha que o artista digitou.
 */
const SOUND_MARKDOWN_PROPS = { className: '', preserveLineBreaks: true };

/**
 * Seção "Bota o som": players e links de música escolhidos pelo artista.
 *
 * O conteúdo mora num post do Hive com permlink fixo, como o resumo do
 * Sobre. Enquanto o post não existe, quem visita não vê a seção; o artista
 * logado vê um convite para criá-la.
 */
/**
 * Corpo publicado da seção, ou null. Um post que ainda é só o texto-modelo
 * do editor (publicado sem editar) conta como não publicado: senão as
 * instruções "Escreva aqui…" apareceriam para quem visita.
 */
export function publishedSoundBody(body: string | null | undefined) {
  if (!body?.trim()) return null;
  return body.trim() === STARTER_MARKDOWN.trim() ? null : body;
}

function usePublishedSound() {
  const { body, loaded } = useSitePost(PERMLINK_SOUND);
  return { body, published: publishedSoundBody(body), loaded };
}

export function useHasSoundSection() {
  const { published, loaded } = usePublishedSound();
  return loaded && Boolean(published);
}

export default function SoundContent() {
  const siteConfig = useSiteConfig();
  const { isAdmin, isReady } = useHiveAuth();
  const { body, published, loaded } = usePublishedSound();

  if (!loaded) return null;
  if (!published && !(isReady && isAdmin)) return null;

  const title = siteConfig.sectionTitles.sound;

  // A faixa inteira (fundo e borda) mora aqui: se a seção não aparece, não
  // sobra uma faixa vazia na página.
  return (
    <section
      id="som"
      className="w-full bg-[var(--tone-sound)] border-t border-neutral-200/40 dark:border-neutral-800/70"
    >
    <div className="max-w-6xl mx-auto">
    <div className={TEXT_SECTION_SHELL}>
      <div className={TEXT_SECTION_INNER}>
        {published ? (
          <CollapsibleSection
            size="title"
            label={title}
            labelOpen={title}
            action={
              <EditSiteContentButton
                permlink={PERMLINK_SOUND}
                title="bota o som"
                currentMarkdown={published}
                fallbackMarkdown={STARTER_MARKDOWN}
                previewMarkdownProps={SOUND_MARKDOWN_PROPS}
              />
            }
          >
            <SectionBanner slot="sound" alt={title} />
            {/* Mesma cor de texto das outras seções (Sobre, Parceiros). */}
            {/* Link de playlist cru (post salvo antes de o editor converter)
                vira o player, com o link para o app logo abaixo. */}
            <Markdown {...SOUND_MARKDOWN_PROPS}>{embedMusicLinks(published)}</Markdown>
          </CollapsibleSection>
        ) : (
          // Só o artista chega aqui: a seção ainda não foi publicada. O
          // título usa a mesma cor dos outros (em cinza claro parecia
          // defeito); o estado fica no selo ao lado.
          <div className="flex items-center gap-3 py-4 sm:py-5">
            <span className="flex flex-1 min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-2xl font-extrabold uppercase tracking-[0.02em] leading-tight text-gray-900 dark:text-gray-100">
                {title}
              </span>
              <span
                className="rounded-full bg-amber-400 px-2 py-0.5 font-mono text-[10px] text-black whitespace-nowrap"
                title="Quem visita ainda não vê esta seção."
              >
                não publicada · só você vê
              </span>
            </span>
            <EditSiteContentButton
              permlink={PERMLINK_SOUND}
              title="bota o som"
              // Se o modelo já foi publicado, o editor abre nele (modo
              // editar); senão, cria o post.
              currentMarkdown={body}
              fallbackMarkdown={STARTER_MARKDOWN}
              previewMarkdownProps={SOUND_MARKDOWN_PROPS}
              label="criar seção"
            />
          </div>
        )}
      </div>
    </div>
    </div>
    </section>
  );
}
