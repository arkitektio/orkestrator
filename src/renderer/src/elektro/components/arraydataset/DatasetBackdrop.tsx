import { AudioLines, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/ui/dropdown-menu";
import { formatShape } from "@/core/data/arrays/formatShape";
import {
  GetArrayDatasetQuery,
  useCreateExperimentFromCoordinateSystemMutation,
  usePlacementContextQuery,
} from "../../api/graphql";

type PageDataset = GetArrayDatasetQuery["arrayDataset"];

/**
 * The spaces this dataset's own grid is registered into — besides the grid
 * itself, the worlds an experiment could be composed over. For a simulated
 * trace that is its run's clock: composing there lays out the whole run (every
 * recording and stimulus timed onto it), not just this one dataset.
 *
 * Read off `PlacementContext` (the registrations out of the intrinsic system),
 * the query the placement editor already runs — so the Apollo cache shares it.
 */
export const useDatasetWorlds = (dataset: PageDataset) => {
  const gridId = dataset.intrinsicSystem?.id;
  const { data } = usePlacementContextQuery({
    variables: { system: gridId as string },
    skip: !gridId,
  });
  const seen = new Set<string>();
  return (data?.coordinateSystem.registrations ?? [])
    .map((registration) => registration.output)
    .filter((system): system is NonNullable<typeof system> => {
      if (!system || system.id === gridId || seen.has(system.id)) return false;
      seen.add(system.id);
      return true;
    });
};

/**
 * Create an experiment for this dataset — mikro's `CreateSceneControl`, over
 * time. An experiment is always composed over a coordinate SYSTEM, so the only
 * question is which: the dataset's own grid is the default answer, and the menu
 * appears only when it is registered somewhere else too (its run's clock).
 *
 * Where the new experiment goes is the caller's decision: the dataset page draws
 * experiments itself, so it selects the new one in place rather than navigating
 * away from the dataset it just staged.
 */
export const CreateExperimentControl = ({
  dataset,
  size = "default",
  variant = "default",
  onCreated,
}: {
  dataset: PageDataset;
  size?: "default" | "sm";
  /** "outline" for the header, where this is a secondary way to add one. */
  variant?: "default" | "outline";
  /** Called once the experiment exists AND the dataset has been refetched. */
  onCreated: (experimentId: string) => void;
}) => {
  const worlds = useDatasetWorlds(dataset);
  const grid = dataset.intrinsicSystem;

  const [create, { loading }] = useCreateExperimentFromCoordinateSystemMutation({
    // The new experiment draws this dataset, and `experimentLayers` is what the
    // switcher reads — awaited so `onCreated` never names one it cannot list.
    refetchQueries: ["GetArrayDataset"],
    awaitRefetchQueries: true,
    onCompleted: (result) => onCreated(result.createExperimentFromCoordinateSystem.id),
    onError: (error) => toast.error(`Could not create the experiment: ${error.message}`),
  });

  const stage = (coordinateSystem: string, name: string) =>
    create({ variables: { input: { coordinateSystem, name } } });

  const label = loading ? "Creating experiment…" : "Create experiment";

  // No grid means the dataset has no space of its own, so nothing to build over.
  if (!grid) return null;

  if (worlds.length === 0) {
    return (
      <Button size={size} variant={variant} disabled={loading} onClick={() => stage(grid.id, dataset.name)}>
        <AudioLines className="mr-2 h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} disabled={loading}>
          <AudioLines className="mr-2 h-4 w-4" />
          {label}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        <DropdownMenuLabel>Compose it in</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => stage(grid.id, dataset.name)}>
          Its own grid
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Registered clocks</DropdownMenuLabel>
        {worlds.map((system) => (
          <DropdownMenuItem key={system.id} onSelect={() => stage(system.id, system.name)}>
            <span className="truncate">{system.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * What the page shows where the timeline would be, when no experiment draws the
 * dataset yet: what this data IS, and the one action that follows from it.
 * Deliberately short — the details live in the Info tab.
 */
export const DatasetBackdrop = ({
  dataset,
  onExperimentCreated,
}: {
  dataset: PageDataset;
  onExperimentCreated: (experimentId: string) => void;
}) => {
  const worlds = useDatasetWorlds(dataset);
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-lg font-semibold">{dataset.name}</h2>
          <div className="font-mono text-xs text-muted-foreground">
            {formatShape(dataset.axisNames, dataset.shape)}
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {dataset.valueUnit && (
              <Badge variant="outline" className="text-[0.625rem]">
                {dataset.valueUnit}
              </Badge>
            )}
            {dataset.multiscale && (
              <Badge variant="outline" className="text-[0.625rem]">
                {dataset.dataArrays.length} levels
              </Badge>
            )}
            {worlds.length > 0 && (
              <Badge variant="outline" className="text-[0.625rem]">
                timed onto {worlds.length} {worlds.length === 1 ? "clock" : "clocks"}
              </Badge>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Not drawn in any experiment yet. An experiment lays it out on a timeline,
          which is what the viewer draws.
        </p>

        <CreateExperimentControl dataset={dataset} onCreated={onExperimentCreated} />
      </div>
    </div>
  );
};
