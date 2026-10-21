// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { OpenableBloksDocument, PortKind } from "@/rekuest/api/graphql";
import { missingBlokArgs } from "@/rekuest/components/blokArgs";
import { buildActionArgs } from "./actions";
import { buildDemands } from "./demands";
import { openableBloksVariables } from "./queries";
import { REKUEST_BLOKS_SECTION } from "./sections";

const dataset = (id: string) => ({ identifier: "@mikro/arraydataset", id });

describe("Open in", () => {
  it("is offered for a selection, never for a return type alone", () => {
    expect(REKUEST_BLOKS_SECTION.applies({ objects: [dataset("1")] })).toBe(true);
    expect(REKUEST_BLOKS_SECTION.applies({ objects: [], returns: ["@mikro/arraydataset"] })).toBe(false);
    expect(REKUEST_BLOKS_SECTION.prefetch?.({ objects: [] })).toEqual([]);
  });

  it("asks for the bloks whose args take the selection, as the Run section asks for actions", () => {
    const target = { objects: [dataset("1")] };
    expect(REKUEST_BLOKS_SECTION.prefetch?.(target)).toEqual([
      { service: "rekuest", name: "bloks", query: OpenableBloksDocument, variables: openableBloksVariables(buildDemands(target).single) },
    ]);
    expect(openableBloksVariables(buildDemands(target).single).filters?.demands).toEqual([
      { kind: "ARGS", matches: [{ at: 0, kind: PortKind.Structure, identifier: "@mikro/arraydataset" }] },
    ]);
  });

  it("never asks a blok for returns, even where the menu also knows a return type", () => {
    const demands = buildDemands({ objects: [dataset("1")], returns: ["@mikro/table"] }).single;
    expect(demands.map((demand) => demand.kind)).toEqual(["ARGS", "RETURNS"]);
    expect(openableBloksVariables(demands).filters?.demands?.map((demand) => demand.kind)).toEqual(["ARGS"]);
  });

  it("opens a blok for the selection at its first arg, a list of them for several", () => {
    const blok = { id: "m1", args: [{ key: "dataset", kind: PortKind.Structure }] };
    expect(buildActionArgs(blok, { objects: [dataset("7")] })).toEqual({
      dataset: { __identifier: "@mikro/arraydataset", object: "7" },
    });
    const gallery = { id: "m2", args: [{ key: "datasets", kind: PortKind.List }] };
    expect(buildActionArgs(gallery, { objects: [dataset("7"), dataset("8")] })).toEqual({
      datasets: [
        { __identifier: "@mikro/arraydataset", object: "7" },
        { __identifier: "@mikro/arraydataset", object: "8" },
      ],
    });
  });

  it("leaves to the form what the selection does not fill", () => {
    const blok = {
      id: "m3",
      args: [
        { key: "dataset", kind: PortKind.Structure, nullable: false },
        { key: "channel", kind: PortKind.Int, nullable: false },
        { key: "note", kind: PortKind.String, nullable: true },
      ],
    };
    const args = buildActionArgs(blok, { objects: [dataset("7")] });
    expect(missingBlokArgs(blok.args, args).map((port) => port.key)).toEqual(["channel"]);
  });
});
