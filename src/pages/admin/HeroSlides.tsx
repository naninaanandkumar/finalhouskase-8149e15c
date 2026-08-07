import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MoreHorizontal, Edit, Trash2, ArrowLeft, Loader2, Image as ImageIcon, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SignedImage } from "@/components/common/SignedImage";
import { HeroTemplate, HERO_ICONS, emptyHeroOverlay, type HeroOverlayData, type HeroIconKey } from "@/components/home/HeroOverlay";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  mobile_image_url?: string | null;
  badge_label: string | null;
  cta_text: string | null;
  cta_link: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  overlay?: HeroOverlayData | null;
}

const ICON_KEYS = Object.keys(HERO_ICONS) as HeroIconKey[];

const emptyForm = {
  title: "",
  image_url: "",
  mobile_image_url: "",
  cta_text: "SHOP NOW",
  cta_link: "/products",
  sort_order: "0",
  is_active: true,
};

export default function AdminHeroSlides() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [overlay, setOverlay] = useState<HeroOverlayData>({ ...emptyHeroOverlay });
  const [dirty, setDirty] = useState(false);
  const [imgWarning, setImgWarning] = useState<string | null>(null);

  const { toast } = useToast();
  const location = useLocation();

  useEffect(() => { setShowForm(false); setEditing(null); }, [location.key]);

  const fetchSlides = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("hero_slides").select("*").order("sort_order");
    setSlides((data as HeroSlide[]) || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchSlides(); }, []);

  // Warn before losing unsaved edits (browser close / reload).
  useEffect(() => {
    if (!showForm || !dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [showForm, dirty]);

  const closeForm = () => {
    if (dirty && !confirm("You have unsaved changes. Leave without saving?")) return;
    setDirty(false);
    setShowForm(false);
    setEditing(null);
  };

  /** Banner artwork must be the 2172 x 724 (3:1) hero ratio. */
  const checkDimensions = (url: string) => {
    if (!url) { setImgWarning(null); return; }
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      const target = 2172 / 724;
      if (Math.abs(ratio - target) / target > 0.04) {
        setImgWarning(`Uploaded image is ${img.naturalWidth} x ${img.naturalHeight} (ratio ${ratio.toFixed(2)}:1). The hero requires 2172 x 724 (3:1) — this image will be cropped.`);
      } else if (img.naturalWidth < 1600) {
        setImgWarning(`Image is only ${img.naturalWidth}px wide. Upload at least 2172px wide for a sharp banner.`);
      } else {
        setImgWarning(null);
      }
    };
    img.onerror = () => setImgWarning(null);
    img.src = url;
  };

  const setBg = (url: string) => { setDirty(true); setForm((p) => ({ ...p, image_url: url })); checkDimensions(url); };

  const set = (patch: Partial<HeroOverlayData>) => { setDirty(true); setOverlay((p) => ({ ...p, ...patch })); };
  const features = overlay.features || [];
  const setFeature = (i: number, patch: Partial<{ icon: string; label: string }>) =>
    set({ features: features.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });

  const openForm = (slide?: HeroSlide) => {
    if (slide) {
      setEditing(slide);
      setForm({
        title: slide.title,
        image_url: slide.image_url,
        mobile_image_url: slide.mobile_image_url || "",
        cta_text: slide.cta_text || "SHOP NOW",
        cta_link: slide.cta_link || "/products",
        sort_order: String(slide.sort_order || 0),
        is_active: slide.is_active ?? true,
      });
      setOverlay({ ...emptyHeroOverlay, ...((slide.overlay as HeroOverlayData) || {}) });
    } else {
      setEditing(null);
      setForm({ ...emptyForm });
      setOverlay({ ...emptyHeroOverlay, features: [] });
    }
    setDirty(false);
    setImgWarning(null);
    checkDimensions(slide?.image_url || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.image_url) {
      toast({ title: "Error", description: "Title and background image are required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const data: any = {
      title: form.title,
      subtitle: overlay.subheading || null,
      image_url: form.image_url,
      mobile_image_url: form.mobile_image_url || null,
      badge_label: overlay.badge_enabled ? `${overlay.badge_number || ""} ${overlay.badge_text || ""}`.trim() || null : null,
      cta_text: form.cta_text || "SHOP NOW",
      cta_link: form.cta_link || "/products",
      sort_order: parseInt(form.sort_order) || 0,
      is_active: form.is_active,
      overlay: { ...overlay, cta_text: form.cta_text },
    };
    if (editing) {
      await supabase.from("hero_slides").update(data).eq("id", editing.id);
      toast({ title: "Slide updated" });
    } else {
      await supabase.from("hero_slides").insert(data);
      toast({ title: "Slide created" });
    }
    setDirty(false); setShowForm(false); setEditing(null); fetchSlides(); setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    await supabase.from("hero_slides").delete().eq("id", id);
    toast({ title: "Slide deleted" });
    fetchSlides();
  };

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={closeForm}><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-xl font-semibold">{editing ? "Edit Hero Slider" : "Add Hero Slider"}</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* LEFT: form */}
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold">1. Basic Information</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Brand Heading</Label>
                    <Input value={overlay.brand || ""} onChange={(e) => set({ brand: e.target.value })} placeholder="HOUSKASE™" />
                  </div>
                  <div className="space-y-2">
                    <Label>Main Title</Label>
                    <Input value={overlay.heading || ""} onChange={(e) => set({ heading: e.target.value })} placeholder="ULTRA NON-WOVEN" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Subtitle</Label>
                  <Input value={overlay.subheading || ""} onChange={(e) => set({ subheading: e.target.value })} placeholder="CLEANING CLOTH ROLL" />
                </div>
                <div className="space-y-2">
                  <Label>Short Description <span className="text-xs text-muted-foreground">(ribbon text)</span></Label>
                  <Input value={overlay.tagline || ""} onChange={(e) => set({ tagline: e.target.value })} placeholder="Soft, Highly Absorbent & Reusable" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Button Text</Label>
                    <Input value={form.cta_text} onChange={(e) => setDirty(true); setForm((p) => ({ ...p, cta_text: e.target.value }))} placeholder="SHOP NOW" />
                  </div>
                  <div className="space-y-2">
                    <Label>Button URL</Label>
                    <Input value={form.cta_link} onChange={(e) => setDirty(true); setForm((p) => ({ ...p, cta_link: e.target.value }))} placeholder="/product/non-woven-cloth" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Text Alignment</Label>
                    <Select value={overlay.align || "left"} onValueChange={(v) => set({ align: v as "left" | "center" | "right" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Slide Name (internal)</Label>
                    <Input value={form.title} onChange={(e) => setDirty(true); setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Homepage banner 1" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold">2. Images</h3>
                <div className="space-y-2">
                  <Label>Background Image <span className="text-xs text-muted-foreground">(recommended 2172 × 724 px)</span></Label>
                  <ImageUpload value={form.image_url} onChange={setBg} bucket="product-images" />
                  {imgWarning && (
                    <p className="flex items-start gap-2 text-xs text-amber-600"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{imgWarning}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Mobile Image <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <ImageUpload value={form.mobile_image_url} onChange={(url) => setDirty(true); setForm((p) => ({ ...p, mobile_image_url: url }))} bucket="product-images" />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="shadow-card">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">3. Offer Badge</h3>
                    <Switch checked={!!overlay.badge_enabled} onCheckedChange={(c) => set({ badge_enabled: c })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Badge Number</Label>
                    <Input value={overlay.badge_number || ""} onChange={(e) => set({ badge_number: e.target.value })} placeholder="50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Badge Text</Label>
                    <Input value={overlay.badge_text || ""} onChange={(e) => set({ badge_text: e.target.value })} placeholder="TEAR-OFF SHEETS" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">4. Feature Icons</h3>
                    <Button type="button" variant="outline" size="sm" className="gap-1" disabled={features.length >= 4}
                      onClick={() => set({ features: [...features, { icon: "sparkles", label: "" }] })}>
                      <Plus className="h-3.5 w-3.5" />Add
                    </Button>
                  </div>
                  {features.length === 0 && <p className="text-xs text-muted-foreground">Add up to 4 feature points.</p>}
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select value={(f.icon as string) || "sparkles"} onValueChange={(v) => setFeature(i, { icon: v })}>
                        <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
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
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-card">
              <CardContent className="pt-6 space-y-4">
                <h3 className="font-semibold">5. Theme Colors</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Accent Colour</Label>
                    <div className="flex gap-2">
                      <Input type="color" className="w-14 p-1" value={overlay.accent || "#C8102E"} onChange={(e) => set({ accent: e.target.value })} />
                      <Input value={overlay.accent || "#C8102E"} onChange={(e) => set({ accent: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Text Theme</Label>
                    <Select value={overlay.theme || "dark"} onValueChange={(v) => set({ theme: v as "dark" | "light" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dark">Dark text</SelectItem>
                        <SelectItem value="light">Light text</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sort Order</Label>
                    <Input type="number" value={form.sort_order} onChange={(e) => setDirty(true); setForm((p) => ({ ...p, sort_order: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Label>Active on storefront</Label>
                  <Switch checked={form.is_active} onCheckedChange={(c) => setDirty(true); setForm((p) => ({ ...p, is_active: c }))} />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={closeForm}>Cancel</Button>
                  <Button className="flex-1 bg-gradient-accent" onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Publish"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: live preview */}
          <div className="space-y-4 lg:sticky lg:top-4 self-start">
            <Card className="shadow-card">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold">Live Preview</h3>
                <div className="relative w-full overflow-hidden rounded-lg border bg-muted" style={{ aspectRatio: "2172 / 724" }}>
                  {form.image_url && <SignedImage src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                  <HeroOverlay data={{ ...overlay, cta_text: form.cta_text }} />
                  <HeroBadge data={overlay} />
                </div>
                <p className="text-xs text-muted-foreground">This is exactly how the banner renders on desktop and tablet (2172 × 724).</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Manage homepage hero slider</p>
        <Button onClick={() => openForm()} className="bg-gradient-accent gap-2"><Plus className="h-4 w-4" />Add Slide</Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : slides.length === 0 ? (
            <div className="text-center py-12"><ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No slides yet</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Image</TableHead><TableHead>Title</TableHead><TableHead>Order</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {slides.map((slide) => (
                  <TableRow key={slide.id}>
                    <TableCell><SignedImage src={slide.image_url} alt="" className="w-20 h-12 object-cover rounded" /></TableCell>
                    <TableCell className="font-medium">{slide.title}</TableCell>
                    <TableCell>{slide.sort_order}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${slide.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{slide.is_active ? "Active" : "Inactive"}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openForm(slide)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(slide.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
