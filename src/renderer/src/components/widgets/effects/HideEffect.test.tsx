// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import type { PortEffectFragment } from "@/rekuest/api/graphql";
import type { MappablePort } from "@/rekuest/widgets/types";
import { PortsRootContext } from "@/rekuest/widgets/PortsRootContext";
import { HideEffect } from "./HideEffect";

const port = { key: "details", kind: "STRING" } as unknown as MappablePort;

const showWhenAdvanced = {
  __typename: "HideEffect",
  kind: "HIDE",
  fade: false,
  dependencies: ["mode"],
  call: {
    operation: "compare.eq",
    arguments: [
      { key: "a", value_path: "mode" },
      { key: "b", value_literal: "advanced" },
    ],
  },
} as unknown as PortEffectFragment;

const Harness = ({
  effect,
  onForm,
  path = ["details"],
  portsRoot = [],
  defaultValues = { mode: "basic", details: "" },
}: {
  effect: PortEffectFragment;
  onForm: (form: UseFormReturn) => void;
  path?: string[];
  portsRoot?: string[];
  defaultValues?: Record<string, unknown>;
}) => {
  const form = useForm({ defaultValues });
  onForm(form);
  return (
    <FormProvider {...form}>
      <PortsRootContext.Provider value={portsRoot}>
        <HideEffect effect={effect} port={port} path={path}>
          <span>details input</span>
        </HideEffect>
      </PortsRootContext.Provider>
    </FormProvider>
  );
};

describe("HideEffect", () => {
  it("shows and hides its port as the watched dependency changes", async () => {
    let form: UseFormReturn | null = null;
    render(<Harness effect={showWhenAdvanced} onForm={(f) => (form = f)} />);

    expect(screen.queryByText("details input")).toBeNull();

    await act(async () => {
      form!.setValue("mode", "advanced");
    });
    expect(screen.getByText("details input")).toBeTruthy();

    await act(async () => {
      form!.setValue("mode", "basic");
    });
    expect(screen.queryByText("details input")).toBeNull();
  });

  it("resolves the port and its dependencies under a form prefix (args.*)", async () => {
    let form: UseFormReturn | null = null;
    render(
      <Harness
        effect={showWhenAdvanced}
        onForm={(f) => (form = f)}
        path={["args", "details"]}
        portsRoot={["args"]}
        defaultValues={{ args: { mode: "basic", details: "" } }}
      />,
    );
    expect(screen.queryByText("details input")).toBeNull();
    await act(async () => {
      form!.setValue("args.mode", "advanced");
    });
    expect(screen.getByText("details input")).toBeTruthy();
  });

  it("resolves relative dependencies against the port's parent and absolute ones against the root", async () => {
    let form: UseFormReturn | null = null;
    const absolute = {
      ...showWhenAdvanced,
      dependencies: ["/mode"],
      call: {
        operation: "compare.eq",
        arguments: [
          { key: "a", value_path: "/mode" },
          { key: "b", value_literal: "advanced" },
        ],
      },
    } as unknown as PortEffectFragment;
    render(
      <Harness
        effect={absolute}
        onForm={(f) => (form = f)}
        path={["args", "model", "details"]}
        portsRoot={["args"]}
        defaultValues={{ args: { mode: "basic", model: { mode: "advanced", details: "" } } }}
      />,
    );
    // The sibling `model.mode` is "advanced" but the rule points at the root.
    expect(screen.queryByText("details input")).toBeNull();
    await act(async () => {
      form!.setValue("args.mode", "advanced");
    });
    expect(screen.getByText("details input")).toBeTruthy();
  });

  it("keeps the port visible and reports once when the call is broken", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = {
      ...showWhenAdvanced,
      call: { operation: "nope.missing", arguments: [] },
    } as unknown as PortEffectFragment;

    render(<Harness effect={broken} onForm={() => {}} />);

    expect(screen.getByText("details input")).toBeTruthy();
    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toMatch(/not found/);
    error.mockRestore();
  });
});
