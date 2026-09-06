import { render, screen, waitFor } from "@testing-library/react";
import EventAnalyticsModal from "../EventAnalyticsModal";

describe("EventAnalyticsModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders KPI stat cards and guest ledger when open", async () => {
    jest.spyOn(global, "fetch").mockImplementation((url: any) => {
      const u = String(url);
      if (u.includes("/summary")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              totalVisitors: 42,
              uniqueGuests: 30,
              verifiedGuests: 28,
              totalAttempts: 35,
              failedAttempts: 2,
              totalSearches: 50,
              totalDownloads: 120,
              uniquePhotosDownloaded: 40,
              downloadConversionRate: 85,
              searchSuccessRate: 90,
            }),
        } as any);
      }
      if (u.includes("/guests")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              guests: [
                {
                  _id: "g1",
                  guestName: "Pooja Sharma",
                  guestPhone: "+919876543210",
                  attempts: 1,
                  failedAttempts: 0,
                  verified: true,
                  searchesCount: 3,
                  viewsCount: 10,
                  downloadsCount: 5,
                  device: { type: "mobile", os: "Android", browser: "Chrome" },
                  lastSeenAt: new Date().toISOString(),
                },
              ],
              total: 1,
            }),
        } as any);
      }
      if (u.includes("/timeline")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { time: "2026-09-04 14:00", views: 10, searches: 5, downloads: 12 },
            ]),
        } as any);
      }
      if (u.includes("/activity")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                _id: "a1",
                type: "pin_success",
                metadata: { name: "Pooja Sharma" },
                timestamp: new Date().toISOString(),
              },
            ]),
        } as any);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any);
    });

    render(
      <EventAnalyticsModal
        open={true}
        onOpenChange={jest.fn()}
        eventId="ev_123"
        eventName="Rohan & Simran Sangeet"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Event Analytics — Rohan & Simran Sangeet")).toBeInTheDocument();
      expect(screen.getByText("Total Visitors")).toBeInTheDocument();
      expect(screen.getByText("Pooja Sharma")).toBeInTheDocument();
      expect(screen.getByText("+919876543210")).toBeInTheDocument();
    });
  });
});
