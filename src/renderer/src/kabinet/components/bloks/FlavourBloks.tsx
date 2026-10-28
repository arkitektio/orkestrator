import { demoModel, parseBlokDeclarations } from "@arkitektio/bsx/renderer/declarations";
import * as React from "react";
import { AlertTriangle, Box, LayoutPanelTop, Loader2 } from "lucide-react";
import { CachedBlokLogo, type LogoTree } from "@arkitektio/bsx/logo/CachedBlokLogo";
import { CachedBlokPreview } from "@arkitektio/bsx/preview/CachedBlokPreview";
import BlokRenderer from "@arkitektio/bsx/renderer/BlokRenderer";
import {
  ASSET_KIND_LABELS,
  BlokAssetHostProvider,
  type BlokAsset,
  type BlokAssetHost,
  type BlokAssetKind,
} from "@arkitektio/bsx/renderer/assets";
import { normalizeBlokComponentTree } from "@arkitektio/bsx/renderer/runtime/index";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { formatBytes } from "@/core/smart/display/DisplayLine";
import { AsyncBoundary } from "@/core/ui/AsyncBoundary";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { ComponentContext, KabinetBlokFragment, useFlavourBloksQuery } from "@/kabinet/api/graphql";

/**
 * What a flavour's app brings: its logo, its actions' logos, its panels and
 * scenes, each drawn against its demo state, and the files they name.
 *
 * Nothing here runs: no agent is bound, so every action a blok would take is
 * refused, and an asset is only described (an app's files are stored when it
 * is installed and runs, not before).
 */

/** Previews never act. */
const REFUSE_EVERY_ACTION = () => true;

/** One file of `Flavour.assets`, as its inspection declared it. */
export type InspectedAsset = {
  name: string;
  kind: BlokAssetKind;
  ref: string;
  size?: number | null;
  source?: string | null;
  path?: string | null;
};

export const asAssets = (value: unknown): InspectedAsset[] =>
  Array.isArray(value)
    ? value.filter(
        (asset): asset is InspectedAsset =>
          typeof asset === "object" && asset !== null && typeof asset.name === "string" && typeof asset.kind === "string",
      )
    : [];

const hostOf = (source: string): string => {
  try {
    return new URL(source).host;
  } catch {
    return source;
  }
};

/** Answers `self.assets.<name>` from what the flavour declares: known, not stored. */
export const useInspectedAssetHost = (assets: InspectedAsset[]): BlokAssetHost =>
  React.useMemo(() => {
    const byName = new Map(assets.map((asset) => [asset.name, asset]));
    return {
      useAsset: (_dependency: string, name: string): BlokAsset => {
        const asset = byName.get(name);
        if (!asset) return { status: "unknown", reason: `The app declares no asset named "${name}".` };
        return {
          status: "awaited",
          kind: asset.kind,
          source: asset.source ? { host: hostOf(asset.source), canAdd: false } : undefined,
        };
      },
    };
  }, [assets]);

/** The tab's own logos: their trees are already here, so a first drawing fetches nothing. */
const TreesContext = React.createContext<ReadonlyMap<string, LogoTree>>(new Map());
const useTabTree = (cacheId: string) => React.useContext(TreesContext).get(cacheId) ?? null;

const TabLogo = ({ blok, className }: { blok: KabinetBlokFragment; className?: string }) => (
  <CachedBlokLogo cacheId={`kabinet:${blok.id}`} hash={blok.hash} useTree={useTabTree} className={className} />
);

const ParseFailure = ({ blok }: { blok: KabinetBlokFragment }) => (
  <StatusPage
    variant="compact"
    tone="warning"
    icon={AlertTriangle}
    eyebrow={blok.key}
    title="This blok does not parse"
    description="Its app sent BSX that kabinet could not read, so there is nothing to draw."
    technical={blok.parseError}
  />
);

const RenderFailure = ({ error }: { error: Error }) => (
  <StatusPage
    variant="compact"
    tone="warning"
    icon={AlertTriangle}
    title="This blok could not be drawn"
    technical={error.message}
  />
);

/** A panel or a scene, drawn live against its demo state. */
const BlokPreview = ({ blok }: { blok: KabinetBlokFragment }) => {
  const roots = React.useMemo(
    () => normalizeBlokComponentTree((blok.componentTree as unknown[] | null) ?? null).roots,
    [blok.componentTree],
  );
  const initialState = React.useMemo(() => demoModel(roots, parseBlokDeclarations(blok)), [roots, blok]);
  return (
    <AsyncBoundary loadingFallback={null} errorFallback={(error) => <RenderFailure error={error} />}>
      <BlokRenderer
        surfaceId={`kabinet-preview-${blok.id}`}
        uiComponents={roots}
        initialState={initialState}
        chrome="minimal"
        refuseAction={REFUSE_EVERY_ACTION}
      />
    </AsyncBoundary>
  );
};

