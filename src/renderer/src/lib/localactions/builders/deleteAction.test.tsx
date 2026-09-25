// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/dialog", () => ({ useDialog: () => ({}) }));

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
