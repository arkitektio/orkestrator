/**
 * Structural (not `instanceof HTMLElement`) so it stays testable in vitest's
 * default node environment — and so it keeps working for elements coming from
 * another document/realm.
 */
export const isTypingTarget = (
  target: { tagName?: string; isContentEditable?: boolean } | null | undefined,
): boolean => {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
};

/**
 * Whether a key event may be read as scene navigation.
 *
 * Stricter than "not typing", because the arrow keys are contested: the Z and
 * dim scrubbers are Radix sliders, which handle arrows on a focused thumb, and
 * a list or a menu does the same. Panning the camera at the same time would be
 * two responses to one press. So the scene only claims arrows when nothing is
 * focused — `body`, which is where the R3F canvas leaves focus since it carries
 * no tabindex — or when the canvas itself somehow holds it.
 *
 * Note this is about the *arrow cluster* specifically. Bindings on keys nobody
 * else wants (hold-`P`, `Shift`+digit) only need `isTypingTarget`.
 */
export const isSceneNavigationTarget = (
  target: { tagName?: string; isContentEditable?: boolean } | null | undefined,
): boolean => {
  if (!target) return true; // No target at all: nothing else can be claiming it.
  if (isTypingTarget(target)) return false;
  const tag = target.tagName;
  return tag === "BODY" || tag === "CANVAS";
};
