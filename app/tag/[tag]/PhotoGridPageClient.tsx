"use client";
import PhotoGridPage from '@/photo/PhotoGridPage';
import { useState } from 'react';
import { Photo } from '@/photo/components/types';

export default function PhotoGridPageClient({
  photos,
  photosCount,
  tags,
  cameras,
  simulations,
}: {
  photos: Photo[];
  photosCount: number;
  tags: { tag: string; count: number }[];
  cameras: any[];
  simulations: any[];
}) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  return (
    <PhotoGridPage
      photos={photos}
      photosCount={photosCount}
      selectedTags={selectedTags}
      setSelectedTags={setSelectedTags}
    />
  );
}
