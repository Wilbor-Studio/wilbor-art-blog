'use client';

import PhotoGridContainer from './PhotoProjectsContainer';
import { Photo } from './components/types';

const PATH_GRID_INFERRED = 'projects';

export default function PhotoGridPage({
  photos,
  photosCount,
  selectedTags,
  setSelectedTags
}: {
  photos: Photo[]
  photosCount: number
  selectedTags: string[]
  setSelectedTags: (tags: string[]) => void
}) {
  return (
    <PhotoGridContainer
      cacheKey={`page-${PATH_GRID_INFERRED}`}
      media={photos.map(photo => ({
        ...photo,
        type: photo.type === 'video' ? 'video' : 'photo',
        thumbnailSrc: photo.thumbnailSrc, // Preservar thumbnailSrc para todos os tipos, não apenas vídeos
        videoUrl: photo.type === 'video' ? photo.src : undefined
      }))}
      sidebar={undefined}
      canSelect
      selectedTags={selectedTags}
      setSelectedTags={setSelectedTags}
    />
  );
}