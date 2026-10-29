import type { Readable, Writable } from "node:stream";
import { MESHD_PROTOCOL, parseMeshdLine, type MeshdCommand, type MeshdEvent, type MeshSidecarState } from "./protocol";

/**
 * The sidecar process and nothing else: spawn it, wait for its `ready` (and
 * refuse one that speaks another protocol), write commands, read events, and
 * stop it. Which nodes it should run is `MeshService`'s business.
 *
 * A child that never announces itself is killed, not left referenced; a
 * child that exits on its own is reported once through `onExit`, while one
 * this class stopped (a kill, a failed start) is not.
 */

export type MeshChild = {
  pid?: number;
  stdin: Writable;
  stdout: Readable;
  stderr?: Readable | null;
  on(event: "exit", listener: (code: number | null) => void): unknown;
  once(event: "exit", listener: (code: number | null) => void): unknown;
  kill(): unknown;
};

export type MeshdProcessDeps = {
  /** `undefined` when this build ships no sidecar for the platform. */
  binaryPath: string | undefined;
  spawn: (binaryPath: string) => MeshChild;
  /** Whether the binary exists; defaults to a stat. */
  exists?: (path: string) => Promise<boolean>;
  log: (message: string) => void;
};

export type MeshdProcessHandlers = {
  onEvent: (event: Exclude<MeshdEvent, { ev: "ready" }>) => void;
  /** The running sidecar exited on its own. */
  onExit: (code: number | null) => void;
};

const READY_TIMEOUT_MS = 15_000;
const KILL_GRACE_MS = 3_000;

export class MeshdProcess {
  state: MeshSidecarState = { state: "idle" };
  private child: MeshChild | undefined;
  private starting: Promise<void> | undefined;

  constructor(
    private readonly deps: MeshdProcessDeps,
    private readonly handlers: MeshdProcessHandlers,
  ) {}

  get running(): boolean {
    return !!this.child && this.state.state === "ready";
  }

  /** Resolves once a sidecar is up and speaks our protocol; rejects with why not. */
  ensure(): Promise<void> {
    if (this.running) return Promise.resolve();
    if (!this.starting) {
      this.starting = this.start().finally(() => {
        this.starting = undefined;
      });
    }
    return this.starting;
  }

  /** False when there is no sidecar to write to. */
  send(command: MeshdCommand): boolean {
    if (!this.child) return false;
    try {
      this.child.stdin.write(`${JSON.stringify(command)}\n`);
      return true;
    } catch (error) {
      this.deps.log(`send ${command.op}: ${error}`);
      return false;
    }
  }

  /** Stop the sidecar; resolves once it exited (or was killed after the grace period). */
  kill(): Promise<void> {
    const child = this.child;
    // With no child there is nothing to stop, and why there is none
    // (unavailable, crashed) stays what the windows see.
    if (!child) return Promise.resolve();
    this.child = undefined;
    this.state = { state: "idle" };
    return stop(child);
  }

  private async start(): Promise<void> {
    const binary = this.deps.binaryPath;
    if (!binary || !(await (this.deps.exists ?? defaultExists)(binary))) {
      this.state = { state: "unavailable", reason: "binary-missing", detail: binary };
      throw new Error("This build does not include the mesh sidecar");
    }
    this.state = { state: "starting" };
    let child: MeshChild;
    try {
      child = this.deps.spawn(binary);
    } catch (error) {
      this.state = { state: "unavailable", reason: "spawn-failed", detail: errorMessage(error) };
      throw error;
    }
    this.child = child;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const fail = (reason: "spawn-failed" | "outdated", error: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.state = { state: "unavailable", reason, detail: error.message };
        if (this.child === child) this.child = undefined;
        void stop(child);
        reject(error);
      };
      const timer = setTimeout(
        () => fail("spawn-failed", new Error("The mesh sidecar did not start in time")),
        READY_TIMEOUT_MS,
      );
      this.wire(child, {
        onReady: (event) => {
          if (settled) return;
          if (event.protocol !== MESHD_PROTOCOL) {
            fail(
              "outdated",
              new Error(
                `The mesh sidecar speaks protocol ${event.protocol ?? 1}, this app ${MESHD_PROTOCOL}; rebuild it (pnpm build:meshd)`,
              ),
            );
            return;
          }
          settled = true;
          clearTimeout(timer);
          this.state = { state: "ready", version: event.version };
          resolve();
        },
        onEarlyExit: (code) => fail("spawn-failed", new Error(`The mesh sidecar exited (code ${code})`)),
        isStarting: () => !settled,
      });
    });
  }

  private wire(
    child: MeshChild,
    start: {
      onReady: (event: Extract<MeshdEvent, { ev: "ready" }>) => void;
      onEarlyExit: (code: number | null) => void;
      isStarting: () => boolean;
    },
  ) {
    let buffer = "";
    child.stdout.setEncoding?.("utf8");
    child.stdout.on("data", (chunk: string | Buffer) => {
      buffer += chunk.toString();
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const event = parseMeshdLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        if (event?.ev === "ready") start.onReady(event);
        else if (event && this.child === child) this.handlers.onEvent(event);
        newline = buffer.indexOf("\n");
      }
    });
    child.stderr?.on("data", (chunk: string | Buffer) => {
      for (const line of chunk.toString().split("\n")) {
        if (line.trim()) this.deps.log(line.trim());
      }
    });
    child.on("exit", (code) => {
      if (start.isStarting()) {
        start.onEarlyExit(code);
        return;
      }
      if (this.child !== child) return;
      this.child = undefined;
      this.state = { state: "crashed", detail: `exit code ${code}` };
      this.handlers.onExit(code);
    });
  }
}

/** Ask a child to shut down (closing stdin tears its nodes down), kill it if it hangs. */
const stop = (child: MeshChild): Promise<void> => {
  const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
  try {
    child.stdin.write(`${JSON.stringify({ op: "shutdown" } satisfies MeshdCommand)}\n`);
    child.stdin.end();
  } catch {
    // Already gone.
  }
  const timer = setTimeout(() => {
    try {
      child.kill();
    } catch {
      // Already gone.
    }
  }, KILL_GRACE_MS);
  child.once("exit", () => clearTimeout(timer));
  // Never wait forever on a process that will not report its exit.
  return Promise.race([exited, new Promise<void>((resolve) => setTimeout(resolve, KILL_GRACE_MS + 1_000))]);
};

const defaultExists = async (path: string): Promise<boolean> => {
  const { access } = await import("node:fs/promises");
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
