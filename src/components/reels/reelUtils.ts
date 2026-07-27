// Helpers for parsing reel video URLs (YouTube, Shorts, ImageKit, MP4)

export type ReelSource =
  | { kind: "youtube"; id: string; embedUrl: string; thumbnailUrl: string }
  | { kind: "video"; url: string; thumbnailUrl: null };

export function parseReelUrl(url: string): ReelSource | null {
  if (!url) return null;
  const trimmed = url.trim();
  const withoutQuery = trimmed.split("?")[0].toLowerCase();

  // YouTube (watch, youtu.be, shorts, embed)
  const yt =
    trimmed.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([\w-]{11})/);
  if (yt && yt[1]) {
    const id = yt[1];
    // nocookie + heavy branding suppression
    const embedUrl =
      `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}` +
      `&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&fs=0&disablekb=1`;
    return {
      kind: "youtube",
      id,
      embedUrl,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  // Plain video file, including ImageKit video URLs.
  // ImageKit sometimes serves transformed media through URLs that still include
  // common video extensions before query params.
  if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(withoutQuery)) {
    return { kind: "video", url: trimmed, thumbnailUrl: null };
  }

  // Accept ImageKit video delivery URLs even when transformations hide the
  // extension. Browsers can still play them as normal <video> sources.
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    if (host === "imagekit.io" || host.endsWith(".imagekit.io")) {
      return { kind: "video", url: trimmed, thumbnailUrl: null };
    }
  } catch {}
  return null;
}
