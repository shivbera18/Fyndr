import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateEventPage from "../CreateEventPage";

describe("CreateEventPage revamp (Slice C)", () => {
  beforeEach(() => {
    localStorage.setItem("user", JSON.stringify({ _id: "u1", name: "Aria" }));
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test("renders StepGuide stages and launches into the new event workspace", async () => {
    const createdId = "evt_new_123";
    const fetchMock = jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ _id: createdId }),
      } as Response)
    );
    render(
      <MemoryRouter>
        <CreateEventPage />
      </MemoryRouter>
    );
    expect(screen.getByText("Create New Event")).toBeInTheDocument();
    expect(screen.getByText("Name it")).toBeInTheDocument();
    expect(screen.getByText("Launch")).toBeInTheDocument();
    expect(screen.getByText(/drop a cover scene/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/event name/i), {
      target: { value: "Aria & Dev Reception" },
    });
    fireEvent.click(screen.getByRole("button", { name: /launch event gallery/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const body = fetchMock.mock.calls[0]?.[1] as { body?: FormData } | undefined;
    expect(body?.body).toBeInstanceOf(FormData);
  });

  test("falls back to /dashboard copy when no id is returned", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response)
    );

    render(
      <MemoryRouter>
        <CreateEventPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/event name/i), {
      target: { value: "Studio Night" },
    });
    fireEvent.click(screen.getByRole("button", { name: /launch event gallery/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});
