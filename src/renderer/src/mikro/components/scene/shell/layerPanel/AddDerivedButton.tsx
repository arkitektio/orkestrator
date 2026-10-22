import { useDialog } from "@/core/dialogs/registry";
import { ErrorNote } from "@/core/ui/error-note";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { cn } from "@/core/util/utils";
import {
  LineageNodeKind,
  useAddLayerReachableQuery,
  useSceneDerivedDetailsQuery,
  useSceneDerivedQuery,
  type SceneDerivedDetailsQuery,
} from "@/mikro/api/graphql";
import {
  derivedTree,
  detailIds,
  drawnContainers,
  nodeKey,
  parseNodeKey,
  type ChildDetail,
  type DerivedRow,
} from "@/mikro/forms/addLayer/derived";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { spatialSpecOf } from "../../../../specs";
import { KIND_LABEL, lineageLink } from "../../../lineage/lineageGraph";
import { KIND_ICON } from "../../../lineage/LineageNodes";

/** How many hops below what the scene draws the list looks. */
const DOWN = 3;

/** What a row is, in a word: the image's spatial kind, else its container kind. */
const kindWord = (kind: `${LineageNodeKind}`, spec: readonly string[] | undefined) =>
  (kind === "DATASET" && spec && spatialSpecOf(spec as never)?.label) || KIND_LABEL[kind as LineageNodeKind];

const BLOCKED: Record<NonNullable<DerivedRow["blocked"]>, string> = {
  drawn: "Already in this scene",
  unplaced: "Not placed in this scene's world",
  loading: "Loading…",
};

type Details = { detail: ReadonlyMap<string, ChildDetail>; name: Map<string, string>; spec: Map<string, string[]> };

const detailsFrom = (data: SceneDerivedDetailsQuery | undefined): Details | null => {
  if (!data) return null;
  const detail = new Map<string, ChildDetail>();
  const name = new Map<string, string>();
  const spec = new Map<string, string[]>();
  const add = (
    kind: `${LineageNodeKind}`,
    rows: readonly { id: string; name?: string | null; fullLens?: { id: string } | null }[] | undefined,
    spaceOf: (row: never) => string | null | undefined,
  ) => {
    for (const row of rows ?? []) {
      const key = nodeKey(kind, row.id);
      detail.set(key, { wholeLens: row.fullLens?.id ?? null, space: spaceOf(row as never) ?? null });
      if (row.name) name.set(key, row.name);
    }
  };
  add("DATASET", data.arrayDatasets, (row: { intrinsicSystem?: { id: string } | null }) => row.intrinsicSystem?.id);
  for (const row of data.arrayDatasets ?? []) spec.set(nodeKey("DATASET", row.id), row.spec);
  const own = (row: { coordinateSystem: { id: string } }) => row.coordinateSystem.id;
  add("TABLE_DATASET", data.tableDatasets, own);
  add("MESH_COLLECTION", data.meshCollections, own);
  add("NETWORK_COLLECTION", data.networkCollections, own);
  add("ANNOTATION_COLLECTION", data.annotationCollections, own);
  return { detail, name, spec };
};

/**
 * One child, indented under what it was made from. Clicking it opens the Add
 * layer form on its whole lens, which jumps straight to the form for its kind.
 */
