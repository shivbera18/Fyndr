import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import AccountPage from "../AccountPage";

describe("AccountPage Component", () => {
  beforeEach(() => {
    localStorage.setItem(
      "user",
      JSON.stringify({
        _id: "usr_photographer_999",
        name: "Aria Sterling",
        email: "aria@sterlingstudios.com",
      })
    );

    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            _id: "usr_photographer_999",
            name: "Aria Sterling",
            email: "aria@sterlingstudios.com",
            isVerified: true,
            createdAt: "2024-01-15T00:00:00.000Z",
          }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it("renders the account hero section with name, email, and verified badge", async () => {
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Aria Sterling" })).toBeInTheDocument();
      expect(screen.getAllByText("aria@sterlingstudios.com").length).toBeGreaterThan(0);
      expect(screen.getByText("Verified Pro")).toBeInTheDocument();
    });
  });

  it("renders personal information inputs and save button", async () => {
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/full name \/ display name/i);
      expect(nameInput).toHaveValue("Aria Sterling");

      const emailInput = screen.getByLabelText(/email address \(login id\)/i);
      expect(emailInput).toHaveValue("aria@sterlingstudios.com");

      expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    });
  });

  it("renders security, connected studio, and danger zone sections", async () => {
    render(
      <BrowserRouter>
        <AccountPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/security & password/i)).toBeInTheDocument();
      expect(screen.getByText(/connected studio & client experience/i)).toBeInTheDocument();
      expect(screen.getByText(/danger zone/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /delete account/i })).toBeInTheDocument();
    });
  });
});
