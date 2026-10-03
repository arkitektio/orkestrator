import { portDescription, portLabel, portPlaceholder } from "@/core/ports/engine/portPresentation";
import { InputWidgetProps } from "@/core/ports/engine/types";
import { pathToName } from "@/core/ports/engine/utils";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/core/ui/form";
import { PortKind } from "@/rekuest/api/graphql";
import { X } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";

type Row = { __value: string | number };

/**
 * The typed text as an item of the list, or null when it is not one. Numbers
 * are stored as numbers, like the item's own schema would coerce them.
 */
export const parseTag = (text: string, kind: PortKind): string | number | null => {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  if (kind === PortKind.String) return trimmed;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  if (kind === PortKind.Int && !Number.isInteger(value)) return null;
  return value;
};

/** Several items typed or pasted at once: split on commas and whitespace runs. */
export const parseTags = (text: string, kind: PortKind): (string | number)[] =>
  (kind === PortKind.String ? text.split(/[,\n]/) : text.split(/[,\s]+/))
    .map((part) => parseTag(part, kind))
    .filter((value): value is string | number => value !== null);

/**
 * A list of plain texts or numbers as chips in one input: type, Enter or
 * comma to add, Backspace to take the last one back. Stores the same
 * `[{ __value }]` rows as the card-per-item list.
 */
export const TagListWidget = (props: InputWidgetProps) => {
  const form = useFormContext();
  const [draft, setDraft] = useState("");
  const child = props.port.children?.at(0);
  const kind = child?.kind ?? PortKind.String;

  return (
    <FormField
      control={form.control}
      name={pathToName(props.path)}
      render={({ field }) => {
        const rows: Row[] = Array.isArray(field.value) ? field.value : [];
        const commit = (text: string) => {
          const added = parseTags(text, kind);
          if (added.length > 0) field.onChange([...rows, ...added.map((value) => ({ __value: value }))]);
          setDraft("");
        };
        return (
          <FormItem>
            <FormLabel>{portLabel(props.port)}</FormLabel>
            <FormControl>
              <div className="flex min-h-9 flex-wrap items-center gap-1 rounded-md border bg-transparent px-2 py-1 text-sm focus-within:ring-2 focus-within:ring-ring">
                {rows.map((row, index) => (
                  <span
                    key={`${index}:${row.__value}`}
                    className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums"
                  >
                    {String(row.__value)}
                    <button
                      type="button"
                      aria-label={`Remove ${row.__value}`}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => field.onChange(rows.filter((_, i) => i !== index))}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  className="min-w-16 flex-1 bg-transparent py-0.5 text-foreground outline-none placeholder:text-muted-foreground"
                  value={draft}
                  inputMode={kind === PortKind.String ? "text" : "decimal"}
                  placeholder={rows.length === 0 ? portPlaceholder(props.port, props.widget) : ""}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      commit(draft);
                    } else if (e.key === "Backspace" && draft === "" && rows.length > 0) {
                      field.onChange(rows.slice(0, -1));
                    }
                  }}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (/[,\n]/.test(text)) {
                      e.preventDefault();
                      commit(text);
                    }
                  }}
                  onBlur={() => {
                    commit(draft);
                    field.onBlur();
                  }}
                />
              </div>
            </FormControl>
            <FormDescription>{portDescription(props.port, props.widget)}</FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
