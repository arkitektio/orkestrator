import { describeError } from "@/core/notify";
import { CopyButton } from "@/core/ui/copy-button";
import { cn } from "@/core/util/utils";
import { AlertCircle } from "lucide-react";
import { useState } from "react";

/**
 * Why something failed, shown where it was asked for (a form, a dialog)
 * instead of as a toast. One sentence from `describeError`; the raw text
 * (codes, paths) behind a "Details" toggle with a copy button. Renders
 * nothing without an error.
 *
 * `variant="line"` is the unboxed form for a footer, next to the button that
 * was pressed.
 */
export const ErrorNote = ({
  error,
  title,
  className,
  variant = "box",
}: {
  error: unknown;
  /** What failed, above the reason: "Couldn't create the folder". */
  title?: string;
  className?: string;
  variant?: "box" | "line";
}) => {
  const [open, setOpen] = useState(false);
  if (!error) return null;
  const { message, technical } = describeError(error);
  const details = technical && technical !== message ? technical : null;

  if (variant === "line") {
    return (
      <div
        role="alert"
        title={details ?? undefined}
        className={cn("flex min-w-0 items-center gap-1.5 text-sm text-destructive", className)}
      >
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span className="line-clamp-2 min-w-0 break-words">{title ? `${title}: ${message}` : message}</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        <p className="break-words">{message}</p>
        {details && (
          <>
            <button
              type="button"
              className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? "Hide details" : "Details"}
            </button>
            {open && (
              <div className="mt-1 flex items-start gap-1">
                <pre className="max-h-40 min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded bg-background/60 p-2 font-mono text-[11px] text-muted-foreground">
                  {details}
                </pre>
                <CopyButton value={details} title="Copy details" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
