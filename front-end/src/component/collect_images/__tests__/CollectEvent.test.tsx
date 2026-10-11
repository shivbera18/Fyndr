import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CollectEvent from "../Collect_event";

jest.mock("../../../utils/analytics", () => ({
  trackEvent: jest.fn(),
  recordAccessAttempt: jest.fn(),
}));

jest.mock("../InquiryModal", () => ({
  __esModule: true,
  InquiryModal: () => null,
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/collect/evt_1"]}>
      <Routes>
        <Route path="/collect/:eventId" element={<CollectEvent />} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  sessionStorage.clear();
  jest.spyOn(global, "fetch").mockImplementation(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          event: { event_name: "Simran Wedding", requireLead: true, pin: "123456" },
          studio: { studio_name: "Shutter Magic" },
        }),
    } as Response)
  );
});

afterEach(() => {
  jest.restoreAllMocks();
  sessionStorage.clear();
});

test("event cover + split PIN boxes render; typing advances boxes", async () => {
  renderPage();
  expect(await screen.findByText("Simran Wedding")).toBeInTheDocument();
  expect(screen.getByText(/Why do we need this/i)).toBeInTheDocument();

  const boxes = await screen.findAllByLabelText(/PIN digit \d/);
  expect(boxes).toHaveLength(6);

  fireEvent.change(boxes[0], { target: { value: "1" } });
  expect((boxes[0] as HTMLInputElement).value).toBe("1");
  expect(document.activeElement).toBe(boxes[1]);

  fireEvent.change(boxes[1], { target: { value: "2" } });
  expect((boxes[1] as HTMLInputElement).value).toBe("2");
});

test("PIN paste fills all boxes", async () => {
  const { recordAccessAttempt } = jest.requireMock("../../../utils/analytics") as {
    recordAccessAttempt: jest.Mock;
  };
  recordAccessAttempt.mockResolvedValue({ ok: true, verified: true });
  renderPage();
  const boxes = await screen.findAllByLabelText(/PIN digit \d/);
  fireEvent.paste(boxes[0], {
    clipboardData: { getData: () => "654321" },
  } as unknown as ClipboardEvent);
  const values = boxes.map((b) => (b as HTMLInputElement).value).join("");
  expect(values).toBe("654321");
});

test("name + phone + PIN submit navigates to camera", async () => {
  const { recordAccessAttempt } = jest.requireMock("../../../utils/analytics") as {
    recordAccessAttempt: jest.Mock;
  };
  recordAccessAttempt.mockResolvedValue({ ok: true, verified: true });
  render(
    <MemoryRouter initialEntries={["/collect/evt_1"]}>
      <Routes>
        <Route path="/collect/:eventId" element={<CollectEvent />} />
        <Route path="/camera" element={<div>camera page</div>} />
      </Routes>
    </MemoryRouter>
  );
  await screen.findByText("Simran Wedding");

  fireEvent.change(screen.getByLabelText(/Your Full Name/i), { target: { value: "Rahul Sharma" } });
  fireEvent.change(screen.getByLabelText(/Mobile \/ WhatsApp Number/i), { target: { value: "+919876543210" } });
  const boxes = await screen.findAllByLabelText(/PIN digit \d/);
  fireEvent.paste(boxes[0], {
    clipboardData: { getData: () => "123456" },
  } as unknown as ClipboardEvent);
  fireEvent.click(screen.getByRole("button", { name: /Unlock Gallery/i }));

  expect(await screen.findByText("camera page")).toBeInTheDocument();
  expect(recordAccessAttempt).toHaveBeenCalledWith("evt_1", "Rahul Sharma", "+919876543210", "123456");
});
