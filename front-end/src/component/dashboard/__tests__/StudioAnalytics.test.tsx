import { render, screen, waitFor } from "@testing-library/react";
import StudioAnalytics from "../StudioAnalytics";

describe("StudioAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders studio overview metrics and global leads", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            totalEvents: 3,
            totalGuests: 150,
            verifiedGuests: 140,
            totalDownloads: 520,
            topEvents: [
              {
                eventId: "ev_1",
                eventName: "Kavita & Amit Wedding",
                guestsCount: 80,
                verifiedCount: 75,
                downloadsCount: 300,
                searchesCount: 120,
              },
            ],
            recentLeads: [
              {
                _id: "lead_1",
                guestName: "Ananya Roy",
                guestPhone: "+919811223344",
                eventId: "ev_1",
                eventName: "Kavita & Amit Wedding",
                verified: true,
                attempts: 1,
                failedAttempts: 0,
                searchesCount: 4,
                downloadsCount: 8,
                device: { type: "mobile", os: "iOS" },
                lastSeenAt: new Date().toISOString(),
              },
            ],
          }),
      } as any)
    );

    render(<StudioAnalytics userId="user_123" />);

    await waitFor(() => {
      expect(screen.getByText("Studio Analytics & Guest Leads")).toBeInTheDocument();
      expect(screen.getAllByText("Kavita & Amit Wedding").length).toBeGreaterThan(0);
      expect(screen.getByText("Ananya Roy")).toBeInTheDocument();
      expect(screen.getByText("+919811223344")).toBeInTheDocument();
    });
  });
});
