"use client";
import ViewSwitcher from '@/app/ViewSwitcher';
import PhotoGridPage from '@/photo/PhotoGridPage';
import { useSearchParams } from 'next/navigation';
import { readTagsFromParams, writeTagsToUrl } from '@/utility/tag-filter';
import { useCallback, useEffect, useState } from 'react';

export default function ProjectsClient({
  posts,
  tags,
  photosCount,
  cameras,
  simulations,
  hideSwitcher = false,
  externalSelectedTags,
  onTagsChange,
}: any) {
  const [internalSelectedTags, setInternalSelectedTags] = useState<string[]>([]);
  const searchParams = useSearchParams();

  // Na página principal as tags vêm de fora (ProjectsOnePageClient); sozinho,
  // este componente lê e grava a URL por conta própria.
  const selectedTags: string[] = externalSelectedTags ?? internalSelectedTags;

  useEffect(() => {
    if (externalSelectedTags !== undefined) return;
    const known = new Set(tags.map((t: any) => t.tag));
    setInternalSelectedTags(readTagsFromParams(searchParams).filter(tag => known.has(tag)));
  }, [searchParams, tags, externalSelectedTags]);

  const handleTagsChange = useCallback((next: string[]) => {
    if (onTagsChange) {
      onTagsChange(next);
      return;
    }
    const url = new URL(window.location.href);
    writeTagsToUrl(url, next);
    window.history.pushState({}, '', url.toString());
    setInternalSelectedTags(next);
  }, [onTagsChange]);

  return (
    <>
      {!hideSwitcher && (
        <ViewSwitcher
          drawerTagsProps={{
            tags: tags.map((t: any) => t.tag),
            tagCounts: Object.fromEntries(tags.map((t: any) => [t.tag, t.count])),
            selectedTags,
            setSelectedTags: handleTagsChange,
          }}
        />
      )}
      <PhotoGridPage
        photos={posts}
        photosCount={photosCount}
        selectedTags={selectedTags}
        setSelectedTags={handleTagsChange}
      />
    </>
  );
}
