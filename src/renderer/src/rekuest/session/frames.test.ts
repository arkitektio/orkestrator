import { describe, expect, it } from "vitest";
import { TaskEventKind } from "../api/graphql";
import examples from "./session_wire_examples.json";
import {
  materialize,
  toStateSnapshotEvent,
  toTaskChange,
  toTaskEventChange,
  toWireAssignInput,
  type StatesSnapshot,
  type WireTaskEvent,
} from "./frames";

// A copy of takt's `crates/facade/tests/fixtures/session_wire_examples.json`: the contract.
describe("session frames", () => {
  it("reads every server frame of the wire examples", () => {
    const kinds = examples.server.map((frame) => frame.type);
    expect(kinds).toEqual([
      "WELCOME",
      "DATA",
      "RESYNC",
      "ASSIGNED",
      "ACCEPTED",
      "REFUSED",
      "REFUSED",
      "PONG",
      "CLOSING",
    ]);
  });

  it("turns a task event item into the feeds' TaskEventChange", () => {
    const data = examples.server.find((frame) => frame.type === "DATA")!;
    const change = toTaskEventChange((data as { item: WireTaskEvent }).item);
    expect(change).toMatchObject({
      __typename: "TaskEventChange",
      id: "9001",
      task: "1234",
      taskSeq: 7,
      kind: TaskEventKind.Progress,
      progress: 40,
      createdAt: "2026-11-23T09:44:08.960420Z",
    });
  });

  it("turns a task record into the feeds' TaskChange", () => {
    const assigned = examples.server.find((frame) => frame.type === "ASSIGNED")! as {
      record: Parameters<typeof toTaskChange>[0];
    };
    expect(toTaskChange(assigned.record)).toMatchObject({
      __typename: "TaskChange",
      id: "1235",
      isDone: false,
      latestEventKind: "QUEUED",
      agent: "3",
      root: null,
    });
  });

  it("writes an assign as the session takes it, leaving args and values alone", () => {
    const wire = toWireAssignInput({
      action: "12",
      args: { myPort: 1, nested: { camelKey: true } },
      actionHash: undefined,
      dependencies: [{ key: "camera", mappedAgents: [{ key: "camera", agent: "3" }], autoResolve: false }],
      notBefore: "2026-11-23T10:00:00Z",
      reference: "r",
    });
    expect(wire).toEqual({
      action: "12",
      args: { myPort: 1, nested: { camelKey: true } },
      dependencies: [{ key: "camera", mapped_agents: [{ key: "camera", agent: "3" }], auto_resolve: false }],
      not_before: "2026-11-23T10:00:00Z",
      reference: "r",
    });
    // The client's assign example is what takt reads.
    const assign = examples.client.find((frame) => frame.type === "ASSIGN")! as { input: unknown };
    expect(Object.keys(assign.input as object)).toContain("dependencies");
  });

  it("materializes a state from its checkpoint and the patches after it", () => {
    const snapshot: StatesSnapshot = {
      agent: 3,
      session: 9,
      global_rev: 12,
      states: {
        position: {
          state: 41,
          value: {
            base: { x: 1, y: 2 },
            base_rev: 10,
            patches: [
              { state: 41, interface: "position", global_rev: 11, ops: [{ op: "replace", path: "/x", value: 5 }] },
              { state: 41, interface: "position", global_rev: 12, ops: [{ op: "add", path: "/z", value: 0 }] },
            ],
          },
        },
      },
    };
    expect(materialize(snapshot.states.position.value)).toEqual({ x: 5, y: 2, z: 0 });
    expect(toStateSnapshotEvent(snapshot, "position")).toMatchObject({
      stateId: "41",
      agentId: "3",
      value: { x: 5, y: 2, z: 0 },
      globalRevision: 12,
      sessionId: "9",
    });
    expect(toStateSnapshotEvent(snapshot, "missing")).toBeNull();
  });
});
