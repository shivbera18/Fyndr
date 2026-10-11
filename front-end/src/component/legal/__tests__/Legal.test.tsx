import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import PrivacyPage from "../PrivacyPage";
import TermsPage from "../TermsPage";

jest.mock("../../navbar/Header", () => () => <div>Site header</div>);
jest.mock("../../Footer", () => () => <div>Site footer</div>);

describe("legal editorial revamp", () => {
  it("privacy renders single-column numbered clauses with contact card", () => {
    render(
      <BrowserRouter>
        <PrivacyPage />
      </BrowserRouter>
    );
    expect(screen.getByText("Your photos stay yours")).toBeInTheDocument();
    expect(screen.getByText("Photos you upload")).toBeInTheDocument();
    expect(screen.getByText("Google Drive access")).toBeInTheDocument();
    expect(screen.getByText("Questions about your data?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /terms of service/i })).toBeInTheDocument();
  });

  it("terms keeps copy with contact card", () => {
    render(
      <BrowserRouter>
        <TermsPage />
      </BrowserRouter>
    );
    expect(screen.getByText("Simple, fair terms")).toBeInTheDocument();
    expect(screen.getByText("Your content")).toBeInTheDocument();
    expect(screen.getByText("Liability & termination")).toBeInTheDocument();
    expect(screen.getByText("Questions about these terms?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /privacy policy/i })).toBeInTheDocument();
  });
});
