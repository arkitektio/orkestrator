// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/core/dialogs/registry", () => ({ useDialog: () => ({}) }));
import { AllowActionDocument, CleanupActionsDocument, RevokeAllowanceDocument } from "@/rekuest/api/graphql";
import type { ActionState, Structure } from "@/core/smart/localactions/LocalActionProvider";
import { REKUEST_ACTIONS } from "./actions";

const structure = (
  identifier: string,
  id: string,
): Structure => ({ identifier, id });

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
    expect(openDialog).toHaveBeenCalledWith("assign", { target: { action: "42" } });
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
    expect(openDialog).toHaveBeenCalledWith("assign", { target: { action: "42" } });
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

  it("asks rekuest for the hash: a structure carries only its id", async () => {
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

describe("Run Without Asking (the auto list)", () => {
  const withRules = (rules: { id: string; askerKey: string | null }[]) => {
    const client = makeClient();
    client.query.mockResolvedValue({ data: { myAllowances: rules } } as never);
    return Object.assign(client, { refetchQueries: vi.fn(async () => []) });
  };

  it("applies to a lone action, like the other action entries", () => {
    expect(REKUEST_ACTIONS["rekuest-auto-list-action"].conditions).toEqual([
      { type: "identifier", identifier: "@rekuest/action" },
      { type: "nopartner" },
    ]);
  });

  it("allows an action that still asks, for whoever asks", async () => {
    const client = withRules([{ id: "7", askerKey: "workflow" }]);
    await run("rekuest-auto-list-action", [structure("@rekuest/action", "42")], { client });
    expect(client.mutate).toHaveBeenCalledTimes(1);
    expect(client.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ mutation: AllowActionDocument, variables: { input: { action: "42" } } }),
    );
  });

  it("takes every rule for it off once it is allowed for whoever asks", async () => {
    const client = withRules([
      { id: "7", askerKey: "workflow" },
      { id: "8", askerKey: null },
    ]);
    await run("rekuest-auto-list-action", [structure("@rekuest/action", "42")], { client });
    expect(client.mutate.mock.calls.map(([options]) => (options as { mutation: unknown; variables: unknown }))).toEqual([
      expect.objectContaining({ mutation: RevokeAllowanceDocument, variables: { input: { id: "7" } } }),
      expect.objectContaining({ mutation: RevokeAllowanceDocument, variables: { input: { id: "8" } } }),
    ]);
    expect(client.refetchQueries).toHaveBeenCalled();
  });
});
