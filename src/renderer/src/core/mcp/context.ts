import type {
  McpLookPlan,
  McpLookTarget,
  McpOpenArgs,
  McpRect,
  McpStructure,
  McpTabInfo,
} from "../../../../main/mcp/wire";

/**
 * What the window tells main's MCP server (`src/main/mcp/McpService`), as
 * pure functions over what the bridge gathered. EXPERIMENTAL.
 *
 * The window, not main, decides what may be said: a tab on a private page is
 * listed without its label or path, and nothing is pictured while one is on
 * screen.
 */

/** Something the bridge will not or cannot do, said as a sentence the model reads. */
export class McpRefusal extends Error {}

/** A model's list route, as the smart registry holds it (`mikro/images`). */
export type PathModel = { identifier: string; path: string };

export type TabFacts = { id: string; label: string; path: string };

const pathnameOf = (path: string) => path.split(/[?#]/)[0];

/** The object a path is the page of: `/mikro/images/5` → `@mikro/image` 5. */
export const structureAtPath = (path: string, models: readonly PathModel[]): McpStructure | null => {
  const pathname = pathnameOf(path);
  for (const model of models) {
    const prefix = `/${model.path.replace(/^\/+|\/+$/g, "")}/`;
    if (!pathname.startsWith(prefix)) continue;
    const id = pathname.slice(prefix.length);
    if (id && !id.includes("/")) return { identifier: model.identifier, id: decodeURIComponent(id) };
  }
  return null;
};

export const isPrivatePath = (path: string, privatePaths: readonly string[]): boolean => {
  const pathname = pathnameOf(path);
  return privatePaths.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
};

export const describeTabs = (
  tabs: readonly TabFacts[],
  shownIds: readonly string[],
  focusedId: string,
  models: readonly PathModel[],
  privatePaths: readonly string[],
): McpTabInfo[] =>
  tabs.map((tab) => {
    const hidden = isPrivatePath(tab.path, privatePaths);
    return {
      label: hidden ? null : tab.label,
      path: hidden ? null : tab.path,
      structure: hidden ? null : structureAtPath(tab.path, models),
      shown: shownIds.includes(tab.id),
      focused: tab.id === focusedId,
      private: hidden,
    };
  });

/** Too small to be what anyone means by "the view": an icon, a sparkline. */
const MIN_VIEW_EDGE = 64;

/** The part of each rectangle inside the viewport, largest first; slivers dropped. */
export const visibleViews = (rects: readonly McpRect[], viewport: { width: number; height: number }): McpRect[] =>
  rects
    .map((rect) => {
      const x = Math.max(0, rect.x);
      const y = Math.max(0, rect.y);
      return {
        x,
        y,
        width: Math.min(viewport.width, rect.x + rect.width) - x,
        height: Math.min(viewport.height, rect.y + rect.height) - y,
      };
    })
    .filter((rect) => rect.width >= MIN_VIEW_EDGE && rect.height >= MIN_VIEW_EDGE)
    .sort((a, b) => b.width * b.height - a.width * a.height);

export const planLook = (target: McpLookTarget, tabs: readonly McpTabInfo[], views: readonly McpRect[]): McpLookPlan => {
  const shown = tabs.filter((tab) => tab.shown);
  if (shown.some((tab) => tab.private)) {
    return { refused: "A private page is on screen, and Orkestrator does not picture those." };
  }
  const where = shown.map((tab) => `"${tab.label}" (${tab.path})`).join(" beside ") || "Orkestrator";
  if (target === "view") {
    const view = views[0];
    if (view) return { rect: view, subject: `The largest canvas on ${where}` };
    return { rect: null, subject: `No canvas is on screen, so this is the whole window, showing ${where}` };
  }
  return { rect: null, subject: `The Orkestrator window, showing ${where}` };
};

/** As long as a deep link may be (`MAX_DEEP_LINK_LENGTH` in main). */
const MAX_PATH_LENGTH = 4096;

/**
 * The app path an `open` call means. Throws a sentence the model can read.
 * A path is taken as a deep link is: a route of this app and nothing else.
 */
export const resolveOpen = (
  args: McpOpenArgs,
  buildModelPath: (identifier: string, id: string) => string | undefined,
): string => {
  if (args.path !== undefined) {
    const path = args.path.trim();
    if (!path.startsWith("/") || path.startsWith("//") || path.length > MAX_PATH_LENGTH) {
      throw new McpRefusal("A path must be an app path such as /mikro/images/5.");
    }
    return path;
  }
  if (!args.identifier || !args.id) throw new McpRefusal("Say what to open: identifier and id, or a path.");
  const path = buildModelPath(args.identifier, encodeURIComponent(args.id));
  if (!path) throw new McpRefusal(`This app has no page for ${args.identifier}.`);
  return path.startsWith("/") ? path : `/${path}`;
};
