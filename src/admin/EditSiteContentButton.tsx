'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SECTION_EDIT_CLASS } from './EditPostButton';
import { useHiveAuth } from './HiveAuthProvider';
import HivePostEditor from './HivePostEditor';

/**
 * Edita um trecho do site que não é um post comum — o resumo da seção
 * "sobre", por exemplo.
 *
 * Esse conteúdo mora num post do Hive com permlink fixo. Se o post ainda não
 * existir, o editor abre no modo criar já preenchido com o texto que está no
 * código, então o artista parte do que já está publicado em vez de uma folha
 * em branco. Publicar pela primeira vez é o que cria o post.
 */
export default function EditSiteContentButton({
  permlink,
  title,
  currentMarkdown,
  fallbackMarkdown,
  tags = ['site'],
  label = 'editar',
  onSaved,
}: {
  permlink: string
  /** Título do post no Hive; não aparece no site. */
  title: string
  /** Conteúdo publicado hoje, quando o post já existe. */
  currentMarkdown?: string | null
  /** Texto embutido no código, usado quando o post ainda não existe. */
  fallbackMarkdown: string
  tags?: string[]
  label?: string
  onSaved?: () => void
}) {
  const { isAdmin, isReady } = useHiveAuth();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  if (!isReady || !isAdmin) return null;

  const exists = Boolean(currentMarkdown?.trim());

  return (
    <>
      <button
        type="button"
        className={`border-0 bg-transparent shadow-none ${SECTION_EDIT_CLASS}`}
        onClick={() => setIsOpen(true)}
      >
        <svg
          className="h-3 w-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z"
          />
        </svg>
        {label}
      </button>

      {isOpen && (
        <HivePostEditor
          mode={exists ? 'edit' : 'create'}
          permlink={permlink}
          initialTitle={title}
          initialContent={currentMarkdown || fallbackMarkdown}
          initialTags={tags}
          onClose={() => setIsOpen(false)}
          onSaved={() => {
            onSaved?.();
            setTimeout(() => router.refresh(), 3000);
          }}
        />
      )}
    </>
  );
}
