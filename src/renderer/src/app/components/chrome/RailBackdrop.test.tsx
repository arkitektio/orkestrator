// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultSettings, type Settings } from "@/core/settings/store/validator";

let settings: Settings = { ...defaultSettings };
vi.mock("@/core/settings/store/SettingsContext", () => ({
  useSettings: () => ({ settings, setSettings: vi.fn() }),
}));

const loadBackdrop = vi.fn<() => Promise<Blob | null>>();
vi.mock("@/core/settings/store/backdropStore", () => ({ loadBackdrop: () => loadBackdrop() }));

import { RailBackdrop } from "./RailBackdrop";

const use = (overrides: Partial<Settings>) => {
  settings = { ...defaultSettings, ...overrides };
};

const root = () => document.documentElement;

describe("RailBackdrop", () => {
  let created = 0;
  beforeEach(() => {
    created = 0;
    URL.createObjectURL = vi.fn(() => `blob:backdrop-${++created}`);
    URL.revokeObjectURL = vi.fn();
    loadBackdrop.mockReset();
  });
  afterEach(() => root().classList.remove("rail-backdrop"));

  it("paints nothing, and reads no image, when there is no backdrop", () => {
    use({ railBackdrop: "none" });
    render(<RailBackdrop />);
    expect(screen.queryByTestId("rail-backdrop")).toBeNull();
    expect(loadBackdrop).not.toHaveBeenCalled();
    expect(root()).not.toHaveClass("rail-backdrop");
  });

  it("draws a built-in backdrop from the brand colour, at the chosen strength", () => {
    use({ railBackdrop: "aurora", railBackdropOpacity: 0.5 });
    render(<RailBackdrop />);
    const layer = screen.getByTestId("rail-backdrop");
    expect(layer.style.backgroundImage).toContain("--brand-hue");
    expect(layer.style.opacity).toBe("0.5");
    expect(root()).toHaveClass("rail-backdrop");
  });

  it("is the surface, not a thing on it: no pointer events, no drag opt-out", () => {
    use({ railBackdrop: "grid" });
    render(<RailBackdrop />);
    const layer = screen.getByTestId("rail-backdrop");
    expect(layer).toHaveClass("pointer-events-none");
    expect(layer).not.toHaveClass("app-no-drag");
    expect(layer).toHaveAttribute("aria-hidden", "true");
  });

  it("paints the stored image, placed as asked", async () => {
    loadBackdrop.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    use({ railBackdrop: "custom", railBackdropFit: "bottom" });
    render(<RailBackdrop />);
    const layer = await screen.findByTestId("rail-backdrop");
    expect(layer.style.backgroundImage).toContain("blob:backdrop-1");
    expect(layer.style.backgroundPosition).toBe("center bottom");
  });

  it("reads the image again when another window uploads a new one", async () => {
    loadBackdrop.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    use({ railBackdrop: "custom", railBackdropVersion: 1 });
    const { rerender } = render(<RailBackdrop />);
    await screen.findByTestId("rail-backdrop");

    use({ railBackdrop: "custom", railBackdropVersion: 2 });
    rerender(<RailBackdrop />);
    await waitFor(() => expect(screen.getByTestId("rail-backdrop").style.backgroundImage).toContain("blob:backdrop-2"));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:backdrop-1");
  });

  it("paints nothing when the image is gone from storage", async () => {
    loadBackdrop.mockResolvedValue(null);
    use({ railBackdrop: "custom" });
    render(<RailBackdrop />);
    await waitFor(() => expect(loadBackdrop).toHaveBeenCalled());
    expect(screen.queryByTestId("rail-backdrop")).toBeNull();
    expect(root()).not.toHaveClass("rail-backdrop");
  });

  it("takes its mark off the root when the backdrop is turned off", () => {
    use({ railBackdrop: "aurora" });
    const { rerender } = render(<RailBackdrop />);
    expect(root()).toHaveClass("rail-backdrop");
    use({ railBackdrop: "none" });
    rerender(<RailBackdrop />);
    expect(root()).not.toHaveClass("rail-backdrop");
  });
});
