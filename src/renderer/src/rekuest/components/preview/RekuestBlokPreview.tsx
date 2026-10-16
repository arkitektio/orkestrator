import * as React from "react";
import { CachedBlokPreview } from "@/core/blok/preview/CachedBlokPreview";
import { cn } from "@/core/util/utils";
import { ComponentContext } from "@/rekuest/api/graphql";
import { RekuestAssetHost } from "@/rekuest/scene/RekuestAssetHost";
import { RekuestSceneHost } from "@/rekuest/scene/RekuestSceneHost";
import { BLOK_CONTEXTS, isLogoContext } from "@/rekuest/components/blokContexts";
import { BlokLogo, useRekuestBlokTree } from "@/rekuest/components/logo/BlokLogo";

export type PreviewedBlok = { id: string; hash: string; context: ComponentContext };

const NO_AGENTS: ReadonlyMap<string, string> = new Map();

/** The agents a preview's dependencies are bound to: where its models and images come from. */
const PreviewAgents = React.createContext<ReadonlyMap<string, string>>(NO_AGENTS);

/** rekuest's scene host, with the assets of the agents the preview was given (none for a bare blok). */
const PreviewHost = ({ children }: { children: React.ReactNode }) => (
  <RekuestSceneHost>
    <RekuestAssetHost agents={React.useContext(PreviewAgents)}>{children}</RekuestAssetHost>
  </RekuestSceneHost>
);

/**
 * What a blok looks like, for a card: its demo state drawn once and kept
 * (`CachedBlokPreview`). A logo is its cached SVG, centred; a panel or scene
 * its preview, with its context's icon until the first drawing is kept.
 */
export const RekuestBlokPreview = ({
  blok,
  agents = NO_AGENTS,
  fit = "width",
  className,
}: {
  blok: PreviewedBlok;
  /**
   * Dependency key to agent id. A blok whose scene loads a model, or whose
   * panel shows an image, is only kept once an agent holds that file: a bare
   * blok's such preview is drawn by the first materialized blok that binds one.
   */
  agents?: ReadonlyMap<string, string>;
  /** `width` for a box of the preview's own aspect, `cover` for a card's background. */
  fit?: "width" | "cover";
  className?: string;
}) => {
  const box = cn("bg-muted/40", fit === "width" && "aspect-[8/5] w-full", className);
  if (isLogoContext(blok.context)) {
    return (
      <div className={cn(box, "flex items-center justify-center")}>
        <BlokLogo blok={blok} className="size-24" />
      </div>
    );
  }
  const Icon = BLOK_CONTEXTS[blok.context]?.icon;
  const binding = [...agents].map(([key, agent]) => `${key}=${agent}`).sort().join(",");
  return (
    <PreviewAgents.Provider value={agents}>
      <CachedBlokPreview
        cacheId={blok.id}
        hash={blok.hash}
        binding={binding}
        useTree={useRekuestBlokTree}
        Host={PreviewHost}
        fit={fit}
        className={box}
        fallback={
          Icon && (
            <div className="flex size-full items-center justify-center text-muted-foreground/25">
              <Icon className="size-12" />
            </div>
          )
        }
      />
    </PreviewAgents.Provider>
  );
};

/**
 * A blok's preview as the background of a card: it fills the card, and fades
 * into the card's colour towards the bottom, where the card's text sits. The
 * card is `relative isolate` and lays its text out from the bottom.
 */
export const BlokCardBackdrop = ({
  blok,
  agents,
}: {
  blok: PreviewedBlok;
  agents?: ReadonlyMap<string, string>;
}) => (
  <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
    <RekuestBlokPreview blok={blok} agents={agents} fit="cover" className="absolute inset-0" />
    <div className="absolute inset-0 bg-gradient-to-t from-card from-35% via-card/70 to-card/0" />
  </div>
);

export default RekuestBlokPreview;
