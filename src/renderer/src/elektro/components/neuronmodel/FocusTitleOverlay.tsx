import { ElektroCell, ElektroNeuronModel } from "@/core/linkers";

/**
 * The cell and section pages' title: the model's own overlay's place and
 * type, with the way back up above it — model › cell — since a zoomed-in
 * render is always a part of something. Positioned by the page, not the
 * renderer, like `NeuronModelTitleOverlay`.
 */
export const FocusTitleOverlay = ({
  kind,
  title,
  model,
  cell,
  facts,
}: {
  kind: "Cell" | "Section";
  title: string;
  model?: { id: string; name: string } | null;
  /** The cell a section belongs to; omitted on the cell's own page. */
  cell?: { id: string; compoundId?: string | null } | null;
  facts: React.ReactNode[];
}) => (
  <div className="pointer-events-none absolute left-3 top-3 z-40 flex w-[50%] flex-col gap-0.5">
    <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
      <span className="shrink-0 uppercase tracking-widest">{kind}</span>
      {model && (
        <>
          <span className="shrink-0">·</span>
          <ElektroNeuronModel.DetailLink
            object={model}
            className="pointer-events-auto min-w-0 truncate hover:text-foreground"
          >
            {model.name}
          </ElektroNeuronModel.DetailLink>
        </>
      )}
      {cell?.compoundId && (
        <>
          <span className="shrink-0">›</span>
          <ElektroCell.DetailLink
            object={{ id: cell.compoundId }}
            className="pointer-events-auto shrink-0 font-mono hover:text-foreground"
          >
            {cell.id}
          </ElektroCell.DetailLink>
        </>
      )}
    </div>
    {/* `break-all` like the model's title: ids are often one long token. */}
    <h1 className="w-fit max-w-full break-all text-3xl font-semibold leading-tight">{title}</h1>
    <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
      {facts.map((fact, i) => (
        <span key={i} className="shrink-0">
          {fact}
        </span>
      ))}
    </div>
  </div>
);
