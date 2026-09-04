import React from "react";
import { render, screen } from "@testing-library/react";
import { ResponsiveModal } from "../responsive-modal";
import * as mediaQueryHook from "../../../hooks/useMediaQuery";

// Mock the useMediaQuery hook
jest.mock("../../../hooks/useMediaQuery");

describe("ResponsiveModal", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders mobile drawer content when isMobile is true", () => {
    jest.spyOn(mediaQueryHook, "useMediaQuery").mockReturnValue({
      device: "mobile",
      width: 375,
      height: 667,
      isMobile: true,
      isTablet: false,
      isDesktop: false,
    });

    render(
      <ResponsiveModal
        open={true}
        onOpenChange={jest.fn()}
        title="Mobile Modal"
        description="Mobile description text"
      >
        <div>Mobile Children Content</div>
      </ResponsiveModal>
    );

    expect(screen.getByText("Mobile Modal")).toBeInTheDocument();
    expect(screen.getByText("Mobile description text")).toBeInTheDocument();
    expect(screen.getByText("Mobile Children Content")).toBeInTheDocument();
  });

  it("renders desktop dialog content when isMobile is false", () => {
    jest.spyOn(mediaQueryHook, "useMediaQuery").mockReturnValue({
      device: "desktop",
      width: 1280,
      height: 800,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    });

    render(
      <ResponsiveModal
        open={true}
        onOpenChange={jest.fn()}
        title="Desktop Modal"
        description="Desktop description text"
      >
        <div>Desktop Children Content</div>
      </ResponsiveModal>
    );

    expect(screen.getByText("Desktop Modal")).toBeInTheDocument();
    expect(screen.getByText("Desktop description text")).toBeInTheDocument();
    expect(screen.getByText("Desktop Children Content")).toBeInTheDocument();
  });
});
