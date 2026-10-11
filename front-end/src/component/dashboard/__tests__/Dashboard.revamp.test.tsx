import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "../Dashboard";

describe("Dashboard revamp (Slice C)", () => {
  beforeEach(() => {
    localStorage.setItem("user", JSON.stringify({ _id: "u1", name: "Aria" }));
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)
    );
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test("renders PageHero with live badge and tab pills", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(await screen.findByText("Photographer dashboard")).toBeInTheDocument();
    expect(screen.getByText(/accepting guest scans/i)).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /dashboard sections/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "My Events" })).toHaveAttribute("aria-selected", "true");
  });

  test("shows kit EmptyState when no events exist", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    expect(await screen.findByText("No events created yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create your first event/i })).toHaveAttribute(
      "href",
      "/create-event"
    );
  });

  test("switching to the create tab shows staged progress copy", async () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );
    await screen.findByText("No events created yet");
    fireEvent.click(screen.getByRole("tab", { name: "Create New Event" }));
    expect(screen.getByLabelText(/event name/i)).toBeInTheDocument();
    expect(screen.getByText(/set the guest PIN/i)).toBeInTheDocument();
  });
});
