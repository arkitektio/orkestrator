// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const assign = vi.fn(async () => ({}));
const openFor = vi.fn();
let submenu: { openFor: typeof openFor } | null = { openFor };

vi.mock("@/rekuest/hooks/useAssign", () => ({ useAssign: () => ({ assign }) }));
const openDialog = vi.fn();
vi.mock("@/core/dialogs/registry", () => ({ useDialog: () => ({ openDialog }) }));
let tracked: ((event: unknown) => void) | null = null;
vi.mock("@/rekuest/lib/taskTracker", () => ({
  trackTask: (_reference: string, onEvent: (event: unknown) => void) => {
    tracked = onEvent;
    return () => {};
  },
  failureFallback: () => "",
}));
vi.mock("./runOnContext", () => ({ useRunOnSubmenu: () => submenu }));
vi.mock("./openResult", async () => ({
  deliverResults: (await vi.importActual<typeof import("./openResult")>("./openResult")).deliverResults,
  runTracker: (await vi.importActual<typeof import("./openResult")>("./openResult")).runTracker,
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
    failure?: { detail: string } | null;
  }) => (
    <div>
      {props.failure ? <span>{props.failure.detail}</span> : null}
      <button type="button" onClick={props.onSelect}>
        {props.title}
      </button>
      {props.trailing}
      {props.buttons}
    </div>
  ),
}));

import { SmartResultSink } from "@/core/smart/extensions/results";
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
  openDialog.mockClear();
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

  it("runs on what the menu materializes, made only when it runs", async () => {
    const materialize = vi.fn(async () => ({ objects: [{ identifier: "@mikro/image", id: "42" }], partners: [] }));
    render(
      <AssignButton action={action({})} objects={[{ identifier: "@mikro/image", id: "cut:7:1" }]} materialize={materialize} />,
    );
    expect(materialize).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Track"));
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    expect(materialize).toHaveBeenCalledTimes(1);
    const sent = JSON.stringify((assign.mock.calls as unknown[][])[0][0]);
    expect(sent).toContain('"object":"42"');
    expect(sent).not.toContain("cut:");
  });

  it("says why when what it runs on cannot be made, and runs nothing", async () => {
    const materialize = vi.fn(async () => {
      throw new Error("Could not make the crop: outside");
    });
    render(<AssignButton action={action({})} objects={objects} materialize={materialize} />);

    fireEvent.click(screen.getByText("Track"));
    expect(await screen.findByText("Could not make the crop: outside")).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });

  it("prefills the dialog of an action that asks for more with what was made, never the stand-in", async () => {
    const materialize = vi.fn(async () => ({ objects: [{ identifier: "@mikro/image", id: "42" }], partners: [] }));
    const wider = action({
      args: [
        { key: "image", kind: "STRUCTURE", identifier: "@mikro/image", nullable: false },
        { key: "sigma", kind: "FLOAT", nullable: false },
      ],
    });
    render(<AssignButton action={wider} objects={[{ identifier: "@mikro/image", id: "cut:7:1" }]} materialize={materialize} />);

    fireEvent.click(screen.getByText("Track"));
    await waitFor(() => expect(openDialog).toHaveBeenCalledTimes(1));
    const [id, props] = openDialog.mock.calls[0];
    expect(id).toBe("assign");
    expect(JSON.stringify(props)).toContain('"object":"42"');
    expect(JSON.stringify(props)).not.toContain("cut:");
    expect(assign).not.toHaveBeenCalled();
  });

  it("hands what the run returned to the menu's result sink when it completes", async () => {
    const sink = vi.fn();
    const cropping = action({
      returns: [{ key: "return0", kind: "STRUCTURE", identifier: "@mikro/arraylens", label: null }],
    });
    render(
      <SmartResultSink onResults={sink}>
        <AssignButton action={cropping} objects={objects} />
      </SmartResultSink>,
    );
    fireEvent.click(screen.getByText("Track"));
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));

    tracked!({ kind: "YIELD", returns: { return0: { __identifier: "@mikro/arraylens", object: "42" } } });
    expect(sink).not.toHaveBeenCalled();
    tracked!({ kind: "COMPLETED", returns: null });
    expect(sink).toHaveBeenCalledWith([{ identifier: "@mikro/arraylens", id: "42" }]);
  });

  it("follows a run that needed the dialog like a direct one: results to the sink, then onDone", async () => {
    const sink = vi.fn();
    const onDone = vi.fn();
    const wider = action({
      args: [
        { key: "image", kind: "STRUCTURE", identifier: "@mikro/image", nullable: false },
        { key: "sigma", kind: "FLOAT", nullable: false },
      ],
      returns: [{ key: "return0", kind: "STRUCTURE", identifier: "@mikro/arraylens", label: null }],
    });
    render(
      <SmartResultSink onResults={sink}>
        <AssignButton action={wider} objects={objects} onDone={onDone} />
      </SmartResultSink>,
    );
    fireEvent.click(screen.getByText("Track"));
    await waitFor(() => expect(openDialog).toHaveBeenCalledTimes(1));
    const [, props] = openDialog.mock.calls[0];

    // The dialog calls this right before it assigns.
    tracked = null;
    expect(typeof props.track).toBe("function");
    props.track("ref-1");
    expect(tracked).not.toBeNull();

    tracked!({ kind: "COMPLETED", returns: { return0: { __identifier: "@mikro/arraylens", object: "42" } } });
    expect(sink).toHaveBeenCalledWith([{ identifier: "@mikro/arraylens", id: "42" }]);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
  });
});
