import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
}

interface ProductSearchProps {
  onSearch: (filters: SearchFilters) => void;
}

export interface SearchFilters {
  query: string;
  category: string;
  minPrice: number;
  maxPrice: number;
}

export function ProductSearch({ onSearch }: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      onSearch({
        query,
        category: category === "all" ? "" : category,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
      });
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, category, priceRange, onSearch]);

  const handleClear = () => {
    setQuery("");
    setCategory("all");
    setPriceRange([0, 500]);
  };

  const FilterControls = () => (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Category</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-4">
        <label className="text-sm font-medium text-foreground">
          Price Range: ${priceRange[0]} - ${priceRange[1]}
        </label>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          max={500}
          step={5}
          className="py-4"
        />
      </div>

      <Button variant="outline" onClick={handleClear} className="w-full gap-2">
        <X className="h-4 w-4" />
        Clear Filters
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Desktop Filters */}
        <div className="hidden lg:flex gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Filter Sheet */}
        <Sheet>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FilterControls />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active Filters */}
      {(query || category !== "all" || priceRange[0] > 0 || priceRange[1] < 500) && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {query && (
            <Button variant="secondary" size="sm" onClick={() => setQuery("")} className="gap-1 h-7">
              Search: {query}
              <X className="h-3 w-3" />
            </Button>
          )}
          {category !== "all" && (
            <Button variant="secondary" size="sm" onClick={() => setCategory("all")} className="gap-1 h-7">
              {categories.find(c => c.id === category)?.name || "Category"}
              <X className="h-3 w-3" />
            </Button>
          )}
          {(priceRange[0] > 0 || priceRange[1] < 500) && (
            <Button variant="secondary" size="sm" onClick={() => setPriceRange([0, 500])} className="gap-1 h-7">
              ${priceRange[0]} - ${priceRange[1]}
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
