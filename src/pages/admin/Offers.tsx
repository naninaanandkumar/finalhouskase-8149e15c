import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Tag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Offer {
  id: string;
  offer_type: string;
  badge_label: string;
  description: string;
  details_url: string | null;
  is_active: boolean;
  sort_order: number | null;
  category_id: string | null;
  category?: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminOffers() {
  const { toast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);

  // Form state
  const [offerType, setOfferType] = useState("GST");
  const [badgeLabel, setBadgeLabel] = useState("");
  const [description, setDescription] = useState("");
  const [detailsUrl, setDetailsUrl] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    const [offersRes, catsRes] = await Promise.all([
      supabase
        .from("product_offers")
        .select("*, category:categories(name)")
        .order("sort_order"),
      supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("name"),
    ]);
    setOffers((offersRes.data as unknown as Offer[]) || []);
    setCategories(catsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => {
    setOfferType("GST");
    setBadgeLabel("");
    setDescription("");
    setDetailsUrl("");
    setCategoryId("all");
    setIsActive(true);
    setSortOrder(0);
    setEditingOffer(null);
  };

  const openEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setOfferType(offer.offer_type);
    setBadgeLabel(offer.badge_label);
    setDescription(offer.description);
    setDetailsUrl(offer.details_url || "");
    setCategoryId(offer.category_id || "all");
    setIsActive(offer.is_active);
    setSortOrder(offer.sort_order || 0);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      offer_type: offerType,
      badge_label: badgeLabel,
      description,
      details_url: detailsUrl || null,
      category_id: categoryId === "all" ? null : categoryId,
      is_active: isActive,
      sort_order: sortOrder,
    };

    if (editingOffer) {
      const { error } = await supabase.from("product_offers").update(data).eq("id", editingOffer.id);
      if (error) { toast({ title: "Error updating offer", variant: "destructive" }); return; }
      toast({ title: "Offer updated" });
    } else {
      const { error } = await supabase.from("product_offers").insert(data);
      if (error) { toast({ title: "Error creating offer", variant: "destructive" }); return; }
      toast({ title: "Offer created" });
    }
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("product_offers").delete().eq("id", id);
    if (error) { toast({ title: "Error deleting offer", variant: "destructive" }); return; }
    toast({ title: "Offer deleted" });
    fetchData();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("product_offers").update({ is_active: !current }).eq("id", id);
    fetchData();
  };

  const offerColors: Record<string, string> = {
    GST: "bg-success/10 text-success",
    BULK: "bg-accent/10 text-accent",
    SAVE: "bg-primary/10 text-primary",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Available Offers</h1>
          
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-accent">
              <Plus className="h-4 w-4 mr-2" /> Add Offer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingOffer ? "Edit Offer" : "Add New Offer"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Offer Type</Label>
                  <Select value={offerType} onValueChange={setOfferType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GST">GST</SelectItem>
                      <SelectItem value="BULK">BULK</SelectItem>
                      <SelectItem value="SAVE">SAVE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Badge Label</Label>
                  <Input value={badgeLabel} onChange={(e) => setBadgeLabel(e.target.value)} placeholder="e.g. GST Invoice" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Get GST invoice on all products" />
              </div>
              <div className="space-y-2">
                <Label>More Details URL (optional)</Label>
                <Input value={detailsUrl} onChange={(e) => setDetailsUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
              <Button className="w-full bg-gradient-accent" onClick={handleSave}>
                {editingOffer ? "Update Offer" : "Create Offer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : offers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No offers created yet. Add your first offer above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => (
            <Card key={offer.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <Badge className={`${offerColors[offer.offer_type] || "bg-secondary"} shrink-0`}>
                  {offer.badge_label}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{offer.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {offer.category ? offer.category.name : "All Categories"} • Type: {offer.offer_type}
                    {offer.details_url && " • Has details link"}
                  </p>
                </div>
                <Switch
                  checked={offer.is_active}
                  onCheckedChange={() => toggleActive(offer.id, offer.is_active)}
                />
                <Button variant="ghost" size="icon" onClick={() => openEdit(offer)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(offer.id)}>
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
