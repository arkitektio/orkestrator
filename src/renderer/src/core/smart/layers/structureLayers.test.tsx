// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SelectionContext } from "@/core/dnd/selection/SelectionContext";
import { createSelectionStore, type SelectionStore } from "@/core/dnd/selection/store";
import { smartRegistry } from "@/core/smart/registry";
import { useSmartModel } from "@/core/smart/useSmartModel";
import {
  LAYER_ATTRIBUTE,
  StructureLayerHost,
  type StructureLayerProps,
} from "./structureLayers";

const DATUM = "@test/datum";
const OTHER = "@test/other";

let observers: FakeObserver[] = [];

class FakeObserver {
  observed = new Set<Element>();
  disconnected = false;
  constructor(private callback: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe(node: Element) {
    this.observed.add(node);
  }
  unobserve(node: Element) {
    this.observed.delete(node);
  }
  disconnect() {
    this.disconnected = true;
    this.observed.clear();
  }
  show(node: Element, isIntersecting = true) {
    this.callback(
      [{ target: node, isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

const Card = ({
  id,
  identifier = DATUM,
  testId = id,
  children,
}: {
  id: string;
  identifier?: string;
  testId?: string;
  children?: React.ReactNode;
}) => {
  const { ref } = useSmartModel({ identifier, object: { id } });
  return (
    <div ref={ref} data-testid={testId}>
      {children}
    </div>
  );
};

let store: SelectionStore;
let reads: (readonly string[])[];

/** A layer that says which data it was handed and draws a chip on each. */
const Layer = ({ structures, Slot }: StructureLayerProps) => {
  reads.push(structures.map((structure) => structure.id));
  return (
    <>
      {structures.map((structure) => (
        <Slot key={structure.id} structure={structure}>
          <span data-testid={`chip-${structure.id}`}>{structure.id}</span>
        </Slot>
      ))}
    </>
  );
};

const tree = (cards: React.ReactNode, on = true) => (
  <SelectionContext.Provider value={store}>
    {cards}
    {on ? <StructureLayerHost>{(props) => <Layer {...props} />}</StructureLayerHost> : null}
  </SelectionContext.Provider>
);

const settle = () =>
  act(async () => {
    await Promise.resolve();
    vi.advanceTimersByTime(200);
  });

const show = async (...testIds: string[]) => {
  act(() => {
    for (const testId of testIds) observers[0]!.show(screen.getByTestId(testId));
  });
  await settle();
};

beforeEach(() => {
  vi.useFakeTimers();
  observers = [];
  reads = [];
  store = createSelectionStore();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.spyOn(smartRegistry, "isDatum").mockImplementation((identifier) => identifier === DATUM);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("StructureLayerHost", () => {
  it("watches nothing and draws nothing when it is not mounted", async () => {
    render(tree(<Card id="a" />, false));
    await settle();

    expect(observers).toEqual([]);
    expect(screen.queryByTestId("chip-a")).toBeNull();
  });

  it("draws on a card only once it is in view", async () => {
    render(tree(<><Card id="a" /><Card id="b" /></>));
    await settle();
    expect(screen.queryByTestId("chip-a")).toBeNull();

    await show("a");

    expect(screen.getByTestId("a").contains(screen.getByTestId("chip-a"))).toBe(true);
    expect(screen.queryByTestId("chip-b")).toBeNull();
  });

  it("takes a card back out when it scrolls away", async () => {
    render(tree(<Card id="a" />));
    await settle();
    await show("a");

    act(() => observers[0]!.show(screen.getByTestId("a"), false));
    await settle();

    expect(screen.queryByTestId("chip-a")).toBeNull();
  });

  it("leaves out a card that is not a datum", async () => {
    render(tree(<><Card id="a" /><Card id="x" identifier={OTHER} /></>));
    await settle();

    expect(observers[0]!.observed.has(screen.getByTestId("x"))).toBe(false);
    expect(observers[0]!.observed.has(screen.getByTestId("a"))).toBe(true);
  });

  it("hands a burst of cards over as one read", async () => {
    render(tree(<><Card id="a" /><Card id="b" /><Card id="c" /></>));
    await settle();
    reads = [];

    await show("a", "b", "c");

    expect(reads.filter((ids) => ids.length > 0)).toEqual([["a", "b", "c"]]);
  });

  it("reads a datum once and draws it on every card that shows it", async () => {
    render(tree(<><Card id="a" testId="first" /><Card id="a" testId="second" /></>));
    await settle();
    reads = [];

    await show("first", "second");

    expect(reads.at(-1)).toEqual(["a"]);
    expect(screen.getByTestId("first").querySelector(`[${LAYER_ATTRIBUTE}]`)).not.toBeNull();
    expect(screen.getByTestId("second").querySelector(`[${LAYER_ATTRIBUTE}]`)).not.toBeNull();
  });

  it("does not take a card inside a layer for a card to layer", async () => {
    render(
      tree(
        <div {...{ [LAYER_ATTRIBUTE]: "true" }}>
          <Card id="inner" />
        </div>,
      ),
    );
    await settle();

    expect(observers[0]!.observed.has(screen.getByTestId("inner"))).toBe(false);
  });

  it("drops a card that unmounts, and stops watching when it goes", async () => {
    const { rerender, unmount } = render(
      tree([<Card key="a" id="a" />, <Card key="b" id="b" />]),
    );
    await settle();
    await show("a", "b");
    const observer = observers[0]!;
    const gone = screen.getByTestId("a");

    rerender(tree([<Card key="b" id="b" />]));
    await settle();

    expect(observer.observed.has(gone)).toBe(false);
    expect(reads.at(-1)).toEqual(["b"]);

    unmount();
    expect(observer.disconnected).toBe(true);
  });
});
