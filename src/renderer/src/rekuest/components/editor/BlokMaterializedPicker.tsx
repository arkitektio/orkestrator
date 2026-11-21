import { useDialog } from "@/core/dialogs/registry";
import { RekuestMaterializedBlok } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { cn } from "@/core/util/utils";
import type { ListMaterializedBlokFragment } from "@/rekuest/api/graphql";
import { ArrowUpRight, FlaskConical, Radio } from "lucide-react";

/** One app per row, however many of the blok's dependencies it answers. */
export const boundAgents = (materialized: Pick<ListMaterializedBlokFragment, "agentMappings">) => [
  ...new Map(materialized.agentMappings.map((mapping) => [mapping.agent.id, mapping.agent])).values(),
];

const ROW =
  "flex min-w-0 flex-1 items-start gap-2.5 rounded-md px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:bg-muted";
const CHOSEN = "bg-primary/10 text-primary hover:bg-primary/15";

/**
 * The editor's "Materialized" tab: what the preview beside the source is
 * drawn against. Its demo values, or one of the blok's materializations: then
 * the draft as it is typed runs on that materialization's agents, live state
 * and real buttons. One is shown at a time; the rows switch between them.
 */
export const BlokMaterializedPicker = (props: {
  blokId: string;
  materialized: readonly ListMaterializedBlokFragment[];
  /** The materialization the preview runs on; null for the demo. */
  shown: string | null;
  onShow: (id: string | null) => void;
}) => {
  const { openDialog } = useDialog();
  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-xs text-muted-foreground">
        What the preview is drawn against. On a materialized blok the draft runs on its agents as you type: values are
        live, and a button there does what it says.
      </p>
      <ul className="flex flex-col gap-0.5">
        <li className="flex">
          <button
            type="button"
            className={cn(ROW, props.shown === null && CHOSEN)}
            aria-pressed={props.shown === null}
            onClick={() => props.onShow(null)}
          >
            <FlaskConical className="mt-0.5 size-3.5 shrink-0" />
            <span className="flex min-w-0 flex-col">
              <span>Demo values</span>
              <span className="text-xs text-muted-foreground">Bound to no agent</span>
            </span>
          </button>
        </li>
        {props.materialized.map((materialized) => {
          const chosen = props.shown === materialized.id;
          const agents = boundAgents(materialized);
          return (
            <li key={materialized.id} className="flex items-start gap-0.5">
              <button
                type="button"
                className={cn(ROW, chosen && CHOSEN)}
                aria-pressed={chosen}
                onClick={() => props.onShow(materialized.id)}
              >
                <Radio className="mt-0.5 size-3.5 shrink-0" />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate">{materialized.name ?? materialized.blok.name}</span>
                  {agents.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Bound to no agent</span>
                  ) : (
                    agents.map((agent) => (
                      <span key={agent.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "size-1.5 shrink-0 rounded-full",
                            agent.connected ? "bg-success" : "bg-muted-foreground/40",
                          )}
                          title={agent.connected ? "Connected" : "Offline"}
                        />
                        <span className="truncate">{agent.name}</span>
                      </span>
                    ))
                  )}
                </span>
              </button>
              <RekuestMaterializedBlok.DetailLink
                object={materialized}
                title="Open the materialized blok"
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ArrowUpRight className="size-3.5" />
              </RekuestMaterializedBlok.DetailLink>
            </li>
          );
        })}
      </ul>
      {props.materialized.length === 0 && (
        <p className="text-xs text-muted-foreground">This blok is not materialized on any agent yet.</p>
      )}
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => openDialog("materializeblok", { id: props.blokId })}
      >
        Materialize…
      </Button>
    </div>
  );
};
