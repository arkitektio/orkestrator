import { MikroLens } from "@/core/linkers";
import type { LayerLensFragment } from "@/mikro/api/graphql";
import { describeLens, isWholeLens } from "@/mikro/lenses";
import type { LayerState } from "../../platform/stores/sceneStore";

/** A layer's lens as the header reads it: the renderer's array lens, or the
 *  thin lens a table, mesh, network or annotation layer carries. */
export type HeaderLens = LayerState["lens"] | LayerLensFragment;

/**
 * What the layers under it READ: the lens, and through it the container.
 *
 * A scene never touches a container directly — every layer draws a lens, and
 * the lens selects from a dataset, a table, a mesh, a network or an annotation
 * collection. That hop was invisible in this panel: a stack of channel rows
 * gave no sign of which selection of which dataset they were, which matters the
 * moment a scene composes two datasets or a crop next to the array it was cut
 * from, and equally when a point layer shows ten minutes of a table rather than
 * all of it. So the layers of one lens sit under one line naming it, with what
 * it cuts, and the line leads to the lens' own page.
 *
 * A plain link, deliberately not `MikroLens.Smart`: `useSmartModel` snapshots
 * the selection store per instance, and this is the panel that already froze
 * once (see `LayerRow`, whose rows are the lens' drop targets).
 */
export const LayerLensHeader = ({
  lens,
  drawnWhole = false,
}: {
  lens: HeaderLens;
  /**
   * The layers under this header do not apply the lens' selection yet: their
   * renderer draws the whole container. Said out loud for a lens that cuts
   * something, because a line reading "t 0…10" over a layer showing everything
   * would be a lie.
   */
  drawnWhole?: boolean;
}) => {
  const { info, title, label, container } = describeLens(lens);
  const Icon = info.icon;
  const overdrawn = drawnWhole && !isWholeLens(lens);

  return (
    <MikroLens.DetailLink
      object={lens}
      title={`${container.name} · ${label}`}
      className="col-span-full mt-1.5 flex min-w-0 items-center gap-1.5 px-1 text-[0.625rem] text-white/50 first:mt-0 hover:text-white/90"
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="min-w-0 truncate">
        <span className="text-white/70">{container.name}</span>
        {" · "}
        {title}
        {overdrawn && (
          <span
            className="text-amber-300/80"
            title="This layer does not apply its lens' windows yet: it draws the whole container."
          >
            {" · drawn whole"}
          </span>
        )}
      </span>
    </MikroLens.DetailLink>
  );
};
