import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/core/ui/button";
import { ErrorNote } from "@/core/ui/error-note";
import { cn } from "@/core/util/utils";
import { MikroMeshObject } from "@/mikro/linkers";
import { useAttributeServiceOrNull } from "@/mikro/lib/attributes/AttributeServiceProvider";
import { isArrayHop, objectsOf, type RowId, type RowObject } from "@/mikro/lib/attributes/attributeTypes";
import {
  AttributePlanBlock,
  FollowReferenceContext,
  type FollowReference,
  type LineView,
} from "@/mikro/lib/attributes/ui/AttributeBlocks";
import { useChartStore, useChartStoreApi, type PinnedRow } from "../../platform/stores/chartStore";
import { ProbeLines } from "./ProbeLines";
import { ProbeMesh } from "./ProbeMesh";
import { isPicked, meshToShow, ProbePickContext, useProbePick, type ProbePick, type ProbePicked } from "./ProbePick";
import { useRowProbe, type RowProbeHop } from "./useRowProbe";

/**
 * The Probe tab of a chart of values: what the pinned point reaches.
 *
 * A point is a row. Clicking one pins it (`ValuesPanel`), and this runs the
 * table's row plan from it — the server's account of what a row reaches, the
 * same chain an attribute plan is in a scene: the row itself, then, by the
 * schema's facts, a cluster's members (REVERSE), the same row in a table
 * derived from it (SAME_ROWS), and what its columns reference. What a row IS
 * (a mesh, for a table keyed by a mesh collection) is a chip that opens it:
 * the mesh's page frames it in its scene.
 */
export const ChartProbePanel = () => {
  const pin = useChartStore((s) => s.pinnedRow);
  if (!pin) {
    return (
      <div className="p-4 text-xs text-muted-foreground">
        Click a point to probe it: what it is, and what it is connected to — the mesh a row describes, a
        cluster&apos;s members, the same row in a table derived from it.
      </div>
    );
  }
  // Keyed by the row: "Show all" belongs to one pin, not the next.
  return <PinnedProbe key={`${pin.table}:${String(pin.id)}`} pin={pin} />;
};

const PinnedProbe = ({ pin }: { pin: PinnedRow }) => {
  const [all, setAll] = useState(false);
  const probe = useRowProbe(pin, all);
  // Which member is picked (its chip or its line): the mesh shown follows it.
  const [picked, setPicked] = useState<ProbePicked | null>(null);
  const pick = useMemo<ProbePick>(
    () => ({ picked, pick: (hop, id) => setPicked(id === null ? null : { hop, id }) }),
    [picked],
  );
  const hops = probe.phase === "ready" ? probe.hops : null;
  const mesh = useMemo(() => (hops ? meshToShow(picked, hops) : null), [picked, hops]);
  const chartApi = useChartStoreApi();
  const service = useAttributeServiceOrNull();
  const follow = useMemo<FollowReference | null>(
    () => (service ? (column, value) => service.followReference(column, value) : null),
    [service],
  );

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: pin.color }} />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{pin.label}</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          title="Let go of this point"
          onClick={() => chartApi.setState({ pinnedRow: null })}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {probe.phase === "loading" && <div className="h-16 animate-pulse rounded-md bg-muted/40" />}
      {probe.phase === "error" && <ErrorNote error={probe.error} title="Couldn't probe this row" />}
      {probe.phase === "ready" && probe.plan === null && (
        <div className="text-xs text-muted-foreground">Nothing this row reaches can be read here.</div>
      )}
      {probe.phase === "ready" && probe.plan && (
        <ProbePickContext.Provider value={pick}>
          <FollowReferenceContext.Provider value={follow}>
            {mesh && <ProbeMesh key={mesh.id} object={mesh} />}
            {probe.hops.map((entry) =>
              // Unreachable hops are honest absences, not errors.
              entry.state.status === "unreachable" ? null : (
                <HopSection
                  key={entry.meta.hopKey}
                  entry={entry}
                  color={pin.color}
                  shownMesh={mesh?.id ?? null}
                  onShowAll={all ? null : () => setAll(true)}
                />
              ),
            )}
          </FollowReferenceContext.Provider>
        </ProbePickContext.Provider>
      )}
    </div>
  );
};

