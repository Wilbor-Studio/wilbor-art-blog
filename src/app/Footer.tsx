'use client';

import { useHiveAuth } from '@/admin/HiveAuthProvider';
import ArtistDoor from '@/components/ArtistDoor';
import Collapse from '@/components/Collapse';
import useBottomPushReveal from '@/components/useBottomPushReveal';
import CollapsibleSection from '@/components/CollapsibleSection';
import FooterContactForm from '@/components/FooterContactForm';
import EditPostButton, { SECTION_EDIT_CLASS } from '@/admin/EditPostButton';
import Markdown from '@/components/Markdown';
import { TEXT_SECTION_INNER, TEXT_SECTION_SHELL } from '@/components/textSection';
import { getAllPostsByBlog, getUserAccount } from '@/../lib/hive/hive-client';
import { useEffect, useLayoutEffect, useState } from 'react';
import { extractContactTargets, type ContactTargets } from '@/utility/contact-targets';

// Logo do estúdio na seção Contato: escondida por enquanto, a pedido do
// artista. O componente e a imagem do post continuam no projeto; para trazer
// de volta, basta voltar para true.
const SHOW_STUDIO_LOGO: boolean = false;

const TITLE_KEYWORDS = [
  'rodape',
  'rodapé',
  'footer',
  'copyright',
  'assinatura',
];

interface HivePost {
  title: string;
  body: string;
  author: string;
  permlink: string;
  created: string;
  json_metadata: string;
  url: string;
}

function extractImagesFromPost(
  post: HivePost,
): { src: string; alt?: string }[] {
  const images: string[] = [];

  if (post.json_metadata) {
    try {
      const metadata = typeof post.json_metadata === 'string'
        ? JSON.parse(post.json_metadata)
        : post.json_metadata;
      if (metadata && Array.isArray(metadata.image)) {
        images.push(...metadata.image);
      }
    } catch {
      // Ignore invalid JSON metadata
    }
  }

  if (post.body) {
    const markdownImgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
    const htmlImgRegex = /<img[^>]*src=["']([^"'>\s]+)["'][^>]*>/g;
    let match: RegExpExecArray | null = null;

    while ((match = markdownImgRegex.exec(post.body))) {
      images.push(match[1]);
    }
    while ((match = htmlImgRegex.exec(post.body))) {
      images.push(match[1]);
    }
  }

  const normalized = images
    .map((src) => String(src || '').trim())
    .filter(Boolean)
    .map((src) => (src.startsWith('//') ? `https:${src}` : src));

  return Array.from(new Set(normalized)).map((src) => ({
    src,
    alt: 'Imagem do rodapé',
  }));
}

const CONTACT_KEYWORDS = ['contato', 'contact', 'fale conosco', 'get in touch'];

/** Põe um <br> entre links markdown colados, para cada um ficar num item. */
function formatContactBody(body: string) {
  return body
    .replace(/(\]\([^)]*\))\s+/g, '$1<br>')
    .replace(/<br>\s*/g, '<br>');
}

function useDynamicFooterPost(username: string) {
  const [posts, setPosts] = useState<HivePost[]>([]);
  // Os destinos de contato saem do mesmo lote de posts já buscado aqui,
  // para não disparar uma segunda chamada ao Hive só por causa do formulário.
  const [contactTargets, setContactTargets] = useState<ContactTargets>({});
  const [contactPost, setContactPost] = useState<HivePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    (async () => {
      try {
        if (!username) {
          setError('Usuário Hive não configurado.');
          setLoading(false);
          return;
        }

        const userAccount = await getUserAccount(username);
        if (!userAccount) {
          setError(`Usuário '${username}' não encontrado no Hive.`);
          setLoading(false);
          return;
        }

        const allPosts = await getAllPostsByBlog(username);
        const matchingPosts = allPosts.filter((post: HivePost) =>
          post.title && TITLE_KEYWORDS.some((keyword) =>
            post.title.toLowerCase().includes(keyword.toLowerCase()),
          ),
        );

        const contactPost = allPosts.find((post: HivePost) =>
          post.title && CONTACT_KEYWORDS.some((keyword) =>
            post.title.toLowerCase().includes(keyword.toLowerCase()),
          ),
        );
        if (contactPost?.body) {
          setContactPost(contactPost);
          setContactTargets(extractContactTargets(contactPost.body));
        }

        if (matchingPosts.length > 0) {
          setPosts(matchingPosts);
        } else {
          setError('Nenhum post de rodapé encontrado.');
        }
      } catch {
        setError('Erro ao buscar post de rodapé.');
      }
      setLoading(false);
    })();
  }, [username]);

  return { posts, contactPost, contactTargets, loading, error };
}

