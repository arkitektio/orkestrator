import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clapperboard, ChevronDown } from "lucide-react";
import {
  GetArrayDatasetQuery,
  useCreateSceneFromCoordinateSystemMutation,
  useGetCoordinateGraphQuery,
} from "../../api/graphql";
import { formatShape } from "../../specs";
import { datasetRegistrations } from "../coordinates/registrations";

type PageDataset = GetArrayDatasetQuery["arrayDataset"];

/**
 * The spaces this dataset's grid is registered into — the worlds a scene could
 * be composed over besides the dataset's own pixels. Depth 1: the immediate
 * registrations are the offer; anything further is a space the dataset reaches
 * THROUGH another, which the bootstrap resolves on its own.
 *
 * One small round trip, shared through the Apollo cache by every caller on the
 * page (the backdrop, the header button, and the Info tab's pixel sizes), so
 * mounting them together costs one request, not three.
 */
export const useDatasetWorlds = (dataset: PageDataset) => {
  const gridId = dataset.intrinsicSystem?.id;
  const { data } = useGetCoordinateGraphQuery({
    variables: { coordinateSystem: gridId as string, maxDepth: 1 },
    skip: !gridId,
  });

  return datasetRegistrations(
    gridId,
    data?.coordinateGraph.systems ?? [],
    data?.coordinateGraph.transformations ?? [],
  );
};

/**
 * Create a scene for this dataset.
 *
 * A scene is always built over a coordinate SYSTEM — there is no
 * `createSceneFromDataset` any more — so the only question is which space, and
 * the dataset's own pixel grid is simply the default answer. Over the grid the
 * dataset's own data becomes the layer; over a stage frame or a µm calibration
 * it is placed THERE, at physical scale and alongside whatever else registered
 * into that space, which is a different picture of the same data.
 *
 * So the menu appears only when there is a choice to make: with nothing but its
 * own grid, this is one button and one click.
 *
 * Where the new scene goes is the caller's decision, not this control's — the
 * dataset page renders scenes itself, so it selects the new one in place rather
 * than being navigated away from the dataset it just staged.
 */
export const CreateSceneControl = ({
  dataset,
  size = "default",
  variant = "default",
  onCreated,
}: {
  dataset: PageDataset;
  size?: "default" | "sm";
  /** "outline" for the header, where this is a secondary way to add a scene. */
  variant?: "default" | "outline";
  /**
   * Called with the new scene's id once it exists AND the dataset query has
   * been refetched — so a caller that shows the dataset's scenes can select it
   * knowing the list already holds it.
   */
  onCreated: (sceneId: string) => void;
}) => {
  const worlds = useDatasetWorlds(dataset);
  const grid = dataset.intrinsicSystem;

  const [createScene, { loading }] = useCreateSceneFromCoordinateSystemMutation({
    // The new scene is one of the dataset's own `scenes` now, and that list is
    // what the switcher reads; awaited so `onCreated` never names a scene the
    // caller cannot find yet.
    refetchQueries: ["GetArrayDataset"],
    awaitRefetchQueries: true,
    onCompleted: (result) => onCreated(result.createSceneFromCoordinateSystem.id),
  });
  // `defaultFor` nominates the new scene as the one this dataset opens on and
  // takes its thumbnail from — without it a freshly staged dataset stays
  // tile-less in every list, since the thumbnail is now the newest picture of a
  // NOMINATED scene rather than something derived from sole occupancy.
  //
  // Only when the dataset nominates nothing yet: staging a second scene is not a
  // claim that it should replace the picture someone already chose. Changing an
  // existing nomination is what the title overlay's "Make default" is for.
  const stage = (coordinateSystem: string) =>
    createScene({
      variables: {
        input: {
          coordinateSystem,
          defaultFor: dataset.defaultScene ? undefined : [dataset.id],
        },
      },
    });

  const label = loading ? "Creating scene…" : "Create scene";

  // No grid means the dataset has no space of its own yet, so there is nothing
  // to build over and nothing for a registration to have left from either.
  if (!grid) return null;

  if (worlds.length === 0) {
    return (
      <Button
        size={size}
        variant={variant}
        disabled={loading}
        onClick={() => stage(grid.id)}
      >
        <Clapperboard className="mr-2 h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} disabled={loading}>
          <Clapperboard className="mr-2 h-4 w-4" />
          {label}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        <DropdownMenuLabel>Compose it in</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => stage(grid.id)}>
          Its own pixel grid
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Registered spaces</DropdownMenuLabel>
        {worlds.map(({ system }) => (
          <DropdownMenuItem key={system.id} onSelect={() => stage(system.id)}>
            <span className="truncate">{system.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * What the page shows where the renderer would be, when the dataset is in no
 * scene yet: what this data IS, and the one action that follows from it.
 *
 * Deliberately short. The details — every pyramid level, every axis unit, the
 * placement graph — have their own pages and their own panel; repeating them
 * here would bury the sentence that actually matters, which is that there is
 * nothing to render until someone composes a scene.
 */
export const DatasetBackdrop = ({
  dataset,
  onSceneCreated,
}: {
  dataset: PageDataset;
  onSceneCreated: (sceneId: string) => void;
}) => {
  const worlds = useDatasetWorlds(dataset);
  const axes = dataset.intrinsicSystem?.axes ?? [];

  // The same "64z 2048y 2048x" the title overlay uses — one dataset should not
  // read two ways depending on whether it has a scene yet.
  const dimensions = formatShape(dataset.axisNames, dataset.shape);

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-lg font-semibold">{dataset.name}</h2>
          <div className="font-mono text-xs text-muted-foreground">{dimensions}</div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {dataset.multiscale && (
              <Badge variant="outline" className="text-[0.625rem]">
                {dataset.dataArrays.length} levels
              </Badge>
            )}
            {axes.length > 0 && (
              <Badge variant="outline" className="text-[0.625rem]">
                {axes.length}D
              </Badge>
            )}
            {worlds.length > 0 && (
              <Badge variant="outline" className="text-[0.625rem]">
                registered in {worlds.length}{" "}
                {worlds.length === 1 ? "space" : "spaces"}
              </Badge>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Not rendered in any scene yet. A scene composes it into a world, which
          is what the viewer draws.
        </p>

        <CreateSceneControl dataset={dataset} onCreated={onSceneCreated} />
      </div>
    </div>
  );
};
