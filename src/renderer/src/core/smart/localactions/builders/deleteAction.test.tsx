// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/dialogs/registry", () => ({ useDialog: () => ({}) }));

import type { ActionState, Structure } from "../LocalActionProvider";
import { buildDeleteAction } from "./deleteAction";

const structure = (identifier: string, id: string): Structure =>
  ({ identifier, id }) as Structure;

const makeClient = (
  mutate: (options: { variables: { id: string } }) => Promise<unknown>,
) => {
  const evicted: string[] = [];
  return {
    evicted,
    client: {
      mutate: vi.fn(mutate),
      cache: {
        identify: ({ __typename, id }: { __typename: string; id: string }) =>
          `${__typename}:${id}`,
        evict: vi.fn(({ id }: { id: string }) => {
          evicted.push(id);
          return true;
        }),
        gc: vi.fn(() => []),
      },
    },
  };
};

const run = async (
  action: ReturnType<typeof buildDeleteAction>,
  service: { client: unknown },
  state: ActionState,
) =>
  action.execute({
    state,
    services: { mikro: service },
    onProgress: () => {},
    abortSignal: new AbortController().signal,
    // Ctrl skips the confirmation dialog.
    modifiers: { ctrlKey: true, shiftKey: false, altKey: false, metaKey: false },
    confirm: async () => true,
    dialog: {},
    navigate: () => {},
    location: window.location,
  } as never);

const deleteScenes = buildDeleteAction({
  title: "Delete Scene",
  identifier: "@mikro/scene",
  service: "mikro" as never,
  typename: "Scene",
  mutation: {} as never,
});

describe("buildDeleteAction — multi selection", () => {
  it("deletes every selected structure, not just the first", async () => {
    const service = makeClient(async () => ({ data: {} }));

    await run(deleteScenes, service, {
      left: [
        structure("@mikro/scene", "1"),
        structure("@mikro/scene", "2"),
        structure("@mikro/scene", "3"),
      ],
      isCommand: false,
    });

    expect(service.client.mutate).toHaveBeenCalledTimes(3);
    expect(service.evicted).toEqual(["Scene:1", "Scene:2", "Scene:3"]);
  });

  it("keeps deleting after one item fails and reports the failure", async () => {
    const service = makeClient(async ({ variables }) => {
      if (variables.id === "2") {
        throw new Error("boom");
      }
      return { data: {} };
    });

    await expect(
      run(deleteScenes, service, {
        left: [
          structure("@mikro/scene", "1"),
          structure("@mikro/scene", "2"),
          structure("@mikro/scene", "3"),
        ],
        isCommand: false,
      }),
    ).rejects.toThrow(/2 of 3/);

    expect(service.client.mutate).toHaveBeenCalledTimes(3);
    expect(service.evicted).toEqual(["Scene:1", "Scene:3"]);
  });

  it("ignores structures of other identifiers in a mixed selection", async () => {
    const service = makeClient(async () => ({ data: {} }));

    await run(deleteScenes, service, {
      left: [
        structure("@mikro/scene", "1"),
        structure("@mikro/folder", "9"),
        structure("@mikro/scene", "2"),
      ],
      isCommand: false,
    });

    expect(service.client.mutate).toHaveBeenCalledTimes(2);
    expect(service.evicted).toEqual(["Scene:1", "Scene:2"]);
  });
});

describe("buildDeleteAction — preflight", () => {
  const summary = (over: Partial<import("./deleteAction").DeletePreflightSummary> = {}) => ({
    blockers: [],
    casualtyCount: 0,
    description: "",
    truncated: false,
    skipIds: [],
    casualtyKeys: [],
    ...over,
  });
  const withPreflight = (result: ReturnType<typeof summary>) =>
    buildDeleteAction({
      title: "Delete Dataset",
      identifier: "@mikro/arraydataset",
      service: "mikro" as never,
      typename: "ArrayDataset",
      mutation: {} as never,
      preflight: async () => result,
    });
  const runWith = (action: ReturnType<typeof buildDeleteAction>, service: { client: unknown }, confirm: () => Promise<boolean>, ids: string[]) =>
    action.execute({
      state: { left: ids.map((id) => structure("@mikro/arraydataset", id)), isCommand: false },
      services: { mikro: service },
      onProgress: () => {},
      abortSignal: new AbortController().signal,
      modifiers: { ctrlKey: true, shiftKey: false, altKey: false, metaKey: false },
      confirm,
      dialog: {},
      navigate: () => {},
      location: window.location,
    } as never);

  it("asks even with Ctrl when something goes along, and cascades", async () => {
    const service = makeClient(async () => ({ data: {} }));
    const confirm = vi.fn(async () => true);
    await runWith(withPreflight(summary({ casualtyCount: 2, description: "This also deletes 2 things" })), service, confirm, ["1"]);

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ description: expect.stringContaining("This also deletes 2 things"), confirmLabel: "Delete all 3" }));
    expect(service.client.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: "1", cascade: true } }));
  });

  it("deletes nothing when the user keeps it", async () => {
    const service = makeClient(async () => ({ data: {} }));
    await runWith(withPreflight(summary({ casualtyCount: 1, description: "x" })), service, async () => false, ["1"]);
    expect(service.client.mutate).not.toHaveBeenCalled();
  });

  it("refuses before any dialog when something blocks", async () => {
    const service = makeClient(async () => ({ data: {} }));
    const confirm = vi.fn(async () => true);
    await expect(runWith(withPreflight(summary({ blockers: ["Only the creator can delete this"] })), service, confirm, ["1"])).rejects.toThrow("Only the creator");
    expect(confirm).not.toHaveBeenCalled();
    expect(service.client.mutate).not.toHaveBeenCalled();
  });

  it("skips a target another target's cascade takes along", async () => {
    const service = makeClient(async () => ({ data: {} }));
    await runWith(withPreflight(summary({ casualtyCount: 1, description: "x", skipIds: ["2"] })), service, async () => true, ["1", "2"]);
    expect(service.client.mutate).toHaveBeenCalledTimes(1);
    expect(service.client.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: "1", cascade: true } }));
  });

  it("is the plain delete when nothing was made from it", async () => {
    const service = makeClient(async () => ({ data: {} }));
    await runWith(withPreflight(summary()), service, async () => true, ["1"]);
    expect(service.client.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: "1" } }));
  });
});
