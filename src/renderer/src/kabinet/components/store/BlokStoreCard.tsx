import { CachedBlokPreview } from "@arkitektio/bsx/preview/CachedBlokPreview";
import { BlokAssetHostProvider } from "@arkitektio/bsx/renderer/assets";
import { useDialog } from "@/core/dialogs/registry";
import { KabinetRelease, RekuestBlok } from "@/core/linkers";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import { ComponentContext as RekuestContext, useListBloksQuery } from "@/rekuest/api/graphql";
import { RekuestGuard } from "@/rekuest/api/hooks";
import { isLogoContext } from "@/rekuest/components/blokContexts";
import { RekuestBlokPreview } from "@/rekuest/components/preview/RekuestBlokPreview";
import { AlertTriangle, ArrowRight, Box, Download, LayoutPanelTop, Users } from "lucide-react";
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ComponentContext } from "../../api/graphql";
import { AppIcon } from "../AppIcon";
import { asAssets, useInspectedAssetHost } from "../bloks/FlavourBloks";
import { KABINET_CACHE_PREFIX, useKabinetBlokTree } from "../logo/KabinetBlokLogo";
import { InstallButton } from "./StoreParts";
import { StoreAppBlok } from "./storeModel";

/** kabinet and rekuest spell the context alike; both enums are strings. */
export const KIND = (context: ComponentContext | RekuestContext) =>
  context === ComponentContext.Scene
    ? { label: "Scene", icon: Box }
    : { label: "Panel", icon: LayoutPanelTop };

/** `layer_picker` → "Layer picker": an app's blok has a key, not a name. */
const titleOf = (key: string) => {
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/**
 * The shell both kinds of blok tile share: the preview on top, then what it
 * is, where it comes from and how to get it.
 */
export const BlokTile = ({
  to,
  preview,
  title,
  description,
  context,
  origin,
  action,
}: {
  to: string;
  preview: React.ReactNode;
  title: string;
  description?: string | null;
  context: ComponentContext | RekuestContext;
  origin: React.ReactNode;
  action: React.ReactNode;
}) => {
  const kind = KIND(context);
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5",
      )}
    >
      <Link to={to} className="relative block border-b">
        {preview}
        <Badge variant="secondary" className="absolute left-2 top-2 gap-1 shadow-sm">
          <kind.icon className="size-3" />
          {kind.label}
        </Badge>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <Link to={to} className="block truncate text-sm font-semibold hover:underline">
            {title}
          </Link>
          <p className="line-clamp-2 min-h-[2.5em] text-xs text-muted-foreground">
            {description || "No description."}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[0.65rem] text-muted-foreground">
            {origin}
          </div>
          {action}
        </div>
      </div>
    </div>
  );
};

export const PREVIEW_BOX = "aspect-[8/5] w-full bg-muted/40";

/**
 * A panel or scene an app brings. It is drawn against its demo state with the
 * files its flavour declares (known, not stored), like the release's Bloks
 * tab, so both keep the same drawing. Getting it installs its app.
 */
export const AppBlokCard = React.memo(({ app, blok }: StoreAppBlok) => {
  const flavour = app.flavours.find((f) => f.id === blok.flavourId);
  const assets = useMemo(() => asAssets(flavour?.assets), [flavour]);
  const assetHost = useInspectedAssetHost(assets);
  const kind = KIND(blok.context);

  return (
    <BlokTile
      to={`${KabinetRelease.linkBuilder(app.latest.id)}?tab=bloks`}
      context={blok.context}
      title={titleOf(blok.key)}
      description={blok.description}
      preview={
        blok.parseError ? (
          <div className={cn(PREVIEW_BOX, "flex items-center justify-center text-amber-500")}>
            <AlertTriangle className="size-8" aria-label="This blok does not parse" />
          </div>
        ) : (
          <BlokAssetHostProvider value={assetHost}>
            <CachedBlokPreview
              cacheId={`${KABINET_CACHE_PREFIX}${blok.id}`}
              hash={blok.hash}
              useTree={useKabinetBlokTree}
              className={PREVIEW_BOX}
              fallback={
                <div className="flex size-full items-center justify-center text-muted-foreground/30">
                  <kind.icon className="size-10" />
                </div>
              }
            />
          </BlokAssetHostProvider>
        )
      }
      origin={
        <>
          <AppIcon app={app} size={16} className="size-4 rounded text-[0.4rem]" />
          <span className="truncate">{app.name}</span>
        </>
      }
      action={<InstallButton release={app.latest} label="Get app" />}
    />
  );
});

