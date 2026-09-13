// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/rekuest/api/graphql", () => ({
  PortKind: { MemoryStructure: "MEMORY_STRUCTURE" },
  useSearchMemoryDrawerLazyQuery: () => [vi.fn(async () => ({ data: { options: [] } }))],
}));

import type { InputWidgetProps } from "@/rekuest/widgets/types";
import { MemoryStructureWidget } from "./MemoryStructureWidget";

const port = {
  key: "drawer",
  kind: "MEMORY_STRUCTURE",
  identifier: "@rekuest/drawer",
  label: "Drawer",
} as unknown as InputWidgetProps["port"];

const Harness = ({ bound }: { bound?: string }) => {
  const form = useForm({ defaultValues: { drawer: undefined } });
  return (
    <FormProvider {...form}>
      <MemoryStructureWidget port={port} widget={null as never} path={["drawer"]} bound={bound} />
    </FormProvider>
  );
};

describe("MemoryStructureWidget", () => {
  it("survives switching from unbound to bound (hooks run in a fixed order)", () => {
    const { rerender } = render(<Harness />);
    expect(screen.getByText(/bound instance/)).toBeTruthy();
    expect(() => rerender(<Harness bound="agent-1" />)).not.toThrow();
    expect(screen.queryByText(/bound instance/)).toBeNull();
    expect(() => rerender(<Harness />)).not.toThrow();
  });
});
