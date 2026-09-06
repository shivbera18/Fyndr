import { render, screen, fireEvent } from "@testing-library/react";
import CameraUploadCard from "../CameraUploadCard";

const statusDisabled = { host: "ftp.fyndr.in", port: 21, enabled: false, logins: [] };
const statusEnabled = {
  host: "ftp.fyndr.in",
  port: 21,
  enabled: true,
  logins: [{ tag: "a", username: "evt_ab12cd34", lastSeenAt: new Date().toISOString(), bytesIn: 8388608 }],
};
const freshLogins = [{ tag: "a", username: "evt_ab12cd34", password: "TestPass123AbC456XyZ789" }];

function mockFetch(handler: (url: string, init?: any) => any) {
  return jest.spyOn(global, "fetch").mockImplementation(((url: any, init?: any) => handler(String(url), init)) as any);
}

describe("CameraUploadCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test("shows the 4-step setup overview with enable CTA when off", async () => {
    mockFetch((url) => {
      if (url.includes("/ftp/status")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(statusDisabled) });
      }
      return Promise.reject(new Error("unexpected " + url));
    });
    render(<CameraUploadCard eventID="e1" ownerId="u1" />);
    expect(await screen.findByText("Camera-to-cloud upload")).toBeInTheDocument();
    expect(screen.getByText("Enable camera upload")).toBeInTheDocument();
    expect(screen.getByText(/Type the 3 fields into your camera/)).toBeInTheDocument();
  });

  test("enable flow shows once-only credentials and brand walkthrough tabs", async () => {
    let statusCalls = 0;
    mockFetch((url) => {
      if (url.includes("/ftp/enable")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ...statusEnabled, logins: freshLogins }) });
      }
      if (url.includes("/ftp/status")) {
        statusCalls += 1;
        return Promise.resolve({ ok: true, json: () => Promise.resolve(statusCalls === 1 ? statusDisabled : statusEnabled) });
      }
      return Promise.reject(new Error("unexpected " + url));
    });
    render(<CameraUploadCard eventID="e1" ownerId="u1" />);
    fireEvent.click(await screen.findByText("Enable camera upload"));
    expect(await screen.findByText(/shown once/i)).toBeInTheDocument();
    expect(screen.getByText("TestPass123AbC456XyZ789")).toBeInTheDocument();
    // Brand walkthrough tabs render; switching shows that brand's menu path.
    fireEvent.click(screen.getByRole("tab", { name: "Sony" }));
    expect(screen.getByText(/FTP Transfer Func/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Test/ }));
    expect(screen.getByText(/Quickconnect/)).toBeInTheDocument();
  });

  test("enabled state shows LIVE login row with ingress", async () => {
    mockFetch((url) => {
      if (url.includes("/ftp/status")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(statusEnabled) });
      }
      return Promise.reject(new Error("unexpected " + url));
    });
    render(<CameraUploadCard eventID="e1" ownerId="u1" />);
    expect(await screen.findByText("evt_ab12cd34")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("8.0 MB in")).toBeInTheDocument();
  });
});
