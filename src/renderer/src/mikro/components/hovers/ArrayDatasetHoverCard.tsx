import { Badge } from "@/components/ui/badge";
import { MikroScene } from "@/linkers";
import { Object } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Clapperboard, Grid3x3 } from "lucide-react";
import { useGetListArrayDatasetQuery } from "../../api/graphql";
import {
  formatAxes,
  modifierSpecsOf,
  spatialSpecOf,
  splitAxesBySpec,
} from "../../specs";
import {
  HoverRow,
  HoverSectionLabel,
  HoverShell,
  HoverSkeleton,
  HoverThumb,
} from "./HoverShell";

/**
 * The hover preview for an array dataset.
 *
 * Leads with the picture, then with what the dataset structurally IS, in that
 * order and for the same reason the card does: the spatial spec is the one fact
 * that survives every dataset having a different name, and the picture is a
 * render of a whole composition rather than of this dataset alone — so it needs
 * the spec beside it to say what part of the picture is the thing being hovered.
 *
 * Reads `ListArrayDataset` through `GetListArrayDataset`, which is the same
 * fragment the datasets page already cached under this id: hovering a tile
 * there costs no round trip.
 */
export const ArrayDatasetHoverCard = ({ object }: { object: Object }) => {
  const { data, error } = useGetListArrayDatasetQuery({
    variables: { id: object.id },
    fetchPolicy: "cache-first",
  });

  if (error) {
    return (
      <div className="p-3 text-xs text-destructive">
        Could not load dataset details.
      </div>
    );
  }

  if (!data) {
    return <HoverSkeleton />;
  }

  const arrayDataset = data.arrayDataset;
  const spatial = spatialSpecOf(arrayDataset.spec);
  const modifiers = modifierSpecsOf(arrayDataset.spec);
  const axes = splitAxesBySpec(
    arrayDataset.axisNames,
    arrayDataset.shape,
    arrayDataset.spec,
  );

  const Icon = spatial?.icon ?? Grid3x3;
  const snapshot = arrayDataset.latestSnapshot;

  return (
    <HoverShell
      title={arrayDataset.name}
      subtitle={spatial?.label ?? "Array dataset"}
      icon={<Icon className="h-4 w-4 text-muted-foreground" />}
      preview={
        <HoverThumb
          media={snapshot?.store}
          alt={
            arrayDataset.defaultScene
              ? `Render of ${arrayDataset.defaultScene.name}`
              : ""
          }
          /* The hover container is a fixed `w-80`, so a height is all this
             needs; the container's own `overflow-hidden` rounds the top
             corners for it. */
          className="h-32 w-full"
        />
      }
    >
      {arrayDataset.description && (
        <p className="text-xs text-muted-foreground line-clamp-3">
          {arrayDataset.description}
        </p>
      )}

      <div className="flex flex-col gap-1">
        {/* A SCALAR genuinely has no extent — printing an empty row for it would
            read as a dataset whose shape failed to load. */}
        <HoverRow
          label="Extent"
          value={axes.spatial.length > 0 ? formatAxes(axes.spatial) : "none"}
        />
        {axes.acquisition.length > 0 && (
          <HoverRow label="Stacked" value={formatAxes(axes.acquisition)} />
        )}
        {arrayDataset.folder && (
          <HoverRow label="Folder" value={arrayDataset.folder.name} />
        )}
        {snapshot && (
          <HoverRow
            label="Rendered"
            value={formatDistanceToNow(new Date(snapshot.createdAt), {
              addSuffix: true,
            })}
          />
        )}
      </div>

      {(modifiers.length > 0 || arrayDataset.multiscale) && (
        <div className="flex flex-row flex-wrap gap-1">
          {modifiers.map((modifier) => (
            <Badge
              key={modifier.spec}
              variant="secondary"
              className="px-1 py-0 text-[10px] font-normal"
            >
              {modifier.short}
            </Badge>
          ))}
          {arrayDataset.multiscale && (
            <Badge variant="outline" className="px-1 py-0 text-[10px] font-normal">
              multiscale
            </Badge>
          )}
        </div>
      )}

      {/* What the picture is OF, and the way into it. Absent for a dataset that
          nominates no scene — which is also exactly the case with no picture. */}
      {arrayDataset.defaultScene && (
        <div className="flex flex-col gap-1">
          <HoverSectionLabel>Opens in</HoverSectionLabel>
          <MikroScene.DetailLink
            object={arrayDataset.defaultScene}
            className="flex flex-row items-center gap-2 rounded px-1 py-0.5 hover:bg-muted transition-colors"
          >
            <Clapperboard className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="text-xs line-clamp-1">
              {arrayDataset.defaultScene.name}
            </span>
          </MikroScene.DetailLink>
        </div>
      )}
    </HoverShell>
  );
};

export default ArrayDatasetHoverCard;
