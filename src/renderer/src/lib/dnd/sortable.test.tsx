// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installDndEngine } from "./engine";
import {
  closestEdge,
  moved,
  prospectiveIndex,
  reorderedIndex,
  useSortableItem,
  useSortableList,
  useSortableListId,
  useSortableRow,
  type SortableList,
} from "./sortable";
import { FakeDataTransfer, fireDrag } from "./testing";

describe("where a dropped row lands", () => {
  it("is the index it has once it has moved", () => {
    // [a b c d]: a onto the lower half of c → [b c a d]
    expect(reorderedIndex(0, 2, "after")).toBe(2);
    // a onto the upper half of c → [b a c d]
    expect(reorderedIndex(0, 2, "before")).toBe(1);
    // d onto the upper half of b → [a d b c]
    expect(reorderedIndex(3, 1, "before")).toBe(1);
    // d onto the lower half of b → [a b d c]
    expect(reorderedIndex(3, 1, "after")).toBe(2);
  });

  it("is where it already was, next to itself", () => {
    expect(reorderedIndex(1, 1, "before")).toBe(1);
    expect(reorderedIndex(1, 1, "after")).toBe(1);
    expect(reorderedIndex(1, 0, "after")).toBe(1);
    expect(reorderedIndex(1, 2, "before")).toBe(1);
  });

  it("goes by the half of the row the pointer is in", () => {
    const rect = { top: 100, left: 0, width: 200, height: 40 };
    expect(closestEdge(rect, { clientX: 10, clientY: 105 }, "vertical")).toBe("before");
    expect(closestEdge(rect, { clientX: 10, clientY: 135 }, "vertical")).toBe("after");
    expect(closestEdge(rect, { clientX: 10, clientY: 135 }, "horizontal")).toBe("before");
    expect(closestEdge(rect, { clientX: 150, clientY: 135 }, "horizontal")).toBe("after");
  });
});

const ROW_HEIGHT = 40;

const Row = ({
  list,
  index,
  label,
  onReorder,
}: {
  list: string;
  index: number;
  label: string;
  onReorder: (from: number, to: number) => void;
}) => {
  const { ref, edge } = useSortableItem({ list, index, onReorder });
  return (
    <div
      ref={(node) => {
        if (node) {
          // jsdom does no layout.
          node.getBoundingClientRect = () =>
            ({ top: index * ROW_HEIGHT, left: 0, width: 100, height: ROW_HEIGHT }) as DOMRect;
        }
        ref(node);
      }}
      data-edge={edge ?? undefined}
    >
      {label}
    </div>
  );
};

const List = ({ onReorder }: { onReorder: (from: number, to: number) => void }) => {
  const list = useSortableListId();
  return (
    <>
      {["a", "b", "c"].map((label, index) => (
        <Row key={label} list={list} index={index} label={label} onReorder={onReorder} />
      ))}
    </>
  );
};

describe("a sortable list", () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDndEngine(document);
  });
  afterEach(() => uninstall());

  const over = (label: string, clientY: number, dataTransfer: FakeDataTransfer) =>
    act(() => void fireDrag(screen.getByText(label), "dragover", { dataTransfer, clientY }));

  it("shows the line on the edge the row would go to, and moves it there", () => {
    const onReorder = vi.fn();
    render(<List onReorder={onReorder} />);
    const dataTransfer = new FakeDataTransfer();
    act(() => void fireDrag(screen.getByText("a"), "dragstart", { dataTransfer }));

    over("c", 2 * ROW_HEIGHT + 30, dataTransfer);
    expect(screen.getByText("c").getAttribute("data-edge")).toBe("after");

    over("c", 2 * ROW_HEIGHT + 5, dataTransfer);
    expect(screen.getByText("c").getAttribute("data-edge")).toBe("before");

    act(() => void fireDrag(screen.getByText("c"), "drop", { dataTransfer, clientY: 2 * ROW_HEIGHT + 5 }));
    expect(onReorder).toHaveBeenCalledWith(0, 1);
    expect(screen.getByText("c").hasAttribute("data-edge")).toBe(false);
  });

  it("shows no line, and moves nothing, where the row already is", () => {
    const onReorder = vi.fn();
    render(<List onReorder={onReorder} />);
    const dataTransfer = new FakeDataTransfer();
    act(() => void fireDrag(screen.getByText("a"), "dragstart", { dataTransfer }));

    over("b", ROW_HEIGHT + 5, dataTransfer); // upper half of b: still first
    expect(screen.getByText("b").hasAttribute("data-edge")).toBe(false);

    act(() => void fireDrag(screen.getByText("b"), "drop", { dataTransfer, clientY: ROW_HEIGHT + 5 }));
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("takes no row from another list", () => {
    const first = vi.fn();
    const second = vi.fn();
    render(
      <>
        <List onReorder={first} />
        <div data-testid="other">
          <List onReorder={second} />
        </div>
      </>,
    );
    const dataTransfer = new FakeDataTransfer();
    const foreign = screen.getByTestId("other").firstElementChild!;
    act(() => void fireDrag(screen.getAllByText("a")[0], "dragstart", { dataTransfer }));

    const event = fireDrag(foreign.nextElementSibling!.nextElementSibling!, "drop", {
      dataTransfer,
      clientY: 2 * ROW_HEIGHT + 30,
    });

    expect(event.defaultPrevented).toBe(false);
    expect(second).not.toHaveBeenCalled();
  });
});

