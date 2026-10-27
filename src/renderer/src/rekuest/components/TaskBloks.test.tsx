// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseBsx } from "@/core/blok/bsx/parse";
import BlokRenderer from "@/core/blok/renderer/BlokRenderer";
import { BlokRunHostProvider } from "@/core/blok/renderer/bloks/run";
import { TaskEventKind } from "../api/graphql";
import type { HoldRequest } from "../lib/holds";
import { useTaskBlokHost } from "./TaskBloks";

vi.mock("./task/HoldCard", () => ({
  HoldCard: ({ hold }: { hold: HoldRequest }) => <div>hold: {hold.title}</div>,
}));

afterEach(cleanup);

type LiveTask = Parameters<typeof useTaskBlokHost>[0];

const held = (title: string, blok?: string) => ({
  kind: TaskEventKind.Held,
  createdAt: "2026-10-25T10:00:00Z",
  message: null,
  task: { id: "t1" },
  value: { kind: "self", prompt: { title }, ...(blok ? { blok } : {}) },
});

const Embed = ({ task, source }: { task: LiveTask; source: string }) => {
  const host = useTaskBlokHost(task, { id: "mb1", agentMappings: [] });
  return (
    <BlokRunHostProvider value={host}>
      <BlokRenderer uiComponents={[parseBsx(source).tree]} />
    </BlokRunHostProvider>
  );
};

describe("<ask> in a task blok embed", () => {
  it("draws the task's open ask", () => {
    render(<Embed task={{ isDone: false, events: [held("Pick a well")] }} source="<Card><ask /></Card>" />);
    expect(screen.queryByText("hold: Pick a well")).not.toBeNull();
  });

  it("draws nothing once the task is done, or for the ask this blok is the form of", () => {
    render(<Embed task={{ isDone: true, events: [held("Pick a well")] }} source="<Card><ask /></Card>" />);
    expect(screen.queryByText(/hold:/)).toBeNull();
    cleanup();
    render(<Embed task={{ isDone: false, events: [held("Through me", "mb1")] }} source="<Card><ask /></Card>" />);
    expect(screen.queryByText(/hold:/)).toBeNull();
  });
});
