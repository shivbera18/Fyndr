import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminPage from "../AdminPage";

describe("AdminPage Storage Health and Revoke UI", () => {
  beforeEach(() => {
    sessionStorage.clear();
    jest.restoreAllMocks();
  });

  it("renders unlock form when not authenticated", () => {
    render(<AdminPage />);
    expect(screen.getByPlaceholderText("Admin password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlock" })).toBeInTheDocument();
  });

  it("displays auth_failed red alert banner when storage credentials are invalid", async () => {
    sessionStorage.setItem("fyndr-admin-key", "test-pass");

    const mockHealth = {
      healthy: false,
      g3Status: "auth_failed",
      g3Error: "invalid_grant: Google OAuth token expired or revoked. Re-linking required.",
      g3Accounts: [{ id: "acc_1", email: "test@gmail.com", status: "connected", storageLimit: 100, storageUsage: 10 }],
      driveStatus: "no_connections",
      driveCount: 0,
    };

    jest.spyOn(global, "fetch").mockImplementation((url) => {
      const u = String(url);
      if (u.includes("/admin/storage/health")) {
        return Promise.resolve(new Response(JSON.stringify(mockHealth), { status: 200 }));
      }
      if (u.includes("/admin/overview")) {
        return Promise.resolve(new Response(JSON.stringify({ users: 5, events: 2 }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("Google Drive Authentication Failure (invalid_grant)")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Revoke & Remove All Keys" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Re-link Google Account" })).toBeInTheDocument();
  });

  it("displays amber banner when no accounts are connected", async () => {
    sessionStorage.setItem("fyndr-admin-key", "test-pass");

    const mockHealth = {
      healthy: false,
      g3Status: "no_accounts",
      g3Accounts: [],
      driveStatus: "no_connections",
      driveCount: 0,
    };

    jest.spyOn(global, "fetch").mockImplementation((url) => {
      const u = String(url);
      if (u.includes("/admin/storage/health")) {
        return Promise.resolve(new Response(JSON.stringify(mockHealth), { status: 200 }));
      }
      if (u.includes("/admin/overview")) {
        return Promise.resolve(new Response(JSON.stringify({ users: 0, events: 0 }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("No Google Drive Storage Connected")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Connect Google Account" })).toBeInTheDocument();
  });

  it("displays verified green pill when healthy", async () => {
    sessionStorage.setItem("fyndr-admin-key", "test-pass");

    const mockHealth = {
      healthy: true,
      g3Status: "healthy",
      g3Accounts: [{ id: "acc_1", email: "test@gmail.com", status: "connected", storageLimit: 100, storageUsage: 10 }],
      driveStatus: "healthy",
      driveCount: 1,
    };

    jest.spyOn(global, "fetch").mockImplementation((url) => {
      const u = String(url);
      if (u.includes("/admin/storage/health")) {
        return Promise.resolve(new Response(JSON.stringify(mockHealth), { status: 200 }));
      }
      if (u.includes("/admin/overview")) {
        return Promise.resolve(new Response(JSON.stringify({ users: 10, events: 4 }), { status: 200 }));
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("Google Drive: Active & Verified")).toBeInTheDocument();
    });
  });
});
