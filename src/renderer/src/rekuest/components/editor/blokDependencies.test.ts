import { describe, expect, it } from "vitest";
import type { BlokEditorDependencyFragment } from "@/rekuest/api/graphql";
import { PortKind } from "@/rekuest/api/graphql";
import { bsxDependency, dependencyDraft, dependencyInput, dependencyProblems, emptyDependency } from "./blokDependencies";

const read = (overrides: Partial<BlokEditorDependencyFragment> = {}): BlokEditorDependencyFragment => ({
  id: "1",
  key: "stage",
  description: "The stage",
  appFilter: "mikro.stage",
  versionFilter: null,
  optional: false,
  autoResolvable: true,
  minViableInstances: 1,
  maxViableInstances: null,
  actionDependencies: [
    {
      key: "move",
      description: null,
      optional: false,
      demand: {
        app: null,
        argMatches: [{ key: "x", kind: PortKind.Float, children: [{ key: "inner", children: [] }] }],
        forceArgLength: null,
        forceReturnLength: null,
        hash: null,
        idempotent: null,
        key: "move",
        name: null,
        protocols: null,
        pure: null,
        returnMatches: null,
        stateful: null,
        version: null,
      },
    },
  ],
  stateDependencies: [{ key: "position", description: "Where it is", optional: true, demand: null }],
  ...overrides,
});

describe("blok dependencies", () => {
  it("sends a dependency back as it was read", () => {
    const input = dependencyInput(dependencyDraft(read()));
    expect(input).toMatchObject({
      key: "stage",
      app: "mikro.stage",
      version: null,
      description: "The stage",
      autoResolvable: true,
      minViableInstances: 1,
      stateDependencies: [{ key: "position", description: "Where it is", optional: true, demand: null }],
    });
    expect(input.actionDependencies?.[0].demand?.argMatches?.[0]).toMatchObject({
      key: "x",
      kind: PortKind.Float,
      children: [{ key: "inner", children: [] }],
    });
  });

  it("locks a dependency whose demand nests deeper than the editor reads", () => {
    const deep = read({
      actionDependencies: [
        {
          key: "move",
          description: null,
          optional: false,
          demand: {
            argMatches: [{ key: "a", children: [{ key: "b", children: [{ key: "c", children: [{ key: "d" }] }] }] }],
          } as never,
        },
      ],
    });
    expect(dependencyDraft(deep).locked).toBe(true);
    expect(dependencyDraft(read()).locked).toBe(false);
  });

  it("declares no actions as null: any operation", () => {
    expect(dependencyInput(emptyDependency("lamp")).actionDependencies).toBeNull();
  });

  it("tells completion its keys", () => {
    expect(bsxDependency(dependencyDraft(read()))).toEqual({
      key: "stage",
      app: "mikro.stage",
      actions: ["move"],
      states: ["position"],
    });
  });

  it("finds keys that cannot be saved", () => {
    const drafts = [emptyDependency("stage"), emptyDependency("stage"), emptyDependency("2x"), emptyDependency("utils")];
    const problems = dependencyProblems(drafts);
    expect(problems.get(drafts[0].uid)).toMatch(/twice/);
    expect(problems.get(drafts[2].uid)).toMatch(/name/);
    expect(problems.get(drafts[3].uid)).toMatch(/reserves/);
  });
});
