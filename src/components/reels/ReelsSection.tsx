import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, X as XIcon, Volume2, VolumeX, Play, Pause } from "lucide-react";
// ChevronLeft/Right kept for the outer scroller arrows only
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { parseReelUrl, type ReelSource } from "./reelUtils";
import { cn } from "@/lib/utils";
import { SignedImage } from "@/components/common/SignedImage";
import { getSignedImageUrl, isProductBucketUrl } from "@/lib/signedImageUrls";
import { useReducedMotionReels } from "@/hooks/useReducedMotionReels";
import { SectionHeading } from "@/components/home/SectionHeading";



interface YouTubePlayerApi {
  Player?: new (element: HTMLIFrameElement, options: { events: { onStateChange: (event: { data: number }) => void } }) => { destroy?: () => void };
}

interface ReelRow {
  id: string;
  video_url: string;
  title: string | null;
  object_fit?: "contain" | "cover" | null;
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[] | null;
    guest_price: number;
    regular_price: number;
    short_description: string | null;
    has_variations: boolean | null;
  } | null;
}

interface ReelsSectionProps {
  title?: string;
  excludeProductId?: string;
  limit?: number;
  placement?: "home" | "product";
}

export function ReelsSection({ title = "Featured Videos", excludeProductId, limit = 12, placement = "home" }: ReelsSectionProps) {
  const [reels, setReels] = useState<ReelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const { autoplayDisabled, toggle: toggleAutoplay } = useReducedMotionReels();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const placementCol = placement === "home" ? "show_on_home" : "show_on_product";
      // Cap the effective limit — reels are heavy media, more than 8 tanks scroll perf on mid-tier phones.
      const effectiveLimit = Math.min(limit, 8);
      const { data } = await supabase
        .from("product_reels")
        .select("id, video_url, title, show_on_home, show_on_product, object_fit, product:products(id, name, slug, images, guest_price, regular_price, short_description, has_variations)")
        .eq("is_active", true)
        .eq(placementCol, true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(effectiveLimit);
      const rows = ((data || []) as unknown as ReelRow[]).filter((r) => r.product);
      setReels(rows);
      setLoading(false);
    })();
  }, [excludeProductId, limit, placement]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  useEffect(() => {
    if (autoplayDisabled) return; // respect reduced-motion — no auto-slide
    if (loading || reels.length <= 1 || activeIndex !== null) return;
    const timer = window.setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const firstCard = el.firstElementChild as HTMLElement | null;
      const step = firstCard ? firstCard.getBoundingClientRect().width + 16 : el.clientWidth * 0.75;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;
      const nextLeft = el.scrollLeft + step;
      if (nextLeft >= maxScroll - 8) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollTo({ left: nextLeft, behavior: "smooth" });
      }
    }, 3000);
    return () => window.clearInterval(timer);
  }, [activeIndex, loading, reels.length, autoplayDisabled]);


  if (loading) {
    return (
      <section className="py-8 sm:py-10 bg-background -mt-10">
        <div className="container mx-auto px-3 sm:px-4">
          <SectionHeading title={title} />
          <div className="flex gap-3 sm:gap-4 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-[46%] sm:w-[30%] md:w-[23%] lg:w-[18%] flex-shrink-0 space-y-2">
                <Skeleton className="aspect-[9/16] w-full rounded-xl" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (reels.length === 0) {
    return (
      <section className="py-8 sm:py-10 bg-background -mt-10">
        <div className="container mx-auto px-3 sm:px-4">
          <SectionHeading title={title} />
          <div className="rounded-xl border border-dashed border-border bg-card/50 py-10 text-center">
            <p className="text-sm font-medium text-foreground">No reels yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Product videos will appear here soon.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-10 bg-background -mt-10">
      <div className="container mx-auto px-3 sm:px-4 relative">
        <SectionHeading title={title} />



        {/* Slider scroller */}
        <div className="relative">
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-1)}
            className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 bg-background border border-border shadow-md rounded-full p-2 hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(1)}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-background border border-border shadow-md rounded-full p-2 hover:bg-secondary"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div
            ref={scrollerRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {reels.map((reel, idx) => (
              <ReelCard key={reel.id} reel={reel} onOpen={() => setActiveIndex(idx)} autoplayDisabled={autoplayDisabled} />
            ))}
          </div>
        </div>
      </div>


      {activeIndex !== null && reels[activeIndex] && (
        <ReelModal
          reels={reels}
          index={activeIndex}
          onClose={() => setActiveIndex(null)}
          onIndexChange={setActiveIndex}
        />
      )}
    </section>
  );
}

