import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Layers,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SignedImage } from "@/components/common/SignedImage";

type Category = Tables<"categories">;

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  banner_image: string;
  parent_id: string;
  is_active: boolean;
  sort_order: string;
}

const defaultFormData: CategoryFormData = {
  name: "",
  slug: "",
  description: "",
  image_url: "",
  banner_image: "",
  parent_id: "",
  is_active: true,
  sort_order: "0",
};

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({ title: "Error", description: "Failed to load categories", variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  const handleOpenForm = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || "",
        image_url: category.image_url || "",
        banner_image: (category as any).banner_image || "",
        parent_id: category.parent_id || "",
        is_active: category.is_active ?? true,
        sort_order: (category.sort_order || 0).toString(),
      });
    } else {
      setEditingCategory(null);
      setFormData(defaultFormData);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData(defaultFormData);
  };

  const handleSaveCategory = async () => {
    if (!formData.name) {
      toast({ title: "Error", description: "Category name is required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const categoryData = {
        name: formData.name,
        slug: formData.slug || generateSlug(formData.name),
        description: formData.description || null,
        image_url: formData.image_url || null,
        banner_image: formData.banner_image || null,
        parent_id: formData.parent_id || null,
        is_active: formData.is_active,
        sort_order: parseInt(formData.sort_order) || 0,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(categoryData)
          .eq("id", editingCategory.id);
        if (error) throw error;
        toast({ title: "Category Updated", description: "Category has been saved successfully." });
      } else {
        const { error } = await supabase.from("categories").insert(categoryData);
        if (error) throw error;
        toast({ title: "Category Created", description: "New category has been added." });
      }

      handleCloseForm();
      fetchCategories();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast({ title: "Error", description: error.message || "Failed to save category", variant: "destructive" });
    }
    setIsSaving(false);
  };

  const handleToggleActive = async (category: Category) => {
    try {
      const { error } = await supabase
        .from("categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id);
      if (error) throw error;
      toast({ title: category.is_active ? "Category Deactivated" : "Category Activated" });
      fetchCategories();
    } catch (error) {
      console.error("Error toggling category:", error);
      toast({ title: "Error", description: "Failed to update category", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Delete "${category.name}"? Linked products will be unassigned and any sub-categories will also be removed.`)) return;
    try {
      // 1. Unassign products from this category (and its children)
      const { data: childCats } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", category.id);
      const idsToClear = [category.id, ...(childCats?.map(c => c.id) || [])];

      const { error: prodErr } = await supabase
        .from("products")
        .update({ category_id: null })
        .in("category_id", idsToClear);
      if (prodErr) throw prodErr;

      // 2. Delete child categories
      if (childCats && childCats.length > 0) {
        const { error: childErr } = await supabase
          .from("categories")
          .delete()
          .in("id", childCats.map(c => c.id));
        if (childErr) throw childErr;
      }

      // 3. Delete the category itself
      const { error } = await supabase.from("categories").delete().eq("id", category.id);
      if (error) throw error;

      toast({ title: "Category Deleted" });
      fetchCategories();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getParentName = (parentId: string | null) => {
    if (!parentId) return "—";
    return categories.find(c => c.id === parentId)?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Form Header */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleCloseForm}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                  {editingCategory ? "Edit Category" : "Add New Category"}
                </h1>
                <p className="text-muted-foreground">
                  {editingCategory ? "Update category details" : "Create a new product category"}
                </p>
              </div>
            </div>

            {/* Form Content */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Info */}
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Category Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            name: e.target.value,
                            slug: prev.slug || generateSlug(e.target.value)
                          }))}
                          placeholder="Category name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="slug">URL Slug</Label>
                        <Input
                          id="slug"
                          value={formData.slug}
                          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                          placeholder="category-url-slug"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Category description..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="image_url">Category Image</Label>
                      <ImageUpload value={formData.image_url} onChange={(url) => setFormData(prev => ({ ...prev, image_url: url }))} bucket="product-images" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="banner_image">Banner Image (Category Page Header)</Label>
                      <ImageUpload value={formData.banner_image} onChange={(url) => setFormData(prev => ({ ...prev, banner_image: url }))} bucket="product-images" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card className="shadow-card">
                  <CardHeader>
                    <CardTitle>Organization</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="parent_id">Parent Category</Label>
                      <Select 
                        value={formData.parent_id} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, parent_id: value === "none" ? "" : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Parent</SelectItem>
                          {categories
                            .filter(c => c.id !== editingCategory?.id)
                            .map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sort_order">Sort Order</Label>
                      <Input
                        id="sort_order"
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData(prev => ({ ...prev, sort_order: e.target.value }))}
                        placeholder="0"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="is_active">Active</Label>
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      />
                    </div>

                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleCloseForm}>
                    Cancel
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-accent" 
                    onClick={handleSaveCategory}
                    disabled={isSaving}
                  >
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingCategory ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Categories</h1>
                
              </div>
              <Button onClick={() => handleOpenForm()} className="bg-gradient-accent gap-2">
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Layers className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{categories.length}</p>
                      <p className="text-sm text-muted-foreground">Total Categories</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                      <Eye className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{categories.filter(c => c.is_active).length}</p>
                      <p className="text-sm text-muted-foreground">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Categories Table */}
            <Card className="shadow-card">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredCategories.length === 0 ? (
                  <div className="text-center py-12">
                    <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No categories found</p>
                    <Button variant="link" onClick={() => handleOpenForm()}>Create your first category</Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCategories.map(category => (
                        <TableRow key={category.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
                                {category.image_url ? (
                                  <SignedImage src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Layers className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{category.name}</p>
                                <p className="text-sm text-muted-foreground">/{category.slug}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getParentName(category.parent_id)}</TableCell>
                          <TableCell>{category.sort_order || 0}</TableCell>
                          <TableCell>
                            <Badge className={category.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                              {category.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenForm(category)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleActive(category)}>
                                  {category.is_active ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                  {category.is_active ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDeleteCategory(category)} className="text-destructive">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
