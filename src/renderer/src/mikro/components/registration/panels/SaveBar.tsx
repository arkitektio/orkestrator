import { AlertTriangle, Loader2, Redo2, RotateCcw, Save, Undo2, X } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { useRegistrationSave } from "../hooks/useRegistrationSave";
import { useRegistration, useRegistrationApi } from "../store/context";
import { isDirty } from "../store/registrationStore";

/** What pressing Save will do, in a sentence — before it is pressed. */
const planSummary = (plan: ReturnType<typeof useRegistrationSave>["plan"]): string | null => {
  if (!plan) return null;
  switch (plan.kind) {
    case "noop":
      return "Nothing to save yet.";
    case "update":
      return "Saving refines the existing registration in place (its history is kept).";
    case "replace":
      return `Saving replaces the registration with a new one, because ${plan.because}.`;
    case "refuse":
      return plan.reason;
  }
};

export const SaveBar = () => {
  const api = useRegistrationApi();
  const phase = useRegistration((state) => state.session?.phase ?? null);
  const canUndo = useRegistration((state) => state.undoStack.length > 0);
  const canRedo = useRegistration((state) => state.redoStack.length > 0);
  const previewIssue = useRegistration((state) => state.previewIssue);
  const dirty = useRegistration((state) => isDirty(state));
  const { plan, loading, error, verdict, save } = useRegistrationSave();

  const saving = phase === "saving";
  const blocked = !plan || plan.kind === "noop" || plan.kind === "refuse";
  const confirm = verdict?.status === "editable" ? verdict.confirm : null;
  const summary = error ? `Could not load the registration edge: ${error.message}` : planSummary(plan);
  const warn = Boolean(error) || plan?.kind === "refuse";

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-2">
      {previewIssue && (
        <div className="flex gap-1.5 text-xs text-amber-500">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>Not previewed: {previewIssue}</span>
        </div>
      )}
      {summary && (
        <div className={`text-xs ${warn ? "text-destructive" : "text-muted-foreground"}`}>
          {loading && !plan ? "Checking the registration edge…" : summary}
        </div>
      )}
      {confirm && plan?.kind !== "noop" && <div className="text-xs text-amber-500">{confirm}</div>}

      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon-sm" disabled={!canUndo || saving} onClick={() => api.getState().undo()} title="Undo (⌘Z)">
          <Undo2 />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" disabled={!canRedo || saving} onClick={() => api.getState().redo()} title="Redo (⇧⌘Z)">
          <Redo2 />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" disabled={saving} onClick={() => api.getState().reset()} title="Back to the saved placement">
          <RotateCcw />
        </Button>
        <div className="flex-1" />
        <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => api.getState().end()}>
          {/* Says what it does: leaving with a draft throws the draft away. */}
          <X /> {dirty ? "Discard" : "Close"}
        </Button>
        <Button type="button" size="sm" disabled={blocked || saving} onClick={() => void save()}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />} Save
        </Button>
      </div>
    </div>
  );
};
