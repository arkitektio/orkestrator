import { useState } from "react";

import { DialogError } from "@/core/dialogs/DialogError";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { acceptsFiles } from "@/core/dnd/files";
import { useDropTarget } from "@/core/dnd/react";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Progress } from "@/core/ui/progress";
import { cn } from "@/core/util/utils";
import { useCreateFile } from "@/mikro/api/hooks";
import { useMikroBigFileUpload } from "@/mikro/datalayer/useMikroBigFileUpload";

/**
 * A file the person hands to an app that asked for one: the Orkestrator
 * agent's `upload_file` action waits on it (`awaitDialog("agentuploadfile")`).
 * The file goes up like a dropped one (`useMikroBigFileUpload`, then
 * `useCreateFile`), into `folder` when the caller named one, and the dialog
 * answers with the new file's id. Closing it is a refusal.
 */
export const AgentUploadFileForm = (props: {
  folder?: string | null;
  reason?: string | null;
  onResolve?: (file: string) => void;
  onCancel?: () => void;
}) => {
  const upload = useMikroBigFileUpload();
  const createFile = useCreateFile(props.folder ?? undefined);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);

  const { ref, isOver } = useDropTarget({
    accepts: acceptsFiles,
    onDrop: (payload) => {
      if (payload.origin !== "external") return;
      const [dropped] = payload.files;
      if (dropped) setFile(dropped);
    },
  });

  const { submit, submitting } = useDialogSubmit(
    async () => {
      if (!file) throw new Error("Choose a file to upload.");
      setProgress(0);
      try {
        const key = await upload(file, {
          onProgress: (event) => {
            if (event.lengthComputable) setProgress((event.loaded / event.total) * 100);
          },
        });
        const created = await createFile(file, key);
        if (!created?.object) throw new Error("The server answered with no file.");
        return created.object.id;
      } finally {
        setProgress(null);
      }
    },
    {
      errorTitle: "Couldn't upload the file",
      // The answer closes it.
      close: false,
      onSuccess: (id) => props.onResolve?.(id),
    },
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>An app asks you for a file</DialogTitle>
        <DialogDescription>
          {props.reason ?? "Choose a file to upload. The app that asked gets the uploaded file back."}
        </DialogDescription>
      </DialogHeader>

      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-2 rounded-lg border-2 border-dashed p-6 text-sm",
          isOver ? "border-primary bg-primary/5" : "border-border",
        )}
      >
        <span className="text-muted-foreground">{file ? file.name : "Drop a file here, or choose one"}</span>
        <Input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </div>

      {progress !== null && <Progress value={progress} />}

      <DialogError />

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => props.onCancel?.()}>
          Refuse
        </Button>
        <Button type="submit" disabled={!file || submitting}>
          {submitting ? "Uploading…" : "Upload"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export default AgentUploadFileForm;
