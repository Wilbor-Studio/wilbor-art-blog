import { Client } from '@hiveio/dhive';

const HIVE_NODES = [
  'https://api.openhive.network',
  'https://rpc.ecency.com',
  'https://hived.emre.sh',
  'https://api.hive.blog',
  'https://api.hivekings.com'
];

const TIMEOUT = 5000; // 5 seconds timeout

async function fetchWithTimeout(url: string, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

let workingClient: Client | null = null;

async function testNode(client: Client): Promise<boolean> {
  try {
    const startTime = Date.now();
    
   // Quick connection test
    const props = await Promise.race([
      client.database.getDynamicGlobalProperties(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT)
      )
    ]);

   // If it took too long, consider it a failure
    if (Date.now() - startTime > TIMEOUT) {
      console.warn('Node very slow');
      return false;
    }

    // Test the posts functionality
    const testResult = await Promise.race([
      client.database.getDiscussions('blog', {
        tag: 'hive',
        limit: 1
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), TIMEOUT)
      )
    ]);

    return Array.isArray(testResult) && testResult.length > 0;
  } catch (error) {
    console.warn('Node test failed:', 
      error instanceof Error ? error.message : 'Unknown error'
    );
    return false;
  }
}

export async function createWorkingClient(): Promise<Client> {
  if (workingClient) {
    try {
      const isWorking = await testNode(workingClient);
      if (isWorking) {
        return workingClient;
      }
    } catch {
      workingClient = null;
    }
  }

// Shuffle the list of nodes to distribute the load
  const shuffledNodes = [...HIVE_NODES].sort(() => Math.random() - 0.5);

  for (const node of shuffledNodes) {
    try {
      console.log(`Trying to connect to node: ${node}`);
      const client = new Client(node, { timeout: TIMEOUT });
      
      const isWorking = await testNode(client);
      if (isWorking) {
        console.log(`✅  ${node} is working correctly`);
        workingClient = client;
        return client;
      }
      console.warn(`❌  ${node} failed tests`);
    } catch (error) {
      console.warn(
        `❌ Failed to connect to ${node}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
  
  throw new Error('Unable to find a working Hive node after trying all nodes');
}

export async function getPostsByAuthor(username: string) {
  const client = await createWorkingClient();
  try {
    const posts = await client.database.getDiscussions('blog', {
      tag: username,
    limit: 100,
    });
    return posts;
  } catch (error) {
    console.error('Error fetching posts:', 
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}

export async function getPostsByBlog(username: string, limit = 20) {
  try {
    const response = await fetchWithTimeout('https://api.hive.blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_discussions_by_blog',
        params: [{ tag: username, limit }],
        id: 1,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error('Error fetching posts by blog:', 
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}

export async function getUserAccount(username: string) {
  try {
    const response = await fetchWithTimeout('https://api.hive.blog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'condenser_api.get_accounts',
        params: [[username]],
        id: 1,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.result && data.result.length > 0 ? data.result[0] : null;
  } catch (error) {
    console.error('Error fetching user account:', 
      error instanceof Error ? error.message : 'Unknown error'
    );
    return null;
  }
}
const BLOG_PAGE_SIZE = 20; // máximo que a API aceita por chamada
const BLOG_MAX_PAGES = 10;
const BLOG_CACHE_MS = 60_000;
const blogCache = new Map<string, { at: number; promise: Promise<any[]> }>();

/**
 * Todos os posts publicados pela conta, paginando de 20 em 20 (até 200).
 *
 * As seções de texto (Sobre, Exposições, Parceiros, rodapé, contato) acham
 * o próprio post pelo título. Dois problemas fizeram seções sumirem:
 *
 * - só a primeira página era lida, então um post antigo saía da lista
 *   assim que a conta publicava projetos novos;
 * - o feed antigo (condenser get_discussions_by_blog) perde entradas: o
 *   post do Sobre existe e não está oculto, mas não aparece nele.
 *
 * Por isso a busca usa bridge.get_account_posts (sort 'posts': só posts da
 * própria conta, sem reblogs). O formato é normalizado para o do feed
 * antigo, que o resto do código espera: json_metadata como texto.
 *
 * O resultado fica em cache por um minuto: as cinco seções da página fazem
 * uma busca só, em vez de uma cada.
 */
export function getAllPostsByBlog(username: string): Promise<any[]> {
  const cached = blogCache.get(username);
  if (cached && Date.now() - cached.at < BLOG_CACHE_MS) return cached.promise;

  const promise = (async () => {
    const byPermlink = new Map<string, any>();
    let start: { start_author: string; start_permlink: string } | null = null;

    for (let page = 0; page < BLOG_MAX_PAGES; page++) {
      const response = await fetchWithTimeout('https://api.hive.blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'bridge.get_account_posts',
          params: {
            sort: 'posts',
            account: username,
            limit: BLOG_PAGE_SIZE,
            ...start,
          },
          id: 1,
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'Erro na API do Hive');
      const batch: any[] = data.result || [];

      for (const post of batch) {
        if (byPermlink.has(post.permlink)) continue;
        byPermlink.set(post.permlink, {
          ...post,
          json_metadata: typeof post.json_metadata === 'string'
            ? post.json_metadata
            : JSON.stringify(post.json_metadata ?? {}),
        });
      }

      if (batch.length < BLOG_PAGE_SIZE) break;
      const last = batch[batch.length - 1];
      start = { start_author: last.author, start_permlink: last.permlink };
    }

    return Array.from(byPermlink.values());
  })();

  // Falha não fica em cache: a próxima seção tenta de novo.
  promise.catch(() => blogCache.delete(username));
  blogCache.set(username, { at: Date.now(), promise });
  return promise;
}
