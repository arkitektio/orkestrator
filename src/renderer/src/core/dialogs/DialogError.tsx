import { recordError } from "@/core/diagnostics/recorder";
import { reportError } from "@/core/notify";
import { ErrorNote } from "@/core/ui/error-note";
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";

/**
 * A dialog's own failures, shown in the dialog.
 *
 * `DialogProvider` gives every dialog and sheet it opens a fresh scope. A
 * submit that fails reports into it (`useDialogSubmit` does this for you) and
 * the dialog stays open with the reason above its buttons — never a toast in
 * the island for something the user is looking at. Where the note goes:
 * - a `<DialogError />` the dialog placed itself, if any;
 * - else the first `DialogFooter` (it carries a `DialogFooterError`);
 * - else the scope's own note at the foot.
 */
type DialogErrorState = {
  error: unknown;
  /** What failed, above the reason: "Couldn't create the folder". */
  title?: string;
  report: (error: unknown, title?: string) => void;
  clear: () => void;
  /** A `<DialogError />` is placing the note itself; returns its release. */
  claim: () => () => void;
  /** A footer offers to place the note; the first one mounted gets it. */
  claimFooter: () => { id: number; release: () => void };
  /** Placed by a `<DialogError />`: footers stay quiet. */
  placed: boolean;
  /** The footer that shows the note, when none is placed. */
  footer: number | null;
};

let nextFooter = 0;

const DialogErrorContext = createContext<DialogErrorState | null>(null);

export const DialogErrorScope = ({ children }: { children: React.ReactNode }) => {
  const [failure, setFailure] = useState<{ error: unknown; title?: string } | null>(null);
  const [claims, setClaims] = useState(0);
  const [footers, setFooters] = useState<readonly number[]>([]);

  const report = useCallback(
    (error: unknown, title?: string) => {
      recordError(error, { source: "dialog", title });
      setFailure({ error: error ?? new Error(), title });
    },
    [],
  );
  const clear = useCallback(() => setFailure(null), []);
  const claim = useCallback(() => {
    setClaims((n) => n + 1);
    return () => setClaims((n) => n - 1);
  }, []);
  const claimFooter = useCallback(() => {
    const id = nextFooter++;
    setFooters((ids) => [...ids, id]);
    return { id, release: () => setFooters((ids) => ids.filter((other) => other !== id)) };
  }, []);

  const error = failure?.error ?? null;
  const title = failure?.title;
  const placed = claims > 0;
  const footer = footers[0] ?? null;
  const value = useMemo(
    () => ({ error, title, report, clear, claim, claimFooter, placed, footer }),
    [error, title, report, clear, claim, claimFooter, placed, footer],
  );

  return (
    <DialogErrorContext.Provider value={value}>
      {children}
      {!placed && footer === null && <ErrorNote error={error} title={title} className="mt-4 shrink-0" />}
    </DialogErrorContext.Provider>
  );
};

/** Places the dialog's error note here instead of at the dialog's foot. */
export const DialogError = ({ className, variant }: { className?: string; variant?: "box" | "line" }) => {
  const scope = useContext(DialogErrorContext);
  useLayoutEffect(() => scope?.claim(), [scope?.claim]);
  return <ErrorNote error={scope?.error} title={scope?.title} className={className} variant={variant} />;
};

/**
 * The note's slot in a `DialogFooter`, above its buttons. Shows only for the
 * first footer of a scope, and only when the dialog placed no
 * `<DialogError />` itself; outside a dialog it renders nothing.
 */
export const DialogFooterError = ({ className }: { className?: string }) => {
  const scope = useContext(DialogErrorContext);
  const [id, setId] = useState<number | null>(null);
  const claimFooter = scope?.claimFooter;
  useLayoutEffect(() => {
    if (!claimFooter) return;
    const { id, release } = claimFooter();
    setId(id);
    return release;
  }, [claimFooter]);
  if (!scope || scope.placed || id === null || scope.footer !== id) return null;
  return <ErrorNote error={scope.error} title={scope.title} className={className} />;
};

const outsideDialog: DialogErrorState = {
  error: null,
  report: (error, title) => reportError(error, title ?? "Something failed"),
  clear: () => {},
  claim: () => () => {},
  claimFooter: () => ({ id: -1, release: () => {} }),
  placed: false,
  footer: null,
};

/**
 * The scope of the dialog this component renders in. A form that is also
 * used outside a dialog still works: there, a report becomes an island toast.
 */
export const useDialogError = (): DialogErrorState => useContext(DialogErrorContext) ?? outsideDialog;

/** True when rendered inside a dialog's scope. */
export const useInDialog = () => useContext(DialogErrorContext) !== null;
