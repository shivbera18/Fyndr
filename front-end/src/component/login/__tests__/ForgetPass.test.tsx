import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import ForgetPass from "../ForgetPass";

jest.mock("../../../utils/api", () => ({ API_URL: "http://localhost:5000" }));

const renderPage = () =>
  render(
    <BrowserRouter>
      <ForgetPass />
    </BrowserRouter>
  );

describe("ForgetPass revamp", () => {
  it("renders split-shell with step indicator", () => {
    renderPage();
    expect(screen.getByText("Every guest finds their photos in seconds.")).toBeInTheDocument();
    expect(screen.getByLabelText("Password reset progress")).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it("step 2 shows 6 OTP boxes, resend countdown slot, and password eye toggle", async () => {
    const fetchMock = jest
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => ({}) } as Response);
    renderPage();
    await userEvent.type(screen.getByLabelText(/email address/i), "a@studio.com");
    await userEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    expect(await screen.findByRole("group", { name: /6-digit verification code/i })).toBeInTheDocument();
    expect(screen.getAllByLabelText(/digit \d/i)).toHaveLength(6);
    expect(screen.getByRole("button", { name: /resend in \d+s/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /show password/i })).toBeInTheDocument();
    fetchMock.mockRestore();
  });
});
