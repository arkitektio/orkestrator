// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const assign = vi.fn(async () => ({}));

vi.mock("@/rekuest/hooks/useAssign", () => ({ useAssign: () => ({ assign }) }));
vi.mock("@/core/dialogs/registry", () => ({ useDialog: () => ({ openDialog: vi.fn() }) }));
vi.mock("@/rekuest/lib/taskTracker", () => ({ trackTask: () => () => {}, failureFallback: () => "" }));
vi.mock("./openResult", () => ({
  deliverResults: (_sink: unknown, _ports: unknown, onEvent: unknown) => onEvent,
  OpenResultButtons: () => null,
  runsDirectly: () => true,
  useOpenResult: () => () => () => {},
}));
vi.mock("./actions", () => ({ actionAvailability: () => null }));
vi.mock("@/core/smart/extensions/CommandActionRow", () => ({
  CommandActionRow: (props: { title: string; onSelect: () => void; failure?: { detail: string } | null }) => (
    <div>
      {props.failure ? <span>{props.failure.detail}</span> : null}
      <button type="button" onClick={props.onSelect}>
        {props.title}
      </button>
    </div>
  ),
}));

import { ShortcutButton } from "./shortcuts";

const shortcut = {
  id: "s1",
  name: "Segment",
  description: null,
  bindNumber: null,
  allowQuick: false,
  savedArgs: {},
  returns: [],
  args: [{ key: "image", kind: "STRUCTURE", identifier: "@mikro/arraylens", nullable: false }],
  action: { id: "a1", assignable: true },
} as never;

afterEach(() => {
  cleanup();
  assign.mockClear();
});

describe("ShortcutButton", () => {
  it("runs on what the menu materializes, made only when it runs", async () => {
    const materialize = vi.fn(async () => ({ objects: [{ identifier: "@mikro/arraylens", id: "42" }], partners: [] }));
    render(
      <ShortcutButton shortcut={shortcut} objects={[{ identifier: "@mikro/arraylens", id: "cut:7:1" }]} materialize={materialize} />,
    );
    expect(materialize).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Segment"));
    await waitFor(() => expect(assign).toHaveBeenCalledTimes(1));
    const sent = JSON.stringify((assign.mock.calls as unknown[][])[0][0]);
    expect(sent).toContain('"object":"42"');
    expect(sent).not.toContain("cut:");
  });

  it("says why when what it runs on cannot be made, and runs nothing", async () => {
    const materialize = vi.fn(async () => {
      throw new Error("Could not make the crop: outside");
    });
    render(<ShortcutButton shortcut={shortcut} objects={[{ identifier: "@mikro/arraylens", id: "cut:7:1" }]} materialize={materialize} />);

    fireEvent.click(screen.getByText("Segment"));
    expect(await screen.findByText("Could not make the crop: outside")).toBeTruthy();
    expect(assign).not.toHaveBeenCalled();
  });
});
