import React from "react";
import { createPortal } from "react-dom";
import { RoleGuard } from "@/core/connection/roles";
import { useSmartPins } from "./pins";
import { RowPinProvider, RowScopeProvider, usePinnedSlot, type RowPin } from "./rowPin";
import type {
  SectionPins,
  SmartContextSection,
  SmartSectionContext,
  SmartSectionId,
} from "./section";
import { useReportSectionStatus } from "./sectionStatusContext";
import { useNarrowedRows } from "./useNarrowedRows";
import { useSmartMenuSkinOverride } from "./skin";
import { LIST_SKIN } from "./skins/list";
import type { RelatedContext } from "./types";

export { SectionHeading } from "./skins/list";

/**
 * Mounts one section of the menu.
 *
 * The host owns everything a section used to repeat: the module guard (from
 * the outside, so the query never mounts before the backend is ready), the
 * group heading, the "render nothing when empty" rule, the error line, the
 * instant narrowing of rows while the server search is in flight, and the
 * status report the menu's progress bar and empty line are derived from, and
 * the pins: every row is told whether it is pinned, and the pinned ones move
 * to the "Pinned" group at the start of the menu. A section is left with its
 * query and its row. How the group and its rows LOOK is the menu's skin
 * (`skin.tsx`).
 *
 * With a `scope` it is the section's mount for one of the page's related
 * contexts (`context.objects` is then that context's): headed with its label,
 * its rows' values scoped by its key, and its status reported apart.
 */
export const SectionHost = <T,>({
  section,
  context,
  scope,
}: {
  section: SmartContextSection<T>;
  context: SmartSectionContext;
  scope?: RelatedContext;
}) => {
  const statusId = scope ? (`${section.id}@${scope.key}` as SmartSectionId) : section.id;
  const skipped = <SectionSkipped id={statusId} />;
  const body = (
    <SectionBody section={section} context={context} scope={scope} statusId={statusId} />
  );
  const guarded = section.Guard ? <section.Guard fallback={skipped}>{body}</section.Guard> : body;
  if (section.roles === undefined) return guarded;
  return (
    <RoleGuard require={section.roles} fallback={skipped}>
      {guarded}
    </RoleGuard>
  );
};

/** A section's search-bar buttons, behind the same guard and roles as its rows. */
export const SectionSearchBar = ({
  section,
  context,
}: {
  section: SmartContextSection<any>;
  context: SmartSectionContext;
}) => {
  if (!section.SearchBar) return null;
  const body = <section.SearchBar context={context} />;
  const guarded = section.Guard ? <section.Guard fallback={null}>{body}</section.Guard> : body;
  if (section.roles === undefined) return guarded;
  return (
    <RoleGuard require={section.roles} fallback={null}>
      {guarded}
    </RoleGuard>
  );
};

/** The guard is not ready: say so, or the menu would wait for this forever. */
const SectionSkipped = ({ id }: { id: SmartSectionId }) => {
  useReportSectionStatus(id, { status: "skipped", count: 0, revision: 0 });
  return null;
};

/** A counter that moves when `value` changes identity. */
const useRevision = (value: unknown): number => {
  const ref = React.useRef({ value, revision: 0 });
  if (ref.current.value !== value) {
    ref.current = { value, revision: ref.current.revision + 1 };
  }
  return ref.current.revision;
};

/**
 * The rows of a section that folds the related contexts into its one query
 * (`related.mode: "or"`) that belong to THIS mount: a related mount keeps what
 * is routed to its identifier, the page's own mount drops only what is routed
 * to a related one (an unrouted row stays the page's).
 */
