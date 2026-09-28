import { Badge } from "@/core/ui/badge";
import { ElektroNeuronModel, ElektroSection } from "@/core/linkers";
import { DetailCellFragment } from "../../api/graphql";
import { rgbaToCss } from "../../lib/color";
import SessionCard from "../cards/SessionCard";
import { Fact, SectionHeader } from "./sidebarParts";

/**
 * A cell's Info tab: the model it belongs to, what it is built from, its
 * sections (each a way into its own zoomed-in page) and the sessions it was
 * recorded in. The picture is the viewport; this is everything else.
 */
export const CellInfoSidebar = ({ cell }: { cell: DetailCellFragment }) => {
  const sections = cell.topology.sections;
  const compartments = cell.biophysics.compartments;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        <h2 className="break-all text-lg font-semibold">{cell.id}</h2>
        {cell.model && (
          <ElektroNeuronModel.DetailLink
            object={cell.model}
            className="break-all text-xs text-muted-foreground hover:text-foreground"
          >
            {cell.model.name}
          </ElektroNeuronModel.DetailLink>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Structure</div>
        <Fact label="Sections" value={sections.length} />
        <Fact label="Compartments" value={compartments.length} />
      </div>

      {compartments.length > 0 && (
        <div className="flex flex-col gap-1">
          <SectionHeader title="Compartments" count={compartments.length} />
          <div className="flex flex-row flex-wrap gap-1">
            {compartments.map((compartment) => (
              <Badge
                key={compartment.id}
                variant="secondary"
                className="gap-1 px-1.5 py-0 font-mono text-[0.625rem] font-normal"
                title={
                  compartment.mechanisms.length > 0
                    ? compartment.mechanisms.join(", ")
                    : "No mechanisms"
                }
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: rgbaToCss(compartment.color) ?? "transparent" }}
                />
                {compartment.id}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {cell.sessions.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader title="Recorded in" count={cell.sessions.filter((s) => s.clock).length} />
          {cell.sessions.map((session) => (
            <SessionCard key={session.clock?.id ?? "untimed"} session={session} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <SectionHeader title="Sections" count={sections.length} />
        {sections.map((section) => (
          <div key={section.id} className="flex items-baseline justify-between gap-2 text-xs">
            {section.compoundId ? (
              <ElektroSection.DetailLink
                object={{ id: section.compoundId }}
                className="min-w-0 truncate font-mono hover:underline"
              >
                {section.id}
              </ElektroSection.DetailLink>
            ) : (
              <span className="min-w-0 truncate font-mono">{section.id}</span>
            )}
            {section.category && (
              <span className="shrink-0 text-muted-foreground">{section.category}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
