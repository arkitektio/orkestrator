// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

import { REKUEST_OPTION_SOURCES } from "./options";

const agents = REKUEST_OPTION_SOURCES.find((s) => s.identifier === "@rekuest/agent")!;

const client = (data: unknown) => ({ query: vi.fn(async () => ({ data })) });

describe("rekuest's option sources", () => {
  it("offers agents by id and narrows by an input's requires", async () => {
    const answering = client({ options: [{ value: "a1", label: "napari" }] });
    const requires = [{ key: "@rekuest/supervisor", operator: "EQUALS", value: "plugin_engine" }];

    expect(await agents.search(answering as never, { search: "nap", requires })).toEqual([
      { value: "a1", label: "napari" },
    ]);
    expect(answering.query).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { search: "nap", values: undefined, requires } }),
    );
    expect(agents.honoursRequires).toBe(true);
  });

  it("leaves out what was not asked for", async () => {
    const answering = client({ options: [] });
    await agents.search(answering as never, { values: ["a1"], requires: [] });
    expect(answering.query).toHaveBeenCalledWith(
      expect.objectContaining({ variables: { search: undefined, values: ["a1"], requires: undefined } }),
    );
  });
});