const useRoutedItems = <T,>(
  section: SmartContextSection<T>,
  context: SmartSectionContext,
  items: readonly T[] | undefined,
): readonly T[] | undefined => {
  const routeOf =
    section.related?.mode === "or" && (context.related?.length ?? 0) > 0
      ? section.related.routeOf
      : undefined;
  const own = context.objects[0]?.identifier;
  const isRelatedMount = context.primary !== undefined;
  const relatedKey = (context.related ?? [])
    .map((related) => related.objects[0]?.identifier ?? "")
    .join("|");
  return React.useMemo(() => {
    if (!routeOf || !items) return items;
    if (isRelatedMount) return items.filter((item) => routeOf(item) === own);
    const elsewhere = new Set(relatedKey.split("|").filter((id) => id && id !== own));
    return items.filter((item) => {
      const route = routeOf(item);
      return route === undefined || !elsewhere.has(route);
    });
  }, [routeOf, items, own, isRelatedMount, relatedKey]);
};

const SectionBody = <T,>({
  section,
  context,
  scope,
  statusId,
}: {
  section: SmartContextSection<T>;
  context: SmartSectionContext;
  scope?: RelatedContext;
  statusId: SmartSectionId;
}) => {
  const raw = section.useItems(context);
  const items = useRoutedItems(section, context, raw.items);
  const result = { ...raw, items };
  const narrowed = useNarrowedRows({
    rows: result.items,
    serverFilter: context.filter,
    liveFilter: context.liveFilter,
    status: result.status,
    partsOf: section.searchParts ?? untouched,
  });
  const rows = section.searchParts ? narrowed : result.items;
  const revision = useRevision(result.items);
  useReportSectionStatus(statusId, {
    status: result.status,
    count: rows?.length ?? 0,
    revision,
  });

  const usePins = section.usePins ?? useSmartPins;
  const pins = usePins(section.id);
  const slot = usePinnedSlot();
  const Group = (useSmartMenuSkinOverride() ?? LIST_SKIN).Group;
  const title = scope ? (
    <>
      {scope.label} · {section.title}
    </>
  ) : (
    section.title
  );

  if (!rows || rows.length === 0) {
    return result.status === "error" ? <SectionErrorRow title={title} /> : null;
  }

  const pinned = rows
    .filter((item) => pins.isPinned(section.itemKey(item)))
    .sort((a, b) => positionOf(pins, section.itemKey(a)) - positionOf(pins, section.itemKey(b)));
  const unpinned = rows.filter((item) => !pins.isPinned(section.itemKey(item)));

  const renderRow = (item: T) => {
    const key = section.itemKey(item);
    return (
      <PinnedRow key={key} itemKey={key} pins={pins}>
        <section.Row item={item} context={context} />
      </PinnedRow>
    );
  };

  // Without a slot (the palette) the top of the section's own group is the
  // only place a pin can show.
  const listed = slot === undefined ? [...pinned, ...unpinned] : unpinned;

  return (
    <RowScopeProvider value={scope?.key ?? null}>
      {slot ? createPortal(pinned.map(renderRow), slot) : null}
      {listed.length > 0 ? (
        <Group heading={title} icon={section.icon}>
          {listed.map(renderRow)}
        </Group>
      ) : null}
    </RowScopeProvider>
  );
};

const positionOf = (pins: SectionPins, itemKey: string) => pins.order?.(itemKey) ?? 0;

const PinnedRow = ({
  itemKey,
  pins,
  children,
}: {
  itemKey: string;
  pins: SectionPins;
  children: React.ReactNode;
}) => {
  const value = React.useMemo<RowPin>(
    () => ({
      pinned: pins.isPinned(itemKey),
      locked: pins.isLocked?.(itemKey) ?? false,
      toggle: () => pins.toggle(itemKey),
    }),
    [pins, itemKey],
  );
  return <RowPinProvider value={value}>{children}</RowPinProvider>;
};

/** With no `searchParts` the rows are not narrowed; the hook still runs once. */
const untouched = () => [] as const;

const SectionErrorRow = ({ title }: { title: React.ReactNode }) => (
  <span
    data-slot="section-error"
    className="font-light text-xs w-full items-center ml-2 inline-flex gap-2 text-destructive"
  >
    <span>{title}</span>
    <span>· Error</span>
  </span>
);
