import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Home from "../Home";
import { MobileNavToggle } from "../../../components/ui/resizable-navbar";

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

  test("hamburger toggle meets the 44px tap-target contract", () => {
    render(
      <MobileNavToggle isOpen={false} onClick={() => {}} />
    );
    const toggle = screen.getByRole("button", { name: /open menu/i });
    expect(toggle.className).toMatch(/min-h-\[44px\]/);
    expect(toggle.className).toMatch(/min-w-\[44px\]/);
  });

  test("demo carousel pauses offscreen via IntersectionObserver", () => {
    // ponytail: jsdom lacks IO — install a controllable mock, render, then
    // drive offscreen and assert the rotation interval is cleared.
    const observe = jest.fn();
    const disconnect = jest.fn();
    let ioCallback: ((entries: { isIntersecting: boolean }[]) => void) | undefined;
    const setIntervalSpy = jest.spyOn(window, "setInterval");
    const clearIntervalSpy = jest.spyOn(window, "clearInterval");
    Object.defineProperty(window, "IntersectionObserver", {
      value: jest.fn().mockImplementation((cb: (entries: { isIntersecting: boolean }[]) => void) => {
        ioCallback = cb;
        return { observe, disconnect, unobserve: jest.fn() };
      }),
      configurable: true,
      writable: true,
    });
    renderHome();
    expect(document.getElementById("fy-demo-card")).not.toBeNull();
    expect(observe).toHaveBeenCalled();
    // ponytail: effect starts stopped — drive visible first (interval on),
    // then offscreen (interval cleared). Matches the IO wiring in Home.
    ioCallback?.([{ isIntersecting: true }]);
    expect(setIntervalSpy).toHaveBeenCalled();
    ioCallback?.([{ isIntersecting: false }]);
    expect(clearIntervalSpy).toHaveBeenCalled();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    Reflect.deleteProperty(window, "IntersectionObserver");
  });
});
