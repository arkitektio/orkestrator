import { Badge } from "@/components/ui/badge";
import { ElektroEnvironment, ElektroModelCollection } from "@/linkers";
import { DetailNeuronModelFragment } from "../../api/graphql";
import HistoryCard from "../cards/HistoryCard";
import SessionCard from "../cards/SessionCard";
import { neuronModelCounts } from "../neuronmodel/counts";
import { Fact, SectionHeader } from "./sidebarParts";

/**
 * Everything about the model that is not the picture: the name, the global
 * biophysics it runs under, what it is built from, the environment it needs,
 * how it differs from its collections, the sessions it was run in, and
 * how it has been edited since.
 *
 * Mirrors `mikro-next`'s `DatasetInfoSidebar`: the page's content area is the
 * 3D viewport, so the prose and the facts move off the canvas into one Info
 * tab rather than a column that eats a quarter of the picture.
 */
export const NeuronModelInfoSidebar = ({
  model,
}: {
  model: DetailNeuronModelFragment;
}) => {
  const { config } = model;
  const counts = neuronModelCounts(model);

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        {/* `break-all` like the title overlay: a model name is often one long
            token, and the rail is narrow. The description is prose and wraps at
            spaces as usual. */}
        <h2 className="break-all text-lg font-semibold">{model.name}</h2>
        {model.description && (
          <p className="text-sm text-muted-foreground">{model.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Globals</div>
        {/* Quantities arrive as wire strings ("-65 mV") and are shown as
            written: what the author typed is the fact, not a re-unit of it. */}
        <Fact label="Temperature" value={config.temperature} />
        <Fact label="V init" value={config.vInit} />
        <Fact label="Ra" value={config.ra} />
        <Fact label="Cm" value={config.cm} />
        <Fact label="Label" value={config.label} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Structure</div>
        <Fact label="Cells" value={counts.cells} />
        <Fact label="Sections" value={counts.sections} />
        <Fact label="Compartments" value={counts.compartments} />
        {/* Only when there is a network: a single cell has no synapses and a
            row of zeros would say so three times. */}
        {counts.synapses + counts.stimulators + counts.connections > 0 && (
          <>
            <Fact label="Synapses" value={counts.synapses} />
            <Fact label="Stimulators" value={counts.stimulators} />
            <Fact label="Connections" value={counts.connections} />
          </>
        )}
      </div>

      {config.ions.length > 0 && (
        <div className="flex flex-col gap-1">
          <SectionHeader title="Ions" count={config.ions.length} />
          <div className="flex flex-row flex-wrap gap-1">
            {config.ions.map((ion) => (
              <Badge
                key={ion.ion}
                variant="secondary"
                className="gap-1 px-1.5 py-0 font-mono text-[0.625rem] font-normal"
                title={
                  ion.reversalPotential
                    ? `Reversal potential ${ion.reversalPotential}`
                    : undefined
                }
              >
                {ion.ion}
                {ion.reversalPotential && (
                  <span className="text-muted-foreground">{ion.reversalPotential}</span>
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {config.mechanismGlobals.length > 0 && (
        <div className="flex flex-col gap-1">
          <SectionHeader
            title="Mechanism globals"
            count={config.mechanismGlobals.length}
          />
          {config.mechanismGlobals.map((global) => (
            <div
              key={`${global.mechanism}.${global.param}`}
              className="flex items-baseline justify-between gap-2 text-xs"
              title={global.description ?? undefined}
            >
              <span className="min-w-0 truncate font-mono text-muted-foreground">
                {global.mechanism}.{global.param}
              </span>
              <span className="shrink-0 font-mono">{String(global.value)}</span>
            </div>
          ))}
        </div>
      )}

      {model.environment && (
        <div className="flex flex-col gap-1">
          <div className="text-xs font-semibold">Environment</div>
          <ElektroEnvironment.DetailLink
            object={model.environment}
            className="break-all text-xs font-mono text-muted-foreground"
          >
            {model.environment.name}
          </ElektroEnvironment.DetailLink>
          {model.environment.mechanisms.length > 0 && (
            <div className="flex flex-row flex-wrap gap-1">
              {model.environment.mechanisms.map((mechanism) => (
                <Badge
                  key={mechanism.id}
                  variant="outline"
                  className="px-1.5 py-0 font-mono text-[0.625rem] font-normal"
                  title={mechanism.description ?? undefined}
                >
                  {mechanism.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {model.comparisons.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader title="Comparisons" count={model.comparisons.length} />
          {model.comparisons.map((comparison) => (
            <div
              key={comparison.collection.id}
              className="flex flex-col gap-1 rounded-md border border-border/60 p-2"
            >
              <ElektroModelCollection.DetailLink
                object={comparison.collection}
                className="text-xs font-medium"
              >
                {comparison.collection.name}
              </ElektroModelCollection.DetailLink>
              {comparison.changes.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  Identical to the collection's reference.
                </span>
              ) : (
                comparison.changes.map((change, idx) => (
                  <div key={idx} className="flex flex-col text-xs">
                    <span className="break-all font-mono text-muted-foreground">
                      {change.path.join(".")}
                    </span>
                    <span className="break-all font-mono">
                      {JSON.stringify(change.valueA)} → {JSON.stringify(change.valueB)}
                    </span>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* One per run — a run is its clock. Nothing simulated yet is the common
          case for a fresh model, not something worth an empty section. */}
      {model.sessions.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader title="Sessions" count={model.sessions.filter((s) => s.clock).length} />
          {model.sessions.map((session) => (
            <SessionCard key={session.clock?.id ?? "untimed"} session={session} />
          ))}
        </div>
      )}

      {/* No separate Provenance tab: the history sits next to the facts it
          explains, as on the dataset page. */}
      <div className="flex flex-col gap-2">
        <SectionHeader title="Provenance" count={model.provenanceEntries.length} />
        {model.provenanceEntries.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            No changes recorded since it was created.
          </span>
        ) : (
          model.provenanceEntries.map((entry) => (
            <HistoryCard key={entry.id} history={entry} />
          ))
        )}
      </div>
    </div>
  );
};
