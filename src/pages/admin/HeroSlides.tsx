import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MoreHorizontal, Edit, Trash2, ArrowLeft, Loader2, Image as ImageIcon, Download, Upload, ArrowUp, ArrowDown, Copy, Camera, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SignedImage } from "@/components/common/SignedImage";
import { HeroOverlayEditor } from "@/components/admin/HeroOverlayEditor";
import { HeroOverlay, emptyHeroOverlay, heroCropStyle, type HeroOverlayData } from "@/components/home/HeroOverlay";
import { downloadHeroBundle, parseHeroBundle, validateHeroOverlay, validateHeroAccessibility, validateCtaLink } from "@/lib/heroSlides";
import { downloadPreviewShot, downloadPreviewShots } from "@/lib/heroPreviewShot";

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

type Schedule = { status?: "draft" | "published"; publish_at?: string | null; unpublish_at?: string | null };

const getSchedule = (o?: HeroOverlayData | null): Schedule => (o as any)?.schedule || { status: "published", publish_at: null, unpublish_at: null };

export function scheduleState(s: Schedule): { label: string; tone: "green" | "amber" | "gray" } {
  if (s.status === "draft") return { label: "Draft", tone: "gray" };
  const now = Date.now();
  if (s.publish_at && new Date(s.publish_at).getTime() > now) return { label: `Scheduled ${new Date(s.publish_at).toLocaleString()}`, tone: "amber" };
  if (s.unpublish_at && new Date(s.unpublish_at).getTime() < now) return { label: "Expired", tone: "gray" };
  return { label: "Published", tone: "green" };
}

