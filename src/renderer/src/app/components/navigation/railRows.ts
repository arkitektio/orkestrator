import { type TabRecord } from "@/core/tabs/tabs";

/**
 * The strip's rows, as distinct from its tabs.
 *
 * Usually one and the same. A tab with a partner (`beside`) is the exception:
 * the two are one thing on screen, so they are one row in the strip — the
 * pair side by side, owner left — standing where the owner stands. A partner
 * is listed there, inside every row that owns it, and not again on a row of
 * its own; a tab that owns a partner AND is someone's partner has its own
 * pair row like any owner. Pure, so the translation from a row's index back
 * to the tabs' own is tested without a strip.
 */
export type RailRow = {
  /** The owner's id: a row is a tab, with or without its partner. */
  id: string;
  /** In OWNER, PARTNER order for a pair; otherwise the one tab. */
  tabs: readonly TabRecord[];
};

export const rowsOf = (tabs: readonly TabRecord[]): RailRow[] => {
  const byId = new Map(tabs.map((t) => [t.id, t]));
  const partnerOf = (t: TabRecord) =>
    t.beside && t.beside !== t.id ? byId.get(t.beside) : undefined;
  const partners = new Set(tabs.map((t) => partnerOf(t)?.id).filter(Boolean));

  const rows: RailRow[] = [];
  for (const tab of tabs) {
    const partner = partnerOf(tab);
    if (partner) rows.push({ id: tab.id, tabs: [tab, partner] });
    else if (!partners.has(tab.id)) rows.push({ id: tab.id, tabs: [tab] });
  }
  return rows;
};

/** A row's block, for the strip's grouping: a pair is pinned only when both are. */
export const rowBlock = (row: RailRow): "pinned" | "open" =>
  row.tabs.every((t) => t.pinned) ? "pinned" : "open";

/**
 * The tab move that puts row `id` at row index `to` — `to` as the strip's
 * `SortableList` gives it: the row's index once moved.
 *
 * A row moves by its OWNER: that is the row's place in the tabs' own order
 * (`tabs`), where a partner keeps whatever place it has — it is shown by its
 * owners, not by its position. The index is figured on that order with the
 * owner taken out, as `moveTab` will see it.
 */
export const rowMoves = (
  rows: readonly RailRow[],
  tabs: readonly TabRecord[],
  id: string,
  to: number,
): Array<[id: string, index: number]> => {
  const from = rows.findIndex((r) => r.id === id);
  if (from === -1) return [];
  const rest = rows.filter((_, i) => i !== from);
  // What the row should sit just before, or nothing: the end.
  const anchor = rest[Math.max(0, Math.min(to, rest.length))]?.id ?? null;
  const order = tabs.map((t) => t.id).filter((tabId) => tabId !== id);
  return [[id, anchor ? order.indexOf(anchor) : order.length]];
};
