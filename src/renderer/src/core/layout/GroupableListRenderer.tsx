import * as ListLayout from "@/core/ui/list-layout";
import React from "react";

export type GroupMeta = {
  id: string;
  title: React.ReactNode;
  count: number;
};

/**
 * A typed "group by" definition for a list of `T`. Reusable across any
 * `createList`-based list via `GroupableListRenderer` / the `groupBy` prop.
 */
export type GroupByDef<T> = {
  /** Stable option id — also used as the selector's query-state value. */
  key: string;
  /** Human label shown in the "Group by" selector. */
  label: string;
  /** Items sharing a group id are rendered together. */
  getGroupId: (item: T) => string;
  /** The section title for a group, given its id and a representative item. */
  getGroupTitle: (id: string, item: T) => React.ReactNode;
  /** Optional ordering of groups; default keeps first-seen (data) order. */
  compareGroups?: (a: GroupMeta, b: GroupMeta) => number;
};

export type GroupableListRendererProps<T> = {
  items: T[];
  groupBy?: GroupByDef<T>;
  ItemComponent: React.ComponentType<{ item: T } & any>;
  cardProps?: Record<string, any>;
  /** Minimum card width in px; opts the grid out of its default column ladder. */
  minItemWidth?: number;
  /**
   * Opts the list out of the grid entirely, into masonry columns whose tiles are
   * as tall as this ratio makes them (see `MasonryGrid`). `minItemWidth` is
   * meaningless alongside it — the column width is fixed by the masonry.
   *
   * Only for lists whose `ItemComponent` understands a `fill` prop: the tile is
   * sized by its wrapper, so a card carrying its own `aspect-*` fights it.
   */
  aspectOf?: (item: T) => number;
};

type Group<T> = { id: string; title: React.ReactNode; items: T[] };

/**
 * Masonry — fixed-width columns, filled top to bottom, each tile as tall as its
 * own aspect ratio makes it. A page of planes then reads as the pictures it is
 * of, rather than as a grid of identical squares.
 *
 * `columns` and nothing else: CSS multi-column already IS this layout, so there
 * is no measuring, no observer and no JS. Every column comes out the same width
 * (the browser fits as many columns of the stated width as it can and stretches
 * them to fill), the tiles flow down one column before starting the next, and
 * `break-inside-avoid` keeps a card from being sliced across a column boundary.
 *
 * No `autoAnimate` here, unlike `ContainerGrid`: a multi-column container
 * reflows every tile after it whenever one changes, so FLIP-animating that
 * means watching half the page slide between columns on a filter change.
 */
function MasonryGrid<T extends { id?: string | number }>({
  items,
  aspectOf,
  ItemComponent,
  cardProps,
}: {
  items: T[];
  aspectOf: (item: T) => number;
  ItemComponent: React.ComponentType<{ item: T } & any>;
  cardProps?: Record<string, any>;
}) {
  return (
    <div
      className="columns-[15rem] @3xl:columns-[17rem] gap-4"
      data-enableselect="true"
    >
      {items.map((item, index) => (
        <div
          key={item.id ?? index}
          className="mb-4 break-inside-avoid"
          style={{ aspectRatio: aspectOf(item) }}
        >
          <ItemComponent item={item} fill {...cardProps} />
        </div>
      ))}
    </div>
  );
}

/**
 * Renders a list either as a single flat grid (no `groupBy`) or split into
 * titled sections (with `groupBy`). Grouping is client-side over the items it is
 * given — so with a paginated list it groups the currently loaded page.
 */
export function GroupableListRenderer<T extends { id?: string | number }>({
  items,
  groupBy,
  ItemComponent,
  cardProps,
  minItemWidth,
  aspectOf,
}: GroupableListRendererProps<T>) {
  const renderItems = (groupItems: T[]) =>
    aspectOf ? (
      <MasonryGrid
        items={groupItems}
        aspectOf={aspectOf}
        ItemComponent={ItemComponent}
        cardProps={cardProps}
      />
    ) : (
      <ListLayout.Grid minItemWidth={minItemWidth}>
        {groupItems.map((item, index) => (
          <ItemComponent key={item.id ?? index} item={item} {...cardProps} />
        ))}
      </ListLayout.Grid>
    );

  if (!groupBy) {
    return renderItems(items);
  }

  // Reduce into groups, preserving first-seen order (so a createdAt-desc list
  // yields date groups newest-first without extra sorting).
  const order: string[] = [];
  const byId = new Map<string, Group<T>>();
  items.forEach((item) => {
    const id = groupBy.getGroupId(item);
    let group = byId.get(id);
    if (!group) {
      group = { id, title: groupBy.getGroupTitle(id, item), items: [] };
      byId.set(id, group);
      order.push(id);
    }
    group.items.push(item);
  });

  let groups = order.map((id) => byId.get(id)!);
  if (groupBy.compareGroups) {
    const compare = groupBy.compareGroups;
    groups = [...groups].sort((a, b) =>
      compare(
        { id: a.id, title: a.title, count: a.items.length },
        { id: b.id, title: b.title, count: b.items.length },
      ),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          <div className="flex items-center gap-2 ml-1 text-sm font-medium text-muted-foreground">
            <span className="truncate">{group.title}</span>
            <span className="text-xs tabular-nums">{group.items.length}</span>
          </div>
          {renderItems(group.items)}
        </div>
      ))}
    </div>
  );
}

export default GroupableListRenderer;
