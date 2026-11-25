import { Client, Discussion, PrivateKey } from '@hiveio/dhive';
import { getAllPostsByBlog } from '@/../lib/hive/hive-client';

const client = new Client(['https://api.hive.blog']);

interface HiveUser {
  id: string;
  name: string;
  posting_json_metadata: string;

  profile?: {
    profile_image?: string;
    name?: string;
    about?: string;
    location?: string;
    website?: string;
  }
}

export class HiveAuth {
  private client: Client;

  constructor() {
    this.client = new Client(['https://api.hive.blog']);
  }

  async authenticateUser(username: string, postingKey: string): Promise<HiveUser | null> {
    try {
      const [account] = await this.client.database.getAccounts([username]);

      if (!account) {
        return null;
      }

      try {
        const publicKey = PrivateKey.from(postingKey).createPublic();
        const postingPubKey = account.posting.key_auths[0][0];

        if (publicKey.toString() !== postingPubKey) {
          return null;
        }
      } catch (e) {
        return null;
      }

      let profile = {};
      try {
        const metadata = JSON.parse(account.posting_json_metadata);
        profile = metadata.profile || {};
      } catch (e) {
      }

      return {
        id: account.id.toString(),
        name: username,
        posting_json_metadata: account.posting_json_metadata,
        profile
      };

    } catch (error) {
      return null;
    }
  }

  async getUserPosts(username: string, limit = 20): Promise<any[]> {
    try {
      const startPermlink = '';
      const beforeDate = new Date().toISOString().split('.')[0];

      const posts = await this.client.database.call(
        'get_discussions_by_author_before_date',
        [username, startPermlink, beforeDate, limit]
      );

      const validPosts = posts.filter((post: any) => {
        try {
          const metadata = JSON.parse(post.json_metadata);
          return metadata && (metadata.image || metadata.images);
        } catch (e) {
          return false;
        }
      });

      return validPosts;

    } catch (error) {
      return [];
    }
  }
}


export async function getPostsByAuthor(author: string, permlink?: string): Promise<Discussion[]> {
  try {
    if (permlink) {
      const post = await client.database.call('get_content', [author, permlink]);
      return [post as Discussion];
    }

    // Todos os posts da conta, paginados. Antes vinham só os 20 mais
    // recentes: cada projeto migrado do Cargo empurrava um antigo para fora
    // da grade.
    return (await getAllPostsByBlog(author)) as Discussion[];
  } catch (error) {
    return [];
  }
}

export async function getPostsByPermlink(author: string, permlink: string) {
  try {
    const response = await fetch('https://api.hive.blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_content',
        params: [author, permlink],
        id: 1
      })
    });

    const data = await response.json();
    const post = data.result;

    if (!post?.body) return [];

    let jsonMetadata;
    try {
      jsonMetadata = JSON.parse(post.json_metadata);
    } catch (e) {
    }

    const imageUrls = new Set<string>();

    if (jsonMetadata?.image?.length) {
      jsonMetadata.image.forEach((img: string) => imageUrls.add(img));
    }

    const bodyText = post.body;

    const patterns = [
      /!\[.*?\]\((https?:\/\/[^)]+)\)/g,  // Markdown
      /<img[^>]+src=["'](https?:\/\/[^"']+)["']/g,  // HTML
      /https?:\/\/[^\s<>"']+?\.(?:jpg|jpeg|gif|png|webp)/g,  // URLs diretas
      /https?:\/\/ipfs\.skatehive\.app\/ipfs\/[a-zA-Z0-9]+/g  // IPFS específico
    ];

    patterns.forEach(pattern => {
      const matches = bodyText.matchAll(pattern);
      for (const match of matches) {
        const url = match[1] || match[0];
        imageUrls.add(url);
      }
    });

    const medias = Array.from(imageUrls).map(url => {
      const ipfsHash = url.includes('ipfs/') ? url.split('ipfs/').pop() : url;
      return {
        ipfsHash,
        title: post.title,
        author: post.author
      };
    });

    return medias;

  } catch (error) {
    return [];
  }
}

export async function getPost(author: string, permlink: string): Promise<Discussion | null> {
  try {
    const post = await client.database.call('get_content', [author, permlink]);

    if (!post || !post.body) {
      return null;
    }

    return post as Discussion;
  } catch (error) {
    return null;
  }
}

export function extractMedia(body: string) {
  const images = extractImages(body);
  const videos = extractVideos(body);
  return { images, videos };
}

function extractImages(body: string): string[] {
  const patterns = [
    /https?:\/\/[^\s<>"']+?\.(?:jpg|jpeg|gif|png|webp)(?:\?[^\s<>"']*)?/gi,
    /!\[.*?\]\((.*?)\)/g,
    /<img.*?src=["'](.*?)["']/g
  ];

  const images = new Set<string>();
  let match;

  patterns.forEach(pattern => {
    while ((match = pattern.exec(body)) !== null) {
      try {
        const url = match[1] || match[0];
        if (url.match(/\.(jpg|jpeg|gif|png|webp)(\?.*)?$/i)) {
          images.add(url);
        }
      } catch (e) {
      }
    }
  });

  return Array.from(images);
}

function extractVideos(body: string): string[] {
  const patterns = [
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g,
    /https?:\/\/(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]+)/g,
    /https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/g
  ];

  const videoIds = new Set<string>();

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      videoIds.add(match[1]);
    }
  });

  return Array.from(videoIds);
}
