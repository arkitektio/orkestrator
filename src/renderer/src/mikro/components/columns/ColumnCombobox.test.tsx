// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ColumnCombobox } from "./ColumnCombobox";

beforeAll(() => {
  // cmdk and Radix measure and scroll; jsdom has neither.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(cleanup);

const COLUMNS = [
  { name: "area_um2", unit: "micrometer ** 2", longName: "Area" },
  { name: "cluster_id", unit: null },
];

describe("ColumnCombobox", () => {
  it("shows the column on the trigger with its unit as a symbol, not the pint string", () => {
    render(<ColumnCombobox value="area_um2" columns={COLUMNS} onChange={() => {}} />);
    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("Area");
    expect(trigger.textContent).toContain("µm²");
    expect(trigger.textContent).not.toContain("**");
  });

  it("offers the columns, and picks one", () => {
    const onChange = vi.fn();
    render(<ColumnCombobox value="area_um2" columns={COLUMNS} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("cluster_id"));
    expect(onChange).toHaveBeenCalledWith("cluster_id");
  });

  it("says what leaving an optional column out means, and lets it go", () => {
    const onChange = vi.fn();
    render(<ColumnCombobox value="cluster_id" columns={COLUMNS} none="every row" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("every row"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("does not report a pick of the column already chosen", () => {
    const onChange = vi.fn();
    render(<ColumnCombobox value="cluster_id" columns={COLUMNS} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getAllByText("cluster_id").at(-1)!);
    expect(onChange).not.toHaveBeenCalled();
  });
});
