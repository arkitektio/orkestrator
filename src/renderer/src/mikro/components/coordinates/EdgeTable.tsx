import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MikroCoordinateSystem } from "@/linkers";
import { PlacementValidity } from "../../api/graphql";
import { AnyTransformation, describeTransformation } from "./types";

/**
 * The edges touching one coordinate system, as a table.
 *
 * The page renders this with different framing depending on the direction: over
 * inbound edges it is "what is registered into this space" or "what reaches
 * me", over outbound edges "what has been derived from these coordinates".
 * Same data, different question — which is why `direction` exists.
 */

/**
 * The schema asks for exactly one thing to be loud: "This map was assumed,
 * never measured -- badge it." So UNKNOWN is destructive rather than a neutral
 * chip, and VALIDATED — the only value that means *checked* — is the only one
 * that gets to look calm.
 */
const VALIDITY_VARIANT: Record<
  PlacementValidity,
  "default" | "secondary" | "outline" | "destructive"
> = {
  [PlacementValidity.Validated]: "default",
  [PlacementValidity.Manual]: "secondary",
  [PlacementValidity.Inferred]: "outline",
  [PlacementValidity.Unknown]: "destructive",
};

const VALIDITY_TITLE: Record<PlacementValidity, string> = {
  [PlacementValidity.Validated]:
    "Exact or checked: the server derived this map, or someone validated it against the data.",
  [PlacementValidity.Manual]:
    "Someone authored this map. It exists on purpose, but nothing has checked it against the data.",
  [PlacementValidity.Inferred]:
    "Read from acquisition metadata (a pixel size, a stage pose). As right as the metadata is.",
  [PlacementValidity.Unknown]:
    "Assumed, never measured. Nothing has established that this placement is right.",
};

export const ValidityBadge = (props: { validity: PlacementValidity }) => (
  <Badge
    variant={VALIDITY_VARIANT[props.validity]}
    title={VALIDITY_TITLE[props.validity]}
  >
    {props.validity}
  </Badge>
);

/** How many of these edges are still assumptions — a hub's headline number. */
export const assumedCount = (edges: readonly AnyTransformation[]): number =>
  edges.filter((edge) => edge?.validity === PlacementValidity.Unknown).length;

export const EdgeTable = (props: {
  edges: readonly AnyTransformation[];
  /** "in": show where each edge comes FROM. "out": show where it goes TO. */
  direction: "in" | "out";
  empty: string;
}) => {
  if (props.edges.length === 0) {
    return <div className="text-sm text-muted-foreground">{props.empty}</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{props.direction === "in" ? "from" : "to"}</TableHead>
          <TableHead>map</TableHead>
          <TableHead>axes</TableHead>
          <TableHead className="w-28">validity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.edges.map((edge) => {
          if (!edge) return null;
          const other = props.direction === "in" ? edge.input : edge.output;
          return (
            <TableRow key={edge.id}>
              <TableCell>
                {other ? (
                  <MikroCoordinateSystem.DetailLink object={other}>
                    {other.name}
                  </MikroCoordinateSystem.DetailLink>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">{edge.name || edge.kind}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {describeTransformation(edge)}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {edge.inputAxes?.join(",") || "—"} →{" "}
                {edge.outputAxes?.join(",") || "—"}
              </TableCell>
              <TableCell>
                {edge.validity && <ValidityBadge validity={edge.validity} />}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default EdgeTable;
