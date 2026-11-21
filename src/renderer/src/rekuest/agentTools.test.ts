import { mountedBlokScope } from "@arkitektio/bsx/bsx/index";
import { describe, expect, it, vi } from "vitest";
import { globalRegistry } from "@/core/agent/registry";
import { registerOpenBlokEditor } from "./components/editor/openBlokEditors";
import "./agentTools";

const tool = (name: string) => {
  const entry = globalRegistry.entries.find((candidate) => candidate.name === name);
  if (!entry) throw new Error(`${name} is not registered`);
  return entry;
};

const call = async (name: string, args: Record<string, unknown>) => {
  const answered = { returned: undefined as Record<string, unknown> | undefined, error: undefined as string | undefined };
  await tool(name).func({
    args,
    app: {},
    return: (value: Record<string, unknown>) => (answered.returned = value),
    error: (message: string) => (answered.error = message),
  } as never);
  return answered;
};

const SOURCE = '<Blok kind="custom" context="panel">\n  <Text text="Hello" />\n</Blok>\n';

describe("the blok tools an assistant is offered", () => {
  it("take the blok as a structure, so a replyer finds them by their ports", () => {
    for (const name of ["read_blok", "write_blok"]) {
      expect(tool(name).definition.args?.[0]).toMatchObject({ key: "blok", identifier: "@rekuest/blok" });
    }
  });

  it("read the open editor's draft, with the guide to writing one", async () => {
    const close = registerOpenBlokEditor("7", {
      read: () => ({ name: "Stage", source: SOURCE, scope: mountedBlokScope(["custom"], [], []), agents: "none" }),
      write: () => {},
    });
    const { returned } = await call("read_blok", { blok: "7" });
    close();
    expect(returned?.source).toBe(SOURCE);
    expect(returned?.agents).toBe("none");
    expect(String(returned?.guide)).toContain('<Blok kind="custom" context="panel">');
    expect(String(returned?.guide)).toContain("Button");
  });

  it("write into the editor only what would save, and say why not", async () => {
    const write = vi.fn();
    const close = registerOpenBlokEditor("7", {
      read: () => ({ name: "Stage", source: SOURCE, scope: mountedBlokScope(["custom"], [], []), agents: "none" }),
      write,
    });
    const refused = await call("write_blok", { blok: "7", source: SOURCE.replace('text="Hello"', "text={agents.lamp.light.on}") });
    expect(refused.error).toMatch(/would not save[\s\S]*line 2/);
    expect(write).not.toHaveBeenCalled();

    const next = SOURCE.replace("Hello", "Hi");
    const done = await call("write_blok", { blok: "7", source: next });
    expect(done.error).toBeUndefined();
    expect(write).toHaveBeenCalledWith(next);
    close();

    // Not open: nothing is written behind the person's back.
    expect((await call("write_blok", { blok: "7", source: next })).error).toMatch(/not open in the editor/);
  });

  it("look a component up, or say it does not exist", async () => {
    const { returned } = await call("describe_blok_components", { components: "Button, Nope" });
    expect(String(returned?.reference)).toContain("<Button>");
    expect(String(returned?.reference)).toContain("<Nope> does not exist.");
  });
});
