import { Badge } from "@/core/components/ui/badge";
import { ElektroCell, ElektroSection } from "@/core/linkers";
import { DetailSectionFragment } from "../../api/graphql";
import SessionCard from "../cards/SessionCard";
import { Fact, SectionHeader } from "./sidebarParts";

type SectionLink = { id: string; compoundId?: string | null; category?: string | null };

const SectionLinkRow = ({ section, note }: { section: SectionLink; note?: string }) => (
  <div className="flex items-baseline justify-between gap-2 text-xs">
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
    {(note ?? section.category) && (
      <span className="shrink-0 text-muted-foreground">{note ?? section.category}</span>
    )}
  </div>
);

/**
 * A section's Info tab: where it sits (its cell, its parent, its children —
 * each a step along the tree), its geometry, the compartment it takes its
 * channels from, and the sessions it was recorded in. Per-section overrides of
 * the model globals (Ra, Cm, d_lambda) show only when set, as in the popout.
 */
export const SectionInfoSidebar = ({ section }: { section: DetailSectionFragment }) => {
  const cells = section.model?.config.cells ?? [];
  const cell = cells.find((c) => c.id === section.cell?.id);
  const siblings = cell?.topology.sections ?? [];
  const parentId = section.parent?.parent;
  const parent = parentId ? siblings.find((s) => s.id === parentId) : undefined;
  const children = siblings.filter((s) => s.parent?.parent === section.id);
  const compartment = section.category
    ? cell?.biophysics.compartments.find((c) => c.id === section.category)
    : undefined;
  const pointCount = section.coords?.length ?? 0;

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      <div className="flex flex-col gap-1">
        <h2 className="break-all text-lg font-semibold">{section.id}</h2>
        {section.category && (
          <span className="text-xs text-muted-foreground">{section.category}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Place</div>
        {section.cell?.compoundId && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Cell</span>
            <ElektroCell.DetailLink
              object={{ id: section.cell.compoundId }}
              className="font-mono text-xs hover:underline"
            >
              {section.cell.id}
            </ElektroCell.DetailLink>
          </div>
        )}
        {parentId && (
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Parent</span>
            {parent?.compoundId ? (
              <ElektroSection.DetailLink
                object={{ id: parent.compoundId }}
                className="font-mono text-xs hover:underline"
              >
                {parentId}
              </ElektroSection.DetailLink>
            ) : (
              <span className="font-mono text-xs">{parentId}</span>
            )}
            {section.parent?.parentLocation != null && (
              <span className="font-mono text-xs text-muted-foreground">
                @ {section.parent.parentLocation}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold">Geometry</div>
        <Fact label="Diameter" value={section.diam} />
        <Fact label="Length" value={section.length} />
        <Fact label="Segments" value={section.nseg} />
        <Fact label="Ra" value={section.ra} />
        <Fact label="Cm" value={section.cm} />
        <Fact label="d_lambda" value={section.dLambda} />
        {/* Where the drawing comes from: real pt3d points, or its length. */}
        <Fact
          label="Shape"
          value={pointCount >= 2 ? `${pointCount} points` : "laid out from its length"}
        />
      </div>

      {compartment && (
        <div className="flex flex-col gap-1">
          <SectionHeader title="Mechanisms" count={compartment.mechanisms.length} />
          {compartment.mechanisms.length > 0 && (
            <div className="flex flex-row flex-wrap gap-1">
              {compartment.mechanisms.map((mechanism) => (
                <Badge
                  key={mechanism}
                  variant="outline"
                  className="px-1.5 py-0 font-mono text-[0.625rem] font-normal"
                >
                  {mechanism}
                </Badge>
              ))}
            </div>
          )}
          {compartment.sectionParams.map((p, i) => (
            <div
              key={`${p.mechanism}-${p.param}-${i}`}
              className="flex items-baseline justify-between gap-2 text-xs"
              title={p.description ?? undefined}
            >
              <span className="min-w-0 truncate font-mono text-muted-foreground">
                {p.mechanism}.{p.param}
              </span>
              <span className="shrink-0 font-mono">
                {p.distribution.value == null ? "—" : String(p.distribution.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {section.sessions.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionHeader
            title="Recorded in"
            count={section.sessions.filter((s) => s.clock).length}
          />
          {section.sessions.map((session) => (
            <SessionCard key={session.clock?.id ?? "untimed"} session={session} />
          ))}
        </div>
      )}

      {children.length > 0 && (
        <div className="flex flex-col gap-1">
          <SectionHeader title="Children" count={children.length} />
          {children.map((child) => (
            <SectionLinkRow
              key={child.id}
              section={child}
              note={
                child.parent?.parentLocation != null
                  ? `@ ${child.parent.parentLocation}`
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};
