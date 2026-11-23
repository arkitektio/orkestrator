import { useEffect } from "react";

import { smartRegistry } from "@/core/smart/registry";
import { locationPathOf } from "@/core/tabs/tabs";
import { useActiveTabId, useSplit, useTabActions, useTabList } from "@/core/tabs/TabsProvider";
import { useLatestRef } from "@/core/util/hooks/useLatestRef";

import type { McpBridgeRequest, McpContext, McpRect } from "../../../../main/mcp/wire";
import { McpRefusal, describeTabs, planLook, resolveOpen, visibleViews } from "./context";

/**
 * EXPERIMENTAL: the window's half of the MCP server in main
 * (`src/main/mcp/McpService`). Main asks, over `mcp:request`, what is open,
 * what a picture should show, or to open a tab; this answers from the tab
 * store and the page. It renders nothing and does nothing until main asks,
 * and main only asks while the server is switched on (Settings → Experiments).
 *
 * `privatePaths` are the routes this window never describes or pictures; the
 * app names them, core knows no module.
 */

/** Canvases the page shows right now, in CSS pixels, largest first. */
const viewsOnScreen = (): McpRect[] =>
  visibleViews(
    Array.from(document.querySelectorAll("canvas"))
      // A warm tab keeps its canvas mounted but hidden.
      .filter((canvas) => canvas.checkVisibility?.({ visibilityProperty: true }) ?? true)
      .map((canvas) => {
        const { x, y, width, height } = canvas.getBoundingClientRect();
        return { x, y, width, height };
      }),
    { width: window.innerWidth, height: window.innerHeight },
  );

export const McpBridge = ({ privatePaths }: { privatePaths: readonly string[] }) => {
  const tabs = useTabList();
  const activeId = useActiveTabId();
  const split = useSplit();
  const { open } = useTabActions();
  const latest = useLatestRef({ tabs, activeId, split, open, privatePaths });

  useEffect(() => {
    const mcp = window.api?.mcp;
    if (!mcp) return;

    const answer = (request: McpBridgeRequest): unknown => {
      const { tabs, activeId, split, open, privatePaths } = latest.current;
      const described = () =>
        describeTabs(
          // The path is read now: a tab's record keeps its identity while the page navigates.
          tabs.map((tab) => ({ id: tab.id, label: tab.label, path: locationPathOf(tab) })),
          split ? [split.left, split.right] : [activeId],
          activeId,
          smartRegistry.registeredModels(),
          privatePaths,
        );
      switch (request.kind) {
        case "context": {
          const tabInfo = described();
          const pictured = !tabInfo.some((tab) => tab.shown && tab.private);
          return {
            tabs: tabInfo,
            views: pictured ? viewsOnScreen().map(({ width, height }) => ({ width, height })) : [],
          } satisfies McpContext;
        }
        case "look":
          return planLook(request.target, described(), viewsOnScreen());
        case "open": {
          const path = resolveOpen(request.args, (identifier, id) => smartRegistry.buildModelPath(identifier, id));
          open(path);
          return { path };
        }
      }
    };

    return mcp.onRequest((request) => {
      try {
        mcp.respond({ id: request.id, ok: true, result: answer(request) });
      } catch (error) {
        // A refusal is a sentence written for the model; anything else stays in the console.
        if (!(error instanceof McpRefusal)) console.error("[mcp]", error);
        mcp.respond({
          id: request.id,
          ok: false,
          error: error instanceof McpRefusal ? error.message : "Orkestrator could not answer.",
        });
      }
    });
  }, [latest]);

  return null;
};
