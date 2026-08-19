export type EmbeddableVideo = { type: "iframe" | "video"; src: string };

/**
 * Parses a YouTube, Vimeo, or direct MP4/WebM/MOV URL into an embeddable
 * player descriptor. Returns null if the URL doesn't match a known pattern
 * (caller should fall back to a placeholder/image in that case).
 */
export function toEmbed(url: string): EmbeddableVideo | null {
  if (!url) return null;
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { type: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return { type: "video", src: u };
  return null;
}
