import { describe, expect, it } from "vitest";

import { Journal } from "./journal";

describe("the agent's journal", () => {
  it("numbers reports from 1, keeps them until acknowledged, and sends again from where a gap is named", () => {
    const journal = new Journal<{ type: string }>("s", () => 7);
    const sent = ["STARTED", "YIELD", "COMPLETED"].map((type) => journal.record({ type }));

    expect(sent.map((f) => f.pos)).toEqual([1, 2, 3]);
    expect(sent[0]).toMatchObject({ journal_session: "s", agent_ts: 7 });

    journal.ack(1);
    expect(journal.owed().map((f) => f.pos)).toEqual([2, 3]);
    // JOURNAL_NACK {expected: 3}: only what the server lacks.
    expect(journal.owed(3).map((f) => f.type)).toEqual(["COMPLETED"]);
    expect(journal.missing(2)).toBeNull();

    journal.ack(3);
    expect(journal.owes).toBe(false);
  });

  it("says which positions it no longer holds, the only way one is passed over", () => {
    const journal = new Journal<{ type: string }>("s");
    journal.record({ type: "STARTED" });
    journal.record({ type: "COMPLETED" });
    journal.ack(1);

    expect(journal.missing(1)).toEqual({ session: "s", first: 1, last: 1 });
  });
});
