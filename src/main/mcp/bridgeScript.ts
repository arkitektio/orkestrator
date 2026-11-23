/**
 * The stdio half, for clients that only start local MCP servers as a child
 * process (the Claude desktop app): a script that carries each JSON-RPC line
 * from stdin to the server in the running app and the answer back to stdout.
 *
 * Main writes it next to `connection.json` (the server's address and token)
 * when the server is switched on. The client runs it with THIS app's binary
 * as Node (`ELECTRON_RUN_AS_NODE=1`), so nobody needs Node installed and no
 * second app starts. It reads `connection.json` on every message: a new
 * token, another port or a restarted app need no change on the client's side.
 *
 * Source as a string because it runs outside the bundle. Plain CommonJS, no
 * dependencies; `McpService.test.ts` runs it for real.
 */
export const BRIDGE_FILE = "bridge.cjs";
export const CONNECTION_FILE = "connection.json";
/** Where `connection.json` is, for a copy of the bridge that does not sit next to it (`./extension`). */
export const CONNECTION_ENV = "ORKESTRATOR_MCP_CONNECTION";

export const BRIDGE_SOURCE = `"use strict";
// Written by Orkestrator (Settings → Experiments). Changes are overwritten.
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { createInterface } = require("node:readline");

const DOWN = "Orkestrator is not running, or assistant access is switched off in it (Settings → Experiments).";
const CONNECTION = process.env.${CONNECTION_ENV} || join(__dirname, "${CONNECTION_FILE}");
const write = (message) => process.stdout.write(JSON.stringify(message) + "\\n");

async function forward(line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  try {
    const { url, token } = JSON.parse(readFileSync(CONNECTION, "utf8"));
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: line,
    });
    if (response.status === 202) return;
    if (response.status !== 200) throw new Error("refused");
    write(await response.json());
  } catch {
    // Only a request is owed an answer.
    for (const one of Array.isArray(message) ? message : [message]) {
      if (one && one.method && one.id !== undefined && one.id !== null) {
        write({ jsonrpc: "2.0", id: one.id, error: { code: -32000, message: DOWN } });
      }
    }
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  if (line.trim()) void forward(line);
});
`;
