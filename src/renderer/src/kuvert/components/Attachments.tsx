import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/core/ui/attachment";
import { Download } from "lucide-react";
import { toast } from "@/core/notify";
import { AttachmentFragment } from "../api/graphql";
import { useAttachmentUrls, useSaveAttachment } from "../datalayer/attachments";
import { formatBytes } from "../format";
import { fileIcon, fileKind } from "./fileIcon";

/**
 * A mail's attached files (inline images are in the body, not here), as
 * shadcn attachments: images with a preview, other files with their kind's
 * icon. Clicking one saves it. A file the datalayer does not hold is shown
 * in the error state and cannot be saved.
 */
export const MessageAttachments = ({ message, attachments }: { message: string; attachments: AttachmentFragment[] }) => {
  const files = attachments.filter((a) => !a.inline);
  const previews = files.some((a) => a.store && a.contentType.startsWith("image/"));
  const urls = useAttachmentUrls(message, previews);
  const save = useSaveAttachment();
  if (files.length === 0) return null;

  const saveOne = (a: AttachmentFragment) => save(message, a).catch((e: Error) => toast.error(e.message));

  return (
    <AttachmentGroup>
      {files.map((a) => {
        const Icon = fileIcon(a.contentType, a.filename);
        const preview = a.contentType.startsWith("image/") ? urls.byId.get(a.id) : undefined;
        return (
          <Attachment key={a.id} size="sm" state={a.store ? "done" : "error"} className="max-w-64">
            {a.store && <AttachmentTrigger aria-label={`Save ${a.filename}`} onClick={() => saveOne(a)} />}
            <AttachmentMedia variant={preview ? "image" : "icon"}>
              {preview ? <img src={preview} alt="" /> : <Icon />}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle title={a.filename}>{a.filename || "attachment"}</AttachmentTitle>
              <AttachmentDescription>
                {a.store ? `${fileKind(a.contentType, a.filename)} · ${formatBytes(a.size)}` : "Not stored in the datalayer"}
              </AttachmentDescription>
            </AttachmentContent>
            {a.store && (
              <AttachmentActions>
                <AttachmentAction aria-label="Save" onClick={() => saveOne(a)}>
                  <Download />
                </AttachmentAction>
              </AttachmentActions>
            )}
          </Attachment>
        );
      })}
    </AttachmentGroup>
  );
};
