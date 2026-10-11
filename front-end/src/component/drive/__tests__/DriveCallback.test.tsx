import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import DriveCallback from "../DriveCallback";

jest.mock("../../../utils/session", () => ({
  purgeEphemeralCaches: jest.fn(() => Promise.resolve()),
}));

const renderCallback = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/api/accounts/callback${search}`]}>
      <DriveCallback />
    </MemoryRouter>
  );

describe("DriveCallback (Slice D revamp)", () => {
  beforeEach(() => {
    localStorage.setItem("user", JSON.stringify({ _id: "u1", name: "Op" }));
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test("shows spinner status while exchanging", () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as jest.Mock;
    renderCallback("?code=c&state=s");
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Connecting Google Drive")).toBeInTheDocument();
  });

  test("error shows Callout troubleshooting + retry, no auto-redirect", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "bad code" }) })
    ) as jest.Mock;
    renderCallback("?code=c&state=s");
    await waitFor(() => {
      expect(screen.getByText("Drive not connected")).toBeInTheDocument();
    });
    expect(screen.getByText("Troubleshoot the Drive link")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to settings/i })).toBeInTheDocument();
  });

  test("retry button re-fires the exchange", async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "expired" }) })
    ) as jest.Mock;
    global.fetch = fetchMock;
    renderCallback("?code=c&state=s");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });
    const callsBefore = fetchMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await waitFor(() => {
      expect(fetchMock.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  test("missing params show reconnect guidance", async () => {
    global.fetch = jest.fn() as jest.Mock;
    renderCallback("");
    await waitFor(() => {
      expect(screen.getByText(/missing code, state, or login/i)).toBeInTheDocument();
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
