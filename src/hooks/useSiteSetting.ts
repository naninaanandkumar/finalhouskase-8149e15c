import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cached fetcher for `site_settings.value` by key.
 * Uses React Query's 5-min default staleTime so repeated reads across the
 * app (Header, Hero, Footer, etc.) reuse a single network call.
 */
export function useSiteSetting<T = unknown>(key: string) {
  return useQuery({
    queryKey: ["site_settings", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", key)
        .maybeSingle();
      if (error) throw error;
      return (data?.value as T | undefined) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
}
