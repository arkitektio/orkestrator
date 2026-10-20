import { afterEach, describe, expect, it } from "vitest";
import {
  connectionProgress,
  endServiceCheck,
  endSession,
  recordAttempt,
  resetConnectionProgress,
  sessionStep,
  setMeshProgress,
  startServiceCheck,
  startSession,
  waitForMesh,
} from "./store";

afterEach(() => resetConnectionProgress());

const services = () => connectionProgress.getSnapshot().services;

describe("connection progress", () => {
  it("replaces a probe's trying row with how it ended", () => {
    startServiceCheck("mikro", 1);
    recordAttempt("mikro", 1, { host: "a.org", route: "direct", state: "trying" });
    recordAttempt("mikro", 1, { host: "a.org", route: "direct", state: "failed", failure: { kind: "unreachable" } });
    recordAttempt("mikro", 1, { host: "b.ts.net", route: "mesh", state: "trying" });
    expect(services().mikro.attempts.map((a) => `${a.host}:${a.state}`)).toEqual(["a.org:failed", "b.ts.net:trying"]);
  });

  it("drops writes from a superseded check", () => {
    startServiceCheck("mikro", 1);
    startServiceCheck("mikro", 2);
    recordAttempt("mikro", 1, { host: "old.org", route: "direct", state: "trying" });
    waitForMesh("mikro", 1, true);
    endServiceCheck("mikro", 1);
    expect(services().mikro).toMatchObject({ run: 2, attempts: [], waitingForMesh: false });
    endServiceCheck("mikro", 2);
    expect(services().mikro).toBeUndefined();
  });

  it("keeps a mesh phase's clock until the phase changes", () => {
    const base = { meshId: "lab", label: "Lab", demandedBy: ["mikro"], since: 0 };
    setMeshProgress({ ...base, phase: "joining" });
    const since = connectionProgress.getSnapshot().mesh!.since;
    setMeshProgress({ ...base, phase: "joining", since: since + 5000 });
    expect(connectionProgress.getSnapshot().mesh!.since).toBe(since);
    setMeshProgress(undefined);
    expect(connectionProgress.getSnapshot().mesh).toBeUndefined();
  });

  it("moves a session through its steps and ends it", () => {
    sessionStep("open");
    expect(connectionProgress.getSnapshot().session).toBeUndefined();
    startSession("booting", "refresh", { deployment: "Lab" });
    sessionStep("open");
    expect(connectionProgress.getSnapshot().session).toMatchObject({ kind: "booting", step: "open", deployment: "Lab" });
    endSession();
    expect(connectionProgress.getSnapshot().session).toBeUndefined();
  });
});
