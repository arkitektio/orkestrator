import {
  PopoutChips,
  PopoutFact,
  PopoutNote,
  PopoutSection,
  ThreeDPopoutCard,
} from "@/components/popout/ThreeDPopoutCard";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { ElektroArrayDataset } from "@/linkers";
import { AudioLines, PanelRightClose, PanelRightOpen } from "lucide-react";
import {
  CompartmentFragment,
  NeuronModelSessionFragment,
  SectionFragment,
  useSectionSessionsQuery,
} from "../../../api/graphql";
import { InlineTraceViewer } from "../../arraydataset/InlineTraceViewer";
import { rgbaToCss } from "../../../lib/color";
import { useOpenClockOnTimeline } from "../../../lib/useOpenClockOnTimeline";
import { useMorphologyStore, useMorphologyStoreApi } from "../stores/morphologyStore";

/**
 * Section panels: a `ThreeDPopoutCard` per open section, parked on the point
 * that was clicked. The cards are plain DOM over the canvas (`PanelOverlay`);
 * `PanelProjector`, inside the canvas, projects each anchor through the camera
 * on every drawn frame and writes the transform straight onto the node.
 */

/**
 * Lives inside the <Canvas>. Each frame it projects every open panel's
 * world-space anchor into screen pixels using the camera (the three.js scene
 * api) and writes the result straight onto the matching DOM node's transform.
 * Doing it imperatively avoids a React re-render on every frame.
 */
/** Gap between the clicked point and the card, and the card and the frame edge. */
const PANEL_GAP = 12;
const PANEL_MARGIN = 8;

export const PanelProjector = ({
  nodes,
}: {
  nodes: React.RefObject<Map<string, HTMLDivElement>>;
}) => {
  const projected = useMemo(() => new THREE.Vector3(), []);
  const store = useMorphologyStoreApi();
  const invalidate = useThree((s) => s.invalidate);

  // The frame loop is on demand: a panel that opens without the camera moving
  // still needs a frame to be placed — one after its node has mounted.
  useEffect(
    () =>
      store.subscribe((state, previous) => {
        if (state.panels !== previous.panels) requestAnimationFrame(() => invalidate());
      }),
    [store, invalidate],
  );

  useFrame(({ camera, size }) => {
    const { panels } = store.getState();
    for (const id in panels) {
      const node = nodes.current?.get(id);
      if (!node) continue;

      const [x, y, z] = panels[id].position;
      projected.set(x, y, z).project(camera);

      const anchorX = (projected.x * 0.5 + 0.5) * size.width;
      const anchorY = (-projected.y * 0.5 + 0.5) * size.height;
      const behindCamera = projected.z > 1;

      // The card wants to sit centred above the point. Near the top it flips
      // below, and near any edge it slides inward, so it is never clipped by
      // the frame — the anchor dot (the node's first child) stays on the
      // point itself, so a card that had to move still reads as attached.
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      let left = anchorX - width / 2;
      let top = anchorY - height - PANEL_GAP;
      if (top < PANEL_MARGIN) top = anchorY + PANEL_GAP;
      left = Math.min(Math.max(left, PANEL_MARGIN), Math.max(PANEL_MARGIN, size.width - width - PANEL_MARGIN));
      top = Math.min(Math.max(top, PANEL_MARGIN), Math.max(PANEL_MARGIN, size.height - height - PANEL_MARGIN));

      node.style.transform = `translate(${left}px, ${top}px)`;
      node.style.opacity = behindCamera ? "0" : "1";
      node.style.pointerEvents = behindCamera ? "none" : "auto";

      const dot = node.firstElementChild as HTMLElement | null;
      if (dot) {
        dot.style.transform = `translate(${anchorX - left}px, ${anchorY - top}px)`;
      }
    }
  });

  return null;
};

type SessionDataset = NeuronModelSessionFragment["datasets"][number];

/**
 * Where a section was recorded: its sessions, one per run, each a clock (the
 * way onto its timeline) and the datasets recorded here on it. A dataset can be
 * opened inline — drawn in a small timeline the card expands to the right with
 * (`inline`, the card's `aside`).
 *
 * Mounted only inside an open panel, so the query runs when a section is
 * opened — never for the whole model. Renders nothing while loading, on error,
 * and for a section nothing was recorded at.
 */
