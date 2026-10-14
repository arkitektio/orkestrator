// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/connection/arkitekt/host", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/core/connection/arkitekt/host")>()),
  // RekuestGuard (rekuest/api) is a host `serviceGuard`: let it through.
  serviceGuard: () => ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("./actions", () => ({
  DirectImplementationAssignment: ({ action }: { action: { id: string } }) => (
    <div data-testid="picker">{action.id}</div>
  ),
}));

import { RunOnSubmenu } from "./RunOnSubmenu";
import { rowAnchor, useRunOnSubmenu } from "./runOnContext";

const Row = ({ id }: { id: string }) => {
  const submenu = useRunOnSubmenu();
  return (
    <div
      data-testid={`row-${id}`}
      onContextMenu={(event) => {
        event.preventDefault();
        submenu?.openFor({ action: { id } as never }, event);
      }}
    >
      {id}
    </div>
  );
};

describe("RunOnSubmenu", () => {
  it("opens the picker for the right-clicked row and closes on Escape, focusing the input", async () => {
    const input = React.createRef<HTMLInputElement>();
    render(
      <RunOnSubmenu context={{ objects: [] }} returnFocusTo={input}>
        <input ref={input} data-testid="search" />
        <Row id="one" />
        <Row id="two" />
      </RunOnSubmenu>,
    );

    expect(screen.queryByTestId("picker")).not.toBeInTheDocument();
    fireEvent.contextMenu(screen.getByTestId("row-two"), { clientX: 10, clientY: 10 });
    expect(await screen.findByTestId("picker")).toHaveTextContent("two");

    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    });
    expect(screen.queryByTestId("picker")).not.toBeInTheDocument();
    // Radix's FocusScope hands focus back on a timer after unmount; how many
    // ticks that takes depends on load, so wait for it rather than count.
    await waitFor(() => expect(screen.getByTestId("search")).toHaveFocus());
  });

  it("with no pointer (Enter, a click), opens under the row", async () => {
    const Keyboard = () => {
      const submenu = useRunOnSubmenu();
      return (
        <button type="button" onClick={() => submenu?.openFor({ action: { id: "42" } as never })}>
          choose
        </button>
      );
    };
    render(
      <RunOnSubmenu context={{ objects: [] }}>
        <div cmdk-item="" data-value="42" data-testid="row-42" />
        <Keyboard />
      </RunOnSubmenu>,
    );
    const row = screen.getByTestId("row-42");
    row.getBoundingClientRect = () => ({ left: 30, bottom: 70 }) as DOMRect;
    expect(rowAnchor("42")).toEqual({ clientX: 30, clientY: 70 });

    fireEvent.click(screen.getByText("choose"));
    expect(await screen.findByTestId("picker")).toHaveTextContent("42");
  });

  it("does nothing outside a submenu", () => {
    render(<Row id="solo" />);
    fireEvent.contextMenu(screen.getByTestId("row-solo"));
    expect(screen.queryByTestId("picker")).not.toBeInTheDocument();
  });
});
