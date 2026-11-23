'use client';

import AdminLoginLink from '@/admin/AdminLoginLink';
import FooterContactForm from '@/components/FooterContactForm';
import EditPostButton, { SECTION_EDIT_CLASS } from '@/admin/EditPostButton';
import ImageCarousel from '@/components/ImageCarousel';
import Markdown from '@/components/Markdown';
import { getPostsByBlog, getUserAccount } from '@/../lib/hive/hive-client';
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

        const allPosts = await getPostsByBlog(username);
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
 * Rodapé do site: a marca do estúdio à esquerda; à direita, os ícones de
 * contato e a caixa "Fale com o estúdio". No celular as duas colunas
 * empilham, centralizadas.
 *
 * Os ícones vêm do post de contato do Hive (antes uma seção separada acima
 * do rodapé). O id "contact" fica aqui para o link do menu continuar
 * caindo no lugar certo.
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

  const showBrand = !loading && !error && posts.length > 0;

  return (
    <footer
      id="contact"
      className="w-full border-t border-neutral-200/60 dark:border-neutral-800/70"
    >
      <div
        className={[
          'mx-auto max-w-6xl px-4 sm:px-8 md:px-12',
          'pt-10 pb-8 md:pt-14 md:pb-10',
          'grid items-start gap-10',
          // iPad em pé já cabe nas duas colunas; a da direita tem largura
          // de formulário, e a marca fica com o resto.
          'md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-12',
          'lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]',
        ].join(' ')}
      >
        {/* Marca */}
        <div
          className={[
            'flex flex-col items-center gap-3 text-center',
            'md:items-start md:text-left',
            'text-neutral-500 dark:text-neutral-400',
          ].join(' ')}
        >
          {showBrand && posts.map((post) => {
            const images = extractImagesFromPost(post);
            return (
              <article
                key={post.permlink}
                className="flex flex-col items-center gap-3 md:items-start"
              >
                {images.length > 0 && (
                  <div
                    className={[
                      'w-[120px] md:w-[150px]',
                      // A marca é um PNG com o quadrado texturizado em
                      // cinza opaco e o lettering vazado. No claro isso
                      // funciona; no escuro o quadrado vira um bloco
                      // aceso. Escurecer preserva a textura e o vazado
                      // (o filtro não mexe no canal alfa).
                      'dark:brightness-[0.6]',
                    ].join(' ')}
                  >
                    <ImageCarousel images={images} inExpandedCard />
                  </div>
                )}
                <div className="text-sm [&_p]:!m-0">
                  <Markdown removeMedia>{post.body}</Markdown>
                </div>
                <EditPostButton
                  post={post}
                  label="editar rodapé"
                  stopPropagation={false}
                  className={SECTION_EDIT_CLASS}
                />
              </article>
            );
          })}

          <AdminLoginLink className="mt-1" />
        </div>

        {/* Contato */}
        <div className="flex w-full flex-col items-center gap-6 md:items-end">
          {contactPost && (
            <div className="footer-contact flex flex-col items-center gap-2 md:items-end">
              <Markdown className="markdown-contact">
                {formatContactBody(contactPost.body)}
              </Markdown>
              <EditPostButton
                post={contactPost}
                label="editar contato"
                stopPropagation={false}
                className={SECTION_EDIT_CLASS}
              />
            </div>
          )}

          <FooterContactForm targets={contactTargets} className="w-full" />
        </div>
      </div>
    </footer>
  );
}
