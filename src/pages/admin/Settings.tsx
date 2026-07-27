import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Store, Bell, Truck, Palette, Save, Loader2, LayoutDashboard, Plus, Trash2, GripVertical, FileText, Smartphone,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface HomepageSection {
  id: string;
  title: string;
  category_id: string | null;
  background_image: string | null;
  sort_order: number;
  is_active: boolean;
  product_limit: number;
}

interface Category {
  id: string;
  name: string;
  slug?: string;
  parent_id?: string | null;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Store Settings
  const [storeSettings, setStoreSettings] = useState({
    storeName: "VendorHub Commerce",
    storeEmail: "sales@houskase.com",
    storePhone: "+91 92661 29195",
    storeAddress: "123 Business Street, City, Country",
    storeGSTIN: "",
    currency: "INR",
    taxRate: "18",
    gstEnabled: false,
    gstPricingMode: "exclusive",
    logoUrl: "",
    socialFacebook: "",
    socialInstagram: "",
    socialTwitter: "",
    socialYoutube: "",
    socialLinkedin: "",
    socialWhatsapp: "",
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    orderNotifications: true,
    rfqNotifications: true,
    chatNotifications: true,
    lowStockAlerts: true,
    emailNotifications: true,
  });

  // Shipping Settings
  const [shippingSettings, setShippingSettings] = useState({
    enableShipping: true,
    freeShippingThreshold: "500",
    defaultShippingRate: "10",
    weightMultiplier: "0.5",
  });

  const [announcementSettings, setAnnouncementSettings] = useState({
    enabled: true,
    items: [
      { id: "a1", text: "Free Shipping on Orders Above ₹499", code: "" },
      { id: "a2", text: "Flat 10% OFF on Prepaid Orders", code: "HYP15" },
    ],
  });

  const [heroMarqueeSettings, setHeroMarqueeSettings] = useState({
    enabled: true,
    items: [
      { id: "hm1", text: "🌿 100% Bamboo — Ultra-absorbent & lint-free" },
      { id: "hm2", text: "🚚 Free shipping across India on orders above ₹499" },
      { id: "hm3", text: "🏆 Trusted by 25,000+ homes & businesses" },
      { id: "hm4", text: "♻️ Reusable, washable & eco-friendly essentials" },
    ],
  });

  // CMS Pages
  const [pages, setPages] = useState({
    privacy_policy: "",
    terms_of_service: "",
    payment_terms: "",
    shipping_delivery: "",
    shipping_policy: "",
    return_policy: "",
  });

  // Bottom Menu
  interface BottomMenuItem {
    type: "page" | "category";
    id: string;
    label: string;
    icon: string;
    path: string;
    enabled: boolean;
  }
  const defaultPageItems: BottomMenuItem[] = [
    { type: "page", id: "home", label: "Home", icon: "Home", path: "/", enabled: true },
    { type: "page", id: "shop", label: "Shop", icon: "Grid3X3", path: "/products", enabled: true },
    { type: "page", id: "cart", label: "Cart", icon: "ShoppingCart", path: "/checkout", enabled: true },
    { type: "page", id: "account", label: "Account", icon: "User", path: "/dashboard", enabled: true },
    { type: "page", id: "rfq", label: "RFQ", icon: "FileText", path: "/rfq", enabled: false },
    { type: "page", id: "chat", label: "Chat", icon: "MessageSquare", path: "/chat", enabled: false },
    { type: "page", id: "help", label: "Help", icon: "HelpCircle", path: "/help", enabled: false },
    { type: "page", id: "track", label: "Track Order", icon: "Truck", path: "/track-order", enabled: false },
  ];
  const [bottomMenuItems, setBottomMenuItems] = useState<BottomMenuItem[]>(defaultPageItems);


