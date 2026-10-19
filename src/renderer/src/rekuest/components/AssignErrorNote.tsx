import { ErrorNote } from "@/core/ui/error-note";

/**
 * Why a run did not start, shown where it was started from (a form, a dialog)
 * instead of as a toast: the shared `ErrorNote`, which reads an `AssignError`
 * as its own sentence and keeps its technical line behind "Details".
 *
 * `variant="line"` is the unboxed form for a footer, next to the button that
 * was pressed.
 */
export const AssignErrorNote = (props: { error: unknown; className?: string; variant?: "box" | "line" }) => (
  <ErrorNote {...props} />
);
