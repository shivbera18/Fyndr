import { render, screen } from "@testing-library/react";
import { Button, Reveal } from "../primitives";

// ponytail: single check for the only branching logic in landing primitives
// (variant classes + IO reveal). Grow suites only if behavior grows.

type Callback = (entries: Array<{ isIntersecting: boolean; target: Element }>) => void;

let observerCb: Callback | null = null;

beforeEach(() => {
  observerCb = null;
  class MockObserver {
    constructor(cb: Callback) {
      observerCb = cb;
    }
    observe() {}
    disconnect() {}
  }
  window.IntersectionObserver = MockObserver as unknown as typeof IntersectionObserver;
});

test("Button composes variant and size classes", () => {
  render(
    <Button variant="outline" size="lg">
      Click
    </Button>
  );
  expect(screen.getByRole("button", { name: "Click" })).toHaveClass(
    "fy-btn fy-btn-outline fy-btn-lg"
  );
});

test("Reveal becomes visible on intersection", () => {
  const { container } = render(<Reveal>hello</Reveal>);
  const el = container.firstChild as HTMLElement;
  expect(el.classList.contains("is-visible")).toBe(false);
  if (observerCb === null) throw new Error("observer not attached");
  observerCb([{ isIntersecting: true, target: el }]);
  expect(el.classList.contains("is-visible")).toBe(true);
});
