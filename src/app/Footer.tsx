'use client';

import AdminLoginLink from '@/admin/AdminLoginLink';
import FooterContactForm from '@/components/FooterContactForm';
import EditPostButton, { SECTION_EDIT_CLASS } from '@/admin/EditPostButton';
import ImageCarousel from '@/components/ImageCarousel';
import Markdown from '@/components/Markdown';
import { TEXT_SECTION_INNER } from '@/components/textSection';
import { getAllPostsByBlog, getUserAccount } from '@/../lib/hive/hive-client';
import { useEffect, useState } from 'react';
import { extractContactTargets, type ContactTargets } from '@/utility/contact-targets';

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

/**
 * Rodapé do site, numa faixa cinza igual à do header para fechar a página
 * com a mesma moldura do topo.
 *
 * Alinha com a coluna das seções de texto (TEXT_SECTION_INNER): a marca do
 * estúdio à esquerda; à direita, "Fale com o estúdio" com os ícones de
 * contato na mesma linha e a caixa de mensagem logo abaixo, recolhida até
 * a pessoa abrir. Embaixo, uma
 * barra fina com a assinatura (post "footer" do Hive) e a entrada do
 * artista. No celular tudo empilha, centralizado.
 *
 * O id "contact" fica aqui para o link do menu cair no lugar certo.
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
  const logo = footerPost ? extractImagesFromPost(footerPost) : [];

  // A caixa de mensagem começa recolhida: marca, ícones de contato e
  // assinatura ficam sempre à vista, e "Fale com o estúdio" abre a caixa.
  // Abre sozinha pelo "CONTATO" do menu ou chegando com #contact no link.
  const hasForm = Boolean(contactTargets.whatsapp || contactTargets.email);
  const [formOpen, setFormOpen] = useState(false);
  useEffect(() => {
    if (window.location.hash === '#contact') setFormOpen(true);
    const open = () => setFormOpen(true);
    window.addEventListener('wilbor:open-contact', open);
    return () => window.removeEventListener('wilbor:open-contact', open);
  }, []);

  return (
    <footer
      id="contact"
      className="w-full bg-[#e5e5e5] text-neutral-600 dark:bg-black dark:text-neutral-400"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8 md:px-12">
        <div className={`${TEXT_SECTION_INNER} pt-10 pb-6 md:pt-12`}>
          <div
            className={[
              'grid items-start gap-8',
              'md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:gap-12',
            ].join(' ')}
          >
            {/* Marca */}
            <div className="flex justify-center md:justify-start">
              {logo.length > 0 && (
                <div
                  className={[
                    'w-[96px] md:w-[112px]',
                    // A marca é um PNG com o quadrado texturizado em cinza
                    // opaco e o lettering vazado. No escuro o quadrado vira
                    // um bloco aceso; escurecer preserva textura e vazado
                    // (o filtro não mexe no canal alfa).
                    'dark:brightness-[0.6]',
                  ].join(' ')}
                >
                  <ImageCarousel images={logo} inExpandedCard />
                </div>
              )}
            </div>

            {/* Contato */}
            <div className="w-full">
              <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 md:justify-between">
                <h2 className="m-0">
                  <button
                    type="button"
                    onClick={() => setFormOpen(open => !open)}
                    disabled={!hasForm}
                    aria-expanded={formOpen}
                    aria-controls="footer-contact-form"
                    className={[
                      // Zera o cromo que o tailwind.css dá a todo <button>.
                      'border-0 bg-transparent shadow-none rounded-none p-0',
                      'flex min-h-11 items-center gap-2 disabled:cursor-default',
                      // Mesmo traço dos títulos de seção, num tamanho menor.
                      'text-base font-extrabold uppercase tracking-[0.02em]',
                      'text-gray-900 dark:text-gray-100',
                    ].join(' ')}
                  >
                    Fale com o estúdio
                    {hasForm && (
                      <svg
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${formOpen ? '' : 'rotate-90'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                    )}
                  </button>
                </h2>
                {contactPost && (
                  <div className="footer-contact">
                    <Markdown className="markdown-contact">
                      {formatContactBody(contactPost.body)}
                    </Markdown>
                  </div>
                )}
              </div>

              {/* Recolhida só esconde: a mensagem já digitada não se perde. */}
              <div id="footer-contact-form" hidden={!formOpen} className={formOpen ? 'animate-fade-in' : undefined}>
                <FooterContactForm
                  targets={contactTargets}
                  className="w-full"
                  showLabel={false}
                />
              </div>

              {contactPost && (
                <div className="mt-3 flex justify-center md:justify-end">
                  <EditPostButton
                    post={contactPost}
                    label="editar contato"
                    stopPropagation={false}
                    className={SECTION_EDIT_CLASS}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Assinatura e entrada do artista */}
          <div
            className={[
              'mt-10 flex flex-col items-center gap-3 border-t pt-5',
              'border-neutral-300 dark:border-neutral-800',
              'sm:flex-row sm:justify-between',
            ].join(' ')}
          >
            <div className="flex items-center gap-3 [&_p]:!m-0 [&_p]:!text-xs [&_p]:!tracking-wide">
              {footerPost && (
                <>
                  <Markdown removeMedia>{footerPost.body}</Markdown>
                  <EditPostButton
                    post={footerPost}
                    label="editar rodapé"
                    stopPropagation={false}
                    className={SECTION_EDIT_CLASS}
                  />
                </>
              )}
            </div>
            <AdminLoginLink />
          </div>
        </div>
      </div>
    </footer>
  );
}
