import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDownIcon, SearchIcon, TriangleAlert, XIcon } from "lucide-react";

import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { classifyError } from "@/core/layout/fallbacks/classifyError";
import { RetryButton } from "@/core/layout/fallbacks/statusActions";
import { SmartMenu, TILE_SKIN, useSmartMenu } from "@/core/smart/ObjectButton";
import type { SmartSectionSelection } from "@/core/smart/extensions/section";
import type { Structure } from "@/core/types";
import { Button } from "@/core/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { useGetAnnotationDescriptorsQuery } from "@/mikro/api/graphql";

import { layerDisplayLabel } from "../../../platform/layerui/layerIdentity";
import { effectiveProbeLayerId } from "../../../platform/probe/probeTargeting";
import { useSceneStore, useSceneStoreApi } from "../../../platform/stores/sceneStore";
import { useViewerStore } from "../../../platform/stores/viewerStore";
import type { SelectedRoi } from "../roiSelectionStore";
import { annotationObject, layerLensPartner, pairLayerId } from "./annotationActionTarget";

/**
 * Only what takes the PAIR. By id, as strings: the sections are rekuest's,
 * and this module imports none of it — each brings its own guard, so a
 * deployment without rekuest shows an empty menu, not an error.
 */
const PAIR_SECTIONS: SmartSectionSelection = {
  only: ["rekuest.shortcuts", "rekuest.actions"],
};

/**
 * The actions of the annotation card (`AnnotationHoverCard`): the ones that
 * take this annotation and the image under it — `f(Annotation, ArrayLens,
 * ...)`, in that order, whatever they are called. (The Run and Shortcuts
 * sections match the two leading ports and let an action carry further
 * arguments, as on every drop.) Both sides
 * go out with the descriptors they provide (`annotationActionTarget`), so a
 * port's `Requires` narrows the list: an action wanting a rectangle is not
 * offered on a point, one wanting a single-channel image not against a stack.
 *
 * "The image under it" starts as the lens the probe reads — the pinned layer,
 * else the first visible one — the same rule as the probe readout. The "Run
 * with" picker swaps it for any other layer's lens, hidden ones too, for this
 * card only: it does not move the probe pin.
 *
 * Drawn for the card, not as the right-click menu: the actions are tiles
 * (`TILE_SKIN`), the image they run with is the picker's one muted line, and the
 * search waits behind a magnifier — open at once when the card was opened by
 * a click (`autoFocus`), where typing is meant for it.
 *
 * The shape's FULL menu (delete, open, ..., no partner) is the card header's
 * ellipsis and the viewport's right-click.
 */
export const AnnotationPairActions = ({
  roi,
  autoFocus,
  onDone,
}: {
  roi: SelectedRoi;
  /** Whether the search takes focus: not while a key may still be held (a
   * draw), and not on a hover, where typing belongs to the scene. */
  autoFocus: boolean;
  onDone: () => void;
}) => {
  const probeLayerId = useViewerStore((s) => s.probeLayerId);
  const [pickedLayerId, setPickedLayerId] = useState<string | null>(null);
  // A scalar subscription (the target's id), then a `getState()` read: a
  // whole-array subscription would re-render on every layer edit.
  const sceneApi = useSceneStoreApi();
  const probedLayerId = useSceneStore((s) => effectiveProbeLayerId(probeLayerId, s.layers));
  const targetLayerId = useSceneStore((s) => pairLayerId(pickedLayerId, probeLayerId, s.layers));
  const lens = useMemo(() => {
    const layers = sceneApi.getState().layers;
    return layerLensPartner(targetLayerId, layers, (layerId) => {
      const layer = layers.find((candidate) => candidate.id === layerId);
      return layer ? layerDisplayLabel(layer) : undefined;
    });
  }, [targetLayerId, sceneApi]);
  const { data, error, refetch } = useGetAnnotationDescriptorsQuery({ variables: { id: roi.id } });
  const descriptors = data?.annotation.descriptors;
  const objects = useMemo(() => [annotationObject(roi, descriptors)], [roi, descriptors]);
  const partners = useMemo(() => (lens ? [lens] : []), [lens]);

  if (error) {
    return (
      <StatusPage
        variant="compact"
        icon={TriangleAlert}
        tone="warning"
        title="Could not read this annotation"
        description={classifyError(error).message}
        actions={<RetryButton onRetry={() => refetch()} />}
      />
    );
  }
  if (!lens) {
    return (
      <p className="px-2 py-1 text-xs text-muted-foreground">
        No image layer to run with. Show one, or pin it as the probe target.
      </p>
    );
  }
  if (descriptors === undefined) {
    return <p className="px-2 py-1 text-xs text-muted-foreground">Loading…</p>;
  }
  return (
    <PairMenu
      objects={objects}
      partners={partners}
      imageLabel={lens.label ?? "this image"}
      picker={
        <LensPicker
          layerId={targetLayerId}
          probedLayerId={probedLayerId}
          label={lens.label ?? "this image"}
          onPick={setPickedLayerId}
        />
      }
      autoFocus={autoFocus}
      onDone={onDone}
    />
  );
};

