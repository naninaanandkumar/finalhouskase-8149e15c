import { Link } from "react-router-dom";
import {
  FileText,
  User,
  ShoppingCart,
  FileQuestion,
  ChevronLeft,
  LogOut,
  LayoutDashboard,
  
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import houskaseLogo from "@/assets/home.webp.asset.json";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", tab: "overview" },
  { icon: ShoppingCart, label: "Orders", tab: "orders" },
  
  { icon: FileQuestion, label: "RFQ Requests", tab: "rfq" },
  { icon: FileText, label: "Invoices", tab: "invoices" },
  { icon: User, label: "Profile", tab: "profile" },
];


interface BuyerSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BuyerSidebar({ collapsed, onToggle, activeTab, onTabChange }: BuyerSidebarProps) {
  const { signOut } = useAuth();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-[70px]" : "w-64"
      )}
      style={{ backgroundColor: "#AD1E2A" }}
    >
      {/* Logo Area */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/15">
        {!collapsed && (
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden">
              <img
                src="/favicon.png"
                alt="Houskase"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-display font-bold text-white">Houskase</span>
          </Link>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="text-white hover:bg-white/15 hover:text-white"
        >
          <ChevronLeft className={cn("h-5 w-5 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        <div>
          {!collapsed && (
            <p className="px-3 mb-2 text-xs font-semibold text-white/60 uppercase tracking-wider">
              My Account
            </p>
          )}
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const isActive = "tab" in item && activeTab === item.tab;
              const baseClass = cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                isActive
                  ? "bg-white text-black font-semibold"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
              );
              const inner = (
                <>
                  <item.icon className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
                  {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                </>
              );
              return (
                <li key={item.tab}>
                  <button onClick={() => onTabChange(item.tab)} className={baseClass}>
                    {inner}
                  </button>
                </li>
              );
            })}
          </ul>

        </div>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-white/15">
        <Button
          variant="ghost"
          onClick={signOut}
          className={cn(
            "w-full justify-start gap-3 text-white/90 hover:bg-white/10 hover:text-white",
            collapsed && "justify-center"
          )}
        >
          <LogOut className={cn("h-5 w-5 flex-shrink-0", collapsed && "mx-auto")} />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
