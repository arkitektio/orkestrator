// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The refetch button needs a query client; it is not what is under test.
vi.mock("../ui/refetcher", () => ({ Refetcher: () => null }));
// jsdom has no Web Animations API for the grid's auto-animate to call.
vi.mock("@formkit/auto-animate/react", () => ({
  useAutoAnimate: () => [() => {}],
}));

import { createList } from "./createList";

type Item = { id: string; keep: boolean };
type Variables = { pagination: { limit?: number | null; offset: number } };

const items = (count: number): Item[] =>
  Array.from({ length: count }, (_, i) => ({ id: String(i), keep: i % 2 === 0 }));

const setup = (all: Item[], options: { autoHide?: boolean } = {}) => {
  const seen: Variables[] = [];
  const List = createList<{ things: Item[] }, never, never, never, Item>({
    useHook: ({ variables }) => {
      seen.push(variables as Variables);
      const { limit, offset } = variables.pagination;
      return {
        data: { things: all.slice(offset, offset + (limit ?? 20)) },
        loading: false,
        refetch: async () => ({}),
      };
    },
    dataKey: "things",
    ItemComponent: ({ item }: { item: Item }) => <div data-testid="item">{item.id}</div>,
    ...options,
  });
  return { List, seen };
};

const lastLimit = (seen: Variables[]) => seen[seen.length - 1].pagination.limit;

describe("createList", () => {
  it("follows a changing defaultLimit and restarts from the first page", () => {
    const { List, seen } = setup(items(200));
    const { rerender } = render(<List defaultLimit={30} />);
    expect(lastLimit(seen)).toBe(30);
    expect(screen.getAllByTestId("item")).toHaveLength(30);

    rerender(<List defaultLimit={100} />);
    expect(lastLimit(seen)).toBe(100);
    expect(seen[seen.length - 1].pagination.offset).toBe(0);
    expect(screen.getAllByTestId("item")).toHaveLength(100);
  });

  it("clientFilter hides items but paging still runs on the full page", () => {
    const { List, seen } = setup(items(25));
    render(<List defaultLimit={10} clientFilter={(item: Item) => item.keep} />);

    expect(screen.getAllByTestId("item")).toHaveLength(5);
    expect(screen.getByText("5 of 10 on this page hidden")).toBeTruthy();

    // The page was full (10), so a next page is offered although 5 are shown.
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[buttons.length - 1]);
    expect(seen[seen.length - 1].pagination.offset).toBe(10);
  });

  it("renders nothing when empty and autoHide is left on", () => {
    const { List } = setup([]);
    const { container } = render(<List />);
    expect(container.innerHTML).toBe("");
  });

  it("shows the empty state with its extra actions when autoHide is off", () => {
    const { List } = setup([], { autoHide: false });
    render(
      <List
        emptyTitle="No actions found"
        emptyActions={<button>Clear filters</button>}
      />,
    );
    expect(screen.getByText("No actions found")).toBeTruthy();
    expect(screen.getByText("Check Again")).toBeTruthy();
    expect(screen.getByText("Clear filters")).toBeTruthy();
  });
});
