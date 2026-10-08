import { CommandGroup } from "cmdk";
import React from "react";
import { createPortal } from "react-dom";
import { RoleGuard } from "@/core/connection/roles";
import { useSmartPins } from "./pins";
import { cn } from "@/core/util/utils";
import { RowPinProvider, useCompactRows, usePinnedSlot, type RowPin } from "./rowPin";
import type {
  SectionPins,
  SmartContextSection,
  SmartSectionContext,
  SmartSectionId,
} from "./section";
import { useReportSectionStatus } from "./sectionStatusContext";
import { useNarrowedRows } from "./useNarrowedRows";

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
 * query and its row.
 */
export const SectionHost = <T,>({
  section,
  context,
}: {
  section: SmartContextSection<T>;
  context: SmartSectionContext;
}) => {
  const skipped = <SectionSkipped id={section.id} />;
  const body = <SectionBody section={section} context={context} />;
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

const SectionBody = <T,>({
  section,
  context,
}: {
  section: SmartContextSection<T>;
  context: SmartSectionContext;
}) => {
  const result = section.useItems(context);
  const narrowed = useNarrowedRows({
    rows: result.items,
    serverFilter: context.filter,
    liveFilter: context.liveFilter,
    status: result.status,
    partsOf: section.searchParts ?? untouched,
  });
  const rows = section.searchParts ? narrowed : result.items;
  const revision = useRevision(result.items);
  useReportSectionStatus(section.id, {
    status: result.status,
    count: rows?.length ?? 0,
    revision,
  });

  const usePins = section.usePins ?? useSmartPins;
  const pins = usePins(section.id);
  const slot = usePinnedSlot();

  if (!rows || rows.length === 0) {
    return result.status === "error" ? <SectionErrorRow title={section.title} /> : null;
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
    <>
      {slot ? createPortal(pinned.map(renderRow), slot) : null}
      {listed.length > 0 ? (
        <CommandGroup
          heading={<SectionHeading icon={section.icon}>{section.title}</SectionHeading>}
        >
          {listed.map(renderRow)}
        </CommandGroup>
      ) : null}
    </>
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

export const SectionHeading = ({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => {
  const compact = useCompactRows();
  return (
    <span
      className={cn(
        "w-full items-center ml-2 inline-flex",
        compact
          ? "gap-1 pt-1 text-[10px] leading-none text-muted-foreground"
          : "gap-2 text-xs font-light",
      )}
    >
      {Icon ? <Icon className={compact ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} /> : null}
      <span>{children}</span>
    </span>
  );
};

const SectionErrorRow = ({ title }: { title: React.ReactNode }) => (
  <span className="font-light text-xs w-full items-center ml-2 inline-flex gap-2 text-destructive">
    <span>{title}</span>
    <span>· Error</span>
  </span>
);
