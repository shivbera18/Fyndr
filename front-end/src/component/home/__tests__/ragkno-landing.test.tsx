import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import RagknoLanding from "../RagknoLanding";

jest.mock("../../navbar/Header", () => ({
  __esModule: true,
  default: () => <div data-testid="site-header" />,
}));
jest.mock("../../Footer", () => ({
  __esModule: true,
  default: () => <div data-testid="site-footer" />,
}));
jest.mock("../DotGrid", () => ({
  __esModule: true,
  default: () => <div data-testid="dot-grid" />,
}));

describe("ragkno landing structure", () => {
  beforeEach(() => {
    // motion's useReducedMotion reads matchMedia().addEventListener directly.
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  function renderLanding() {
    render(
      <BrowserRouter>
        <RagknoLanding />
      </BrowserRouter>
    );
  }

  test("hero rotates event words and links to signup", () => {
    renderLanding();
    expect(screen.getAllByText(/Face search/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /Get Started/i }).length).toBeGreaterThan(0);
  });

  test("sections follow the reference order", () => {
    renderLanding();
    const sections = Array.from(document.querySelectorAll(".ragkno-landing > section, .ragkno-landing section"));
    const order = ["hero-section", "prompt-band", "bento-section", "how-it-works-section", "chat-demo-section", "use-cases-section", "faq-root-section", "cta-section"];
    let lastIndex = -1;
    order.forEach((name) => {
      const found = sections.findIndex((el) => (el as HTMLElement).className.includes(name));
      expect(found).toBeGreaterThan(lastIndex);
      lastIndex = found;
    });
  });

  test("how-it-works cards render three steps", () => {
    renderLanding();
    expect(screen.getAllByText(/Upload the album/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Guests take a selfie/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Gallery in seconds/i).length).toBeGreaterThan(0);
  });

  test("footer watermark carries Fyndr brand", () => {
    renderLanding();
    expect(screen.getByText("Fyndr", { selector: ".footer-watermark" })).toBeInTheDocument();
  });

  test("glass navbar renders with brand and auth links", () => {
    renderLanding();
    const nav = document.querySelector(".fy-top-nav");
    expect(nav).not.toBeNull();
    expect(screen.getByRole("navigation", { name: /Primary navigation/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Get started/i }).length).toBeGreaterThan(0);
  });

  test("hero shows the reference photo, not the gradient wash", () => {
    renderLanding();
    const photo = document.querySelector(".hero-section .hero-image") as HTMLImageElement | null;
    expect(photo).not.toBeNull();
    expect(photo?.getAttribute("src")).toContain("hero-photo.webp");
    expect(document.querySelector(".hero-section .fy-hero-wash")).toBeNull();
  });
});
