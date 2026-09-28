// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installDndEngine } from "./engine";
import { SortableList } from "./SortableList";
import { FakeDataTransfer, fireDrag } from "./testing";

const ROW = 30;

type Item = { key: string; pinned?: boolean };

const List = ({
  items,
  onReorder,
  groupOf,
}: {
  items: Item[];
  onReorder: (id: string, to: number) => void;
  groupOf?: (item: Item) => string;
}) => (
  <SortableList
    as="ul"
    items={items}
    getId={(item) => item.key}
    onReorder={onReorder}
    groupOf={groupOf}
    data-testid="list"
    className="rows"
  >
    {(item, row) => (
      <li
        ref={(node) => {
          if (node) {
            // jsdom does no layout: the row is wherever it is rendered in the order.
            node.getBoundingClientRect = () =>
              ({ top: row.position * ROW, left: 0, width: 100, height: ROW }) as DOMRect;
          }
          row.ref(node);
        }}
        data-row={item.key}
        data-index={row.index}
      >
        {item.key}
      </li>
    )}
  </SortableList>
);

describe("SortableList", () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDndEngine(document);
  });
  afterEach(() => uninstall());

  const shown = () =>
    [...screen.getByTestId("list").children].map((row) => row.getAttribute("data-row"));

  const grab = (key: string) => {
    const dataTransfer = new FakeDataTransfer();
    act(() => void fireDrag(screen.getByText(key), "dragstart", { dataTransfer }));
    return {
      to: (clientY: number) =>
        act(() => void fireDrag(screen.getByTestId("list"), "dragover", { dataTransfer, clientY })),
      drop: (clientY: number) =>
        act(() => void fireDrag(screen.getByTestId("list"), "drop", { dataTransfer, clientY })),
    };
  };

  it("renders only the container it is given, with its props", () => {
    render(<List items={[{ key: "a" }]} onReorder={vi.fn()} />);
    const list = screen.getByTestId("list");
    expect(list.tagName).toBe("UL");
    expect(list.className).toBe("rows");
    expect(shown()).toEqual(["a"]);
  });

  it("parts the rows mid-drag and reorders by id on drop", () => {
    const onReorder = vi.fn();
    render(<List items={[{ key: "a" }, { key: "b" }, { key: "c" }]} onReorder={onReorder} />);
    const drag = grab("a");

    drag.to(80);
    expect(shown()).toEqual(["b", "c", "a"]);
    // The real index travels with the row, not its place in the preview.
    expect(screen.getByText("a").getAttribute("data-index")).toBe("0");

    drag.drop(80);
    expect(onReorder).toHaveBeenCalledWith("a", 2);
  });

  it("groups by the item", () => {
    const onReorder = vi.fn();
    const items = [{ key: "p1", pinned: true }, { key: "p2", pinned: true }, { key: "a" }, { key: "b" }];
    render(<List items={items} onReorder={onReorder} groupOf={(item) => (item.pinned ? "pinned" : "open")} />);

    const drag = grab("b");
    drag.to(5); // above everything
    expect(shown()).toEqual(["p1", "p2", "b", "a"]);
    drag.drop(5);
    expect(onReorder).toHaveBeenCalledWith("b", 2);
  });
});
