import React from "react";
import { render } from "@testing-library/react";
import { isFeatureEnabled } from "../featureFlags";

function ReelGate({ children, overrides }: { children: React.ReactNode; overrides?: Parameters<typeof isFeatureEnabled>[1] }) {
  if (!isFeatureEnabled("reel", overrides)) return null;
  return <>{children}</>;
}

describe("feature flag gating — reel", () => {
  const orig = process.env.REACT_APP_FEATURE_REEL;

  afterEach(() => {
    if (orig === undefined) delete process.env.REACT_APP_FEATURE_REEL;
    else process.env.REACT_APP_FEATURE_REEL = orig;
  });

  it("hides reel when flag OFF (default)", () => {
    delete process.env.REACT_APP_FEATURE_REEL;
    expect(isFeatureEnabled("reel")).toBe(false);
    const { container } = render(
      <ReelGate>
        <button>Create Reel</button>
      </ReelGate>
    );
    expect(container.textContent).not.toContain("Create Reel");
  });

  it("shows reel when flag ON via overrides (CRA test contract)", () => {
    delete process.env.REACT_APP_FEATURE_REEL;
    expect(isFeatureEnabled("reel", { reel: true })).toBe(true);
    const { container } = render(
      <ReelGate overrides={{ reel: true }}>
        <button>Create Reel</button>
      </ReelGate>
    );
    expect(container.textContent).toContain("Create Reel");
  });

  it("shows reel when flag ON via env", () => {
    process.env.REACT_APP_FEATURE_REEL = "true";
    expect(isFeatureEnabled("reel")).toBe(true);
    const { container } = render(
      <ReelGate>
        <button>Create Reel</button>
      </ReelGate>
    );
    expect(container.textContent).toContain("Create Reel");
  });

  it("gate is strict — only lowercase true enables", () => {
    process.env.REACT_APP_FEATURE_REEL = "True";
    expect(isFeatureEnabled("reel")).toBe(false);
    process.env.REACT_APP_FEATURE_REEL = "1";
    expect(isFeatureEnabled("reel")).toBe(false);
  });
});
