import type { ApolloClient } from "@apollo/client";
import { describe, expect, it, vi } from "vitest";
import {
  AssertEntityExistsDocument,
  AssertInformsDocument,
  AssertMeasurementExistsDocument,
  AssertStructureExistsDocument,
} from "@/kraph/api/graphql";
import { MEASURES_TERM, measureTerm } from "./measureTerm";

const fakeClient = () => {
  let entities = 0;
  const mutate = vi.fn(async ({ mutation, variables }: any) => {
    if (mutation === AssertStructureExistsDocument) {
      return {
        data: { assertStructureExists: { structure: { id: `s-${variables.input.object}` } } },
      };
    }
    if (mutation === AssertEntityExistsDocument) {
      entities += 1;
      return { data: { assertEntityExists: { instance: { id: `e-${entities}` } } } };
    }
    return { data: { assertMeasurementExists: {} } };
  });
  return { client: { mutate } as unknown as ApolloClient<any>, mutate };
};

const datum = { identifier: "@mikro/arraydataset", id: "1" };

describe("measureTerm", () => {
  it("records each datum measuring a fresh instance of the word", async () => {
    const { client, mutate } = fakeClient();
    await measureTerm(
      client,
      [
        { identifier: "@mikro/arraydataset", id: "1" },
        { identifier: "@mikro/arraydataset", id: "2" },
      ],
      " Mitochondrion ",
    );

    const calls = mutate.mock.calls.map(([options]: any) => [options.mutation, options.variables.input]);
    expect(calls).toEqual([
      [AssertStructureExistsDocument, { identifier: "@mikro/arraydataset", object: "1" }],
      [
        AssertEntityExistsDocument,
        {
          term: "Mitochondrion",
          supportingEvidence: [{ identifier: "@mikro/arraydataset", object: "1" }],
        },
      ],
      [AssertMeasurementExistsDocument, { sourceId: "s-1", targetId: "e-1", term: MEASURES_TERM }],
      [AssertStructureExistsDocument, { identifier: "@mikro/arraydataset", object: "2" }],
      [
        AssertEntityExistsDocument,
        {
          term: "Mitochondrion",
          supportingEvidence: [{ identifier: "@mikro/arraydataset", object: "2" }],
        },
      ],
      [AssertMeasurementExistsDocument, { sourceId: "s-2", targetId: "e-2", term: MEASURES_TERM }],
    ]);
  });

  it("says what it measures of a new thing", async () => {
    const { client, mutate } = fakeClient();
    await measureTerm(client, [datum], "sample", " intensity profile ");

    expect(mutate.mock.lastCall?.[0].variables.input).toEqual({
      sourceId: "s-1",
      targetId: "e-1",
      term: "intensity profile",
    });
  });

  it("measures a thing that exists without minting one, recording the datum as its evidence", async () => {
    const { client, mutate } = fakeClient();
    await measureTerm(client, [datum], { id: "known" }, "intensity profile");

    const calls = mutate.mock.calls.map(([options]: any) => [options.mutation, options.variables.input]);
    expect(calls).toEqual([
      [AssertStructureExistsDocument, { identifier: "@mikro/arraydataset", object: "1" }],
      [
        AssertInformsDocument,
        { entityId: "known", structureIdentifier: "@mikro/arraydataset", structureObject: "1" },
      ],
      [AssertMeasurementExistsDocument, { sourceId: "s-1", targetId: "known", term: "intensity profile" }],
    ]);
  });

  it("adds no evidence the datum already is", async () => {
    const { client, mutate } = fakeClient();
    await measureTerm(client, [datum], { id: "known", informed: true }, "intensity profile");

    expect(mutate.mock.calls.map(([options]: any) => options.mutation)).toEqual([
      AssertStructureExistsDocument,
      AssertMeasurementExistsDocument,
    ]);
  });

  it("refuses an empty measurement word", async () => {
    const { client, mutate } = fakeClient();
    await expect(measureTerm(client, [datum], "sample", "  ")).rejects.toThrow();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("refuses an empty word", async () => {
    const { client, mutate } = fakeClient();
    await expect(measureTerm(client, [{ identifier: "@mikro/arraydataset", id: "1" }], "  ")).rejects.toThrow();
    expect(mutate).not.toHaveBeenCalled();
  });
});
