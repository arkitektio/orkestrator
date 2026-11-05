// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const closeDialog = vi.hoisted(() => vi.fn());
vi.mock("@/core/dialogs/registry", () => ({ useDialog: () => ({ closeDialog }) }));

import { resetToasts, toastStore } from "@/core/notify/toasts";
import { cleanup } from "@testing-library/react";

import { DialogError, DialogErrorScope, DialogFooterError } from "./DialogError";
import { useDialogSubmit, type DialogSubmitOptions } from "./useDialogSubmit";

const Form = ({
  run,
  options,
  placeOwn,
  footers = 0,
}: {
  run: () => Promise<unknown>;
  options?: DialogSubmitOptions<unknown>;
  placeOwn?: boolean;
  /** How many `DialogFooter`s (their error slot) the dialog renders. */
  footers?: number;
}) => {
  const { submit, submitting } = useDialogSubmit(run, options);
  return (
    <div>
      <button onClick={() => void submit()}>{submitting ? "…" : "Save"}</button>
      {placeOwn && (
        <div data-testid="footer">
          <DialogError />
        </div>
      )}
      {Array.from({ length: footers }, (_, i) => (
        <div key={i} data-testid={`dialog-footer-${i}`}>
          <DialogFooterError />
        </div>
      ))}
    </div>
  );
};

const press = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
  });
};

beforeEach(() => {
  resetToasts();
  closeDialog.mockReset();
});
afterEach(cleanup);

describe("useDialogSubmit in a DialogErrorScope", () => {
  it("keeps the dialog open and shows the reason inline, not as a toast", async () => {
    render(
      <DialogErrorScope>
        <Form run={() => Promise.reject(new Error("Name is taken"))} options={{ errorTitle: "Couldn't create" }} />
      </DialogErrorScope>,
    );
    await press();

    expect(screen.getByRole("alert").textContent).toContain("Couldn't create");
    expect(screen.getByRole("alert").textContent).toContain("Name is taken");
    expect(closeDialog).not.toHaveBeenCalled();
    expect(toastStore.getState().toasts).toEqual([]);
  });

  it("closes on success, and toasts only when asked to", async () => {
    const { unmount } = render(
      <DialogErrorScope>
        <Form run={() => Promise.resolve("ok")} />
      </DialogErrorScope>,
    );
    await press();
    expect(closeDialog).toHaveBeenCalledTimes(1);
    expect(toastStore.getState().toasts).toEqual([]);
    unmount();

    render(
      <DialogErrorScope>
        <Form run={() => Promise.resolve("ok")} options={{ successMessage: "Invite sent" }} />
      </DialogErrorScope>,
    );
    await press();
    expect(toastStore.getState().toasts.map((t) => t.message)).toEqual(["Invite sent"]);
  });

  it("clears the last failure when submitted again", async () => {
    let fail = true;
    render(
      <DialogErrorScope>
        <Form run={() => (fail ? Promise.reject(new Error("Nope")) : Promise.resolve())} options={{ close: false }} />
      </DialogErrorScope>,
    );
    await press();
    expect(screen.queryByRole("alert")).not.toBeNull();
    fail = false;
    await press();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("puts the note where a dialog places <DialogError />, and only there", async () => {
    render(
      <DialogErrorScope>
        <Form run={() => Promise.reject(new Error("Nope"))} placeOwn />
      </DialogErrorScope>,
    );
    await press();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByTestId("footer").querySelector('[role="alert"]')).not.toBeNull();
  });

  it("shows the note above the footer's buttons instead of at the foot", async () => {
    render(
      <DialogErrorScope>
        <Form run={() => Promise.reject(new Error("Nope"))} footers={1} />
      </DialogErrorScope>,
    );
    await press();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByTestId("dialog-footer-0").querySelector('[role="alert"]')).not.toBeNull();
  });

  it("with several footers, only the first one shows it", async () => {
    render(
      <DialogErrorScope>
        <Form run={() => Promise.reject(new Error("Nope"))} footers={2} />
      </DialogErrorScope>,
    );
    await press();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByTestId("dialog-footer-0").querySelector('[role="alert"]')).not.toBeNull();
  });

  it("a placed <DialogError /> wins over the footer", async () => {
    render(
      <DialogErrorScope>
        <Form run={() => Promise.reject(new Error("Nope"))} footers={1} placeOwn />
      </DialogErrorScope>,
    );
    await press();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByTestId("footer").querySelector('[role="alert"]')).not.toBeNull();
  });

  it("a footer outside a dialog shows nothing", () => {
    render(<DialogFooterError />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("outside a dialog, a failure becomes an island toast", async () => {
    render(<Form run={() => Promise.reject(new Error("Nope"))} options={{ errorTitle: "Couldn't save" }} />);
    await press();
    expect(toastStore.getState().toasts.map((t) => [t.kind, t.message, t.description])).toEqual([
      ["error", "Couldn't save", "Nope"],
    ]);
  });
});
