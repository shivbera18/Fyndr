import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ReelPage from "../ReelPage";

jest.mock("../ReelCreatorModal", () => ({
  __esModule: true,
  default: (p: { photos: { name: string }[]; asPage?: boolean }) => (
    <div
      data-testid="reel-creator"
      data-photos={p.photos.map((x) => x.name).join(",")}
      data-aspage={String(p.asPage)}
    />
  ),
}));

const renderPage = (entry: string, state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: entry, state } as never]}>
      <Routes>
        <Route path="/reel/:eventId" element={<ReelPage />} />
        <Route path="/camera" element={<div>camera page</div>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  sessionStorage.clear();
  jest.spyOn(global, "fetch").mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          event: { event_name: "Simran Wedding", requireLead: true, paywall: { enabled: false } },
        }),
    } as Response)
  );
});

afterEach(() => {
  jest.restoreAllMocks();
  sessionStorage.clear();
});

test("reel page renders creator in page mode with cached matched photos", async () => {
  sessionStorage.setItem("fy-matched-evt1", JSON.stringify(["a.jpg", "b.jpg"]));
  renderPage("/reel/evt1");
  const creator = await screen.findByTestId("reel-creator");
  expect(creator.getAttribute("data-photos")).toBe("a.jpg,b.jpg");
  expect(creator.getAttribute("data-aspage")).toBe("true");
  // Fail-closed: the event fetch hydrates the lead flag for export gating.
  await waitFor(() => expect(sessionStorage.getItem("fy-require-lead-evt1")).toBe("1"));
});

test("reel page prefers navigation state over stale cache", async () => {
  sessionStorage.setItem("fy-matched-evt1", JSON.stringify(["old.jpg"]));
  renderPage("/reel/evt1", { photos: [{ name: "new1.jpg" }, { name: "new2.jpg" }] });
  const creator = await screen.findByTestId("reel-creator");
  expect(creator.getAttribute("data-photos")).toBe("new1.jpg,new2.jpg");
});

test("reel page shows find-photos CTA when no photos cached", async () => {
  renderPage("/reel/evt1");
  expect(await screen.findByText("No photos yet")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Find my photos/i })).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
});

test("back without a camera handoff lands deterministically on camera", async () => {
  sessionStorage.setItem("fy-matched-evt1", JSON.stringify(["a.jpg", "b.jpg"]));
  renderPage("/reel/evt1");
  await screen.findByTestId("reel-creator");
  fireEvent.click(screen.getByRole("button", { name: /Back to photos/i }));
  expect(await screen.findByText("camera page")).toBeInTheDocument();
});
