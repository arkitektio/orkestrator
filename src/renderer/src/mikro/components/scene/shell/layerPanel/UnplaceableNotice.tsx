import type { UnplaceableReason } from "../../platform/model/placeable";

const COPY: Record<UnplaceableReason, { label: string; title: string; quiet?: boolean }> = {
  unregistered: {
    label: "not placed — no registration into this scene",
    title:
      "This layer has no path to the scene's world coordinate system, so it cannot be drawn. " +
      "Register its coordinate system into the scene (a scale, translation or affine edge) to place it.",
  },
  uncomposable: {
    label: "not placed — placement could not be composed",
    title:
      "The server could not condense this layer's path to the world into one affine map " +
      "(a displacement-field step, or a step that cannot be inverted). The layer is not drawn " +
      "until its registration is expressed as affine edges.",
  },
  field: {
    label: "placed through a field — not drawable yet",
    title:
      "This layer is placed, but its registration reads one of the axes it draws from an array's " +
      "values: unevenly spaced z planes, or a warp field moving every voxel. The scene scrubs such " +
      "an axis when it is not drawn (time), but cannot yet bend voxels on screen, so the layer is not drawn.",
  },
  // Not a fault: the view, not the layer, decides this one.
  "edge-on": {
    label: "flat in this view",
    title:
      "This layer is flat along the axis the view now looks down, so from here it is a line. " +
      "It comes back when the view is turned to a plane it lies in (View settings → Plane).",
    quiet: true,
  },
};

/**
 * Warning strip for a layer the scene cannot place: the server's `asAffine`
 * — the only placement authority — is null. `LayerRenderer` does not dispatch
 * such a layer; this is what tells the user why their layer is not on the
 * canvas. Shown under EVERY layer kind's card (`LayerControlPanel` wraps the
 * card), because the rule is one rule.
 */
export const UnplaceableNotice = ({ reason }: { reason: UnplaceableReason }) => {
  const copy = COPY[reason];
  return (
    <div
      className={
        copy.quiet
          ? "flex items-center gap-2 rounded-b-lg border border-t-0 border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/60"
          : "flex items-center gap-2 rounded-b-lg border border-t-0 border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-200"
      }
      title={copy.title}
    >
      <span className="min-w-0 flex-1 truncate">{copy.quiet ? copy.label : `⚠ ${copy.label}`}</span>
    </div>
  );
};
