import { useEffect, useState } from "react";
import { Input } from "@/core/components/ui/input";

const format = (value: number, digits: number): string => {
  if (!Number.isFinite(value)) return "";
  const rounded = Number(value.toFixed(digits));
  // `-0` reads as a bug to anyone looking at a rotation field.
  return String(Object.is(rounded, -0) ? 0 : rounded);
};

/**
 * A number input that commits on Enter / blur, not per keystroke.
 *
 * Every commit is one undo step and one recomposition of the draft; committing
 * "1", "12", "12." and "12.5" as the user types would be four steps and three
 * visible jumps. While focused the field shows what is being typed; otherwise
 * it follows the value — which a gizmo drag changes every frame.
 */
export const NumberField = (props: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  digits?: number;
  suffix?: string;
  disabled?: boolean;
}) => {
  const digits = props.digits ?? 3;
  const [draft, setDraft] = useState<string | null>(null);

  // A value arriving from elsewhere (undo, a drag) while not typing wins.
  useEffect(() => {
    setDraft(null);
  }, [props.value]);

  const commit = () => {
    if (draft === null) return;
    const parsed = Number.parseFloat(draft);
    setDraft(null);
    if (Number.isFinite(parsed) && parsed !== props.value) props.onCommit(parsed);
  };

  return (
    <label className="flex min-w-0 items-center gap-1">
      <span className="w-4 shrink-0 text-center text-[0.65rem] uppercase text-muted-foreground">
        {props.label}
      </span>
      <Input
        className="h-6 min-w-0 px-1.5 font-mono text-xs"
        inputMode="decimal"
        disabled={props.disabled}
        value={draft ?? format(props.value, digits)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
      />
      {props.suffix && <span className="shrink-0 text-[0.65rem] text-muted-foreground">{props.suffix}</span>}
    </label>
  );
};
