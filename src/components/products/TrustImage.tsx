import { useState } from "react";

interface TrustImageProps {
  src: string;
  alt: string;
  /** CSS aspect-ratio value, e.g. "1200 / 140" */
  ratio: string;
}

/**
 * Payment trust badge with a reserved aspect-ratio box + skeleton placeholder,
 * so lazily loaded images never shift the Add to Cart section.
 */
export function TrustImage({ src, alt, ratio }: TrustImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg bg-muted/40"
      style={{ aspectRatio: ratio }}
    >
      {!loaded && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden="true" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
