import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import ImageCarousel from './ImageCarousel';

interface MarkdownProps {
    children: string;
    className?: string;
    removeMedia?: boolean;
    images?: { src: string; alt?: string; }[];
    videoPoster?: string; // thumbnail para vídeos
    columns?: boolean;
    inExpandedCard?: boolean;
    hasLittleContent?: boolean;
}

const EXHIBITION_DATE_PATTERN = /^(\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{4}|\d{4}(?:\s*[–-]\s*\d{4})?)$/;

function removeImagesAndVideosFromMarkdown(markdown: string): string {
    let result = markdown.replace(/!\[[^\]]*\]\([^\)]+\)/g, '');
    result = result.replace(/<video[\s\S]*?<\/video>/gi, '');
    result = result.replace(/<iframe[\s\S]*?<\/iframe>/gi, '');
    return result;
}

function normalizeMarkdownFormatting(markdown: string): string {
    return markdown
        .replace(/\r\n/g, '\n')
        .replace(/＊/g, '*')
        .replace(/\\<\s*br\s*\/?>/gi, '<br>')
        .split('\n')
        .map((line) =>
            line
                .replace(/\\\*\\\*([^*]+?)\\\*\\\*/g, '**$1**')
                .replace(/\\\*([^*]+?)\\\*/g, '*$1*')
                .replace(/\\_\\_([^_]+?)\\_\\_/g, '__$1__')
                .replace(/\\_([^_]+?)\\_/g, '_$1_')
                .replace(/\\~\\~([^~]+?)\\~\\~/g, '~~$1~~')
                .replace(/\\`([^`]+?)\\`/g, '`$1`')
        )
        .join('\n')
        // Fallback global para inline markdown em conteúdo misto com HTML.
        .replace(/\*\*((?:(?!\*\*)[\s\S])+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__((?:(?!__)[\s\S])+?)__/g, '<strong>$1</strong>')
        .replace(/(^|[\s(>])\*([^*\n]+?)\*(?=[\s).,!?:;<]|$)/g, '$1<em>$2</em>')
        .replace(/~~((?:(?!~~)[\s\S])+?)~~/g, '<del>$1</del>')
        .replace(/`([^`\n]+?)`/g, '<code>$1</code>');
}


function normalizeImageSrc(src: string) {
    return src.trim();
}

function splitMarkdownWithImageBlocks(markdown: string) {
    // Preserva quebras de linha para manter parsing completo de markdown.
    const lines = markdown.split('\n');
    const blocks: Array<{ type: 'carousel' | 'markdown'; content: string[]; images?: { src: string; alt?: string }[] }> = [];
    let currentBlock: string[] = [];
    let currentImages: { src: string; alt?: string }[] = [];
    const imgHtmlRegex = /^<img\b[^>]*src=["']([^"']+)["'][^>]*>/i;

    function parseMarkdownImageLine(line: string): { src: string; alt?: string } | null {
        const trimmed = line.trim();
        const match = trimmed.match(
            /^!\[([^\]]*)\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\s*\)$/
        );
        if (!match) return null;
        let src = match[2].trim();
        if (src.startsWith('<') && src.endsWith('>')) {
            src = src.slice(1, -1);
        }
        return { src: normalizeImageSrc(src), alt: match[1] };
    }

    function pushMarkdownBlock() {
        if (currentBlock.length > 0) {
            blocks.push({ type: 'markdown', content: currentBlock });
            currentBlock = [];
        }
    }
    function pushCarouselBlock() {
        if (currentImages.length > 0) {
            blocks.push({ type: 'carousel', content: [], images: currentImages });
            currentImages = [];
        }
    }

    for (const line of lines) {
        const trimmed = line.trim();
        const mdImage = parseMarkdownImageLine(trimmed);
        const htmlMatch = imgHtmlRegex.exec(trimmed);

        // Mantem linhas em branco entre imagens no mesmo bloco de carousel.
        if (!trimmed && currentImages.length > 0) {
            continue;
        }

        if (mdImage) {
            pushMarkdownBlock();
            currentImages.push(mdImage);
        } else if (htmlMatch) {
            pushMarkdownBlock();
            const altMatch = trimmed.match(/\balt=["']([^"']*)["']/i);
            currentImages.push({ src: normalizeImageSrc(htmlMatch[1]), alt: altMatch?.[1] || '' });
        } else {
            pushCarouselBlock();
            currentBlock.push(line);
        }
    }
    pushMarkdownBlock();
    pushCarouselBlock();
    return blocks;
}

