import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/linkers", () => ({ RekuestBlok: {}, RekuestMaterializedBlok: {} }));
vi.mock("./BlokScreen", () => ({ BlokScreen: () => null }));

import { boundPresence } from "./MaterializedBlokCard";

const agents = (...connected: boolean[]) => connected.map((value) => ({ connected: value }));

describe("boundPresence", () => {
  it("says whether a materialized blok's agents can answer", () => {
    expect(boundPresence([])).toMatchObject({ online: 0, label: "Bound to no agent" });
    expect(boundPresence(agents(true))).toMatchObject({ online: 1, label: "Its agent is online", dot: "bg-success" });
    expect(boundPresence(agents(true, true))).toMatchObject({ label: "All its agents are online" });
    expect(boundPresence(agents(false))).toMatchObject({ online: 0, label: "Its agent is offline" });
    expect(boundPresence(agents(true, false, false))).toMatchObject({ online: 1, label: "1 of 3 agents online", dot: "bg-warning" });
  });
});
