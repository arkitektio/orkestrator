// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/Arkitekt", () => ({
  Guard: { Rekuest: ({ children }: { children: React.ReactNode }) => <>{children}</> },
}));
vi.mock("./actions", () => ({
  DirectImplementationAssignment: ({ action }: { action: { id: string } }) => (
    <div data-testid="picker">{action.id}</div>
  ),
}));

import { RunOnSubmenu } from "./RunOnSubmenu";
import { useRunOnSubmenu } from "./runOnContext";

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
      // Radix's FocusScope hands focus back on a zero timer after unmount.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.queryByTestId("picker")).not.toBeInTheDocument();
    expect(screen.getByTestId("search")).toHaveFocus();
  });

  it("does nothing outside a submenu", () => {
    render(<Row id="solo" />);
    fireEvent.contextMenu(screen.getByTestId("row-solo"));
    expect(screen.queryByTestId("picker")).not.toBeInTheDocument();
  });
});
