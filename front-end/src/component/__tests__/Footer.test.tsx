import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import Footer from "../Footer";

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );

describe("Footer (Slice D revamp)", () => {
  test("renders brand column with version badge and status pill", () => {
    renderFooter();
    expect(screen.getByText("FYNDR")).toBeInTheDocument();
    expect(screen.getByText("v1.0")).toBeInTheDocument();
    expect(screen.getByText("All systems operational")).toBeInTheDocument();
    expect(screen.getByText("Zero selfie storage")).toBeInTheDocument();
  });

  test("renders 4 reference link columns", () => {
    renderFooter();
    for (const heading of ["Product", "Resources", "Legal", "Account"]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByRole("navigation", { name: "Footer" })).toBeInTheDocument();
  });

  test("renders watermark band and bottom legal strip", () => {
    const { container } = renderFooter();
    const watermark = container.querySelector(".pointer-events-none.select-none");
    expect(watermark?.textContent).toMatch(/Fyndr/);
    expect(screen.getAllByText("Privacy Policy").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Terms").length).toBeGreaterThanOrEqual(1);
  });
});
