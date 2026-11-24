import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { useTabId } from "./TabContext";
import { useTabActions } from "./TabsProvider";

/**
 * Give the tab this page is in a glyph: the object the page shows, drawn by
 * its display in the tab strip (a blok's own logo). Beside `useTabTitle`, and
 * like it never cleared on unmount: a tab in the background is frozen (its
 * effects cleaned up) and still shows it. It is kept for the page's pathname,
 * so a tab that navigates elsewhere shows its dot again (`tabGlyphOf`).
 * Outside any tab it is a no-op.
 */
export const useTabGlyph = (structure: { identifier: string; id: string } | null | undefined): void => {
  const tabId = useTabId();
  const { pathname } = useLocation();
  const { setGlyph } = useTabActions();
  const identifier = structure?.identifier;
  const id = structure?.id;

  useEffect(() => {
    if (!tabId || !identifier || !id) return;
    setGlyph(tabId, { identifier, id }, pathname);
  }, [tabId, identifier, id, pathname, setGlyph]);
};