const Section = ({ title, count, children }: { title: string; count: number; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h3 className="flex items-center gap-2 text-sm font-semibold">
      {title}
      <span className="font-normal text-muted-foreground">{count}</span>
    </h3>
    {children}
  </section>
);

const BlokHeading = ({ blok }: { blok: KabinetBlokFragment }) => (
  <div className="flex min-w-0 items-baseline gap-2">
    <span className="truncate font-mono text-xs">{blok.key}</span>
    {blok.default && <Badge variant="outline">default</Badge>}
    {blok.description && <span className="truncate text-xs text-muted-foreground">{blok.description}</span>}
  </div>
);

const AppLogos = ({ logos }: { logos: KabinetBlokFragment[] }) => (
  <div className="flex flex-wrap gap-6">
    {logos.map((blok) => (
      <div key={blok.id} className="flex flex-col gap-2">
        {blok.parseError ? (
          <ParseFailure blok={blok} />
        ) : (
          <div className="flex items-end gap-4">
            <TabLogo blok={blok} className="size-32 rounded-3xl" />
            <TabLogo blok={blok} className="size-14 rounded-2xl" />
            <TabLogo blok={blok} className="size-8 rounded-lg" />
            <TabLogo blok={blok} className="size-5 rounded" />
          </div>
        )}
        <BlokHeading blok={blok} />
      </div>
    ))}
  </div>
);

const ActionLogos = ({ logos, drawnFor }: { logos: KabinetBlokFragment[]; drawnFor: Map<string, string[]> }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
    {logos.map((blok) => {
      const actions = drawnFor.get(blok.id) ?? [];
      return (
        <div key={blok.id} className="flex flex-col items-center gap-2 rounded-xl border p-3 text-center">
          {blok.parseError ? (
            <AlertTriangle className="size-12 text-amber-500" aria-label={blok.parseError} />
          ) : (
            <TabLogo blok={blok} className="size-12" />
          )}
          <span className="line-clamp-2 text-xs font-medium">{actions.length ? actions.join(", ") : blok.key}</span>
          {actions.length > 0 && <span className="truncate font-mono text-[0.65rem] text-muted-foreground">{blok.key}</span>}
        </div>
      );
    })}
  </div>
);

/**
 * A panel or a scene, as its kept preview (drawn once against its demo state);
 * "Show live" runs it instead, at full size.
 */
const PreviewCell = ({ blok, scene }: { blok: KabinetBlokFragment; scene?: boolean }) => {
  const [live, setLive] = React.useState(false);
  const Icon = scene ? Box : LayoutPanelTop;
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", live && "col-span-full")}>
      <div className="flex items-center justify-between gap-2">
        <BlokHeading blok={blok} />
        {!blok.parseError && (
          <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-xs" onClick={() => setLive((now) => !now)}>
            {live ? "Show preview" : "Show live"}
          </Button>
        )}
      </div>
      {blok.parseError ? (
        <ParseFailure blok={blok} />
      ) : live ? (
        <div className={cn("overflow-auto rounded-xl border", scene ? "h-[28rem]" : "max-h-[32rem] p-3")}>
          <BlokPreview blok={blok} />
        </div>
      ) : (
        <CachedBlokPreview
          cacheId={`kabinet:${blok.id}`}
          hash={blok.hash}
          useTree={useTabTree}
          className="aspect-[8/5] w-full rounded-xl border bg-muted/40"
          fallback={
            <div className="flex size-full items-center justify-center text-muted-foreground/40">
              <Icon className="size-8" />
            </div>
          }
        />
      )}
    </div>
  );
};

const Previews = ({ bloks, scene }: { bloks: KabinetBlokFragment[]; scene?: boolean }) => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
    {bloks.map((blok) => (
      <PreviewCell key={blok.id} blok={blok} scene={scene} />
    ))}
  </div>
);

