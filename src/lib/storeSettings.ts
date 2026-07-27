import { supabase } from "@/integrations/supabase/client";

export interface StoreSettings {
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  store_email?: string;
  store_gstin?: string;
  store_logo_url?: string;
}

export async function fetchStoreSettings(): Promise<StoreSettings> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "store")
    .single();

  if (!data?.value) return {};

  const v = data.value as any;
  return {
    store_name: v.storeName || undefined,
    store_address: v.storeAddress || undefined,
    store_phone: v.storePhone || undefined,
    store_email: v.storeEmail || undefined,
    store_gstin: v.storeGSTIN || v.storeGstin || undefined,
    store_logo_url: v.logoUrl || undefined,
  };
}
