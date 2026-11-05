import type React from "react";
import { useDialog } from "@/core/dialogs/registry";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { cn } from "@/core/util/utils";
import { UserRoundPen } from "lucide-react";

/**
 * Who something is for. An item without its own assignee is its list's, shown
 * faded so it reads as inherited.
 */
export const TodoAssignee = ({
  own,
  inherited,
  edit,
  className,
}: {
  own?: string | null;
  inherited?: string | null;
  /** Make it a button that opens "Who is this for?" (`assigntodo`) for this item or list. */
  edit?: { kind: "item" | "list"; id: string };
  className?: string;
}) => {
  const sub = own || inherited;
  const shown = !sub ? (
    <span className={cn("text-xs text-muted-foreground", className)}>Unassigned</span>
  ) : (
    <span className={cn(!own && "opacity-60", className)} title={own ? undefined : "From the list"}>
      <StructureDisplay identifier="@lok/user" id={sub} variant="chip" />
    </span>
  );
  if (!edit) return shown;
  return <EditableAssignee edit={edit} current={own ?? null}>{shown}</EditableAssignee>;
};

const EditableAssignee = ({
  edit,
  current,
  children,
}: {
  edit: { kind: "item" | "list"; id: string };
  current: string | null;
  children: React.ReactNode;
}) => {
  const { openDialog } = useDialog();
  return (
    <button
      type="button"
      className="group/assignee inline-flex items-center gap-1 rounded-md px-1 -mx-1 hover:bg-muted"
      title="Change who it is for"
      onClick={(event) => {
        event.stopPropagation();
        openDialog("assigntodo", { kind: edit.kind, id: edit.id, current });
      }}
    >
      {children}
      <UserRoundPen className="size-3 text-muted-foreground opacity-0 transition-opacity group-hover/assignee:opacity-100" />
    </button>
  );
};
