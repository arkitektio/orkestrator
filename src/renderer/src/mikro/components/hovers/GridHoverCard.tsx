import { formatDistanceToNow } from "date-fns";
import { Object } from "@/core/types";
import { useGetListGridQuery } from "../../api/graphql";
import { gridAxesLabel } from "../../gridAxes";
import { HoverRow, HoverShell, HoverSkeleton } from "./HoverShell";

export const GridHoverCard = ({ object }: { object: Object }) => {
  const { data, error } = useGetListGridQuery({ variables: { id: object.id }, fetchPolicy: "cache-first" });
  if (error) return <div className="p-3 text-xs text-destructive">Could not load grid details.</div>;
  if (!data) return <HoverSkeleton />;
  const grid = data.grid;
  return (
    <HoverShell title={grid.name} subtitle="Grid">
      {grid.description && <p className="line-clamp-3 text-xs text-muted-foreground">{grid.description}</p>}
      <div className="flex flex-col gap-1">
        <HoverRow label="Members" value={gridAxesLabel(grid)} />
        <HoverRow label="Created" value={formatDistanceToNow(new Date(grid.createdAt), { addSuffix: true })} />
      </div>
    </HoverShell>
  );
};

export default GridHoverCard;
