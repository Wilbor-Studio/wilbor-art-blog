/**
 * Players de música a partir do link da plataforma: Apple Music, Spotify e
 * SoundCloud. Usado pelo editor (ao salvar, o link vira player no post) e
 * pelo site (posts salvos antes disso guardam o link cru).
 */

const SPOTIFY = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([a-zA-Z0-9]+)/i;
const SOUNDCLOUD = /^https?:\/\/(?:www\.|m\.)?soundcloud\.com\/[^\s]+$/i;
const APPLE_MUSIC = /^https?:\/\/music\.apple\.com\/([^\s]+)$/i;

/** Player (iframe) para o link, ou null se não for de uma plataforma de música. */
export function musicEmbedFor(url: string): string | null {
  const spotify = url.match(SPOTIFY);
  if (spotify) {
    return `<iframe src="https://open.spotify.com/embed/${spotify[1]}/${spotify[2]}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" frameborder="0"></iframe>`;
  }
  if (SOUNDCLOUD.test(url)) {
    const encoded = encodeURIComponent(url.split('?')[0]);
    return `<iframe src="https://w.soundcloud.com/player/?url=${encoded}&color=%23111111&visual=false" allow="autoplay" loading="lazy" frameborder="0"></iframe>`;
  }
  const apple = url.match(APPLE_MUSIC);
  if (apple) {
    return `<iframe src="https://embed.music.apple.com/${apple[1]}" allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write" sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation" loading="lazy" frameborder="0"></iframe>`;
  }
  return null;
}

/** Nome da plataforma, para o link "Abrir no …" embaixo do player. */
function platformName(url: string): string {
  if (url.includes('music.apple.com')) return 'Apple Music';
  if (url.includes('spotify.com')) return 'Spotify';
  return 'SoundCloud';
}

/**
 * No texto já publicado: cada link de música sozinho numa linha vira o
 * player, com um link logo abaixo para abrir direto no app da plataforma.
 */
export function embedMusicLinks(markdown: string): string {
  return markdown
    .split('\n')
    .map(line => {
      const url = line.trim();
      if (!/^https?:\/\/\S+$/i.test(url)) return line;
      const embed = musicEmbedFor(url);
      if (!embed) return line;
      return `${embed}\n\n[Abrir no ${platformName(url)} ↗](${url})`;
    })
    .join('\n');
}