const Row = ({
  row,
  depth,
  spec,
  onAdd,
}: {
  row: DerivedRow;
  depth: number;
  spec: Details["spec"] | undefined;
  onAdd: (lens: string) => void;
}) => {
  const Icon = KIND_ICON[row.kind as LineageNodeKind];
  const reason = row.blocked ? BLOCKED[row.blocked] : null;
  return (
    <>
      <button
        type="button"
        disabled={!!row.blocked}
        title={reason ?? `Add ${row.name} as a layer`}
        onClick={() => row.wholeLens && onAdd(row.wholeLens)}
        className={cn(
          "group flex w-full min-w-0 items-center gap-2 rounded-md py-1 pr-1.5 text-left text-sm",
          row.blocked ? "cursor-default text-muted-foreground" : "hover:bg-accent",
        )}
        style={{ paddingLeft: `${0.375 + depth * 1}rem` }}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{row.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {row.blocked === "drawn" || row.blocked === "unplaced" ? reason : kindWord(row.kind, spec?.get(row.key))}
        </span>
        {!row.blocked && <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />}
      </button>
      {row.children.map((child) => (
        <Row key={child.key} row={child} depth={depth + 1} spec={spec} onAdd={onAdd} />
      ))}
    </>
  );
};

/** The list itself; mounted only while the popover is open, so nothing is asked until then. */
const DerivedList = ({ sceneId, onAdd }: { sceneId: string; onAdd: (lens: string) => void }) => {
  const reachable = useAddLayerReachableQuery({ variables: { scene: sceneId }, fetchPolicy: "cache-and-network" });
  const scene = reachable.data?.scene;
  const starts = useMemo(() => drawnContainers(scene?.layers ?? []), [scene?.layers]);

  const walk = useSceneDerivedQuery({
    variables: { starts, down: DOWN },
    skip: starts.length === 0,
    fetchPolicy: "cache-and-network",
  });
  const descendants = walk.data?.descendants;
  const ids = useMemo(() => detailIds(descendants ?? []), [descendants]);
  const detailsQuery = useSceneDerivedDetailsQuery({
    variables: {
      ...ids,
      hasDatasets: ids.datasets.length > 0,
      hasTables: ids.tables.length > 0,
      hasMeshes: ids.meshes.length > 0,
      hasNetworks: ids.networks.length > 0,
      hasAnnotations: ids.annotations.length > 0,
    },
    skip: !descendants,
    fetchPolicy: "cache-and-network",
  });
  const details = useMemo(() => detailsFrom(detailsQuery.data), [detailsQuery.data]);

  const groups = useMemo(
    () =>
      derivedTree({
        descendants: descendants ?? [],
        details: details?.detail ?? null,
        drawn: new Set(starts.map((start) => nodeKey(start.kind, start.id))),
        placed: new Set(scene?.worldCoordinateSystem?.placedSystems.map((space) => space.id) ?? []),
      }),
    [descendants, details, starts, scene],
  );

  const error = reachable.error ?? walk.error ?? detailsQuery.error;
  if (error) return <ErrorNote error={error} title="Couldn't load what was made from this scene" />;
  if (!scene || (starts.length > 0 && !descendants)) {
    return <p className="px-1.5 py-1 text-xs text-muted-foreground">Looking for derived data…</p>;
  }
  if (groups.length === 0) {
    return (
      <p className="px-1.5 py-1 text-xs text-muted-foreground">
        Nothing was made from what this scene shows yet.
      </p>
    );
  }

  return (
    <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
      {groups.map((group) => {
        const root = parseNodeKey(group.root);
        return (
          <section key={group.root} className="flex flex-col">
            <h3 className="truncate px-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              From {details?.name.get(group.root) ?? (root ? KIND_LABEL[root.kind as LineageNodeKind] : group.root)}
            </h3>
            {group.rows.map((row) => (
              <Row key={row.key} row={row} depth={0} spec={details?.spec} onAdd={onAdd} />
            ))}
            {group.more && root && (
              <Link
                to={lineageLink(root.kind as LineageNodeKind, root.id)}
                className="px-1.5 pt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                More below — open the lineage
              </Link>
            )}
          </section>
        );
      })}
    </div>
  );
};

/**
 * "+ Add derived": what was computed from the data this scene draws — the
 * mask, the projection, the measurements, the meshes — as trees under what
 * each came from, read from the server's lineage walk. Picking one opens the
 * Add layer form on it, which knows how each kind becomes a layer.
 */
export const AddDerivedButton = ({ sceneId, className }: { sceneId: string; className?: string }) => {
  const [open, setOpen] = useState(false);
  const { openDialog } = useDialog();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={className}>
          + Add derived
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-80 p-2">
        {open && (
          <DerivedList
            sceneId={sceneId}
            onAdd={(lens) => {
              setOpen(false);
              openDialog("addlayer", { scene: sceneId, lens }, { className: "max-w-3xl" });
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
};
