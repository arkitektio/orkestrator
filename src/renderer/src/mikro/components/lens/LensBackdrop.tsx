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
import { ChevronDown, Clapperboard } from "lucide-react";
import { DetailLensFragment, useCreateSceneFromLensMutation } from "../../api/graphql";
import { describeLens, isWholeLens } from "../../lenses";
import { useGridWorlds } from "../arraydataset/DatasetBackdrop";

/**
 * Create a scene of a lens that is not an array: a table, a sparse matrix, a
 * mesh, a network or an annotation collection, whole or windowed.
 *
 * The array twin is `CreateSceneControl` (`arraydataset/DatasetBackdrop.tsx`),
 * which also knows how to stage a dataset with no lens at all. Here the only
 * question is which space: the container's own is the server's default, and a
 * menu appears only when it is registered into others.
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

  const [createScene, { loading }] = useCreateSceneFromLensMutation({
    // The lens nominates its first scene, and that nomination is all this kind
    // of lens can list — awaited, so the page finds the scene it is told about.
    refetchQueries: ["GetLens"],
    awaitRefetchQueries: true,
    onCompleted: (result) => onCreated(result.createSceneFromLens.id),
  });

  const stage = (world?: string) =>
    createScene({ variables: { input: { lens: lens.id, world } } });

  const label = loading ? "Creating scene…" : "Create scene";

  if (worlds.length === 0) {
    return (
      <Button disabled={loading} onClick={() => stage()}>
        <Clapperboard className="mr-2 h-4 w-4" />
        {label}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={loading}>
          <Clapperboard className="mr-2 h-4 w-4" />
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
            ? "Not rendered in any scene yet. A scene composes it into a world, which is what the viewer draws."
            : "This lens is not rendered in any scene yet. A scene of it draws just the part its windows keep."}
        </p>

        <CreateLensSceneControl lens={lens} onCreated={onSceneCreated} />
      </div>
    </div>
  );
};
