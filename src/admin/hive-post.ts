import type { Operation } from '@hiveio/dhive';
import { sendHiveOperation } from '../../lib/hive/server-functions';

export const PINATA_GATEWAY = 'https://ipfs.skatehive.app/ipfs';

export function buildPinataUrl(hash: string) {
  return `${PINATA_GATEWAY}/${hash}`;
}

/**
 * Envia o arquivo pela rota do servidor, que fala com o Pinata.
 * Assim as credenciais do Pinata não vão para o bundle do navegador.
 */
export async function uploadMediaToIpfs(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/ipfs/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let message = 'Falha ao enviar mídia para o IPFS.';
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      // resposta sem JSON — mantém a mensagem padrão
    }
    throw new Error(message);
  }

  const data = await response.json();
  if (!data?.IpfsHash) {
    throw new Error('Resposta do IPFS sem hash.');
  }

  return buildPinataUrl(data.IpfsHash);
}

export function createPermlink(title: string) {
  const base = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  const dateString = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${base || 'post'}-${dateString}`;
}

export function normalizeTags(tags: string[]) {
  const cleaned = tags.map(tag => tag.trim().toLowerCase()).filter(Boolean);
  return Array.from(new Set(cleaned));
}

/** Remove do markdown a linha que referencia uma URL de mídia específica. */
export function removeUrlFromMarkdown(markdown: string, url: string) {
  if (!markdown || !url) return markdown;
  const baseUrl = url.split('?')[0].split('#')[0];
  const escapedBase = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const imagePattern = new RegExp(`!\\[[^\\]]*\\]\\(${escapedBase}[^)]*\\)`);
  const videoPattern = new RegExp(`<video[^>]*src=["']${escapedBase}[^"']*["'][^>]*>`, 'i');

  return markdown
    .split('\n')
    .filter(line => !imagePattern.test(line) && !videoPattern.test(line))
    .join('\n')
    .trim();
}

/** Converte URLs soltas de YouTube/Vimeo/vídeo em embeds. */
export function transformExternalMedia(markdown: string) {
  if (!markdown) return markdown;
  const urlLinePattern = /^https?:\/\/[^\s]+$/i;
  const youtubePattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/i;
  const vimeoPattern = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/i;
  const videoFilePattern = /\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i;

  return markdown
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.includes('<iframe') || trimmed.includes('<video')) return line;
      if (trimmed.startsWith('![')) return line;
      if (!urlLinePattern.test(trimmed)) return line;

      const youtubeMatch = trimmed.match(youtubePattern);
      if (youtubeMatch) {
        return `<iframe src="https://www.youtube.com/embed/${youtubeMatch[1]}" allow="autoplay; fullscreen" frameborder="0"></iframe>`;
      }

      const vimeoMatch = trimmed.match(vimeoPattern);
      if (vimeoMatch) {
        return `<iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" allow="autoplay; fullscreen" frameborder="0"></iframe>`;
      }

      if (videoFilePattern.test(trimmed)) {
        return `<video src="${trimmed}" controls></video>`;
      }

      return line;
    })
    .join('\n');
}

export function mediaToMarkdown(entries: { url: string; isVideo: boolean }[]) {
  return entries
    .map(entry => entry.isVideo
      ? `<video src="${entry.url}" controls></video>`
      : `![image](${entry.url})`)
    .join('\n\n');
}

interface KeychainWindow extends Window {
  hive_keychain?: {
    requestBroadcast: (
      username: string,
      operations: Operation[],
      keyType: string,
      callback: (response: { success: boolean; message?: string }) => void,
    ) => void;
  };
}

/**
 * Publica as operações no Hive: usa o Keychain quando disponível e a sessão não
 * guarda chave; caso contrário assina no servidor com a chave cifrada.
 */
export async function broadcastOperations(
  username: string,
  operations: Operation[],
  postingKey?: string | null,
) {
  const keychain = typeof window !== 'undefined'
    ? (window as KeychainWindow).hive_keychain
    : undefined;

  if (keychain && !postingKey) {
    await new Promise<void>((resolve, reject) => {
      keychain.requestBroadcast(username, operations, 'posting', response => {
        if (!response?.success) {
          reject(new Error(response?.message || 'Erro no Hive Keychain.'));
          return;
        }
        resolve();
      });
    });
    return;
  }

  if (postingKey) {
    await sendHiveOperation(postingKey, operations);
    return;
  }

  throw new Error('Sessão sem chave de posting e sem Hive Keychain disponível.');
}

/** Extrai title/body/tags/imagens de um post do Hive para preencher o editor. */
export function readPostForEditor(post: {
  title?: string
  body?: string
  permlink?: string
  author?: string
  json_metadata?: string
}) {
  let tags: string[] = [];
  let images: string[] = [];
  let thumbnail: string | undefined;

  try {
    const metadata = post.json_metadata
      ? (typeof post.json_metadata === 'string'
        ? JSON.parse(post.json_metadata)
        : post.json_metadata)
      : {};
    if (Array.isArray(metadata.tags)) tags = metadata.tags.filter((t: unknown) => typeof t === 'string');
    if (Array.isArray(metadata.image)) images = metadata.image.filter((i: unknown) => typeof i === 'string');
    if (typeof metadata.thumbnail === 'string') thumbnail = metadata.thumbnail;
  } catch {
    // metadata inválido — editor abre só com title/body
  }

  return {
    permlink: post.permlink || '',
    author: post.author || '',
    title: post.title || '',
    content: post.body || '',
    tags,
    images,
    thumbnail,
  };
}
