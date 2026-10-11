import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import GuestAnalyticsPage from "../GuestAnalyticsPage";

describe("GuestAnalyticsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem("user", JSON.stringify({ _id: "usr_owner_789", name: "Studio Owner" }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("renders comprehensive guest analytics page, KPI metrics, funnel, tabs and guest directory", async () => {
    jest.spyOn(global, "fetch").mockImplementation((url: any) => {
      const u = String(url);
      if (u.includes("/events/evt_abc123")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              _id: "evt_abc123",
              event_name: "Simran & Rohan Wedding",
              created_id: "usr_owner_789",
            }),
        } as any);
      }
      if (u.includes("/summary")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              totalVisitors: 88,
              uniqueGuests: 65,
              verifiedGuests: 58,
              totalAttempts: 70,
              failedAttempts: 3,
              totalSearches: 110,
              totalDownloads: 240,
              uniquePhotosDownloaded: 95,
              downloadConversionRate: 82.5,
              searchSuccessRate: 91.2,
              paywall: {
                enabled: true,
                stage: "download",
                pricePerPhoto: 49,
                priceFullAlbum: 199,
                freePhotoLimit: 0,
                currency: "INR",
                customMessage: "Thank you for joining our celebration!",
                unlockedCount: 14,
                totalRevenue: 2786,
              },
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
                  _id: "g_1",
                  guestName: "Ananya Patel",
                  guestPhone: "+919876543210",
                  attempts: 1,
                  failedAttempts: 0,
                  verified: true,
                  searchesCount: 4,
                  viewsCount: 15,
                  downloadsCount: 8,
                  device: { type: "mobile", os: "iOS", browser: "Mobile Safari" },
                  lastSeenAt: new Date().toISOString(),
                  firstSeenAt: new Date().toISOString(),
                },
                {
                  _id: "g_2",
                  guestName: "Rahul Verma",
                  guestPhone: "+919123456780",
                  attempts: 2,
                  failedAttempts: 1,
                  verified: false,
                  searchesCount: 0,
                  viewsCount: 2,
                  downloadsCount: 0,
                  device: { type: "desktop", os: "Windows", browser: "Chrome" },
                  lastSeenAt: new Date().toISOString(),
                  firstSeenAt: new Date().toISOString(),
                },
              ],
              total: 2,
            }),
        } as any);
      }
      if (u.includes("/timeline")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { time: "18:00", views: 25, searches: 12, downloads: 30 },
              { time: "19:00", views: 40, searches: 35, downloads: 80 },
            ]),
        } as any);
      }
      if (u.includes("/activity")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                _id: "act_1",
                type: "photo_download",
                metadata: { photoName: "Ceremony_042.jpg" },
                timestamp: new Date().toISOString(),
                guestAccessId: {
                  guestName: "Ananya Patel",
                  guestPhone: "+919876543210",
                  verified: true,
                },
              },
            ]),
        } as any);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any);
    });

    render(
      <MemoryRouter initialEntries={["/events/evt_abc123/analytics"]}>
        <Routes>
          <Route path="/events/:eventId/analytics" element={<GuestAnalyticsPage />} />
        </Routes>
      </MemoryRouter>
    );
    // Header & breadcrumbs
    expect(
      await screen.findByRole("heading", { name: /Simran & Rohan Wedding — Guest Analytics/i })
    ).toBeInTheDocument();
    expect(await screen.findByText(/Live Telemetry Active/i)).toBeInTheDocument();

    // Primary KPI cards
    expect(await screen.findByText("Total Visitors")).toBeInTheDocument();
    expect(await screen.findByText("Access Security")).toBeInTheDocument();
    expect(await screen.findByText("AI Face Searches")).toBeInTheDocument();
    expect(await screen.findByText("Photo Downloads")).toBeInTheDocument();

    // Funnel
    expect(await screen.findByText("Attendee Engagement Funnel")).toBeInTheDocument();
    expect(screen.getByText("1. Landed")).toBeInTheDocument();
    expect(screen.getByText("2. Verified")).toBeInTheDocument();
    expect(screen.getByText("3. Face Searched")).toBeInTheDocument();
    expect(screen.getByText("4. Converted")).toBeInTheDocument();

    // Guest Directory
    expect(await screen.findByText("Ananya Patel")).toBeInTheDocument();
    expect(screen.getByText("+919876543210")).toBeInTheDocument();
    expect(screen.getByText("Rahul Verma")).toBeInTheDocument();

    // Test tab switching: Audience & Devices
    const devicesTabBtn = screen.getByRole("button", { name: /Audience & Devices/i });
    fireEvent.click(devicesTabBtn);
    expect(await screen.findByText("Traffic & Activity Timeline")).toBeInTheDocument();
    expect(screen.getByText("Mobile Guests")).toBeInTheDocument();

    // Test tab switching: Monetization & Paywall
    const monetizationTabBtn = screen.getByRole("button", { name: /Monetization & Paywall/i });
    fireEvent.click(monetizationTabBtn);
    expect(await screen.findByText("Paywall Configuration")).toBeInTheDocument();
    expect(screen.getByText(/Thank you for joining our celebration!/i)).toBeInTheDocument();

    // Test tab switching: Live Audit Stream
    const auditTabBtn = screen.getByRole("button", { name: /Live Audit Stream/i });
    fireEvent.click(auditTabBtn);
    expect(await screen.findByText(/Downloaded photo "Ceremony_042.jpg"/i)).toBeInTheDocument();
  });
});
