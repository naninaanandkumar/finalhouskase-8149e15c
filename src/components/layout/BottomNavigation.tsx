import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Grid3X3,
  ShoppingCart,
  User,
  FileText,
  MessageSquare,
  HelpCircle,
  Truck,
  MoreHorizontal,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  Grid3X3,
  ShoppingCart,
  User,
  FileText,
  MessageSquare,
  HelpCircle,
  Truck,
};

interface BottomMenuItem {
  type: "page" | "category";
  id: string;
  label: string;
  icon: string;
  path: string;
  enabled: boolean;
}

interface SubCategory {
  id: string;
  name: string;
  slug: string;
  parent_id: string;
}

const defaultItems: BottomMenuItem[] = [
  { type: "page", id: "home", label: "Home", icon: "Home", path: "/", enabled: true },
  { type: "page", id: "shop", label: "Shop", icon: "Grid3X3", path: "/products", enabled: true },
  { type: "page", id: "cart", label: "Cart", icon: "ShoppingCart", path: "/checkout", enabled: true },
  { type: "page", id: "track", label: "Track", icon: "Truck", path: "/courier-tracking", enabled: true },
  { type: "page", id: "account", label: "Account", icon: "User", path: "/dashboard", enabled: true },
];

export function BottomNavigation() {
  const location = useLocation();
  const { user } = useAuth();

  const [items, setItems] = useState<BottomMenuItem[]>(defaultItems);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [openPanel, setOpenPanel] = useState<{ type: "more" | "category"; id?: string } | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("site_settings").select("value").eq("key", "bottom_menu").maybeSingle(),
      supabase
        .from("categories")
        .select("id, name, slug, parent_id")
        .eq("is_active", true)
        .not("parent_id", "is", null),
    ]).then(([menuRes, catsRes]) => {
      if (menuRes.data?.value) {
        const value = menuRes.data.value as { items?: BottomMenuItem[] };
        if (Array.isArray(value.items)) {
          const enabled = value.items.filter((i) => i.enabled);
          if (enabled.length > 0) setItems(enabled);
        }
      }

      if (catsRes.data) {
        setSubCategories(catsRes.data as SubCategory[]);
      }
    });
  }, []);

  useEffect(() => {
    setOpenPanel(null);
  }, [location.pathname, location.search]);

  const getParentCatId = (itemId: string) => itemId.replace("cat-", "");

  const getSubCatsForItem = (itemId: string) => {
    const parentId = getParentCatId(itemId);
    return subCategories.filter((sub) => sub.parent_id === parentId);
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname === path || location.pathname.startsWith(path.split("?")[0]);
  };

  const primaryLimit = 5;
  const primaryItems = useMemo(() => items.slice(0, primaryLimit), [items]);
  const overflowItems = useMemo(() => items.slice(primaryLimit), [items]);
  const openCategoryItem = useMemo(
    () => (openPanel?.type === "category" ? items.find((item) => item.id === openPanel.id) : null),
    [items, openPanel],
  );
  const openCategorySubItems = useMemo(
    () => (openCategoryItem ? getSubCatsForItem(openCategoryItem.id) : []),
    [openCategoryItem, subCategories],
  );

  if (location.pathname.startsWith("/admin")) return null;

  return (
    <>
      {openPanel && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-foreground/30"
          onClick={() => setOpenPanel(null)}
          aria-hidden="true"
        />
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg safe-area-bottom">
        {openPanel?.type === "more" && (
          <div className="absolute bottom-full left-0 right-0 bg-card border-t border-border shadow-xl rounded-t-xl max-h-[55vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-border text-sm font-semibold text-foreground">More Menu</div>
            <div className="py-1">
              {overflowItems.map((item) => {
                const IconComp = iconMap[item.icon] || Grid3X3;
                const to = item.id === "account" ? (user ? "/dashboard" : "/login") : item.path;

                return item.type === "category" ? (
                  <button
                    key={item.id}
                    onClick={() => setOpenPanel({ type: "category", id: item.id })}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-sm text-foreground hover:bg-accent/10"
                  >
                    <span className="flex items-center gap-2">
                      <IconComp className="h-4 w-4" />
                      {item.label}
                    </span>
                    <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                  </button>
                ) : (
                  <Link
                    key={item.id}
                    to={to}
                    onClick={() => setOpenPanel(null)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-accent/10"
                  >
                    <IconComp className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {openPanel?.type === "category" && openCategoryItem && (
          <div className="absolute bottom-full left-0 right-0 bg-card border-t border-border shadow-xl rounded-t-xl max-h-[55vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <button
                onClick={() => setOpenPanel(overflowItems.some((item) => item.id === openCategoryItem.id) ? { type: "more" } : null)}
                className="p-1 text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-foreground flex-1 text-center truncate">{openCategoryItem.label}</span>
              <div className="w-6" />
            </div>

            <Link
              to={openCategoryItem.path}
              onClick={() => setOpenPanel(null)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-accent hover:bg-accent/10 border-b border-border/60"
            >
              <Grid3X3 className="h-4 w-4" />
              View All {openCategoryItem.label}
            </Link>

            {openCategorySubItems.length > 0 ? (
              openCategorySubItems.map((sub) => (
                <Link
                  key={sub.id}
                  to={`/products?category=${sub.slug}`}
                  onClick={() => setOpenPanel(null)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-accent/10"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                  {sub.name}
                </Link>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-muted-foreground">No sub-categories available</div>
            )}
          </div>
        )}

        <div className="flex items-stretch h-14">
          {primaryItems.map((item) => {
            const IconComp = iconMap[item.icon] || Grid3X3;
            const to = item.id === "account" ? (user ? "/dashboard" : "/login") : item.path;
            const active = isActive(to);
            const isOpen = openPanel?.type === "category" && openPanel.id === item.id;

            return item.type === "category" ? (
              <button
                key={item.id}
                onClick={() => setOpenPanel(isOpen ? null : { type: "category", id: item.id })}
                className={cn(
                  "flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors px-1",
                  isOpen || active ? "text-accent" : "text-muted-foreground",
                )}
              >
                <IconComp className="h-5 w-5 flex-shrink-0" />
                <span className="truncate max-w-[58px]">{item.label}</span>
              </button>
            ) : (
              <Link
                key={item.id}
                to={to}
                className={cn(
                  "flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors px-1",
                  active ? "text-accent" : "text-muted-foreground",
                )}
              >
                <IconComp className="h-5 w-5 flex-shrink-0" />
                <span className="truncate max-w-[58px]">{item.label}</span>
              </Link>
            );
          })}

          {overflowItems.length > 0 && (
            <button
              onClick={() => setOpenPanel(openPanel?.type === "more" ? null : { type: "more" })}
              className={cn(
                "flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors px-1",
                openPanel?.type === "more" ? "text-accent" : "text-muted-foreground",
              )}
            >
              <MoreHorizontal className="h-5 w-5 flex-shrink-0" />
              <span className="truncate max-w-[58px]">More</span>
            </button>
          )}
        </div>
      </nav>

      <div className="md:hidden h-14" />
    </>
  );
}
