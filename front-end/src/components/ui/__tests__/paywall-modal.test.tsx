import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PaywallModal, PaywallConfig } from "../paywall-modal";
import * as mediaQueryHook from "../../../hooks/useMediaQuery";

jest.mock("../../../hooks/useMediaQuery");
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe("PaywallModal", () => {
  const defaultConfig: PaywallConfig = {
    enabled: true,
    stage: "download",
    pricePerPhoto: 49,
    priceFullAlbum: 199,
    freePhotoLimit: 2,
    currency: "INR",
    customMessage: "Unlock full resolution original files.",
  };

  beforeEach(() => {
    jest.spyOn(mediaQueryHook, "useMediaQuery").mockReturnValue({
      device: "desktop",
      width: 1280,
      height: 800,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders stage badge, pricing, and custom message", () => {
    render(
      <PaywallModal
        open={true}
        onOpenChange={jest.fn()}
        config={defaultConfig}
        studioName="DreamLens Studio"
        eventId="60c72b2f9b1d8b2bad000001"
        photoName="DSC_0042.JPG"
        matchedPhotoCount={12}
        onUnlockSuccess={jest.fn()}
      />
    );

    expect(screen.getByText("High-Resolution Download")).toBeInTheDocument();
    expect(screen.getByText("by DreamLens Studio")).toBeInTheDocument();
    expect(screen.getByText("Unlock full resolution original files.")).toBeInTheDocument();
    expect(screen.getByText("All Matched Photos")).toBeInTheDocument();
    expect(screen.getByText("₹199")).toBeInTheDocument();
    expect(screen.getByText("₹49")).toBeInTheDocument();
  });

  it("handles tier selection and test payment trigger", async () => {
    const handleSuccess = jest.fn();
    const handleOpenChange = jest.fn();

    render(
      <PaywallModal
        open={true}
        onOpenChange={handleOpenChange}
        config={defaultConfig}
        studioName="DreamLens Studio"
        eventId="60c72b2f9b1d8b2bad000001"
        photoName="DSC_0042.JPG"
        matchedPhotoCount={5}
        onUnlockSuccess={handleSuccess}
        testMode={true}
      />
    );

    // Initial tier is album (₹199)
    expect(screen.getByText(/Simulate Payment \(₹199\)/i)).toBeInTheDocument();

    // Select single photo tier (₹49)
    fireEvent.click(screen.getByText("Single Photo Only"));
    expect(screen.getByText(/Simulate Payment \(₹49\)/i)).toBeInTheDocument();

    // Click checkout
    fireEvent.click(screen.getByText(/Simulate Payment \(₹49\)/i));

    // Verify loading and test completion
    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: "single",
          photoName: "DSC_0042.JPG",
        })
      );
    }, { timeout: 3000 });
  });
});
