import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Layers,
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tables } from "@/integrations/supabase/types";
import { ProductForm } from "@/components/admin/ProductForm";
import { SignedImage } from "@/components/common/SignedImage";

type Product = Tables<"products">;
type Category = Tables<"categories">;

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("name"),
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenForm = (product?: Product) => {
    setEditingProduct(product || null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const handleFormSave = () => {
    handleCloseForm();
    fetchData();
  };

  const handleToggleActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);
      if (error) throw error;
      toast({ title: product.is_active ? "Product Deactivated" : "Product Activated" });
      fetchData();
    } catch (error) {
      console.error("Error toggling product:", error);
      toast({ title: "Error", description: "Failed to update product", variant: "destructive" });
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;
    try {
      await supabase.from("product_variations").delete().eq("product_id", product.id);
      const { error } = await supabase.from("products").delete().eq("id", product.id);
      if (error) throw error;
      toast({ title: "Product Deleted" });
      fetchData();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
    }
  };

  // Export products to CSV
  const handleExport = () => {
    const headers = [
      "id", "name", "slug", "sku", "hsn_code", "short_description", "description",
      "shop_price", "retail_price", "shop_moq", "retail_moq", "stock_quantity",
      "category_id", "is_active", "has_variations", "images", "features"
    ];

    const csvContent = [
      headers.join(","),
      ...filteredProducts.map(p => [
        p.id,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        p.slug,
        p.sku || "",
        p.hsn_code || "",
        `"${(p.short_description || "").replace(/"/g, '""')}"`,
        `"${(p.description || "").replace(/"/g, '""')}"`,
        p.shop_price,
        p.retail_price,
        p.shop_moq,
        p.retail_moq,
        p.stock_quantity || 0,
        p.category_id || "",
        p.is_active,
        p.has_variations,
        `"${(p.images || []).join(";")}"`,
        `"${(p.features || []).join(";")}"`,
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: "Export Complete", description: `${filteredProducts.length} products exported` });
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportErrors([]);
    }
  };

  // Parse and import CSV
  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportErrors([]);

    try {
      const text = await importFile.text();
      const lines = text.split("\n");
      // Find the actual header line (first non-empty line)
      const headerLineIndex = lines.findIndex(line => line.trim().length > 0);
      if (headerLineIndex === -1) {
        toast({ title: "Import Failed", description: "Empty file", variant: "destructive" });
        setIsImporting(false);
        return;
      }
      const headers = parseCSVLine(lines[headerLineIndex]).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ""));

      const errors: string[] = [];
      const productsToImport: Partial<Product>[] = [];

      for (let i = headerLineIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        try {
          const values = parseCSVLine(line);
          const product: Record<string, any> = {};

          headers.forEach((header, idx) => {
            const value = values[idx]?.trim().replace(/^"|"$/g, "");
            
            if (header === "images" || header === "features") {
              product[header] = value ? value.split(";").filter(Boolean) : [];
            } else if (header === "hsn_code") {
              product[header] = value || null;
            } else if (header === "shop_price" || header === "retail_price" || header === "stock_quantity") {
              product[header] = value ? parseFloat(value) : 0;
            } else if (header === "shop_moq" || header === "retail_moq") {
              product[header] = value ? parseInt(value) : 1;
            } else if (header === "is_active" || header === "has_variations") {
              product[header] = value === "true";
            } else if (header === "id" && value) {
              product[header] = value;
            } else if (header !== "id") {
              product[header] = value || null;
            }
          });

          // Skip rows without a name (e.g. trailing empty lines)
          if (!product.name) continue;

          // Generate slug if not provided
          if (!product.slug && product.name) {
            product.slug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          }

          // Ensure required numeric fields have defaults
          if (product.shop_price === undefined || product.shop_price === null) product.shop_price = 0;
          if (product.retail_price === undefined || product.retail_price === null) product.retail_price = 0;
          if (product.guest_price === undefined || product.guest_price === null) product.guest_price = 0;
          if (product.regular_price === undefined || product.regular_price === null) product.regular_price = 0;

          // Remove category_id if empty string (will cause FK error)
          if (product.category_id === "" || product.category_id === "null") {
            delete product.category_id;
          }

          // Remove id if empty
          if (!product.id) delete product.id;

          productsToImport.push(product as Partial<Product>);
        } catch (err: any) {
          errors.push(`Row ${i + 1}: ${err.message}`);
        }
      }

      // Don't block import for parse errors, continue with what we have
      if (productsToImport.length === 0 && errors.length > 0) {
        setImportErrors(errors);
        setIsImporting(false);
        return;
      }

      // Upsert products
      let successCount = 0;
      for (const product of productsToImport) {
        try {
          if (product.id) {
            // Update existing
            const { error } = await supabase
              .from("products")
              .update(product)
              .eq("id", product.id);
            if (error) throw error;
          } else {
            // Insert new
            const { error } = await supabase
              .from("products")
              .insert(product as any);
            if (error) throw error;
          }
          successCount++;
        } catch (err: any) {
          errors.push(`${product.name}: ${err.message}`);
        }
      }

      if (errors.length > 0) {
        setImportErrors(errors);
      }

      toast({ 
        title: "Import Complete", 
        description: `${successCount} of ${productsToImport.length} products imported successfully${errors.length > 0 ? `. ${errors.length} failed.` : ""}`
      });
      
      setShowImportDialog(false);
      setImportFile(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    }

    setIsImporting(false);
  };

  // Parse CSV line handling quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category_id === categoryFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? !!product.is_active : !product.is_active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized";
    return categories.find(c => c.id === categoryId)?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {showForm ? (
          <ProductForm
            key="product-form"
            product={editingProduct}
            onClose={handleCloseForm}
            onSave={handleFormSave}
          />
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
                <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Products</h1>
                
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Import Button */}
                <Button variant="outline" onClick={() => setShowImportDialog(true)} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
                {/* Export Button */}
                <Button variant="outline" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                {/* Add Product */}
                <Button onClick={() => handleOpenForm()} className="bg-gradient-accent gap-2">
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{products.length}</p>
                      <p className="text-sm text-muted-foreground">Total Products</p>
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
                      <p className="text-2xl font-bold">{products.filter(p => p.is_active).length}</p>
                      <p className="text-sm text-muted-foreground">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-shop/10 flex items-center justify-center">
                      <Layers className="h-6 w-6 text-shop" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{products.filter(p => p.has_variations).length}</p>
                      <p className="text-sm text-muted-foreground">Variable</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                      <Layers className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{categories.length}</p>
                      <p className="text-sm text-muted-foreground">Categories</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={(value: "all" | "active" | "draft") => setStatusFilter(value)}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Products Table */}
            <Card className="shadow-card">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No products found</p>
                    <Button variant="link" onClick={() => handleOpenForm()}>Add your first product</Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="hidden md:table-cell">Category</TableHead>
                          <TableHead className="hidden sm:table-cell">Type</TableHead>
                          <TableHead>Shop Price</TableHead>
                          <TableHead className="hidden lg:table-cell">Retail Price</TableHead>
                          <TableHead className="hidden md:table-cell">Stock</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map(product => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {product.images?.[0] ? (
                                    <SignedImage src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium truncate max-w-[120px] sm:max-w-[200px]">{product.name}</p>
                                  <p className="text-sm text-muted-foreground hidden sm:block">{product.sku || "No SKU"}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{getCategoryName(product.category_id)}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant={product.has_variations ? "default" : "secondary"}>
                                {product.has_variations ? "Variable" : "Simple"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-shop">₹{Number(product.shop_price).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">MOQ: {product.shop_moq}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div>
                                <p className="font-medium text-retail">₹{Number(product.retail_price).toLocaleString()}</p>
                                <p className="text-xs text-muted-foreground">MOQ: {product.retail_moq}</p>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">{product.stock_quantity || 0}</TableCell>
                            <TableCell>
                              <Badge className={product.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}>
                                {product.is_active ? "Active" : "Draft"}
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
                                  <DropdownMenuItem onClick={() => handleOpenForm(product)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleActive(product)}>
                                    {product.is_active ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                    {product.is_active ? "Set as Draft" : "Activate"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDeleteProduct(product)} className="text-destructive">
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
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Import Products
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to import products. The file should include columns for name, slug, prices, etc.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {importFile ? importFile.name : "Click to select CSV file"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {importErrors.length > 0 && (
              <div className="bg-destructive/10 rounded-lg p-4 max-h-32 overflow-y-auto">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Import Errors</span>
                </div>
                <ul className="text-sm text-destructive space-y-1">
                  {importErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowImportDialog(false); setImportFile(null); }}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!importFile || isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
