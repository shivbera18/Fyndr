import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateEventPage from "../CreateEventPage";
import Dashboard from "../Dashboard";

describe("cover preview blob-URL lifecycle", () => {
  let created: string[] = [];
  let revoked: string[] = [];

  beforeEach(() => {
    created = [];
    revoked = [];
    window.URL.createObjectURL = jest.fn(() => {
      const url = `blob:cover-${created.length}`;
      created.push(url);
      return url;
    });
    window.URL.revokeObjectURL = jest.fn((url: string) => {
      revoked.push(url);
    });
    localStorage.setItem("user", JSON.stringify({ _id: "u1" }));
  });

  afterEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  const suites: Array<{ label: string; renderPage: () => { container: HTMLElement; unmount: () => void } }> = [
    {
      label: "CreateEventPage",
      renderPage: () =>
        render(
          <MemoryRouter>
            <CreateEventPage />
          </MemoryRouter>
        ),
    },
    {
      label: "Dashboard create tab",
      renderPage: () => {
        const utils = render(
          <MemoryRouter>
            <Dashboard />
          </MemoryRouter>
        );
        fireEvent.click(screen.getByRole("button", { name: "Create New Event" }));
        return utils;
      },
    },
  ];

  function pickCover(container: HTMLElement, name: string): void {
    const input = container.querySelector(
      "input[type='file']"
    ) as HTMLInputElement;
    const file = new File(["x"], name, { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });
  }

  test.each(suites.map((x) => [x.label] as [string]))(
    "repeated cover picks revoke the previous preview URL (%s)",
    (label) => {
      const page = suites.find((x) => x.label === label);
      if (!page) throw new Error("suite missing");
      const { container, unmount } = page.renderPage();
      pickCover(container, "a.jpg");
      pickCover(container, "b.jpg");
      expect(created.length).toBe(2);
      expect(revoked).toEqual([created[0]]);
      expect(screen.getByAltText("Cover preview")).toBeInTheDocument();
      unmount();
      expect(revoked).toContain(created[1]);
    }
  );
});
