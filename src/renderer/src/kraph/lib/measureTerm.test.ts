import type { ApolloClient } from "@apollo/client";
import { describe, expect, it, vi } from "vitest";
import {
  AssertEntityExistsDocument,
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
      [AssertEntityExistsDocument, { term: "Mitochondrion" }],
      [AssertMeasurementExistsDocument, { sourceId: "s-1", targetId: "e-1", term: MEASURES_TERM }],
      [AssertStructureExistsDocument, { identifier: "@mikro/arraydataset", object: "2" }],
      [AssertEntityExistsDocument, { term: "Mitochondrion" }],
      [AssertMeasurementExistsDocument, { sourceId: "s-2", targetId: "e-2", term: MEASURES_TERM }],
    ]);
  });

  it("refuses an empty word", async () => {
    const { client, mutate } = fakeClient();
    await expect(measureTerm(client, [{ identifier: "@mikro/arraydataset", id: "1" }], "  ")).rejects.toThrow();
    expect(mutate).not.toHaveBeenCalled();
  });
});
