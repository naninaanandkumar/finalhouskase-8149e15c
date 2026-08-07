import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { HERO_ICONS, type HeroOverlayData, type HeroIconKey } from "@/components/home/HeroOverlay";
import { validateHeroOverlay, validateHeroAccessibility } from "@/lib/heroSlides";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

const ICON_KEYS = Object.keys(HERO_ICONS) as HeroIconKey[];

export function HeroOverlayEditor({
  value,
  onChange,
}: {
  value: HeroOverlayData;
  onChange: (next: HeroOverlayData) => void;
}) {
  const set = (patch: Partial<HeroOverlayData>) => onChange({ ...value, ...patch });
  const features = value.features || [];
  const setFeature = (i: number, patch: Partial<{ icon: string; label: string }>) =>
    set({ features: features.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  const warnings = validateHeroOverlay(value);
  const a11y = validateHeroAccessibility(value);
  const crop = value.crop || { zoom: 1, x: 50, y: 50 };
  const setCrop = (patch: Partial<{ zoom: number; x: number; y: number }>) => set({ crop: { ...crop, ...patch } });
  const mcrop = value.mobile_crop || { zoom: 1, x: 50, y: 50 };
  const setMCrop = (patch: Partial<{ zoom: number; x: number; y: number }>) => set({ mobile_crop: { ...mcrop, ...patch } });

  return (
    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">Banner Content (left side)</Label>
          <p className="text-xs text-muted-foreground">Heading, tagline bar, icon points and button drawn over the image.</p>
        </div>
        <Switch checked={!!value.enabled} onCheckedChange={(c) => set({ enabled: c })} />
      </div>

      {value.enabled && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Brand line</Label>
              <Input value={value.brand || ""} onChange={(e) => set({ brand: e.target.value })} placeholder="HOUSKASE™" />
            </div>
            <div className="space-y-2">
              <Label>Tagline bar (coloured strip)</Label>
              <Input value={value.tagline || ""} onChange={(e) => set({ tagline: e.target.value })} placeholder="SOFT, HIGHLY ABSORBENT & REUSABLE" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Heading (bold, use Enter for a new line)</Label>
            <Textarea rows={2} value={value.heading || ""} onChange={(e) => set({ heading: e.target.value })} placeholder={"ULTRA NON-WOVEN"} />
          </div>
          <div className="space-y-2">
            <Label>Short description / sub heading</Label>
            <Textarea rows={2} value={value.subheading || ""} onChange={(e) => set({ subheading: e.target.value })} placeholder="CLEANING CLOTH ROLL" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Feature points (icon + text, split by vertical lines)</Label>
              <Button type="button" variant="outline" size="sm" className="gap-1"
                onClick={() => set({ features: [...features, { icon: "sparkles", label: "" }] })}>
                <Plus className="h-3.5 w-3.5" />Add point
              </Button>
            </div>
            {features.length === 0 && <p className="text-xs text-muted-foreground">No points yet — add up to 4 for the best fit.</p>}
            <div className="space-y-2">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select value={(f.icon as string) || "sparkles"} onValueChange={(v) => setFeature(i, { icon: v })}>
                    <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICON_KEYS.map((k) => {
                        const Icon = HERO_ICONS[k];
                        return (
                          <SelectItem key={k} value={k}>
                            <span className="flex items-center gap-2"><Icon className="h-4 w-4" />{k}</span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Input className="flex-1" value={f.label} onChange={(e) => setFeature(i, { label: e.target.value })} placeholder="Better Cleaning" />
                  <Button type="button" variant="ghost" size="icon" className="text-destructive"
                    onClick={() => set({ features: features.filter((_, idx) => idx !== i) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Button text</Label>
              <Input value={value.cta_text || ""} onChange={(e) => set({ cta_text: e.target.value })} placeholder="SHOP NOW" />
            </div>
            <div className="space-y-2">
              <Label>Accent colour</Label>
              <div className="flex gap-2">
                <Input type="color" className="w-14 p-1" value={value.accent || "#C8102E"} onChange={(e) => set({ accent: e.target.value })} />
                <Input value={value.accent || "#C8102E"} onChange={(e) => set({ accent: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Text theme</Label>
              <Select value={value.theme || "dark"} onValueChange={(v) => set({ theme: v as "dark" | "light" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark text (light banner)</SelectItem>
                  <SelectItem value="light">Light text (dark banner)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Content width: {value.width || 46}% of banner</Label>
            <input type="range" min={25} max={70} step={1} value={value.width || 46}
              onChange={(e) => set({ width: Number(e.target.value) })} className="w-full accent-primary" />
          </div>

          <div className="space-y-3 rounded-lg border bg-background p-4">
            <div>
              <Label className="text-base">Image crop &amp; zoom (desktop / tablet)</Label>
              <p className="text-xs text-muted-foreground">Reframe the artwork so the left side stays clear for the text — the 2172 × 724 safe area.</p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Zoom {(crop.zoom ?? 1).toFixed(2)}×</Label>
                <input type="range" min={1} max={2.5} step={0.01} value={crop.zoom ?? 1} onChange={(e) => setCrop({ zoom: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Horizontal {Math.round(crop.x ?? 50)}%</Label>
                <input type="range" min={0} max={100} step={1} value={crop.x ?? 50} onChange={(e) => setCrop({ x: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Vertical {Math.round(crop.y ?? 50)}%</Label>
                <input type="range" min={0} max={100} step={1} value={crop.y ?? 50} onChange={(e) => setCrop({ y: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 border-t pt-3">
              <div className="space-y-2">
                <Label className="text-xs">Mobile zoom {(mcrop.zoom ?? 1).toFixed(2)}×</Label>
                <input type="range" min={1} max={2.5} step={0.01} value={mcrop.zoom ?? 1} onChange={(e) => setMCrop({ zoom: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mobile horizontal {Math.round(mcrop.x ?? 50)}%</Label>
                <input type="range" min={0} max={100} step={1} value={mcrop.x ?? 50} onChange={(e) => setMCrop({ x: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Mobile vertical {Math.round(mcrop.y ?? 50)}%</Label>
                <input type="range" min={0} max={100} step={1} value={mcrop.y ?? 50} onChange={(e) => setMCrop({ y: Number(e.target.value) })} className="w-full accent-primary" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {warnings.length === 0 && a11y.length === 0 ? (
              <p className="flex items-center gap-2 text-xs text-green-600"><CheckCircle2 className="h-4 w-4" />Content fits the desktop and tablet safe area.</p>
            ) : (
              [...warnings, ...a11y].map((w, i) => (
                <p key={i} className={`flex items-start gap-2 text-xs ${w.level === "error" ? "text-destructive" : "text-amber-600"}`}>
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{w.message}
                </p>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}