// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// A popover over cmdk needs a layout engine; what is under test is what the
// control asks for and says, so both are flattened to what they contain.
vi.mock("@/core/ui/popover", () => ({
  Popover: ({ children, open, onOpenChange }: { children: ReactNode; open: boolean; onOpenChange?: (open: boolean) => void }) => (
    <div>
      <button type="button" onClick={() => onOpenChange?.(!open)}>toggle list</button>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <div data-testid="list">{children}</div>,
}));
vi.mock("@/core/ui/command", () => ({
  Command: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CommandInput: (props: { value: string; onValueChange: (value: string) => void; placeholder?: string }) => (
    <input aria-label="search" value={props.value} placeholder={props.placeholder} onChange={(event) => props.onValueChange(event.target.value)} />
  ),
  CommandItem: ({ children, onSelect }: { children: ReactNode; onSelect: () => void }) => (
    <button type="button" data-testid="row" onClick={onSelect}>{children}</button>
  ),
}));

import { PICKER_PAGE_SIZE, StructurePickerControl, type PickerRequest, type PickerScope } from "./StructurePickerControl";

afterEach(cleanup);

type Item = { id: string; name: string };

const mount = (
  load: (request: PickerRequest) => Promise<Item[]>,
  extra: { value?: string; onChange?: (id: string | undefined) => void; scope?: PickerScope; paged?: boolean; requires?: { key: string; operator: string; value?: unknown }[] } = {},
) =>
  render(
    <StructurePickerControl<Item>
      value={extra.value}
      onChange={extra.onChange ?? (() => undefined)}
      noun="lens"
      load={load}
      keyOf={(item) => item.id}
      renderRow={(item) => <span>{item.name}</span>}
      renderValue={(item) => <span>chosen {item.name}</span>}
      scope={extra.scope}
      paged={extra.paged}
      requires={extra.requires}
    />,
  );

describe("the structure picker control", () => {
  it("asks for nothing until it is opened, then for the first page", async () => {
    const load = vi.fn(async () => [{ id: "1", name: "cells.zarr" }]);
    mount(load);
    expect(load).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("toggle list"));

    expect(await screen.findByText("cells.zarr")).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith({ search: undefined, limit: PICKER_PAGE_SIZE, offset: 0 });
  });

  it("resolves the value it holds by its id, and hands back the id of what is picked", async () => {
    const onChange = vi.fn();
    const load = vi.fn(async (request: PickerRequest) =>
      request.ids ? [{ id: "7", name: "held" }] : [{ id: "1", name: "cells.zarr" }],
    );
    mount(load, { value: "7", onChange });
    expect(await screen.findByText("chosen held")).toBeInTheDocument();
    expect(load).toHaveBeenCalledWith({ ids: ["7"], limit: 1, offset: 0 });

    fireEvent.click(screen.getByText("toggle list"));
    fireEvent.click(await screen.findByText("cells.zarr"));
    expect(onChange).toHaveBeenCalledWith("1");
  });

  it("shows what fixes the list, so an empty one explains itself", async () => {
    mount(async () => [], { requires: [{ key: "@mikro/n_space_axes", operator: "EQUALS", value: 3 }] });
    fireEvent.click(screen.getByText("toggle list"));

    expect(await screen.findByText("No lens meets what this input requires.")).toBeInTheDocument();
    expect(screen.getByText(/@mikro\/n_space_axes equals 3/)).toBeInTheDocument();
  });

  it("offers to show all when a narrowing the user may lift leaves nothing", async () => {
    const onToggle = vi.fn();
    mount(async () => [], { scope: { label: "Narrowed by path", active: true, onToggle } });
    fireEvent.click(screen.getByText("toggle list"));

    expect(await screen.findByText("No lens here is narrowed by path.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Show all"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Narrowed by path", pressed: true }));
    expect(onToggle).toHaveBeenCalledTimes(2);
  });

  it("does not ask an unpaged source for a second page", async () => {
    const page = Array.from({ length: PICKER_PAGE_SIZE }, (_, index) => ({ id: String(index), name: `lens ${index}` }));
    const load = vi.fn(async () => page);
    mount(load, { paged: false });
    fireEvent.click(screen.getByText("toggle list"));

    expect(await screen.findByText("lens 0")).toBeInTheDocument();
    expect(screen.queryByText("Loading more…")).toBeNull();
    expect(load).toHaveBeenCalledTimes(1);
  });
});
