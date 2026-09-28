// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useForm } from "react-hook-form";

import { defaultSettings, type Settings } from "@/core/settings/store/validator";

const writerBrand = vi.fn();

vi.mock("@/core/connection/arkitekt/host", () => ({
  Arkitekt: {
    useActiveProfile: () => ({ label: { brandHue: 40, brandChroma: 0.3 } }),
  },
  Guard: { Lok: ({ children }: { children: React.ReactNode }) => <>{children}</> },
}));

// Stands in for the lok mutation: records what would be written to the membership.
vi.mock("@/lok/components/MembershipBrandWriter", () => ({
  default: ({ brand }: { brand: unknown }) => {
    writerBrand(brand);
    return null;
  },
}));

import { ThemeCustomizer } from "./ThemeCustomizer";

let form: ReturnType<typeof useForm<Settings>>;

const Harness = ({ source }: { source: Settings["brandSource"] }) => {
  form = useForm<Settings>({ defaultValues: { ...defaultSettings, brandSource: source } });
  return <ThemeCustomizer control={form.control} />;
};

const hueInput = () => screen.getByLabelText("Brand Hue (°)") as HTMLInputElement;

describe("ThemeCustomizer", () => {
  it("shows the membership's colour, not this machine's, and edits only the membership", () => {
    writerBrand.mockClear();
    render(<Harness source="membership" />);

    expect(hueInput().value).toBe("40");
    fireEvent.change(hueInput(), { target: { value: "200" } });

    expect(writerBrand).toHaveBeenLastCalledWith({ hue: 200, chroma: 0.3 });
    expect(form.getValues("brandHue")).toBe(defaultSettings.brandHue);
  });

  it("edits only local settings in local mode, and never mounts the membership writer", () => {
    writerBrand.mockClear();
    render(<Harness source="local" />);

    expect(hueInput().value).toBe(String(defaultSettings.brandHue));
    fireEvent.change(hueInput(), { target: { value: "120" } });

    expect(form.getValues("brandHue")).toBe(120);
    expect(writerBrand).not.toHaveBeenCalled();
  });

  it("switches the source through the toggle", () => {
    render(<Harness source="membership" />);
    fireEvent.click(screen.getByLabelText("Local colour"));
    expect(form.getValues("brandSource")).toBe("local");
  });
});
