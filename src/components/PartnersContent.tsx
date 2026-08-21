'use client';

import { getPostsByBlog, getUserAccount } from "@/../lib/hive/hive-client";
import EditPostButton, { SECTION_EDIT_CLASS } from '@/admin/EditPostButton';
import CollapsibleSection from '@/components/CollapsibleSection';
import Markdown from "@/components/Markdown";
import { useSiteConfig } from '@/lib/hive/useSiteConfig';
import { splitMarkdownSections } from '@/utility/markdown-sections';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { A11y, Navigation, Pagination, Scrollbar } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';
import 'swiper/css/pagination';

const TITLE_KEYWORDS = [
  'parceiros',
  'partners',
  'colaboradores',
  'collaborators',
  'colaboração',
  'collaboration',
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

function extractMediaFromPost(post: any) {
  const images: string[] = [];
  const videos: string[] = [];

  if (post.json_metadata) {
    let meta;
    try {
      meta = typeof post.json_metadata === 'string' ? JSON.parse(post.json_metadata) : post.json_metadata;
      if (meta && Array.isArray(meta.image)) {
        images.push(...meta.image);
      }
      if (meta && Array.isArray(meta.video)) {
        videos.push(...meta.video);
      }
    } catch { }
  }

  if (post.body) {
    const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match;
    while ((match = imgRegex.exec(post.body))) {
      images.push(match[1]);
    }

    const videoRegex = /<video[^>]*src=["']([^"'>\s]+)["'][^>]*>/g;
    while ((match = videoRegex.exec(post.body))) {
      videos.push(match[1]);
    }
  }

  return {
    images: Array.from(new Set(images)),
    videos: Array.from(new Set(videos))
  };
}

function useDynamicPartnersPost(username: string) {
  const [posts, setPosts] = useState<HivePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    (async () => {
      try {
        console.log(`Buscando posts de parceiros para o usuário: ${username}`);

        const userAccount = await getUserAccount(username);
        if (!userAccount) {
          setError(`Usuário '${username}' não encontrado no Hive.`);
          setLoading(false);
          return;
        }

        console.log(`Usuário ${username} encontrado, buscando posts...`);
        const allPosts = await getPostsByBlog(username);
        console.log(`Total de posts encontrados: ${allPosts.length}`);

        const matchingPosts = allPosts.filter((post: any) =>
          post.title && TITLE_KEYWORDS.some(keyword =>
            post.title.toLowerCase().includes(keyword.toLowerCase())
          )
        );

        if (matchingPosts.length > 0) {
          setPosts(matchingPosts);
        } else {
          console.log('Nenhum post específico encontrado, mostrando posts recentes');
          setPosts(allPosts.slice(0, 5));
        }
      } catch (err) {
        console.error('Erro ao buscar posts:', err);
        setError('Erro ao buscar posts do usuário.');
      }
      setLoading(false);
    })();
  }, [username]);

  return { posts, loading, error };
}

/**
 * O post de parceiros vem do Hive com uma categoria por título de nível 2,
 * separadas por régua. Cada categoria vira um bloco recolhível para a lista
 * (são mais de 80 nomes no total) não tomar a página inteira de uma vez.
 */
function PartnerSections({ body }: { body: string }) {
  const { sections, loose } = splitMarkdownSections(body);

  // Sem os títulos esperados, mostra o post como veio — melhor que sumir.
  if (sections.length === 0) {
    return <Markdown>{body}</Markdown>;
  }

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800">
      {sections.map(section => (
        <CollapsibleSection
          key={section.title}
          label={section.title}
          labelOpen={section.title}
          count={section.itemCount}
        >
          <div className="partner-list">
            <Markdown>{section.content}</Markdown>
          </div>
        </CollapsibleSection>
      ))}

      {loose && (
        <div className="pt-4 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          <Markdown>{loose}</Markdown>
        </div>
      )}
    </div>
  );
}

export default function PartnersContent() {
  const siteConfig = useSiteConfig();
  const { posts: hivePosts, loading, error } = useDynamicPartnersPost(process.env.NEXT_PUBLIC_HIVE_USERNAME || '');

  return (
      <div className="w-full flex justify-center px-4 sm:px-12 md:px-16 lg:px-20 pt-2 py-8 dark:text-gray-200 text-left">
        <div className="w-full max-w-5xl text-left space-y-2 sm:space-y-3 mx-auto">
          {/* Título da seção: o post do Hive começa direto na primeira
              categoria, sem dizer de que parte do site se trata. */}
          <h2
            className={[
              'font-mono text-xs sm:text-sm uppercase tracking-[0.18em]',
              'text-neutral-500 dark:text-neutral-400',
              'pb-2 mb-4 sm:mb-6',
              'border-b border-neutral-200 dark:border-neutral-800',
            ].join(' ')}
          >
            {siteConfig.sectionTitles.partners}
          </h2>
          {!loading && !error && hivePosts.length > 0 && (
            <div className="space-y-3 mb-8">
              {hivePosts.map((post, index) => {
                const media = extractMediaFromPost(post);
                return (
                  <article key={post.permlink} className="mb-6 p-3">
                    <div className="space-y-0">
                      <EditPostButton
                        post={post}
                        label="editar parceiros"
                        stopPropagation={false}
                        className={`mb-2 ${SECTION_EDIT_CLASS}`}
                      />
                      {media.images.length > 0 && (
                        <div className="w-full mb-2">
                          {media.images.length === 1 ? (
                            <div className="relative w-full h-60 sm:h-80 rounded-lg overflow-hidden">
                              <Image
                                src={media.images[0]}
                                alt={`Imagem do post: ${post.title}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 100vw"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <Swiper
                              modules={[Navigation, Pagination, Scrollbar, A11y]}
                              spaceBetween={10}
                              slidesPerView={1}
                              navigation
                              pagination={{ clickable: true }}
                              scrollbar={{ draggable: true }}
                              className="w-full h-60 sm:h-80 rounded-lg overflow-hidden"
                            >
                              {media.images.map((img, imgIndex) => (
                                <SwiperSlide key={imgIndex}>
                                  <div className="relative w-full h-full">
                                    <Image
                                      src={img}
                                      alt={`Imagem ${imgIndex + 1} do post: ${post.title}`}
                                      fill
                                      className="object-cover"
                                      sizes="(max-width: 768px) 100vw, 100vw"
                                      unoptimized
                                    />
                                  </div>
                                </SwiperSlide>
                              ))}
                            </Swiper>
                          )}
                        </div>
                      )}
                      {media.videos.length > 0 && (
                        <div className="grid grid-cols-1 gap-4">
                          {media.videos.map((video, videoIndex) => (
                            <div key={videoIndex} className="relative w-full">
                              <video
                                src={video}
                                controls
                                className="w-full rounded-lg"
                                style={{ maxHeight: '400px' }}
                              >
                                Seu navegador não suporta o elemento de vídeo.
                              </video>
                            </div>
                          ))}
                        </div>
                      )}
                      <PartnerSections
                        body={post.body.replace(/!\[.*?\]\(.*?\)/g, '')}
                      />
                      {index < hivePosts.length - 1 && (
                        <hr className="border-t border-gray-200 dark:border-gray-700 my-4" />
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
  );
}


