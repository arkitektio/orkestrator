import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/core/components/ui/form";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { FieldProps } from "./types";

/**
 * A list of free-typed strings where the *order* is the meaning.
 *
 * Every other list field in this directory renders an unordered set of badges
 * with click-to-remove — fine for "which tags apply", useless for a trust order,
 * where "first wins" is the whole point. This one numbers the rows and moves
 * them.
 *
 * Free-form on purpose: its callers are `subjectPriority` and `toolPriority` on
 * a derivation rule, and nothing enumerates subjects or app ids — they are bare
 * strings on an `Assertion`, with no query behind them.
 *
 * Split into a controlled primitive and a react-hook-form wrapper because the
 * two hosts differ: the form dialogs have a form context, `PropertyInspector`
 * is prop-driven and has none.
 */
export const OrderedStringList = (props: {
  value: string[] | null | undefined;
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Rendered after each row, e.g. "checked first". Gets the row's rank. */
  rankNote?: (index: number, value: string) => string;
}) => {
  const [draft, setDraft] = useState("");
  const values = props.value ?? [];

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) {
      setDraft("");
      return;
    }
    props.onChange([...values, trimmed]);
    setDraft("");
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    props.onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2 py-1"
        >
          <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">
            {index + 1}.
          </span>
          <span className="font-mono text-sm truncate">{value}</span>
          {props.rankNote && (
            <span className="text-xs text-muted-foreground truncate">
              {props.rankNote(index, value)}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={`Move ${value} up`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={`Move ${value} down`}
              disabled={index === values.length - 1}
              onClick={() => move(index, 1)}
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              aria-label={`Remove ${value}`}
              onClick={() =>
                props.onChange(values.filter((_, i) => i !== index))
              }
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // This sits inside a form whose submit button is elsewhere; Enter
            // here means "add this row", not "submit".
            e.preventDefault();
            add();
          }
        }}
        placeholder={props.placeholder ?? "Type and press Enter…"}
      />
    </div>
  );
};

export const OrderedFreeformListField = (
  props: FieldProps & {
    placeholder?: string;
    rankNote?: (index: number, value: string) => string;
  },
) => {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={props.name}
      rules={{ validate: props.validate }}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {props.label != undefined ? props.label : props.name}
          </FormLabel>
          <FormControl>
            <OrderedStringList
              value={field.value}
              onChange={field.onChange}
              placeholder={props.placeholder}
              rankNote={props.rankNote}
            />
          </FormControl>
          <FormDescription>{props.description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default OrderedFreeformListField;
