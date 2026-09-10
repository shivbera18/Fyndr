import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InquiryModal } from "../InquiryModal";
import { trackEvent } from "../../../utils/analytics";

jest.mock("../../../utils/analytics", () => ({
  trackEvent: jest.fn(),
}));

describe("InquiryModal component", () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  test("renders inquiry form with studio name and pre-fills cached contact", () => {
    sessionStorage.setItem("fyndr_guest_name", "Rohit Verma");
    sessionStorage.setItem("fyndr_guest_phone", "+919876543210");

    render(
      <InquiryModal
        open={true}
        onOpenChange={jest.fn()}
        eventId="evt_123"
        studioName="Shutter Magic"
      />
    );

    expect(screen.getByText(/Inquire with Shutter Magic/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Rohit Verma")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+919876543210")).toBeInTheDocument();
    expect(screen.getByLabelText(/Message \(Optional\)/i)).toBeInTheDocument();
  });

  test("submits booking inquiry, satisfies lead gate, and displays success state", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ ok: true, deduped: false }),
    } as Response);

    render(
      <InquiryModal
        open={true}
        onOpenChange={jest.fn()}
        eventId="evt_123"
        studioName="Shutter Magic"
      />
    );

    fireEvent.change(screen.getByLabelText(/Your Name \*/i), {
      target: { value: "Aman Gupta" },
    });
    fireEvent.change(screen.getByLabelText(/Phone \/ WhatsApp Number \*/i), {
      target: { value: "+919812345678" },
    });
    fireEvent.change(screen.getByLabelText(/Message \(Optional\)/i), {
      target: { value: "Available for reception on Dec 15th?" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Send Inquiry →/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText(/Inquiry Sent!/i)).toBeInTheDocument();
    expect(screen.getByText(/Chat on WhatsApp instead ↗/i)).toBeInTheDocument();

    // Verify lead gate satisfied in sessionStorage
    expect(sessionStorage.getItem("fy-lead-evt_123")).toBe("1");
    expect(sessionStorage.getItem("fyndr_guest_name")).toBe("Aman Gupta");
    expect(sessionStorage.getItem("fyndr_guest_phone")).toBe("+919812345678");

    // Verify analytics tracking
    expect(trackEvent).toHaveBeenCalledWith("evt_123", "booking_inquiry", {
      hasMessage: true,
    });
  });

  test("handles 429 rate limit error gracefully", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "Too many inquiries" }),
    } as Response);

    render(
      <InquiryModal
        open={true}
        onOpenChange={jest.fn()}
        eventId="evt_123"
        initialName="Test"
        initialPhone="+919999999999"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Send Inquiry →/i }));

    expect(
      await screen.findByText(/Too many inquiries sent for this event right now/i)
    ).toBeInTheDocument();
  });
});