export default function AdminHeroSlides() {
  const [activeTab, setActiveTab] = useState("slides");
  // Hero Slides
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", image_url: "", mobile_image_url: "", badge_label: "", cta_text: "Shop Now", cta_link: "/products", sort_order: "0", is_active: true, show_text: true, show_buttons: true });
  const [overlay, setOverlay] = useState<HeroOverlayData>(emptyHeroOverlay);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [slider, setSlider] = useState({ autoplay: true, interval: 2800, loop: true });
  const [savingSlider, setSavingSlider] = useState(false);
  const [schedule, setSchedule] = useState<Schedule>({ status: "published", publish_at: null, unpublish_at: null });
  const [shooting, setShooting] = useState(false);
  const formPreviewRef = useRef<HTMLDivElement | null>(null);
  const shotRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { toast } = useToast();
  const location = useLocation();

  // Clicking the sidebar link while the editor is open should return to the list.
  useEffect(() => { setShowForm(false); setEditing(null); }, [location.key]);

  const fetchSlides = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("hero_slides").select("*").order("sort_order");
    setSlides((data as HeroSlide[]) || []);
    setIsLoading(false);
  };

  const fetchSlider = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "hero_slider").maybeSingle();
    if (data?.value) setSlider((p) => ({ ...p, ...(data.value as any) }));
  };

  useEffect(() => { fetchSlides(); fetchSlider(); }, []);

  const saveSlider = async (next: typeof slider) => {
    setSlider(next);
    setSavingSlider(true);
    await supabase.from("site_settings").upsert({ key: "hero_slider", value: next as any }, { onConflict: "key" });
    setSavingSlider(false);
  };

  const reorder = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    setSlides(next);
    await Promise.all(next.map((s, i) => supabase.from("hero_slides").update({ sort_order: i }).eq("id", s.id)));
    fetchSlides();
  };

  const duplicateSlide = async (slide: HeroSlide) => {
    const { id, ...rest } = slide as any;
    await supabase.from("hero_slides").insert({ ...rest, title: `${slide.title} (copy)`, sort_order: slides.length });
    toast({ title: "Slide duplicated" });
    fetchSlides();
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const parsed = parseHeroBundle(importText);
      const rows = parsed.map((s, i) => ({ ...s, sort_order: slides.length + i }));
      const { error } = await supabase.from("hero_slides").insert(rows as any);
      if (error) throw new Error(error.message);
      toast({ title: `Imported ${rows.length} slide(s)` });
      setImportOpen(false);
      setImportText("");
      fetchSlides();
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    }
    setIsImporting(false);
  };

  const handleImportFile = async (file?: File | null) => {
    if (!file) return;
    setImportText(await file.text());
  };

  // Hero Slide handlers
  const openForm = (slide?: HeroSlide) => {
    if (slide) {
      setEditing(slide);
      setForm({ title: slide.title, subtitle: slide.subtitle || "", image_url: slide.image_url, mobile_image_url: slide.mobile_image_url || "", badge_label: slide.badge_label || "", cta_text: slide.cta_text || "Shop Now", cta_link: slide.cta_link || "/products", sort_order: String(slide.sort_order || 0), is_active: slide.is_active ?? true, show_text: (slide as any).show_text ?? true, show_buttons: (slide as any).show_buttons ?? true });
      setOverlay({ ...emptyHeroOverlay, ...((slide.overlay as HeroOverlayData) || {}) });
      setSchedule(getSchedule(slide.overlay));
    } else {
      setEditing(null);
      setForm({ title: "", subtitle: "", image_url: "", mobile_image_url: "", badge_label: "", cta_text: "Shop Now", cta_link: "/products", sort_order: "0", is_active: true, show_text: true, show_buttons: true });
      setOverlay({ ...emptyHeroOverlay, features: [] });
      setSchedule({ status: "published", publish_at: null, unpublish_at: null });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.image_url) { toast({ title: "Error", description: "Title and Image are required", variant: "destructive" }); return; }
    const blocking = validateHeroOverlay(overlay).filter((w) => w.level === "error");
    const linkErrors = validateCtaLink(form.cta_link).filter((w) => w.level === "error");
    if (linkErrors.length && !confirm(`Button link problem:\n\n${linkErrors.map((w) => `• ${w.message}`).join("\n")}\n\nSave anyway?`)) return;
    if (blocking.length && !confirm(`This banner may overflow on tablet:\n\n${blocking.map((w) => `• ${w.message}`).join("\n")}\n\nSave anyway?`)) return;
    setIsSaving(true);
    const overlayWithSchedule = { ...overlay, schedule };
    const data: any = { title: form.title, subtitle: form.subtitle || null, image_url: form.image_url, mobile_image_url: form.mobile_image_url || null, badge_label: form.badge_label || null, cta_text: form.cta_text || "Shop Now", cta_link: form.cta_link || "/products", sort_order: parseInt(form.sort_order) || 0, is_active: form.is_active, show_text: form.show_text, show_buttons: form.show_buttons, overlay: overlayWithSchedule };
    if (editing) {
      await supabase.from("hero_slides").update(data).eq("id", editing.id);
      toast({ title: "Slide Updated" });
    } else {
      await supabase.from("hero_slides").insert(data);
      toast({ title: "Slide Created" });
    }
    setShowForm(false); setEditing(null); fetchSlides(); setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    await supabase.from("hero_slides").delete().eq("id", id);
    toast({ title: "Slide Deleted" }); fetchSlides();
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-1 max-w-[220px]">
          <TabsTrigger value="slides" className="gap-2"><ImageIcon className="h-4 w-4" />Hero Slides</TabsTrigger>
        </TabsList>

        {/* ========== HERO SLIDES TAB ========== */}
        <TabsContent value="slides">
          <AnimatePresence mode="wait">
            {showForm ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><ArrowLeft className="h-5 w-5" /></Button>
                  <h2 className="text-xl font-semibold">{editing ? "Edit Slide" : "Add Hero Slide"}</h2>
                </div>
                <Card className="shadow-card">
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <Label>Slide Image * <span className="text-xs font-normal text-muted-foreground">(recommended 2172 × 724 px)</span></Label>
                      <ImageUpload value={form.image_url} onChange={(url) => setForm(p => ({...p, image_url: url}))} bucket="product-images" />
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile Image (optional, shown at 500px height on phones)</Label>
                      <ImageUpload value={form.mobile_image_url} onChange={(url) => setForm(p => ({...p, mobile_image_url: url}))} bucket="product-images" />
                    </div>

                    <HeroOverlayEditor value={overlay} onChange={setOverlay} />

                    {form.image_url && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Live preview (desktop / tablet ratio 2172 × 724)</Label>
                          <Button type="button" variant="outline" size="sm" className="gap-2" disabled={shooting}
                            onClick={async () => {
                              if (!formPreviewRef.current) return;
                              setShooting(true);
                              try { await downloadPreviewShot(formPreviewRef.current, form.title || "hero-slide"); }
                              catch (e: any) { toast({ title: "Screenshot failed", description: e.message, variant: "destructive" }); }
                              setShooting(false);
                            }}>
                            {shooting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}Export preview PNG
                          </Button>
                        </div>
                        <div ref={formPreviewRef} className="relative w-full overflow-hidden rounded-lg border bg-muted" style={{ aspectRatio: "2172 / 724" }}>
                          <SignedImage src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" style={heroCropStyle(overlay.crop)} />
                          <HeroOverlay data={overlay} />
                          <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-primary/25" style={{ margin: "4%" }} />
                        </div>
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} /></div>
                      <div className="space-y-2"><Label>Subtitle</Label><Input value={form.subtitle} onChange={e => setForm(p => ({...p, subtitle: e.target.value}))} /></div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Badge Label</Label><Input value={form.badge_label} onChange={e => setForm(p => ({...p, badge_label: e.target.value}))} placeholder="e.g. Top Seller" /></div>
                      <div className="space-y-2"><Label>CTA Text</Label><Input value={form.cta_text} onChange={e => setForm(p => ({...p, cta_text: e.target.value}))} /></div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>CTA Link</Label><Input value={form.cta_link} onChange={e => setForm(p => ({...p, cta_link: e.target.value}))} placeholder="/products?category=..." /></div>
                      <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm(p => ({...p, sort_order: e.target.value}))} /></div>
                    </div>
                    {validateCtaLink(form.cta_link).map((w, i) => (
                      <p key={i} className={`flex items-start gap-2 text-xs ${w.level === "error" ? "text-destructive" : "text-amber-600"}`}>
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{w.message}
                      </p>
                    ))}

                    <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                      <div>
                        <Label className="text-base">Draft &amp; scheduling</Label>
                        <p className="text-xs text-muted-foreground">Drafts never show on the storefront. Scheduled slides appear and disappear automatically.</p>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={schedule.status || "published"} onValueChange={(v) => setSchedule(p => ({ ...p, status: v as "draft" | "published" }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="published">Published</SelectItem>
                              <SelectItem value="draft">Draft</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Publish from</Label>
                          <Input type="datetime-local" value={schedule.publish_at || ""} onChange={e => setSchedule(p => ({ ...p, publish_at: e.target.value || null }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Hide after</Label>
                          <Input type="datetime-local" value={schedule.unpublish_at || ""} onChange={e => setSchedule(p => ({ ...p, unpublish_at: e.target.value || null }))} />
                        </div>
                      </div>
                      {schedule.publish_at && schedule.unpublish_at && new Date(schedule.unpublish_at) <= new Date(schedule.publish_at) && (
                        <p className="flex items-center gap-2 text-xs text-destructive"><AlertTriangle className="h-4 w-4" />"Hide after" must be later than "Publish from".</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={form.is_active} onCheckedChange={c => setForm(p => ({...p, is_active: c}))} /></div>
                    <div className="flex items-center justify-between"><Label>Show Slider Text</Label><Switch checked={form.show_text} onCheckedChange={c => setForm(p => ({...p, show_text: c}))} /></div>
                    <div className="flex items-center justify-between"><Label>Show Slider Buttons</Label><Switch checked={form.show_buttons} onCheckedChange={c => setForm(p => ({...p, show_buttons: c}))} /></div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                      <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-gradient-accent">{isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editing ? "Update" : "Create"}</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">Manage homepage hero slider</p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => downloadHeroBundle(slides)} disabled={slides.length === 0}><Download className="h-4 w-4" />Export all</Button>
                    <Button variant="outline" className="gap-2" disabled={shooting || slides.length === 0}
                      onClick={async () => {
                        setShooting(true);
                        try {
                          const nodes = slides.map(s => ({ node: shotRefs.current[s.id], title: s.title })).filter(n => n.node) as { node: HTMLElement; title: string }[];
                          await downloadPreviewShots(nodes);
                          toast({ title: `Exported ${nodes.length} preview image(s)` });
                        } catch (e: any) { toast({ title: "Screenshot failed", description: e.message, variant: "destructive" }); }
                        setShooting(false);
                      }}>
                      {shooting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}Export previews
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" />Import</Button>
                    <Button onClick={() => openForm()} className="bg-gradient-accent gap-2"><Plus className="h-4 w-4" />Add Slide</Button>
                  </div>
                </div>

                <Card className="shadow-card">
                  <CardContent className="pt-6 grid gap-4 sm:grid-cols-3 items-end">
                    <div className="flex items-center justify-between gap-4 sm:col-span-1">
                      <div>
                        <Label>Auto-advance</Label>
                        <p className="text-xs text-muted-foreground">Off = manual dots only</p>
                      </div>
                      <Switch checked={slider.autoplay} onCheckedChange={(c) => saveSlider({ ...slider, autoplay: c })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Slide duration: {(slider.interval / 1000).toFixed(1)}s</Label>
                      <input type="range" min={1500} max={10000} step={100} value={slider.interval} disabled={!slider.autoplay}
                        onChange={(e) => setSlider((p) => ({ ...p, interval: Number(e.target.value) }))}
                        onMouseUp={() => saveSlider(slider)} onTouchEnd={() => saveSlider(slider)}
                        className="w-full accent-primary disabled:opacity-50" />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <Label>Loop carousel</Label>
                        <p className="text-xs text-muted-foreground">{savingSlider ? "Saving…" : "Saved automatically"}</p>
                      </div>
                      <Switch checked={slider.loop} onCheckedChange={(c) => saveSlider({ ...slider, loop: c })} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : slides.length === 0 ? (
                      <div className="text-center py-12"><ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No slides yet</p></div>
                    ) : (
                      <Table>
                        <TableHeader><TableRow><TableHead>Image</TableHead><TableHead>Title</TableHead><TableHead>Badge</TableHead><TableHead>Order</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                        <TableBody>
                          {slides.map((slide, index) => (
                            <TableRow key={slide.id}>
                              <TableCell><SignedImage src={slide.image_url} alt="" className="w-20 h-12 object-cover rounded" /></TableCell>
                              <TableCell className="font-medium">{slide.title}</TableCell>
                              <TableCell>{slide.badge_label || "—"}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === 0} onClick={() => reorder(index, -1)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" disabled={index === slides.length - 1} onClick={() => reorder(index, 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></Button>
                                  <span className="text-xs text-muted-foreground">{slide.sort_order}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col gap-1 items-start">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${slide.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{slide.is_active ? "Active" : "Inactive"}</span>
                                  {(() => {
                                    const st = scheduleState(getSchedule(slide.overlay));
                                    const tone = st.tone === "green" ? "bg-green-100 text-green-700" : st.tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground";
                                    return <span className={`text-[11px] px-2 py-0.5 rounded ${tone}`}>{st.label}</span>;
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openForm(slide)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => duplicateSlide(slide)}><Copy className="h-4 w-4 mr-2" />Duplicate</DropdownMenuItem>
                                    <DropdownMenuItem onClick={async () => {
                                      const node = shotRefs.current[slide.id];
                                      if (!node) return;
                                      try { await downloadPreviewShot(node, slide.title); }
                                      catch (e: any) { toast({ title: "Screenshot failed", description: e.message, variant: "destructive" }); }
                                    }}><Camera className="h-4 w-4 mr-2" />Export preview PNG</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => downloadHeroBundle([slide], `hero-slide-${slide.id}.json`)}><Download className="h-4 w-4 mr-2" />Export JSON</DropdownMenuItem>
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

                {/* Off-screen render targets used for one-click preview screenshots */}
                <div aria-hidden className="pointer-events-none fixed -left-[10000px] top-0" style={{ width: 1086 }}>
                  {slides.map(slide => (
                    <div
                      key={slide.id}
                      ref={(el) => { shotRefs.current[slide.id] = el; }}
                      className="relative overflow-hidden bg-muted"
                      style={{ width: 1086, aspectRatio: "2172 / 724" }}
                    >
                      <SignedImage src={slide.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" style={heroCropStyle(slide.overlay?.crop)} />
                      {slide.overlay?.enabled && <HeroOverlay data={slide.overlay} />}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

      </Tabs>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Import hero slides</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Upload or paste a hero slides JSON export. Slides are added at the end of the carousel — nothing is overwritten.</p>
            <Input type="file" accept="application/json,.json" onChange={(e) => handleImportFile(e.target.files?.[0])} />
            <Textarea rows={10} className="font-mono text-xs" value={importText} onChange={(e) => setImportText(e.target.value)} placeholder='{"kind":"houskase.hero_slides","slides":[ ... ]}' />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={isImporting || !importText.trim()} className="bg-gradient-accent">
              {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
