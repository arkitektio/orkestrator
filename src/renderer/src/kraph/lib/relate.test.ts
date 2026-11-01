import type { ApolloClient } from "@apollo/client";
import { describe, expect, it, vi } from "vitest";
import { describeError } from "@/core/notify";
import {
  AssertRelationExistsDocument,
  AssertStructureExistsDocument,
  AssertStructureRelationExistsDocument,
} from "@/kraph/api/graphql";
import { relate, relatePairs } from "./relate";

const entity = (id: string) => ({ identifier: "@kraph/entity", id });
const datum = (id: string) => ({ identifier: "@mikro/annotation", id });

const fakeClient = (failOn?: (variables: any) => boolean) => {
  const mutate = vi.fn(async ({ mutation, variables }: any) => {
    if (failOn?.(variables)) throw new Error("server said no");
    if (mutation === AssertStructureExistsDocument) {
      return {
        data: { assertStructureExists: { structure: { id: `s-${variables.input.object}` } } },
      };
    }
    return { data: {} };
  });
  return { client: { mutate } as unknown as ApolloClient<any>, mutate };
};

const calls = (mutate: ReturnType<typeof vi.fn>, document: unknown) =>
  mutate.mock.calls.filter(([options]) => options.mutation === document).map(([o]) => o.variables.input);

describe("relatePairs", () => {
  it("pairs every side and leaves out a thing related to itself", () => {
    expect(relatePairs([entity("a"), entity("b")], [entity("b"), entity("c")])).toEqual([
      { source: entity("a"), target: entity("b") },
      { source: entity("a"), target: entity("c") },
      { source: entity("b"), target: entity("c") },
    ]);
  });
});

describe("relate", () => {
  it("relates entities by their own ids, naming the word and no graph", async () => {
    const { client, mutate } = fakeClient();
    await relate(client, {
      kind: "entities",
      left: [entity("ais")],
      right: [entity("neuron")],
      term: " is part of ",
    });

    expect(calls(mutate, AssertRelationExistsDocument)).toEqual([
      { sourceId: "ais", targetId: "neuron", term: "is part of" },
    ]);
    expect(calls(mutate, AssertStructureExistsDocument)).toEqual([]);
  });

  it("records each datum once, however many pairs it is in", async () => {
    const { client, mutate } = fakeClient();
    const done = await relate(client, {
      kind: "data",
      left: [datum("a"), datum("b")],
      right: [datum("c")],
      term: "crop of",
    });

    expect(done).toBe(2);
    expect(calls(mutate, AssertStructureExistsDocument).map((i) => i.object)).toEqual([
      "a",
      "c",
      "b",
    ]);
    expect(calls(mutate, AssertStructureRelationExistsDocument)).toEqual([
      { sourceId: "s-a", targetId: "s-c", term: "crop of" },
      { sourceId: "s-b", targetId: "s-c", term: "crop of" },
    ]);
  });

  it("refuses a pair of one thing with itself, before writing anything", async () => {
    const { client, mutate } = fakeClient();
    await expect(
      relate(client, { kind: "entities", left: [entity("a")], right: [entity("a")], term: "near" }),
    ).rejects.toThrow(/same thing/);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("lets a first failure through as the server said it", async () => {
    const { client } = fakeClient(() => true);
    await expect(
      relate(client, { kind: "entities", left: [entity("a")], right: [entity("b")], term: "near" }),
    ).rejects.toThrow("server said no");
  });

  it("says how far it got when a batch stops partway", async () => {
    const { client } = fakeClient((variables) => variables.input.sourceId === "b");
    const failure = await relate(client, {
      kind: "entities",
      left: [entity("a"), entity("b")],
      right: [entity("c")],
      term: "near",
    }).catch((e) => e);

    const described = describeError(failure);
    expect(described.message).toBe("Related 1 of 2, then stopped. The first 1 stand.");
    expect(described.technical).toBe("server said no");
  });
});
