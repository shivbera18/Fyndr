import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomNav from "../BottomNav";

const renderNav = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>
  );

describe("BottomNav mobile bar", () => {
  beforeEach(() => {
    localStorage.setItem("user", JSON.stringify({ name: "Studio" }));
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("renders horizontal mobile-only bar on dashboard routes", () => {
    renderNav("/dashboard");
    const nav = screen.getByRole("navigation", { name: /Mobile Navigation Bar/i });
    expect(nav.className).toMatch(/flex flex-row/);
    expect(nav.className).toMatch(/md:hidden/);
    expect(nav.querySelectorAll("a")).toHaveLength(5);
  });

  test("stays visible on the Account page (a nav destination)", () => {
    renderNav("/account");
    expect(screen.getByRole("navigation", { name: /Mobile Navigation Bar/i })).toBeInTheDocument();
  });

  test("hidden on guest pages and when logged out", () => {
    const { unmount } = renderNav("/collect/evt_123");
    expect(screen.queryByRole("navigation", { name: /Mobile Navigation Bar/i })).not.toBeInTheDocument();
    unmount();
    localStorage.clear();
    renderNav("/dashboard");
    expect(screen.queryByRole("navigation", { name: /Mobile Navigation Bar/i })).not.toBeInTheDocument();
  });
});
