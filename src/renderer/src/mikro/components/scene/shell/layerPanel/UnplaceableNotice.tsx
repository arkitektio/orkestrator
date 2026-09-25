import type { UnplaceableReason } from "../../platform/model/placeable";

const COPY: Record<UnplaceableReason, { label: string; title: string }> = {
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
      className="flex items-center gap-2 rounded-b-lg border border-t-0 border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-200"
      title={copy.title}
    >
      <span className="min-w-0 flex-1 truncate">⚠ {copy.label}</span>
    </div>
  );
};
