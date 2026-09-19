/** The Info rails' shared rows (neuron model, array dataset). */

/** One labelled fact, in the rail's usual label / value row. */
export const Fact = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode | null | undefined;
}) => {
  // Null is "not set", and an unset field is not a fact worth a row.
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-xs">{value}</span>
    </div>
  );
};

/** Section heading with the count of what it lists, like the dataset rail. */
export const SectionHeader = ({ title, count }: { title: string; count?: number }) => (
  <div className="flex flex-row items-baseline justify-between gap-2">
    <div className="text-xs font-semibold">{title}</div>
    {count !== undefined && (
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    )}
  </div>
);
