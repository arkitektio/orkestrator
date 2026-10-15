import { useDialog } from "@/core/dialogs/registry";
import { KraphTerm } from "@/core/linkers";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { ActionLabel, ActionTrigger, PageAction } from "@/core/ui/page-action";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import {
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
} from "@/core/util/hooks/use-search-param-state";
import type { GroupByDef } from "@/core/layout/GroupableListRenderer";
import { Eye, Plus, Waypoints } from "lucide-react";
import { useMemo } from "react";
import { ExploreTermFragment, TermFilter, TermKind } from "../api/graphql";
import TermList from "../components/lists/TermList";
import { KRAPH_HELP } from "../help";
import { TERM_KINDS, termKindLabel } from "../lib/terms";

const VISIBILITY = ["offered", "hidden", "all"] as const;
type Visibility = (typeof VISIBILITY)[number];
const VISIBILITY_LABELS: Record<Visibility, string> = {
  offered: "Offered",
  hidden: "Hidden",
  all: "Offered and hidden",
};

const DECLARED = ["any", "declared", "undeclared"] as const;
type Declared = (typeof DECLARED)[number];
const DECLARED_LABELS: Record<Declared, string> = {
  any: "Any",
  declared: "Spoken by a graph",
  undeclared: "No graph yet",
};

const ALL_KINDS = "all";

/** Without a kind chosen, the vocabulary reads best sorted into its kinds. */
const BY_KIND: GroupByDef<ExploreTermFragment> = {
  key: "kind",
  label: "Kind",
  getGroupId: (item) => item.kind,
  getGroupTitle: (id) => termKindLabel(id as TermKind),
  compareGroups: (a, b) =>
    TERM_KINDS.indexOf(a.id as TermKind) - TERM_KINDS.indexOf(b.id as TermKind),
};

/**
 * The organization's vocabulary, as something to browse: narrow by kind, by
 * whether a graph speaks the word yet, and by text. Words are never deleted —
 * a hidden one is out of the way, and "Show" brings the hidden ones back into
 * view to restore them.
 */
const Page = () => {
  const { openDialog } = useDialog();
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [kind, setKind] = useQueryState("kind", parseAsStringLiteral(TERM_KINDS));
  const [visibility, setVisibility] = useQueryState(
    "show",
    parseAsStringLiteral(VISIBILITY).withDefault("offered"),
  );
  const [declared, setDeclared] = useQueryState(
    "declared",
    parseAsStringLiteral(DECLARED).withDefault("any"),
  );

  const filters = useMemo<TermFilter>(() => {
    const filter: TermFilter = {};
    if (search.trim()) filter.search = search.trim();
    if (kind) filter.kinds = [kind];
    if (visibility !== "all") filter.hidden = visibility === "hidden";
    if (declared !== "any") filter.declared = declared === "declared";
    return filter;
  }, [search, kind, visibility, declared]);

  const narrowed = Boolean(search.trim() || kind || visibility !== "offered" || declared !== "any");
  const clearAll = () => {
    setSearch(null);
    setKind(null);
    setVisibility(null);
    setDeclared(null);
  };

  return (
    <KraphTerm.ListPage
      help={KRAPH_HELP.terms}
      title="Terms"
      pageActions={
        <>
          <CollapsibleSearch
            alwaysShow
            value={search}
            onChange={(value) => setSearch(value || null)}
            placeholder="Search words…"
          />
          <PageAction.Slot collapse="icon" priority={-10}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionTrigger aria-label="Graphs">
                  <Waypoints className="h-4 w-4" />
                  <ActionLabel>
                    Graphs
                    {declared !== "any" && <Badge variant="secondary">{DECLARED_LABELS[declared]}</Badge>}
                  </ActionLabel>
                </ActionTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Spoken by a graph</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={declared}
                  onValueChange={(value) => setDeclared(value === "any" ? null : (value as Declared))}
                >
                  {DECLARED.map((key) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {DECLARED_LABELS[key]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </PageAction.Slot>
          <PageAction.Slot collapse="icon" priority={-10}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionTrigger aria-label="Show">
                  <Eye className="h-4 w-4" />
                  <ActionLabel>
                    Show
                    {visibility !== "offered" && <Badge variant="secondary">{VISIBILITY_LABELS[visibility]}</Badge>}
                  </ActionLabel>
                </ActionTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Show words</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={visibility}
                  onValueChange={(value) => setVisibility(value === "offered" ? null : (value as Visibility))}
                >
                  {VISIBILITY.map((key) => (
                    <DropdownMenuRadioItem key={key} value={key}>
                      {VISIBILITY_LABELS[key]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </PageAction.Slot>
          <PageAction
            priority={10}
            collapse="icon"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openDialog("createterm", { kind: kind ?? undefined }, { size: "medium" })}
          >
            New term
          </PageAction>
        </>
      }
    >
      <div className="p-6">
        <div className="mb-4 max-w-3xl">
          <h1 className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">Terms</h1>
          <p className="mt-2 text-muted-foreground">
            The words your organization uses. Graphs declare the words they speak, and every graph
            declaring the same word sees the same claims.
          </p>
        </div>

        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          className="mb-4 flex-wrap justify-start"
          value={kind ?? ALL_KINDS}
          onValueChange={(value) => setKind(!value || value === ALL_KINDS ? null : (value as TermKind))}
        >
          <ToggleGroupItem value={ALL_KINDS}>All kinds</ToggleGroupItem>
          {TERM_KINDS.map((option) => (
            <ToggleGroupItem key={option} value={option}>
              {termKindLabel(option)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <TermList
          title=""
          filters={filters}
          defaultLimit={kind ? 60 : 120}
          groupBy={kind ? undefined : BY_KIND}
          emptyActions={
            narrowed ? (
              <Button variant="outline" onClick={clearAll}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      </div>
    </KraphTerm.ListPage>
  );
};

export default Page;
