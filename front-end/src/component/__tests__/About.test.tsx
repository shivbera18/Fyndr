import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import About from "../About";

jest.mock("../navbar/Header", () => () => <div>Site header</div>);
jest.mock("../Footer", () => () => <div>Site footer</div>);

const renderPage = () =>
  render(
    <BrowserRouter>
      <About />
    </BrowserRouter>
  );

describe("About revamp", () => {
  it("renders hero, setup steps, callout, and copyable snippet", () => {
    renderPage();
    expect(screen.getByText("Event photo sharing without the friction")).toBeInTheDocument();
    expect(screen.getByText("Upload the gallery")).toBeInTheDocument();
    expect(screen.getByText("Share the QR")).toBeInTheDocument();
    expect(screen.getByText("Guests find themselves")).toBeInTheDocument();
    expect(screen.getByText("Our Strict Privacy Promise")).toBeInTheDocument();
    expect(screen.getByText(/scan the qr at your table/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("copy button confirms after clipboard write", async () => {
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
    renderPage();
    await userEvent.click(screen.getByRole("button", { name: /copy/i }));
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
  });
});
