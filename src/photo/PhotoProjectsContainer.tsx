'use client';

import { IconX } from '@/components/IconX';
import Markdown from '@/components/Markdown';
import ShareTagButton from '@/components/ShareTagButton';
import { MarkdownRenderer } from '@/lib/markdown/MarkdownRenderer';
import '@/styles/slider-custom.css';
import { clsx } from 'clsx/lite';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import 'swiper/css';
import 'swiper/css/pagination';
import { extractImagesFromMarkdown } from './components/markdownUtils';
import { Media, PhotoGridContainerProps } from './components/types';

const formatPinataUrl = (url: string): string => {
    if (!url) return '';
    // Mantém query params (ex: pinataGatewayToken), pois alguns gateways exigem token.
    if (url.includes('pinataGatewayToken')) {
        return url.trim().replace(/['"]+/g, '');
    }
    if (url.includes('images.hive.blog')) {
        return url.trim().replace(/['"]+/g, '');
    }
    return url;
};

function normalizeImageSrc(src?: string | null) {
    return (src || '').trim();
}

function getPostImages(item: Media): string[] {
    const thumbnail = normalizeImageSrc(item.thumbnailSrc);
    const bodyImages = extractImagesFromMarkdown(item.hiveMetadata?.body || '').map(normalizeImageSrc);
    return Array.from(new Set([thumbnail, ...bodyImages].filter(Boolean)));
}

function enhanceMediaWithMetadata(media: Media[]): Media[] {
    return media.map(item => {
        if (!item.hiveMetadata) return item;
        const enhancedItem = { ...item };
        // Priorizar thumbnailSrc se já existir (de qualquer formato válido)
        if (item.thumbnailSrc && (item.thumbnailSrc.startsWith('http') || item.thumbnailSrc.startsWith('/') || item.thumbnailSrc.startsWith('data:'))) {
            enhancedItem.thumbnailSrc = formatPinataUrl(item.thumbnailSrc);
            return enhancedItem;
        }
        // Tentar extrair thumbnail do json_metadata do hiveMetadata
        try {
            if (item.hiveMetadata?.json_metadata) {
                const metadataStr = item.hiveMetadata.json_metadata;
                const parsedMetadata = typeof metadataStr === 'string' ? JSON.parse(metadataStr) : metadataStr;
                // Verificar campos comuns de thumbnail no metadata
                const thumbnailFromMetadata = parsedMetadata?.thumbnail || parsedMetadata?.thumbnailSrc || parsedMetadata?.thumbnail_url;
                if (thumbnailFromMetadata) {
                    enhancedItem.thumbnailSrc = formatPinataUrl(thumbnailFromMetadata);
                } else if (parsedMetadata?.image && Array.isArray(parsedMetadata.image) && parsedMetadata.image.length > 0) {
                    // Fallback para o primeiro item do array image
                    enhancedItem.thumbnailSrc = formatPinataUrl(parsedMetadata.image[0]);
                }
            }
        } catch (error) {
            console.error("Error processing JSON metadata:", error);
        }
        if (!enhancedItem.thumbnailSrc && item.hiveMetadata.body) {
            const images = extractImagesFromMarkdown(item.hiveMetadata.body);
            if (images.length > 0) {
                enhancedItem.thumbnailSrc = images[0];
            }
        }
        if (!enhancedItem.thumbnailSrc && item.url?.includes('images.hive.blog')) {
            enhancedItem.thumbnailSrc = formatPinataUrl(item.url);
        }
        const specificHiveImageURL = 'https://images.hive.blog/DQmTgsmbnbqwmTCkRk54nu9bvkcNFVfa2v83rPQkzq9Mb7q/prt_1313385051.jpg';
        if (!enhancedItem.thumbnailSrc && (
            item.url?.includes('DQmTgsmbnbqwmTCkRk54nu9bvkcNFVfa2v83rPQkzq9Mb7q') ||
            (item.hiveMetadata.body && item.hiveMetadata.body.includes('DQmTgsmbnbqwmTCkRk54nu9bvkcNFVfa2v83rPQkzq9Mb7q'))
        )) {
            enhancedItem.thumbnailSrc = specificHiveImageURL;
        }
        return enhancedItem;
    });
}

function groupMediaByPermlink(media: Media[]): Map<string, Media[]> {
    const enhancedMedia = enhanceMediaWithMetadata(media);
    const mediaGroups = new Map<string, Media[]>();
    const processedUrls = new Set<string>();
    enhancedMedia.forEach(item => {
        if (item.hiveMetadata) {
            const permlink = item.hiveMetadata.permlink;
            if (!mediaGroups.has(permlink)) {
                mediaGroups.set(permlink, []);
            }
            const group = mediaGroups.get(permlink);
            if (group && !processedUrls.has(item.src)) {
                processedUrls.add(item.src);
                group.push(item);
            }
        }
    });
    mediaGroups.forEach((group, permlink) => {
        if (group.length > 0) {
            const mainItem = group[0];
            const extractedMedia = MarkdownRenderer.extractMediaFromHive({
                body: mainItem.hiveMetadata?.body || '',
                author: mainItem.hiveMetadata?.author || '',
                permlink: permlink,
                json_metadata: JSON.stringify({ image: [mainItem.src] })
            });
            extractedMedia.forEach(mediaContent => {
                if (!processedUrls.has(mediaContent.url)) {
                    processedUrls.add(mediaContent.url);
                    group.push({
                        id: `${permlink}-${mediaContent.url}`,
                        url: mediaContent.url,
                        src: mediaContent.url,
                        title: mainItem.title,
                        type: mediaContent.type === 'iframe' ? 'video' : 'photo',
                        iframeHtml: mediaContent.iframeHtml,
                        thumbnailSrc: mainItem.thumbnailSrc,
                        hiveMetadata: mainItem.hiveMetadata
                    });
                }
            });
        }
    });
    return mediaGroups;
}

const SKATEHIVE_URL = 'ipfs.skatehive.app/ipfs';

const MediaItem = ({
    items,
    isExpanded,
    onExpand,
    onContentSizeChange,
    onTagClick,
    hasLargeContent = false,
    isReversedLayout = false,
    shareUrl
}: {
    items: Media[];
    isExpanded: boolean;
    onExpand: () => void;
    onContentSizeChange: (isLarge: boolean) => void;
    onTagClick: (tag: string) => void;
    hasLargeContent?: boolean;
    isReversedLayout?: boolean;
    shareUrl?: string;
}) => {
    const mainItem = items[0];
    const [isHovered, setIsHovered] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const [imageError, setImageError] = useState(false);
    const [showAllTags, setShowAllTags] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const images = getPostImages(mainItem);

    const handleCopyLink = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (shareUrl) {
            try {
                await navigator.clipboard.writeText(shareUrl);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
            } catch (err) {
                console.error('Erro ao copiar link:', err);
            }
        }
    }, [shareUrl]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Bloqueia scroll automático quando vídeo é clicado
    useEffect(() => {
        if (typeof window === 'undefined' || !isExpanded) return;

        let lastScrollY = 0;
        let isVideoInteracting = false;

        const scrollableDiv = contentRef.current?.querySelector('[class*="overflow-y-auto"]') as HTMLElement;
        if (!scrollableDiv) return;

        const videos = scrollableDiv.querySelectorAll('video');

        const handleVideoMouseDown = (e: MouseEvent) => {
            isVideoInteracting = true;
            lastScrollY = window.scrollY;
        };

        const handleVideoMouseUp = () => {
            // Continua bloqueando por um tempo após soltar o mouse
            setTimeout(() => {
                isVideoInteracting = false;
            }, 300);
        };

        const handleWindowScroll = () => {
            if (isVideoInteracting) {
                window.scrollTo(0, lastScrollY);
            }
        };

        videos.forEach(video => {
            video.addEventListener('mousedown', handleVideoMouseDown);
            video.addEventListener('mouseup', handleVideoMouseUp);
        });

        window.addEventListener('scroll', handleWindowScroll, { passive: false });

        return () => {
            videos.forEach(video => {
                video.removeEventListener('mousedown', handleVideoMouseDown);
                video.removeEventListener('mouseup', handleVideoMouseUp);
            });
            window.removeEventListener('scroll', handleWindowScroll);
        };
    }, [isExpanded]);

    // Fecha fullscreen com ESC, navega com setas esquerda/direita e bloqueia scroll de fundo enquanto aberto
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsFullscreen(false);
            }
        };

        if (!isFullscreen) {
            return;
        }

        const { body, documentElement } = document;
        const scrollY = window.scrollY;

        const prevBodyOverflow = body.style.overflow;
        const prevBodyPosition = body.style.position;
        const prevBodyTop = body.style.top;
        const prevBodyLeft = body.style.left;
        const prevBodyRight = body.style.right;
        const prevBodyWidth = body.style.width;
        const prevBodyBackground = body.style.backgroundColor;
        const prevDocBackground = documentElement.style.backgroundColor;
        const prevFullscreenVh = documentElement.style.getPropertyValue('--fullscreen-vh');

        const prevDocOverflow = documentElement.style.overflow;
        const prevDocOverscroll = documentElement.style.overscrollBehavior;
        const prevBodyOverscroll = body.style.overscrollBehavior;

        documentElement.style.overflow = 'hidden';
        documentElement.style.overscrollBehavior = 'none';
        documentElement.style.backgroundColor = '#000';
        body.style.overflow = 'hidden';
        body.style.overscrollBehavior = 'none';
        body.style.backgroundColor = '#000';

        const setViewportHeightVar = () => {
            const visualHeight = window.visualViewport?.height ?? window.innerHeight;
            documentElement.style.setProperty('--fullscreen-vh', `${Math.round(visualHeight)}px`);
        };
        setViewportHeightVar();

        // iOS/Android: fixa o body para impedir scroll de fundo durante fullscreen
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.left = '0';
        body.style.right = '0';
        body.style.width = '100%';

        window.addEventListener('keydown', onKey);
        window.addEventListener('resize', setViewportHeightVar);
        window.visualViewport?.addEventListener('resize', setViewportHeightVar);
        window.visualViewport?.addEventListener('scroll', setViewportHeightVar);

        return () => {
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('resize', setViewportHeightVar);
            window.visualViewport?.removeEventListener('resize', setViewportHeightVar);
            window.visualViewport?.removeEventListener('scroll', setViewportHeightVar);

            documentElement.style.overflow = prevDocOverflow;
            documentElement.style.overscrollBehavior = prevDocOverscroll;
            documentElement.style.backgroundColor = prevDocBackground;
            body.style.overflow = prevBodyOverflow;
            body.style.overscrollBehavior = prevBodyOverscroll;
            body.style.backgroundColor = prevBodyBackground;
            body.style.position = prevBodyPosition;
            body.style.top = prevBodyTop;
            body.style.left = prevBodyLeft;
            body.style.right = prevBodyRight;
            body.style.width = prevBodyWidth;
            if (prevFullscreenVh) {
                documentElement.style.setProperty('--fullscreen-vh', prevFullscreenVh);
            } else {
                documentElement.style.removeProperty('--fullscreen-vh');
            }

            window.scrollTo(0, scrollY);
        }
    }, [isFullscreen, images.length]);
    function getThumbnailUrl(item: Media): string | null {
        try {
            if (item.hiveMetadata) {
                const metadata = item.hiveMetadata as any;
                if (metadata.json_metadata) {
                    try {
                        const parsedMetadata = typeof metadata.json_metadata === 'string'
                            ? JSON.parse(metadata.json_metadata)
                            : metadata.json_metadata;
                        if (parsedMetadata.image && parsedMetadata.image.length > 0) {
                            return parsedMetadata.image[0];
                        }
                    } catch (parseError) {
                        console.error("Error parsing JSON metadata:", parseError);
                    }
                }
            }
            const images = getPostImages(item);
            if (images.length > 0) {
                return images[0];
            }
            return item.src;
        } catch (e) {
            console.error('Error getting thumbnail:', e);
            return item.src;
        }
    }
    async function fetchPostFromHive(author: string, permlink: string): Promise<any> {
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
            if (data && data.result) {
                return data.result;
            }
            return null;
        } catch (error) {
            console.error("Error fetching post data:", error);
            return null;
        }
    }
    const thumbnailUrl = getThumbnailUrl(mainItem);
    const [updatedThumbnail, setUpdatedThumbnail] = useState<string | null>(thumbnailUrl);
    useEffect(() => {
        if (mainItem.hiveMetadata) {
            const { author, permlink } = mainItem.hiveMetadata;
            fetchPostFromHive(author, permlink).then(post => {
                if (post && post.json_metadata) {
                    try {
                        const metadata = typeof post.json_metadata === 'string'
                            ? JSON.parse(post.json_metadata)
                            : post.json_metadata;
                        if (metadata.image && metadata.image.length > 0) {
                            setUpdatedThumbnail(metadata.image[0]);
                        }
                    } catch (e) {
                        console.error("Erro ao analisar o JSON metadata:", e);
                    }
                }
            });
        }
    }, [mainItem.hiveMetadata]);
    useEffect(() => {
        if (isExpanded && mainItem.hiveMetadata?.body) {
            const imageCount = getPostImages(mainItem).length;
            const textLength = mainItem.hiveMetadata.body.length;
            const hasComplexContent = imageCount > 1 || textLength > 300 || (imageCount > 0 && textLength > 200);
            onContentSizeChange(hasComplexContent);
        } else if (isExpanded && mainItem.src?.includes(SKATEHIVE_URL)) {
            onContentSizeChange(true);
        } else {
            onContentSizeChange(false);
        }
    }, [isExpanded, mainItem.hiveMetadata?.body, mainItem.src]);

    const renderMedia = (media: Media, isMainVideo: boolean = false) => {
        if (media.src?.includes(SKATEHIVE_URL)) {
            return (
                <div
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className="flex flex-col h-full"
                >
                    <div className="flex-1 relative" style={isMainVideo ? { paddingTop: '56.25%' } : {}}>
                        <video
                            src={media.src}
                            poster={updatedThumbnail || thumbnailUrl || undefined} // thumbnail como poster
                            className={clsx(
                                "transition-all duration-300 filter grayscale hover:grayscale-0",
                                isMainVideo
                                    ? "absolute top-0 left-0 w-full h-full object-contain"
                                    : "absolute inset-0 w-full h-full object-cover rounded-lg"
                            )}
                            autoPlay={isHovered || (!isMainVideo && isExpanded)}
                            loop={!isMainVideo}
                            muted={!isMainVideo}
                            controls={isMainVideo}
                            playsInline
                            style={{ backgroundColor: 'black' }}
                            onLoadedMetadata={(e) => {
                                const video = e.target as HTMLVideoElement;
                                if (isMainVideo) {
                                    video.volume = 0.2;
                                }
                            }}
                            onMouseEnter={(e) => {
                                const video = e.target as HTMLVideoElement;
                                video.play();
                            }}
                            onMouseLeave={(e) => {
                                const video = e.target as HTMLVideoElement;
                                video.pause();
                            }}
                        />
                    </div>
                    {!isMainVideo && media.title && (
                        <div className="bg-black flex flex-col justify-center px-4 py-3">
                            <p className="text-white text-base font-medium">{media.title}</p>
                        </div>
                    )}
                </div>
            );
        }
        return (
            <div className="flex flex-col h-full">
                <div className="flex-1 relative group">
                    <Image
                        src={updatedThumbnail || thumbnailUrl || media.src || 'https://placehold.co/600x400?text=No+Image'}
                        alt={media.title || ''}
                        fill
                        className="object-cover transition-all duration-300 filter grayscale group-hover:grayscale-0 rounded-lg"
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                        quality={85}
                        unoptimized={true}
                        onError={() => {
                            setImageError(true);
                            if (imageError && media.src) {
                                return media.src;
                            }
                        }}
                    />
                </div>
                {media.title && (
                    <div
                        className={clsx(
                            'bg-white dark:bg-black flex flex-col justify-center items-start px-4 py-6 w-full rounded-b-lg transition-colors duration-100',
                            'group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black'
                        )}

                    >
                        <div className="text-sm font-normal line-clamp-2 text-center !text-gray-500 dark:!text-[#888888] mt-0 mb-1 transition-colors duration-100">
                            {media.title}
                        </div>
                        {media.tags && media.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap justify-start gap-x-2 gap-y-0.5">
                                {media.tags.map(tag => (
                                    <span
                                        key={tag}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onTagClick(tag);
                                        }}
                                        className="text-xs px-1.5 py-0.5 rounded transition-colors duration-100 cursor-pointer hover:underline"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            className={clsx(
                'rounded-lg overflow-hidden h-full group transition-colors duration-100',
                'bg-white text-black dark:bg-black dark:text-white',
                !isExpanded && 'md:border-t-8 md:border-l-8 md:border-r-8 md:border-b-0 md:border-white md:dark:border-black md:hover:bg-black md:hover:text-white md:hover:border-t-black md:hover:border-l-black md:hover:border-r-black md:dark:hover:bg-white md:dark:hover:text-black md:dark:hover:border-t-white md:dark:hover:border-l-white md:dark:hover:border-r-white',
                isExpanded && 'p-0 sm:p-2'
            )}
            onClick={e => {
                if (!isExpanded) onExpand();
            }}
        >
            <div className={clsx(
                'w-full',
                isExpanded && 'transition-all duration-300',
                isExpanded
                    ? 'flex flex-col h-auto'
                    : 'min-h-[200px]'
            )}>
                {!isExpanded && (
                    <>
                        <div className="sm:hidden w-full rounded-lg overflow-hidden">
                            {mainItem.hiveMetadata?.body && updatedThumbnail ? (
                                <div className="flex flex-col h-full w-full">
                                    <div className="relative w-full aspect-square">
                                        <Image
                                            src={updatedThumbnail}
                                            alt={mainItem.title || ''}
                                            fill
                                            className="object-cover filter grayscale group-hover:grayscale-0 rounded-lg"
                                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, 33vw"
                                            style={{ objectFit: 'cover', objectPosition: 'center' }}
                                        />
                                    </div>
                                    <div
                                        className={
                                            clsx(
                                                'bg-white dark:bg-black flex flex-col justify-start items-start w-full rounded-b-lg transition-colors duration-100',
                                                'group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black',
                                                'px-3 py-2', // mobile compact
                                                'sm:px-4 sm:py-6' // desktop mantém espaçamento original
                                            )
                                        }
                                    >
                                        <div className="text-xs font-medium line-clamp-2 text-left !text-gray-500 dark:!text-[#888888] mt-0 mb-0.5 transition-colors duration-100">
                                            {mainItem.title}
                                        </div>
                                        {mainItem.tags && mainItem.tags.length > 0 && (
                                            <div className="mt-0 flex flex-wrap justify-start gap-x-1 gap-y-0.5">
                                                {mainItem.tags.map(tag => (
                                                    <span
                                                        key={tag}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onTagClick(tag);
                                                        }}
                                                        className="text-[10px] px-1 py-0.5 rounded transition-colors duration-100 cursor-pointer hover:underline !text-gray-500 dark:!text-[#777777]"
                                                    >
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 relative group h-full">
                                    {renderMedia(mainItem)}
                                </div>
                            )}
                        </div>
                        <div className="hidden sm:flex flex-row h-full w-full rounded-lg overflow-hidden">
                            {mainItem.hiveMetadata?.body && (
                                <>
                                    {updatedThumbnail ? (
                                        <>
                                            <div className="flex flex-row h-full w-full">
                                                <div className="hidden sm:flex sm:flex-col h-full w-full">
                                                    <div className="flex-1 relative group" style={{ minHeight: '200px' }}>
                                                        <Image
                                                            src={updatedThumbnail}
                                                            alt={mainItem.title || ''}
                                                            fill
                                            className="object-cover filter grayscale group-hover:grayscale-0 rounded-lg"
                                                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                                                            quality={85}
                                                            unoptimized={true}
                                                        />
                                                    </div>
                                                    <div className={
                                                        clsx(
                                                            'bg-white dark:bg-black flex flex-col justify-center px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 transition-colors duration-100 rounded-b-lg',
                                                            'group-hover:bg-black group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black'
                                                        )
                                                    }>
                                                        <div className="text-xs sm:text-sm md:text-base font-medium line-clamp-1 transition-colors duration-100 !text-gray-500 dark:!text-[#888888]">
                                                            {mainItem.title}
                                                        </div>
                                                        {mainItem.tags && mainItem.tags.length > 0 && (
                                                            <div className={clsx(
                                                                'flex flex-wrap gap-1 mt-1',
                                                                showAllTags ? 'max-h-none pb-2' : 'min-h-[24px] max-h-[24px] overflow-hidden'
                                                            )}>
                                                                {(showAllTags ? mainItem.tags : mainItem.tags.slice(0, 3)).map(tag => (
                                                                    <span
                                                                        key={tag}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onTagClick(tag);
                                                                        }}
                                                                        className="text-xs px-1.5 py-0.5 rounded transition-colors duration-100 cursor-pointer hover:underline !text-gray-500 dark:!text-[#777777]"
                                                                    >
                                                                        {tag}
                                                                    </span>
                                                                ))}
                                                                {!showAllTags && mainItem.tags.length > 3 && (
                                                                    <span
                                                                        className="text-xs px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-700"
                                                                        onClick={e => {
                                                                            e.stopPropagation();
                                                                            setShowAllTags(true);
                                                                        }}
                                                                    >
                                                                        +{mainItem.tags.length - 3}
                                                                    </span>
                                                                )}
                                                                {showAllTags && (
                                                                    <span
                                                                        className="text-xs px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-700"
                                                                        onClick={e => {
                                                                            e.stopPropagation();
                                                                            setShowAllTags(false);
                                                                        }}
                                                                    >
                                                                        Menos
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex-1 relative group h-full">
                                            {renderMedia(mainItem)}
                                        </div>
                                    )}
                                </>
                            )}
                            {!mainItem.hiveMetadata?.body && (
                                <div className="flex-1 relative group h-full">
                                    {renderMedia(mainItem)}
                                </div>
                            )}
                        </div>
                    </>
                )}
                {isExpanded && (
                    <div
                        className={clsx(
                            "flex flex-col w-full",
                            hasLargeContent
                                ? "h-auto overflow-visible"
                                : "h-auto overflow-visible"
                        )}
                        ref={contentRef}
                    >
                        <div className="flex items-center px-3 sm:px-6 py-2 sm:py-3">
                            <h2
                                className="flex-1 text-base sm:text-xl md:text-2xl font-bold tracking-wide leading-tight !text-gray-500 dark:!text-[#888888]"
                                style={{ fontFamily: 'IBMPlexMono, monospace' }}
                            >
                                {mainItem.title}
                            </h2>
                            <div className="flex items-center gap-2">
                                {/* Botão de compartilhar/copiar link */}
                                {/* {shareUrl && (
                                    <button
                                        onClick={handleCopyLink}
                                        className="p-1.5 sm:p-2 rounded-full transition-colors flex items-center justify-center focus:outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                        aria-label={linkCopied ? "Link copiado!" : "Copiar link do projeto"}
                                        title={linkCopied ? "Link copiado!" : "Copiar link do projeto"}
                                    >
                                        {linkCopied ? (
                                            <span className="text-xs sm:text-sm text-green-600 dark:text-green-400">✓ Copiado</span>
                                        ) : (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                                className="w-5 h-5 sm:w-6 sm:h-6"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                )} */}
                                {/* Botão de zoom para abrir o post inteiro em destaque central (tela cheia) */}
                                {images.length > 0 && (
                                    <button
                                        onClick={e => {
                                            e.stopPropagation();
                                            setIsFullscreen(true);
                                        }}
                                        className="p-1.5 sm:p-2 bg-transparent border-none shadow-none flex items-center justify-center hover:bg-transparent rounded-full transition-colors"
                                        aria-label="Abrir em tela cheia"
                                        title="Abrir em tela cheia"
                                    >
                                        <Image
                                            src="/wilborPhotos/Full-Screen-Icon-Wilbor-site.png"
                                            alt="Abrir em tela cheia"
                                            width={28}
                                            height={28}
                                            style={{ display: 'inline-block' }}
                                        />
                                    </button>
                                )}
                                <button
                                    onClick={e => { e.stopPropagation(); onExpand(); }}
                                    className="p-1.5 sm:p-2 bg-transparent border-none shadow-none rounded-full transition-colors flex items-center justify-center focus:outline-none hover:bg-transparent"
                                    aria-label="Fechar"
                                >
                                    <IconX size={35} />
                                </button>
                            </div>
                        </div>
                        <div
                            className={clsx(
                                "flex flex-col items-start w-full bg-white dark:bg-black",
                                "flex-1 overflow-visible"
                            )}
                            style={{
                                position: 'relative',
                                transform: 'translateZ(0)'
                            }}
                        >
                            {images.length > 0 && (
                                <div className="w-full max-w-none text-left" style={{ margin: 0, padding: 0 }}>
                                    <Markdown videoPoster={updatedThumbnail || thumbnailUrl || undefined} inExpandedCard={true} hasLittleContent={!hasLargeContent}>
                                        {mainItem.hiveMetadata?.body ?? ''}
                                    </Markdown>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>
            {/* Modal fullscreen renderizado via Portal fora do card: foca no post inteiro com destaque central */}
            {mounted && isFullscreen && typeof window !== 'undefined' && createPortal(
                <div
                    className="fixed top-0 left-0 right-0 z-[9999] flex justify-center overflow-y-auto overscroll-contain"
                    onClick={() => setIsFullscreen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        width: '100vw',
                        height: 'var(--fullscreen-vh, 100svh)',
                        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                    }}
                >
                    {/* Botão de fechar no topo direito */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsFullscreen(false);
                        }}
                        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-[10000] bg-transparent border-none shadow-none rounded-full transition-colors p-1 sm:p-2 flex items-center justify-center focus:outline-none"
                        aria-label="Fechar fullscreen"
                        style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                    >
                        <IconX size={35} />
                    </button>

                    {/* Card do post centralizado e destacado */}
                    <div
                        className="relative z-[1] my-6 sm:my-12 w-full max-w-3xl lg:max-w-4xl bg-white dark:bg-black rounded-lg shadow-2xl overflow-hidden self-start"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center px-4 sm:px-6 py-3 sm:py-4">
                            <h2
                                className="flex-1 text-base sm:text-xl md:text-2xl font-bold tracking-wide leading-tight !text-gray-500 dark:!text-[#888888]"
                                style={{ fontFamily: 'IBMPlexMono, monospace' }}
                            >
                                {mainItem.title}
                            </h2>
                        </div>
                        <div className="w-full text-left" style={{ margin: 0, padding: 0 }}>
                            <Markdown videoPoster={updatedThumbnail || thumbnailUrl || undefined} inExpandedCard={true} hasLittleContent={!hasLargeContent}>
                                {mainItem.hiveMetadata?.body ?? ''}
                            </Markdown>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};


export default function PhotoGridContainer({
    sidebar,
    media = [],
    header,
    selectedTag,
    setSelectedTag,
    ...props
}: PhotoGridContainerProps & {
    selectedTag: string | null;
    setSelectedTag: (tag: string | null) => void;
}) {
    const [expandedPermlinks, setExpandedPermlinks] = useState<string[]>([]);
    const [hasLargeContentMap, setHasLargeContentMap] = useState<Record<string, boolean>>({});
    const groupedMedia = groupMediaByPermlink(media);
    const allTags = Array.from(new Set(media.flatMap(item => item.tags || [])));
    const mediaGroups = Array.from(groupedMedia.entries())
        .filter(([_, group]) => {
            if (!selectedTag) return true;
            return group[0].tags?.includes(selectedTag);
        })
        .map(([permlink, group]) => ({
            permlink,
            group,
            mainItem: group[0]
        }));

    // Detectar projeto na URL ao carregar a página (apenas uma vez)
    const hasInitializedFromUrl = useRef(false);
    useEffect(() => {
        if (typeof window === 'undefined' || hasInitializedFromUrl.current) return;

        const urlParams = new URLSearchParams(window.location.search);
        const projectParam = urlParams.get('project');

        if (projectParam && mediaGroups.length > 0) {
            // Verificar se o permlink existe nos mediaGroups
            const permlinks = new Set(mediaGroups.map(({ permlink }) => permlink));
            if (permlinks.has(projectParam)) {
                // Marcar como inicializado para evitar loops
                hasInitializedFromUrl.current = true;
                // Expandir o card correspondente
                setExpandedPermlinks([projectParam]);
                // Scroll para o card após um pequeno delay para garantir que o DOM foi atualizado
                setTimeout(() => {
                    const ref = cardRefs.current[projectParam];
                    if (ref) {
                        // Offset considerando altura do header (90px desktop, 64px mobile) + espaço extra
                        const headerHeight = window.innerWidth >= 768 ? 90 : 64;
                        const yOffset = -(headerHeight + 20); // Header + 20px de espaço extra
                        const y = ref.getBoundingClientRect().top + window.pageYOffset + yOffset;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                }, 300);
            }
        }
    }, [mediaGroups.length]); // Executa apenas quando os mediaGroups forem carregados
    const handleTagClick = useCallback((tag: string) => {
        // Se clicar na mesma tag, desmarca. Caso contrário, seleciona a nova tag
        const newSelectedTag = selectedTag === tag ? null : tag;

        // Atualiza a URL
        const url = new URL(window.location.href);
        if (newSelectedTag) {
            url.searchParams.set('tag', newSelectedTag);
        } else {
            url.searchParams.delete('tag');
        }
        // Remove o parâmetro project quando filtrar por tag
        url.searchParams.delete('project');
        window.history.pushState({}, '', url);

        setSelectedTag(newSelectedTag);

        // Fecha todos os cards expandidos
        setExpandedPermlinks([]);
    }, [selectedTag, setSelectedTag]);

    // Permite que o header (logo) feche o card expandido
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handler = () => {
            setExpandedPermlinks([]);
            const url = new URL(window.location.href);
            url.searchParams.delete('project');
            window.history.pushState({}, '', url.toString());
        };

        window.addEventListener('wilbor:close-expanded-project', handler as EventListener);
        return () => window.removeEventListener('wilbor:close-expanded-project', handler as EventListener);
    }, []);

    // Função para atualizar URL quando expandir/colapsar card
    const updateUrlForProject = useCallback((permlink: string | null) => {
        if (typeof window === 'undefined') return;

        const url = new URL(window.location.href);
        if (permlink) {
            url.searchParams.set('project', permlink);
        } else {
            url.searchParams.delete('project');
        }
        window.history.pushState({}, '', url.toString());
    }, []);

    // Função para gerar URL compartilhável do projeto
    const getProjectShareUrl = useCallback((permlink: string) => {
        if (typeof window === 'undefined') return '';
        const url = new URL(window.location.origin + window.location.pathname);
        if (selectedTag) {
            url.searchParams.set('tag', selectedTag);
        }
        url.searchParams.set('project', permlink);
        return url.toString();
    }, [selectedTag]);
    const handleContentSizeChange = (permlink: string, isLarge: boolean) => {
        setHasLargeContentMap(prev => ({ ...prev, [permlink]: isLarge }));
    };
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (expandedPermlinks.length === 1) {
            const permlink = expandedPermlinks[0];
            const ref = cardRefs.current[permlink];
            if (ref) {
                setTimeout(() => {
                    // Offset considerando altura do header (90px desktop, 64px mobile) + espaço extra
                    const headerHeight = window.innerWidth >= 768 ? 90 : 64;
                    const yOffset = -(headerHeight + 20); // Header + 20px de espaço extra
                    const y = ref.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }, 150);
            }
        }
    }, [expandedPermlinks]);
    return (
        <div className="w-full bg-white dark:bg-neutral-950">
            <div className={clsx(
                'max-w-[2000px] mx-auto px-3.5 sm:px-6 md:px-8',
                header ? 'mb-5 sm:mb-5' : 'mb-2',
                'bg-white dark:bg-neutral-950'
            )}>
                {header}

                {/* Barra de filtro ativo por tag */}
                {selectedTag && (
                    <div className="flex items-center gap-3 flex-wrap mb-6">
                        <span className="font-mono text-xs uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                            Filtrando por
                        </span>
                        <button
                            onClick={() => handleTagClick(selectedTag)}
                            className="inline-flex items-center gap-2 min-h-[40px] px-4 rounded-full font-mono text-sm bg-neutral-900 text-white dark:bg-white dark:text-black border border-neutral-900 dark:border-white hover:opacity-90 active:scale-[0.98] transition-all duration-150 touch-manipulation"
                            aria-label={`Remover filtro ${selectedTag}`}
                            title={`Remover filtro ${selectedTag}`}
                        >
                            #{selectedTag}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <span className="font-mono text-xs text-gray-500 dark:text-zinc-500">
                            {mediaGroups.length === 1 ? '1 projeto' : `${mediaGroups.length} projetos`}
                        </span>
                        {/* Compartilhar/copiar link do portfólio filtrado com um cliente */}
                        <ShareTagButton tag={selectedTag} compact className="sm:ml-auto" />
                    </div>
                )}

                <div className={clsx(
                    'grid',
                    'gap-y-8 sm:gap-y-6 gap-x-2 sm:gap-x-4 md:gap-5',
                    'grid-cols-2 sm:grid-cols-2 md:grid-cols-3',
                    'lg:grid-cols-4 xl:grid-cols-4',
                    'grid-flow-dense',
                    'pt-0 mt-0',
                    expandedPermlinks.length > 0 ? 'auto-rows-auto' : 'auto-rows-fr',
                    'bg-white dark:bg-neutral-950'
                )}>
                    {mediaGroups.map(({ permlink, group }, idx) => {
                        const isExpanded = expandedPermlinks.includes(permlink);
                        const isOdd = idx % 2 === 1;
                        return (
	                            <div
	                                key={permlink}
	                                ref={el => { cardRefs.current[permlink] = el; }}
		                                className={clsx(
	                            'relative overflow-hidden w-full',
	                            'transition-all duration-300',
	                            'rounded-lg',
	                            'bg-transparent',
                                    'focus:outline-none',
	                                    !isExpanded && 'shadow-sm',

	                                    isExpanded
	                                        ? (
                                            hasLargeContentMap[permlink]
                                                ? 'col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2 row-span-6 sm:row-span-7 md:row-span-8'
                                                : 'col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-2 row-span-4 sm:row-span-5 md:row-span-6'
                                        )
                                        : 'w-full',
	                                )}
                                        style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
		                                aria-label={`Projeto ${group[0]?.title || ''}`}
		                            >
                                <MediaItem
                                    items={group}
                                    isExpanded={isExpanded}
                                    onExpand={() => {
                                        const newExpanded = expandedPermlinks.includes(permlink) ? [] : [permlink];
                                        setExpandedPermlinks(newExpanded);
                                        // Atualizar URL
                                        updateUrlForProject(newExpanded.length > 0 ? permlink : null);
                                    }}
                                    onContentSizeChange={function onSizeChange(isLarge) {
                                        handleContentSizeChange(permlink, isLarge);
                                    }}
                                    onTagClick={handleTagClick}
                                    hasLargeContent={!!hasLargeContentMap[permlink]}
                                    isReversedLayout={isOdd}
                                    shareUrl={isExpanded ? getProjectShareUrl(permlink) : undefined}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
            {sidebar && (
                <div className="hidden md:block">
                    {sidebar}
                </div>
            )}
        </div>
    );
}
