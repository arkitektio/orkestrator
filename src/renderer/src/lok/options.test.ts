// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { LOK_OPTION_SOURCES } from "./options";

const source = (identifier: string) => LOK_OPTION_SOURCES.find((s) => s.identifier === identifier)!;

const client = (data: unknown) => ({ query: vi.fn(async () => ({ data })) }) as never;

describe("lok's option sources", () => {
  it("offers apps by identifier, narrowed by the search", async () => {
    const apps = client({ apps: [{ identifier: "live.arkitekt.napari" }, { identifier: "io.other.tool" }] });
    expect(await source("@lok/app").search(apps, { search: "napari" })).toEqual([
      { value: "live.arkitekt.napari", label: "live.arkitekt.napari" },
    ]);
    expect(await source("@lok/app").search(apps, { values: ["io.other.tool"] })).toHaveLength(1);
  });

  it("offers devices by nodeId, named where they have a name", async () => {
    const devices = client({ devices: [{ nodeId: "n1", name: "scope" }, { nodeId: "n2", name: null }] });
    expect(await source("@lok/device").search(devices, {})).toEqual([
      { value: "n1", label: "scope" },
      { value: "n2", label: "Unnamed device (n2)" },
    ]);
    expect(source("@lok/device").by).toBe("nodeId");
  });

  it("asks lok itself for users (by id), passing search and values through", async () => {
    const users = client({ options: [{ value: "u1", label: "ada" }] });
    expect(await source("@lok/user").search(users, { search: "a", values: ["u1"] })).toEqual([
      { value: "u1", label: "ada" },
    ]);
    expect((users as { query: ReturnType<typeof vi.fn> }).query).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { search: "a", values: ["u1"] } }),
    );
  });
});
