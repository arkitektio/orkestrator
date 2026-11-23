/**
 * The Model Context Protocol, as much of it as this app speaks: tools over
 * the "Streamable HTTP" transport, answered as plain JSON (no SSE stream, no
 * session). Hand-written instead of the SDK because that is five methods.
 *
 * Pure: no electron, no http. `McpService` owns the socket and the tools.
 *
 * EXPERIMENTAL, and probably not a good idea: see `McpService`.
 */

/** Newest first. The parts used here are the same in all of them. */
export const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"] as const;

export type McpContent =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

export type McpToolResult = { content: McpContent[]; isError?: boolean };

export type McpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Looks only; changes nothing in the app or on the server. */
  readOnly: boolean;
  call: (args: Record<string, unknown>) => Promise<McpToolResult>;
};

export type McpServerInfo = { name: string; title: string; version: string; instructions: string };

type JsonRpcId = string | number;
type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId | null; result: unknown }
  | { jsonrpc: "2.0"; id: JsonRpcId | null; error: { code: number; message: string } };

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const failure = (id: JsonRpcId | null, code: number, message: string): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

export const textResult = (text: string): McpToolResult => ({ content: [{ type: "text", text }] });

/** A tool that could not do what was asked: the model reads the reason and may try something else. */
export const errorResult = (text: string): McpToolResult => ({ ...textResult(text), isError: true });

/** The version to answer `initialize` with: the client's when we speak it, else our newest. */
export const negotiateVersion = (requested: unknown): string =>
  (PROTOCOL_VERSIONS as readonly string[]).includes(requested as string)
    ? (requested as string)
    : PROTOCOL_VERSIONS[0];

/**
 * One JSON-RPC message in, its response out; `null` for what takes no answer
 * (a notification, or a response to something we never asked).
 */
export async function handleMessage(
  message: unknown,
  info: McpServerInfo,
  tools: readonly McpTool[],
): Promise<JsonRpcResponse | null> {
  if (!isRecord(message) || message.jsonrpc !== "2.0") {
    return failure(null, INVALID_REQUEST, "Not a JSON-RPC 2.0 message.");
  }
  const { id, method } = message;
  const hasId = typeof id === "string" || typeof id === "number";
  if (typeof method !== "string") {
    return hasId && ("result" in message || "error" in message)
      ? null
      : failure(hasId ? id : null, INVALID_REQUEST, "The message names no method.");
  }
  if (!hasId) return null;

  const params = isRecord(message.params) ? message.params : {};
  const ok = (result: unknown): JsonRpcResponse => ({ jsonrpc: "2.0", id, result });

  switch (method) {
    case "initialize":
      return ok({
        protocolVersion: negotiateVersion(params.protocolVersion),
        capabilities: { tools: {} },
        serverInfo: { name: info.name, title: info.title, version: info.version },
        instructions: info.instructions,
      });
    case "ping":
      return ok({});
    case "tools/list":
      return ok({
        tools: tools.map((tool) => ({
          name: tool.name,
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
          annotations: { title: tool.title, readOnlyHint: tool.readOnly, openWorldHint: false },
        })),
      });
    case "tools/call": {
      const tool = tools.find((candidate) => candidate.name === params.name);
      if (!tool) return failure(id, INVALID_PARAMS, `There is no tool called ${JSON.stringify(params.name)}.`);
      try {
        return ok(await tool.call(isRecord(params.arguments) ? params.arguments : {}));
      } catch (error) {
        // A tool's own failure is a result the model can read, not a protocol error.
        return ok(errorResult(error instanceof Error ? error.message : "The tool failed."));
      }
    }
    default:
      return failure(id, METHOD_NOT_FOUND, `This server does not answer ${JSON.stringify(method)}.`);
  }
}

/**
 * A POST body in, the body to answer with out; `null` = nothing to say
 * (HTTP 202). A batch is answered as a batch (2025-03-26 clients send them).
 */
export async function handleBody(
  body: string,
  info: McpServerInfo,
  tools: readonly McpTool[],
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return failure(null, PARSE_ERROR, "The body is not JSON.");
  }
  if (!Array.isArray(parsed)) return handleMessage(parsed, info, tools);
  if (parsed.length === 0) return failure(null, INVALID_REQUEST, "An empty batch.");
  const answers = (await Promise.all(parsed.map((message) => handleMessage(message, info, tools)))).filter(
    (answer): answer is JsonRpcResponse => answer !== null,
  );
  return answers.length > 0 ? answers : null;
}

export type RequestHead = {
  method: string | undefined;
  path: string;
  host: string | undefined;
  origin: string | undefined;
  authorization: string | undefined;
};

export type Refusal = { status: number; reason: string };

/**
 * Who may talk to the server: `null` lets the request through.
 *
 * The socket is loopback only, which keeps other computers out but not a web
 * page in this computer's browser. So: no request that carries an `Origin`
 * (a browser's; MCP clients send none), only our own `Host` (a rebound DNS
 * name arrives with its own), and the token on every request. `sameToken`
 * compares in constant time (the caller has `crypto`).
 */
export function refuse(
  head: RequestHead,
  port: number,
  sameToken: (presented: string) => boolean,
): Refusal | null {
  if (head.origin !== undefined) return { status: 403, reason: "Browsers may not call this server." };
  if (head.host !== `127.0.0.1:${port}` && head.host !== `localhost:${port}`) {
    return { status: 403, reason: "Unknown host." };
  }
  if (head.path !== "/mcp") return { status: 404, reason: "The server is at /mcp." };
  const presented = /^Bearer (.+)$/.exec(head.authorization ?? "")?.[1];
  if (!presented || !sameToken(presented)) return { status: 401, reason: "A valid token is required." };
  // No stream to open (GET) and no session to end (DELETE).
  if (head.method !== "POST") return { status: 405, reason: "Only POST." };
  return null;
}
