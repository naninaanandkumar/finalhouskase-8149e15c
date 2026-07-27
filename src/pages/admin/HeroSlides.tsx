import { useState, useEffect } from "react";
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
import { Plus, MoreHorizontal, Edit, Trash2, ArrowLeft, Loader2, Image as ImageIcon, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SignedImage } from "@/components/common/SignedImage";

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
}

interface PromoBanner {
  id: string;
  title: string;
  offer_text: string | null;
  image_url: string;
  mobile_image_url?: string | null;
  link: string | null;
  sort_order: number | null;
  is_active: boolean | null;
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
  
  // Promo Banners
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [showBannerForm, setShowBannerForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [isSavingBanner, setIsSavingBanner] = useState(false);
  const [bannerForm, setBannerForm] = useState({ title: "", offer_text: "", image_url: "", mobile_image_url: "", link: "/products", sort_order: "0", is_active: true });
  const [showPromoBannersOnHomepage, setShowPromoBannersOnHomepage] = useState(true);
  
  const { toast } = useToast();

  const fetchSlides = async () => {
    setIsLoading(true);
    const { data } = await supabase.from("hero_slides").select("*").order("sort_order");
    setSlides((data as HeroSlide[]) || []);
    setIsLoading(false);
  };

  const fetchBanners = async () => {
    setBannersLoading(true);
    const { data } = await supabase.from("promo_banners").select("*").order("sort_order");
    setBanners((data as PromoBanner[]) || []);
    setBannersLoading(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "homepage").maybeSingle();
    if (data?.value) {
      const v = data.value as any;
      if (v.show_promo_banners === false) setShowPromoBannersOnHomepage(false);
    }
  };

  const togglePromoBanners = async (checked: boolean) => {
    setShowPromoBannersOnHomepage(checked);
    const { data: existing } = await supabase.from("site_settings").select("id, value").eq("key", "homepage").maybeSingle();
    const currentValue = (existing?.value as any) || {};
    const newValue = { ...currentValue, show_promo_banners: checked };
    if (existing) {
      await supabase.from("site_settings").update({ value: newValue }).eq("id", existing.id);
    } else {
      await supabase.from("site_settings").insert({ key: "homepage", value: newValue });
    }
    toast({ title: checked ? "Promo Banners Enabled" : "Promo Banners Disabled" });
  };

  useEffect(() => { fetchSlides(); fetchBanners(); fetchSettings(); }, []);

  // Hero Slide handlers
  const openForm = (slide?: HeroSlide) => {
    if (slide) {
      setEditing(slide);
      setForm({ title: slide.title, subtitle: slide.subtitle || "", image_url: slide.image_url, mobile_image_url: slide.mobile_image_url || "", badge_label: slide.badge_label || "", cta_text: slide.cta_text || "Shop Now", cta_link: slide.cta_link || "/products", sort_order: String(slide.sort_order || 0), is_active: slide.is_active ?? true, show_text: (slide as any).show_text ?? true, show_buttons: (slide as any).show_buttons ?? true });
    } else {
      setEditing(null);
      setForm({ title: "", subtitle: "", image_url: "", mobile_image_url: "", badge_label: "", cta_text: "Shop Now", cta_link: "/products", sort_order: "0", is_active: true, show_text: true, show_buttons: true });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.image_url) { toast({ title: "Error", description: "Title and Image are required", variant: "destructive" }); return; }
    setIsSaving(true);
    const data: any = { title: form.title, subtitle: form.subtitle || null, image_url: form.image_url, mobile_image_url: form.mobile_image_url || null, badge_label: form.badge_label || null, cta_text: form.cta_text || "Shop Now", cta_link: form.cta_link || "/products", sort_order: parseInt(form.sort_order) || 0, is_active: form.is_active, show_text: form.show_text, show_buttons: form.show_buttons };
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

  // Promo Banner handlers
  const openBannerForm = (b?: PromoBanner) => {
    if (b) {
      setEditingBanner(b);
      setBannerForm({ title: b.title, offer_text: b.offer_text || "", image_url: b.image_url, mobile_image_url: b.mobile_image_url || "", link: b.link || "/products", sort_order: String(b.sort_order || 0), is_active: b.is_active ?? true });
    } else {
      setEditingBanner(null);
      setBannerForm({ title: "", offer_text: "", image_url: "", mobile_image_url: "", link: "/products", sort_order: "0", is_active: true });
    }
    setShowBannerForm(true);
  };

  const handleSaveBanner = async () => {
    if (!bannerForm.title || !bannerForm.image_url) { toast({ title: "Error", description: "Title and Image required", variant: "destructive" }); return; }
    setIsSavingBanner(true);
    const data: any = { title: bannerForm.title, offer_text: bannerForm.offer_text || null, image_url: bannerForm.image_url, mobile_image_url: bannerForm.mobile_image_url || null, link: bannerForm.link || "/products", sort_order: parseInt(bannerForm.sort_order) || 0, is_active: bannerForm.is_active };
    if (editingBanner) {
      await supabase.from("promo_banners").update(data).eq("id", editingBanner.id);
      toast({ title: "Banner Updated" });
    } else {
      await supabase.from("promo_banners").insert(data);
      toast({ title: "Banner Created" });
    }
    setShowBannerForm(false); setEditingBanner(null); fetchBanners(); setIsSavingBanner(false);
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    await supabase.from("promo_banners").delete().eq("id", id);
    toast({ title: "Banner Deleted" }); fetchBanners();
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="slides" className="gap-2"><ImageIcon className="h-4 w-4" />Hero Slides</TabsTrigger>
          <TabsTrigger value="banners" className="gap-2"><Megaphone className="h-4 w-4" />Promo Banners</TabsTrigger>
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
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} /></div>
                      <div className="space-y-2"><Label>Subtitle</Label><Input value={form.subtitle} onChange={e => setForm(p => ({...p, subtitle: e.target.value}))} /></div>
                    </div>
                    <div className="space-y-2">
                      <Label>Slide Image *</Label>
                      <ImageUpload value={form.image_url} onChange={(url) => setForm(p => ({...p, image_url: url}))} bucket="product-images" />
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile Image (optional, shown at 500px height on phones)</Label>
                      <ImageUpload value={form.mobile_image_url} onChange={(url) => setForm(p => ({...p, mobile_image_url: url}))} bucket="product-images" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Badge Label</Label><Input value={form.badge_label} onChange={e => setForm(p => ({...p, badge_label: e.target.value}))} placeholder="e.g. Top Seller" /></div>
                      <div className="space-y-2"><Label>CTA Text</Label><Input value={form.cta_text} onChange={e => setForm(p => ({...p, cta_text: e.target.value}))} /></div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>CTA Link</Label><Input value={form.cta_link} onChange={e => setForm(p => ({...p, cta_link: e.target.value}))} placeholder="/products?category=..." /></div>
                      <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={form.sort_order} onChange={e => setForm(p => ({...p, sort_order: e.target.value}))} /></div>
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
                        <TableHeader><TableRow><TableHead>Image</TableHead><TableHead>Title</TableHead><TableHead>Badge</TableHead><TableHead>Order</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                        <TableBody>
                          {slides.map(slide => (
                            <TableRow key={slide.id}>
                              <TableCell><SignedImage src={slide.image_url} alt="" className="w-20 h-12 object-cover rounded" /></TableCell>
                              <TableCell className="font-medium">{slide.title}</TableCell>
                              <TableCell>{slide.badge_label || "—"}</TableCell>
                              <TableCell>{slide.sort_order}</TableCell>
                              <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded ${slide.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{slide.is_active ? "Active" : "Inactive"}</span></TableCell>
                              <TableCell>
                                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openForm(slide)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem onClick={() => handleDelete(slide.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        {/* ========== PROMO BANNERS TAB ========== */}
        <TabsContent value="banners">
          <AnimatePresence mode="wait">
            {showBannerForm ? (
              <motion.div key="bform" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => setShowBannerForm(false)}><ArrowLeft className="h-5 w-5" /></Button>
                  <h2 className="text-xl font-semibold">{editingBanner ? "Edit Banner" : "Add Promo Banner"}</h2>
                </div>
                <Card className="shadow-card">
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Title *</Label><Input value={bannerForm.title} onChange={e => setBannerForm(p => ({...p, title: e.target.value}))} /></div>
                      <div className="space-y-2"><Label>Offer Text</Label><Input value={bannerForm.offer_text} onChange={e => setBannerForm(p => ({...p, offer_text: e.target.value}))} placeholder="UPTO 40% OFF" /></div>
                    </div>
                    <div className="space-y-2">
                      <Label>Banner Image *</Label>
                      <ImageUpload value={bannerForm.image_url} onChange={(url) => setBannerForm(p => ({...p, image_url: url}))} bucket="product-images" />
                    </div>
                    <div className="space-y-2">
                      <Label>Mobile Banner Image (optional, shown at 500px height on phones)</Label>
                      <ImageUpload value={bannerForm.mobile_image_url} onChange={(url) => setBannerForm(p => ({...p, mobile_image_url: url}))} bucket="product-images" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Link</Label><Input value={bannerForm.link} onChange={e => setBannerForm(p => ({...p, link: e.target.value}))} placeholder="/products?category=..." /></div>
                      <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={bannerForm.sort_order} onChange={e => setBannerForm(p => ({...p, sort_order: e.target.value}))} /></div>
                    </div>
                    <div className="flex items-center justify-between"><Label>Active</Label><Switch checked={bannerForm.is_active} onCheckedChange={c => setBannerForm(p => ({...p, is_active: c}))} /></div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => setShowBannerForm(false)} className="flex-1">Cancel</Button>
                      <Button onClick={handleSaveBanner} disabled={isSavingBanner} className="flex-1 bg-gradient-accent">{isSavingBanner && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingBanner ? "Update" : "Create"}</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="blist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-muted-foreground text-sm">Manage homepage promotional banners</p>
                    <div className="flex items-center gap-2">
                      <Switch checked={showPromoBannersOnHomepage} onCheckedChange={togglePromoBanners} />
                      <Label className="text-xs text-muted-foreground">Show on Homepage</Label>
                    </div>
                  </div>
                  <Button onClick={() => openBannerForm()} className="bg-gradient-accent gap-2"><Plus className="h-4 w-4" />Add Banner</Button>
                </div>
                <Card className="shadow-card">
                  <CardContent className="p-0">
                    {bannersLoading ? (
                      <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : banners.length === 0 ? (
                      <div className="text-center py-12"><Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p className="text-muted-foreground">No banners yet</p></div>
                    ) : (
                      <Table>
                        <TableHeader><TableRow><TableHead>Image</TableHead><TableHead>Title</TableHead><TableHead>Offer</TableHead><TableHead>Order</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                        <TableBody>
                          {banners.map(b => (
                            <TableRow key={b.id}>
                              <TableCell><SignedImage src={b.image_url} alt="" className="w-20 h-12 object-cover rounded" /></TableCell>
                              <TableCell className="font-medium">{b.title}</TableCell>
                              <TableCell>{b.offer_text || "—"}</TableCell>
                              <TableCell>{b.sort_order}</TableCell>
                              <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded ${b.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{b.is_active ? "Active" : "Inactive"}</span></TableCell>
                              <TableCell>
                                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                  <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openBannerForm(b)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem onClick={() => handleDeleteBanner(b.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>
      </Tabs>
    </div>
  );
}
