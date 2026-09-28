// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  AssertEntityExistsDocument,
  AssertSameInstanceDocument,
  InstanceKind,
} from "../api/graphql";
import { isNotKnownYet, isNotKnownYetErrors } from "./knowledgeErrors";
import {
  executeSameness,
  explainSameness,
  planSameness,
  type SamenessClient,
} from "./sameness";

const datum = (id: string, identifier = "@mikro/file") => ({
  identifier,
  id,
});

const instance = (
  id: string,
  term: string,
  over: { createdAt?: string; component?: string[]; kind?: InstanceKind } = {},
) => ({
  id,
  kind: over.kind ?? InstanceKind.Entity,
  createdAt: over.createdAt ?? "2026-01-01T00:00:00Z",
  term: { id: `t-${term}`, key: term, kind: "ENTITY", label: null, color: null },
  component: over.component ?? [id],
  sameAs: [],
  drawnIn: [],
  assertion: { id: `a-${id}`, subject: "u", assertedAt: "", recordedAt: "", seq: 1 },
});

const notFound = { message: "not found", path: ["structureByIdentifier"] };

/** A client answering each datum id with its instances (or a not-found error). */
const fakeClient = (
  byObject: Record<string, ReturnType<typeof instance>[] | "not-found" | "broken">,
) => {
  const mutate = vi.fn(async () => ({ data: {} }));
  const query = vi.fn(async (options: { variables?: { object?: string } }) => {
    const answer = byObject[options.variables?.object ?? ""];
    if (answer === "not-found") return { data: undefined, errors: [notFound] };
    if (answer === "broken") return { data: undefined, errors: [{ message: "boom", path: ["x"] }] };
    return { data: { structureByIdentifier: { informs: answer ?? [] } } };
  });
  return { client: { query, mutate } as unknown as SamenessClient, query, mutate };
};

describe("planSameness", () => {
  it("refuses the same datum on both sides", async () => {
    const { client } = fakeClient({});
    await expect(
      planSameness({ client, left: datum("1"), right: datum("1") }),
    ).rejects.toThrow(/different datum/);
  });

  it("merges two instances of one word with assertSameInstance", async () => {
    const { client } = fakeClient({ "1": [instance("i1", "AIS")], "2": [instance("i2", "AIS")] });
    expect(await planSameness({ client, left: datum("1"), right: datum("2") })).toEqual({
      kind: "same-instance",
      term: "AIS",
      instances: ["i1", "i2"],
    });
  });

  it("takes the newest instance when one side carries the word twice", async () => {
    const { client } = fakeClient({
      "1": [
        instance("old", "AIS", { createdAt: "2026-01-01T00:00:00Z" }),
        instance("new", "AIS", { createdAt: "2026-02-01T00:00:00Z" }),
      ],
      "2": [instance("i2", "AIS")],
    });
    const plan = await planSameness({ client, left: datum("1"), right: datum("2") });
    expect(plan).toMatchObject({ kind: "same-instance", instances: ["new", "i2"] });
  });

  it("claims the unlabelled side as the word, same as the known instance", async () => {
    const { client } = fakeClient({ "1": [instance("i1", "AIS")], "2": "not-found" });
    expect(await planSameness({ client, left: datum("1"), right: datum("2") })).toEqual({
      kind: "claim-with-same-as",
      term: "AIS",
      evidence: datum("2"),
      sameAs: "i1",
    });
  });

  it("works in either direction: the labelled side may be the partner", async () => {
    const { client } = fakeClient({ "1": [], "2": [instance("i2", "Soma")] });
    expect(await planSameness({ client, left: datum("1"), right: datum("2") })).toEqual({
      kind: "claim-with-same-as",
      term: "Soma",
      evidence: datum("1"),
      sameAs: "i2",
    });
  });

  it("reports an existing merge instead of writing again", async () => {
    const { client } = fakeClient({
      "1": [instance("i1", "AIS", { component: ["i1", "i2"] })],
      "2": [instance("i2", "AIS", { component: ["i1", "i2"] })],
    });
    expect(await planSameness({ client, left: datum("1"), right: datum("2") })).toEqual({
      kind: "already-same",
      term: "AIS",
    });
  });

  it("needs a word when neither side is labelled", async () => {
    const { client } = fakeClient({ "1": "not-found", "2": [] });
    expect(await planSameness({ client, left: datum("1"), right: datum("2") })).toEqual({
      kind: "needs-term",
    });
  });

  it("is ambiguous when several words are in play and none is named", async () => {
    const { client } = fakeClient({ "1": [instance("i1", "AIS")], "2": [instance("i2", "Soma")] });
    expect(await planSameness({ client, left: datum("1"), right: datum("2") })).toEqual({
      kind: "ambiguous",
      terms: ["AIS", "Soma"],
    });
  });

  it("a named word resolves the ambiguity", async () => {
    const { client } = fakeClient({ "1": [instance("i1", "AIS")], "2": [instance("i2", "Soma")] });
    expect(
      await planSameness({ client, left: datum("1"), right: datum("2"), term: "AIS" }),
    ).toEqual({ kind: "claim-with-same-as", term: "AIS", evidence: datum("2"), sameAs: "i1" });
  });

  it("ignores event instances: sameness here is between entities", async () => {
    const { client } = fakeClient({
      "1": [instance("e1", "Stim", { kind: InstanceKind.ProtocolEvent })],
      "2": [instance("i2", "AIS")],
    });
    expect(await planSameness({ client, left: datum("1"), right: datum("2") })).toMatchObject({
      kind: "claim-with-same-as",
      term: "AIS",
    });
  });

  it("surfaces a real read failure rather than treating it as empty", async () => {
    const { client } = fakeClient({ "1": "broken", "2": [] });
    await expect(planSameness({ client, left: datum("1"), right: datum("2") })).rejects.toThrow(
      "boom",
    );
  });
});

