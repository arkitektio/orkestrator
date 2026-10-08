import { AlertCircle } from "lucide-react";

import { AssignError, assignErrorMessage } from "../lib/assignError";

/**
 * Why a run did not start, shown where it was started from (a form, a dialog)
 * instead of as a toast. Renders nothing without an error; the technical line
 * (code, path) is the tooltip.
 *
 * `variant="line"` is the unboxed form for a footer, next to the button that
 * was pressed.
 */
export const AssignErrorNote = ({
  error,
  className,
  variant = "box",
}: {
  error: unknown;
  className?: string;
  variant?: "box" | "line";
}) => {
  if (!error) return null;

  if (variant === "line") {
    return (
      <div
        role="alert"
        title={error instanceof AssignError ? error.technical : undefined}
        className={`flex min-w-0 items-center gap-1.5 text-sm text-destructive ${className ?? ""}`}
      >
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="line-clamp-2 min-w-0 break-words">{assignErrorMessage(error)}</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      title={error instanceof AssignError ? error.technical : undefined}
      className={`flex items-start gap-2 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive ${className ?? ""}`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">{assignErrorMessage(error)}</span>
    </div>
  );
};
