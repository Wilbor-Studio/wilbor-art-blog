import { getHivePosts, extractAndCountTags } from '@/lib/hive/project-logic';
import PhotosEmptyState from '@/photo/PhotosEmptyState';
import { Photo } from '@/photo/components/types';
import ProjectsOnePageClient from './ProjectsOnePageClient';
import { Metadata } from 'next/types';
import { createMetadata } from '@/utility/metadata';
import { fetchPostPreview } from '@/lib/hive/site-content';

export const dynamic = 'force-dynamic';

const DEFAULT_DESCRIPTION = 'Explore as exposições e exibições de Wilson Domingues "Wilbor", artista multifacetado que une skate, arte e audiovisual.';

/**
 * Link de um projeto (/projects?project=…, o que o botão de compartilhar
 * gera): a prévia mostra o título e a imagem do projeto. Sem projeto, a
 * prévia padrão da página.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}): Promise<Metadata> {
  const { project } = await searchParams;
  const permlink = typeof project === 'string' ? project : undefined;
  const preview = permlink ? await fetchPostPreview(permlink) : null;
  if (preview) {
    return createMetadata({
      title: preview.title,
      description: preview.description || DEFAULT_DESCRIPTION,
      ...preview.image && { imageUrl: preview.image },
      path: `/projects?project=${encodeURIComponent(permlink!)}`,
    });
  }
  return createMetadata({
    title: 'Projetos',
    description: DEFAULT_DESCRIPTION,
    path: '/projects'
  });
}

export default async function GridPage(props: any) {
  const username = process.env.NEXT_PUBLIC_HIVE_USERNAME;

  if (!username) {
    console.error('Username not defined');
    return <PhotosEmptyState />;
  }

  const { formattedPosts, originalPosts } = await getHivePosts(username);

  const posts = formattedPosts.map(post => {
    return {
      ...post,
      type: post.src?.includes('ipfs.skatehive.app/ipfs/')
        ? 'iframe'
        : post.type
    } as Photo;
  });

  const postTags = extractAndCountTags(originalPosts, posts);
  const photosCount = formattedPosts.length;

  const projectsProps = {
    posts,
    tags: postTags,
    photosCount,
    cameras: [],
    simulations: [],
  };

  return (
    <ProjectsOnePageClient projectsProps={projectsProps} />
  );
}
