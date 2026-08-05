import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ReelsSection } from "@/components/reels/ReelsSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Filter, Grid3X3, List, SlidersHorizontal, X } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SEOHead, SchemaGenerators } from "@/components/SEOHead";
import { SignedImage } from "@/components/common/SignedImage";
const mobileMenuBanner = { url: "/products-hero-banner.jpg", asset_id: "v2" };

interface Product {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  images: string[] | null;
  guest_price: number;
  retail_price: number;
  shop_price: number;
  regular_price: number;
  shop_moq: number;
  retail_moq: number;
  has_variations: boolean | null;
  category: { name: string; id: string } | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

function FilterSidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  variant = "sidebar",
}: {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  variant?: "sidebar" | "sheet";
}) {
  const isSheet = variant === "sheet";
  const [moq, setMoq] = useState<string>("");

  const CategoryRow = ({ id, label }: { id: string; label: string }) => {
    const active = selectedCategory === id;
    return (
      <button
        type="button"
        onClick={() => onCategoryChange(id)}
        className={`group w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
          active
            ? "bg-accent/10 ring-1 ring-accent/30 shadow-sm"
            : "hover:bg-secondary/60 ring-1 ring-transparent"
        }`}
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            active ? "bg-accent border-accent" : "border-muted-foreground/40 group-hover:border-accent/50"
          }`}
        >
          {active && <span className="h-2 w-2 rounded-full bg-accent-foreground" />}
        </span>
        <span className={`text-sm ${active ? "font-semibold text-foreground" : "text-foreground/80"}`}>
          {label}
        </span>
      </button>
    );
  };

  const MoqChip = ({ range }: { range: string }) => {
    const active = moq === range;
    return (
      <button
        type="button"
        onClick={() => setMoq(active ? "" : range)}
        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
          active
            ? "bg-accent text-accent-foreground border-accent shadow-sm"
            : "bg-background text-foreground/70 border-border hover:border-accent/40 hover:text-foreground"
        }`}
      >
        {range} units
      </button>
    );
  };

  return (
    <div className={isSheet ? "space-y-6" : "space-y-6 sticky top-24"}>
      {isSheet && (
        <div className="-mx-1 rounded-2xl bg-gradient-to-br from-accent/10 via-accent/5 to-transparent p-4 border border-accent/15">
          <div className="text-[11px] font-bold uppercase tracking-wider text-accent">Refine</div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            Narrow the catalog to exactly what you need.
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-foreground">Categories</h3>
          {selectedCategory && (
            <button
              onClick={() => onCategoryChange("")}
              className="text-[11px] font-medium text-accent hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-1">
          <CategoryRow id="" label="All Products" />
          {categories.map((cat) => (
            <CategoryRow key={cat.id} id={cat.id} label={cat.name} />
          ))}
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-foreground">Minimum Order</h3>
          {moq && (
            <button onClick={() => setMoq("")} className="text-[11px] font-medium text-accent hover:underline">
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {["1-50", "51-100", "101-500", "500+"].map((r) => (
            <MoqChip key={r} range={r} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  const { user, role } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("featured");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [isLoading, setIsLoading] = useState(true);
  const [categoryBanner, setCategoryBanner] = useState<{ name: string; banner_image: string | null } | null>(null);
  const [subCategories, setSubCategories] = useState<Category[]>([]);

  const buyerType: "guest" | "shop" | "retail" = !user ? "guest" : role === "shop" ? "shop" : role === "retail" ? "retail" : "guest";

  const getDisplayPrice = (p: Product) => {
    if (buyerType === "shop") return p.shop_price;
    if (buyerType === "retail") return p.retail_price;
    return p.guest_price;
  };

  const getMrp = (p: Product) => p.regular_price > 0 ? p.regular_price : p.guest_price;

  const getDiscount = (p: Product) => {
    const price = getDisplayPrice(p);
    const mrp = getMrp(p);
    if (mrp <= 0 || price >= mrp) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  };

  const getPriceLabel = () => {
    if (buyerType === "shop") return "Wholesaler";
    if (buyerType === "retail") return "Retailer";
    return null;
  };

  // Sync URL params
  useEffect(() => {
    const cat = searchParams.get("category");
    const search = searchParams.get("search");
    if (cat) setSelectedCategory(cat);
    if (search) setSearchQuery(search);
  }, [searchParams]);

  // Removed handleAddToRFQ - not needed for B2C cards

  const clearSearch = () => {
    setSearchQuery("");
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("search");
    setSearchParams(newParams);
  };

  const clearCategory = () => {
    setSelectedCategory("");
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("category");
    setSearchParams(newParams);
  };

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("sort_order");
      
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Fetch category banner and sub-categories when a category is selected
  useEffect(() => {
    const fetchCategoryDetails = async () => {
      if (!selectedCategory || categories.length === 0) {
        setCategoryBanner(null);
        setSubCategories([]);
        return;
      }
      const match = categories.find(c => c.slug === selectedCategory || c.id === selectedCategory);
      if (match) {
        const { data: catData } = await supabase
          .from("categories")
          .select("name, banner_image")
          .eq("id", match.id)
          .single();
        setCategoryBanner(catData as any);

        const { data: subCats } = await supabase
          .from("categories")
          .select("id, name, slug, image_url")
          .eq("parent_id", match.id)
          .eq("is_active", true)
          .order("sort_order");
        setSubCategories((subCats || []) as any);
      } else {
        setCategoryBanner(null);
        setSubCategories([]);
      }
    };
    fetchCategoryDetails();
  }, [selectedCategory, categories]);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      let query = supabase
        .from("products")
        .select(`
          id,
          name,
          slug,
          short_description,
          images,
          guest_price,
          retail_price,
          shop_price,
          regular_price,
          shop_moq,
          retail_moq,
          has_variations,
          category_id,
          category:categories(id, name)
        `)
        .eq("is_active", true);

      // Filter by category slug or id
      if (selectedCategory) {
        const categoryMatch = categories.find(
          c => c.slug === selectedCategory || c.id === selectedCategory
        );
        if (categoryMatch) {
          query = query.eq("category_id", categoryMatch.id);
        }
      }

      // Search filter
      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (!error && data) {
        setProducts(data as unknown as Product[]);
      }
      setIsLoading(false);
    };

    fetchProducts();
  }, [selectedCategory, searchQuery, categories]);

  // Sort products
  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case "moq-low":
        return a.shop_moq - b.shop_moq;
      case "moq-high":
        return b.shop_moq - a.shop_moq;
      case "name-az":
        return a.name.localeCompare(b.name);
      case "name-za":
        return b.name.localeCompare(a.name);
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEOHead
        title={categoryBanner?.name ? `${categoryBanner.name} — Buy Online at Houskase` : "All Products — Houskase Essentials"}
        description={categoryBanner?.name
          ? `Shop ${categoryBanner.name} from Houskase. Premium quality, trusted brand, fast delivery across India. Best prices & exclusive offers.`
          : "Browse the complete Houskase catalogue — towels, tissues, cleaning accessories, office & home essentials with fast shipping across India."}
        keywords={`${categoryBanner?.name || "Houskase"}, buy ${categoryBanner?.name || "essentials"} online, towels, tissues, cleaning, India`}
        jsonLd={[
          SchemaGenerators.collectionPage(
            categoryBanner?.name ? `${categoryBanner.name} — Houskase` : "All Products — Houskase",
            categoryBanner?.name
              ? `Shop ${categoryBanner.name} from Houskase with fast delivery across India.`
              : "Browse the complete Houskase catalogue of everyday essentials.",
            window.location.href
          ),
          SchemaGenerators.breadcrumb([
            { name: "Home", url: "https://houskase.lovable.app/" },
            { name: "Products", url: "https://houskase.lovable.app/products" },
            ...(categoryBanner?.name
              ? [{ name: categoryBanner.name, url: window.location.href }]
              : []),
          ]),
        ]}
      />
      <Header />
      <main className="pt-4 pb-20 overflow-x-hidden">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 overflow-x-hidden">
          {/* Category Banner */}
          {categoryBanner?.banner_image && selectedCategory ? (
            <div className="relative h-[150px] sm:h-[200px] md:h-[250px] rounded-lg overflow-hidden mb-6">
              <SignedImage src={categoryBanner.banner_image} alt={categoryBanner.name} className="w-full h-full object-cover" />
            </div>
          ) : !selectedCategory ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-6"
            >
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={`${mobileMenuBanner.url}?v=${mobileMenuBanner.asset_id}`}
                  alt="Houskase Products"
                  className="w-full h-auto object-cover bg-secondary"
                  loading="eager"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (img.dataset.fallback !== "1") {
                      img.dataset.fallback = "1";
                      img.src = "/placeholder.svg";
                    }
                  }}
                />
              </div>
            </motion.div>
          ) : (
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">{categoryBanner?.name || selectedCategory}</h1>
            </div>
          )}

          {/* Always keep a semantic h1 so crawlers and screen readers get a page name,
              even when the mobile banner is showing (no visible category h1). */}
          {!selectedCategory && (
            <h1 className="sr-only">Shop Houskase Products — Towels, Tissues &amp; Cleaning Essentials</h1>
          )}

          {/* Sub-categories */}
          {subCategories.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-semibold text-foreground mb-3">ALL CATEGORIES ({subCategories.length})</h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {subCategories.map(sub => (
                  <Link
                    key={sub.id}
                    to={`/products?category=${sub.slug}`}
                    className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-all group"
                  >
                    {(sub as any).image_url && (
                      <div className="aspect-[4/3] overflow-hidden">
                        <SignedImage src={(sub as any).image_url} alt={sub.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    )}
                    <div className="p-2 text-center">
                      <span className="text-xs sm:text-sm font-medium text-foreground">{sub.name}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Active Filters */}
          {(searchQuery || selectedCategory) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {searchQuery && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Search: {searchQuery}
                  <button onClick={clearSearch} className="ml-1 hover:bg-muted rounded p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedCategory && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Category: {categories.find(c => c.id === selectedCategory || c.slug === selectedCategory)?.name || selectedCategory}
                  <button onClick={clearCategory} className="ml-1 hover:bg-muted rounded p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          <div className="flex gap-4 min-w-0">
            {/* Desktop Filter Sidebar */}
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-36 bg-card rounded-xl p-6 shadow-card border border-border">
                <h2 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters
                </h2>
                <FilterSidebar 
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                />
              </div>
            </div>

            {/* Products Grid */}
            <div className="flex-1 min-w-0">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-3 mb-6 bg-card rounded-xl p-2 sm:p-4 shadow-card border border-border max-w-full overflow-hidden">
                <p className="text-sm text-muted-foreground hidden sm:block">
                  Showing <span className="font-medium text-foreground">{sortedProducts.length}</span> products
                </p>

                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-none justify-between sm:justify-end">

                  {/* Mobile Filter Button */}
                  <Sheet>
                    <SheetTrigger asChild className="lg:hidden">
                        <Button variant="outline" size="sm" className="gap-1.5 h-9 px-3 sm:px-6 sm:h-10 shrink-0">
                        <SlidersHorizontal className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Filters
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[85vw] sm:w-96 p-0 border-r border-border/60 bg-background">
                      <div className="relative">
                        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-br from-accent/20 via-accent/5 to-transparent pointer-events-none" />
                        <SheetHeader className="relative px-5 pt-6 pb-4">
                          <SheetTitle className="flex items-center gap-2.5 text-lg font-display font-bold">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground shadow-sm">
                              <SlidersHorizontal className="h-4 w-4" />
                            </span>
                            Filters
                          </SheetTitle>
                        </SheetHeader>
                      </div>
                      <div className="px-5 pb-8 overflow-y-auto max-h-[calc(100dvh-6rem)]">
                        <FilterSidebar
                          categories={categories}
                          selectedCategory={selectedCategory}
                          onCategoryChange={setSelectedCategory}
                          variant="sheet"
                        />
                      </div>
                    </SheetContent>
                  </Sheet>

                  {/* Sort */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9 sm:h-10 flex-1 sm:flex-none sm:w-44 sm:max-w-[45vw] text-sm">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="moq-low">MOQ: Low to High</SelectItem>
                      <SelectItem value="moq-high">MOQ: High to Low</SelectItem>
                      <SelectItem value="name-az">Name: A to Z</SelectItem>
                      <SelectItem value="name-za">Name: Z to A</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* View Toggle */}
                  <div className="hidden sm:flex border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 ${viewMode === "grid" ? "bg-accent text-accent-foreground" : "bg-card hover:bg-secondary"}`}
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 ${viewMode === "list" ? "bg-accent text-accent-foreground" : "bg-card hover:bg-secondary"}`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              {isLoading ? (
                <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 min-w-0">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="bg-card rounded-xl overflow-hidden shadow-card border border-border">
                      <div className="aspect-square bg-muted animate-pulse" />
                      <div className="p-3 sm:p-4 space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-muted rounded animate-pulse" />
                        <div className="h-8 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sortedProducts.length === 0 ? (
                <div className="text-center py-20">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-2">No Products Found</h3>
                  <p className="text-muted-foreground mb-6">Try adjusting your filters or browse all products.</p>
                  <Button onClick={() => setSelectedCategory("")} variant="outline">
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className={`grid gap-3 sm:gap-4 min-w-0 ${viewMode === "grid" ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5" : "grid-cols-1"}`}>
                  {sortedProducts.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <ReelsSection title="Trending Reels" placement="home" />
      <Footer />
    </div>
  );
}
