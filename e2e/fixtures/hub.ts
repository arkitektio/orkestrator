import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The self-contained hub the `hub` project runs against, made by konstruktor
 * (`konstruktor hub create --server local`: its own lok, no coordination
 * server). `hub.setup.ts` creates it — or adopts one already up, named by
 * `E2E_HUB_DIR` — and leaves this state file for the tests and the teardown.
 */
export type HubState = {
  dir: string;
  /** The per-run konstruktor registry it was created in; null for an adopted hub. */
  registry: string | null;
  created: boolean;
};

/** `secrets/access.json` of a hub: where it is and who may sign in. */
export type HubAccess = {
  gateway_url: string;
  fakts_url: string;
  hub: string;
  organization: string;
  users: { username: string; password: string }[];
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const STATE_FILE = join(ROOT, "test-results", "e2e-hub.json");

export const writeState = (state: HubState) => {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
};

export const readState = (): HubState | null =>
  existsSync(STATE_FILE) ? (JSON.parse(readFileSync(STATE_FILE, "utf8")) as HubState) : null;

export const readAccess = (dir: string): HubAccess =>
  JSON.parse(readFileSync(join(dir, "secrets", "access.json"), "utf8")) as HubAccess;

/** The konstruktor CLI, from PyPI (`KONSTRUKTOR_VERSION` pins it), or `KONSTRUKTOR_BIN`. */
export const konstruktor = (args: string[], registry: string | null, timeout = 900_000): string => {
  const env = { ...process.env, ...(registry ? { KONSTRUKTOR_DATA_DIR: registry } : {}) };
  const bin = process.env.KONSTRUKTOR_BIN;
  const version = process.env.KONSTRUKTOR_VERSION;
  const [command, prefix] = bin
    ? [bin, []]
    : ["uvx", ["--from", version ? `konstruktor==${version}` : "konstruktor", "konstruktor"]];
  return execFileSync(command, [...prefix, ...args], { env, timeout, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
};
