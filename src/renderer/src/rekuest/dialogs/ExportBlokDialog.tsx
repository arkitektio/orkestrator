import { useDialog } from "@/core/dialogs/registry";
import { QueryError } from "@/core/layout/fallbacks/ErrorPage";
import { Button } from "@/core/ui/button";
import { CopyButton } from "@/core/ui/copy-button";
import {
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { ErrorNote } from "@/core/ui/error-note";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { useBlokEditorQuery } from "@/rekuest/api/graphql";
import { Check, Download, Loader2, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import { BLOK_CONTEXTS } from "../components/blokContexts";
import {
  blokFileName,
  blokFileText,
  downloadBlokFile,
  draftOfBlok,
} from "../components/editor/blokFile";

const Fact = (props: { included: boolean; children: React.ReactNode }) => (
  <li className="flex items-start gap-2">
    {props.included ? (
      <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
    ) : (
      <Minus className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
    )}
    <span className={props.included ? undefined : "text-muted-foreground"}>{props.children}</span>
  </li>
);

/**
 * Save a template as a file, to install in another organization or keep a
 * copy. It says what goes in (its BSX, demo, the agents it asks for) and what
 * stays here (the agents it runs on: whoever installs it chooses their own).
 * Opened for a blok, the file carries that blok's template under the blok's name.
 */
export const ExportBlokDialog = (props: {
  /** The template. */
  id: string;
  /** What the file calls it, to start with: the blok's name when exported from one. */
  name?: string;
  /** The revision the blok it was opened from is held at, when not the latest. */
  heldAt?: number | null;
}) => {
  const { closeDialog } = useDialog();
  const { data, error, refetch } = useBlokEditorQuery({ variables: { id: props.id }, fetchPolicy: "network-only" });
  const [name, setName] = useState<string | null>(null);

  const blok = data?.blok;
  const printed = useMemo(() => (blok ? draftOfBlok(blok) : null), [blok]);

  if (error) return <QueryError error={error} onRetry={() => void refetch()} />;
  if (!blok || !printed) return <Loader2 className="m-6 size-5 animate-spin text-muted-foreground" />;

  const shownName = name ?? props.name ?? blok.name;
  const draft = printed.ok ? { ...printed.draft, name: shownName.trim() || blok.name } : null;
  const context = BLOK_CONTEXTS[blok.context];
  const agents = blok.dependencies;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Export {props.name ?? blok.name}</DialogTitle>
        <DialogDescription>
          A file to install in another organization, or to keep. Installing it there makes a template of it, run on
          that organization's agents.
        </DialogDescription>
      </DialogHeader>
      <DialogForm
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft) return;
          downloadBlokFile(draft);
          closeDialog();
        }}
      >
        <DialogBody>
          {!draft ? (
            <ErrorNote
              error={new Error(printed.ok ? "" : printed.error)}
              title="This blok can't be written as BSX, so it can't be exported"
            />
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="export-name">Name</Label>
                <Input id="export-name" value={shownName} onChange={(event) => setName(event.target.value)} />
                <span className="font-mono text-xs text-muted-foreground">{blokFileName(draft.name)}</span>
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium">In the file</span>
                <ul className="flex flex-col gap-1">
                  <Fact included>
                    Its BSX{context ? `, a ${context.label.toLowerCase()}` : ""}
                    {blok.head ? `, as of revision ${blok.head.number}` : ""}
                    {props.heldAt != null && blok.head && props.heldAt !== blok.head.number
                      ? ` (this blok shows revision ${props.heldAt})`
                      : ""}
                  </Fact>
                  {draft.description && <Fact included>Its description</Fact>}
                  <Fact included>Its demo values</Fact>
                  <Fact included>
                    {agents.length === 0 ? (
                      "It asks for no agent"
                    ) : (
                      <>
                        The agents it asks for:{" "}
                        {agents.map((agent, index) => (
                          <span key={agent.key}>
                            {index > 0 && ", "}
                            <span className="font-mono text-xs">{agent.key}</span>
                          </span>
                        ))}
                      </>
                    )}
                  </Fact>
                  <Fact included={false}>
                    Which agents it runs on here: whoever installs it chooses their own
                  </Fact>
                </ul>
              </div>
            </>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={closeDialog}>
            Cancel
          </Button>
          {draft && (
            <CopyButton variant="outline" value={() => blokFileText(draft)} title="Copy the file's text">
              Copy
            </CopyButton>
          )}
          <Button type="submit" disabled={!draft}>
            <Download className="size-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogForm>
    </div>
  );
};
