import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { McpBridgeRequest, McpState } from "./wire";

vi.mock("electron", () => ({ app: { getVersion: () => "9.9.9" } }));
vi.mock("electron-store", () => {
  const values = new Map<string, unknown>();
  return {
    default: class {
      get = (key: string) => values.get(key);
      set = (key: string, value: unknown) => void values.set(key, value);
      delete = (key: string) => void values.delete(key);
    },
  };
});

const { McpService } = await import("./McpService");

const opened: string[] = [];
const revealed: string[] = [];
let claudeInstalled = true;

/** The files of an archive `zipStored` wrote, by path. */
const unzip = (archive: Buffer): Record<string, string> => {
  const files: Record<string, string> = {};
  for (let at = 0; archive.readUInt32LE(at) === 0x04034b50; ) {
    const size = archive.readUInt32LE(at + 18);
    const nameLength = archive.readUInt16LE(at + 26);
    const start = at + 30 + nameLength;
    files[archive.toString("utf8", at + 30, start)] = archive.toString("utf8", start, start + size);
    at = start + size;
  }
  return files;
};

/** The service with a real socket, a fake window, and a bridge that answers `answer`. */
const boot = (answer?: (request: McpBridgeRequest) => unknown) => {
  const handlers = new Map<string, (...args: any[]) => any>();
  const listeners = new Map<string, (...args: any[]) => void>();
  const webContents = { getZoomFactor: () => 1 };
  const window = { isDestroyed: () => false, webContents };
  const transport = {
    handleChannel: (channel: string, handler: (...args: any[]) => any) => void handlers.set(channel, handler),
    onChannel: (channel: string, listener: (...args: any[]) => void) => void listeners.set(channel, listener),
    sendTo: (_contents: unknown, _channel: string, request: McpBridgeRequest) => {
      if (!answer) return;
      queueMicrotask(() =>
        listeners.get("mcp:response")?.({ sender: webContents }, { id: request.id, ok: true, result: answer(request) }),
      );
    },
  };
  const service = new McpService(
    transport as never,
    { getMainWindow: () => window as never },
    // Plain Node stands in for the app's binary run as Node.
    {
      dir: mkdtempSync(join(tmpdir(), "orkestrator-mcp-")),
      execPath: process.execPath,
      openPath: async (path) => (opened.push(path), claudeInstalled ? "" : "No application is associated with the file."),
      showItemInFolder: (path) => void revealed.push(path),
    },
  );
  service.setup();
  const invoke = (channel: string, ...args: unknown[]): Promise<any> => handlers.get(channel)!({}, ...args);
  return { invoke };
};

