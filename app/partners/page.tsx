'use client';

import { getAllPostsByBlog, getUserAccount } from "@/../lib/hive/hive-client";
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { A11y, Navigation, Pagination, Scrollbar } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import ViewSwitcher from '../../src/app/ViewSwitcher';

import 'swiper/css';
import 'swiper/css/pagination';

import Markdown from "@/components/Markdown";
import React from "react";

const TITLE_KEYWORDS = [
  'parceiros',
  'partners',
  'colaboradores',
  'collaborators',
  'colaboração',
  'collaboration',
];

export const dynamic = 'force-static';
export const maxDuration = 60;



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

function formatPartnerBody(body: string): string {
  if (!body.includes('#') && !body.includes('---')) {
    const lines = body.trim().split('\n');
    let formattedBody = '';

    if (lines.length >= 3) {
      const title = lines[0];
      formattedBody = `## ${title}\n\n`;

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          formattedBody += `${lines[i]}\n`;
        }
      }

      formattedBody += '\n---\n';
    } else {
      formattedBody = body;
    }

    return formattedBody;
  }

  return body;
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
        const allPosts = await getAllPostsByBlog(username);
        console.log(`Total de posts encontrados: ${allPosts.length}`);

        const matchingPosts = allPosts.filter((post: any) =>
          post.title && TITLE_KEYWORDS.some(keyword =>
            post.title.toLowerCase().includes(keyword.toLowerCase())
          )
        );

        console.log(`Posts filtrados: ${matchingPosts.length}`);

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

export default function PartnersPage() {
  const { posts: hivePosts, loading, error } = useDynamicPartnersPost(process.env.NEXT_PUBLIC_HIVE_USERNAME || '');

  return (
    <>
      <React.Suspense fallback={null}>
        <ViewSwitcher currentSelection="partners" />
      </React.Suspense>
      <div className="w-full px-4 sm:px-8 pt-2 md:px-12 py-8 dark:text-gray-200 text-left">
        <div className="max-w-4xl w-full text-left space-y-2 sm:space-y-3 mx-0">
          {!loading && !error && hivePosts.length > 0 && (
            <div className="space-y-3 mb-8">
              {hivePosts.map((post, index) => {
                const media = extractMediaFromPost(post);
                return (
                  <article key={post.permlink} className="mb-6 p-3">
                    <div className="space-y-0">
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
                      <Markdown columns>
                        {post.body.replace(/!\[.*?\]\(.*?\)/g, '')}
                      </Markdown>
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
    </>
  );
}
