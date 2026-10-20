import { reportError } from "@/core/notify";
import { ErrorNote } from "@/core/ui/error-note";
import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";

/**
 * A dialog's own failures, shown in the dialog.
 *
 * `DialogProvider` gives every dialog and sheet it opens a fresh scope. A
 * submit that fails reports into it (`useDialogSubmit` does this for you) and
 * the dialog stays open with the reason at its foot — never a toast in the
 * island for something the user is looking at. A dialog that wants the note
 * elsewhere (next to its footer button) renders `<DialogError />` there, and
 * the scope's own note at the foot steps aside.
 */
type DialogErrorState = {
  error: unknown;
  /** What failed, above the reason: "Couldn't create the folder". */
  title?: string;
  report: (error: unknown, title?: string) => void;
  clear: () => void;
  /** A `<DialogError />` is placing the note itself; returns its release. */
  claim: () => () => void;
};

const DialogErrorContext = createContext<DialogErrorState | null>(null);

export const DialogErrorScope = ({ children }: { children: React.ReactNode }) => {
  const [failure, setFailure] = useState<{ error: unknown; title?: string } | null>(null);
  const [claims, setClaims] = useState(0);

  const report = useCallback(
    (error: unknown, title?: string) => setFailure({ error: error ?? new Error(), title }),
    [],
  );
  const clear = useCallback(() => setFailure(null), []);
  const claim = useCallback(() => {
    setClaims((n) => n + 1);
    return () => setClaims((n) => n - 1);
  }, []);

  const error = failure?.error ?? null;
  const title = failure?.title;
  const value = useMemo(() => ({ error, title, report, clear, claim }), [error, title, report, clear, claim]);

  return (
    <DialogErrorContext.Provider value={value}>
      {children}
      {claims === 0 && <ErrorNote error={error} title={title} className="mt-4" />}
    </DialogErrorContext.Provider>
  );
};

/** Places the dialog's error note here instead of at the dialog's foot. */
export const DialogError = ({ className, variant }: { className?: string; variant?: "box" | "line" }) => {
  const scope = useContext(DialogErrorContext);
  useLayoutEffect(() => scope?.claim(), [scope?.claim]);
  return <ErrorNote error={scope?.error} title={scope?.title} className={className} variant={variant} />;
};

const outsideDialog: DialogErrorState = {
  error: null,
  report: (error, title) => reportError(error, title ?? "Something failed"),
  clear: () => {},
  claim: () => () => {},
};

/**
 * The scope of the dialog this component renders in. A form that is also
 * used outside a dialog still works: there, a report becomes an island toast.
 */
export const useDialogError = (): DialogErrorState => useContext(DialogErrorContext) ?? outsideDialog;

/** True when rendered inside a dialog's scope. */
export const useInDialog = () => useContext(DialogErrorContext) !== null;
