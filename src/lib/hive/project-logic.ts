import { getPostsByAuthor } from '@/lib/hive/hive-client';
import { isBlockedPermlink } from '@/lib/hive/blocked-posts';
import { MarkdownRenderer } from '@/lib/markdown/MarkdownRenderer';
import { Photo } from '@/photo/components/types';
import { Discussion } from '@hiveio/dhive';

export const getMediaType = (url: string, mediaType?: string) => {
  if (url.includes('ipfs.skatehive.app/ipfs/')) {
    return 'iframe';
  }

  // First check if it is an IPFS skatehive link
  if (url.includes('ipfs.skatehive.app/ipfs/')) {
    return 'iframe';
  }

  const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg|mov|m4v)$/);
  if (isVideo) return 'video';

  if (url.includes('hackmd.io/_uploads/')) return 'photo';

  if (url.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'photo';

  if (url.includes('ipfs.skatehive.app/') ||
    url.includes('.blob.vercel-storage.com/') ||
    url.includes('files.peakd.com/')) {
    return 'photo';
  }

  return 'photo';
};

export async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('All attempts failed');
}

export async function getHivePosts(username: string) {
  try {
    const posts = await retryOperation(async () => {
      return await getPostsByAuthor(username);
    });

    const visiblePosts = posts.filter(post => !isBlockedPermlink(post.permlink));
    
    const formattedPosts = visiblePosts.flatMap(post => {
      // Posts marcados como escondidos ou em destaque continuam vindo daqui,
      // apenas sinalizados. Quem some com os escondidos é a grade, no cliente,
      // que sabe se o artista está logado — se filtrássemos aqui, ele
      // esconderia um projeto e perderia o acesso para reexibi-lo.
      let isHidden = false;
      let isFeatured = false;
      try {
        const metadata = JSON.parse(post.json_metadata || '{}');
        const postTags: string[] = metadata.tags || [];
        isHidden = postTags.includes('hidden');
        isFeatured = postTags.includes('destaque');
      } catch (e) {
        console.warn('Error checking post flags:', e);
      }

      const mediaItems = MarkdownRenderer.extractMediaFromHive(post);

      return mediaItems.map((media) => {
        let postTags: string[] = [];
        let thumbnailSrc: string | undefined = undefined;
        try {
          const metadata = JSON.parse(post.json_metadata || '{}');
          postTags = metadata.tags || [];
          if (post.category && !postTags.includes(post.category)) {
            postTags.unshift(post.category);
          }
          // Extrair thumbnailSrc do metadata (pode estar em thumbnail, thumbnailSrc, ou thumbnail_url)
          thumbnailSrc = metadata.thumbnail || metadata.thumbnailSrc || metadata.thumbnail_url || undefined;
        } catch (e) {
          console.warn('Error parsing post tags:', e);
          postTags = post.category ? [post.category] : [];
        }

        // Se o media já tem thumbnailSrc, usar ele (prioridade)
        if (media.thumbnailSrc) {
          thumbnailSrc = media.thumbnailSrc;
        }

        const extractIpfsHash = (url: string): string => {
          if (url.includes('ipfs.skatehive.app/ipfs/')) {
            const match = url.match(/ipfs\/([a-zA-Z0-9]+)/);
            return match ? match[1] : '';
          }
          return '';
        };

        return {
          id: `${post.author}/${post.permlink}/${extractIpfsHash(media.url)}`,
          title: post.title,
          url: `/p/${post.author}/${post.permlink}/${extractIpfsHash(media.url)}`,
          type: media.type === 'iframe' || media.url.includes('ipfs.skatehive.app/ipfs/')
            ? 'iframe'
            : getMediaType(media.url),
          src: media.url,
          thumbnailSrc: thumbnailSrc,
          iframeHtml: media.url.includes('ipfs.skatehive.app/ipfs/')
            ? `<iframe 
                src="${media.url}?autoplay=1&controls=0&muted=1&loop=1"
                className="w-full h-full"
                style="aspect-ratio: 1/1;"
                allow="autoplay"
                frameborder="0"
              ></iframe>`
            : undefined,
          videoUrl: getMediaType(media.url, media.type) === 'video' ? media.url : undefined,
          blurData: '',
          takenAt: new Date(),
          takenAtNaive: new Date().toISOString(),
          takenAtNaiveFormatted: new Date().toLocaleDateString(),
          updatedAt: new Date(post.last_update),
          createdAt: new Date(post.created),
          aspectRatio: 1.5,
          priority: false,
          tags: Array.isArray(JSON.parse(post.json_metadata).tags)
            ? JSON.parse(post.json_metadata).tags
            : [],
          cameraKey: 'hive',
          camera: null,
          simulation: null,
          width: 0,
          height: 0,
          extension: media.url.split('.').pop() || '',
          hiveMetadata: {
            author: post.author,
            permlink: post.permlink,
            body: post.body,
            json_metadata: post.json_metadata
          },
          author: post.author,
          permlink: post.permlink,
          isHidden,
          isFeatured,
        } as Photo;
      });
    });

    // Remove duplicates using a more specific unique key
    const uniquePosts = formattedPosts.reduce((acc, post) => {
      const key = `${post.author}-${post.permlink}-${post.src}`;

      // If post doesn't exist or is a more recent video, add/update
      const existingPost = acc.find(p => `${p.author}-${p.permlink}-${p.src}` === key);
      if (!existingPost) {
        acc.push(post);
      }

      return acc;
    }, [] as Photo[]);

    return {
      formattedPosts: uniquePosts,
      originalPosts: visiblePosts
    };
  } catch (error) {
    console.error('Erro ao processar posts:', error);
    return {
      formattedPosts: [],
      originalPosts: []
    };
  }
}

export type Tag = { tag: string; count: number };
export type Tags = Tag[];

/**
 * Tags que controlam o comportamento do site e não são assunto de projeto.
 * Nunca devem aparecer como filtro no menu.
 */
export const CONTROL_TAGS = new Set(['hidden', 'destaque', 'site']);

export function extractAndCountTags(
  posts: Discussion[],
  paginatedPosts: Photo[]
): Tags {
  const tagCount = new Map<string, number>();

  // Posts escondidos ficam de fora da contagem. Eles passaram a chegar aqui
  // quando o filtro saiu do servidor, e sem esta exclusão as tags de um
  // projeto oculto apareceriam no menu para quem visita — levando a uma
  // página de tag vazia, já que /tag/[tag] continua escondendo o post.
  const visiblePermlinks = new Set(
    paginatedPosts
      .filter(post => !post.isHidden)
      .map(post => post.permlink)
  );
  const currentPagePosts = posts.filter(post =>
    visiblePermlinks.has(post.permlink)
  );

  currentPagePosts.forEach(post => {
    try {
      const metadata = JSON.parse(post.json_metadata || '{}');
      const postTags = metadata.tags || [];

      if (Array.isArray(postTags)) {
        postTags.forEach(tag => {
          if (typeof tag === 'string' && !CONTROL_TAGS.has(tag)) {
            tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
          }
        });
      }
    } catch (e) {
      console.warn('Error parsing tags:', { post: post.permlink, error: e });
    }
  });

  return Array.from(tagCount.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}





