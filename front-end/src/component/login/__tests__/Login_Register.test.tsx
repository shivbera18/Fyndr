import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Login_Register from "../Login_Register";

jest.mock("../../../utils/api", () => ({ API_URL: "http://localhost:5000" }));
jest.mock("../../../utils/session", () => ({ signOut: jest.fn() }));

const renderPage = () =>
  render(
    <BrowserRouter>
      <Login_Register />
    </BrowserRouter>
  );

describe("Login_Register revamp", () => {
  it("renders split-shell brand panel and mode tabs", () => {
    renderPage();
    expect(screen.getByText("Every guest finds their photos in seconds.")).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: /sign in or register/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sign in" })).toHaveAttribute("aria-selected", "true");
  });

  it("switches to register with motion mode switch", async () => {
    renderPage();
    await userEvent.click(screen.getByRole("tab", { name: "Register" }));
    expect(await screen.findByLabelText(/studio or photographer name/i)).toBeInTheDocument();
  });

  it("password fields expose eye toggle with 52px inputs", () => {
    renderPage();
    const pwd = screen.getByLabelText("Password") as HTMLInputElement;
    expect(pwd).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: /show password/i })).toBeInTheDocument();
  });
});
