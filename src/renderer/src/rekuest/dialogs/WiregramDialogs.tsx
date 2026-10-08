import { useDialog } from "@/core/dialogs/registry";
import { RekuestWiregram } from "@/core/linkers";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { Checkbox } from "@/core/ui/checkbox";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Skeleton } from "@/core/ui/skeleton";
import { Textarea } from "@/core/ui/textarea";
import {
  useExportWiregramMutation,
  useImportWiregramMutation,
  useListSchedulesQuery,
  useListTriggersQuery,
} from "@/rekuest/api/graphql";
import {
  describeWiregram,
  downloadWiregram,
  keyFromName,
  parseWiregram,
} from "@/rekuest/lib/wiregram";
import { AlarmClock, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Import a wiregram: a document of schedules and triggers, from a file or
 * pasted. The server takes it all or nothing; a document whose key was
 * imported before updates what that import created and removes what it no
 * longer lists. `document` starts from one already at hand ("Import again").
 */
export const ImportWiregramDialog = (props: { document?: unknown }) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const [text, setText] = useState(() =>
    props.document == null ? "" : JSON.stringify(props.document, null, 2),
  );
  const [failure, setFailure] = useState<string | null>(null);
  const [importWiregram, { loading }] = useImportWiregramMutation({
    refetchQueries: ["ListWiregrams", "ListSchedules", "ListTriggers"],
  });
  const parsed = useMemo(() => parseWiregram(text), [text]);

  const submit = async () => {
    if (!parsed.ok) return;
    setFailure(null);
    try {
      const { data } = await importWiregram({ variables: { input: parsed.input } });
      closeDialog();
      const id = data?.importWiregram.id;
      if (id) navigate(RekuestWiregram.linkBuilder(id));
    } catch (error) {
      setFailure(errorMessage(error));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Import a wiregram</DialogTitle>
        <DialogDescription>
          A document of schedules and triggers. Importing a key again brings its rules in line
          with the new document.
        </DialogDescription>
      </DialogHeader>

      <Input
        type="file"
        accept=".json,application/json"
        aria-label="Wiregram file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) file.text().then(setText, (error) => setFailure(errorMessage(error)));
        }}
      />
      <Textarea
        className="h-56 font-mono text-xs"
        value={text}
        aria-label="Wiregram document"
        placeholder="…or paste the document here"
        spellCheck={false}
        onChange={(event) => setText(event.target.value)}
      />

      {parsed.ok ? (
        <p className="text-sm">
          <span className="font-medium">{parsed.summary.name}</span>
          <span className="ml-2 font-mono text-xs text-muted-foreground">{parsed.summary.key}</span>
          <span className="ml-2 text-muted-foreground">{describeWiregram(parsed.summary)}</span>
        </p>
      ) : (
        text.trim() && <p className="text-sm text-destructive">{parsed.error}</p>
      )}
      {failure && <p className="text-sm text-destructive">Could not import it: {failure}</p>}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeDialog} disabled={loading}>
          Cancel
        </Button>
        <Button type="button" onClick={submit} disabled={loading || !parsed.ok}>
          Import
        </Button>
      </DialogFooter>
    </div>
  );
};

const LIMIT = 200;

/**
 * Write existing rules down as a wiregram document, to import elsewhere.
 * Changes nothing here. Opened bare (choose the rules) or from a selection
 * of schedules and triggers, which then start checked.
 */
export const ExportWiregramDialog = (props: { schedules?: string[]; triggers?: string[] }) => {
  const { closeDialog } = useDialog();
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [schedules, setSchedules] = useState(() => new Set(props.schedules ?? []));
  const [triggers, setTriggers] = useState(() => new Set(props.triggers ?? []));
  const [failure, setFailure] = useState<string | null>(null);
  const [document, setDocument] = useState<unknown>(null);

  const scheduleQuery = useListSchedulesQuery({ variables: { pagination: { limit: LIMIT } } });
  const triggerQuery = useListTriggersQuery({ variables: { pagination: { limit: LIMIT } } });
  const [exportWiregram, { loading }] = useExportWiregramMutation();

  const finalKey = key.trim() || keyFromName(name);
  const count = schedules.size + triggers.size;
  const loadError = scheduleQuery.error ?? triggerQuery.error;

  const toggle = (set: Set<string>, update: (next: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (!next.delete(id)) next.add(id);
    update(next);
  };

  const submit = async () => {
    setFailure(null);
    try {
      const { data } = await exportWiregram({
        variables: {
          input: {
            key: finalKey,
            name: name.trim(),
            description: description.trim() || null,
            schedules: [...schedules],
            triggers: [...triggers],
          },
        },
      });
      setDocument(data?.exportWiregram ?? null);
    } catch (error) {
      setFailure(errorMessage(error));
    }
  };

  if (document != null) {
    const text = JSON.stringify(document, null, 2);
    return (
      <div className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>{name.trim()}</DialogTitle>
          <DialogDescription>
            The document. Import it in another organization to create the same rules there.
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[50vh] overflow-auto rounded-md border p-3 font-mono text-xs">{text}</pre>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeDialog}>
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              navigator.clipboard.writeText(text).then(
                () => toast.success("Copied"),
                (error) => toast.error(`Could not copy it: ${errorMessage(error)}`),
              )
            }
          >
            Copy
          </Button>
          <Button type="button" onClick={() => downloadWiregram(finalKey, document)}>
            Save file
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Export automations</DialogTitle>
        <DialogDescription>
          Writes the chosen rules down as one document. Nothing here changes.
        </DialogDescription>
      </DialogHeader>

      <Input value={name} aria-label="Name" placeholder="Name" onChange={(e) => setName(e.target.value)} />
      <Input
        className="font-mono text-xs"
        value={key}
        aria-label="Key"
        placeholder={keyFromName(name) || "key"}
        onChange={(e) => setKey(e.target.value)}
      />
      <Textarea
        className="min-h-16 text-sm"
        value={description}
        aria-label="Description"
        placeholder="What it is for (optional)"
        onChange={(e) => setDescription(e.target.value)}
      />

      {loadError && !scheduleQuery.data && !triggerQuery.data ? (
        <p className="text-sm text-destructive">Could not load the rules: {loadError.message}</p>
      ) : !scheduleQuery.data || !triggerQuery.data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
          {scheduleQuery.data.schedules.map((schedule) => (
            <label key={schedule.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
              <Checkbox
                checked={schedules.has(schedule.id)}
                onCheckedChange={() => toggle(schedules, setSchedules, schedule.id)}
              />
              <AlarmClock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate">{schedule.name}</span>
            </label>
          ))}
          {triggerQuery.data.triggers.map((trigger) => (
            <label key={trigger.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
              <Checkbox
                checked={triggers.has(trigger.id)}
                onCheckedChange={() => toggle(triggers, setTriggers, trigger.id)}
              />
              <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 truncate">{trigger.name}</span>
            </label>
          ))}
        </div>
      )}

      {failure && <p className="text-sm text-destructive">Could not export: {failure}</p>}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeDialog} disabled={loading}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={submit}
          disabled={loading || !name.trim() || !finalKey || count === 0}
        >
          Export {count > 0 ? count : ""}
        </Button>
      </DialogFooter>
    </div>
  );
};
