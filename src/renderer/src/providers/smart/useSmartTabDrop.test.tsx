// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({ open: vi.fn(), openBeside: vi.fn() }));
vi.mock("@/command/tabs/TabsProvider", () => ({ useTabActions: () => actions }));

const toastError = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { SMART_MODEL_DROP_TYPE } from "@/constants";
import { createDragSource, installDndEngine } from "@/lib/dnd/engine";
import { dragOnto } from "@/lib/dnd/testing";
import { Structure } from "@/types";

import { smartRegistry } from "./registry";
import { useSmartTabDrop, type SmartTabDropMode } from "./useSmartTabDrop";

const Zone = ({ mode }: { mode: SmartTabDropMode }) => {
  const { ref, isOver } = useSmartTabDrop(mode);
  return <div ref={ref} data-testid="zone" data-hot={isOver || undefined} />;
};

/** Let a card carrying `structures` go on the zone. */
const drop = (mode: SmartTabDropMode, structures: Structure[]) => {
  const { getByTestId } = render(<Zone mode={mode} />);
  const card = document.createElement("div");
  document.body.appendChild(card);
  createDragSource(() => ({
    kind: SMART_MODEL_DROP_TYPE,
    getData: () => ({ structures }),
  })).attach(card);

  act(() => {
    dragOnto(card, getByTestId("zone")).drop();
  });
};

const image = (id: string, name?: string): Structure => ({
  identifier: "@mikro/image",
  object: name ? { id, name } : { id },
});

let uninstall: () => void;

beforeEach(() => {
  vi.clearAllMocks();
  smartRegistry.register({ identifier: "@mikro/image", name: "Image", path: "/mikro/images", datum: true });
  uninstall = installDndEngine(document);
});

afterEach(() => uninstall());

describe("dropping a card where tabs live", () => {
  it("opens the dropped structure as a tab, named after the object", () => {
    drop("tab", [image("7", "Nuclei")]);
    expect(actions.open).toHaveBeenCalledWith("/mikro/images/7", {
      label: "Nuclei",
      evict: true,
      background: false,
    });
  });

  it("falls back to the model's name and the id when the object has none", () => {
    drop("tab", [image("7")]);
    expect(actions.open).toHaveBeenCalledWith("/mikro/images/7", expect.objectContaining({ label: "Image 7" }));
  });

  it("opens every structure of a selection, showing the last", () => {
    drop("tab", [image("1"), image("2")]);
    expect(actions.open).toHaveBeenNthCalledWith(1, "/mikro/images/1", expect.objectContaining({ background: true }));
    expect(actions.open).toHaveBeenNthCalledWith(2, "/mikro/images/2", expect.objectContaining({ background: false }));
  });

  it("opens one pane beside, from a selection of many", () => {
    drop("beside", [image("1"), image("2")]);
    expect(actions.openBeside).toHaveBeenCalledTimes(1);
    expect(actions.openBeside).toHaveBeenCalledWith("/mikro/images/1", { label: "Image 1", evict: true });
    expect(actions.open).not.toHaveBeenCalled();
  });

  it("says so rather than opening a blank tab when nothing knows the identifier", () => {
    drop("tab", [{ identifier: "@nowhere/thing", object: { id: "1" } }]);
    expect(actions.open).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });
});
