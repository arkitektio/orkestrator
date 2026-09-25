// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// `dropUtils` reaches for every module's local actions; none are run here.
vi.mock("@/app/localactions", () => ({ registry: {} }));

import { installDndEngine } from "@/lib/dnd/engine";
import { FakeDataTransfer, fireDrag } from "@/lib/dnd/testing";
import { SelectionContext } from "../selection/SelectionContext";
import { createSelectionStore, SelectionStore } from "../selection/store";
import { STRUCTURES_MIME } from "./dragPayload";
import { useSmartModel } from "./useSmartModel";

const Card = ({ id }: { id: string }) => {
  const { ref, partners, dropObjects } = useSmartModel({
    identifier: "@test/thing",
    object: { id },
  });
  return (
    <div
      ref={ref}
      data-testid={id}
      data-left={dropObjects.map((s) => s.id).join(",")}
      data-right={partners.map((s) => s.id).join(",")}
    />
  );
};

let store: SelectionStore;
let uninstall: () => void;

const renderCards = (...ids: string[]) =>
  render(
    <SelectionContext.Provider value={store}>
      {ids.map((id) => (
        <Card key={id} id={id} />
      ))}
    </SelectionContext.Provider>,
  );

/** Select the cards as shift-click does: the store holds what the card registered. */
const select = (...ids: string[]) =>
  act(() => {
    // Cards register in a batch, a microtask after they mount.
    store.getState().flushSelectables();
    const { selectables, setSelection } = store.getState();
    setSelection(
      ids.map((id) => selectables.find((s) => s.structure.id === id)!.structure),
    );
  });

const carried = (dataTransfer: FakeDataTransfer) =>
  (JSON.parse(dataTransfer.getData(STRUCTURES_MIME)) as { id: string }[]).map(
    (s) => s.id,
  );

beforeEach(() => {
  store = createSelectionStore();
  uninstall = installDndEngine(document);
});

afterEach(() => {
  uninstall();
  // The engine clears a drag image away a frame later; no frame passes here.
  document.querySelectorAll("[data-drag-stack]").forEach((node) => node.remove());
});

describe("dragging a card", () => {
  it("carries the card alone, as the browser pictures it, when it is not selected", () => {
    renderCards("a", "b", "c");
    select("b", "c");
    const dataTransfer = new FakeDataTransfer();

    fireDrag(screen.getByTestId("a"), "dragstart", { dataTransfer });

    expect(carried(dataTransfer)).toEqual(["a"]);
    expect(dataTransfer.dragImage).toBeNull();
  });

  it("carries the selection, grabbed card first, as a stack", () => {
    renderCards("a", "b", "c");
    select("a", "b", "c");
    const dataTransfer = new FakeDataTransfer();

    fireDrag(screen.getByTestId("b"), "dragstart", { dataTransfer });

    expect(carried(dataTransfer)).toEqual(["b", "a", "c"]);
    expect(dataTransfer.dragImage?.getAttribute("data-drag-stack")).toBe("3");
  });
});

describe("dropping on a card", () => {
  // Ctrl held as the drag begins goes straight to the partner panel.
  const drop = (from: string, onto: string) => {
    const dataTransfer = new FakeDataTransfer();
    act(() => {
      fireDrag(screen.getByTestId(from), "dragstart", { dataTransfer, ctrlKey: true });
      fireDrag(screen.getByTestId(onto), "dragover", { dataTransfer });
    });
    return act(async () => {
      fireDrag(screen.getByTestId(onto), "drop", { dataTransfer });
    });
  };

  it("sets the card against the selection that was dropped on it", async () => {
    renderCards("a", "b", "x");
    select("a", "b");

    await drop("a", "x");

    expect(screen.getByTestId("x").getAttribute("data-left")).toBe("x");
    expect(screen.getByTestId("x").getAttribute("data-right")).toBe("a,b");
  });

  it("sets the selection against a card dropped on one of the selected", async () => {
    renderCards("a", "b", "x");
    select("a", "b");

    await drop("x", "b");

    expect(screen.getByTestId("b").getAttribute("data-left")).toBe("a,b");
    expect(screen.getByTestId("b").getAttribute("data-right")).toBe("x");
  });

  it("does nothing, let go over a card that is part of the drag", async () => {
    renderCards("a", "b");
    select("a", "b");

    await drop("a", "b");

    expect(screen.getByTestId("b").getAttribute("data-right")).toBe("");
  });
});
