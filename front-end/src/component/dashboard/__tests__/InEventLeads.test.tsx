import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import InEvent from "../InEvent";

describe("InEvent leads CSV export", () => {
  beforeAll(() => {
    HTMLCanvasElement.prototype.getContext = jest.fn();
    window.URL.createObjectURL = jest.fn(() => "mock-blob-url");
    window.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("exports CSV with kind and message columns, escaping multiline and formulas", async () => {
    let capturedCsv = "";
    const originalBlob = global.Blob;
    global.Blob = class MockBlob extends originalBlob {
      constructor(sources?: BlobPart[], options?: BlobPropertyBag) {
        super(sources, options);
        capturedCsv = (sources || []).map((s) => String(s)).join("");
      }
    };

    jest.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/leads") && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            leads: [
              {
                name: "Pooja",
                phone: "+919876543210",
                photos_found: 4,
                createdAt: "2026-09-09T10:00:00.000Z",
                kind: "gate",
              },
              {
                name: "Vikram",
                phone: "+919811122233",
                photos_found: 0,
                createdAt: "2026-09-09T10:15:00.000Z",
                kind: "booking",
                // Multiline message starting with formula trigger on 2nd line
                message: "Hi,\n=cmd|' /C calc'!A0",
              },
            ],
          }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response);
    });

    render(
      <BrowserRouter>
        <InEvent
          backbtn={jest.fn()}
          eventID="evt_leads_123"
          name="Test Gala"
          pin="123456"
          initialFolders={[]}
          initialLimit={0}
          initialLocked={false}
          setRefresh={jest.fn()}
        />
      </BrowserRouter>
    );
    const downloadBtn = await screen.findByRole("button", { name: /Download leads/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(screen.getByText(/Downloaded 2 leads \(1 booking inquiry\)\./i)).toBeInTheDocument();
    });

    // Check CSV structure: header has kind and message appended
    expect(capturedCsv).toContain("name,phone,photos_found,captured_at,kind,message");

    expect(capturedCsv).toContain('"Pooja","\'+919876543210","4","2026-09-09T10:00:00.000Z","gate",""');

    // Check booking lead: newlines replaced with space, formula trigger safely quoted
    expect(capturedCsv).toContain('"booking"');
    // Notice formula injection '=cmd' after flattening newline should become safe with leading quote
    expect(capturedCsv).toContain("Hi, =cmd");

    global.Blob = originalBlob;
  });
});
