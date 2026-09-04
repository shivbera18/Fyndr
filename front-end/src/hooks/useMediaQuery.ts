import { useEffect, useState } from "react";

function getDevice(): "mobile" | "tablet" | "desktop" | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return "desktop";
  try {
    const isDesktop = window.matchMedia("(min-width: 1024px)")?.matches;
    if (isDesktop) return "desktop";
    const isTablet = window.matchMedia("(min-width: 640px)")?.matches;
    if (isTablet) return "tablet";
    return "mobile";
  } catch {
    return "desktop";
  }
}

function getDimensions() {
  if (typeof window === "undefined") return null;

  return { width: window.innerWidth, height: window.innerHeight };
}

export function useMediaQuery() {
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop" | null>(
    getDevice(),
  );
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(getDimensions());

  useEffect(() => {
    const checkDevice = () => {
      setDevice(getDevice());
      setDimensions(getDimensions());
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);

    return () => {
      window.removeEventListener("resize", checkDevice);
    };
  }, []);

  return {
    device,
    width: dimensions?.width,
    height: dimensions?.height,
    isMobile: device === "mobile",
    isTablet: device === "tablet",
    isDesktop: device === "desktop",
  };
}
