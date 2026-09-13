// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/rekuest/api/graphql", () => ({ PortKind: { Structure: "STRUCTURE" } }));

import type { InputWidgetProps } from "@/rekuest/widgets/types";
import { StructureWidget } from "./StructureWidget";

const port = {
  key: "image",
  kind: "STRUCTURE",
  identifier: "@mikro/image",
  label: "Image",
} as unknown as InputWidgetProps["port"];

const Harness = ({ onForm }: { onForm: (form: UseFormReturn) => void }) => {
  const form = useForm({ defaultValues: { image: undefined } });
  onForm(form);
  return (
    <FormProvider {...form}>
      <StructureWidget port={port} widget={null as never} path={["image"]} />
    </FormProvider>
  );
};

describe("StructureWidget", () => {
  it("stores the canonical { __identifier, object } value, not a bare string", () => {
    let form: UseFormReturn | null = null;
    render(<Harness onForm={(f) => (form = f)} />);
    fireEvent.change(screen.getByPlaceholderText("Id of the @mikro/image"), {
      target: { value: "42" },
    });
    expect(form!.getValues("image")).toEqual({ __identifier: "@mikro/image", object: "42" });
    fireEvent.change(screen.getByPlaceholderText("Id of the @mikro/image"), {
      target: { value: "" },
    });
    expect(form!.getValues("image")).toBeUndefined();
  });
});