describe("where a row would sit, rows parting", () => {
  // Three rows, 30 high: middles at 15, 45, 75.
  const MIDS = [15, 45, 75];

  it("stays put until the pointer passes the middle of the next row", () => {
    expect(prospectiveIndex(MIDS, 0, 10)).toBe(0);
    expect(prospectiveIndex(MIDS, 0, 44)).toBe(0);
    expect(prospectiveIndex(MIDS, 0, 46)).toBe(1);
    expect(prospectiveIndex(MIDS, 0, 80)).toBe(2);
  });

  it("goes up the same way", () => {
    expect(prospectiveIndex(MIDS, 2, 60)).toBe(2);
    expect(prospectiveIndex(MIDS, 2, 40)).toBe(1);
    expect(prospectiveIndex(MIDS, 2, 5)).toBe(0);
  });

  it("answers from the same measurements wherever the rows have slid to since", () => {
    // Past 45 the second row makes way; the pointer at 50 is now over the gap,
    // and would be above that row's new middle. It stays made-way all the same.
    expect(prospectiveIndex(MIDS, 0, 50)).toBe(1);
    expect(prospectiveIndex(MIDS, 0, 50)).toBe(1);
  });

  it("takes rows of uneven height by their own middles", () => {
    // 20, 100, 20 high: middles at 10, 70, 130.
    expect(prospectiveIndex([10, 70, 130], 0, 60)).toBe(0);
    expect(prospectiveIndex([10, 70, 130], 0, 71)).toBe(1);
  });

  it("stops at the ends of the list, and of the span it is given", () => {
    expect(prospectiveIndex(MIDS, 1, -500)).toBe(0);
    expect(prospectiveIndex(MIDS, 1, 500)).toBe(2);
    expect(prospectiveIndex(MIDS, 2, -500, [1, 2])).toBe(1);
    expect(prospectiveIndex(MIDS, 0, 500, [0, 0])).toBe(0);
  });

  it("moves an id to the index it has once moved", () => {
    expect(moved(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
    expect(moved(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moved(["a", "b", "c"], 1, 1)).toEqual(["a", "b", "c"]);
  });
});

const PARTING_ROW = 30;

const PartingRow = ({ list, id, slot }: { list: SortableList; id: string; slot: number }) => {
  const { ref } = useSortableRow(list, id);
  return (
    <div
      ref={(node) => {
        if (node) {
          // jsdom does no layout: the row is wherever it is rendered in the order.
          node.getBoundingClientRect = () =>
            ({ top: slot * PARTING_ROW, left: 0, width: 100, height: PARTING_ROW }) as DOMRect;
        }
        ref(node);
      }}
      data-row={id}
    >
      {id}
    </div>
  );
};

const PartingList = ({
  ids,
  onReorder,
  groupOf,
  testId = "list",
}: {
  ids: string[];
  onReorder: (id: string, to: number) => void;
  groupOf?: (id: string) => string;
  testId?: string;
}) => {
  const list = useSortableList({ ids, onReorder, groupOf });
  return (
    <div ref={list.ref} data-testid={testId}>
      {list.order.map((id, slot) => (
        <PartingRow key={id} list={list} id={id} slot={slot} />
      ))}
    </div>
  );
};

describe("a list whose rows part", () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installDndEngine(document);
  });
  afterEach(() => uninstall());

  const shown = (testId = "list") =>
    [...screen.getByTestId(testId).children].map((row) => row.getAttribute("data-row"));

  const grab = (id: string) => {
    const dataTransfer = new FakeDataTransfer();
    act(() => void fireDrag(screen.getByText(id), "dragstart", { dataTransfer }));
    return {
      to: (clientY: number, testId = "list") =>
        act(() => void fireDrag(screen.getByTestId(testId), "dragover", { dataTransfer, clientY })),
      drop: (clientY: number) =>
        act(() => void fireDrag(screen.getByTestId("list"), "drop", { dataTransfer, clientY })),
      cancel: () => act(() => void fireDrag(screen.getByText(id), "dragend", { dataTransfer })),
      leave: () =>
        act(() => void fireDrag(document.body, "dragover", { dataTransfer, clientY: 500 })),
    };
  };

  it("shows the order it would have while the drag is still in the air", () => {
    const onReorder = vi.fn();
    render(<PartingList ids={["a", "b", "c"]} onReorder={onReorder} />);
    const drag = grab("a");

    drag.to(40);
    expect(shown()).toEqual(["a", "b", "c"]);

    drag.to(50);
    expect(shown()).toEqual(["b", "a", "c"]);

    // The rows have moved under the pointer; the answer has not.
    drag.to(50);
    expect(shown()).toEqual(["b", "a", "c"]);

    drag.to(80);
    expect(shown()).toEqual(["b", "c", "a"]);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("moves the row where it was let go", () => {
    const onReorder = vi.fn();
    render(<PartingList ids={["a", "b", "c"]} onReorder={onReorder} />);
    const drag = grab("c");

    drag.to(40);
    drag.drop(40);

    expect(onReorder).toHaveBeenCalledWith("c", 1);
    // The order is the owner's to change; until it does, the list shows it as it is.
    expect(shown()).toEqual(["a", "b", "c"]);
  });

  it("says nothing when the row is let go where it was", () => {
    const onReorder = vi.fn();
    render(<PartingList ids={["a", "b", "c"]} onReorder={onReorder} />);
    const drag = grab("b");

    drag.to(40);
    drag.drop(40);

    expect(onReorder).not.toHaveBeenCalled();
  });

  it("closes the gap again when the drag is cancelled, or leaves", () => {
    const onReorder = vi.fn();
    render(<PartingList ids={["a", "b", "c"]} onReorder={onReorder} />);

    const cancelled = grab("a");
    cancelled.to(80);
    expect(shown()).toEqual(["b", "c", "a"]);
    cancelled.cancel();
    expect(shown()).toEqual(["a", "b", "c"]);

    const left = grab("a");
    left.to(80);
    left.leave();
    expect(shown()).toEqual(["a", "b", "c"]);
    // And measures afresh when it comes back.
    left.to(50);
    expect(shown()).toEqual(["b", "a", "c"]);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("keeps a row within its group", () => {
    const onReorder = vi.fn();
    const groupOf = (id: string) => (id.startsWith("p") ? "pinned" : "open");
    render(<PartingList ids={["p1", "p2", "a", "b"]} onReorder={onReorder} groupOf={groupOf} />);

    const open = grab("b");
    open.to(5); // above everything
    expect(shown()).toEqual(["p1", "p2", "b", "a"]);
    open.drop(5);
    expect(onReorder).toHaveBeenCalledWith("b", 2);

    const pinned = grab("p1");
    pinned.to(500); // below everything
    expect(shown()).toEqual(["p2", "p1", "a", "b"]);
  });

  it("leaves a row that is alone in its group where it is", () => {
    const onReorder = vi.fn();
    const groupOf = (id: string) => (id.startsWith("p") ? "pinned" : "open");
    render(<PartingList ids={["p1", "a", "b"]} onReorder={onReorder} groupOf={groupOf} />);

    const drag = grab("p1");
    drag.to(500);
    expect(shown()).toEqual(["p1", "a", "b"]);
    drag.drop(500);
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("takes no row from another list", () => {
    const first = vi.fn();
    const second = vi.fn();
    render(
      <>
        <PartingList ids={["a", "b"]} onReorder={first} />
        <PartingList ids={["x", "y"]} onReorder={second} testId="other" />
      </>,
    );
    const drag = grab("a");

    drag.to(50, "other");

    expect(shown("other")).toEqual(["x", "y"]);
    expect(shown()).toEqual(["a", "b"]);
  });
});
