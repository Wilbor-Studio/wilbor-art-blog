'use client';

import { getAllPostsByBlog, getUserAccount } from "@/../lib/hive/hive-client";
import EditPostButton, { SECTION_EDIT_CLASS } from '@/admin/EditPostButton';
import Markdown from "@/components/Markdown";
import CollapsibleSection from '@/components/CollapsibleSection';
import { TEXT_SECTION_INNER, TEXT_SECTION_SHELL } from '@/components/textSection';
import { normalizeExhibitionMarkdown, splitExhibitionSections } from '@/utility/exhibition-markdown';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { A11y, Navigation, Pagination, Scrollbar } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';

import 'swiper/css';
import 'swiper/css/pagination';

const TITLE_KEYWORDS = [
  'exposições',
  'exhibitions',
  'exibições',
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

function useDynamicExhibitionsPost(username: string) {
  const [posts, setPosts] = useState<HivePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    (async () => {
      try {
        console.log(`Buscando posts de exposições para o usuário: ${username}`);

        const userAccount = await getUserAccount(username);
        if (!userAccount) {
          setError(`Usuário '${username}' não encontrado no Hive.`);
          setLoading(false);
          return;
        }

        console.log(`Usuário ${username} encontrado, buscando posts...`);
        const allPosts = await getAllPostsByBlog(username);
        console.log(`Total de posts encontrados: ${allPosts.length}`);
        console.log('Títulos dos posts:', allPosts.map((p: any) => p.title));

        const matchingPosts = allPosts.filter((post: any) =>
          post.title && TITLE_KEYWORDS.some(keyword =>
            post.title.toLowerCase().includes(keyword.toLowerCase())
          )
        );

        console.log(`Posts filtrados: ${matchingPosts.length}`);
        console.log('Títulos filtrados:', matchingPosts.map((p: any) => p.title));

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

export default function ExhibitionsContent() {
  const { posts: hivePosts, loading, error } = useDynamicExhibitionsPost(process.env.NEXT_PUBLIC_HIVE_USERNAME || '');

  if (loading || error || hivePosts.length === 0) {
    return null;
  }

  return (
    <div className={TEXT_SECTION_SHELL}>
      <div className={TEXT_SECTION_INNER}>
        <div>
          {hivePosts.map((post, index) => {
            const media = extractMediaFromPost(post);
            return (
              <article key={post.permlink}>
                <div className="space-y-1 sm:space-y-0">
                  {media.images.length > 0 && (
                    <div className="w-full mb-2">
                      {media.images.length === 1 ? (
                        <div className="relative w-full h-48 sm:h-60 md:h-80 rounded-lg overflow-hidden">
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
                          spaceBetween={6}
                          slidesPerView={1}
                          navigation
                          pagination={{ clickable: true }}
                          scrollbar={{ draggable: true }}
                          className="w-full h-48 sm:h-60 md:h-80 rounded-lg overflow-hidden"
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
                  {/* Cada "# título" do post (Exposições, Publicações) vira
                      acordeão; texto antes do primeiro # fica sempre aberto. */}
                  {splitExhibitionSections(normalizeExhibitionMarkdown(post.body)).map((section, sectionIndex) =>
                    section.title === null ? (
                      <Markdown key={sectionIndex} className="exhibition-content" removeMedia>
                        {section.body}
                      </Markdown>
                    ) : (
                      <div
                        key={sectionIndex}
                        // Publicações ganham uma faixa de fundo própria, como
                        // a troca de cor entre as seções da página.
                        className={/publica/i.test(section.title)
                          ? 'publications-band'
                          : undefined}
                      >
                        <CollapsibleSection
                          size="title"
                          label={section.title}
                          labelOpen={section.title}
                          // Exposições e Publicações moram no mesmo post:
                          // os dois "editar" abrem o mesmo texto.
                          action={
                            <EditPostButton
                              post={post}
                              stopPropagation={false}
                              className={SECTION_EDIT_CLASS}
                            />
                          }
                        >
                          <Markdown className="exhibition-content" removeMedia>
                            {section.body}
                          </Markdown>
                        </CollapsibleSection>
                      </div>
                    )
                  )}
                  {index < hivePosts.length - 1 && (
                    <hr className="border-t border-gray-200 dark:border-gray-700 my-4" />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
