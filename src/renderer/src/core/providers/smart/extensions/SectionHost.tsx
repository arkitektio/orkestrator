import { CommandGroup } from "cmdk";
import React from "react";
import type { SmartContextSection, SmartSectionContext, SmartSectionId } from "./section";
import { useReportSectionStatus } from "./sectionStatusContext";
import { useNarrowedRows } from "./useNarrowedRows";

/**
 * Mounts one section of the menu.
 *
 * The host owns everything a section used to repeat: the module guard (from
 * the outside, so the query never mounts before the backend is ready), the
 * group heading, the "render nothing when empty" rule, the error line, the
 * instant narrowing of rows while the server search is in flight, and the
 * status report the menu's progress bar and empty line are derived from. A
 * section is left with its query and its row.
 */
export const SectionHost = <T,>({
  section,
  context,
}: {
  section: SmartContextSection<T>;
  context: SmartSectionContext;
}) => {
  const body = <SectionBody section={section} context={context} />;
  if (!section.Guard) return body;
  return (
    <section.Guard fallback={<SectionSkipped id={section.id} />}>{body}</section.Guard>
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

  if (!rows || rows.length === 0) {
    return result.status === "error" ? <SectionErrorRow title={section.title} /> : null;
  }

  return (
    <CommandGroup
      heading={<SectionHeading icon={section.icon}>{section.title}</SectionHeading>}
    >
      {rows.map((item) => (
        <section.Row key={section.itemKey(item)} item={item} context={context} />
      ))}
    </CommandGroup>
  );
};

/** With no `searchParts` the rows are not narrowed; the hook still runs once. */
const untouched = () => [] as const;

export const SectionHeading = ({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <span className="font-light text-xs w-full items-center ml-2 inline-flex gap-2">
    {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
    <span>{children}</span>
  </span>
);

const SectionErrorRow = ({ title }: { title: React.ReactNode }) => (
  <span className="font-light text-xs w-full items-center ml-2 inline-flex gap-2 text-destructive">
    <span>{title}</span>
    <span>· Error</span>
  </span>
);
