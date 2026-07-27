import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Package, Layers, ArrowRight, X, Loader2, Mic, MicOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { SignedImage } from "@/components/common/SignedImage";

interface Product {
  id: string;
  name: string;
  slug: string;
  images: string[] | null;
  category: { name: string } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface InstantSearchProps {
  className?: string;
  placeholder?: string;
  onClose?: () => void;
  autoFocus?: boolean;
}

const SR: any =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function InstantSearch({ className, placeholder = "Search products...", onClose, autoFocus = true }: InstantSearchProps) {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const navigate = useNavigate();

  const startVoice = () => {
    if (!SR) {
      alert("Voice search is not supported in this browser. Please use Chrome.");
      return;
    }
    try {
      const rec = new SR();
      rec.lang = "en-IN";
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      let finalText = "";
      rec.onresult = (e: any) => {
        let live = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalText += res[0].transcript;
          else live += res[0].transcript;
        }
        setQuery((finalText || live).trim());
      };
      rec.onend = () => {
        setListening(false);
        if (finalText.trim()) setShowResults(true);
      };
      rec.onerror = () => setListening(false);
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch (err) {
      console.error("voice search start failed", err);
      setListening(false);
    }
  };
  const stopVoice = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  };

  // Search as user types
  useEffect(() => {
    if (query.length < 1) {
      setProducts([]);
      setCategories([]);
      setShowResults(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoading(true);
      setShowResults(true);

      try {
        // Search products
        const { data: productData } = await supabase
          .from("products")
          .select("id, name, slug, images, category:categories(name)")
          .eq("is_active", true)
          .ilike("name", `%${query}%`)
          .limit(5);

        // Search categories
        const { data: categoryData } = await supabase
          .from("categories")
          .select("id, name, slug")
          .eq("is_active", true)
          .ilike("name", `%${query}%`)
          .limit(3);

        setProducts((productData as unknown as Product[]) || []);
        setCategories(categoryData || []);
      } catch (error) {
        console.error("Search error:", error);
      }

      setIsLoading(false);
    }, 200);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProductClick = (slug: string) => {
    navigate(`/product/${slug}`);
    setShowResults(false);
    setQuery("");
    onClose?.();
  };

  const handleCategoryClick = (slug: string) => {
    navigate(`/products?category=${slug}`);
    setShowResults(false);
    setQuery("");
    onClose?.();
  };

  const handleViewAll = () => {
    navigate(`/products?search=${encodeURIComponent(query)}`);
    setShowResults(false);
    setQuery("");
    onClose?.();
  };

  const handleClear = () => {
    setQuery("");
    setShowResults(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="pl-10 pr-20 h-11 bg-background border-border"
          autoFocus={autoFocus}
          tabIndex={autoFocus ? 0 : -1}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query && (
            <button
              onClick={handleClear}
              className="p-1 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={listening ? stopVoice : startVoice}
            type="button"
            aria-label={listening ? "Stop voice search" : "Voice search"}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              listening
                ? "bg-destructive/10 text-destructive animate-pulse"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Categories */}
              {categories.length > 0 && (
                <div className="p-3 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                    Categories
                  </p>
                  <div className="space-y-1">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryClick(category.slug)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <Layers className="h-4 w-4 text-accent" />
                        </div>
                        <span className="font-medium text-foreground">{category.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {products.length > 0 && (
                <div className="p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                    Products
                  </p>
                  <div className="space-y-1">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product.slug)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {product.images?.[0] ? (
                            <SignedImage src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{product.name}</p>
                          {product.category && (
                            <p className="text-xs text-muted-foreground">{product.category.name}</p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {products.length === 0 && categories.length === 0 && query.length > 0 && (
                <div className="p-6 text-center">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No results found for "{query}"</p>
                </div>
              )}

              {/* View All Button */}
              {(products.length > 0 || categories.length > 0) && (
                <div className="p-3 border-t border-border">
                  <Button 
                    onClick={handleViewAll}
                    variant="outline" 
                    className="w-full gap-2"
                  >
                    View all results for "{query}"
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
