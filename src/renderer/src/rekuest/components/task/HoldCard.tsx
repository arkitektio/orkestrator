import { reportErrorAs } from "@/core/notify";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Button } from "@/core/ui/button";
import { Textarea } from "@/core/ui/textarea";
import { cn } from "@/core/util/utils";
import { useDecideMutation } from "@/rekuest/api/graphql";
import { HoldRequest } from "@/rekuest/lib/holds";
import { Check, Hand, X } from "lucide-react";
import { useState } from "react";

const compactJson = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (typeof value === "object" && Object.keys(value as object).length === 0) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

/**
 * Something waits for the user's decision: a child an agent asked to run, or a
 * task's own hold. The prompt is the agent's words, so it is labelled as such;
 * what the server knows for certain (the action, the agent, the arguments)
 * stands beneath it. Approve / Deny answer the held task with `decide`.
 */
export const HoldCard = ({
  hold,
  className,
}: {
  hold: HoldRequest;
  className?: string;
}) => {
  const [decide, { loading }] = useDecideMutation();
  const [answer, setAnswer] = useState("");
  const [answering, setAnswering] = useState(false);

  const send = (approved: boolean) =>
    decide({
      variables: {
        input: { task: hold.task, approved, answer: answer.trim() || null },
      },
    }).catch(reportErrorAs(approved ? "Couldn't approve it" : "Couldn't deny it"));

  const args = compactJson(hold.args);
  const speaker = hold.callerAgent?.name ?? (hold.kind === "self" ? "The task" : "An agent");

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs shadow-md backdrop-blur-md",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Hand className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{speaker} says</div>
          <div className="font-semibold text-foreground">{hold.title}</div>
          {hold.description && <div className="mt-0.5 text-muted-foreground">{hold.description}</div>}
        </div>
      </div>

      {hold.kind === "assign" && (
        <div className="flex flex-col gap-1 rounded-lg border border-muted-foreground/10 bg-background/40 px-2 py-1.5">
          {hold.action && (
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-muted-foreground">Runs</span>
              <StructureDisplay
                identifier="@rekuest/action"
                id={hold.action.id}
                small
                fallback={<span className="font-medium">{hold.action.name}</span>}
              />
            </div>
          )}
          {hold.agent && (
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-muted-foreground">On</span>
              <span className="truncate font-medium">{hold.agent.name}</span>
            </div>
          )}
          {args && (
            <div className="flex items-start gap-2">
              <span className="w-12 shrink-0 text-muted-foreground">With</span>
              <code className="line-clamp-3 break-all font-mono text-[10px]">{args}</code>
            </div>
          )}
        </div>
      )}

      {answering && (
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Anything to tell it? (optional)"
          className="min-h-10 bg-background/60"
          autoFocus
        />
      )}

      <div className="flex items-center justify-end gap-1.5">
        {!answering && (
          <Button size="sm" variant="ghost" onClick={() => setAnswering(true)}>
            Add a note
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={loading} onClick={() => send(false)}>
          <X /> Deny
        </Button>
        <Button size="sm" disabled={loading} onClick={() => send(true)}>
          <Check /> Approve
        </Button>
      </div>
    </div>
  );
};
