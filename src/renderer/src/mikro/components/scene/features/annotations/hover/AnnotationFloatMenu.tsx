import { EyeIcon, InfoIcon, LayersIcon, PinIcon, PlayIcon, RulerIcon } from "lucide-react";

import { FloatMenu, type FloatMenuEntry } from "../../../platform/float/FloatMenu";
import type { SelectedRoi } from "../roiSelectionStore";
import { StagedPane, type FloatStaging } from "../../staging/FloatStaging";
import { useRoiMeasure } from "../useRoiMeasure";
import {
  AnnotationDerived,
  type AnnotationInfo,
  AnnotationDetails,
  InfoPending,
  derivedCount,
  hasDetails,
  useAnnotationInfo,
} from "./AnnotationInfoCard";
import { AnnotationPairActions } from "./AnnotationPairActions";

const NOTHING = () => {};

/**
 * The annotation float's body: a short menu, each row its own pane.
 *
 * - **In the scene**: what this card staged, to keep or discard. Shown only
 *   while there is something, first, in the brand hue.
 * - **Run**: the actions on this shape with the image under it, and on its
 *   crop (`AnnotationPairActions`). Typing on the menu lands here.
 * - **Derived**: what was cut, computed or refined from it, each stageable.
 * - **Details**: its description, where it is pinned, what it was made from.
 *
 * The shape's question (`GetAnnotationInfo`) is asked here, once, so the rows
 * can say how much each pane holds.
 */
export const AnnotationFloatMenu = ({
  roi,
  staging,
  pane,
  onPaneChange,
  autoFocus,
}: {
  roi: SelectedRoi;
  staging: FloatStaging;
  pane: string | null;
  onPaneChange: (pane: string | null) => void;
  autoFocus: boolean;
}) => {
  const { data, error, refetch } = useAnnotationInfo(roi.id);
  const info = data?.annotation;
  const staged = staging.entries.length;
  const pending = <InfoPending error={error} onRetry={() => refetch()} />;

  const entries: FloatMenuEntry[] = [
    {
      id: "staged",
      label: "In the scene",
      icon: EyeIcon,
      accent: true,
      hidden: staged === 0,
      hint: `${staged} not saved`,
      content: () => <StagedPane staging={staging} />,
    },
    {
      id: "run",
      label: "Run",
      icon: PlayIcon,
      hint: "on this shape",
      content: ({ typed }) => (
        <div className="px-1.5 pb-2 pt-1.5">
          <AnnotationPairActions roi={roi} autoFocus={!!typed} initialSearch={typed} onDone={NOTHING} />
        </div>
      ),
    },
    {
      id: "derived",
      label: "Derived",
      icon: LayersIcon,
      hint: info ? derivedCount(info) : "…",
      content: () => (info ? <AnnotationDerived info={info} /> : pending),
    },
    {
      id: "details",
      label: "Details",
      icon: InfoIcon,
      // The context line already says where it is pinned: Details is for
      // what it was made from, and a description too long for two lines.
      hidden: !info || !hasDetails(info) || (!info.description && info.derivedFrom.length === 0),
      content: () => (info ? <AnnotationDetails info={info} /> : pending),
    },
  ];

  return (
    <FloatMenu
      entries={entries}
      pane={pane}
      onPaneChange={onPaneChange}
      typeTo="run"
      autoFocus={autoFocus}
      summary={<AnnotationContext roi={roi} info={info} />}
    />
  );
};

/**
 * The few facts that place the shape, above the menu: how big it is (in the
 * scene's units), which slice it is pinned to, and the first lines of its
 * description. Nothing that needs a click.
 */
const AnnotationContext = ({ roi, info }: { roi: SelectedRoi; info: AnnotationInfo | undefined }) => {
  const measure = useRoiMeasure(roi);
  const pinned = roi.coordinates.map((coordinate) => `${coordinate.name} ${coordinate.value}`).join(" · ");
  const facts = [
    measure && { icon: RulerIcon, text: measure, title: "Size" },
    pinned && { icon: PinIcon, text: pinned, title: "Pinned to" },
  ].filter((fact): fact is { icon: typeof RulerIcon; text: string; title: string } => !!fact);
  if (facts.length === 0 && !info?.description) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {facts.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {facts.map((fact) => (
            <span key={fact.title} className="flex min-w-0 items-center gap-1" title={fact.title}>
              <fact.icon className="h-3 w-3 shrink-0" />
              <span className="truncate tabular-nums">{fact.text}</span>
            </span>
          ))}
        </div>
      )}
      {info?.description && <p className="line-clamp-2 text-foreground/80">{info.description}</p>}
    </div>
  );
};
