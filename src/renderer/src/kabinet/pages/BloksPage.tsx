import { PageLayout } from "@/core/layout/PageLayout";
import { DialogButton } from "@/core/ui/dialog-button";
import { Skeleton } from "@/core/ui/skeleton";
import { ErrorNote } from "@/core/ui/error-note";
import { useDebounce } from "@uidotdev/usehooks";
import { Box, LayoutPanelTop, Shapes, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { ComponentContext, useRepoBloksQuery } from "../api/graphql";
import { ListSearch } from "../components/ListSearch";
import { BLOK_GRID } from "../components/store/BlokStoreCard";
import { RepoBlokGrid } from "../components/store/RepoBlokCard";
import { Chip } from "../components/store/StoreParts";
import { KABINET_HELP } from "../help";

const CONTEXTS: { value: ComponentContext | null; label: string; icon: LucideIcon }[] = [
  { value: null, label: "All bloks", icon: Shapes },
  { value: ComponentContext.Html, label: "Panels", icon: LayoutPanelTop },
  { value: ComponentContext.Scene, label: "Scenes", icon: Box },
];

/** The bloks your GitHub repositories publish on their own (`.arkitekt/bloks.yaml`). */
const Page = () => {
  const [search, setSearch] = useState("");
  const [context, setContext] = useState<ComponentContext | null>(null);
  const debounced = useDebounce(search, 200);
  const filters = debounced || context ? { search: debounced || undefined, context: context ?? undefined } : undefined;
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
        <DialogButton alwaysShow name="createrepo" variant="outline" size="sm" dialogProps={{}}>
          Add Repo
        </DialogButton>
      }
    >
      <div className="flex w-full flex-col gap-3 p-3">
        <ListSearch value={search} onChange={setSearch} placeholder="Search bloks…" />
        <div className="flex flex-wrap gap-1.5">
          {CONTEXTS.map(({ value, label, icon: Icon }) => (
            <Chip key={label} active={context === value} onClick={() => setContext(value)}>
              <Icon />
              {label}
            </Chip>
          ))}
        </div>
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
            {debounced || context
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
