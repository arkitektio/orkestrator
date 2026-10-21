import { type LogoTree } from "@/core/blok/logo/CachedBlokLogo";
import { CachedBlokPreview } from "@/core/blok/preview/CachedBlokPreview";
import { useDialog } from "@/core/dialogs/registry";
import { KabinetRepo, RekuestBlok } from "@/core/linkers";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { useListBloksQuery } from "@/rekuest/api/graphql";
import { RekuestGuard } from "@/rekuest/api/hooks";
import { AlertTriangle, ArrowRight, Check, Download, Github, RefreshCw } from "lucide-react";
import React, { useMemo } from "react";
import { StoreRepoBlokFragment, useRepoBlokTreeQuery } from "../../api/graphql";
import { BLOK_GRID, BlokTile, KIND, PREVIEW_BOX } from "./BlokStoreCard";
import { installedByOrigin, InstalledCopy, repoBlokState } from "./storeModel";

/** A repository blok's cache ids are kept apart from a flavour blok's (`kabinet:`). */
const CACHE_PREFIX = "kabinet-repo:";

/** A repository blok's tree, fetched only for a first drawing. */
const useRepoBlokTree = (cacheId: string): LogoTree | null => {
  const { data } = useRepoBlokTreeQuery({ variables: { id: cacheId.slice(CACHE_PREFIX.length) } });
  return data?.repoBlok ?? null;
};

/** What a tile can do with its blok: install it, update it, or use the installed copy. */
const RepoBlokAction = ({
  blok,
  installed,
}: {
  blok: StoreRepoBlokFragment;
  installed: ReadonlyMap<string, InstalledCopy> | null;
}) => {
  const { openDialog } = useDialog();
  if (blok.parseError) {
    return (
      <Button size="sm" className="rounded-full" disabled title="Its BSX does not parse, so it cannot be installed">
        <Download />
        Install
      </Button>
    );
  }
  if (!installed) {
    return (
      <Button size="sm" className="rounded-full" disabled title="Installing a blok needs rekuest, which is not available">
        <Download />
        Install
      </Button>
    );
  }
  const state = repoBlokState(blok, installed);
  switch (state.kind) {
    case "missing":
      return (
        <Button size="sm" className="rounded-full" onClick={() => openDialog("installrepoblok", { id: blok.id })}>
          <Download />
          Install
        </Button>
      );
    case "outdated":
      return (
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full"
          onClick={() => openDialog("installrepoblok", { id: blok.id, update: true })}
        >
          <RefreshCw />
          Update
        </Button>
      );
    case "installed":
      return (
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          title="Installed: bind it to agents"
          onClick={() => openDialog("materializeblok", { id: state.copy.id })}
        >
          <Check />
          Materialize
        </Button>
      );
  }
};

/** A blok a GitHub repository publishes, drawn against its demo state. */
export const RepoBlokCard = React.memo(
  ({ blok, installed }: { blok: StoreRepoBlokFragment; installed: ReadonlyMap<string, InstalledCopy> | null }) => {
    const kind = KIND(blok.context);
    const copy = installed?.get(blok.origin);
    return (
      <BlokTile
        to={copy ? RekuestBlok.linkBuilder(copy.id) : KabinetRepo.linkBuilder(blok.repo.id)}
        context={blok.context}
        title={blok.name}
        description={blok.description}
        preview={
          blok.parseError ? (
            <div className={cn(PREVIEW_BOX, "flex items-center justify-center text-amber-500")}>
              <AlertTriangle className="size-8" aria-label="This blok does not parse" />
            </div>
          ) : (
            <CachedBlokPreview
              cacheId={`${CACHE_PREFIX}${blok.id}`}
              hash={blok.hash}
              useTree={useRepoBlokTree}
              className={PREVIEW_BOX}
              fallback={
                <div className="flex size-full items-center justify-center text-muted-foreground/30">
                  <kind.icon className="size-10" />
                </div>
              }
            />
          )
        }
        origin={
          <>
            <Github className="size-3.5 shrink-0" />
            <span className="truncate" title={blok.origin}>
              {blok.repo.name}
            </span>
          </>
        }
        action={<RepoBlokAction blok={blok} installed={installed} />}
      />
    );
  },
);

const Grid = ({
  bloks,
  installed,
}: {
  bloks: StoreRepoBlokFragment[];
  installed: ReadonlyMap<string, InstalledCopy> | null;
}) => (
  <div className={BLOK_GRID}>
    {bloks.map((blok) => (
      <RepoBlokCard key={blok.id} blok={blok} installed={installed} />
    ))}
  </div>
);

/** The grid, knowing which bloks rekuest has installed (and from which version). */
const InstalledGrid = ({ bloks }: { bloks: StoreRepoBlokFragment[] }) => {
  // The same query as the store's "Made in your organization": one request.
  const { data } = useListBloksQuery({
    variables: { filters: { provided: false } },
    fetchPolicy: "cache-and-network",
  });
  const installed = useMemo(() => (data ? installedByOrigin(data.bloks) : null), [data]);
  return <Grid bloks={bloks} installed={installed} />;
};

/**
 * Repository bloks as tiles. Whether each is installed is rekuest's to say;
 * without rekuest they are listed, not installable.
 */
export const RepoBlokGrid = ({ bloks }: { bloks: StoreRepoBlokFragment[] }) => (
  <RekuestGuard fallback={<Grid bloks={bloks} installed={null} />}>
    <InstalledGrid bloks={bloks} />
  </RekuestGuard>
);

/** The store's "From repositories" section; nothing when no repository publishes a matching blok. */
export const RepoBlokSection = ({
  bloks,
  limit,
  onShowAll,
}: {
  bloks: StoreRepoBlokFragment[];
  /** Show at most this many, with a button to the rest. */
  limit?: number;
  onShowAll?: () => void;
}) => {
  if (bloks.length === 0) return null;
  const shown = limit === undefined ? bloks : bloks.slice(0, limit);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight">From repositories</h3>
          <p className="text-xs text-muted-foreground">
            Bloks published on GitHub: install one to make it yours and bind it to your agents.
          </p>
        </div>
        {shown.length < bloks.length && onShowAll ? (
          <Button variant="ghost" size="sm" className="rounded-full" onClick={onShowAll}>
            All {bloks.length} <ArrowRight />
          </Button>
        ) : (
          <Badge variant="secondary">{bloks.length}</Badge>
        )}
      </div>
      <RepoBlokGrid bloks={shown} />
    </section>
  );
};
