import { useState } from "react";

import { Button } from "@/core/ui/button";
import {
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/ui/dialog";
import { cn } from "@/core/util/utils";
import { DuplicateFileFragment } from "../api/graphql";
import { DuplicateFileRow } from "../components/file/DuplicateFileRow";
import { formatBytes } from "../specs";

/** What the person decided: keep the stored copy (which one), or send the file anyway. */
export type DuplicateUploadChoice =
  | { kind: "existing"; file: DuplicateFileFragment }
  | { kind: "upload" };

/**
 * Asked before an upload when mikro already holds the file
 * (`useMikroBigFileUpload`, awaited): `verified` when a stored copy's digest is
 * the one the whole file hashed to, otherwise the copies agree in size and in
 * the sampled windows and their digest is not known yet. "Use the stored file"
 * uploads nothing; closing the dialog cancels the upload.
 */
export const DuplicateUploadForm = (props: {
  fileName: string;
  size: number;
  verified: boolean;
  candidates: DuplicateFileFragment[];
  onResolve?: (choice: DuplicateUploadChoice) => void;
  onCancel?: () => void;
}) => {
  const [chosen, setChosen] = useState(props.candidates[0]?.id);
  const choice = props.candidates.find((candidate) => candidate.id === chosen);
  const many = props.candidates.length > 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <DialogHeader>
        <DialogTitle>
          {props.verified ? "This file is already stored" : "This file may already be stored"}
        </DialogTitle>
        <DialogDescription>
          {props.verified
            ? `${props.fileName} (${formatBytes(props.size)}) holds the same bytes as ${many ? "these files" : "this file"}.`
            : `${props.fileName} (${formatBytes(props.size)}) has the same size and the same sampled content as ${many ? "these files" : "this file"}, which ${many ? "have" : "has"} not been fully hashed yet.`}{" "}
          Using the stored file uploads nothing; it stays where it is filed.
        </DialogDescription>
      </DialogHeader>

      <DialogBody>
        <div className="flex flex-col gap-1" role={many ? "radiogroup" : undefined}>
          {props.candidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              role={many ? "radio" : undefined}
              aria-checked={many ? candidate.id === chosen : undefined}
              onClick={() => setChosen(candidate.id)}
              className={cn(
                "rounded-md border px-3 py-2 text-left",
                many && candidate.id === chosen ? "border-primary bg-primary/5" : "border-border",
                !many && "cursor-default",
              )}
            >
              <DuplicateFileRow file={candidate} link={false} />
            </button>
          ))}
        </div>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={() => props.onResolve?.({ kind: "upload" })}>
          Upload anyway
        </Button>
        <Button
          type="button"
          disabled={!choice}
          onClick={() => choice && props.onResolve?.({ kind: "existing", file: choice })}
        >
          Use the stored file
        </Button>
      </DialogFooter>
    </div>
  );
};

export default DuplicateUploadForm;