const rpc = (state: McpState, message: unknown, headers: Record<string, string> = {}) =>
  fetch(state.url!, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${state.token}`, ...headers },
    body: JSON.stringify(message),
  });

let stop: (() => Promise<unknown>) | null = null;
afterEach(async () => {
  await stop?.();
  stop = null;
});

const start = async (answer?: (request: McpBridgeRequest) => unknown) => {
  const { invoke } = boot(answer);
  const state = await invoke("mcp:set-enabled", true);
  stop = () => invoke("mcp:set-enabled", false);
  return { state, invoke };
};

describe("McpService", () => {
  it("is off until switched on, then listens on loopback with a token", async () => {
    const { invoke } = boot();
    expect(await invoke("mcp:get")).toMatchObject({ enabled: false, running: false, url: null });

    const state = await invoke("mcp:set-enabled", true);
    stop = () => invoke("mcp:set-enabled", false);
    expect(state.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/mcp$/);
    expect(state.token).toHaveLength(43);

    expect(await invoke("mcp:set-enabled", false)).toMatchObject({ enabled: false, running: false, url: null });
    await expect(rpc(state, { jsonrpc: "2.0", id: 1, method: "ping" })).rejects.toThrow();
  });

  it("speaks MCP over HTTP: initialize, the tool list, a call answered by the window", async () => {
    const { state } = await start((request) => (request.kind === "context" ? { tabs: [], views: [] } : null));

    const init = await rpc(state, { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
    expect(init.status).toBe(200);
    expect((await init.json()).result).toMatchObject({
      protocolVersion: "2025-06-18",
      serverInfo: { name: "orkestrator", version: "9.9.9" },
    });

    expect((await rpc(state, { jsonrpc: "2.0", method: "notifications/initialized" })).status).toBe(202);

    const list = await (await rpc(state, { jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
    expect(list.result.tools.map((tool: { name: string }) => tool.name)).toEqual(["get_context", "look", "open"]);

    const call = await (
      await rpc(state, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_context", arguments: {} } })
    ).json();
    expect(JSON.parse(call.result.content[0].text)).toEqual({ tabs: [], views: [] });
  });

  it("turns away a request without the token, with the old token, or from a browser", async () => {
    const { state, invoke } = await start();
    const ping = { jsonrpc: "2.0", id: 1, method: "ping" };

    expect((await rpc(state, ping, { Authorization: "Bearer wrong" })).status).toBe(401);
    expect((await rpc(state, ping, { Origin: "https://evil.example" })).status).toBe(403);

    const rotated = await invoke("mcp:rotate-token");
    expect(rotated.token).not.toBe(state.token);
    expect((await rpc(state, ping)).status).toBe(401);
    expect((await rpc(rotated, ping)).status).toBe(200);
  });

  it("refuses a body larger than it reads", async () => {
    const { state } = await start();
    const response = await rpc(state, { jsonrpc: "2.0", id: 1, method: "ping", params: { pad: "x".repeat(1024 * 1024) } });
    expect(response.status).toBe(413);
  });

  /** The bridge as a client would start it; one line in, one line out. */
  const bridge = (state: McpState) => {
    const child = spawn(state.desktop!.command, state.desktop!.args, { env: { ...process.env, ...state.desktop!.env } });
    const lines: ((line: string) => void)[] = [];
    let buffered = "";
    child.stdout.on("data", (chunk: Buffer) => {
      buffered += chunk.toString("utf8");
      for (let at = buffered.indexOf("\n"); at >= 0; at = buffered.indexOf("\n")) {
        lines.shift()?.(buffered.slice(0, at));
        buffered = buffered.slice(at + 1);
      }
    });
    const ask = (message: unknown) =>
      new Promise<any>((resolve) => {
        lines.push((line) => resolve(JSON.parse(line)));
        child.stdin.write(JSON.stringify(message) + "\n");
      });
    return { ask, end: () => child.kill() };
  };

  it("is reachable over stdio through the bridge it writes, across a new token and a switch-off", async () => {
    const { state, invoke } = await start((request) => (request.kind === "context" ? { tabs: [], views: [] } : null));
    expect(state.desktop).toMatchObject({ env: { ELECTRON_RUN_AS_NODE: "1" } });
    const connection = join(state.desktop!.args[0], "..", "connection.json");
    expect(JSON.parse(readFileSync(connection, "utf8"))).toEqual({ url: state.url, token: state.token });

    const { ask, end } = bridge(state);
    try {
      expect((await ask({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })).result.serverInfo.name).toBe("orkestrator");
      const call = await ask({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_context" } });
      expect(JSON.parse(call.result.content[0].text)).toEqual({ tabs: [], views: [] });

      await invoke("mcp:rotate-token");
      expect((await ask({ jsonrpc: "2.0", id: 3, method: "ping" })).result).toEqual({});

      await invoke("mcp:set-enabled", false);
      const down = await ask({ jsonrpc: "2.0", id: 4, method: "ping" });
      expect(down).toMatchObject({ id: 4, error: { code: -32000 } });
      expect(down.error.message).toContain("Orkestrator is not running");
    } finally {
      end();
    }
  });

  it("packs a Claude extension whose bridge reaches the server, and opens it", async () => {
    const { state, invoke } = await start();
    claudeInstalled = true;
    const result = await invoke("mcp:install-in-claude");
    expect(result).toEqual({ opened: true, path: opened.at(-1) });
    expect(result.path).toMatch(/orkestrator\.mcpb$/);

    const files = unzip(readFileSync(result.path));
    const manifest = JSON.parse(files["manifest.json"]);
    expect(manifest).toMatchObject({
      manifest_version: "0.3",
      name: "orkestrator",
      version: "9.9.9",
      author: { name: "Arkitekt" },
      server: { type: "node", entry_point: "server/index.js", mcp_config: { command: "node", args: ["${__dirname}/server/index.js"] } },
    });
    expect(manifest.tools.map((tool: { name: string }) => tool.name)).toEqual(["get_context", "look", "open"]);
    expect(JSON.stringify(manifest)).not.toContain(state.token);

    // Run the bundled bridge from somewhere else, as Claude does, with the manifest's env.
    const elsewhere = join(mkdtempSync(join(tmpdir(), "claude-extension-")), "index.js");
    writeFileSync(elsewhere, files["server/index.js"]);
    const { ask, end } = bridge({ ...state, desktop: { command: process.execPath, args: [elsewhere], env: manifest.server.mcp_config.env } });
    try {
      expect((await ask({ jsonrpc: "2.0", id: 1, method: "ping" })).result).toEqual({});
    } finally {
      end();
    }
  });

  it("shows the bundle in its folder when no app takes it", async () => {
    const { invoke } = await start();
    claudeInstalled = false;
    const result = await invoke("mcp:install-in-claude");
    expect(result.opened).toBe(false);
    expect(revealed.at(-1)).toBe(result.path);
  });
});
