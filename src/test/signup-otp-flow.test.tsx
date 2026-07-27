import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Signup from "@/pages/Signup";

const mocks = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  signInMock: vi.fn(),
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
  MockFunctionsHttpError: class MockFunctionsHttpError extends Error {
    context: Response;
    constructor(body: Record<string, unknown>, status = 400) {
      super("Edge Function returned a non-2xx status code");
      this.context = new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: mocks.invokeMock },
    auth: { signInWithPassword: mocks.signInMock },
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  FunctionsHttpError: mocks.MockFunctionsHttpError,
  FunctionsFetchError: class MockFunctionsFetchError extends Error {},
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toastMock }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mocks.navigateMock };
});

vi.mock("@/components/SEOHead", () => ({
  SEOHead: () => null,
}));

vi.mock("@/components/auth/AuthShell", () => ({
  AuthShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock("@/components/ui/input-otp", () => ({
  InputOTP: ({ value, onChange, disabled, children }: any) => (
    <div>
      <input
        aria-label="OTP code"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
      {children}
    </div>
  ),
  InputOTPGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  InputOTPSlot: () => <span />,
}));

const fillSignupForm = () => {
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: "Vikas Kumar" } });
  fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "rowally729@gmail.com" } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "Password#123" } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "Password#123" } });
};

const renderSignup = () => render(<Signup />, { wrapper: MemoryRouter });

describe("signup OTP UI flow", () => {
  beforeEach(() => {
    mocks.invokeMock.mockReset();
    mocks.signInMock.mockResolvedValue({ error: null });
    mocks.toastMock.mockReset();
    mocks.navigateMock.mockReset();
    vi.spyOn(crypto, "randomUUID").mockReturnValue("cid-test-chain" as `${string}-${string}-${string}-${string}-${string}`);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("simulates OTP verify success and shows the same correlation ID chain", async () => {
    mocks.invokeMock
      .mockResolvedValueOnce({ data: { success: true, correlationId: "cid-test-chain", resendAvailableInSec: 60, sentAt: new Date().toISOString(), retryCount: 0 }, error: null })
      .mockResolvedValueOnce({ data: { success: true, correlationId: "cid-test-chain", userId: "user-1" }, error: null });

    renderSignup();
    fillSignupForm();
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));

    expect(await screen.findByText(/verify your email/i)).toBeInTheDocument();
    expect(screen.getByText(/reference id:/i)).toHaveTextContent("cid-test-chain");

    fireEvent.change(screen.getByLabelText(/otp code/i), { target: { value: "123456" } });

    await waitFor(() => expect(screen.getByText(/account created/i)).toBeInTheDocument());
    expect(mocks.invokeMock).toHaveBeenNthCalledWith(1, "send-signup-otp", expect.objectContaining({
      body: expect.objectContaining({ correlationId: "cid-test-chain" }),
      headers: { "x-correlation-id": "cid-test-chain" },
    }));
    expect(mocks.invokeMock).toHaveBeenNthCalledWith(2, "verify-signup-otp", expect.objectContaining({
      body: expect.objectContaining({ correlationId: "cid-test-chain" }),
      headers: { "x-correlation-id": "cid-test-chain" },
    }));
  });

  it("renders already registered message and correlation ID on the signup screen", async () => {
    mocks.invokeMock.mockResolvedValueOnce({
      data: null,
      error: new mocks.MockFunctionsHttpError({
        error: "An account with this email already exists. Please log in instead.",
        correlationId: "cid-already-registered",
      }, 409),
    });
    vi.mocked(crypto.randomUUID).mockReturnValue("cid-already-registered" as `${string}-${string}-${string}-${string}-${string}`);

    renderSignup();
    fillSignupForm();
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(screen.getByText(/reference id:/i)).toHaveTextContent("cid-already-registered");
  });

  it("keeps the resend correlation chain through cooldown/rate-limited retries", async () => {
    mocks.invokeMock
      .mockResolvedValueOnce({ data: { success: true, correlationId: "cid-resend-chain", resendAvailableInSec: 0, sentAt: new Date().toISOString(), retryCount: 1 }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: new mocks.MockFunctionsHttpError({
          error: "Please wait 31s before requesting a new code.",
          retryAfter: 31,
          correlationId: "cid-resend-chain",
        }, 429),
      });
    vi.mocked(crypto.randomUUID).mockReturnValue("cid-resend-chain" as `${string}-${string}-${string}-${string}-${string}`);

    renderSignup();
    fillSignupForm();
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    expect(await screen.findByText(/verify your email/i)).toBeInTheDocument();
    expect(screen.getByText(/email delivered after 1 retry attempt/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /resend code/i }));

    expect((await screen.findAllByText(/please wait 31s/i)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/reference id:/i).at(-1)).toHaveTextContent("cid-resend-chain");
    expect(mocks.invokeMock).toHaveBeenNthCalledWith(2, "send-signup-otp", expect.objectContaining({
      body: expect.objectContaining({ correlationId: "cid-resend-chain" }),
      headers: { "x-correlation-id": "cid-resend-chain" },
    }));
  });

  it("renders OTP verification failure reason, inline hint, and correlation ID", async () => {
    mocks.invokeMock
      .mockResolvedValueOnce({ data: { success: true, correlationId: "cid-verify-fail", resendAvailableInSec: 60, sentAt: new Date().toISOString() }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: new mocks.MockFunctionsHttpError({
          error: "Incorrect code. 4 attempts left.",
          attemptsLeft: 4,
          correlationId: "cid-verify-fail",
        }, 401),
      });
    vi.mocked(crypto.randomUUID).mockReturnValue("cid-verify-fail" as `${string}-${string}-${string}-${string}-${string}`);

    renderSignup();
    fillSignupForm();
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    expect(await screen.findByText(/verify your email/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/otp code/i), { target: { value: "000000" } });

    expect(await screen.findByText(/incorrect code\. 4 attempts left/i)).toBeInTheDocument();
    expect(screen.getByText(/hint:/i)).toHaveTextContent("latest email");
    expect(screen.getAllByText(/reference id:/i).at(-1)).toHaveTextContent("cid-verify-fail");
  });
});