const AssetTable = ({ assets }: { assets: InspectedAsset[] }) => (
  <div className="overflow-x-auto rounded-xl border">
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-muted-foreground">
        <tr className="border-b">
          <th className="px-3 py-2 font-medium">Name</th>
          <th className="px-3 py-2 font-medium">Kind</th>
          <th className="px-3 py-2 font-medium">Size</th>
          <th className="px-3 py-2 font-medium">Where</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.name} className="border-b last:border-0">
            <td className="px-3 py-2 font-mono text-xs">{asset.name}</td>
            <td className="px-3 py-2">{ASSET_KIND_LABELS[asset.kind] ?? asset.kind}</td>
            <td className="px-3 py-2 tabular-nums">{formatBytes(asset.size) ?? "—"}</td>
            <td className="px-3 py-2 text-xs text-muted-foreground" title={asset.ref}>
              {asset.path ? (
                <span className="font-mono">{asset.path}</span>
              ) : asset.source ? (
                <>fetched from <span className="font-mono">{hostOf(asset.source)}</span></>
              ) : (
                "—"
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const byContext = (bloks: KabinetBlokFragment[], context: ComponentContext) =>
  bloks.filter((blok) => blok.context === context);

/** The bloks and files of flavour `flavourId`, grouped by what they draw. */
export const FlavourBloks = ({ flavourId }: { flavourId: string }) => {
  const { data, error, loading, refetch } = useFlavourBloksQuery({ variables: { id: flavourId } });
  const flavour = data?.flavour;
  const bloks = React.useMemo(() => flavour?.blokImplementations ?? [], [flavour]);
  const assets = React.useMemo(() => asAssets(flavour?.assets), [flavour]);
  const assetHost = useInspectedAssetHost(assets);
  const trees = React.useMemo(
    () =>
      new Map(
        bloks.map((blok) => [
          `kabinet:${blok.id}`,
          { ...parseBlokDeclarations(blok), componentTree: blok.componentTree, hash: blok.hash },
        ]),
      ),
    [bloks],
  );
  const drawnFor = React.useMemo(() => {
    const map = new Map<string, string[]>();
    for (const definition of flavour?.definitions ?? []) {
      if (!definition.logo) continue;
      map.set(definition.logo.id, [...(map.get(definition.logo.id) ?? []), definition.name]);
    }
    return map;
  }, [flavour]);

  if (error) return <QueryError error={error} onRetry={() => void refetch()} />;
  if (loading && !flavour) return <Loader2 className="size-5 animate-spin text-muted-foreground" />;

  const logos = byContext(bloks, ComponentContext.Logo);
  const actionLogos = byContext(bloks, ComponentContext.ActionLogo);
  const panels = byContext(bloks, ComponentContext.Html);
  const scenes = byContext(bloks, ComponentContext.Scene);

  return (
    <TreesContext.Provider value={trees}>
      <BlokAssetHostProvider value={assetHost}>
        <div className="flex flex-col gap-8">
          {logos.length > 0 && (
            <Section title="App logo" count={logos.length}>
              <AppLogos logos={logos} />
            </Section>
          )}
          {actionLogos.length > 0 && (
            <Section title="Action logos" count={actionLogos.length}>
              <ActionLogos logos={actionLogos} drawnFor={drawnFor} />
            </Section>
          )}
          {panels.length > 0 && (
            <Section title="Panels" count={panels.length}>
              <Previews bloks={panels} />
            </Section>
          )}
          {scenes.length > 0 && (
            <Section title="Scenes" count={scenes.length}>
              <Previews bloks={scenes} scene />
            </Section>
          )}
          {assets.length > 0 && (
            <Section title="Assets" count={assets.length}>
              <AssetTable assets={assets} />
            </Section>
          )}
        </div>
      </BlokAssetHostProvider>
    </TreesContext.Provider>
  );
};

/** Whether a flavour brings anything the Bloks tab shows. */
export const bringsBloks = (flavour: { blokKeys: readonly unknown[]; assets: unknown }): boolean =>
  flavour.blokKeys.length > 0 || asAssets(flavour.assets).length > 0;

/**
 * A release's bloks: one flavour's at a time, since each build declares its
 * own. Only the builds that bring any are offered.
 */
export const ReleaseBloks = ({
  flavours,
}: {
  flavours: readonly { id: string; name: string; blokKeys: readonly unknown[]; assets: unknown }[];
}) => {
  const offered = flavours.filter(bringsBloks);
  const [chosen, setChosen] = React.useState<string | undefined>(offered[0]?.id);
  const current = offered.find((flavour) => flavour.id === chosen) ?? offered[0];
  if (!current) return null;
  return (
    <div className="flex flex-col gap-4">
      {offered.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {offered.map((flavour) => (
            <Button
              key={flavour.id}
              size="sm"
              variant={flavour.id === current.id ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setChosen(flavour.id)}
            >
              {flavour.name}
            </Button>
          ))}
        </div>
      )}
      <FlavourBloks flavourId={current.id} />
    </div>
  );
};

export default FlavourBloks;
