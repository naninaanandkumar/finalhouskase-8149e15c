import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface CartItem {
  id: string;
  product_id: string;
  variation_id: string | null;
  quantity: number;
  product?: {
    id: string;
    name: string;
    guest_price: number;
    retail_price: number;
    shop_price: number;
    shop_moq: number;
    retail_moq: number;
    images: string[];
    gst_percentage?: number | null;
      gst_enabled?: boolean | null;
      gst_pricing_mode?: string | null;
  };
  variation?: {
    id: string;
    size: string | null;
    color: string | null;
    guest_price: number;
    retail_price: number;
    shop_price: number;
    shop_moq: number | null;
    retail_moq: number | null;
  };
}

interface CartContextType {
  items: CartItem[];
  isLoading: boolean;
  buyerType: string;
  addToCart: (productId: string, quantity: number, variationId?: string | null) => Promise<boolean>;
  updateQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<void>;
  getItemPrice: (item: CartItem) => number;
  getItemMoq: (item: CartItem) => number;
  validateMoq: (item: CartItem) => boolean;
  subtotal: number;
  tax: number;
  itemCount: number;
  allMoqValid: boolean;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const buyerType = "guest";

  const fetchCart = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id, product_id, variation_id, quantity,
          product:products(id, name, guest_price, retail_price, shop_price, shop_moq, retail_moq, images, gst_percentage, gst_enabled, gst_pricing_mode),
          variation:product_variations(id, size, color, guest_price, retail_price, shop_price, shop_moq, retail_moq)
        `)
        .eq("user_id", user.id);
      if (error) throw error;
      setItems((data as unknown as CartItem[]) || []);
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = async (productId: string, quantity: number, variationId?: string | null) => {
    if (!user) {
      toast({ title: "Login Required", description: "Please login to add items to your cart.", variant: "destructive" });
      return false;
    }
    try {
      const existingItem = items.find(item => item.product_id === productId && item.variation_id === (variationId || null));
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        setItems(prev => prev.map(item => item.id === existingItem.id ? { ...item, quantity: newQuantity } : item));
        const { error } = await supabase.from("cart_items").update({ quantity: newQuantity }).eq("id", existingItem.id);
        if (error) { await fetchCart(); throw error; }
        toast({ title: "Cart Updated", description: "Item quantity updated." });
        return true;
      }

      const tempId = `temp-${Date.now()}`;
      setItems(prev => [...prev, { id: tempId, product_id: productId, variation_id: variationId || null, quantity }]);
      toast({ title: "Added to Cart", description: "Item has been added to your cart." });

      const { error } = await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, variation_id: variationId || null, quantity });
      if (error) { setItems(prev => prev.filter(item => item.id !== tempId)); throw error; }
      fetchCart();
      return true;
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({ title: "Error", description: "Failed to add item to cart.", variant: "destructive" });
      return false;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    setItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity } : item));
    try {
      const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
      if (error) { await fetchCart(); throw error; }
      return true;
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast({ title: "Error", description: "Failed to update quantity.", variant: "destructive" });
      return false;
    }
  };

  const removeFromCart = async (itemId: string) => {
    const removedItem = items.find(item => item.id === itemId);
    setItems(prev => prev.filter(item => item.id !== itemId));
    toast({ title: "Removed", description: "Item removed from cart." });
    try {
      const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
      if (error) { if (removedItem) setItems(prev => [...prev, removedItem]); throw error; }
      return true;
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast({ title: "Error", description: "Failed to remove item.", variant: "destructive" });
      return false;
    }
  };

  const clearCart = async () => {
    if (!user) return;
    setItems([]);
    try {
      const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id);
      if (error) throw error;
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  const getItemPrice = (item: CartItem) => {
    const v = item.variation;
    const p = item.product;
    const guestPrice = v?.guest_price ?? p?.guest_price ?? 0;
    return guestPrice > 0 ? guestPrice : (v?.retail_price ?? p?.retail_price ?? 0);
  };

  const getItemMoq = (item: CartItem) => {
    const v = item.variation;
    const p = item.product;
    const moq = v?.retail_moq ?? p?.retail_moq ?? 1;
    return moq > 0 ? moq : 1;
  };

  const validateMoq = (item: CartItem) => item.quantity >= getItemMoq(item);

  const subtotal = items.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  const tax = items.reduce((sum, item) => {
    const gst = Number(item.product?.gst_percentage ?? 0);
    const enabled = item.product?.gst_enabled !== false && gst > 0;
    if (!enabled) return sum;
    const line = getItemPrice(item) * item.quantity;
    if (item.product?.gst_pricing_mode === "inclusive") return sum + line * (gst / (100 + gst));
    return sum + line * (gst / 100);
  }, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const allMoqValid = items.every(validateMoq);

  return (
    <CartContext.Provider value={{ items, isLoading, buyerType, addToCart, updateQuantity, removeFromCart, clearCart, getItemPrice, getItemMoq, validateMoq, subtotal, tax, itemCount, allMoqValid, refresh: fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}
