import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/core/ui/command";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import {
  TermKind,
  useSearchAssignableTermsQuery,
  type AssignableTermFragment,
} from "@/kraph/api/graphql";
import { termTint } from "@/kraph/lib/terms";
import { cn } from "@/core/util/utils";
// Raw, not `CommandInput`: that one wraps itself in a padded group with its
// own border, a second search bar inside a panel that already is one.
import { Command as CommandPrimitive } from "cmdk";
import { Plus } from "lucide-react";
import { useState } from "react";

export type LabelInputProps = {
  onClaim: (term: string) => Promise<void> | void;
  /** Words already on this datum; they are not offered again. */
  excludeKeys?: readonly string[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

/** Which graphs draw a word, phrased for someone about to use it. */
export const declaredBy = (term: AssignableTermFragment) =>
  term.categories.length === 0
    ? "no graph draws this word yet"
    : term.categories.map((category) => category.graph.name).join(", ");

/**
 * Labelling as one gesture: type a word, press Enter.
 *
 * The rows are the organization's existing words first, the typed word as a
 * new one last. Enter takes the highlighted row, and the first row is
 * highlighted by default — so a near-match in the vocabulary wins over coining
 * a near-duplicate, and a genuinely new word is one arrow-down away. There is
 * no separate "coin" step: `assertEntityExists` creates a word the
 * organization has not used before.
 */
export const LabelInput = ({
  onClaim,
  excludeKeys = [],
  disabled,
  placeholder = "What is this? Type a word…",
  className,
}: LabelInputProps) => {
  const [search, setSearch] = useState("");
  const typed = search.trim();
  const debounced = useDebounce(typed, 250);

  const { data, loading } = useSearchAssignableTermsQuery({
    variables: { search: debounced || undefined, kinds: [TermKind.Entity] },
    skip: debounced.length === 0,
    fetchPolicy: "cache-and-network",
  });

  const terms = (data?.terms ?? []).filter((term) => !excludeKeys.includes(term.key));
  const exact = terms.some((term) => term.key === typed);
  const alreadyClaimed = typed.length > 0 && excludeKeys.includes(typed);
  const offerNew = typed.length > 0 && !exact && !alreadyClaimed;

  const choose = async (key: string) => {
    setSearch("");
    await onClaim(key);
  };

  return (
    <Command shouldFilter={false} className={cn("bg-transparent", className)}>
      <CommandPrimitive.Input
        value={search}
        onValueChange={setSearch}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="Label this datum"
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
      />
      {typed.length > 0 ? (
        <CommandList className="mt-1 max-h-56 rounded-md border">
          {loading && terms.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          ) : null}
          {alreadyClaimed ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              Already claimed as {typed}.
            </div>
          ) : null}
          {terms.length > 0 ? (
            <CommandGroup heading="Words">
              {terms.map((term) => (
                <CommandItem
                  key={term.id}
                  value={term.key}
                  onSelect={() => choose(term.key)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: termTint(term.color) }}
                      aria-hidden
                    />
                    {term.label || term.key}
                  </span>
                  <span className="text-xs text-muted-foreground">{declaredBy(term)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {offerNew ? (
            <CommandGroup heading="New word">
              <CommandItem value={`__new__${typed}`} onSelect={() => choose(typed)}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                Claim as “{typed}”
                <span className="ml-2 text-xs text-muted-foreground">
                  no graph draws it yet
                </span>
              </CommandItem>
            </CommandGroup>
          ) : null}
        </CommandList>
      ) : null}
    </Command>
  );
};

export default LabelInput;
