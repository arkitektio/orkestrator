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
import { ChevronDown, Eye } from "lucide-react";
import { DetailLensFragment, useCreateSceneFromLensMutation } from "../../api/graphql";
import { describeLens, isWholeLens } from "../../lenses";
import { useVisualizeLens } from "../../lib/visualize";
import { useGridWorlds } from "../arraydataset/DatasetBackdrop";

/**
 * Visualize a lens that is not an array: a table, a sparse matrix, a mesh, a
 * network or an annotation collection, whole or windowed. The server picks a
 * chart or a scene from the axes of the lens' own space.
 *
 * The array twin is `CreateSceneControl` (`arraydataset/DatasetBackdrop.tsx`),
 * which also knows how to stage a dataset with no lens at all. A menu appears
 * only when the lens is registered into other spaces: composing it THERE is a
 * say in the world, which is the explicit scene bootstrap's.
 */
const CreateLensSceneControl = ({
  lens,
  onCreated,
}: {
  lens: DetailLensFragment;
  onCreated: (sceneId: string) => void;
}) => {
  const own = lens.coordinateSystem;
  const worlds = useGridWorlds(own?.id);

  const [visualize, visualizing] = useVisualizeLens(onCreated);
  const [createScene, { loading: staging }] = useCreateSceneFromLensMutation({
    // The lens nominates its first scene, and that nomination is all this kind
    // of lens can list — awaited, so the page finds the scene it is told about.
    refetchQueries: ["GetLens"],
    awaitRefetchQueries: true,
    onCompleted: (result) => onCreated(result.createSceneFromLens.id),
  });

  const loading = visualizing || staging;
  const stage = (world?: string) =>
    world
      ? createScene({ variables: { input: { lens: lens.id, world } } })
      : visualize(lens.id);

  const label = loading ? "Visualizing…" : "Visualize";

  if (worlds.length === 0) {
    return (
      <Button disabled={loading} onClick={() => stage()}>
        <Eye className="mr-2 h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={loading}>
          <Eye className="mr-2 h-4 w-4" />
          {label}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        <DropdownMenuLabel>Compose it in</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => stage()}>
          {own ? own.name : "Its own space"}
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
 * What the lens page shows where the renderer would be while a non-array lens
 * is in no scene: what it is, and the one action that follows from that.
 */
export const LensBackdrop = ({
  lens,
  onSceneCreated,
}: {
  lens: DetailLensFragment;
  onSceneCreated: (sceneId: string) => void;
}) => {
  const { info, title, selection, container } = describeLens(lens);
  const Icon = info.icon;

  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <div className="flex flex-col items-center gap-2">
          <Icon className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="text-xs text-muted-foreground">{container.name}</div>
          {selection && (
            <div className="font-mono text-xs text-muted-foreground">{selection}</div>
          )}
          <Badge variant="outline" className="text-[0.625rem]">
            {info.label}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          {isWholeLens(lens)
            ? "Not shown anywhere yet. Visualizing it makes a chart or a scene, whichever its axes call for."
            : "This lens is not shown anywhere yet. Visualizing it draws just the part its windows keep."}
        </p>

        <CreateLensSceneControl lens={lens} onCreated={onSceneCreated} />
      </div>
    </div>
  );
};
