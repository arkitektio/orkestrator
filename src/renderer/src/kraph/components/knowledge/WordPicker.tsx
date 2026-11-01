import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/core/ui/command";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { cn } from "@/core/util/utils";
import {
  useSearchAssignableTermsQuery,
  type AssignableTermFragment,
  type TermKind,
} from "@/kraph/api/graphql";
import type { RecentTerm } from "@/kraph/lib/recentTerms";
import { normalizeWord, sameWord, termTint } from "@/kraph/lib/terms";
// Raw, not `CommandInput`: that one wraps itself in a padded group with its
// own border, a second search bar inside a panel that already is one.
import { Command as CommandPrimitive } from "cmdk";
import { History, Plus } from "lucide-react";
import { useState } from "react";

export type PickedWord = Omit<RecentTerm, "at">;

export type WordPickerProps = {
  /** What sort of word: its kind is part of its identity. */
  kind: TermKind;
  onPick: (word: PickedWord) => Promise<unknown> | void;
  /** Words to offer first, before anything is typed. */
  recents?: readonly PickedWord[];
  /** Words not to offer again. */
  excludeKeys?: readonly string[];
  /** List the vocabulary before anything is typed, rather than on the first letter. */
  eager?: boolean;
  /** Empty the field on a pick, for a picker that stays on screen. */
  clearOnPick?: boolean;
  /** The word being written, shown on its row. */
  busyKey?: string | null;
  busyLabel?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  /** How a word nobody has used yet is offered. */
  newWordLabel?: (typed: string) => string;
  newWordHeading?: string;
  className?: string;
};

/** Which views draw a word, phrased for someone about to use it. */
export const declaredBy = (term: AssignableTermFragment) =>
  term.categories.length === 0
    ? "no view draws this word yet"
    : term.categories.map((category) => category.graph.name).join(", ");

const WordDot = ({ color }: { color?: readonly number[] | null }) => (
  <span
    className="h-2 w-2 shrink-0 rounded-full"
    style={{ background: termTint(color) }}
    aria-hidden
  />
);

const matches = (word: PickedWord, typed: string) => {
  const needle = normalizeWord(typed);
  return (
    normalizeWord(word.key).includes(needle) ||
    normalizeWord(word.label ?? "").includes(needle)
  );
};

/**
 * Choosing a word as one gesture: type, press Enter.
 *
 * Your recent words come first, the organization's vocabulary after, a word
 * nobody has used yet last. Enter takes the highlighted row and the first row is
 * highlighted, so a near-match wins over coining a near-duplicate and a
 * genuinely new word is one arrow-down away. There is no "create" step: the
 * claim that names a new word creates it, and `createTerm` is a curator's
 * mutation that a plain editor could not call.
 */
export const WordPicker = ({
  kind,
  onPick,
  recents = [],
  excludeKeys = [],
  eager = false,
  clearOnPick = false,
  busyKey,
  busyLabel,
  disabled,
  autoFocus,
  placeholder = "Search words or type a new one…",
  ariaLabel = "Search words",
  newWordLabel = (typed) => `Use “${typed}”`,
  newWordHeading = "New word",
  className,
}: WordPickerProps) => {
  const [search, setSearch] = useState("");
  const typed = search.trim();
  const debounced = useDebounce(typed, 250);

  const { data, loading } = useSearchAssignableTermsQuery({
    variables: { search: debounced || undefined, kinds: [kind] },
    skip: !eager && debounced.length === 0,
    fetchPolicy: "cache-and-network",
  });

  const excluded = (word: { key: string }) =>
    excludeKeys.some((key) => sameWord(key, word.key));
  const recentWords = recents.filter(
    (word) => !excluded(word) && (!typed || matches(word, typed)),
  );
  const recentKeys = new Set(recentWords.map((word) => word.key));
  const words = (data?.terms ?? []).filter(
    (word) => !excluded(word) && !recentKeys.has(word.key),
  );

  const known = (word: PickedWord) => sameWord(word.key, typed) || sameWord(word.label, typed);
  const alreadyExcluded = typed.length > 0 && excludeKeys.some((key) => sameWord(key, typed));
  const offerNew =
    typed.length > 0 && !alreadyExcluded && !recentWords.some(known) && !words.some(known);

  const pick = (word: PickedWord) => {
    if (disabled || busyKey) return;
    if (clearOnPick) setSearch("");
    return onPick(word);
  };

  const open = eager || typed.length > 0;
  const nothing = recentWords.length === 0 && words.length === 0 && !offerNew;

  return (
    <Command shouldFilter={false} className={cn("bg-transparent", className)}>
      <CommandPrimitive.Input
        autoFocus={autoFocus}
        value={search}
        onValueChange={setSearch}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
      />
      {open ? (
        <CommandList className={cn("mt-1 rounded-md border", eager ? "max-h-80" : "max-h-56")}>
          {nothing && loading ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          ) : null}
          {alreadyExcluded ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Already claimed as {typed}.
            </div>
          ) : null}
          {nothing && !loading && !alreadyExcluded ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No words yet. Type one to use it.
            </div>
          ) : null}
          {recentWords.length > 0 ? (
            <CommandGroup heading="Recent">
              {recentWords.map((word) => (
                <CommandItem
                  key={`recent-${word.key}`}
                  value={`recent-${word.key}`}
                  disabled={disabled}
                  onSelect={() => pick(word)}
                >
                  <History className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <WordDot color={word.color} />
                  <span className="ml-1.5 font-medium">{word.label || word.key}</span>
                  {busyKey === word.key ? (
                    <span className="ml-auto text-xs text-muted-foreground">{busyLabel}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {words.length > 0 ? (
            <CommandGroup heading="Words">
              {words.map((word) => (
                <CommandItem
                  key={word.id}
                  value={`word-${word.key}`}
                  disabled={disabled}
                  onSelect={() => pick({ key: word.key, label: word.label, color: word.color })}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <WordDot color={word.color} />
                    {word.label || word.key}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {busyKey === word.key ? busyLabel : declaredBy(word)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {offerNew ? (
            <CommandGroup heading={newWordHeading}>
              <CommandItem
                value={`__new__${typed}`}
                disabled={disabled}
                onSelect={() => pick({ key: typed })}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                {newWordLabel(typed)}
                <span className="ml-2 text-xs text-muted-foreground">
                  {busyKey === typed ? busyLabel : "no view draws it yet"}
                </span>
              </CommandItem>
            </CommandGroup>
          ) : null}
        </CommandList>
      ) : null}
    </Command>
  );
};

export default WordPicker;