/** Marca do estúdio. Gateway do IPFS fora do ar: tenta pelo proxy da Hive. */
function StudioLogo({ src }: { src: string }) {
  const [current, setCurrent] = useState(src);
  useEffect(() => { setCurrent(src); }, [src]);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt="Wilbor Studio"
      // O arquivo publicado tem 200px de largura. Exibido a 100px, uma tela
      // retina (2x) usa os pixels dele um para um, sem ampliar: ampliado,
      // ele borrava. Para ficar maior e nítido, precisa de um arquivo maior.
      width={100}
      height={119}
      decoding="async"
      onError={() => {
        if (!current.startsWith('https://images.hive.blog/')) {
          setCurrent(`https://images.hive.blog/0x0/${src}`);
        }
      }}
      className={[
        'block h-auto w-[100px] select-none',
        // A marca é um PNG com o quadrado texturizado em cinza opaco e o
        // lettering vazado. No fundo cinza da seção, no escuro, um leve
        // escurecimento basta para não acender (o filtro não mexe no alfa).
        'dark:brightness-[0.85]',
      ].join(' ')}
    />
  );
}

/**
 * Fim da página, em duas partes:
 *
 * - "Contato": uma seção como as de cima (mesma coluna, título e seta,
 *   começa recolhida). Aberta, mostra a marca do estúdio, os ícones de
 *   contato (post "contato" do Hive) e a caixa de mensagem. Abre sozinha
 *   pelo "CONTATO" do menu (como toda seção do menu) ou chegando com
 *   #contact no link; o id fica na
 *   seção para o menu e o scroll spy caírem nela.
 * - A faixa final, o último degrau da escala de tons das seções (a mais
 *   clara, --tone-footer), com a assinatura (post "footer") centralizada.
 * - Escondida abaixo dela, a entrada do artista: só aparece para quem, já
 *   no fim da página, insiste em rolar mais 5 vezes seguidas (easter egg,
 *   useBottomPushReveal). A cada visita é preciso repetir; logado, o
 *   artista usa a barra dele e a faixa não existe.
 */