type CustomBlok = { id: string; name: string; description?: string | null; hash: string; context: RekuestContext };

/** A blok made in the organization (rekuest): installing it materializes it with agents you pick. */
const CustomBlokCard = React.memo(({ blok }: { blok: CustomBlok }) => {
  const { openDialog } = useDialog();
  return (
    <RekuestBlok.Smart object={blok}>
      <BlokTile
        to={RekuestBlok.linkBuilder(blok.id)}
        context={blok.context}
        title={blok.name}
        description={blok.description}
        preview={<RekuestBlokPreview blok={blok} className={PREVIEW_BOX} />}
        origin={
          <>
            <Users className="size-3.5 shrink-0" />
            <span className="truncate">Your organization</span>
          </>
        }
        action={
          <Button
            size="sm"
            className="rounded-full"
            onClick={() => openDialog("materializeblok", { id: blok.id })}
          >
            <Download />
            Install
          </Button>
        }
      />
    </RekuestBlok.Smart>
  );
});

/**
 * The bloks people in the organization made: only these are materialized by
 * hand. One installed from a repository that still publishes it is that
 * repository's tile instead (`listedOrigins`); one whose repository dropped
 * it stays here.
 */
const useCustomBloks = (search: string, listedOrigins?: ReadonlySet<string>): CustomBlok[] | undefined => {
  const { data } = useListBloksQuery({
    variables: { filters: { provided: false } },
    fetchPolicy: "cache-and-network",
  });
  return useMemo(() => {
    if (!data) return undefined;
    const needle = search.trim().toLowerCase();
    return data.bloks.filter(
      (blok) =>
        !isLogoContext(blok.context) &&
        !(blok.origin && listedOrigins?.has(blok.origin)) &&
        (!needle ||
          blok.name.toLowerCase().includes(needle) ||
          !!blok.description?.toLowerCase().includes(needle)),
    );
  }, [data, search, listedOrigins]);
};

export const BLOK_GRID = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

type CustomBlokSectionProps = {
  search: string;
  title: string;
  description: string;
  /** Show at most this many, with a button to the rest. */
  limit?: number;
  onShowAll?: () => void;
  /** The origins of the repository bloks the store lists: their installed copies are shown there. */
  listedOrigins?: ReadonlySet<string>;
};

const CustomBlokSectionInner = ({ search, title, description, limit, onShowAll, listedOrigins }: CustomBlokSectionProps) => {
  const bloks = useCustomBloks(search, listedOrigins);
  if (!bloks?.length) return null;
  const shown = limit === undefined ? bloks : bloks.slice(0, limit);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {shown.length < bloks.length && onShowAll ? (
          <Button variant="ghost" size="sm" className="rounded-full" onClick={onShowAll}>
            All {bloks.length} <ArrowRight />
          </Button>
        ) : (
          <Badge variant="secondary">{bloks.length}</Badge>
        )}
      </div>
      <div className={BLOK_GRID}>
        {shown.map((blok) => (
          <CustomBlokCard key={blok.id} blok={blok} />
        ))}
      </div>
    </section>
  );
};

/**
 * The organization's own bloks, where rekuest runs: they live there, and so
 * does materializing them. Nothing shows without it.
 */
export const CustomBlokSection = (props: CustomBlokSectionProps) => (
  <RekuestGuard fallback={null}>
    <CustomBlokSectionInner {...props} />
  </RekuestGuard>
);

/** The app bloks, as a grid of tiles. */
export const AppBlokGrid = ({ bloks }: { bloks: StoreAppBlok[] }) => (
  <div className={BLOK_GRID}>
    {bloks.map(({ app, blok }) => (
      <AppBlokCard key={`${app.identifier}:${blok.key}`} app={app} blok={blok} />
    ))}
  </div>
);

