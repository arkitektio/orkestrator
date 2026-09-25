import { useMemo } from "react";
import { ElektroSection } from "@/core/linkers";
import { useDetailNeuronModelQuery } from "../../api/graphql";
import { MorphologyScene } from "./MorphologyScene";

/**
 * One section of a neuron model drawn inline, in a small 3D frame inside
 * whatever opened it (a timeline channel card's `aside`, for the site it was
 * recorded at or stimulated through). The section is the focus: framed and
 * orbited, the rest of the model dimmed around it — `SectionPage`'s view, small.
 *
 * Frameless: the host card is the surface. The model query is the model page's
 * own (`DetailNeuronModel`), so opening the model afterwards is a cache hit.
 */
export const InlineSectionViewer = ({
  modelId,
  cell,
  section,
}: {
  modelId: string;
  /** The site's cell, when it names one — section ids are unique per cell. */
  cell?: string | null;
  section: string;
}) => {
  const { data, error } = useDetailNeuronModelQuery({ variables: { id: modelId } });
  const model = data?.neuronModel;
  const focus = useMemo(() => [section], [section]);

  // The section itself, for the link to its page (it carries the compound id).
  const found = useMemo(() => {
    for (const c of model?.config.cells ?? []) {
      if (cell && c.id !== cell) continue;
      const hit = c.topology.sections.find((s) => s.id === section);
      if (hit) return hit;
    }
    return null;
  }, [model, cell, section]);

  const message = error
    ? `Could not load the model: ${error.message}`
    : !model
      ? "Loading…"
      : !found
        ? `This model has no section ${section}.`
        : null;

  const caption = cell ? `${cell} › ${section}` : section;

  return (
    <div className="flex h-64 w-[22rem] flex-col gap-1.5">
      {found?.compoundId ? (
        <ElektroSection.DetailLink
          object={{ id: found.compoundId }}
          className="shrink-0 truncate text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {caption}
        </ElektroSection.DetailLink>
      ) : (
        <span className="shrink-0 truncate text-[10px] uppercase tracking-widest text-muted-foreground">
          {caption}
        </span>
      )}
      <div className="min-h-0 flex-1 overflow-hidden rounded-md">
        {message || !model ? (
          <div className="flex h-full items-center justify-center bg-black p-4 text-center text-muted-foreground">
            {message}
          </div>
        ) : (
          <MorphologyScene.Mini model={model} focus={focus} />
        )}
      </div>
    </div>
  );
};
