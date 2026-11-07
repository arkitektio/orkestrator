import { CardSection } from "@/core/data/scene/layerui/cardControls";

/**
 * A layer's column bindings as a card section: one row per position (x, y,
 * colour; the value summarised, the grouping), each a compact select over the
 * columns the server would accept there. A change commits at once; an
 * optional binding offers "none", which clears it.
 */

export type BindableColumn = { name: string; unit?: string | null };

const SELECT =
  "h-5 max-w-36 truncate rounded border border-foreground/10 bg-background/30 px-1.5 text-[10px] text-foreground/70 hover:text-foreground disabled:opacity-40";

const NONE = "";

export const BindingRow = ({
  label,
  value,
  columns,
  onCommit,
  optional,
  noneLabel = "none",
  disabled,
}: {
  label: string;
  value: string | null;
  columns: readonly BindableColumn[];
  onCommit: (value: string | null) => void;
  optional?: boolean;
  noneLabel?: string;
  disabled?: boolean;
}) => {
  // A stored column the list no longer offers is still shown, so the select says what is drawn.
  const listed = value == null || columns.some((c) => c.name === value) ? columns : [{ name: value }, ...columns];
  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-[9px] font-medium uppercase tracking-[0.08em] text-foreground/35">{label}</span>
      <select
        className={`${SELECT} ml-auto`}
        value={value ?? NONE}
        disabled={disabled}
        onChange={(event) => {
          const next = event.currentTarget.value || null;
          if (next !== value) onCommit(next);
        }}
      >
        {(optional || value == null) && <option value={NONE}>{noneLabel}</option>}
        {listed.map((column) => (
          <option key={column.name} value={column.name}>
            {column.unit ? `${column.name} (${column.unit})` : column.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export const BindingSection = ({ children }: { children: React.ReactNode }) => <CardSection title="reads">{children}</CardSection>;