const HopSection = ({
  entry,
  color,
  shownMesh,
  onShowAll,
}: {
  entry: RowProbeHop;
  color: string;
  /** The mesh the tab already shows (its heading names it), left out of the row's own chips. */
  shownMesh: string | null;
  onShowAll: (() => void) | null;
}) => {
  const landing = entry.meta.index === 0;
  // Each row id with the object it is, so a member's chip can pick it by id.
  const rows = useMemo(
    () =>
      (entry.state.ids ?? []).flatMap((id) =>
        objectsOf(entry.hop, [id])
          .filter((object) => !(landing && object.id === shownMesh))
          .map((object) => ({ id, object })),
      ),
    [entry.hop, entry.state.ids, landing, shownMesh],
  );
  // An array's lines are plotted here, with what can be done with them.
  const hop = entry.hop;
  const lineView = useMemo<LineView | undefined>(
    () => (isArrayHop(hop) ? (read) => <ProbeLines hop={hop} read={read} color={color} /> : undefined),
    [hop, color],
  );
  return (
    <div className="flex flex-col gap-1">
      {rows.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            {landing ? "This row is" : entry.meta.direction === "REVERSE" ? "Members" : entry.meta.name}
          </span>
          {landing ? (
            <ObjectChips objects={rows.map((row) => row.object)} actions />
          ) : (
            <PickChips hop={entry.hop.index} rows={rows} />
          )}
        </div>
      )}
      <AttributePlanBlock meta={entry.meta} state={entry.state} lineView={lineView} />
      {entry.state.truncated && onShowAll && (
        <Button size="xs" variant="ghost" className="self-end text-[11px]" onClick={onShowAll}>
          Show all {entry.state.truncated.total.toLocaleString()}
        </Button>
      )}
    </div>
  );
};

const CHIP =
  "inline-flex max-w-full items-center gap-1 truncate rounded border border-foreground/10 bg-foreground/5 px-1.5 py-0.5 text-[11px] hover:bg-foreground/10";

/**
 * A hop's rows (a cluster's members) as chips that PICK one: the Probe tab
 * then shows its mesh, and its line in a plot. A second click lets go;
 * opening it is the mesh heading's.
 */
const PickChips = ({ hop, rows }: { hop: number; rows: readonly { id: RowId; object: RowObject }[] }) => {
  const pick = useProbePick();
  return (
    <div className="flex flex-wrap gap-1">
      {rows.map(({ id, object }) => {
        const objectId = object.id.slice(object.id.lastIndexOf(":") + 1);
        const label =
          object.identifier === "@mikro/meshobject" ? `${object.source.label ?? "Mesh"} · ${objectId}` : object.id;
        const chosen = isPicked(pick?.picked ?? null, hop, id);
        return (
          <button
            key={`${object.identifier}:${object.id}`}
            type="button"
            className={cn(CHIP, chosen && "border-foreground/40 bg-foreground/15 text-foreground")}
            aria-pressed={chosen}
            title={chosen ? "Let go" : `Show ${label}`}
            onClick={() => pick?.pick(hop, chosen ? null : id)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

/**
 * The objects rows are, as chips that open them. Only mesh objects have a page
 * (`@mikro/meshobject`); the row's own object also gets its smart menu.
 */
const ObjectChips = ({ objects, actions }: { objects: readonly RowObject[]; actions: boolean }) => (
  <div className="flex flex-wrap gap-1">
    {objects.map((object) => {
      if (object.identifier !== "@mikro/meshobject") {
        return (
          <span key={`${object.identifier}:${object.id}`} className={CHIP}>
            {object.id}
          </span>
        );
      }
      const objectId = object.id.slice(object.id.lastIndexOf(":") + 1);
      const label = `${object.source.label ?? "Mesh"} · ${objectId}`;
      return (
        <span key={object.id} className="inline-flex items-center gap-0.5">
          <MikroMeshObject.DetailLink object={{ id: object.id }} className={CHIP} title={`Open ${label}`}>
            {label}
          </MikroMeshObject.DetailLink>
          {actions && (
            <MikroMeshObject.ObjectButton object={{ id: object.id, label }} alwaysShow>
              Mesh
            </MikroMeshObject.ObjectButton>
          )}
        </span>
      );
    })}
  </div>
);
