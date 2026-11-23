/**
 * What crosses between main's MCP server and the window that answers for it.
 * Types only: the preload's declarations and the renderer's bridge read them.
 */

/** A structure, as every service names an object. */
export type McpStructure = { identifier: string; id: string };

export type McpTabInfo = {
  /** `null` for a tab the app will not describe (mail, bank, …). */
  label: string | null;
  path: string | null;
  /** The object the tab's page is about, when the path is a model's page. */
  structure: McpStructure | null;
  /** On screen right now: the tab in view, or its partner in a split. */
  shown: boolean;
  /** The pane the person last touched. */
  focused: boolean;
  private: boolean;
};

export type McpContext = {
  tabs: McpTabInfo[];
  /** Canvases on screen (a scene, a chart, a plot), largest first, in CSS pixels. */
  views: { width: number; height: number }[];
};

/** A rectangle of the page, in CSS pixels from the viewport's top left. */
export type McpRect = { x: number; y: number; width: number; height: number };

export type McpLookTarget = "view" | "window";

export type McpLookPlan =
  | { refused: string }
  /** `rect: null` = the whole window. `subject` says what the picture shows. */
  | { rect: McpRect | null; subject: string };

export type McpOpenArgs = { path?: string; identifier?: string; id?: string };

export type McpBridgeRequest =
  | { id: string; kind: "context" }
  | { id: string; kind: "look"; target: McpLookTarget }
  | { id: string; kind: "open"; args: McpOpenArgs };

export type McpBridgeResponse =
  | { id: string; ok: true; result: unknown }
  /** `error` is a sentence for the model to read. */
  | { id: string; ok: false; error: string };

export type McpState = {
  enabled: boolean;
  /** Listening right now. */
  running: boolean;
  /** `http://127.0.0.1:<port>/mcp`, while running. */
  url: string | null;
  /** The bearer token a client must present; `null` until first switched on. */
  token: string | null;
  /**
   * How a client that starts its servers as a child process (the Claude
   * desktop app) runs the stdio bridge; `null` when it could not be written.
   */
  desktop: { command: string; args: string[]; env: Record<string, string> } | null;
  /** Why it is on but not running, as a sentence. */
  error: string | null;
};

/**
 * The Claude extension bundle was written to `path`. `opened: false` when no
 * app took the file (Claude is not installed): it is shown in its folder.
 */
export type McpInstallResult = { opened: boolean; path: string };
