import { describe, expect, it, vi } from "vitest";
import { AgentsDocument, AssignDocument, ListImplementationsDocument } from "@/rekuest/api/graphql";
import { GetPodDocument, PodLatestLogsDocument, WatchPodLogsDocument } from "../api/graphql";
import { logLines, logTone, pickLogAction, refreshPodLogs } from "./podLogs";

const candidate = (id: string, name: string, active = true, iface = name) => ({
  id,
  interface: iface,
  action: { name },
  agent: { name: "deployer", active },
});

describe("logLines", () => {
  it("strips terminal escapes and trailing blank lines", () => {
    expect(logLines("\u001b[32mINFO\u001b[0m up\r\nnext\n\n")).toEqual(["INFO up", "next"]);
    expect(logLines("")).toEqual([]);
  });
});

describe("logTone", () => {
  it("reads the level word", () => {
    expect(logTone("2026 ERROR boom")).toBe("error");
    expect(logTone("WARNING slow")).toBe("warning");
    expect(logTone("INFO terrors of the deep")).toBeUndefined();
  });
});

describe("pickLogAction", () => {
  it("takes the action named for logs, a live agent's first", () => {
    expect(pickLogAction([candidate("1", "Restart"), candidate("2", "Refresh Logs")])?.id).toBe("2");
    expect(pickLogAction([candidate("1", "Dump", false, "dump_logs"), candidate("2", "Dump", true, "dump_logs")])?.id).toBe("2");
    expect(pickLogAction([candidate("1", "Restart")])).toBeUndefined();
  });
});

const clients = (options: {
  implementations: ReturnType<typeof candidate>[];
  /** The dump each slim read finds, in order (the last one repeats). */
  dumps: (string | null)[];
  /** The dumps the pod's subscription announces, right after it is opened. */
  announced?: string[];
}) => {
  let read = 0;
  const kabinet = {
    query: vi.fn(async ({ query }: { query: unknown }) => {
      if (query === GetPodDocument) {
        return { data: { pod: { backend: { clientId: "c1", name: "lab" }, latestLogDump: { createdAt: "t0", logs: "x" } } } };
      }
      expect(query).toBe(PodLatestLogsDocument);
      const createdAt = options.dumps[Math.min(read++, options.dumps.length - 1)];
      return { data: { pod: { id: "p1", latestLogDump: createdAt ? { createdAt, logs: "x" } : null } } };
    }),
    subscribe: vi.fn(({ query }: { query: unknown }) => {
      expect(query).toBe(WatchPodLogsDocument);
      return {
        subscribe: (observer: { next: (value: unknown) => void }) => {
          for (const createdAt of options.announced ?? []) {
            queueMicrotask(() => observer.next({ data: { pod: { update: { id: "p1", latestLogDump: { createdAt, logs: "y" } } } } }));
          }
          return { unsubscribe: vi.fn() };
        },
      };
    }),
  };
  const rekuest = {
    query: vi.fn(async ({ query }: { query: unknown }) => {
      if (query === AgentsDocument) return { data: { agents: [{ id: "a1" }] } };
      if (query === ListImplementationsDocument) return { data: { implementations: options.implementations } };
      throw new Error("unexpected query");
    }),
    mutate: vi.fn(async () => ({ data: { assign: { id: "t1" } } })),
  };
  return { kabinet, rekuest };
};

const slimReads = (kabinet: ReturnType<typeof clients>["kabinet"]) =>
  kabinet.query.mock.calls.filter(([options]) => (options as { query: unknown }).query === PodLatestLogsDocument).length;

describe("refreshPodLogs", () => {
  it("runs the log action on the pod and waits for the dump its subscription announces", async () => {
    const { kabinet, rekuest } = clients({
      implementations: [candidate("i1", "Refresh Logs")],
      dumps: ["t0"],
      announced: ["t1"],
    });
    await refreshPodLogs({ kabinet: kabinet as never, rekuest: rekuest as never, pod: "p1", intervalMs: 60_000 });
    expect(rekuest.mutate).toHaveBeenCalledTimes(1);
    const sent = rekuest.mutate.mock.calls[0] as unknown as [{ mutation: unknown; variables: { input: Record<string, unknown> } }];
    expect(sent[0].mutation).toBe(AssignDocument);
    expect(sent[0].variables.input).toMatchObject({
      implementation: "i1",
      args: { pod: { __identifier: "@kabinet/pod", object: "p1" } },
    });
    // Listening, not polling: no read of the pod after the first.
    expect(slimReads(kabinet)).toBe(0);
  });

  it("finds a dump the subscription missed with a slim read", async () => {
    const { kabinet, rekuest } = clients({
      implementations: [candidate("i1", "Refresh Logs")],
      dumps: ["t0", "t1"],
    });
    await refreshPodLogs({ kabinet: kabinet as never, rekuest: rekuest as never, pod: "p1", intervalMs: 1 });
    expect(slimReads(kabinet)).toBe(2);
  });

  it("says so when the backend offers no log action, and runs nothing", async () => {
    const { kabinet, rekuest } = clients({ implementations: [candidate("i1", "Restart")], dumps: [null] });
    await expect(
      refreshPodLogs({ kabinet: kabinet as never, rekuest: rekuest as never, pod: "p1", intervalMs: 1 }),
    ).rejects.toThrow("lab does not offer to read a pod's logs");
    expect(rekuest.mutate).not.toHaveBeenCalled();
  });

  it("refuses a disconnected agent and gives up when no dump arrives", async () => {
    const offline = clients({ implementations: [candidate("i1", "Refresh Logs", false)], dumps: [null] });
    await expect(
      refreshPodLogs({ kabinet: offline.kabinet as never, rekuest: offline.rekuest as never, pod: "p1", intervalMs: 1 }),
    ).rejects.toThrow("not connected");

    const silent = clients({ implementations: [candidate("i1", "Refresh Logs")], dumps: ["t0"] });
    await expect(
      refreshPodLogs({ kabinet: silent.kabinet as never, rekuest: silent.rekuest as never, pod: "p1", intervalMs: 1, timeoutMs: 20 }),
    ).rejects.toThrow("has not sent them yet");
  });
});
