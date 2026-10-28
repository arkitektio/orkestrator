import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDownIcon, SearchIcon, TriangleAlert, XIcon } from "lucide-react";

import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { classifyError } from "@/core/layout/fallbacks/classifyError";
import { RetryButton } from "@/core/layout/fallbacks/statusActions";
import { SmartMenu, TILE_SKIN, useSmartMenu } from "@/core/smart/ObjectButton";
import type { SmartSectionSelection } from "@/core/smart/extensions/section";
import type { SmartContextProps } from "@/core/smart/extensions/types";
import { structure } from "@/core/smart/structure";
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
import {
  useEnsureArrayLensMutation,
  useGetAnnotationActionDescriptorsQuery,
} from "@/mikro/api/graphql";

import { layerDisplayLabel } from "../../../platform/layerui/layerIdentity";
import { effectiveProbeLayerId } from "../../../platform/probe/probeTargeting";
import { useSceneStore, useSceneStoreApi } from "../../../platform/stores/sceneStore";
import { useViewerStore } from "../../../platform/stores/viewerStore";
import type { SelectedRoi } from "../roiSelectionStore";
import {
  ARRAY_LENS_IDENTIFIER,
  annotationObject,
  cropLensObject,
  layerLensPartner,
  pairLayerId,
} from "./annotationActionTarget";

/**
 * Only what takes the PAIR: what runs on it, and what could be installed to
 * run on it (kabinet's Installable, asked with the same demands). By id, as
 * strings: the sections are rekuest's and kabinet's, and this module imports
 * none of it — each brings its own guard, so a deployment without them shows
 * an empty menu, not an error.
 */
const PAIR_SECTIONS: SmartSectionSelection = {
  only: ["rekuest.shortcuts", "rekuest.actions", "kabinet.definitions"],
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
 * Below them, "On the crop": the actions that take the crop of that image to
 * the shape — `f(ArrayLens, ...)` on the lens `createLens(lens:, annotation:)`
 * would return (`CropActions`).
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
  // One request for both groups: what the shape provides, and what its crop of
  // the lens would. A draw asked it already and left it in the cache
  // (`useCreateSceneAnnotation`). Picking another lens asks again; the shape's
  // own descriptors stay on screen meanwhile.
  const { data, previousData, error, refetch } = useGetAnnotationActionDescriptorsQuery({
    variables: { id: roi.id, lens: lens?.id ?? "" },
    skip: !lens,
  });
  const answered =
    data?.annotation ?? (previousData?.annotation.id === roi.id ? previousData.annotation : undefined);
  const descriptors = answered?.descriptors;
  /** Undefined until answered for THIS lens; null when the shape misses it. */
  const cut = data?.annotation.descriptorsUnder;
  const objects = useMemo(() => [annotationObject(roi, descriptors)], [roi, descriptors]);
  const partners = useMemo(() => (lens ? [lens] : []), [lens]);
  // The one search filters both groups.
  const [filter, setFilter] = useState<string | undefined>(undefined);

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
    <>
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
        onFilterChange={setFilter}
        onDone={onDone}
      />
      <CropActions roi={roi} lens={lens} descriptors={cut} filter={filter} onDone={onDone} />
    </>
  );
};

const PairMenu = ({
  objects,
  partners,
  imageLabel,
  picker,
  autoFocus,
  onFilterChange,
  onDone,
}: {
  objects: Structure[];
  partners: Structure[];
  imageLabel: string;
  picker: ReactNode;
  autoFocus: boolean;
  onFilterChange: (filter: string | undefined) => void;
  onDone: () => void;
}) => {
  const menu = useSmartMenu({ objects, partners, sections: PAIR_SECTIONS, autoFocus, onDone });
  useEffect(() => onFilterChange(menu.filter), [menu.filter, onFilterChange]);
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
 * "On the crop": the actions that take the crop of `lens` to the shape, before
 * the crop exists. mikro says what the crop would provide (`descriptorsUnder`,
 * the same cut `createLens(lens:, annotation:)` makes), so a port's `Requires`
 * narrows the list as on a real lens — a z-pinned rectangle on a volume crops
 * to an IMAGE. Nothing is made to list them: the crop is made when one of them
 * runs (`materialize`, awaited by every run path), once per lens and shape —
 * the server hands the same lens back for the same cut anyway.
 *
 * A shape that misses the lens has no crop, and the group says so.
 */
const CropActions = ({
  roi,
  lens,
  descriptors,
  filter,
  onDone,
}: {
  roi: SelectedRoi;
  lens: Structure;
  descriptors: unknown;
  filter: string | undefined;
  onDone: () => void;
}) => {
  // Still asking for this lens: nothing to offer yet.
  if (descriptors === undefined) return null;
  return (
    <div className="mt-1.5 border-t border-border/60 pt-1.5">
      <p className="truncate px-1 text-[11px] text-muted-foreground">
        On the crop to this shape
      </p>
      {descriptors === null ? (
        <p className="px-1 py-1 text-xs text-muted-foreground">
          This shape lies outside {lens.label ?? "this image"}.
        </p>
      ) : (
        <CropMenu roi={roi} lens={lens} descriptors={descriptors} filter={filter} onDone={onDone} />
      )}
    </div>
  );
};

const CropMenu = ({
  roi,
  lens,
  descriptors,
  filter,
  onDone,
}: {
  roi: SelectedRoi;
  lens: Structure;
  descriptors: unknown;
  filter: string | undefined;
  onDone: () => void;
}) => {
  const crop = useMemo(() => cropLensObject(roi, lens, descriptors), [roi, lens, descriptors]);
  const objects = useMemo(() => [crop], [crop]);
  const [ensureLens] = useEnsureArrayLensMutation({
    // The shape's card lists what was cut from it.
    refetchQueries: ["GetAnnotationInfo"],
  });
  const made = useRef<{ key: string; lens: Promise<Structure> } | null>(null);

  const materialize = useCallback<NonNullable<SmartContextProps["materialize"]>>(async () => {
    const key = crop.id;
    if (made.current?.key !== key) {
      const pending: Promise<Structure> = ensureLens({
        variables: { input: { lens: lens.id, annotation: roi.id } },
      }).then(
        ({ data }) => {
          const id = data?.createLens.id;
          if (!id) throw new Error("Could not make the crop: mikro answered no lens.");
          return structure(ARRAY_LENS_IDENTIFIER, id, {
            label: crop.label,
            descriptors: crop.descriptors,
          });
        },
        (error: unknown) => {
          // Not remembered: the next run asks again.
          if (made.current?.lens === pending) made.current = null;
          throw new Error(`Could not make the crop: ${classifyError(error).message}`);
        },
      );
      made.current = { key, lens: pending };
    }
    return { objects: [await made.current.lens], partners: [] };
  }, [crop, ensureLens, lens.id, roi.id]);

  const menu = useSmartMenu({
    objects,
    partners: [],
    sections: PAIR_SECTIONS,
    materialize,
    autoFocus: false,
    onDone,
  });
  const { setFilter } = menu;
  useEffect(() => setFilter(filter), [filter, setFilter]);

  return (
    <SmartMenu.Root menu={menu} skin={TILE_SKIN}>
      <SmartMenu.Body className="rounded-none bg-transparent p-0">
        <SmartMenu.Progress />
        <SmartMenu.List className="mt-1 max-h-64 p-0.5">
          <SmartMenu.Pinned />
          <SmartMenu.Sections />
          <SmartMenu.Empty>Nothing runs on this crop</SmartMenu.Empty>
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
