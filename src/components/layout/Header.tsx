import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu, User, MessageSquare, LogOut, 
  LayoutDashboard, ChevronDown, HelpCircle, Store, ChevronRight, Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { CartSheet } from "@/components/cart/CartSheet";
import { Badge } from "@/components/ui/badge";
import { InstantSearch } from "@/components/search/InstantSearch";
import { supabase } from "@/integrations/supabase/client";
import houskaseLogo from "@/assets/home.webp.asset.json";
const mobileMenuBanner = { url: "/products-hero-banner.jpg", asset_id: "v2" };
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface BottomMenuItem {
  type: "page" | "category";
  id: string;
  enabled: boolean;
}
export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false); // kept for potential future use
  // location state removed
  const [categories, setCategories] = useState<Category[]>([]);
  const [logoUrl, setLogoUrl] = useState("");
  const currentPath = useLocation().pathname;
  const navigate = useNavigate();
  const { user, profile, role, signOut, isLoading } = useAuth();
  

  // Fetch categories + logo with retry
  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const [catRes, logoRes, bottomMenuRes] = await Promise.all([
            supabase.from("categories").select("id, name, slug").eq("is_active", true).is("parent_id", null).order("sort_order"),
            supabase.from("site_settings").select("value").eq("key", "store").maybeSingle(),
            supabase.from("site_settings").select("value").eq("key", "bottom_menu").maybeSingle(),
          ]);

          if (!isMounted) return;

          const allParentCategories = catRes.data || [];
          const bottomMenuItems = (bottomMenuRes.data?.value as { items?: BottomMenuItem[] } | null)?.items;

          if (Array.isArray(bottomMenuItems)) {
            const selectedCategoryIds = bottomMenuItems
              .filter((item) => item.enabled && item.type === "category" && item.id.startsWith("cat-"))
              .map((item) => item.id.replace("cat-", ""));

            const selectedCategories = selectedCategoryIds
              .map((catId) => allParentCategories.find((cat) => cat.id === catId))
              .filter((cat): cat is Category => Boolean(cat));

            setCategories(selectedCategories.length > 0 ? selectedCategories : allParentCategories);
          } else {
            setCategories(allParentCategories);
          }

          if (logoRes.data?.value) {
            const v = logoRes.data.value as any;
            if (v.logoUrl) setLogoUrl(v.logoUrl);
          }

          if (!catRes.error && !logoRes.error && !bottomMenuRes.error) break;
          if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 500));
        } catch (err) {
          console.error("Header fetch failed:", err);
          if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 500));
        }
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Location detection removed per request

  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-card shadow-sm">
      <AnnouncementBar />
      {/* Main Header - White/Card */}
      <div className="bg-card md:border-b md:border-border">
        <div className="container mx-auto pl-3 pr-4 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3 h-14 sm:h-16">
            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="flex-shrink-0 h-9 w-9" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile Menu Banner (replaces greeting bar) */}
                  <Link
                    to="/products"
                    onClick={() => setIsOpen(false)}
                    className="block w-full overflow-hidden border-b border-border"
                  >
                    <img
                      src={`${mobileMenuBanner.url}?v=${mobileMenuBanner.asset_id}`}
                      alt="Houskase — Complete cleaning, perfect results"
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
                  </Link>

                {/* Mobile Search */}
                   <div className="p-3 border-b border-border">
                     <InstantSearch onClose={() => setIsOpen(false)} autoFocus={false} />
                   </div>

                  {/* Mobile Nav — only Categories per request */}
                  <nav className="flex-1 p-3 overflow-y-auto">
                    <p className="px-3 text-xs font-semibold text-muted-foreground uppercase mb-2">Categories</p>
                    <div className="divide-y divide-border border-y border-border">
                      {categories.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/products?category=${cat.slug}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center justify-between px-3 py-3 text-sm text-foreground hover:bg-secondary"
                        >
                          {cat.name}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  </nav>

                  {/* Mobile Footer */}
                  <div className="p-3 border-t border-border bg-secondary/30">
                    {user ? (
                      <div className="space-y-2">
                        <Link to={role === "admin" ? "/admin" : "/dashboard"} onClick={() => setIsOpen(false)}>
                          <Button variant="outline" className="w-full justify-start gap-2 h-9 text-sm">
                            <LayoutDashboard className="h-4 w-4" />
                            {role === "admin" ? "Admin Panel" : "My Dashboard"}
                          </Button>
                        </Link>
                        <Button onClick={() => { setIsOpen(false); navigate("/"); signOut(); }} variant="destructive" className="w-full h-9 text-sm">
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </Button>
                      </div>
                    ) : (
                      <Link to="/login" onClick={() => setIsOpen(false)}>
                        <Button className="w-full bg-accent hover:bg-accent-hover h-9 text-sm">
                          Sign In / Register
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <img
                src={logoUrl || houskaseLogo.url}
                alt="Houskase"
                className="h-9 sm:h-12 w-auto object-contain"
              />
            </Link>

            {/* Location pickers removed per request */}

            {/* Search Bar - Desktop */}
            <div className="hidden md:block flex-1 max-w-2xl mx-1 sm:mx-2">
              <InstantSearch placeholder="Search products..." />
            </div>

            {/* Spacer for mobile */}
            <div className="md:hidden flex-1" />

            {/* Action Buttons - Icon on top, text below */}
              <div className="hidden md:flex items-center gap-1 -mr-1">
              <Link to="/courier-tracking" className="flex flex-col items-center justify-center w-14 h-14 hover:bg-secondary/50 rounded-md transition-colors">
                <Truck className="h-4.5 w-4.5 text-foreground mb-0.5" />
                <span className="text-[10px] text-foreground font-medium">Track Order</span>
              </Link>
              <Link to="/rfq" className="flex flex-col items-center justify-center w-14 h-14 hover:bg-secondary/50 rounded-md transition-colors">
                <Store className="h-4.5 w-4.5 text-foreground mb-0.5" />
                <span className="text-[10px] text-foreground font-medium">Bulk Order</span>
              </Link>
              <Link to="/help" className="flex flex-col items-center justify-center w-14 h-14 hover:bg-secondary/50 rounded-md transition-colors">
                <HelpCircle className="h-4.5 w-4.5 text-foreground mb-0.5" />
                <span className="text-[10px] text-foreground font-medium">Help</span>
              </Link>
            </div>

            {/* Cart & User Menu */}
            <div className="flex items-center gap-1">
              <Link
                to="/courier-tracking"
                aria-label="Track Order"
                className="md:hidden flex items-center justify-center h-10 w-10 hover:bg-secondary/50 rounded-md transition-colors"
              >
                <div className="w-6 h-6 rounded-full border-2 border-foreground flex items-center justify-center">
                  <Truck className="h-3.5 w-3.5 text-foreground" />
                </div>
              </Link>

              <div className="flex flex-col items-center justify-center w-10 h-10 sm:w-14 sm:h-14">
                <CartSheet />
              </div>


              {/* User Menu */}
              {!isLoading && (
                user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                  <button className="flex flex-col items-center justify-center h-10 w-10 sm:h-14 sm:w-14 hover:bg-secondary/50 rounded-md transition-colors">
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                          role === "shop" ? "border-shop bg-shop/10" : role === "retail" ? "border-retail bg-retail/10" : "border-primary bg-primary/10"
                        )}>
                          <User className="h-3.5 w-3.5 text-foreground" />
                        </div>
                        <div className="hidden sm:flex items-center gap-0.5">
                          <span className="text-[10px] font-medium text-foreground truncate max-w-[50px]">
                            Account
                          </span>
                          <ChevronDown className="h-2.5 w-2.5" />
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuLabel className="py-2">
                        <p className="font-medium text-sm">{profile?.full_name || "User"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{role || "Buyer"} Account</p>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {role === "admin" && (
                        <Link to="/admin">
                          <DropdownMenuItem className="text-sm">
                            <LayoutDashboard className="h-4 w-4 mr-2" />
                            Admin Panel
                          </DropdownMenuItem>
                        </Link>
                      )}
                      <Link to="/dashboard">
                        <DropdownMenuItem className="text-sm">
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          My Dashboard
                        </DropdownMenuItem>
                      </Link>
                      <Link to="/chat">
                        <DropdownMenuItem className="text-sm">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Messages
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => { navigate("/"); signOut(); }} className="text-destructive text-sm">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link to="/login">
                    <button className="flex flex-col items-center justify-center h-10 w-10 sm:h-14 sm:w-14 hover:bg-secondary/50 rounded-md transition-colors">
                      <div className="w-6 h-6 rounded-full border-2 border-foreground flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-foreground" />
                      </div>
                      <div className="hidden sm:flex items-center gap-0.5">
                        <span className="text-[10px] font-medium text-foreground">Account</span>
                        <ChevronDown className="h-2.5 w-2.5" />
                      </div>
                    </button>
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Header - Mega Menu Bar (Desktop/Tablet only) */}
      <div className="hidden md:block bg-[#AD1E2A] text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center h-10 overflow-x-auto">
            <nav className="flex items-center gap-1">
              {/* 10 visible categories */}
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/products?category=${cat.slug}`}
                  className="px-2.5 py-1.5 text-[13px] font-medium hover:bg-white/15 rounded transition-colors whitespace-nowrap"
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
