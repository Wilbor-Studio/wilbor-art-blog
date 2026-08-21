/* eslint-disable */
'use client';

import { getPostsByBlog, getUserAccount } from "@/../lib/hive/hive-client";
import { isBlockedPermlink } from '@/lib/hive/blocked-posts';
import EditPostButton, { SECTION_EDIT_CLASS } from '@/admin/EditPostButton';
import AboutSummary from '@/components/AboutSummary';
import CollapsibleSection from '@/components/CollapsibleSection';
import Markdown from '@/components/Markdown';
import { useSiteConfig } from '@/lib/hive/useSiteConfig';
import { useEffect, useState } from 'react';

import 'swiper/css';
import 'swiper/css/pagination';

const TITLE_KEYWORDS = [
  'sobre mim',
  'about me',
  'sobre wilbor',
  'biografia',
  'perfil'
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isAboutPost(post: any) {
  if (isBlockedPermlink(post.permlink || '')) {
    return false;
  }

  const normalizedTitle = normalizeText(post.title || '');
  return TITLE_KEYWORDS.some(keyword => normalizedTitle.includes(normalizeText(keyword)));
}

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
    } catch {}
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

function useDynamicAboutPost(username: string) {
  const [posts, setPosts] = useState<HivePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    (async () => {
      try {
        console.log(`Buscando posts para o usuário: ${username}`);
        
        const userAccount = await getUserAccount(username);
        if (!userAccount) {
          setError(`Usuário '${username}' não encontrado no Hive.`);
          setLoading(false);
          return;
        }
        
        console.log(`Usuário ${username} encontrado, buscando posts...`);
        const allPosts = await getPostsByBlog(username);
        console.log(`Total de posts encontrados: ${allPosts.length}`);
        console.log('Títulos dos posts:', allPosts.map((p: any) => p.title));
        
        const matchingPosts = allPosts.filter((post: any) => isAboutPost(post));
        
        console.log(`Posts filtrados: ${matchingPosts.length}`);
        console.log('Títulos filtrados:', matchingPosts.map((p: any) => p.title));
        
        if (matchingPosts.length > 0) {
          setPosts(matchingPosts);
        } else {
          console.log('Nenhum post específico encontrado para a área Sobre');
          setPosts([]);
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

export default function About() {
  const siteConfig = useSiteConfig();
  const { posts: hivePosts, loading, error } = useDynamicAboutPost(
    process.env.NEXT_PUBLIC_HIVE_USERNAME || ''
  );

  return (
    <div className="w-full px-2 sm:px-8 pt-2 md:px-12 py-6 sm:py-8 dark:text-gray-200 text-left">
      <div className="max-w-full sm:max-w-4xl w-full text-left space-y-4 sm:space-y-3 mx-0">
        {/* Título e resumo são conteúdo do site: ficam de fora do gate do
            Hive para continuarem aparecendo se o fetch falhar. */}
        <h2
          className={[
            'font-mono text-xs sm:text-sm uppercase tracking-[0.18em]',
            'text-neutral-500 dark:text-neutral-400',
            'pb-2 mb-4 sm:mb-6',
            'border-b border-neutral-200 dark:border-neutral-800',
          ].join(' ')}
        >
          {siteConfig.sectionTitles.about}
        </h2>

        <AboutSummary />

        {!loading && !error && hivePosts.length > 0 && (
          <CollapsibleSection badge="hive" label="saber mais sobre a história">
            {hivePosts.map((post, index) => {
              const media = extractMediaFromPost(post);
              return (
                <article key={post.permlink} className="mb-4 sm:mb-6 p-2 sm:p-3">
                  <div className="space-y-1 sm:space-y-0">
                    <EditPostButton
                      post={post}
                      label="editar sobre"
                      stopPropagation={false}
                      className={`mb-2 ${SECTION_EDIT_CLASS}`}
                    />
                    <Markdown images={media.images.map((img, imgIndex) => ({ src: img, alt: `Imagem ${imgIndex + 1} do post: ${post.title}` }))}>
                      {post.body}
                    </Markdown>
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
                    {index < hivePosts.length - 1 && (
                      <hr className="border-t border-gray-200 dark:border-gray-700 my-4" />
                    )}
                  </div>
                </article>
              );
            })}
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