const PairMenu = ({
  objects,
  partners,
  imageLabel,
  picker,
  autoFocus,
  onDone,
}: {
  objects: Structure[];
  partners: Structure[];
  imageLabel: string;
  picker: ReactNode;
  autoFocus: boolean;
  onDone: () => void;
}) => {
  const menu = useSmartMenu({ objects, partners, sections: PAIR_SECTIONS, autoFocus, onDone });
  const [searching, setSearching] = useState(autoFocus);
  const stopSearching = () => {
    setSearching(false);
    menu.setFilter(undefined);
  };

  return (
    <SmartMenu.Root menu={menu} skin={TILE_SKIN}>
      <SmartMenu.Body className="rounded-none bg-transparent p-0">
        <div
          className="flex min-h-6 items-center gap-1 pl-1"
          // Escape folds the search first; the card's own Escape is the next one.
          onKeyDown={(event) => {
            if (event.key !== "Escape" || !searching) return;
            event.preventDefault();
            stopSearching();
          }}
        >
          {searching ? (
            <>
              <div className="min-w-0 flex-1">
                <SmartMenu.Search
                  placeholder={`Run with ${imageLabel}…`}
                  className="h-7 text-xs"
                  autoFocus
                />
              </div>
              <Button variant="ghost" size="icon-xs" aria-label="Close search" onClick={stopSearching}>
                <XIcon />
              </Button>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">{picker}</div>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Search actions"
                onClick={() => setSearching(true)}
              >
                <SearchIcon />
              </Button>
            </>
          )}
        </div>
        <SmartMenu.Progress />
        <SmartMenu.List className="mt-1 max-h-64 p-0.5">
          <SmartMenu.Pinned />
          <SmartMenu.Sections />
          <SmartMenu.Empty>Nothing runs on this shape with this image</SmartMenu.Empty>
        </SmartMenu.List>
      </SmartMenu.Body>
    </SmartMenu.Root>
  );
};

/**
 * "Run with: <lens>", a dropdown of every image layer of the scene. Listed
 * when it opens (a `getState()` read, like the lens above), so a layer edit
 * does not re-render a closed card. Hidden layers are offered too: an action
 * reads the lens, not what is on screen.
 *
 * It sits inside the action list's `Command`, whose keys travel React's tree,
 * portals included: Enter on a layer would also run the highlighted tile, so
 * the picker's keys stop here.
 */
const LensPicker = ({
  layerId,
  probedLayerId,
  label,
  onPick,
}: {
  layerId: string | null;
  probedLayerId: string | null;
  label: string;
  onPick: (layerId: string) => void;
}) => {
  const keepKeys = (event: KeyboardEvent) => {
    if (event.key !== "Escape") event.stopPropagation();
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onKeyDown={keepKeys}>
        <button
          type="button"
          className="flex max-w-full items-center gap-1 rounded px-1 py-0.5 text-[11px] text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Image to run with"
        >
          <span className="shrink-0">Run with:</span>
          <span className="min-w-0 truncate font-medium text-foreground">{label}</span>
          <ChevronDownIcon className="h-3 w-3 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-72" onKeyDown={keepKeys}>
        <DropdownMenuLabel className="text-xs">Run with</DropdownMenuLabel>
        <LayerOptions layerId={layerId} probedLayerId={probedLayerId} onPick={onPick} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const LayerOptions = ({
  layerId,
  probedLayerId,
  onPick,
}: {
  layerId: string | null;
  probedLayerId: string | null;
  onPick: (layerId: string) => void;
}) => {
  const sceneApi = useSceneStoreApi();
  // Mounted when the dropdown opens: the list as it is now.
  const [layers] = useState(() => sceneApi.getState().layers);
  return (
    <DropdownMenuRadioGroup value={layerId ?? undefined} onValueChange={onPick}>
      {layers.map((layer) => (
        <DropdownMenuRadioItem key={layer.id} value={layer.id} className="text-xs">
          <span className="min-w-0 flex-1 truncate">{layerDisplayLabel(layer)}</span>
          {layer.id === probedLayerId ? (
            <span className="shrink-0 text-muted-foreground">probe</span>
          ) : layer.visible === false ? (
            <span className="shrink-0 text-muted-foreground">hidden</span>
          ) : null}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
};
