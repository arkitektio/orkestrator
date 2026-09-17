// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/dialog", () => ({ useDialog: () => ({}) }));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import { CleanupActionsDocument } from "@/rekuest/api/graphql";
import type { ActionState, Structure } from "../localactions/LocalActionProvider";
import { REKUEST_ACTIONS } from "./actions";

const structure = (
  identifier: string,
  id: string,
  extra: Record<string, unknown> = {},
): Structure => ({ identifier, object: { id, ...extra } }) as Structure;

const makeClient = (cleaned = 1) => ({
  query: vi.fn(async () => ({ data: { action: { id: "1", hash: "fetched-hash" } } })),
  mutate: vi.fn(async () => ({ data: { cleanupActions: cleaned } })),
  cache: { evict: vi.fn(() => true), gc: vi.fn(() => []) },
});

const run = async (
  key: string,
  left: Structure[],
  over: {
    client?: ReturnType<typeof makeClient>;
    confirm?: () => Promise<boolean>;
    ctrlKey?: boolean;
  } = {},
) => {
  const openDialog = vi.fn();
  const client = over.client ?? makeClient();
  const confirm = vi.fn(over.confirm ?? (async () => true));
  await REKUEST_ACTIONS[key].execute({
    state: { left, isCommand: false } as ActionState,
    services: { rekuest: { client } },
    onProgress: () => {},
    abortSignal: new AbortController().signal,
    modifiers: {
      ctrlKey: over.ctrlKey ?? false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
    },
    confirm,
    dialog: { openDialog },
    navigate: () => {},
    location: window.location,
  } as never);
  return { openDialog, client, confirm };
};

const ACTION_KEYS = [
  "rekuest-assign-action",
  "rekuest-create-shortcut-from-action",
  "rekuest-copy-action-hash",
  "rekuest-cleanup-action",
];

describe("@rekuest/action local actions", () => {
  it("apply to a lone action — the condition both the menu and ObjectButton match on", () => {
    for (const key of ACTION_KEYS) {
      expect(REKUEST_ACTIONS[key].conditions).toEqual([
        { type: "identifier", identifier: "@rekuest/action" },
        { type: "nopartner" },
      ]);
    }
  });

  it("Run opens the assign dialog for the action", async () => {
    const { openDialog } = await run("rekuest-assign-action", [
      structure("@rekuest/action", "42"),
    ]);
    expect(openDialog).toHaveBeenCalledWith("actionassign", { id: "42" });
  });

  it("Create Shortcut passes the ACTION id straight to the dialog", async () => {
    const { openDialog, client } = await run(
      "rekuest-create-shortcut-from-action",
      [structure("@rekuest/action", "42")],
    );
    expect(openDialog).toHaveBeenCalledWith("createshortcut", { id: "42" });
    expect(client.query).not.toHaveBeenCalled();
  });

  it("picks the action out of a mixed selection", async () => {
    const { openDialog } = await run("rekuest-assign-action", [
      structure("@rekuest/agent", "7"),
      structure("@rekuest/action", "42"),
    ]);
    expect(openDialog).toHaveBeenCalledWith("actionassign", { id: "42" });
  });
});

describe("Copy Hash", () => {
  const writeText = vi.fn(async () => {});
  beforeEach(() => {
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  it("uses the hash the structure already carries", async () => {
    const { client } = await run("rekuest-copy-action-hash", [
      structure("@rekuest/action", "1", { hash: "carried-hash" }),
    ]);
    expect(writeText).toHaveBeenCalledWith("carried-hash");
    expect(client.query).not.toHaveBeenCalled();
  });

  it("looks the hash up for a bare { id } structure", async () => {
    const { client } = await run("rekuest-copy-action-hash", [
      structure("@rekuest/action", "1"),
    ]);
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith("fetched-hash");
  });
});

describe("Clean Up Action", () => {
  it("does nothing when the confirmation is declined", async () => {
    const { client, confirm } = await run(
      "rekuest-cleanup-action",
      [structure("@rekuest/action", "1")],
      { confirm: async () => false },
    );
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(client.mutate).not.toHaveBeenCalled();
  });

  it("sends only the selected ACTION ids, never other selected types", async () => {
    const { client } = await run("rekuest-cleanup-action", [
      structure("@rekuest/action", "1"),
      structure("@rekuest/agent", "7"),
      structure("@rekuest/action", "2"),
    ]);
    expect(client.mutate).toHaveBeenCalledWith({
      mutation: CleanupActionsDocument,
      variables: { actionIds: ["1", "2"] },
    });
  });

  it("drops the cached action lists only when something was removed", async () => {
    const removed = await run("rekuest-cleanup-action", [
      structure("@rekuest/action", "1"),
    ]);
    expect(removed.client.cache.evict).toHaveBeenCalledWith({
      id: "ROOT_QUERY",
      fieldName: "actions",
    });

    const kept = await run(
      "rekuest-cleanup-action",
      [structure("@rekuest/action", "1")],
      { client: makeClient(0) },
    );
    expect(kept.client.cache.evict).not.toHaveBeenCalled();
  });

  it("skips the dialog when Ctrl is held, like the delete actions", async () => {
    const { confirm, client } = await run(
      "rekuest-cleanup-action",
      [structure("@rekuest/action", "1")],
      { ctrlKey: true },
    );
    expect(confirm).not.toHaveBeenCalled();
    expect(client.mutate).toHaveBeenCalledTimes(1);
  });
});
