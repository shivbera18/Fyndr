import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import AdminPage from "../AdminPage";

const KEY = "fyndr-admin-key";

const USERS = [
  { _id: "u1", name: "Aria Sterling", email: "aria@studio.com", isVerified: true, createdAt: "", driveConnected: true },
  { _id: "u2", name: "Dev Patel", email: "dev@studio.com", isVerified: false, createdAt: "", driveConnected: false },
];

const routeFetch = () =>
  (jest.fn((url: string) => {
    if (String(url).includes("/admin/users")) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ users: USERS }) });
    }
    if (String(url).includes("/admin/drive") && !String(url).includes("disconnect")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ connections: [{ userId: "u1", email: "aria@studio.com", folderId: "f1" }] }),
      });
    }
    if (String(url).includes("disconnect")) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    }
    if (String(url).includes("/admin/g3/pool")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ accounts: [{ id: "g1", email: "pool@gmail.com", status: "connected", weight: 1, storageLimit: 0, storageUsage: 0 }], balancing: { strategy: "round_robin" } }),
      });
    }
    if (String(url).includes("/admin/queue/retry")) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ modified: 0 }) });
    }
    if (String(url).includes("/admin/queue")) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ failed: [] }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ users: 2, events: 5 }) });
  }) as jest.Mock);

const renderAdmin = () =>
  render(
    <MemoryRouter>
      <AdminPage />
    </MemoryRouter>
  );

describe("AdminPage (Slice D revamp)", () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  test("locked gate shows operator hero + unlock form", () => {
    global.fetch = routeFetch();
    renderAdmin();
    expect(screen.getByText("Admin console")).toBeInTheDocument();
    expect(screen.getByText("Operator mode")).toBeInTheDocument();
    expect(screen.getByLabelText("Admin password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /unlock/i })).toBeInTheDocument();
  });

  test("authed shows PageShell hero + 5 tabs", async () => {
    sessionStorage.setItem(KEY, "secret");
    global.fetch = routeFetch();
    renderAdmin();
    await waitFor(() => {
      expect(screen.getByRole("tablist", { name: /admin sections/i })).toBeInTheDocument();
    });
    for (const label of ["Overview", "Users", "Drive", "G3 pool", "Queue"]) {
      expect(screen.getByRole("tab", { name: new RegExp(label, "i") })).toBeInTheDocument();
    }
  });

  test("users tab has search filter that narrows the list", async () => {
    sessionStorage.setItem(KEY, "secret");
    global.fetch = routeFetch();
    renderAdmin();
    fireEvent.click(await screen.findByRole("tab", { name: /users/i }));
    await waitFor(() => {
      expect(screen.getByText("aria@studio.com")).toBeInTheDocument();
      expect(screen.getByText("dev@studio.com")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Search photographers"), { target: { value: "aria" } });
    expect(screen.getByText("aria@studio.com")).toBeInTheDocument();
    expect(screen.queryByText("dev@studio.com")).not.toBeInTheDocument();
  });

  test("drive disconnect opens ResponsiveModal (no window.confirm)", async () => {
    sessionStorage.setItem(KEY, "secret");
    const fetchMock = routeFetch();
    global.fetch = fetchMock;
    const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
    renderAdmin();
    fireEvent.click(await screen.findByRole("tab", { name: /^drive/i }));
    await waitFor(() => {
      expect(screen.getByText("aria@studio.com")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /^disconnect$/i }));
    expect(await screen.findByText("Disconnect Drive?")).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
    const modalBtns = screen.getAllByRole("button", { name: /^disconnect$/i });
    fireEvent.click(modalBtns[modalBtns.length - 1]);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/admin/drive/disconnect"),
        expect.objectContaining({ method: "POST" })
      );
    });
    confirmSpy.mockRestore();
  });

  test("g3 unlink opens confirm modal with account label", async () => {
    sessionStorage.setItem(KEY, "secret");
    global.fetch = routeFetch();
    renderAdmin();
    fireEvent.click(await screen.findByRole("tab", { name: /g3 pool/i }));
    await waitFor(() => {
      expect(screen.getByText("pool@gmail.com")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /^unlink$/i }));
    await waitFor(() => {
      expect(screen.getByText("Unlink G3 account?")).toBeInTheDocument();
      expect(screen.getByText(/pool@gmail\.com.*new uploads skip it/i)).toBeInTheDocument();
    });
  });

  test("empty queue shows clear-state instead of blank card", async () => {
    sessionStorage.setItem(KEY, "secret");
    global.fetch = routeFetch();
    renderAdmin();
    fireEvent.click(await screen.findByRole("tab", { name: /queue/i }));
    await waitFor(() => {
      expect(screen.getByText("Queue is clear")).toBeInTheDocument();
    });
  });
});