export default function Markdown({ children, className = '', removeMedia = false, images, videoPoster, columns = false, inExpandedCard = false, hasLittleContent = false }: MarkdownProps) {
    const baseContent = removeMedia ? removeImagesAndVideosFromMarkdown(children) : children;
    const content = normalizeMarkdownFormatting(baseContent);
    const hasSingleImage = images && images.length === 1;

    // Cores baseadas no tema - mesma cor em ambos os modos
    const textColor = '#888888';
    const shouldDetectExhibitionDate = className.split(/\s+/).includes('exhibition-content');

    const mergeClassName = (...names: Array<string | undefined | false>) =>
        names.filter(Boolean).join(' ');

    const getNodeText = (node: any): string => {
        if (!node) return '';
        if (typeof node.value === 'string') return node.value;
        if (!Array.isArray(node.children)) return '';
        return node.children.map((child: any) => getNodeText(child)).join('');
    };

    const isExhibitionDateNode = (node: any): boolean => {
        if (!shouldDetectExhibitionDate) return false;
        const text = getNodeText(node).trim();
        return EXHIBITION_DATE_PATTERN.test(text);
    };

    // Mover components para cima!
    const hasBlockChildren = (node: any): boolean => {
        if (!node || !Array.isArray(node.children)) return false;
        return node.children.some((child: any) => {
            const tag = child?.tagName;
            return tag === 'div' ||
                tag === 'video' ||
                tag === 'iframe' ||
                tag === 'table' ||
                tag === 'ul' ||
                tag === 'ol' ||
                tag === 'blockquote' ||
                tag === 'pre' ||
                tag === 'hr' ||
                tag === 'h1' ||
                tag === 'h2' ||
                tag === 'h3' ||
                tag === 'h4' ||
                tag === 'h5' ||
                tag === 'h6';
        });
    };

    const components: Components = {
        h1: (props: any) => (
            <h1
                {...props}
                className={mergeClassName('text-3xl font-bold mt-8 mb-4', props.className, isExhibitionDateNode(props.node) && 'exhibition-date')}
                style={{ color: textColor }}
            />
        ),
        h2: (props: any) => (
            <h2
                {...props}
                className={mergeClassName('text-2xl font-semibold mt-6 mb-3', props.className, isExhibitionDateNode(props.node) && 'exhibition-date')}
                style={{ color: textColor }}
            />
        ),
        h3: (props: any) => (
            <h3
                {...props}
                className={mergeClassName('text-xl font-semibold mt-4 mb-2', props.className, isExhibitionDateNode(props.node) && 'exhibition-date')}
                style={{ color: textColor }}
            />
        ),
        h4: (props: any) => (
            <h4
                {...props}
                className={mergeClassName('text-lg font-semibold mt-3 mb-2', props.className, isExhibitionDateNode(props.node) && 'exhibition-date')}
                style={{ color: textColor }}
            />
        ),
        h5: (props: any) => (
            <h5
                {...props}
                className={mergeClassName('text-base font-semibold mt-2 mb-1', props.className, isExhibitionDateNode(props.node) && 'exhibition-date')}
                style={{ color: textColor }}
            />
        ),
        h6: (props: any) => (
            <h6
                {...props}
                className={mergeClassName('text-sm font-semibold mt-2 mb-1', props.className, isExhibitionDateNode(props.node) && 'exhibition-date')}
                style={{ color: textColor }}
            />
        ),
        p: (props: any) => {
            const { node, className: paragraphClassName, ...rest } = props ?? {};
            // Evita HTML inválido: <div>/<video>/<iframe> dentro de <p> causa hydration mismatch.
            if (hasBlockChildren(node)) {
                return <div style={{ color: textColor }} {...rest} />;
            }
            return (
                <p
                    {...rest}
                    className={mergeClassName(paragraphClassName, isExhibitionDateNode(node) && 'exhibition-date')}
                    style={{ color: textColor }}
                />
            );
        },
        li: (props) => (
            <li style={{  color: textColor }} {...props} />
        ),
        a: (props) => (
            <a
                style={{  color: textColor, textDecoration: 'none' }}
                className="hover:underline transition-colors"
                target="_blank"
                rel="noopener noreferrer"
                {...props}
            />
        ),
        ul: (props) => <ul className="list-disc pl-6 my-2" {...props} />,
        ol: (props) => <ol className="list-decimal pl-6 my-2" {...props} />,
        strong: (props) => (
            <strong style={{ color: textColor, fontWeight: 700 }} {...props} />
        ),
        b: (props) => (
            <b style={{ color: textColor, fontWeight: 700 }} {...props} />
        ),
        em: (props) => (
            <em style={{ color: textColor, fontStyle: 'italic' }} {...props} />
        ),
        i: (props) => (
            <i style={{ color: textColor, fontStyle: 'italic' }} {...props} />
        ),
        del: (props) => (
            <del style={{ color: textColor, textDecoration: 'line-through' }} {...props} />
        ),
        s: (props) => (
            <s style={{ color: textColor, textDecoration: 'line-through' }} {...props} />
        ),
        blockquote: (props) => (
            <blockquote className="border-l-4 border-gray-400 pl-4 italic my-4" style={{  color: textColor }} {...props} />
        ),
        hr: () => (
            <hr className="my-6 border-t border-gray-500/50" />
        ),
        code(props: any) {
            const { inline, children, ...rest } = props;
            return inline ? (
                <code className="bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5 text-sm" {...rest}>{children}</code>
            ) : (
                <pre className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto my-4 text-sm">
                    <code {...rest}>{children}</code>
                </pre>
            );
        },
        table: (props: any) => (
            <div className="my-4 w-full overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm" {...props} />
            </div>
        ),
        thead: (props) => <thead className="border-b border-gray-500/40" {...props} />,
        tbody: (props) => <tbody className="divide-y divide-gray-500/30" {...props} />,
        th: (props) => <th className="px-3 py-2 font-semibold" style={{ color: textColor }} {...props} />,
        td: (props) => <td className="px-3 py-2" style={{ color: textColor }} {...props} />,
        input: (props: any) => {
            if (props?.type === 'checkbox') {
                return <input {...props} readOnly className="mr-2 align-middle accent-gray-500" />;
            }
            return <input {...props} />;
        },
        img: (props: any) => {
            const { className: imgClassName, style: imgStyle, ...rest } = props ?? {};
            const baseClassName = inExpandedCard
                ? " !rounded-lg w-full max-w-full h-auto my-6 block"
                : " !rounded-lg max-w-full h-auto my-6 block";
            const mergedClassName = `${imgClassName ? String(imgClassName) : ""} ${baseClassName}`.trim();

            const mergedStyle =
                imgStyle && typeof imgStyle === 'object'
                ? { ...imgStyle, borderRadius: '0.5rem' }
                : { borderRadius: '0.5rem' };

            if (hasSingleImage && images) {
                // Renderiza a imagem única normalmente
                return (
                    <img
                        {...rest}
                        className={mergedClassName}
                        style={{
                            ...mergedStyle,
                            ...(inExpandedCard ? { marginLeft: 0, marginRight: 0 } : { marginLeft: 'auto', marginRight: 'auto' }),
                        }}
                        alt={props.alt || ''}
                        src={images[0].src}
                    />
                );
            } else {
                // Comportamento padrão
                return (
                    <img
                        {...rest}
                        className={mergedClassName}
                        style={{
                            ...mergedStyle,
                            ...(inExpandedCard ? { marginLeft: 0, marginRight: 0 } : { marginLeft: 'auto', marginRight: 'auto' }),
                        }}
                        alt={props.alt || ''}
                    />
                );
            }
        },
        video: (props: any) => {
            const { className: videoClassName, style: videoStyle, ...rest } = props ?? {};
            // Usa a prop videoPoster do componente para o poster
            return (
                <div
                    className={inExpandedCard ? 'w-full rounded-lg overflow-hidden bg-black' : 'w-full rounded-lg overflow-hidden bg-black'}
                    style={{
                        scrollMarginTop: '0',
                        scrollMarginBottom: '0',
                        width: '100%',
                        aspectRatio: '16 / 9',
                        position: 'relative',
                        marginTop: '1rem',
                        marginBottom: '1rem',
                    }}
                    onMouseDown={(e) => {
                        // Previne qualquer comportamento padrão de scroll
                        e.preventDefault();
                    }}
                >
                    <video
                        {...rest}
                        controls
                        poster={videoPoster || props.poster}
                        className={`${videoClassName ? String(videoClassName) : ''} w-full h-full my-0 bg-black`}
                        style={{
                            scrollMarginTop: '0',
                            scrollMarginBottom: '0',
                            aspectRatio: '16 / 9',
                            width: '100%',
                            height: '100%',
                            margin: 0,
                            ...(videoStyle && typeof videoStyle === 'object' ? videoStyle : null),
                        }}
                    />
                </div>
            );
        },
        iframe: (props: any) => {
            const styleProp = props.style as unknown;
            const styleStr = typeof styleProp === 'string' ? styleProp.replace(/\s+/g, '').toLowerCase() : '';
            const isAbsolute =
                (typeof styleProp === 'object' && styleProp !== null && (styleProp as any).position === 'absolute') ||
                styleStr.includes('position:absolute');

            // Vimeo geralmente vem dentro de um wrapper com padding-top e iframe absoluto.
            // Aqui a gente envolve com um container ABSOLUTO (não cria altura extra) só pra clipar o raio.
            if (isAbsolute) {
                const { style, ...rest } = props;
                return (
                    <div
                        style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '0.5rem',
                            overflow: 'hidden',
                            background: 'black',
                        }}
                    >
                        <iframe
                            {...rest}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                border: 0,
                            }}
                            allowFullScreen
                        />
                    </div>
                );
            }

            // Fallback para iframes "soltos" (sem wrapper do provider)
            return (
                <div
                    className="w-full rounded-lg overflow-hidden bg-black"
                    style={{
                        width: '100%',
                        aspectRatio: '16 / 9',
                        position: 'relative',
                        marginTop: '1rem',
                        marginBottom: '1rem',
                    }}
                >
                    <iframe
                        {...props}
                        className="w-full h-full"
                        style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            border: 0,
                            ...(typeof props.style === 'object' && props.style ? props.style : null),
                        }}
                        allowFullScreen
                    />
                </div>
            );
        },
    };

    // só divide em colunas se columns for true
    if (columns) {
        const columnBlocks = content.split(/\n---+\n/);
        if (columnBlocks.length > 1) {
            return (
                <div className={`w-full flex flex-col sm:flex-row sm:items-start gap-8 sm:gap-12 ${className}`}>
                    {columnBlocks.map((block, idx) => (
                        <div key={idx} className="flex-1 min-w-[220px] max-w-xs sm:max-w-sm md:max-w-md">
                            <div className="max-w-none text-left leading-relaxed text-base sm:text-lg" style={{ color: textColor,  }}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                    components={components}
                                >
                                    {block.trim()}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }
    }

    // Divide o markdown em blocos de markdown e blocos de imagens consecutivas
    const blocks = splitMarkdownWithImageBlocks(content);
    const inlineImageSrcs = new Set(
        blocks
            .filter((block) => block.type === 'carousel' && block.images)
            .flatMap((block) => block.images ?? [])
            .map((image) => normalizeImageSrc(image.src))
    );

    const supplementalImages = (images ?? []).filter((image) => !inlineImageSrcs.has(normalizeImageSrc(image.src)));

    if (supplementalImages.length > 0) {
        const firstCarouselIndex = blocks.findIndex((block) => block.type === 'carousel');
        if (firstCarouselIndex >= 0) {
            const firstCarousel = blocks[firstCarouselIndex];
            blocks[firstCarouselIndex] = {
                ...firstCarousel,
                images: [...supplementalImages, ...(firstCarousel.images ?? [])],
            };
        } else {
            blocks.unshift({ type: 'carousel', content: [], images: supplementalImages });
        }
    }

    const containerClassName = [
        'w-full max-w-none text-left leading-relaxed text-base sm:text-lg markdown-content-custom',
        className,
    ].filter(Boolean).join(' ');

    return (
        <div
            className={containerClassName}
            style={{ color: textColor,  }}
        >
            {blocks.map((block, idx) => {
                if (block.type === 'carousel' && block.images && block.images.length > 0) {
                    return (
                        <div
                            key={idx}
                            className={
                                inExpandedCard
                                    ? "my-0 w-full px-0"
                                    : "my-6 first:mt-0 last:mb-0"
                            }
                        >
                            <ImageCarousel images={block.images} inExpandedCard={inExpandedCard} hasLittleContent={hasLittleContent} />
                        </div>
                    );
                }
                // Renderiza bloco markdown normalmente
                return (
                    <div
                        key={idx}
                        className={inExpandedCard
                            ? "my-3 px-3 sm:px-6 first:mt-0 last:mb-0"
                            : "my-4 first:mt-0 last:mb-0"}
                    >
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={components}
                        >
                            {block.content.join('\n')}
                        </ReactMarkdown>
                    </div>
                );
            })}
        </div>
    );
}
