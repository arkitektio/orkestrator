import { describe, expect, it } from "vitest";
import { LinkKind, type ClaimActFragment } from "@/kraph/api/graphql";
import { describeAct } from "./claimActs";

const act = (over: Partial<ClaimActFragment>): ClaimActFragment =>
  ({
    instances: [],
    links: [],
    metrics: [],
    comments: [],
    standings: [],
    structures: [],
    ...over,
  }) as unknown as ClaimActFragment;

const texts = (a: ClaimActFragment) => describeAct(a).map((part) => part.text);

describe("describeAct", () => {
  it("names an instance and a link by their words, label before key", () => {
    expect(
      texts(
        act({
          instances: [{ id: "i", term: { key: "AIS", label: "Axon initial segment" } }],
          links: [{ id: "l", kind: LinkKind.Measurement, term: { key: "LABELS_THE_PATH" } }],
        } as never),
      ),
    ).toEqual(["Axon initial segment", "LABELS_THE_PATH"]);
  });

  it("phrases a link that names no word by its kind", () => {
    expect(
      texts(act({ links: [{ id: "l", kind: LinkKind.SameAs, term: null }] } as never)),
    ).toEqual(["same as"]);
  });

  it("reads a metric as key, value and unit, keeping a zero", () => {
    expect(
      texts(act({ metrics: [{ id: "m", key: "length", value: 0, unit: "µm" }] } as never)),
    ).toEqual(["length = 0 µm"]);
  });

  it("says a position was taken", () => {
    expect(
      texts(
        act({
          standings: [
            { id: "a", stands: true },
            { id: "b", stands: false },
          ],
        } as never),
      ),
    ).toEqual(["attested", "retracted"]);
  });

  it("mentions a datum only when the act said nothing else", () => {
    const structures = [{ id: "s", identifier: "@mikro/annotation", object: "1" }];
    expect(texts(act({ structures } as never))).toEqual(["recorded @mikro/annotation"]);
    expect(
      texts(
        act({ structures, instances: [{ id: "i", term: { key: "AIS" } }] } as never),
      ),
    ).toEqual(["AIS"]);
  });

  it("links a claim to its own page", () => {
    const [part] = describeAct(act({ instances: [{ id: "i", term: { key: "AIS" } }] } as never));
    expect(part?.to).toEqual({ kind: "instance", id: "i" });
  });
});
