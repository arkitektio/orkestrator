import { useDialog } from "@/core/dialogs/registry";
import { toast } from "@/core/notify";
import type { Structure } from "@/core/types";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/core/ui/command";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { useKraph } from "@/kraph/api/funcs";
import { TermKind, useSearchAssignableTermsQuery } from "@/kraph/api/graphql";
import { declaredBy } from "@/kraph/components/knowledge/LabelInput";
import { measureTerm } from "@/kraph/lib/measureTerm";
import { useRecentTerms, type RecentTerm } from "@/kraph/lib/recentTerms";
import { termTint } from "@/kraph/lib/terms";
// Raw, not `CommandInput`: the same bare search bar as `LabelInput`.
import { Command as CommandPrimitive } from "cmdk";
import { History, Plus, Ruler } from "lucide-react";
import { useState } from "react";

type PickedTerm = Omit<RecentTerm, "at">;

const TermDot = ({ color }: { color?: readonly number[] | null }) => (
  <span
    className="h-2 w-2 shrink-0 rounded-full"
    style={{ background: termTint(color) }}
    aria-hidden
  />
);

const matches = (term: PickedTerm, typed: string) => {
  const needle = typed.toLowerCase();
  return (
    term.key.toLowerCase().includes(needle) ||
    (term.label ?? "").toLowerCase().includes(needle)
  );
};

/**
 * "This datum measures a <word>": pick one of the organization's ENTITY words,
 * or type a new one. Your recent words come first; the vocabulary search
 * after; a word nobody has used yet last, so a near-match wins over coining
 * a near-duplicate. The write is `measureTerm` — one fresh instance of the
 * word per datum, measured under `measures`.
 */
export const MeasureTermDialog = (props: { structures: Structure[] }) => {
  const { closeDialog } = useDialog();
  const client = useKraph();
  const recents = useRecentTerms();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const typed = search.trim();
  const debounced = useDebounce(typed, 250);

  const { data, loading } = useSearchAssignableTermsQuery({
    variables: { search: debounced || undefined, kinds: [TermKind.Entity] },
    fetchPolicy: "cache-and-network",
  });

  const recentTerms = recents.terms.filter((term) => !typed || matches(term, typed));
  const recentKeys = new Set(recents.terms.map((term) => term.key));
  const terms = (data?.terms ?? []).filter((term) => !recentKeys.has(term.key));
  const exact =
    recentTerms.some((term) => term.key === typed) ||
    (data?.terms ?? []).some((term) => term.key === typed);
  const offerNew = typed.length > 0 && !exact;

  const choose = async (term: PickedTerm) => {
    if (busy) return;
    setBusy(term.key);
    try {
      await measureTerm(client, props.structures, term.key);
      recents.record(term);
      toast.success(`Measures ${term.label || term.key}`);
      closeDialog();
    } catch (e) {
      toast.error(`Could not measure “${term.key}”: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  const count = props.structures.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Ruler className="h-4 w-4" />
          Measures
        </h2>
        <p className="text-sm text-muted-foreground">
          What {count === 1 ? "this datum measures" : `these ${count} data measure`}. Pick a
          word or type a new one.
        </p>
      </div>

      <Command shouldFilter={false} className="bg-transparent">
        <CommandPrimitive.Input
          autoFocus
          value={search}
          onValueChange={setSearch}
          disabled={!!busy}
          placeholder="Search terms or type a new one…"
          aria-label="Search terms"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
        />
        <CommandList className="mt-2 max-h-80 rounded-md border">
          {recentTerms.length > 0 ? (
            <CommandGroup heading="Recent">
              {recentTerms.map((term) => (
                <CommandItem
                  key={`recent-${term.key}`}
                  value={`recent-${term.key}`}
                  disabled={!!busy}
                  onSelect={() => choose(term)}
                >
                  <History className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                  <TermDot color={term.color} />
                  <span className="ml-1.5 font-medium">{term.label || term.key}</span>
                  {busy === term.key ? (
                    <span className="ml-auto text-xs text-muted-foreground">Measuring…</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {terms.length > 0 ? (
            <CommandGroup heading="Terms">
              {terms.map((term) => (
                <CommandItem
                  key={term.id}
                  value={`term-${term.key}`}
                  disabled={!!busy}
                  onSelect={() => choose({ key: term.key, label: term.label, color: term.color })}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <TermDot color={term.color} />
                    {term.label || term.key}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {busy === term.key ? "Measuring…" : declaredBy(term)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
          {offerNew ? (
            <CommandGroup heading="Create new">
              <CommandItem
                value={`__new__${typed}`}
                disabled={!!busy}
                onSelect={() => choose({ key: typed })}
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Create “{typed}”
                <span className="ml-2 text-xs text-muted-foreground">
                  {busy === typed ? "Measuring…" : "no graph draws it yet"}
                </span>
              </CommandItem>
            </CommandGroup>
          ) : null}
          {loading && terms.length === 0 && recentTerms.length === 0 && !offerNew ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          ) : null}
          {!loading && terms.length === 0 && recentTerms.length === 0 && !offerNew ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No terms yet — type one to create it.
            </div>
          ) : null}
        </CommandList>
      </Command>
    </div>
  );
};

export default MeasureTermDialog;
