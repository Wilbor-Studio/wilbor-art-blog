'use client';
import { getPostsByBlog, getUserAccount } from '@/../lib/hive/hive-client';
import EditPostButton, { SECTION_EDIT_CLASS } from '@/admin/EditPostButton';
import Markdown from '@/components/Markdown';
import { useEffect, useState } from 'react';

const CONTACT_KEYWORDS = [
  'contato',
  'contact',
  'fale conosco',
  'get in touch',
  'email',
  'telefone',
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

function useDynamicContactPost(username: string) {
  const [post, setPost] = useState<HivePost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const userAccount = await getUserAccount(username);
        if (!userAccount) {
          setError(`Usuário '${username}' não encontrado no Hive.`);
          setLoading(false);
          return;
        }
        const allPosts = await getPostsByBlog(username);
        const matchingPost = allPosts.find((post: any) =>
          post.title && CONTACT_KEYWORDS.some(keyword =>
            post.title.toLowerCase().includes(keyword.toLowerCase()),
          ),
        );
        if (matchingPost) {
          setPost(matchingPost);
        } else {
          setError('Nenhum post de contato encontrado.');
        }
      } catch {
        setError('Erro ao buscar post de contato.');
      }
      setLoading(false);
    })();
  }, [username]);
  return { post, loading, error };
}

// Função para inserir <br> entre links, se estiverem juntos
function formatContactBody(body: string) {
  // Regex para links Markdown: [texto](url)
  return body
    .replace(/(\]\([^)]*\))\s+/g, '$1<br>')
    .replace(/<br>\s*/g, '<br>');
}

// Componente de conteúdo de contato (sem ViewSwitcher)
export default function ContactContent() {
  const {
    post,
    loading,
    error,
  } = useDynamicContactPost(process.env.NEXT_PUBLIC_HIVE_USERNAME || '');

  return (
    <div className="w-full px-4 sm:px-8 pt-2 md:px-12 py-8 dark:text-gray-200">
      <div className="max-w-4xl w-full space-y-2 sm:space-y-3 mx-auto">
        {!loading && !error && post && (
          <article className="mb-6 p-3 text-center">
            <Markdown className="markdown-contact text-center" columns>
              {formatContactBody(post.body)}
            </Markdown>
            <div className="mt-2 flex justify-center">
              <EditPostButton
                post={post}
                label="editar contato"
                stopPropagation={false}
                className={SECTION_EDIT_CLASS}
              />
            </div>
          </article>
        )}
        {loading && <div className="text-center">Carregando...</div>}
        {error && <div className="text-red-500 text-center">{error}</div>}
      </div>
    </div>
  );
}
