// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const assign = vi.fn(async () => ({}));
const openFor = vi.fn();
let submenu: { openFor: typeof openFor } | null = { openFor };

vi.mock("@/rekuest/hooks/useAssign", () => ({ useAssign: () => ({ assign }) }));
vi.mock("@/core/dialogs/registry", () => ({ useDialog: () => ({ openDialog: vi.fn() }) }));
vi.mock("@/rekuest/lib/taskTracker", () => ({ trackTask: () => () => {}, failureFallback: () => "" }));
vi.mock("./runOnContext", () => ({ useRunOnSubmenu: () => submenu }));
vi.mock("./openResult", () => ({
  OpenResultButtons: () => <span>open-buttons</span>,
  runsDirectly: () => true,
  useOpenResult: () => () => () => {},
}));
vi.mock("@/core/smart/extensions/CommandActionRow", () => ({
  CommandActionRow: (props: {
    title: string;
    onSelect: () => void;
    trailing?: React.ReactNode;
    buttons?: React.ReactNode;
  }) => (
    <div>
      <button type="button" onClick={props.onSelect}>
        {props.title}
      </button>
      {props.trailing}
      {props.buttons}
    </div>
  ),
}));

import { AssignButton } from "./actions";

const action = (overrides: object) =>
  ({
    id: "a1",
    name: "Track",
    hash: "h",
    stateful: false,
    assignable: true,
    liveImplementations: 1,
    description: null,
    implementations: [],
    args: [{ key: "image", kind: "STRUCTURE", identifier: "@mikro/image", nullable: false }],
    returns: [],
    ...overrides,
  }) as never;

const objects = [{ identifier: "@mikro/image", id: "1" }];

afterEach(() => {
  cleanup();
  assign.mockClear();
  openFor.mockClear();
  submenu = { openFor };
});

describe("AssignButton", () => {
  it("a stateful action two agents could take asks which, and runs nothing yet", () => {
    const stateful = action({ stateful: true, liveImplementations: 2 });
    render(<AssignButton action={stateful} objects={objects} />);

    expect(screen.getByText("Choose agent · 2")).toBeTruthy();
    expect(screen.queryByText("open-buttons")).toBeNull();
    fireEvent.click(screen.getByText("Track"));
    expect(openFor).toHaveBeenCalledWith({ action: stateful });
    expect(assign).not.toHaveBeenCalled();
  });

  it("runs at once when only one agent could, or the action keeps no state", () => {
    render(<AssignButton action={action({ stateful: true, liveImplementations: 1 })} objects={objects} />);
    fireEvent.click(screen.getByText("Track"));
    cleanup();
    render(<AssignButton action={action({ stateful: false, liveImplementations: 3 })} objects={objects} />);
    fireEvent.click(screen.getByText("Track"));

    expect(openFor).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledTimes(2);
  });

  it("outside a menu with the picker, it runs", () => {
    submenu = null;
    render(<AssignButton action={action({ stateful: true, liveImplementations: 2 })} objects={objects} />);
    fireEvent.click(screen.getByText("Track"));
    expect(assign).toHaveBeenCalledTimes(1);
  });
});
