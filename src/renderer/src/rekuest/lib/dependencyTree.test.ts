import { describe, expect, it } from "vitest";
import {
  DependencyNode,
  levelBelow,
  pinsFromFrozen,
  toPins,
  unmetDependencies,
  withLevelBelow,
  withPin,
} from "./dependencyTree";

const node = (key: string, over: Partial<DependencyNode> = {}): DependencyNode => ({
  key,
  mappedAgents: [],
  ...over,
});

/** `agent` bound to `key`, with `below` under its one implementation. */
const bound = (key: string, agent: string, below: DependencyNode[] = []): DependencyNode =>
  node(key, {
    mappedAgents: [{ agentId: agent, mappedImplementations: [{ key, resolvedDependencies: below }] }],
  });

describe("toPins", () => {
  it("keeps the input's own fields, level by level", () => {
    const form = [
      {
        key: "relay",
        mappedAgents: [
          {
            key: "relay",
            agent: "7",
            mappedActions: [],
            dependencies: [{ key: "leaf", autoResolve: true, mappedAgents: [] }],
          },
          { key: "relay", agent: "8", dependencies: [] },
        ],
      },
    ];
    expect(toPins(form as never)).toEqual([
      {
        key: "relay",
        autoResolve: false,
        mappedAgents: [
          {
            key: "relay",
            agent: "7",
            dependencies: [{ key: "leaf", autoResolve: true, mappedAgents: [] }],
          },
          { key: "relay", agent: "8" },
        ],
      },
    ]);
    expect(toPins(undefined)).toEqual([]);
  });
});

describe("withPin", () => {
  const a = { key: "a", mappedAgents: [{ key: "a", agent: "1" }] };
  const b = { key: "b", autoResolve: true, mappedAgents: [] };

  it("replaces a pin in place and appends a new one", () => {
    const next = { key: "a", mappedAgents: [{ key: "a", agent: "2" }] };
    expect(withPin([a, b], "a", next)).toEqual([next, b]);
    expect(withPin([b], "a", a)).toEqual([b, a]);
  });

  it("drops a pin that neither names an agent nor resolves by itself", () => {
    expect(withPin([a, b], "a", { key: "a", autoResolve: false, mappedAgents: [] })).toEqual([b]);
    expect(withPin([a, b], "b", undefined)).toEqual([a]);
  });
});

describe("levelBelow", () => {
  it("reads every implementation bound on the agent as one level", () => {
    const binding = {
      agentId: "7",
      mappedImplementations: [
        { key: "snap", resolvedDependencies: [node("stage"), node("light")] },
        { key: "move", resolvedDependencies: [node("stage", { unmet: "no agent" })] },
      ],
    };
    expect(levelBelow(binding).map((n) => [n.key, n.unmet ?? null])).toEqual([
      ["stage", "no agent"],
      ["light", null],
    ]);
  });
});

describe("withLevelBelow", () => {
  const below = [{ key: "leaf", mappedAgents: [{ key: "leaf", agent: "9" }] }];

  it("hangs the pins under the agent they are for", () => {
    const pin = { key: "relay", mappedAgents: [{ key: "relay", agent: "7" }, { key: "relay", agent: "8" }] };
    expect(withLevelBelow(pin, bound("relay", "7"), "7", below)).toEqual({
      key: "relay",
      autoResolve: false,
      mappedAgents: [
        { key: "relay", agent: "7", dependencies: below },
        { key: "relay", agent: "8" },
      ],
    });
  });

  it("pins what resolved by itself first, so the level below has an agent to sit under", () => {
    const resolved = node("relay", {
      mappedAgents: [
        { agentId: "7", mappedImplementations: [] },
        { agentId: "8", mappedImplementations: [] },
      ],
    });
    const auto = { key: "relay", autoResolve: true, mappedAgents: [] };
    for (const pin of [undefined, auto]) {
      expect(withLevelBelow(pin, resolved, "8", below).mappedAgents).toEqual([
        { key: "relay", agent: "7" },
        { key: "relay", agent: "8", dependencies: below },
      ]);
    }
  });
});

describe("unmetDependencies", () => {
  it("finds what is unmet at any level, with the keys that lead to it", () => {
    const tree = [
      bound("relay", "7", [node("leaf", { unmet: "Dependency leaf was not provided with an overwrite" })]),
      node("stage", { unmet: "Not enough agents" }),
    ];
    expect(unmetDependencies(tree)).toEqual([
      { path: ["relay", "leaf"], reason: "Dependency leaf was not provided with an overwrite" },
      { path: ["stage"], reason: "Not enough agents" },
    ]);
    expect(unmetDependencies(undefined)).toEqual([]);
  });
});

describe("pinsFromFrozen", () => {
  it("pins a task's bindings again, level by level", () => {
    const frozen = [
      {
        key: "relay",
        mappedAgents: [
          {
            agent: { id: "7" },
            mappedImplementations: [
              { key: "echo", resolvedDependencies: [{ key: "leaf", mappedAgents: [{ agentId: "9" }] }] },
            ],
          },
        ],
      },
      { key: "maybe", mappedAgents: [] },
    ];
    expect(pinsFromFrozen(frozen)).toEqual([
      {
        key: "relay",
        autoResolve: false,
        mappedAgents: [
          {
            key: "relay",
            agent: "7",
            dependencies: [{ key: "leaf", autoResolve: false, mappedAgents: [{ key: "leaf", agent: "9" }] }],
          },
        ],
      },
      // Unbound when it ran: unbound again, not resolved anew.
      { key: "maybe", autoResolve: false, mappedAgents: [] },
    ]);
  });
});
