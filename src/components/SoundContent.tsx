'use client';

import EditSiteContentButton from '@/admin/EditSiteContentButton';
import { useHiveAuth } from '@/admin/HiveAuthProvider';
import CollapsibleSection from '@/components/CollapsibleSection';
import Markdown from '@/components/Markdown';
import { TEXT_SECTION_INNER, TEXT_SECTION_SHELL } from '@/components/textSection';
import { PERMLINK_SOUND } from '@/lib/hive/site-content';
import { useSiteConfig } from '@/lib/hive/useSiteConfig';
import { useSitePost } from '@/lib/hive/useSitePost';

/**
 * Ponto de partida do editor na primeira vez. Link sozinho numa linha vira
 * player ao publicar (Spotify, SoundCloud, YouTube, Vimeo).
 */
const STARTER_MARKDOWN = [
  'Escreva aqui uma apresentação curta, se quiser.',
  '',
  'Cole cada link numa linha sozinha — ele vira player ao publicar:',
  '',
  'https://open.spotify.com/playlist/…',
].join('\n');

/**
 * Seção "Bota o som": players e links de música escolhidos pelo artista.
 *
 * O conteúdo mora num post do Hive com permlink fixo, como o resumo do
 * Sobre. Enquanto o post não existe, quem visita não vê a seção; o artista
 * logado vê um convite para criá-la.
 */
export function useHasSoundSection() {
  const { body, loaded } = useSitePost(PERMLINK_SOUND);
  return loaded && Boolean(body);
}

export default function SoundContent() {
  const siteConfig = useSiteConfig();
  const { isAdmin, isReady } = useHiveAuth();
  const { body, loaded } = useSitePost(PERMLINK_SOUND);

  if (!loaded) return null;
  if (!body && !(isReady && isAdmin)) return null;

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
        {body ? (
          <CollapsibleSection
            size="title"
            label={title}
            labelOpen={title}
            action={
              <EditSiteContentButton
                permlink={PERMLINK_SOUND}
                title="bota o som"
                currentMarkdown={body}
                fallbackMarkdown={STARTER_MARKDOWN}
              />
            }
          >
            {/* Mesma cor de texto das outras seções (Sobre, Parceiros). */}
            <Markdown>{body}</Markdown>
          </CollapsibleSection>
        ) : (
          // Só o artista chega aqui: a seção ainda não foi publicada.
          <div className="flex items-center gap-3 py-4 sm:py-5">
            <span className="flex-1 min-w-0 text-2xl font-extrabold uppercase tracking-[0.02em] leading-tight text-gray-400 dark:text-gray-600">
              {title}
            </span>
            <EditSiteContentButton
              permlink={PERMLINK_SOUND}
              title="bota o som"
              currentMarkdown={null}
              fallbackMarkdown={STARTER_MARKDOWN}
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
