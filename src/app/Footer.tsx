'use client';

import AdminLoginLink from '@/admin/AdminLoginLink';
import EditPostButton from '@/admin/EditPostButton';
import ImageCarousel from '@/components/ImageCarousel';
import Markdown from '@/components/Markdown';
import { getPostsByBlog, getUserAccount } from '@/../lib/hive/hive-client';
import { useEffect, useState } from 'react';

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

function useDynamicFooterPost(username: string) {
  const [posts, setPosts] = useState<HivePost[]>([]);
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

  return { posts, loading, error };
}

export default function Footer() {
  const username = process.env.NEXT_PUBLIC_HIVE_USERNAME || '';
  const { posts, loading, error } = useDynamicFooterPost(username);

  return (
    <footer className="w-full pb-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-center items-center">
          <div className="flex flex-col items-center justify-center">
            {!loading && !error && posts.length > 0 && (
              <div
                className={[
                  'mt-2 w-full max-w-[340px] text-center px-2',
                  'text-neutral-500 dark:text-neutral-400',
                ].join(' ')}
              >
                {posts.map((post) => {
                  const images = extractImagesFromPost(post);
                  return (
                    <article key={post.permlink} className="mb-2">
                      {images.length > 0 && (
                        <div
                          className={[
                            'w-full max-w-[120px] sm:max-w-[140px]',
                            'mx-auto mb-2',
                          ].join(' ')}
                        >
                          <ImageCarousel images={images} inExpandedCard />
                        </div>
                      )}
                      <Markdown removeMedia>{post.body}</Markdown>
                      <div className="mt-1 flex justify-center">
                        <EditPostButton
                          post={post}
                          label="editar rodapé"
                          stopPropagation={false}
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <div className="mt-3">
              <AdminLoginLink />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
