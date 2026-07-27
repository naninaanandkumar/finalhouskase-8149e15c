import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react";
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
}

export default function HomepageSections() {
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [sectionsRes, catsRes] = await Promise.all([
      supabase.from("homepage_sections").select("*").order("sort_order"),
      supabase.from("categories").select("id, name").eq("is_active", true).order("name"),
    ]);
    setSections(sectionsRes.data || []);
    setCategories(catsRes.data || []);
    setLoading(false);
  };

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
    setSaving(id);
    const { error } = await supabase.from("homepage_sections").update(updates).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      toast({ title: "Saved" });
    }
    setSaving(null);
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

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Homepage Sections</h1>
          
        </div>
        <Button onClick={addSection} className="bg-accent hover:bg-accent-hover">
          <Plus className="h-4 w-4 mr-2" /> Add Section
        </Button>
      </div>

      {sections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No sections yet. Click "Add Section" to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.id} className="shadow-sm">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={section.is_active}
                      onCheckedChange={(v) => updateSection(section.id, { is_active: v })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => deleteSection(section.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Section Title</Label>
                    <Input
                      value={section.title}
                      onChange={(e) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))}
                      onBlur={() => updateSection(section.id, { title: section.title })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Filter by Category (optional)</Label>
                    <Select
                      value={section.category_id || "all"}
                      onValueChange={(v) => updateSection(section.id, { category_id: v === "all" ? null : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
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
                  <Label className="text-xs mb-2 block">Background Image (optional)</Label>
                  <ImageUpload
                    value={section.background_image || ""}
                    onChange={(url) => updateSection(section.id, { background_image: url || null })}
                    bucket="product-images"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
