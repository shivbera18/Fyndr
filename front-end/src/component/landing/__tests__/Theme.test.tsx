import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider, ThemeToggle } from "../Theme";

// ponytail: one check for the toggle round-trip (light->dark->light +
// persistence). System-preference branch is env-dependent; skip it.

beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

test("ThemeToggle flips data-theme and persists", () => {
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
  const btn = screen.getByRole("button", { name: /dark theme/i });
  expect(document.documentElement.dataset.theme).toBe("light");
  fireEvent.click(btn);
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("fy-theme")).toBe("dark");
  expect(
    screen.getByRole("button", { name: /light theme/i })
  ).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: /light theme/i }));
  expect(document.documentElement.dataset.theme).toBe("light");
});
