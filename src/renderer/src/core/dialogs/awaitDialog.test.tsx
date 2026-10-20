// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createDialogProvider, DialogDismissedError, type AwaitedDialogProps } from "./DialogProvider";

const Ask = ({ question, onResolve, onCancel }: { question: string } & AwaitedDialogProps<string>) => (
  <div>
    <p>{question}</p>
    <button onClick={() => onResolve?.("yes")}>answer</button>
    <button onClick={() => onCancel?.()}>cancel</button>
  </div>
);
const Other = () => <p>other</p>;

const { DialogProvider, useDialog } = createDialogProvider({ ask: Ask, other: Other });

type Dialogs = ReturnType<typeof useDialog>;

const mount = () => {
  const handle: { current?: Dialogs } = {};
  const Grab = () => {
    handle.current = useDialog();
    return null;
  };
  render(
    <DialogProvider>
      <Grab />
    </DialogProvider>,
  );
  return handle as { current: Dialogs };
};

afterEach(cleanup);

describe("awaitDialog", () => {
  it("resolves with what the dialog answers, and closes it", async () => {
    const dialogs = mount();
    let answer!: Promise<string>;
    act(() => {
      answer = dialogs.current.awaitDialog<string, "ask">("ask", { question: "Approve?" });
    });

    expect(screen.getByText("Approve?")).toBeTruthy();
    act(() => screen.getByText("answer").click());

    await expect(answer).resolves.toBe("yes");
    expect(screen.queryByText("Approve?")).toBeNull();
  });

  it("rejects when the dialog cancels", async () => {
    const dialogs = mount();
    let answer!: Promise<string>;
    act(() => {
      answer = dialogs.current.awaitDialog<string, "ask">("ask", { question: "Approve?" });
    });

    act(() => screen.getByText("cancel").click());

    await expect(answer).rejects.toBeInstanceOf(DialogDismissedError);
  });

  it("rejects when it is closed, or another dialog takes its place", async () => {
    const dialogs = mount();
    let closed!: Promise<string>;
    act(() => {
      closed = dialogs.current.awaitDialog<string, "ask">("ask", { question: "First?" });
    });
    act(() => dialogs.current.closeDialog());
    await expect(closed).rejects.toBeInstanceOf(DialogDismissedError);

    let replaced!: Promise<string>;
    act(() => {
      replaced = dialogs.current.awaitDialog<string, "ask">("ask", { question: "Second?" });
    });
    act(() => dialogs.current.openDialog("other", {}));
    await expect(replaced).rejects.toBeInstanceOf(DialogDismissedError);
    expect(screen.getByText("other")).toBeTruthy();
  });
});
