import { render, screen } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import EmailVerify from "../EmailVerify";
import ConfirmVerify from "../ConfirmVerify";

jest.mock("../../../utils/api", () => ({ API_URL: "http://localhost:5000" }));

describe("EmailVerify revamp", () => {
  it("renders split-shell with resend action and auto-redirect timer", () => {
    render(
      <MemoryRouter initialEntries={["/verify-email?email=a@studio.com"]}>
        <Routes>
          <Route path="/verify-email" element={<EmailVerify />} />
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("Every guest finds their photos in seconds.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resend verification link/i })).toBeInTheDocument();
    expect(screen.getByText(/redirecting to sign in in \d+s/i)).toBeInTheDocument();
  });
});

describe("ConfirmVerify revamp", () => {
  it("error state offers recovery link", () => {
    render(
      <BrowserRouter>
        <ConfirmVerify />
      </BrowserRouter>
    );
    expect(screen.getByText("Link expired")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /recover my account/i })).toHaveAttribute(
      "href",
      "/forgetpassword"
    );
  });

  it("success state confirms activation", () => {
    window.history.pushState({}, "", "/confirm?status=success");
    render(
      <BrowserRouter>
        <ConfirmVerify />
      </BrowserRouter>
    );
    expect(screen.getByText("Email verified")).toBeInTheDocument();
  });
});
