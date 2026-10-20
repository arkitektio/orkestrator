// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ActiveTask } from "./activeTasks";
import { TaskActivityRow } from "./chat-list";

const task = (over: Partial<ActiveTask>): ActiveTask => ({
  id: "t1",
  reference: "r1",
  actionName: "assigner",
  status: "RUNNING",
  ...over,
});

afterEach(cleanup);

describe("TaskActivityRow", () => {
  it("says what a running replyer is doing, and offers to stop it", () => {
    const onCancel = vi.fn();
    render(<TaskActivityRow task={task({ message: "Round 2...", progress: 40 })} onCancel={onCancel} />);
    expect(screen.getByText("assigner")).toBeTruthy();
    expect(screen.getByText("Round 2...")).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();
    fireEvent.click(screen.getByText("Stop"));
    expect(onCancel).toHaveBeenCalledWith("t1", "r1");
  });

  it("says it waits for you while held, whatever it last reported", () => {
    render(<TaskActivityRow task={task({ status: "HELD", message: "Round 2..." })} />);
    expect(screen.getByText("waiting for you")).toBeTruthy();
    expect(screen.queryByText("Round 2...")).toBeNull();
  });

  it("keeps a failure until it is dismissed", () => {
    const onDismiss = vi.fn();
    render(<TaskActivityRow task={task({ status: "ERROR", message: "No agent" })} onDismiss={onDismiss} />);
    expect(screen.getByText("No agent")).toBeTruthy();
    expect(screen.queryByText("Stop")).toBeNull();
    fireEvent.click(screen.getByTitle("Dismiss"));
    expect(onDismiss).toHaveBeenCalledWith("r1");
  });
});
