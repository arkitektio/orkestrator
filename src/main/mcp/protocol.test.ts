import { describe, expect, it, vi } from "vitest";

import { errorResult, handleBody, negotiateVersion, refuse, textResult, type McpTool, type RequestHead } from "./protocol";

const info = { name: "orkestrator", title: "Orkestrator", version: "1.2.3", instructions: "Be careful." };

const tool = (over: Partial<McpTool> = {}): McpTool => ({
  name: "look",
  title: "Look",
  description: "A picture.",
  inputSchema: { type: "object" },
  readOnly: true,
  call: async () => textResult("seen"),
  ...over,
});

const post = (message: unknown, tools: McpTool[] = [tool()]) => handleBody(JSON.stringify(message), info, tools);

describe("handleBody", () => {
  it("answers initialize with the client's version when it speaks it", async () => {
    const answer = await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } });
    expect(answer).toEqual({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "orkestrator", title: "Orkestrator", version: "1.2.3" },
        instructions: "Be careful.",
      },
    });
  });

  it("offers its newest version to a client from the future", () => {
    expect(negotiateVersion("2099-01-01")).toBe("2025-11-25");
    expect(negotiateVersion(undefined)).toBe("2025-11-25");
  });

  it("says nothing to a notification", async () => {
    expect(await post({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });

  it("lists tools with their read-only hint and never their function", async () => {
    const answer = await post({ jsonrpc: "2.0", id: "a", method: "tools/list" });
    expect(answer).toEqual({
      jsonrpc: "2.0",
      id: "a",
      result: {
        tools: [
          {
            name: "look",
            title: "Look",
            description: "A picture.",
            inputSchema: { type: "object" },
            annotations: { title: "Look", readOnlyHint: true, openWorldHint: false },
          },
        ],
      },
    });
  });

  it("calls a tool with its arguments", async () => {
    const call = vi.fn(async () => textResult("seen"));
    const answer = await post(
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "look", arguments: { target: "window" } } },
      [tool({ call })],
    );
    expect(call).toHaveBeenCalledWith({ target: "window" });
    expect(answer).toMatchObject({ id: 2, result: { content: [{ type: "text", text: "seen" }] } });
  });

  it("turns a tool that throws into a result the model can read", async () => {
    const answer = await post({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "look" } }, [
      tool({
        call: async () => {
          throw new Error("Orkestrator has no window open.");
        },
      }),
    ]);
    expect(answer).toMatchObject({ id: 3, result: errorResult("Orkestrator has no window open.") });
  });

  it("refuses a tool and a method it does not have", async () => {
    expect(await post({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "delete_everything" } })).toMatchObject({
      id: 4,
      error: { code: -32602 },
    });
    expect(await post({ jsonrpc: "2.0", id: 5, method: "resources/list" })).toMatchObject({ id: 5, error: { code: -32601 } });
  });

  it("reports a body that is not JSON, and one that is not JSON-RPC", async () => {
    expect(await handleBody("{", info, [])).toMatchObject({ id: null, error: { code: -32700 } });
    expect(await post({ id: 1, method: "ping" })).toMatchObject({ id: null, error: { code: -32600 } });
  });

  it("answers a batch with only what takes an answer", async () => {
    const answer = await post([
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 9, method: "ping" },
    ]);
    expect(answer).toEqual([{ jsonrpc: "2.0", id: 9, result: {} }]);
    expect(await post([{ jsonrpc: "2.0", method: "notifications/initialized" }])).toBeNull();
  });
});

describe("refuse", () => {
  const head = (over: Partial<RequestHead> = {}): RequestHead => ({
    method: "POST",
    path: "/mcp",
    host: "127.0.0.1:41750",
    origin: undefined,
    authorization: "Bearer secret",
    ...over,
  });
  const sameToken = (presented: string) => presented === "secret";
  const verdict = (over: Partial<RequestHead> = {}) => refuse(head(over), 41750, sameToken)?.status ?? null;

  it("lets a local client with the token through", () => {
    expect(verdict()).toBeNull();
    expect(verdict({ host: "localhost:41750" })).toBeNull();
  });

  it("refuses a browser, whatever else it presents", () => {
    expect(verdict({ origin: "https://evil.example" })).toBe(403);
    expect(verdict({ origin: "null" })).toBe(403);
  });

  it("refuses a rebound host name and another port", () => {
    expect(verdict({ host: "evil.example:41750" })).toBe(403);
    expect(verdict({ host: "127.0.0.1:1" })).toBe(403);
    expect(verdict({ host: undefined })).toBe(403);
  });

  it("refuses a missing or wrong token", () => {
    expect(verdict({ authorization: undefined })).toBe(401);
    expect(verdict({ authorization: "Bearer nope" })).toBe(401);
    expect(verdict({ authorization: "secret" })).toBe(401);
  });

  it("answers only POST at /mcp, and only says so to a client with the token", () => {
    expect(verdict({ method: "GET" })).toBe(405);
    expect(verdict({ path: "/" })).toBe(404);
    expect(verdict({ method: "GET", authorization: undefined })).toBe(401);
  });
});
