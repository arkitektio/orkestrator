import { MikroLens } from "@/core/linkers";
import { lensLabel, lensTitle } from "@/mikro/lenses";
import { ScanSearch } from "lucide-react";
import type { LayerState } from "../../platform/stores/sceneStore";

/**
 * What the layers under it READ: the lens, and through it the dataset.
 *
 * A scene never touches a dataset directly — every array layer draws a lens,
 * and the lens selects from a dataset. That hop was invisible in this panel: a
 * stack of channel rows gave no sign of which selection of which dataset they
 * were, which matters the moment a scene composes two datasets or a crop next
 * to the array it was cut from. So the layers of one lens sit under one line
 * naming it, and the line leads to the lens' own page.
 *
 * A plain link, deliberately not `MikroLens.Smart`: `useSmartModel` snapshots
 * the selection store per instance, and this is the panel that already froze
 * once (see `LayerRow`, whose rows are the lens' drop targets).
 */
export const LayerLensHeader = ({ lens }: { lens: LayerState["lens"] }) => (
  <MikroLens.DetailLink
    object={lens}
    title={`${lens.dataset.name} · ${lensLabel(lens)}`}
    className="col-span-full mt-1.5 flex min-w-0 items-center gap-1.5 px-1 text-[0.625rem] text-white/50 first:mt-0 hover:text-white/90"
  >
    <ScanSearch className="h-3 w-3 shrink-0" />
    <span className="min-w-0 truncate">
      <span className="text-white/70">{lens.dataset.name}</span>
      {" · "}
      {lensTitle(lens)}
    </span>
  </MikroLens.DetailLink>
);