function ReelCard({ reel, onOpen, autoplayDisabled }: { reel: ReelRow; onOpen: () => void; autoplayDisabled: boolean }) {
  const source = parseReelUrl(reel.video_url);
  const product = reel.product!;
  const objectFit = reel.object_fit === "contain" ? "contain" : "cover";
  const price = product.guest_price;
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Only mount the actual media element once the card is (nearly) on-screen.
  // Saves bandwidth + main-thread work on Products/Categories pages with many reels.
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "300px 300px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
      className="snap-start flex-shrink-0 w-[46%] sm:w-[30%] md:w-[23%] lg:w-[19%] group relative overflow-hidden rounded-xl bg-card border border-border shadow-sm hover:shadow-xl transition-all text-left flex flex-col cursor-pointer"
    >
      <div className="relative aspect-[9/16] bg-black overflow-hidden">
        {inView ? (
          <ReelMedia source={source} cover={product.images?.[0]} alt={product.name} objectFit={objectFit} autoplayDisabled={autoplayDisabled} />
        ) : (
          <SignedImage
            src={product.images?.[0] || "/placeholder.svg"}
            alt={product.name}
            className={cn("absolute inset-0 w-full h-full", objectFit === "contain" ? "object-contain" : "object-cover")}
            loading="lazy"
          />
        )}

        {/* Subtle masks for YT branding */}
        <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 right-0 h-10 w-20 bg-black/95 pointer-events-none" />

        {autoplayDisabled && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/55 text-white rounded-full p-3 shadow-lg">
              <Play className="h-6 w-6 fill-white" />
            </div>
          </div>
        )}
      </div>

      {/* Floating product chip (matches reels1 reference) */}
      <div className="absolute left-2 right-2 bottom-2 z-10">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur rounded-xl shadow-md p-1.5 pr-2">
          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-secondary">
            <SignedImage src={product.images?.[0] || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-foreground truncate leading-tight">{product.name}</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-[11px] font-bold text-accent leading-tight">₹{price.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



function ReelModal({
  reels,
  index,
  onClose,
  onIndexChange,
}: {
  reels: ReelRow[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const pauseTimer = useRef<number | null>(null);

  const total = reels.length;
  const nextIdx = (index + 1) % total;
  const prevIdx = (index - 1 + total) % total;

  const bumpInteraction = () => {
    setPaused(true);
    if (pauseTimer.current) window.clearTimeout(pauseTimer.current);
    pauseTimer.current = window.setTimeout(() => setPaused(false), 4000);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { onIndexChange(nextIdx); bumpInteraction(); }
      if (e.key === "ArrowLeft") { onIndexChange(prevIdx); bumpInteraction(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (pauseTimer.current) window.clearTimeout(pauseTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  const reel = reels[index];
  const source = parseReelUrl(reel.video_url);
  const product = reel.product!;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      onIndexChange(dx < 0 ? nextIdx : prevIdx);
      bumpInteraction();
    }
    touchStartX.current = null;
  };

  const advanceAfterPlayback = () => {
    if (total <= 1) return;
    onIndexChange(nextIdx);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 top-[10px] z-[70] flex items-center justify-center overflow-hidden md:bottom-4 md:top-[calc(var(--reel-header-offset,112px)+16px)] md:z-40"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dark blurred backdrop */}
      <div className="absolute inset-0 bg-foreground/85 backdrop-blur-md" />
      <div className="absolute inset-0 opacity-35 blur-xl scale-110">
        <SignedImage src={product.images?.[0] || "/placeholder.svg"} alt="" className="h-full w-full object-cover" />
      </div>

      {/* Close */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute top-4 right-4 z-30 bg-white/15 hover:bg-white/30 text-white rounded-full p-2 transition-colors"
      >
        <XIcon className="h-5 w-5" />
      </button>

      {/* Carousel stage — layered preview like the provided reels_02 reference */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
          {(total > 1
            ? [
                { r: reels[prevIdx], i: prevIdx, offset: -1, key: `${reels[prevIdx].id}-prev` },
                { r: reels[index], i: index, offset: 0, key: `${reels[index].id}-active` },
                { r: reels[nextIdx], i: nextIdx, offset: 1, key: `${reels[nextIdx].id}-next` },
              ]
            : [{ r: reels[index], i: index, offset: 0, key: `${reels[index].id}-active` }]
          ).map(({ r, i, offset, key }) => {
          const isActive = offset === 0;
          const src = parseReelUrl(r.video_url);
          const slideProduct = r.product!;
          const slidePrice = slideProduct.guest_price;
          const slideMrp = slideProduct.regular_price > 0 ? slideProduct.regular_price : slidePrice;
          const thumbSrc = src?.kind === "youtube" ? src.thumbnailUrl : undefined;
          return (
            <div
              key={key}
              onClick={(e) => {
                e.stopPropagation();
                if (!isActive) { onIndexChange(i); bumpInteraction(); }
              }}
              className={cn(
                "absolute top-1/2 left-1/2 aspect-[9/16] overflow-hidden shadow-2xl transition-all duration-500 ease-out bg-foreground",
                isActive
                  ? "h-[calc(100%-24px)] max-h-[860px] rounded-[18px] z-20 opacity-100 cursor-default md:h-[calc(100%-24px)] md:max-h-[820px]"
                  : "h-[calc(100%-96px)] max-h-[580px] rounded-[14px] z-10 opacity-90 cursor-pointer md:h-[calc(100%-88px)] md:max-h-[640px]"
              )}
              style={{
                transform: `translate(-50%, -50%) translateX(calc(${offset} * clamp(92px, 18vw, 190px))) scale(${isActive ? 1 : 0.92})`,
                filter: isActive ? "none" : "brightness(0.7) blur(1px)",
              }}
              aria-hidden={!isActive}
            >
              {thumbSrc && (
                <SignedImage
                  src={thumbSrc}
                  alt=""
                  className={cn("absolute inset-0 h-full w-full", r.object_fit === "contain" ? "object-contain" : "object-cover")}
                />
              )}

              {isActive ? (
                <ModalReelMedia
                  source={src}
                  cover={r.product?.images?.[0]}
                  alt={r.product?.name || ""}
                  muted={muted}
                  objectFit={r.object_fit === "contain" ? "contain" : "cover"}
                  onEnded={advanceAfterPlayback}
                />
              ) : (
                <ReelMedia
                  source={src}
                  cover={slideProduct.images?.[0]}
                  alt={slideProduct.name}
                  objectFit={r.object_fit === "contain" ? "contain" : "cover"}
                />
              )}

              <Link
                to={`/product/${slideProduct.slug}`}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "absolute z-10 flex items-center gap-3 bg-background/95 backdrop-blur shadow-xl transition-colors hover:bg-background",
                  isActive
                    ? "left-3 right-3 bottom-4 rounded-2xl p-2 pr-3"
                    : "left-2 right-2 bottom-3 rounded-xl p-1.5 pr-2"
                )}
              >
                <div className={cn("overflow-hidden bg-secondary flex-shrink-0", isActive ? "h-12 w-12 rounded-xl" : "h-9 w-9 rounded-lg")}>
                  <SignedImage src={slideProduct.images?.[0] || "/placeholder.svg"} alt={slideProduct.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-semibold text-foreground truncate", isActive ? "text-sm" : "text-[11px]")}>{slideProduct.name}</p>
                  <div className="flex items-baseline gap-2">
                    <span className={cn("font-bold text-accent", isActive ? "text-sm" : "text-[11px]")}>₹{slidePrice.toLocaleString("en-IN")}</span>
                    {slideMrp > slidePrice && (
                      <span className={cn("text-muted-foreground line-through", isActive ? "text-xs" : "text-[10px]")}>₹{slideMrp.toLocaleString("en-IN")}</span>
                    )}
                  </div>
                </div>
              </Link>

              {isActive && (
                <>
                  <button
                    aria-label={muted ? "Unmute" : "Mute"}
                    onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                    className="absolute top-3 right-3 z-10 bg-foreground/60 hover:bg-foreground/80 text-background rounded-full p-2"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModalReelMedia({ source, cover, alt, muted, objectFit, onEnded }: { source: ReelSource | null; cover?: string; alt: string; muted: boolean; objectFit: "contain" | "cover"; onEnded: () => void }) {
  const [videoSrc, setVideoSrc] = useState(source?.kind === "video" && !isProductBucketUrl(source.url) ? source.url : "");
  const [posterSrc, setPosterSrc] = useState(cover || "/placeholder.svg");
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    let active = true;
    if (source?.kind !== "video") return;
    setVideoFailed(false);
    setVideoReady(false);
    if (isProductBucketUrl(source.url)) {
      setVideoSrc("");
      getSignedImageUrl(source.url).then((signed) => {
        if (active && signed) setVideoSrc(signed);
      });
    } else {
      setVideoSrc(source.url);
    }
    return () => {
      active = false;
    };
  }, [source]);

  useEffect(() => {
    let active = true;
    setPosterSrc(cover || "/placeholder.svg");
    if (isProductBucketUrl(cover)) {
      getSignedImageUrl(cover).then((signed) => {
        if (active && signed) setPosterSrc(signed);
      });
    }
    return () => {
      active = false;
    };
  }, [cover]);

  useEffect(() => {
    if (source?.kind !== "youtube") return;
    let destroyed = false;
    let player: { destroy?: () => void } | null = null;
    let pollTimer: number | null = null;

    const initPlayer = () => {
      const YT = (window as Window & { YT?: YouTubePlayerApi }).YT;
      if (destroyed || !iframeRef.current || !YT?.Player) return false;
      player = new YT.Player(iframeRef.current, {
        events: {
          onStateChange: (event: { data: number }) => {
            if (event.data === 0) onEnded();
          },
        },
      });
      return true;
    };

    if (!initPlayer()) {
      if (!(window as Window & { YT?: YouTubePlayerApi }).YT && !document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(script);
      }
      pollTimer = window.setInterval(() => {
        if (initPlayer() && pollTimer) window.clearInterval(pollTimer);
      }, 250);
    }

    return () => {
      destroyed = true;
      if (pollTimer) window.clearInterval(pollTimer);
      player?.destroy?.();
    };
  }, [onEnded, source]);

  if (source?.kind === "youtube") {
    const base = source.embedUrl.split("?")[0];
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const embedSrc = `${base}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&playsinline=1&modestbranding=1&rel=0&enablejsapi=1${origin ? `&origin=${encodeURIComponent(origin)}` : ""}`;
    return (
      <iframe
        ref={iframeRef}
        src={embedSrc}
        title={alt}
        allow="autoplay; encrypted-media; picture-in-picture"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[170%] w-[170%]"
        frameBorder={0}
      />
    );
  }
  if (source?.kind === "video") {
    if (videoFailed) {
      return <SignedImage src={cover || "/placeholder.svg"} alt={alt} className="absolute inset-0 h-full w-full object-cover" />;
    }
    if (!videoSrc) {
      return <SignedImage src={cover || "/placeholder.svg"} alt={alt} className="absolute inset-0 h-full w-full object-cover" />;
    }
    return (
      <>
        <SignedImage
          src={cover || "/placeholder.svg"}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full transition-opacity duration-300",
            objectFit === "contain" ? "object-contain" : "object-cover",
            videoReady ? "opacity-0" : "opacity-100"
          )}
        />
        <video
          src={videoSrc}
          poster={posterSrc}
          className={cn("absolute inset-0 w-full h-full", objectFit === "contain" ? "object-contain" : "object-cover")}
          autoPlay
          muted={muted}
          playsInline
          preload="metadata"
          controls={false}
          onEnded={onEnded}
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onError={() => setVideoFailed(true)}
        />
      </>
    );
  }
  return (
    <SignedImage src={cover || "/placeholder.svg"} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
  );
}

function ReelMedia({ source, cover, alt, objectFit, autoplayDisabled }: { source: ReelSource | null; cover?: string; alt: string; objectFit: "contain" | "cover"; autoplayDisabled?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  // Autoplay immediately (muted) so reels play on home & product pages
  const [visible] = useState(true);
  const [videoSrc, setVideoSrc] = useState(source?.kind === "video" && !isProductBucketUrl(source.url) ? source.url : "");
  const [posterSrc, setPosterSrc] = useState(cover || "/placeholder.svg");
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (source?.kind !== "video") return;
    setVideoFailed(false);
    setVideoReady(false);
    if (isProductBucketUrl(source.url)) {
      setVideoSrc("");
      getSignedImageUrl(source.url).then((signed) => {
        if (active && signed) setVideoSrc(signed);
      });
    } else {
      setVideoSrc(source.url);
    }
    return () => {
      active = false;
    };
  }, [source]);

  useEffect(() => {
    let active = true;
    setPosterSrc(cover || "/placeholder.svg");
    if (isProductBucketUrl(cover)) {
      getSignedImageUrl(cover).then((signed) => {
        if (active && signed) setPosterSrc(signed);
      });
    }
    return () => {
      active = false;
    };
  }, [cover]);

  // Robust autoplay: retry on visibility change, page focus, tab return, and
  // network/media stalls. Bail out entirely when the user has disabled autoplay.
  useEffect(() => {
    const v = videoElRef.current;
    if (!v || !videoSrc) return;
    if (autoplayDisabled) {
      try { v.pause(); } catch {}
      return;
    }

    let retryTimer: number | null = null;
    const tryPlay = () => {
      if (autoplayDisabled) return;
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Retry once more on next tick — slow networks may not have data yet.
          if (retryTimer) window.clearTimeout(retryTimer);
          retryTimer = window.setTimeout(() => {
            const p2 = v.play();
            if (p2 && typeof p2.catch === "function") p2.catch(() => {});
          }, 400);
        });
      }
    };

    tryPlay();

    // On viewport visibility — pause when off-screen, play when back
    const io = typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) tryPlay();
            else { try { v.pause(); } catch {} }
          });
        }, { threshold: 0.25 })
      : null;
    io?.observe(v);

    // On tab return / window focus
    const onVis = () => { if (!document.hidden) tryPlay(); };
    const onFocus = () => tryPlay();
    const onStalled = () => tryPlay();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    v.addEventListener("stalled", onStalled);
    v.addEventListener("suspend", onStalled);

    return () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      v.removeEventListener("stalled", onStalled);
      v.removeEventListener("suspend", onStalled);
    };
  }, [videoSrc, autoplayDisabled]);

  // YouTube — muted autoplay iframe (works for Shorts on most browsers).
  if (source?.kind === "youtube") {
    // When user disabled autoplay, render the thumbnail only.
    if (autoplayDisabled) {
      return (
        <div ref={ref} className="absolute inset-0 bg-black overflow-hidden">
          <img
            src={`https://i.ytimg.com/vi/${source.id}/hqdefault.jpg`}
            alt={alt}
            className={cn("absolute inset-0 w-full h-full", objectFit === "contain" ? "object-contain" : "object-cover")}
            loading="lazy"
          />
        </div>
      );
    }
    // Build autoplay/muted/loop embed url (loop requires playlist=videoId)
    const base = source.embedUrl.split("?")[0];
    const embedSrc = `${base}?autoplay=1&mute=1&controls=0&loop=1&playlist=${source.id}&playsinline=1&modestbranding=1&rel=0`;
    return (
      <div ref={ref} className="absolute inset-0 bg-black overflow-hidden">
        {visible ? (
          <iframe
            src={embedSrc}
            title={alt}
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture"
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none",
              objectFit === "contain" ? "h-full w-full" : "h-[170%] w-[170%]"
            )}
            frameBorder={0}
          />
        ) : (
          <img
            src={`https://i.ytimg.com/vi/${source.id}/hqdefault.jpg`}
            alt={alt}
            className={cn("absolute inset-0 w-full h-full", objectFit === "contain" ? "object-contain" : "object-cover")}
            loading="lazy"
          />
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="absolute inset-0">
      <SignedImage
        src={cover || "/placeholder.svg"}
        alt={alt}
        className={cn(
          "absolute inset-0 w-full h-full transition-opacity duration-300",
          objectFit === "contain" ? "object-contain" : "object-cover",
          !autoplayDisabled && visible && source?.kind === "video" && videoSrc && !videoFailed && videoReady ? "opacity-0" : "opacity-100"
        )}
        loading="lazy"
      />
      {!autoplayDisabled && visible && source?.kind === "video" && videoSrc && !videoFailed && (
        <video
          ref={videoElRef}
          src={videoSrc}
          poster={posterSrc}
          className={cn(
            "absolute inset-0 w-full h-full transition-opacity duration-300",
            objectFit === "contain" ? "object-contain" : "object-cover",
            videoReady ? "opacity-100" : "opacity-0"
          )}
          autoPlay
          muted
          loop
          playsInline
          // Critical for iOS Safari muted autoplay
          disableRemotePlayback
          preload="auto"
          onLoadedMetadata={() => setVideoReady(true)}
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={(e) => {
            setVideoReady(true);
            const el = e.currentTarget as HTMLVideoElement;
            // Force muted flag at play-time — some Android browsers reset it.
            el.muted = true;
            const p = el.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
          }}
          onError={() => setVideoFailed(true)}
        />
      )}
    </div>
  );
}


