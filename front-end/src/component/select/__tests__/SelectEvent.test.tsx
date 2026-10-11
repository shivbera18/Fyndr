import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SelectEvent from "../Select_event";

jest.mock("../../../components/pwa", () => ({
  __esModule: true,
  PWAInstallButton: () => null,
}));

describe("SelectEvent lock confirm flow", () => {
  jest.setTimeout(30000);
  const lockCalls: unknown[] = [];
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    lockCalls.length = 0;
    jest.spyOn(global, "fetch").mockImplementation((url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/selection")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              event: {
                _id: "evt_1",
                event_name: "Test Wedding",
                selectionLimit: 120,
                selectionLocked: false,
                folders: [],
              },
              photos: [
                { _id: "p1", name: "a.jpg", isSelected: true },
                { _id: "p2", name: "b.jpg", isSelected: false },
              ],
              selectedCount: 1,
            }),
        } as Response);
      }
      if (u.includes("/lock")) {
        lockCalls.push(init?.body ?? null);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ selectionLocked: true }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={["/select/evt_1"]}>
        <Routes>
          <Route path="/select/:eventId" element={<SelectEvent />} />
        </Routes>
      </MemoryRouter>
    );

  test("sticky toolbar shows counter; submit opens confirm modal, confirm submits", async () => {
    renderPage();

    expect(await screen.findByText(/Selected 1 \/ 120 album photos/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /lock & submit picks/i }));
    expect(await screen.findByText(/Submit your picks\?/)).toBeInTheDocument();
    expect(lockCalls).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /^submit picks$/i }));
    await waitFor(() => expect(lockCalls).toHaveLength(1));
    expect(await screen.findByText(/Picks submitted/)).toBeInTheDocument();
  });

  test("note input lives in the lightbox, not on the tile", async () => {
    renderPage();
    await screen.findByText(/Selected 1 \/ 120 album photos/);

    expect(screen.queryByPlaceholderText(/Note for photographer/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Open photo 1/i }));
    const note = await screen.findByPlaceholderText(/Retouch note/i);
    expect(note).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pick for album|selected — tap to remove/i })).toBeInTheDocument();
  });
});
