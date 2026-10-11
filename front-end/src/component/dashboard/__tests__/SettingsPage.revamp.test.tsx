import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SettingsPage from "../SettingsPage";

describe("SettingsPage revamp (Slice C)", () => {
  beforeEach(() => {
    localStorage.setItem("user", JSON.stringify({ _id: "u1", name: "Aria" }));
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test("renders PageHero voice and pill tab strip with deep-account link", () => {
    render(
      <MemoryRouter initialEntries={["/settings?tab=account"]}>
        <SettingsPage />
      </MemoryRouter>
    );
    expect(screen.getByText("Settings & Branding")).toBeInTheDocument();
    expect(screen.getByText(/how guests see your studio/i)).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /settings sections/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open the deep account page/i })).toHaveAttribute(
      "href",
      "/account"
    );
  });
});
