import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { BrowserRouter } from "react-router-dom";
import AccountMenu from "../AccountMenu";

describe("AccountMenu Component", () => {
  const mockUser = {
    _id: "usr_123",
    name: "Shiv Bera",
    email: "shiv@example.com",
  };

  const mockLogout = jest.fn();

  it("renders the account icon button with user initials without showing bare name text in the navbar", () => {
    render(
      <BrowserRouter>
        <AccountMenu user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );

    // Initial button displays initials
    const button = screen.getByRole("button", { name: /account settings and profile/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText("SB")).toBeInTheDocument();

    // Bare user name should NOT be rendered in the document before opening the menu
    expect(screen.queryByText("shiv@example.com")).not.toBeInTheDocument();
  });

  it("opens the account dropdown with quick navigation and My Account option on click", () => {
    render(
      <BrowserRouter>
        <AccountMenu user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );

    const button = screen.getByRole("button", { name: /account settings and profile/i });
    fireEvent.click(button);

    // Profile header inside popover
    expect(screen.getByText("Shiv Bera")).toBeInTheDocument();
    expect(screen.getByText("shiv@example.com")).toBeInTheDocument();

    // Menu options
    expect(screen.getByText("My Account")).toBeInTheDocument();
    expect(screen.getByText("Studio Settings & Branding")).toBeInTheDocument();
    expect(screen.getByText("Studio Analytics")).toBeInTheDocument();
    expect(screen.getByText("Create Event")).toBeInTheDocument();
    expect(screen.getByText("My Events")).toBeInTheDocument();
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });
  it("triggers onLogout when Sign out is clicked", () => {
    render(
      <BrowserRouter>
        <AccountMenu user={mockUser} onLogout={mockLogout} />
      </BrowserRouter>
    );

    const button = screen.getByRole("button", { name: /account settings and profile/i });
    fireEvent.click(button);

    const signOutBtn = screen.getByText("Sign out");
    fireEvent.click(signOutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
