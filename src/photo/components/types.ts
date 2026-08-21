import { JSX } from "react";

export interface HiveMetadata {
  author: string;
  permlink: string;
  body: string;
  json_metadata?: string;
}

export  interface Photo {
  cameraKey?: string;
  camera?: any;
  simulation?: any;
  id: string;
  url: string;
  src: string;
  title: string;
  type: 'photo' | 'video' | 'iframe';
  thumbnailSrc?: string;
  videoUrl?: string;
  width: number;
  height: number;
  blurData: string;
  tags: string[];
  takenAt: Date;
  takenAtNaive: string;
  takenAtNaiveFormatted: string;
  updatedAt: Date;
  createdAt: Date;
  aspectRatio: number;
  priority: boolean;
  extension: string;
  focalLengthFormatted?: string;
  focalLengthIn35MmFormatFormatted?: string;
  fNumberFormatted?: string;
  isoFormatted?: string;
  exposureTimeFormatted?: string;
  exposureCompensationFormatted?: string;
  hiveMetadata?: HiveMetadata;
  author?: string;
  permlink?: string;
  iframeHtml?: string;
  /** Marcado com a tag 'hidden': fora da grade para o público. */
  isHidden?: boolean;
  /** Marcado com a tag 'destaque': aparece antes dos demais. */
  isFeatured?: boolean;
}

export interface Media {
  id: string;
  url: string;
  src: string;
  title: string;
  type: 'photo' | 'video' | 'iframe';
  thumbnailSrc?: string;
  width?: number;
  videoUrl?: string;
  height?: number;
  iframeHtml?: string;
  tags?: string[];
  isHidden?: boolean;
  isFeatured?: boolean;
  // Adicionando hiveMetadata
  hiveMetadata?: {
    author: string;
    permlink: string;
    body: string;
    json_metadata?: string;
  };
}

export interface PhotoGridContainerProps {
  cacheKey: string;
  media: Media[];
  sidebar?: JSX.Element;
  canSelect?: boolean;
  header?: JSX.Element;
  animateOnFirstLoadOnly?: boolean;
}