import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const rpcMock = vi.fn(async () => ({ data: [] }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...a: unknown[]) => rpcMock(...(a as [])),
    from: () => ({
      select: () => ({ eq: () => ({ eq: async () => ({ data: [] }) }) }),
    }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: () => {},
    storage: { from: () => ({}) },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, profile: { full_name: "Test User" } }),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

vi.mock("@/components/common/SignedImage", () => ({
  SignedImage: (p: Record<string, unknown>) => <img {...(p as object)} />,
}));

import { CustomerReviews } from "@/components/products/CustomerReviews";

const renderReviews = () =>
  render(
    <MemoryRouter>
      <CustomerReviews productId="p1" productName="Test Product" />
    </MemoryRouter>
  );

describe("Write a review modal accessibility", () => {
  beforeEach(() => rpcMock.mockClear());

  it("traps keyboard focus inside the dialog", async () => {
    const user = userEvent.setup();
    renderReviews();
    await user.click(await screen.findByRole("button", { name: /write a review/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Tab many times — focus must never escape the dialog.
    for (let i = 0; i < 25; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderReviews();
    await user.click(await screen.findByRole("button", { name: /write a review/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("exposes an accessible star rating radiogroup", async () => {
    const user = userEvent.setup();
    renderReviews();
    await user.click(await screen.findByRole("button", { name: /write a review/i }));

    const group = await screen.findByRole("radiogroup", { name: /your rating/i });
    expect(group).toHaveAttribute("aria-required", "true");
    const stars = screen.getAllByRole("radio");
    expect(stars).toHaveLength(5);

    await user.click(stars[3]);
    expect(stars[3]).toHaveAttribute("aria-checked", "true");
  });
});
