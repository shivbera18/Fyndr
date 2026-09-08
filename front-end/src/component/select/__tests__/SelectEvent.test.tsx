import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SelectEvent from "../Select_event";

describe("SelectEvent lock confirm flow", () => {
  jest.setTimeout(30000);
  const lockCalls: unknown[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    lockCalls.length = 0;
    jest.spyOn(global, "fetch").mockImplementation((url: any, init?: any) => {
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
        lockCalls.push(init ? init.body : null);
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

  test("header shows counter; first lock tap confirms, second submits", async () => {
    render(
      <MemoryRouter initialEntries={["/select/evt_1"]}>
        <Routes>
          <Route path="/select/:eventId" element={<SelectEvent />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Selected 1 \/ 120 album photos/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /lock & submit picks/i }));
    expect(await screen.findByText(/tap again to submit/i)).toBeInTheDocument();
    expect(lockCalls).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: /tap again to submit/i }));
    await waitFor(() => expect(lockCalls).toHaveLength(1));
    expect(await screen.findByText(/picks submitted and locked/i)).toBeInTheDocument();
  });
});
