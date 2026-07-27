type ObjectFitMode = "cover" | "contain";

interface HeroPreviewInput {
  title: string;
  subtitle?: string | null;
  badgeLabel?: string | null;
  ctaText?: string | null;
  imageUrl: string;
  objectFit?: ObjectFitMode;
  aspectRatio?: string | null;
  desktopHeight?: number | null;
  mobileHeight?: number | null;
}

interface ReelPreviewInput {
  title: string;
  productName: string;
  coverUrl?: string | null;
  objectFit?: ObjectFitMode;
}

const breakpoints = [
  { name: "mobile", width: 390 },
  { name: "tablet", width: 768 },
  { name: "desktop", width: 1440 },
] as const;

const loadImage = (src?: string | null) =>
  new Promise<HTMLImageElement | null>((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

const parseRatio = (value?: string | null) => {
  if (!value) return 2171 / 724;
  const cleaned = value.replace(/\s/g, "");
  if (cleaned.includes("/")) {
    const [w, h] = cleaned.split("/").map(Number);
    if (w > 0 && h > 0) return w / h;
  }
  const numeric = Number(cleaned);
  return numeric > 0 ? numeric : 2171 / 724;
};

const drawFittedImage = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, fit: ObjectFitMode) => {
  const imageRatio = img.naturalWidth / img.naturalHeight;
  const frameRatio = w / h;
  let dw = w;
  let dh = h;
  if ((fit === "cover" && imageRatio > frameRatio) || (fit === "contain" && imageRatio < frameRatio)) {
    dh = h;
    dw = h * imageRatio;
  } else {
    dw = w;
    dh = w / imageRatio;
  }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
};

const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) => {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
};

export async function exportHeroBreakpointPreviews(input: HeroPreviewInput) {
  const image = await loadImage(input.imageUrl);
  const ratio = parseRatio(input.aspectRatio);
  breakpoints.forEach(({ name, width }) => {
    const height = name === "desktop" ? input.desktopHeight || Math.round(width / ratio) : input.mobileHeight || Math.round(width / ratio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#eef2f7";
    ctx.fillRect(0, 0, width, height);
    if (image) drawFittedImage(ctx, image, 0, 0, width, height, input.objectFit || "contain");
    const gradient = ctx.createLinearGradient(0, 0, width * 0.72, 0);
    gradient.addColorStop(0, "rgba(0,0,0,0.68)");
    gradient.addColorStop(0.6, "rgba(0,0,0,0.3)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    const pad = Math.max(18, Math.round(width * 0.04));
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.max(20, Math.round(width * 0.034))}px sans-serif`;
    ctx.fillText(input.title || "Hero slide", pad, Math.round(height * 0.45));
    if (input.subtitle) {
      ctx.font = `400 ${Math.max(12, Math.round(width * 0.015))}px sans-serif`;
      ctx.fillText(input.subtitle, pad, Math.round(height * 0.45) + 28);
    }
    ctx.fillStyle = "#f59e0b";
    ctx.font = `700 ${Math.max(11, Math.round(width * 0.012))}px sans-serif`;
    ctx.fillText(input.ctaText || input.badgeLabel || "Preview", pad, Math.round(height * 0.45) + 58);
    downloadCanvas(canvas, `hero-${name}-preview.png`);
  });
}

export async function exportReelBreakpointPreviews(input: ReelPreviewInput) {
  const image = await loadImage(input.coverUrl);
  breakpoints.forEach(({ name, width }) => {
    const cardWidth = name === "desktop" ? 270 : name === "tablet" ? 220 : 180;
    const cardHeight = Math.round(cardWidth * 16 / 9);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = cardHeight + 88;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const x = Math.round((width - cardWidth) / 2);
    ctx.fillStyle = "#020617";
    ctx.fillRect(x, 24, cardWidth, cardHeight);
    if (image) drawFittedImage(ctx, image, x, 24, cardWidth, cardHeight, input.objectFit || "cover");
    const grd = ctx.createLinearGradient(0, 24 + cardHeight - 96, 0, 24 + cardHeight);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.86)");
    ctx.fillStyle = grd;
    ctx.fillRect(x, 24, cardWidth, cardHeight);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 14px sans-serif";
    ctx.fillText(input.productName || input.title || "Product reel", x + 14, 24 + cardHeight - 32, cardWidth - 28);
    ctx.fillStyle = "#0f172a";
    ctx.font = "600 14px sans-serif";
    ctx.fillText(`${name} reel preview`, 16, canvas.height - 24);
    downloadCanvas(canvas, `reel-${name}-preview.png`);
  });
}