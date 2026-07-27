import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AdminOtpLogs from "@/pages/admin/OtpLogs";

const mocks = vi.hoisted(() => {
  const limitMock = vi.fn();
  const orderMock = vi.fn(() => ({ limit: limitMock }));
  const selectMock = vi.fn(() => ({ order: orderMock }));
  const fromMock = vi.fn(() => ({ select: selectMock }));
  return { fromMock, selectMock, orderMock, limitMock };
});

const otpRows = [
  {
    id: "retry-1",
    email: "trace@example.com",
    event_type: "send_retry",
    status: "warning",
    error_message: "SMTP_ERROR: temporary 502",
    ip: "127.0.0.1",
    user_agent: "vitest",
    metadata: {
      correlationId: "cid-shared-chain",
      chainCorrelationId: "cid-shared-chain",
      requestedCorrelationId: "cid-shared-chain",
      provider: "smtp:smtp.hostinger.com",
      providerResponse: "temporary 502",
      attemptNo: 1,
    },
    created_at: new Date().toISOString(),
  },
  {
    id: "sent-1",
    email: "trace@example.com",
    event_type: "sent",
    status: "success",
    error_message: null,
    ip: "127.0.0.1",
    user_agent: "vitest",
    metadata: {
      correlationId: "cid-shared-chain",
      chainCorrelationId: "cid-shared-chain",
      requestedCorrelationId: "cid-shared-chain",
      provider: "smtp:smtp.hostinger.com",
      providerResponse: "Message accepted by SMTP server",
      attemptNo: 2,
    },
    created_at: new Date().toISOString(),
  },
  {
    id: "other-1",
    email: "other@example.com",
    event_type: "failed",
    status: "error",
    error_message: "Incorrect code",
    ip: "127.0.0.2",
    user_agent: "vitest",
    metadata: { correlationId: "cid-other-chain" },
    created_at: new Date().toISOString(),
  },
];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.fromMock },
}));

describe("admin OTP audit logs", () => {
  beforeEach(() => {
    mocks.orderMock.mockReturnValue({ limit: mocks.limitMock });
    mocks.limitMock.mockResolvedValue({ data: otpRows, error: null });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("filters signup_otp_events rows by correlation ID, email, and retry/sent status", async () => {
    render(<AdminOtpLogs />);

    expect((await screen.findAllByText("trace@example.com")).length).toBeGreaterThan(0);
    expect(screen.getByText("other@example.com")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/filter correlation id/i), { target: { value: "cid-shared-chain" } });
    await waitFor(() => expect(screen.queryByText("other@example.com")).not.toBeInTheDocument());
    expect(screen.getAllByText("trace@example.com")).toHaveLength(2);

    fireEvent.change(screen.getByDisplayValue("All events"), { target: { value: "send_retry" } });
    await waitFor(() => expect(screen.getByText("Send retry")).toBeInTheDocument());
    expect(screen.queryByText(/message accepted by smtp server/i)).not.toBeInTheDocument();

    const retryRow = screen.getByText("Send retry").closest("tr");
    expect(retryRow).not.toBeNull();
    expect(within(retryRow!).getByText(/cid-shared-chain/)).toBeInTheDocument();
    expect(within(retryRow!).getByText(/provider/i)).toHaveTextContent("smtp:smtp.hostinger.com");

    fireEvent.change(screen.getByPlaceholderText(/filter email/i), { target: { value: "trace@example.com" } });
    expect(screen.getByText("trace@example.com")).toBeInTheDocument();
  });
});