import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { Button } from "@/core/ui/button";
import {
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { cn } from "@/core/util/utils";
import { useBlokNamesStartingWithLazyQuery, useCreateBlokMutation } from "@/rekuest/api/graphql";
import { blokHeader, parseBsxSafe } from "@arkitektio/bsx/bsx/index";
import { FileUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BLOK_CONTEXTS } from "../components/blokContexts";
import {
  BLOK_FILE_EXTENSION,
  blokFileCreateInput,
  parseBlokFile,
  type BlokFileDraft,
} from "../components/editor/blokFile";
import { uniqueName } from "../lib/agentBlokScaffold";

const stem = (fileName: string) =>
  fileName.replace(BLOK_FILE_EXTENSION, "").replace(/\.(json|bsx)$/i, "").replace(/[-_]+/g, " ").trim();

type Picked = { draft: BlokFileDraft; fileName: string };

/** The first step: a blok file (or bare BSX), chosen or dropped; why not, when it is not one. */
const PickStep = (props: { onPicked: (picked: Picked) => void }) => {
  const { closeDialog } = useDialog();
  const [problem, setProblem] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const read = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    try {
      const parsed = parseBlokFile(await file.text());
      if (parsed.ok) props.onPicked({ draft: parsed.draft, fileName: file.name });
      else setProblem(parsed.error);
    } catch {
      setProblem("The file could not be read.");
    }
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Install a blok from a file</DialogTitle>
        <DialogDescription>
          A blok file someone exported ({BLOK_FILE_EXTENSION}), or a bare .bsx file. Next you see what is in it.
        </DialogDescription>
      </DialogHeader>
      <DialogBody>
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-10 text-sm text-muted-foreground transition-colors hover:bg-muted/40",
            over && "border-primary bg-primary/5 text-foreground",
          )}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            if (!event.dataTransfer.files.length) return;
            event.preventDefault();
            event.stopPropagation();
            setOver(false);
            void read(event.dataTransfer.files[0]);
          }}
        >
          <FileUp className="size-6" />
          <span>Drop the file here, or click to choose it</span>
          <input
            type="file"
            className="sr-only"
            accept={`${BLOK_FILE_EXTENSION},.json,.bsx,application/json`}
            aria-label="Blok file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // The same file can be picked again after it was refused.
              event.target.value = "";
              void read(file);
            }}
          />
        </label>
        {problem && <p className="text-sm text-destructive">{problem}</p>}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={closeDialog}>
          Cancel
        </Button>
      </DialogFooter>
    </div>
  );
};

/**
 * Install a blok file: it becomes a template of this organization (under a
 * free name), and the install dialog then asks which agents it runs on.
 * "Open in editor" looks at it first instead; nothing is created until it is
 * saved there. Without a file it asks for one first.
 */
export const InstallBlokFileDialog = (props: Partial<Picked>) => {
  const [picked, setPicked] = useState<Picked | null>(
    props.draft && props.fileName ? { draft: props.draft, fileName: props.fileName } : null,
  );
  if (!picked) return <PickStep onPicked={setPicked} />;
  return <ReviewStep {...picked} />;
};

const ReviewStep = (props: Picked) => {
  const { closeDialog, openDialog } = useDialog();
  const navigate = useNavigate();
  const fallback = props.draft.name || stem(props.fileName) || "Imported blok";
  const [name, setName] = useState(fallback);
  const [create] = useCreateBlokMutation({ refetchQueries: ["ListBloks"] });
  const [namesTaken] = useBlokNamesStartingWithLazyQuery({ fetchPolicy: "network-only" });

  const context = useMemo(() => {
    const parsed = parseBsxSafe(props.draft.source);
    const header = parsed.ok ? blokHeader(parsed.tree) : null;
    return header ? BLOK_CONTEXTS[header.context as keyof typeof BLOK_CONTEXTS] : undefined;
  }, [props.draft.source]);
  const agents = props.draft.dependencies;

  const { submit, submitting } = useDialogSubmit(
    async () => {
      const wanted = name.trim() || fallback;
      const { data } = await namesTaken({ variables: { prefix: wanted } });
      const free = uniqueName(wanted, (data?.bloks ?? []).map((blok) => blok.name));
      const input = blokFileCreateInput(props.draft, free);
      if (!input) throw new Error("Its BSX does not parse, so it cannot be installed. Open it in the editor to fix it.");
      const created = await create({ variables: { input } });
      if (!created.data) throw new Error("Rekuest did not create the template");
      return created.data.createBlok;
    },
    {
      errorTitle: "Couldn't install the blok",
      close: false,
      onSuccess: (template) =>
        openDialog("materializeblok", { id: template.id, lead: `${template.name} is now a template of your organization.` }),
    },
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Install {fallback}</DialogTitle>
        <DialogDescription>
          From <span className="font-mono">{props.fileName}</span>. It becomes a template of your organization; next you
          choose the agents it runs on.
        </DialogDescription>
      </DialogHeader>
      <DialogForm
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <DialogBody>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="install-name">Name</Label>
            <Input id="install-name" value={name} autoFocus onChange={(event) => setName(event.target.value)} />
          </div>
          {(context || props.draft.description) && (
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              {context && (
                <span className="flex items-center gap-1.5 text-foreground">
                  <context.icon className="size-3.5" />
                  {context.label}
                </span>
              )}
              {context && props.draft.description && <span>·</span>}
              {props.draft.description}
            </p>
          )}
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Agents it asks for</span>
            {agents.length === 0 ? (
              <span className="text-muted-foreground">None: it is ready once installed.</span>
            ) : (
              <ul className="flex flex-col gap-1">
                {agents.map((agent) => (
                  <li key={agent.uid} className="flex flex-col">
                    <span className="font-mono text-xs">{agent.key}</span>
                    {(agent.description || agent.app) && (
                      <span className="text-xs text-muted-foreground">{agent.description || agent.app}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => {
              closeDialog();
              navigate("/rekuest/bloks/new", { state: { draft: { ...props.draft, name: name.trim() } } });
            }}
          >
            Open in editor
          </Button>
          <Button type="submit" disabled={submitting}>
            Install
          </Button>
        </DialogFooter>
      </DialogForm>
    </div>
  );
};
