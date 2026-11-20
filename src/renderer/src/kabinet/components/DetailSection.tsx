import React from "react";

/**
 * One titled part of a kabinet detail page's body, headed the way the other
 * modules head theirs (a small muted title, the count beside it). The facts
 * about the object itself are the Info rail's; a section holds what hangs off
 * it. A section with nothing to show renders nothing, unless it is given an
 * `empty` line — for the one section a page is about (a resource's pods), where
 * "none" is the answer rather than a gap.
 */
export const DetailSection = ({
  title,
  count,
  action,
  empty,
  children,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  empty?: string;
  children: React.ReactNode;
}) => {
  if (count === 0 && !empty) return null;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-7 items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {title}
          {count != null && <span className="ml-1.5 font-normal tabular-nums text-muted-foreground/60">{count}</span>}
        </h2>
        {action}
      </div>
      {count === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : children}
    </section>
  );
};

/** The grid the sections lay their cards in, as wide as the list pages'. */
export const CardGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">{children}</div>
);

/** A detail page's facts in the body: label over value, in as many columns as fit. */
export const FactGrid = ({ rows }: { rows: [label: string, value: React.ReactNode][] }) => (
  <dl className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-6 gap-y-4">
    {rows.map(([label, value]) => (
      <div key={label} className="min-w-0">
        <dt className="mb-1 truncate text-xs text-muted-foreground">{label}</dt>
        <dd className="break-words text-sm font-medium">{value}</dd>
      </div>
    ))}
  </dl>
);
