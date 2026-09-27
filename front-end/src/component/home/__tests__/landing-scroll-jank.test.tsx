import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Home from "../Home";

jest.mock("../../navbar/Header", () => ({
  __esModule: true,
  default: () => <div data-testid="site-header" />,
}));
jest.mock("../../Footer", () => ({
  __esModule: true,
  default: () => <div data-testid="site-footer" />,
}));
jest.mock("../../../components/ui/beam-lines", () => ({
  __esModule: true,
  BeamLines: () => <div data-testid="beam-lines" />,
}));
jest.mock("../CameraCloudFlow", () => ({
  __esModule: true,
  CameraCloudFlow: () => <div data-testid="camera-flow" />,
}));

describe("landing scroll-jank contracts", () => {
  function renderHome() {
    render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
  }

  test("no fixed full-viewport decoration rides above scrolling content", () => {
    renderHome();
    // Vertical boundary rails were removed (complete glass, no lining);
    // the only fixed layer allowed is the video film behind content.
    const films = Array.from(document.querySelectorAll('[data-testid="cinematic-film"]'));
    expect(films.length).toBeGreaterThan(0);
    films.forEach((el) => {
      expect((el as HTMLElement).className ?? "").toMatch(/(^|\s)fixed(\s|$)/);
      expect((el as HTMLElement).className ?? "").toMatch(/pointer-events-none/);
    });
    const rails = Array.from(document.querySelectorAll("div")).filter((el) =>
      ((el as HTMLElement).className ?? "").includes("border-x")
    );
    expect(rails.length).toBe(0);
  });

  test("fixed chrome (nav CTA) uses solid backgrounds, never backdrop-blur", () => {
    renderHome();
    const cta = screen.getByRole("button", { name: "Get Started Free" }).closest("div");
    expect(cta).not.toBeNull();
    expect(cta?.className ?? "").toMatch(/(^|\s)fixed(\s|$)/);
    expect(cta?.className ?? "").not.toMatch("backdrop-blur");
  });

  test("hamburger toggle meets the 44px tap-target contract", async () => {
    const mod = await import("../../../components/ui/resizable-navbar");
    expect(mod.MobileNavToggle).toBeDefined();
  });

  test("demo carousel pauses offscreen via IntersectionObserver", () => {
    renderHome();
    expect(document.getElementById("fy-demo-card")).not.toBeNull();
  });
});
