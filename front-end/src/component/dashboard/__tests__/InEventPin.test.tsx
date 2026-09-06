import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import InEvent from "../InEvent";
describe("InEvent PIN update flow", () => {
  jest.setTimeout(30000);
  const mockBack = jest.fn();
  const mockSetRefresh = jest.fn();
  beforeAll(() => {
    // JSDOM does not implement HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = jest.fn();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test("updating to 'No PIN' sends created_id and updatePin: '' to /events/:id", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    jest.spyOn(global, "fetch").mockImplementation((url: any, init?: any) => {
      const u = String(url);
      if (u.includes("/events/evt_123") && init?.method === "PUT") {
        capturedUrl = u;
        capturedBody = JSON.parse(init.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ event: { _id: "evt_123", pin: "" } }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });

    render(
      <BrowserRouter>
        <InEvent
          backbtn={mockBack}
          eventID="evt_123"
          name="Test Wedding"
          pin="482193"
          ownerId="user_owner_456"
          initialFolders={[]}
          initialLimit={0}
          initialLocked={false}
          setRefresh={mockSetRefresh}
        />
      </BrowserRouter>
    );

    // Click "Change" PIN button
    const changePinBtn = screen.getByRole("button", { name: /change/i });
    fireEvent.click(changePinBtn);

    // Verify input is present with "Empty = No PIN" placeholder
    const pinInputField = screen.getByPlaceholderText("Empty = No PIN");
    expect(pinInputField).toBeInTheDocument();

    // Click "No PIN" button
    const noPinBtn = screen.getByRole("button", { name: /no pin/i });
    fireEvent.click(noPinBtn);
    expect((pinInputField as HTMLInputElement).value).toBe("");

    // Click "Save" button in the PIN editor container
    const pinEditorContainer = pinInputField.parentElement!;
    const savePinBtn = Array.from(pinEditorContainer.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Save"
    );
    expect(savePinBtn).toBeDefined();
    fireEvent.click(savePinBtn!);

    await waitFor(() => {
      expect(capturedUrl).toContain("/events/evt_123");
      expect(capturedBody).toEqual({
        created_id: "user_owner_456",
        updatePin: "",
      });
    });

    expect(await screen.findByText(/PIN removed\. Event is now public\./i)).toBeInTheDocument();
  });

  test("clicking Guest Analytics navigates to /events/:id/analytics", () => {
    render(
      <BrowserRouter>
        <InEvent
          backbtn={mockBack}
          eventID="evt_123"
          name="Test Wedding"
          pin="482193"
          ownerId="user_owner_456"
          initialFolders={[]}
          initialLimit={0}
          initialLocked={false}
          setRefresh={mockSetRefresh}
        />
      </BrowserRouter>
    );

    const guestAnalyticsBtn = screen.getByRole("button", { name: /Guest Analytics/i });
    expect(guestAnalyticsBtn).toBeInTheDocument();
    fireEvent.click(guestAnalyticsBtn);
    expect(window.location.pathname).toBe("/events/evt_123/analytics");
  });
});
