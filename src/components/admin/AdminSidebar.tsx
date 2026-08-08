import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Layers,
  Users,
  ShoppingCart,
  FileText,
  Bell,
  Settings,
  MessageSquare,
  ChevronLeft,
  LogOut,
  Tag,
  Star,
  PanelTop,
  Image,
  Megaphone,
  Ticket,
  MapPin,
  ChevronDown,
  SlidersHorizontal,
  Video,
  ShieldAlert,
  Activity,
  Mail,
  Bot,
  Inbox,
  Newspaper,
  HeartHandshake,
} from "lucide-react";


const productSubItems = [
  { icon: Package, label: "All Products", href: "/admin/products" },
  { icon: Layers, label: "Categories", href: "/admin/categories" },
  { icon: Tag, label: "Brands", href: "/admin/brands" },
];

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/admin" },
  { icon: Activity, label: "Health & Status", href: "/admin/diagnostics" },
  { icon: Users, label: "Users", href: "/admin/users" },
  { icon: ShoppingCart, label: "Orders", href: "/admin/orders" },
  { icon: FileText, label: "RFQ Requests", href: "/admin/rfq" },
  { icon: Image, label: "Hero Slides & Banners", href: "/admin/hero-slides" },
  { icon: Video, label: "Product Reels", href: "/admin/reels" },
  { icon: Ticket, label: "Coupons", href: "/admin/coupons" },
  { icon: MapPin, label: "Delivery Pincodes", href: "/admin/pincodes" },
  { icon: Tag, label: "Offers", href: "/admin/offers" },
  { icon: Star, label: "Reviews", href: "/admin/reviews" },
  { icon: Newspaper, label: "Blog", href: "/admin/blog" },
  { icon: HeartHandshake, label: "Trusted by Families", href: "/admin/family-testimonials" },
  { icon: PanelTop, label: "Custom Tabs", href: "/admin/custom-tabs" },
  { icon: MessageSquare, label: "Chat", href: "/admin/chat" },
  { icon: Inbox, label: "Contact Inquiries", href: "/admin/contact-inquiries" },
  { icon: Bell, label: "Notifications", href: "/admin/notifications" },
  { icon: Settings, label: "Settings", href: "/admin/settings" },
];

// Dev-only: warn if duplicate hrefs or labels sneak in, and dedupe by href defensively.
const seenHrefs = new Set<string>();
const seenLabels = new Set<string>();
const dedupedMenuItems = menuItems.filter((item) => {
  if (seenHrefs.has(item.href)) {
    if (import.meta.env.DEV) {
      console.warn(`[AdminSidebar] Duplicate href removed: ${item.href} (${item.label})`);
    }
    return false;
  }
  if (seenLabels.has(item.label) && import.meta.env.DEV) {
    console.warn(`[AdminSidebar] Duplicate label detected: ${item.label} → ${item.href}`);
  }
  seenHrefs.add(item.href);
  seenLabels.add(item.label);
  return true;
});


interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const location = useLocation();
  const isProductSection = location.pathname === "/admin/products" || location.pathname === "/admin/categories" || location.pathname === "/admin/brands";
  const [productsOpen, setProductsOpen] = useState(isProductSection);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-[56px]" : "w-52"
      )}
    >
      {/* Logo Area */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-md bg-gradient-accent flex items-center justify-center">
              <span className="text-[10px] font-bold text-accent-foreground">B</span>
            </div>
            <span className="font-display font-bold text-xs text-sidebar-foreground">
              Admin Panel
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-sidebar-foreground hover:bg-sidebar-accent h-7 w-7"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5">
        <ul className="space-y-0.5">
          {/* Dashboard */}
          <li>
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-xs",
                location.pathname === "/admin"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <LayoutDashboard className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
              {!collapsed && <span className="font-medium">Dashboard</span>}
            </Link>
          </li>

          {/* Products Dropdown */}
          <li>
            <button
              onClick={() => !collapsed && setProductsOpen(!productsOpen)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-xs",
                isProductSection
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Package className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
              {!collapsed && (
                <>
                  <span className="font-medium flex-1 text-left">Products</span>
                  <ChevronDown className={cn("h-3 w-3 transition-transform", productsOpen && "rotate-180")} />
                </>
              )}
            </button>
            {!collapsed && productsOpen && (
              <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                {productSubItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>

          {/* Rest of menu items */}
          {dedupedMenuItems.slice(1).map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== "/admin" && location.pathname.startsWith(item.href));
            
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors text-xs",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-sidebar-border">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          )}
        >
          <LogOut className={cn("h-4 w-4 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="font-medium">Logout</span>}
        </Link>
      </div>
    </aside>
  );
}
