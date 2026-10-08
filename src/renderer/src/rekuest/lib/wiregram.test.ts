import { describe, expect, it } from "vitest";
import { describeWiregram, keyFromName, parseWiregram } from "./wiregram";

describe("parseWiregram", () => {
  it("reads a document and counts its rules", () => {
    const parsed = parseWiregram(
      JSON.stringify({
        key: "nightly",
        name: "Nightly upkeep",
        schedules: [{ key: "sync", name: "Sync", agent: "kuvert", interface: "sync", cron: "0 2 * * *" }],
      }),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.summary).toEqual({
      key: "nightly",
      name: "Nightly upkeep",
      description: null,
      schedules: 1,
      triggers: 0,
    });
    expect(parsed.input.triggers).toEqual([]);
  });

  it("spells a rule's keys as the input does, and leaves its values alone", () => {
    const parsed = parseWiregram(
      JSON.stringify({
        key: "k",
        name: "n",
        schedules: [
          { key: "s", name: "s", agent: "a", interface: "i", interval_seconds: 60, args: { my_arg: 1 } },
        ],
      }),
    );
    expect(parsed.ok && parsed.input.schedules?.[0]).toMatchObject({
      intervalSeconds: 60,
      args: { my_arg: 1 },
    });
  });

  it("says what is wrong with a document it cannot read", () => {
    expect(parseWiregram("")).toEqual({ ok: false, error: "Nothing to import yet." });
    expect(parseWiregram("{")).toEqual({ ok: false, error: "This is not valid JSON." });
    expect(parseWiregram("[]").ok).toBe(false);
    expect(parseWiregram('{"name":"n"}').ok).toBe(false);
    expect(parseWiregram('{"key":"k","name":"n","triggers":{}}')).toEqual({
      ok: false,
      error: '"triggers" must be a list of rules.',
    });
  });
});

describe("describeWiregram", () => {
  it("counts in words", () => {
    expect(describeWiregram({ schedules: 2, triggers: 1 })).toBe("2 schedules · 1 trigger");
  });
});

describe("keyFromName", () => {
  it("makes a key of a name", () => {
    expect(keyFromName("  Nightly Upkeep (v2) ")).toBe("nightly-upkeep-v2");
  });
});
