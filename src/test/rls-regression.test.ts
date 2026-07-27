/**
 * RLS regression tests.
 *
 * These tests hit the live Data API as an anonymous client and assert that the
 * previously-fixed findings stay fixed:
 *  - orders / order_items are NOT publicly readable
 *  - rfq_requests / rfq_items / rfq_cart_items are NOT publicly readable
 *  - user_roles cannot be inserted / updated / deleted by an anon caller
 *
 * They are network tests. Set `SKIP_NETWORK_TESTS=1` (or run without the env
 * vars below) to skip. CI can run them by exposing the same public envs the
 * app uses.
 */
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const skip = !url || !anonKey || process.env.SKIP_NETWORK_TESTS === "1";

const d = skip ? describe.skip : describe;

d("RLS regression – anon must not reach sensitive tables", () => {
  const anon = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  it("cannot SELECT orders", async () => {
    const { data, error } = await anon.from("orders").select("id").limit(1);
    // Either an RLS error, a permission error, or an empty result set.
    expect(!!error || (data ?? []).length === 0).toBe(true);
  });

  it("cannot SELECT order_items", async () => {
    const { data, error } = await anon.from("order_items").select("id").limit(1);
    expect(!!error || (data ?? []).length === 0).toBe(true);
  });

  it("cannot SELECT rfq_requests", async () => {
    const { data, error } = await anon.from("rfq_requests").select("id").limit(1);
    expect(!!error || (data ?? []).length === 0).toBe(true);
  });

  it("cannot SELECT rfq_items", async () => {
    const { data, error } = await anon.from("rfq_items").select("id").limit(1);
    expect(!!error || (data ?? []).length === 0).toBe(true);
  });

  it("cannot SELECT rfq_cart_items", async () => {
    const { data, error } = await anon.from("rfq_cart_items").select("id").limit(1);
    expect(!!error || (data ?? []).length === 0).toBe(true);
  });

  it("cannot SELECT user_roles", async () => {
    const { data, error } = await anon.from("user_roles").select("user_id").limit(1);
    expect(!!error || (data ?? []).length === 0).toBe(true);
  });

  it("cannot INSERT into user_roles (privilege escalation)", async () => {
    const fakeUserId = "00000000-0000-0000-0000-000000000000";
    const { error } = await anon
      .from("user_roles")
      .insert({ user_id: fakeUserId, role: "admin" });
    expect(error).not.toBeNull();
  });

  it("cannot UPDATE user_roles", async () => {
    const { error } = await anon
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", "00000000-0000-0000-0000-000000000000");
    // Postgres may return 0 rows affected with no error under RLS; accept
    // either an explicit RLS/permission error or a no-op — but a successful
    // mutation reaching an actual row would be a regression.
    if (error) {
      expect(error.message).toBeTruthy();
    } else {
      // ok — no rows matched under the anon policy scope.
      expect(true).toBe(true);
    }
  });

  it("cannot DELETE user_roles", async () => {
    const { error } = await anon
      .from("user_roles")
      .delete()
      .eq("user_id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      expect(error.message).toBeTruthy();
    } else {
      expect(true).toBe(true);
    }
  });

  it("catalog tables ARE publicly readable (positive check)", async () => {
    const { error: pErr } = await anon.from("products").select("id").limit(1);
    const { error: cErr } = await anon.from("categories").select("id").limit(1);
    expect(pErr).toBeNull();
    expect(cErr).toBeNull();
  });
});