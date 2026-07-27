import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CustomTab {
  id: string;
  product_id: string;
  tab_title: string;
  tab_content: string;
  sort_order: number | null;
  is_active: boolean | null;
  product?: { name: string } | null;
}

interface Product {
  id: string;
  name: string;
}

export default function AdminCustomTabs() {
  const { toast } = useToast();
  const [tabs, setTabs] = useState<CustomTab[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<CustomTab | null>(null);

  const [productId, setProductId] = useState("");
  const [tabTitle, setTabTitle] = useState("");
  const [tabContent, setTabContent] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    const [tabsRes, prodsRes] = await Promise.all([
      supabase
        .from("product_custom_tabs")
        .select("*, product:products(name)")
        .order("sort_order"),
      supabase
        .from("products")
        .select("id, name")
        .eq("is_active", true)
        .order("name")
        .limit(200),
    ]);
    setTabs((tabsRes.data as unknown as CustomTab[]) || []);
    setProducts(prodsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setProductId("");
    setTabTitle("");
    setTabContent("");
    setSortOrder(0);
    setEditingTab(null);
  };

  const openEdit = (tab: CustomTab) => {
    setEditingTab(tab);
    setProductId(tab.product_id);
    setTabTitle(tab.tab_title);
    setTabContent(tab.tab_content);
    setSortOrder(tab.sort_order || 0);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!productId || !tabTitle.trim() || !tabContent.trim()) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const data = {
      product_id: productId,
      tab_title: tabTitle,
      tab_content: tabContent,
      sort_order: sortOrder,
    };

    if (editingTab) {
      const { error } = await supabase.from("product_custom_tabs").update(data).eq("id", editingTab.id);
      if (error) { toast({ title: "Error updating tab", variant: "destructive" }); return; }
      toast({ title: "Tab updated" });
    } else {
      const { error } = await supabase.from("product_custom_tabs").insert(data);
      if (error) { toast({ title: "Error creating tab", variant: "destructive" }); return; }
      toast({ title: "Tab created" });
    }
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("product_custom_tabs").delete().eq("id", id);
    toast({ title: "Tab deleted" });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Custom Product Tabs</h1>
          <p className="text-sm text-muted-foreground">Add extra information tabs to specific products</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-accent">
              <Plus className="h-4 w-4 mr-2" /> Add Tab
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTab ? "Edit Tab" : "Add New Tab"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Product</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tab Title</Label>
                  <Input value={tabTitle} onChange={(e) => setTabTitle(e.target.value)} placeholder="e.g. Installation Guide" />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Content (HTML supported)</Label>
                <Textarea value={tabContent} onChange={(e) => setTabContent(e.target.value)} rows={6} placeholder="Tab content..." />
              </div>
              <Button className="w-full bg-gradient-accent" onClick={handleSave}>
                {editingTab ? "Update Tab" : "Create Tab"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : tabs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No custom tabs created yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tabs.map((tab) => (
            <Card key={tab.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{tab.tab_title}</p>
                  <p className="text-xs text-muted-foreground">
                    Product: {tab.product?.name || "Unknown"} • Order: {tab.sort_order}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(tab)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(tab.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
