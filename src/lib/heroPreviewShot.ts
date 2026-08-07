import { toPng } from "html-to-image";

const slug = (s: string) =>
  (s || "hero-slide").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "hero-slide";

/** Captures a rendered hero preview node as a PNG and downloads it. */
export async function downloadPreviewShot(node: HTMLElement, title: string) {
  const dataUrl = await toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#ffffff",
    skipFonts: false,
  });
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `${slug(title)}-preview.png`;
  a.click();
}

export async function downloadPreviewShots(nodes: { node: HTMLElement; title: string }[]) {
  for (const { node, title } of nodes) {
    await downloadPreviewShot(node, title);
    await new Promise((r) => setTimeout(r, 350));
  }
}