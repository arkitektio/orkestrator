import { Badge } from "@/core/ui/badge";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { ActionLabel, ActionTrigger, PageAction } from "@/core/ui/page-action";
import { ArrowUpDown, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { KIND_GROUPS, KindGroup } from "../kinds";
import { CategorySource, Direction, Ordering, TransactionFilter, TransactionOrder } from "../../api/graphql";

type Sort = "relevance" | "date" | "amount-out" | "amount-in";

// An explicit ordering replaces the server's search ranking (substring matches
// first, then similarity), so "Best match" sends none.
const SORTS: Record<Sort, { label: string; ordering: TransactionOrder[] }> = {
  relevance: { label: "Best match", ordering: [] },
  date: { label: "Newest", ordering: [{ bookingDate: Ordering.DescNullsFirst }] },
  "amount-out": { label: "Largest out", ordering: [{ amount: Ordering.Asc }] },
  "amount-in": { label: "Largest in", ordering: [{ amount: Ordering.Desc }] },
};

/**
 * Search, filter and sort for a transaction list, as page actions (the list
 * itself carries no toolbar). `base` scopes it, e.g. to one account; `kinds`
 * adds the broker kind filter (depots). The URL seeds it once
 * (`?uncategorized=1`, `?search=…`), so a link can open a filtered list.
 * While searching, the list is ranked by match unless a sort is picked.
 */
export const useTransactionFilterBar = (base?: TransactionFilter, { kinds = false }: { kinds?: boolean } = {}) => {
  const [params] = useSearchParams();
  const [search, setSearch] = useState(() => params.get("search") ?? "");
  const [direction, setDirection] = useState<Direction | "ANY">("ANY");
  const [uncategorized, setUncategorized] = useState(() => params.get("uncategorized") === "1");
  const [hideTransfers, setHideTransfers] = useState(() => params.get("uncategorized") === "1");
  const [group, setGroup] = useState<KindGroup | "ALL">("ALL");
  const [guessed, setGuessed] = useState(false);
  const [picked, setPicked] = useState<Sort | null>(null);
  const searching = search.trim() !== "";
  const sort: Sort = picked && (picked !== "relevance" || searching) ? picked : searching ? "relevance" : "date";

  const filters = useMemo<TransactionFilter>(
    () => ({
      ...base,
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(direction !== "ANY" ? { direction } : {}),
      ...(uncategorized ? { uncategorized: true } : {}),
      ...(hideTransfers ? { isTransfer: false } : {}),
      ...(guessed ? { categorySource: CategorySource.Semantic } : {}),
      ...(group !== "ALL" ? { kinds: [...KIND_GROUPS[group].kinds] } : {}),
    }),
    [JSON.stringify(base), search, direction, uncategorized, hideTransfers, guessed, group],
  );
  const ordering = SORTS[sort].ordering;
  const active =
    (direction !== "ANY" ? 1 : 0) + (uncategorized ? 1 : 0) + (hideTransfers ? 1 : 0) + (guessed ? 1 : 0) + (group !== "ALL" ? 1 : 0);

  const actions = (
    <>
      <CollapsibleSearch alwaysShow value={search} onChange={(value) => setSearch(value)} placeholder="Search…" />
      <PageAction.Slot collapse="icon" priority={-10}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ActionTrigger aria-label="Filter">
              <Filter className="h-4 w-4" />
              <ActionLabel>
                Filter
                {active > 0 && <Badge variant="secondary">{active}</Badge>}
              </ActionLabel>
            </ActionTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Direction</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={direction} onValueChange={(v) => setDirection(v as Direction | "ANY")}>
              <DropdownMenuRadioItem value="ANY">Both</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value={Direction.Out}>Money out</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value={Direction.In}>Money in</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            {kinds && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Type</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={group} onValueChange={(v) => setGroup(v as KindGroup | "ALL")}>
                  <DropdownMenuRadioItem value="ALL">All</DropdownMenuRadioItem>
                  {(Object.keys(KIND_GROUPS) as KindGroup[]).map((key) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {KIND_GROUPS[key].label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={uncategorized} onCheckedChange={(v) => setUncategorized(!!v)}>
              Uncategorized only
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={guessed} onCheckedChange={(v) => setGuessed(!!v)}>
              Auto-categorized only
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={hideTransfers} onCheckedChange={(v) => setHideTransfers(!!v)}>
              Hide transfers
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageAction.Slot>
      <PageAction.Slot collapse="icon" priority={-20}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ActionTrigger aria-label="Sort">
              <ArrowUpDown className="h-4 w-4" />
              <ActionLabel>{SORTS[sort].label}</ActionLabel>
            </ActionTrigger>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setPicked(v as Sort)}>
              {(Object.keys(SORTS) as Sort[])
                .filter((key) => key !== "relevance" || searching)
                .map((key) => (
                  <DropdownMenuRadioItem key={key} value={key}>
                    {SORTS[key].label}
                  </DropdownMenuRadioItem>
                ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageAction.Slot>
    </>
  );

  return { filters, ordering, actions };
};
