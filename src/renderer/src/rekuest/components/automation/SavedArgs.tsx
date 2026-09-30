const show = (value: unknown) =>
  value === null || value === undefined
    ? "—"
    : typeof value === "string"
      ? value
      : JSON.stringify(value);

/** The arguments every run is assigned with, as stored. Nothing when there are none. */
export const SavedArgs = ({ args, skip }: { args: unknown; skip?: string }) => {
  const entries = Object.entries((args ?? {}) as Record<string, unknown>).filter(
    ([key]) => key !== skip,
  );
  if (entries.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium">Arguments</h2>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-1 text-sm">
        {entries.map(([key, value]) => (
          <div key={key} className="contents">
            <dt className="font-mono text-xs leading-5 text-muted-foreground">{key}</dt>
            <dd className="truncate" title={show(value)}>
              {show(value)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
