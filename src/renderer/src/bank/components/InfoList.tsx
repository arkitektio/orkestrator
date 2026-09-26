import React from "react";

/** A label/value list for a page's Info rail. Rows with nothing to say are dropped. */
export const InfoList = ({ rows }: { rows: [label: string, value: React.ReactNode][] }) => (
  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-3 text-sm">
    {rows
      .filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== false)
      .map(([label, value]) => (
        <React.Fragment key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </React.Fragment>
      ))}
  </dl>
);