export default function Footer() {
  const username = process.env.NEXT_PUBLIC_HIVE_USERNAME || '';
  const {
    posts,
    contactPost,
    contactTargets,
    loading,
    error,
  } = useDynamicFooterPost(username);

  const footerPost = !loading && !error ? posts[0] : undefined;
  const logo = footerPost ? extractImagesFromPost(footerPost)[0] : undefined;
  const shownLogo = SHOW_STUDIO_LOGO ? logo : undefined;
  const hasForm = Boolean(contactTargets.whatsapp || contactTargets.email);

  const { isAdmin, isReady } = useHiveAuth();
  const canLogIn = isReady && !isAdmin;
  const [loginRevealed, setLoginRevealed] = useState(false);
  useBottomPushReveal(() => {
    setLoginRevealed(true);
    // Depois que a faixa termina de deslizar (Collapse: 500ms), leva a
    // página até ela.
    setTimeout(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    }, 550);
  }, { enabled: canLogIn && !loginRevealed });

  const [contactOpen, setContactOpen] = useState(false);
  // Layout effect: roda antes do scroll spy da página (useEffect), que logo
  // ao montar troca o hash pela seção visível e apagaria o #contact.
  useLayoutEffect(() => {
    if (window.location.hash === '#contact') setContactOpen(true);
  }, []);

  return (
    <footer className="flex w-full flex-1 flex-col">
      <section
        id="contact"
        className="w-full flex-1 bg-[var(--tone-contact)] border-t border-neutral-200/40 dark:border-neutral-800/70"
      >
        <div className="max-w-6xl mx-auto">
          <div className={TEXT_SECTION_SHELL}>
            <div className={TEXT_SECTION_INNER}>
              <CollapsibleSection
                size="title"
                label="Contato"
                labelOpen="Contato"
                open={contactOpen}
                onOpenChange={setContactOpen}
                // Fechada, só esconde: a mensagem já digitada não se perde.
                keepMounted
                id="contact-content"
                action={contactPost && (
                  <EditPostButton
                    post={contactPost}
                    label="editar"
                    stopPropagation={false}
                    className={SECTION_EDIT_CLASS}
                  />
                )}
              >
                <div
                  className={[
                    'grid items-start gap-8 pt-2',
                    shownLogo && 'md:grid-cols-[auto_minmax(0,1fr)] md:gap-12',
                  ].filter(Boolean).join(' ')}
                >
                  {/* Marca */}
                  {shownLogo && (
                    <div className="flex justify-center md:justify-start">
                      <StudioLogo src={shownLogo.src} />
                    </div>
                  )}

                  {/* Ícones de contato e caixa de mensagem */}
                  <div className="flex w-full flex-col gap-6">
                    {contactPost && (
                      // O post traz o próprio CSS, com a lista centralizada.
                      <div
                        className={[
                          'footer-contact flex justify-center',
                          // Com a logo ao lado, a lista acompanha a coluna.
                          shownLogo && 'md:justify-start md:[&_.contato-lista]:!justify-start',
                        ].filter(Boolean).join(' ')}
                      >
                        <Markdown className="markdown-contact">
                          {formatContactBody(contactPost.body)}
                        </Markdown>
                      </div>
                    )}
                    {hasForm && (
                      <FooterContactForm
                        targets={contactTargets}
                        className={`mx-auto w-full max-w-xl ${shownLogo ? 'md:mx-0' : ''}`}
                      />
                    )}
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </div>
      </section>

      {/* Faixa final: assinatura no centro. A coluna da direita fica vazia
          com a mesma largura da esquerda ("editar rodapé"), senão a
          assinatura sairia do centro. */}
      <div className="w-full bg-[var(--tone-footer)] text-neutral-600 dark:text-neutral-400">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 md:px-12">
          <div
            data-band-bar=""
            className={[
              TEXT_SECTION_INNER,
              // Mesma altura de uma seção fechada (82px no celular, 98px a
              // partir do sm), com a área segura de baixo do iPhone somada.
              // Uma linha só em qualquer tela.
              'grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6',
              // --band-extra: o mesmo respiro das faixas de título quando a
              // página não enche a tela (useFillViewportBands).
              'min-h-[calc(82px+2*var(--band-extra,0px))] sm:min-h-[calc(98px+2*var(--band-extra,0px))] py-2',
              'pb-[calc(0.5rem+env(safe-area-inset-bottom))]',
            ].join(' ')}
          >
            <div className="min-w-0">
              {footerPost && (
                <EditPostButton
                  post={footerPost}
                  label="editar rodapé"
                  stopPropagation={false}
                  className={SECTION_EDIT_CLASS}
                />
              )}
            </div>
            <div className="text-center [&_p]:!m-0 [&_p]:!text-xs [&_p]:!tracking-wide [&_.markdown-content-custom]:!text-center">
              {footerPost && <Markdown removeMedia>{footerPost.body}</Markdown>}
            </div>
            <div aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Easter egg: a entrada do artista, revelada por 5 empurrões no fim
          da página. */}
      {canLogIn && (
        <Collapse open={loginRevealed}>
          <div className="w-full bg-black text-neutral-500">
            <div className="mx-auto max-w-6xl px-4 sm:px-8 md:px-12">
              <div
                className={[
                  TEXT_SECTION_INNER,
                  'py-8 pb-[calc(2rem+env(safe-area-inset-bottom))]',
                ].join(' ')}
              >
                <ArtistDoor active={loginRevealed} />
              </div>
            </div>
          </div>
        </Collapse>
      )}
    </footer>
  );
}
