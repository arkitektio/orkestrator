import { useDialog } from "@/core/dialogs/registry";
import { ModuleHomeHeader } from "@/core/layout/ModuleHome";
import { PageLayout } from "@/core/layout/PageLayout";
import { Badge } from "@/core/ui/badge";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { ActionLabel, ActionTrigger, PageAction } from "@/core/ui/page-action";
import { Skeleton } from "@/core/ui/skeleton";
import { ErrorNote } from "@/core/ui/error-note";
import { Box, LayoutPanelTop, Plus, Shapes, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { ComponentContext, useRepoBloksQuery } from "../api/graphql";
import { useListSearch } from "../components/ListSearch";
import { BLOK_GRID } from "../components/store/BlokStoreCard";
import { RepoBlokGrid } from "../components/store/RepoBlokCard";
import { KABINET_HELP } from "../help";

const CONTEXTS: { value: ComponentContext | null; label: string; icon: LucideIcon }[] = [
  { value: null, label: "All bloks", icon: Shapes },
  { value: ComponentContext.Panel, label: "Panels", icon: LayoutPanelTop },
  { value: ComponentContext.Scene, label: "Scenes", icon: Box },
];

/** The bloks your GitHub repositories publish on their own (`.arkitekt/bloks.yaml`). */
const Page = () => {
  const { openDialog } = useDialog();
  const { search, setSearch, filters: searchFilters, searching } = useListSearch();
  const [context, setContext] = useState<ComponentContext | null>(null);
  const filters = searching || context ? { ...searchFilters, context: context ?? undefined } : undefined;
  const picked = CONTEXTS.find((entry) => entry.value === context);
  const { data, error, loading } = useRepoBloksQuery({
    variables: { filters },
    fetchPolicy: "cache-and-network",
  });
  const bloks = data?.repoBloks ?? [];

  return (
    <PageLayout
      title="Bloks"
      help={KABINET_HELP.bloks}
      pageActions={
        <>
          <CollapsibleSearch alwaysShow value={search} onChange={setSearch} placeholder="Search bloks…" />
          <PageAction.Slot collapse="icon" priority={-5}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <ActionTrigger aria-label="Kind">
                  <Shapes className="h-4 w-4" />
                  <ActionLabel>
                    Kind
                    {picked?.value && (
                      <Badge variant="secondary">{picked.label}</Badge>
                    )}
                  </ActionLabel>
                </ActionTrigger>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuRadioGroup
                  value={context ?? "all"}
                  onValueChange={(value) =>
                    setContext(value === "all" ? null : (value as ComponentContext))
                  }
                >
                  {CONTEXTS.map(({ value, label, icon: Icon }) => (
                    <DropdownMenuRadioItem key={label} value={value ?? "all"}>
                      <Icon className="h-4 w-4" />
                      {label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </PageAction.Slot>
          <PageAction
            size="sm"
            collapse="icon"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => openDialog("createrepo", {})}
          >
            Add Repo
          </PageAction>
        </>
      }
    >
      <div className="flex w-full flex-col gap-6 p-3">
        <ModuleHomeHeader moduleKey="kabinet" icon={<Shapes />} title="Bloks" description="The panels and scenes your repositories publish on their own." />
        {error && !data ? (
          <ErrorNote error={error} title="Couldn't load the bloks" />
        ) : loading && !data ? (
          <div className={BLOK_GRID}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[8/7] rounded-2xl" />
            ))}
          </div>
        ) : bloks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {searching || context
              ? "No blok matches."
              : "No repository publishes a blok yet. A repository lists its bloks in .arkitekt/bloks.yaml."}
          </p>
        ) : (
          <RepoBlokGrid bloks={bloks} />
        )}
      </div>
    </PageLayout>
  );
};

export default Page;
