export type EmbeddableVideo = { type: "iframe" | "video"; src: string };

/**
 * Parses a YouTube, Vimeo, or direct MP4/WebM/MOV URL into an embeddable
 * player descriptor. Returns null if the URL doesn't match a known pattern
 * (caller should fall back to a placeholder/image in that case).
 *
 * Pass `{ autoplay: true }` for hero-style auto-playing video — browsers
 * require autoplaying video to be muted, so this also mutes the player.
 */
export function toEmbed(url: string, opts?: { autoplay?: boolean }): EmbeddableVideo | null {
  if (!url) return null;
  const u = url.trim();
  const autoplay = !!opts?.autoplay;
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) {
    const params = autoplay ? "?autoplay=1&mute=1&playsinline=1" : "";
    return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}${params}` };
  }
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) {
    const params = autoplay ? "?autoplay=1&muted=1&playsinline=1" : "";
    return { type: "iframe", src: `https://player.vimeo.com/video/${vm[1]}${params}` };
  }
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return { type: "video", src: u };
  return null;
}