  // Homepage Sections
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    const [storeRes, sectionsRes, catsRes, bottomMenuRes, ...pageResults] = await Promise.all([
      supabase.from("site_settings").select("*").eq("key", "store").maybeSingle(),
      supabase.from("homepage_sections").select("*").order("sort_order"),
      supabase.from("categories").select("id, name, slug, parent_id").eq("is_active", true).order("name"),
      supabase.from("site_settings").select("value").eq("key", "bottom_menu").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "announcement_bar").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "page_privacy_policy").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "page_terms_of_service").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "page_payment_terms").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "page_shipping_delivery").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "page_shipping_policy").maybeSingle(),
      supabase.from("site_settings").select("value").eq("key", "page_return_policy").maybeSingle(),
    ]);

    if (storeRes.data?.value) {
      const v = storeRes.data.value as any;
      setStoreSettings({
        storeName: v.storeName || "VendorHub Commerce",
        storeEmail: v.storeEmail || "sales@houskase.com",
        storePhone: v.storePhone || "+91 92661 29195",
        storeAddress: v.storeAddress || "",
        storeGSTIN: v.storeGSTIN || "",
        currency: v.currency || "INR",
        taxRate: v.taxRate || "18",
        gstEnabled: v.gstEnabled ?? false,
        gstPricingMode: v.gstPricingMode || "exclusive",
        logoUrl: v.logoUrl || "",
        socialFacebook: v.socialFacebook || "",
        socialInstagram: v.socialInstagram || "",
        socialTwitter: v.socialTwitter || "",
        socialYoutube: v.socialYoutube || "",
        socialLinkedin: v.socialLinkedin || "",
        socialWhatsapp: v.socialWhatsapp || "",
      });
    }

    if (pageResults[0]?.data?.value) {
      const v = pageResults[0].data.value as any;
      setAnnouncementSettings({
        enabled: v.enabled !== false,
        items: Array.isArray(v.items) && v.items.length ? v.items : announcementSettings.items,
      });
    }

    const { data: hmData } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "hero_marquee")
      .maybeSingle();
    if (hmData?.value) {
      const v = hmData.value as any;
      setHeroMarqueeSettings({
        enabled: v.enabled !== false,
        items: Array.isArray(v.items) && v.items.length ? v.items : heroMarqueeSettings.items,
      });
    }


    setSections(sectionsRes.data || []);
    const loadedCats = catsRes.data || [];
    setCategories(loadedCats);

    // Load bottom menu - merge saved items with defaults + parent categories
    const parentCats = loadedCats.filter((c: Category) => !c.parent_id);
    if (bottomMenuRes.data?.value) {
      const saved = (bottomMenuRes.data.value as any).items as BottomMenuItem[];
      if (saved && Array.isArray(saved)) {
        // Merge: keep saved state, add any new page defaults or new parent categories
        const savedIds = new Set(saved.map((i: BottomMenuItem) => i.id));
        const merged = [...saved];
        defaultPageItems.forEach(p => { if (!savedIds.has(p.id)) merged.push(p); });
        parentCats.forEach((c: Category) => {
          if (!savedIds.has(`cat-${c.id}`)) {
            merged.push({ type: "category", id: `cat-${c.id}`, label: c.name, icon: "Grid3X3", path: `/products?category=${c.slug || c.id}`, enabled: false });
          }
        });
        setBottomMenuItems(merged);
      }
    } else {
      // First time: build from defaults + parent categories
      const catItems: BottomMenuItem[] = parentCats.map((c: Category) => ({
        type: "category" as const, id: `cat-${c.id}`, label: c.name, icon: "Grid3X3", path: `/products?category=${c.slug || c.id}`, enabled: false,
      }));
      setBottomMenuItems([...defaultPageItems, ...catItems]);
    }

    // Load CMS pages
    setPages({
      privacy_policy: (pageResults[1]?.data?.value as any)?.content || "",
      terms_of_service: (pageResults[2]?.data?.value as any)?.content || "",
      payment_terms: (pageResults[3]?.data?.value as any)?.content || "",
      shipping_delivery: (pageResults[4]?.data?.value as any)?.content || "",
      shipping_policy: (pageResults[5]?.data?.value as any)?.content || "",
      return_policy: (pageResults[6]?.data?.value as any)?.content || "",
    });
    
    setSectionsLoading(false);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    await Promise.all([
      supabase.from("site_settings").upsert({ key: "store", value: storeSettings as any }, { onConflict: "key" }),
      supabase.from("site_settings").upsert({ key: "bottom_menu", value: { items: bottomMenuItems } as any }, { onConflict: "key" }),
      supabase.from("site_settings").upsert({ key: "announcement_bar", value: announcementSettings as any }, { onConflict: "key" }),
      supabase.from("site_settings").upsert({ key: "hero_marquee", value: heroMarqueeSettings as any }, { onConflict: "key" }),
      supabase.from("site_settings").upsert({ key: "page_privacy_policy", value: { content: pages.privacy_policy } as any }, { onConflict: "key" }),
      supabase.from("site_settings").upsert({ key: "page_terms_of_service", value: { content: pages.terms_of_service } as any }, { onConflict: "key" }),
      supabase.from("site_settings").upsert({ key: "page_payment_terms", value: { content: pages.payment_terms } as any }, { onConflict: "key" }),
      supabase.from("site_settings").upsert({ key: "page_shipping_delivery", value: { content: pages.shipping_delivery } as any }, { onConflict: "key" }),
      supabase.from("site_settings").upsert({ key: "page_shipping_policy", value: { content: pages.shipping_policy } as any }, { onConflict: "key" }),
      supabase.from("site_settings").upsert({ key: "page_return_policy", value: { content: pages.return_policy } as any }, { onConflict: "key" }),
    ]);
    toast({ title: "Settings Saved", description: "Your settings have been updated successfully." });
    setIsSaving(false);
  };

  // Homepage Sections CRUD
  const addSection = async () => {
    const { data, error } = await supabase
      .from("homepage_sections")
      .insert({ title: "New Section", sort_order: sections.length })
      .select()
      .single();
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setSections(prev => [...prev, data]);
    toast({ title: "Section Added" });
  };

  const updateSection = async (id: string, updates: Partial<HomepageSection>) => {
    const { error } = await supabase.from("homepage_sections").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }
  };

  const deleteSection = async (id: string) => {
    const { error } = await supabase.from("homepage_sections").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSections(prev => prev.filter(s => s.id !== id));
      toast({ title: "Section Deleted" });
    }
  };

  const currencySymbol = storeSettings.currency === "INR" ? "₹" : "$";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Settings</h1>
          
        </div>
        <Button onClick={handleSaveSettings} className="bg-gradient-accent gap-2" disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="store" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-secondary/50 rounded-lg">
          <TabsTrigger value="store" className="gap-2 flex-1 min-w-[100px]">
            <Store className="h-4 w-4" />
            Store
          </TabsTrigger>
          <TabsTrigger value="homepage" className="gap-2 flex-1 min-w-[100px]">
            <LayoutDashboard className="h-4 w-4" />
            Homepage
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 flex-1 min-w-[100px]">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2 flex-1 min-w-[100px]">
            <Truck className="h-4 w-4" />
            Shipping
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 flex-1 min-w-[100px]">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="pages" className="gap-2 flex-1 min-w-[100px]">
            <FileText className="h-4 w-4" />
            Pages
          </TabsTrigger>
          <TabsTrigger value="bottom-menu" className="gap-2 flex-1 min-w-[100px]">
            <Smartphone className="h-4 w-4" />
            Bottom Menu
          </TabsTrigger>
        </TabsList>

        {/* Store Settings */}
        <TabsContent value="store">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Store Information
              </CardTitle>
              
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo Upload */}
              <div className="space-y-2">
                <Label>Store Logo</Label>
                <p className="text-sm text-muted-foreground">Upload your store logo. It will appear on Header, Footer, Login, and Invoices.</p>
                <ImageUpload value={storeSettings.logoUrl} onChange={(url) => setStoreSettings(prev => ({ ...prev, logoUrl: url }))} bucket="product-images" />
              </div>
              <Separator />
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input id="storeName" value={storeSettings.storeName} onChange={(e) => setStoreSettings(prev => ({ ...prev, storeName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeEmail">Contact Email</Label>
                  <Input id="storeEmail" type="email" value={storeSettings.storeEmail} onChange={(e) => setStoreSettings(prev => ({ ...prev, storeEmail: e.target.value }))} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="storePhone">Phone Number</Label>
                  <Input id="storePhone" value={storeSettings.storePhone} onChange={(e) => setStoreSettings(prev => ({ ...prev, storePhone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={storeSettings.currency} onValueChange={(v) => setStoreSettings(prev => ({ ...prev, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeAddress">Store Address</Label>
                <Textarea id="storeAddress" value={storeSettings.storeAddress} onChange={(e) => setStoreSettings(prev => ({ ...prev, storeAddress: e.target.value }))} rows={2} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
                  <Input id="taxRate" type="number" value={storeSettings.taxRate} onChange={(e) => setStoreSettings(prev => ({ ...prev, taxRate: e.target.value }))} className="w-32" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeGSTIN">GSTIN Number</Label>
                  <Input id="storeGSTIN" placeholder="e.g. 23AAAAA0000A1Z5" value={storeSettings.storeGSTIN} onChange={(e) => setStoreSettings(prev => ({ ...prev, storeGSTIN: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">Displayed on invoices and website footer</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-4">
                  <div><Label>Default GST Enabled</Label><p className="text-xs text-muted-foreground">Default setting for new GST display/calculation.</p></div>
                  <Switch checked={storeSettings.gstEnabled} onCheckedChange={(checked) => setStoreSettings(prev => ({ ...prev, gstEnabled: checked }))} />
                </div>
                <div className="space-y-2">
                  <Label>Default GST Mode</Label>
                  <Select value={storeSettings.gstPricingMode} onValueChange={(v) => setStoreSettings(prev => ({ ...prev, gstPricingMode: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inclusive">GST Inclusive</SelectItem>
                      <SelectItem value="exclusive">GST Exclusive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div><Label>Top Announcement Header</Label><p className="text-sm text-muted-foreground">Manually edit the moving top header offers.</p></div>
                  <Switch checked={announcementSettings.enabled} onCheckedChange={(checked) => setAnnouncementSettings(prev => ({ ...prev, enabled: checked }))} />
                </div>
                {announcementSettings.items.map((item, idx) => (
                  <div key={item.id || idx} className="grid sm:grid-cols-[1fr_180px_auto] gap-2">
                    <Input value={item.text} placeholder="Announcement text" onChange={(e) => setAnnouncementSettings(prev => ({ ...prev, items: prev.items.map((x, i) => i === idx ? { ...x, text: e.target.value } : x) }))} />
                    <Input value={item.code || ""} placeholder="Code optional" onChange={(e) => setAnnouncementSettings(prev => ({ ...prev, items: prev.items.map((x, i) => i === idx ? { ...x, code: e.target.value } : x) }))} />
                    <Button type="button" variant="outline" size="icon" onClick={() => setAnnouncementSettings(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setAnnouncementSettings(prev => ({ ...prev, items: [...prev.items, { id: `a-${Date.now()}`, text: "", code: "" }] }))}><Plus className="h-4 w-4 mr-1" /> Add Announcement</Button>
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div><Label>Hero Marquee (below hero slider)</Label><p className="text-sm text-muted-foreground">Running text ribbon that appears just below the hero slider on the homepage.</p></div>
                  <Switch checked={heroMarqueeSettings.enabled} onCheckedChange={(checked) => setHeroMarqueeSettings(prev => ({ ...prev, enabled: checked }))} />
                </div>
                {heroMarqueeSettings.items.map((item, idx) => (
                  <div key={item.id || idx} className="grid grid-cols-[1fr_auto] gap-2">
                    <Input value={item.text} placeholder="Marquee text (emoji supported)" onChange={(e) => setHeroMarqueeSettings(prev => ({ ...prev, items: prev.items.map((x, i) => i === idx ? { ...x, text: e.target.value } : x) }))} />
                    <Button type="button" variant="outline" size="icon" onClick={() => setHeroMarqueeSettings(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setHeroMarqueeSettings(prev => ({ ...prev, items: [...prev.items, { id: `hm-${Date.now()}`, text: "" }] }))}><Plus className="h-4 w-4 mr-1" /> Add Marquee Item</Button>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-3">Social Media Links</h3>
                <p className="text-sm text-muted-foreground mb-4">Add your social media URLs to display in the footer.</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Facebook</Label>
                    <Input placeholder="https://facebook.com/yourpage" value={storeSettings.socialFacebook} onChange={(e) => setStoreSettings(prev => ({ ...prev, socialFacebook: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram</Label>
                    <Input placeholder="https://instagram.com/yourpage" value={storeSettings.socialInstagram} onChange={(e) => setStoreSettings(prev => ({ ...prev, socialInstagram: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter / X</Label>
                    <Input placeholder="https://twitter.com/yourpage" value={storeSettings.socialTwitter} onChange={(e) => setStoreSettings(prev => ({ ...prev, socialTwitter: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube</Label>
                    <Input placeholder="https://youtube.com/yourchannel" value={storeSettings.socialYoutube} onChange={(e) => setStoreSettings(prev => ({ ...prev, socialYoutube: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    <Input placeholder="https://linkedin.com/company/yourpage" value={storeSettings.socialLinkedin} onChange={(e) => setStoreSettings(prev => ({ ...prev, socialLinkedin: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input placeholder="https://wa.me/919999999999" value={storeSettings.socialWhatsapp} onChange={(e) => setStoreSettings(prev => ({ ...prev, socialWhatsapp: e.target.value }))} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Homepage Product Sections */}
        <TabsContent value="homepage">
          <div className="space-y-6">
            {/* Homepage Sections Management */}
            <Card className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Product Sections</CardTitle>
                    
                  </div>
                  <Button onClick={addSection} size="sm" className="bg-accent hover:bg-accent-hover">
                    <Plus className="h-4 w-4 mr-1" /> Add Section
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sectionsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : sections.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sections yet. Click "Add Section" to create one.</p>
                ) : (
                  <div className="space-y-4">
                    {sections.map((section) => (
                      <div key={section.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{section.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch checked={section.is_active} onCheckedChange={(v) => updateSection(section.id, { is_active: v })} />
                            <Button variant="ghost" size="icon" onClick={() => deleteSection(section.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Section Title</Label>
                            <Input
                              value={section.title}
                              onChange={(e) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                              onBlur={() => updateSection(section.id, { title: section.title })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Category Filter</Label>
                            <Select value={section.category_id || "all"} onValueChange={(v) => updateSection(section.id, { category_id: v === "all" ? null : v })}>
                              <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map(cat => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Product Limit</Label>
                            <Input
                              type="number"
                              value={section.product_limit}
                              onChange={(e) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, product_limit: parseInt(e.target.value) || 12 } : s))}
                              onBlur={() => updateSection(section.id, { product_limit: section.product_limit })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Sort Order</Label>
                            <Input
                              type="number"
                              value={section.sort_order}
                              onChange={(e) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, sort_order: parseInt(e.target.value) || 0 } : s))}
                              onBlur={() => updateSection(section.id, { sort_order: section.sort_order })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">Background Image (optional)</Label>
                          <ImageUpload value={section.background_image || ""} onChange={(url) => updateSection(section.id, { background_image: url || null })} bucket="product-images" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notification Preferences</CardTitle>
              
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "orderNotifications", label: "New Order Notifications", desc: "Get notified when new orders are placed" },
                { key: "rfqNotifications", label: "RFQ Notifications", desc: "Get notified when new RFQ requests arrive" },
                { key: "chatNotifications", label: "Chat Notifications", desc: "Get notified when customers send messages" },
                { key: "lowStockAlerts", label: "Low Stock Alerts", desc: "Get alerts when product stock is low" },
                { key: "emailNotifications", label: "Email Notifications", desc: "Receive notifications via email" },
              ].map((item, idx) => (
                <div key={item.key}>
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={(notificationSettings as any)[item.key]}
                      onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, [item.key]: checked }))}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Settings */}
        <TabsContent value="shipping">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" /> Shipping Configuration</CardTitle>
              
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div><Label>Enable Shipping</Label><p className="text-sm text-muted-foreground">Calculate shipping for orders</p></div>
                <Switch checked={shippingSettings.enableShipping} onCheckedChange={(checked) => setShippingSettings(prev => ({ ...prev, enableShipping: checked }))} />
              </div>
              <Separator />
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Free Shipping Threshold ({currencySymbol})</Label>
                  <Input type="number" value={shippingSettings.freeShippingThreshold} onChange={(e) => setShippingSettings(prev => ({ ...prev, freeShippingThreshold: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Default Shipping Rate ({currencySymbol})</Label>
                  <Input type="number" value={shippingSettings.defaultShippingRate} onChange={(e) => setShippingSettings(prev => ({ ...prev, defaultShippingRate: e.target.value }))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Appearance Settings</CardTitle>
              
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Theme customization coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages / CMS */}
        <TabsContent value="pages">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Content Pages</CardTitle>
              
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "payment_terms", label: "Payment Terms", path: "/payment-terms" },
                { key: "shipping_delivery", label: "Shipping & Delivery", path: "/shipping-delivery" },
                { key: "privacy_policy", label: "Privacy Policy", path: "/privacy-policy" },
                { key: "terms_of_service", label: "Terms of Service", path: "/terms-of-service" },
                { key: "shipping_policy", label: "Shipping Policy", path: "/shipping-policy" },
                { key: "return_policy", label: "Refund and Cancellation", path: "/return-policy" },
              ].map((page, idx) => (
                <div key={page.key}>
                  {idx > 0 && <Separator className="mb-4" />}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">{page.label}</Label>
                      <a href={page.path} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">Preview →</a>
                    </div>
                    <Textarea
                      value={(pages as any)[page.key]}
                      onChange={(e) => setPages(prev => ({ ...prev, [page.key]: e.target.value }))}
                      rows={8}
                      placeholder={`Enter ${page.label} content (HTML supported)...`}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bottom Menu */}
        <TabsContent value="bottom-menu">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Mobile Bottom Navigation
              </CardTitle>
              <CardDescription>Select which pages and parent categories to show in the mobile bottom menu. No limit — enabled items with sub-categories will show as dropdown menus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-sm mb-3">Pages</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {bottomMenuItems.filter(i => i.type === "page").map(item => (
                    <label key={item.id} className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-secondary/50">
                      <Checkbox
                        checked={item.enabled}
                        onCheckedChange={(checked) => {
                          setBottomMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, enabled: !!checked } : i));
                        }}
                      />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-3">Parent Categories</h3>
                <p className="text-xs text-muted-foreground mb-3">These will appear as menu items. Sub-categories will show as dropdown.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {bottomMenuItems.filter(i => i.type === "category").map(item => (
                    <label key={item.id} className="flex items-center gap-2 p-2 border rounded-md cursor-pointer hover:bg-secondary/50">
                      <Checkbox
                        checked={item.enabled}
                        onCheckedChange={(checked) => {
                          setBottomMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, enabled: !!checked } : i));
                        }}
                      />
                      <span className="text-sm">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-3">Custom Labels</h3>
                <p className="text-xs text-muted-foreground mb-3">Edit display labels for enabled items.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {bottomMenuItems.filter(i => i.enabled).map(item => (
                    <div key={item.id} className="space-y-1">
                      <Label className="text-xs">{item.type === "page" ? item.id : item.label}</Label>
                      <Input
                        value={item.label}
                        onChange={(e) => setBottomMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, label: e.target.value } : i))}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