const SectionSessions = ({
  modelId,
  cellId,
  sectionId,
  inline,
  onToggleInline,
}: {
  modelId: string;
  cellId: string;
  sectionId: string;
  inline: string | null;
  onToggleInline: (dataset: SessionDataset) => void;
}) => {
  const { data } = useSectionSessionsQuery({
    variables: { model: modelId, cell: cellId, section: sectionId },
  });
  const { open, opening, ready } = useOpenClockOnTimeline();
  const sessions = (data?.sections ?? []).flatMap((section) => section.sessions);
  if (sessions.length === 0) return null;

  return (
    <PopoutSection title="Recorded in">
      {sessions.map((session, i) => (
        <div key={session.clock?.id ?? `untimed-${i}`} className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1">
            <span className="min-w-0 flex-1 truncate font-medium" title={session.clock?.name}>
              {session.clock ? session.clock.name : "Not timed yet"}
            </span>
            {session.clock && (
              <button
                type="button"
                disabled={opening || !ready}
                onClick={() => session.clock && open(session.clock)}
                className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                title="Open on timeline"
                aria-label="Open on timeline"
              >
                <AudioLines className="size-3.5" />
              </button>
            )}
          </div>
          {session.datasets.map((dataset) => {
            const open = inline === dataset.id;
            const Icon = open ? PanelRightClose : PanelRightOpen;
            return (
              <div key={dataset.id} className="group flex min-w-0 items-center gap-1">
                <ElektroArrayDataset.DetailLink
                  object={dataset}
                  className={
                    "min-w-0 flex-1 truncate font-mono text-[10px] hover:text-foreground " +
                    (open ? "text-foreground" : "text-muted-foreground")
                  }
                >
                  {dataset.name}
                </ElektroArrayDataset.DetailLink>
                <button
                  type="button"
                  onClick={() => onToggleInline(dataset)}
                  className={
                    "shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground " +
                    (open ? "text-foreground" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")
                  }
                  title={open ? "Close inline" : "Open inline"}
                  aria-label={open ? "Close inline" : "Open inline"}
                  aria-pressed={open}
                >
                  <Icon className="size-3" />
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </PopoutSection>
  );
};

/**
 * The parameter card for one section — a `ThreeDPopoutCard`, the same card a
 * recording site pops out of a timeline track with. Geometry first, then the
 * compartment's mechanisms, parameters and ions. Per-section overrides of the
 * model globals (Ra, Cm, d_lambda) show only when set, so an inherited value is
 * not shown as if it were this section's own.
 */
const NeuronPanelCard = ({
  modelId,
  cellId,
  section,
  compartment,
  onClose,
}: {
  modelId: string;
  cellId?: string;
  section?: SectionFragment;
  compartment?: CompartmentFragment;
  onClose: () => void;
}) => {
  // The dataset drawn in the card's right-hand expansion, if any — one at a
  // time, per panel.
  const [inline, setInline] = useState<SessionDataset | null>(null);
  if (!section) return null;

  return (
    <ThreeDPopoutCard
      eyebrow={section.category ? `Section · ${section.category}` : "Section"}
      title={section.id}
      titleHint={section.id}
      swatch={rgbaToCss(compartment?.color)}
      onClose={onClose}
      aside={inline && <InlineTraceViewer key={inline.id} dataset={inline} />}
    >
      <PopoutSection title="Geometry">
        <PopoutFact label="Diameter">{section.diam}</PopoutFact>
        {section.length && <PopoutFact label="Length">{section.length}</PopoutFact>}
        <PopoutFact label="Segments">{section.nseg}</PopoutFact>
        {section.ra && <PopoutFact label="Ra">{section.ra}</PopoutFact>}
        {section.cm && <PopoutFact label="Cm">{section.cm}</PopoutFact>}
        {section.dLambda != null && <PopoutFact label="d_lambda">{section.dLambda}</PopoutFact>}
      </PopoutSection>

      {compartment && (
        <>
          <PopoutSection title="Mechanisms">
            {compartment.mechanisms.length === 0 ? (
              <PopoutNote>None</PopoutNote>
            ) : (
              <PopoutChips items={compartment.mechanisms} />
            )}
          </PopoutSection>

          {compartment.sectionParams.length > 0 && (
            <PopoutSection title="Parameters">
              {compartment.sectionParams.map((p, i) => (
                <PopoutFact key={`${p.mechanism}-${p.param}-${i}`} label={`${p.mechanism}.${p.param}`}>
                  {p.distribution.value == null ? "—" : String(p.distribution.value)}
                </PopoutFact>
              ))}
            </PopoutSection>
          )}

          {compartment.ions.length > 0 && (
            <PopoutSection title="Ions">
              {compartment.ions.map((ion) => (
                <PopoutFact key={ion.ion} label={`${ion.ion} · ${ion.style.toLowerCase()}`}>
                  {ion.reversalPotential ?? "—"}
                </PopoutFact>
              ))}
            </PopoutSection>
          )}
        </>
      )}

      {cellId && (
        <SectionSessions
          modelId={modelId}
          cellId={cellId}
          sectionId={section.id}
          inline={inline?.id ?? null}
          onToggleInline={(dataset) => setInline((current) => (current?.id === dataset.id ? null : dataset))}
        />
      )}
    </ThreeDPopoutCard>
  );
};

/**
 * Sits on top of the <Canvas> as a normal DOM layer. It renders one panel per
 * open entry in the store; positioning is handled imperatively by
 * <PanelProjector>, which writes onto the refs we register here.
 */
export const PanelOverlay = ({
  modelId,
  cellOf,
  sectionMap,
  compartmentMap,
  nodes,
}: {
  modelId: string;
  /** Section id → the cell it belongs to (the sessions query is per cell). */
  cellOf: Map<string, string>;
  sectionMap: Map<string, SectionFragment>;
  compartmentMap: Record<string, CompartmentFragment>;
  nodes: React.RefObject<Map<string, HTMLDivElement>>;
}) => {
  const panels = useMorphologyStore((s) => s.panels);
  const closePanel = useMorphologyStore((s) => s.closePanel);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Object.values(panels).map((panel) => {
        const section = sectionMap.get(panel.sectionId);
        return (
          <div
            key={panel.sectionId}
            ref={(el) => {
              if (el) nodes.current?.set(panel.sectionId, el);
              else nodes.current?.delete(panel.sectionId);
            }}
            className="absolute left-0 top-0 will-change-transform"
            style={{ pointerEvents: "auto" }}
          >
            {/* First child by contract with PanelProjector: the dot that marks
                the clicked point, positioned relative to the card each frame. */}
            <span className="pointer-events-none absolute left-0 top-0 z-10 -ml-[5px] -mt-[5px] h-2.5 w-2.5 rounded-full bg-pink-500 ring-2 ring-black/60" />
            <NeuronPanelCard
              modelId={modelId}
              cellId={cellOf.get(panel.sectionId)}
              section={section}
              compartment={
                section?.category ? compartmentMap[section.category] : undefined
              }
              onClose={() => closePanel(panel.sectionId)}
            />
          </div>
        );
      })}
    </div>
  );
};
