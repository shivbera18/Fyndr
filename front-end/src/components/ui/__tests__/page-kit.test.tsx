import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  EmptyState,
  PageHero,
  PageShell,
  StatusBadge,
  UploadProgressBar,
} from "../page-kit";

describe("page-kit", () => {
  it("renders PageShell hero with kicker and actions", () => {
    render(
      <MemoryRouter>
        <PageShell header={<div>Site header</div>} footer={<div>Site footer</div>}>
          <PageHero
            kicker="Events"
            title="Find every photo you're in"
            lead="Scan, selfie, done."
            actions={<button type="button">Get started</button>}
          />
        </PageShell>
      </MemoryRouter>
    );

    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Find every photo you're in")).toBeInTheDocument();
    expect(screen.getByText("Scan, selfie, done.")).toBeInTheDocument();
    expect(screen.getByText("Get started")).toBeInTheDocument();
    expect(screen.getByText("Site header")).toBeInTheDocument();
    expect(screen.getByText("Site footer")).toBeInTheDocument();
  });

  it("hides chrome when showHeader/showFooter are false", () => {
    render(
      <MemoryRouter>
        <PageShell
          header={<div>Site header</div>}
          footer={<div>Site footer</div>}
          showHeader={false}
          showFooter={false}
        >
          <p>Body</p>
        </PageShell>
      </MemoryRouter>
    );

    expect(screen.queryByText("Site header")).not.toBeInTheDocument();
    expect(screen.queryByText("Site footer")).not.toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("renders EmptyState with actions", () => {
    render(
      <EmptyState
        title="No photos yet"
        body="Upload your first batch to light up this gallery."
        actions={<button type="button">Upload photos</button>}
      />
    );

    expect(screen.getByText("No photos yet")).toBeInTheDocument();
    expect(screen.getByText("Upload your first batch to light up this gallery.")).toBeInTheDocument();
    expect(screen.getByText("Upload photos")).toBeInTheDocument();
  });

  it("exposes upload progress stages via aria-valuenow", () => {
    const { rerender } = render(<UploadProgressBar value={25} stage="Uploading" />);
    expect(screen.getByText("Uploading")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");

    rerender(<UploadProgressBar value={150} stage="Processing" />);
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("renders status pills", () => {
    render(
      <>
        <StatusBadge status="ok">Ready</StatusBadge>
        <StatusBadge status="pending">Queued</StatusBadge>
        <StatusBadge status="error">Failed</StatusBadge>
      </>
    );

    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Queued")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });
});