describe("executeSameness", () => {
  it("writes one sameness assertion over both instances", async () => {
    const { client, mutate } = fakeClient({});
    await executeSameness(client, { kind: "same-instance", term: "AIS", instances: ["a", "b"] });
    expect(mutate).toHaveBeenCalledWith({
      mutation: AssertSameInstanceDocument,
      variables: { input: { instances: ["a", "b"] } },
    });
  });

  it("claims and merges in one assertion for the unlabelled side", async () => {
    const { client, mutate } = fakeClient({});
    await executeSameness(client, {
      kind: "claim-with-same-as",
      term: "AIS",
      evidence: datum("2"),
      sameAs: "i1",
    });
    expect(mutate).toHaveBeenCalledWith({
      mutation: AssertEntityExistsDocument,
      variables: {
        input: {
          term: "AIS",
          supportingEvidence: [{ identifier: "@mikro/file", object: "2" }],
          sameAs: ["i1"],
        },
      },
    });
  });

  it("writes nothing for the non-writing kinds", async () => {
    const { client, mutate } = fakeClient({});
    await executeSameness(client, { kind: "already-same", term: "AIS" });
    await executeSameness(client, { kind: "needs-term" });
    await executeSameness(client, { kind: "ambiguous", terms: ["a", "b"] });
    expect(mutate).not.toHaveBeenCalled();
  });

  it("explains only the kinds a person has to act on", () => {
    expect(explainSameness({ kind: "needs-term" })).toMatch(/Neither datum is labelled/);
    expect(explainSameness({ kind: "ambiguous", terms: ["AIS", "Soma"] })).toMatch(/AIS, Soma/);
    expect(explainSameness({ kind: "already-same", term: "AIS" })).toBeNull();
  });
});

describe("isNotKnownYet", () => {
  it("is true only when every error sits on the root field and nothing failed on the wire", () => {
    expect(isNotKnownYetErrors([notFound])).toBe(true);
    expect(isNotKnownYetErrors([notFound, { message: "x", path: ["other"] }])).toBe(false);
    expect(isNotKnownYetErrors([])).toBe(false);
    expect(isNotKnownYetErrors(undefined)).toBe(false);
    expect(
      isNotKnownYet({ networkError: null, graphQLErrors: [notFound] } as never),
    ).toBe(true);
    expect(
      isNotKnownYet({ networkError: new Error("offline"), graphQLErrors: [] } as never),
    ).toBe(false);
  });
});
