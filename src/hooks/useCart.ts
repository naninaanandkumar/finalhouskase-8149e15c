import { useState, useEffect, useCallback } from "react";
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
    shop_price: number;
    retail_price: number;
    shop_moq: number;
    retail_moq: number;
    images: string[];
  };
  variation?: {
    id: string;
    size: string | null;
    color: string | null;
    shop_price: number;
    retail_price: number;
  };
}

export function useCart() {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const buyerType = role === "shop" ? "shop" : role === "retail" ? "retail" : "guest";

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("cart_items")
        .select(`
          id,
          product_id,
          variation_id,
          quantity,
          product:products(id, name, shop_price, retail_price, shop_moq, retail_moq, images),
          variation:product_variations(id, size, color, shop_price, retail_price)
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

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (
    productId: string,
    quantity: number,
    variationId?: string | null
  ) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to add items to your cart.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Check if item already exists in cart
      const existingItem = items.find(
        (item) =>
          item.product_id === productId &&
          item.variation_id === (variationId || null)
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        // Optimistic update
        setItems(prev => prev.map(item =>
          item.id === existingItem.id ? { ...item, quantity: newQuantity } : item
        ));
        
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: newQuantity })
          .eq("id", existingItem.id);

        if (error) {
          // Revert on error
          await fetchCart();
          throw error;
        }

        toast({ title: "Cart Updated", description: "Item quantity updated." });
        return true;
      }

      // Add new item - optimistic update with temp id
      const tempId = `temp-${Date.now()}`;
      const tempItem: CartItem = {
        id: tempId,
        product_id: productId,
        variation_id: variationId || null,
        quantity,
      };
      setItems(prev => [...prev, tempItem]);

      toast({ title: "Added to Cart", description: "Item has been added to your cart." });

      const { error } = await supabase.from("cart_items").insert({
        user_id: user.id,
        product_id: productId,
        variation_id: variationId || null,
        quantity,
      });

      if (error) {
        setItems(prev => prev.filter(item => item.id !== tempId));
        throw error;
      }

      // Fetch full data in background
      fetchCart();
      return true;
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast({
        title: "Error",
        description: "Failed to add item to cart.",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    // Optimistic update
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ));

    try {
      const { error } = await supabase
        .from("cart_items")
        .update({ quantity })
        .eq("id", itemId);

      if (error) {
        await fetchCart();
        throw error;
      }
      return true;
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast({
        title: "Error",
        description: "Failed to update quantity.",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeFromCart = async (itemId: string) => {
    // Optimistic update
    const removedItem = items.find(item => item.id === itemId);
    setItems(prev => prev.filter(item => item.id !== itemId));

    toast({ title: "Removed", description: "Item removed from cart." });

    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", itemId);

      if (error) {
        if (removedItem) setItems(prev => [...prev, removedItem]);
        throw error;
      }
      return true;
    } catch (error) {
      console.error("Error removing from cart:", error);
      toast({
        title: "Error",
        description: "Failed to remove item.",
        variant: "destructive",
      });
      return false;
    }
  };

  const clearCart = async () => {
    if (!user) return;
    setItems([]);

    try {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error clearing cart:", error);
    }
  };

  const getItemPrice = (item: CartItem) => {
    if (item.variation) {
      if (buyerType === "shop") return item.variation.shop_price;
      return item.variation.retail_price;
    }
    if (item.product) {
      if (buyerType === "shop") return item.product.shop_price;
      return item.product.retail_price;
    }
    return 0;
  };

  const getItemMoq = (item: CartItem) => {
    if (buyerType === "guest") return 1;
    if (item.product) {
      return buyerType === "shop"
        ? item.product.shop_moq
        : item.product.retail_moq;
    }
    return 1;
  };

  const validateMoq = (item: CartItem) => {
    const moq = getItemMoq(item);
    return item.quantity >= moq;
  };

  const subtotal = items.reduce(
    (sum, item) => sum + getItemPrice(item) * item.quantity,
    0
  );

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const allMoqValid = items.every(validateMoq);

  return {
    items,
    isLoading,
    buyerType,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getItemPrice,
    getItemMoq,
    validateMoq,
    subtotal,
    itemCount,
    allMoqValid,
    refresh: fetchCart,
  };
}
