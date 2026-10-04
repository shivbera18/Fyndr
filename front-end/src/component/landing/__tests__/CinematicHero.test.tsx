import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CinematicHero, { CinematicHeroForeground } from "../CinematicHero";

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

describe("CinematicHero", () => {
  const renderHero = () =>
    render(
      <MemoryRouter>
        <CinematicHero />
        <CinematicHeroForeground />
      </MemoryRouter>
    );

  test("renders Fyndr headline with emphasized words", () => {
    renderHero();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/find yourself/i);
    expect(screen.getByText(/every celebration/i)).toBeInTheDocument();
  });

  test("renders QR/selfie description, not foreign copy", () => {
    renderHero();
    expect(screen.getByText(/scan a QR/i)).toBeInTheDocument();
    expect(screen.queryByText(/brilliant minds/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/silence/i)).not.toBeInTheDocument();
  });

  test("video background restarts seamlessly on ended", () => {
    renderHero();
    const video = screen.getByTestId("cinematic-hero-video") as HTMLVideoElement;
    expect(video).toHaveAttribute(
      "src",
      expect.stringContaining("cloudfront.net")
    );
    expect(video.muted).toBe(true);
    expect(video.className).toMatch(/object-cover/);
    const film = screen.getByTestId("cinematic-film");
    expect(film.className).toMatch(/fixed/);
    expect(film.className).not.toMatch(/-z-10/);
    // ponytail: native loop attribute drives the restart — no manual
    // ended-handler left to cover, so assert the attribute itself.
    expect(video).toHaveAttribute("loop");
    expect(video).toHaveAttribute("poster");
  });

  test("Begin Journey buttons navigate to login", () => {
    renderHero();
    const buttons = screen.getAllByRole("button", { name: /begin journey/i });
    expect(buttons.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(buttons[0]);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  test("nav links point at Fyndr sections", () => {
    renderHero();
    expect(screen.getByRole("link", { name: /how it works/i })).toHaveAttribute("href", "/#how-it-works");
  });
});
