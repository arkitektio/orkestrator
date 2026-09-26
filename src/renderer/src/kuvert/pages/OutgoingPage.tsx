import { Alert, AlertDescription, AlertTitle } from "@/core/ui/alert";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import Timestamp from "@/core/ui/timestamp";
import { TriangleAlert } from "lucide-react";
import { OutgoingStatus, useGetOutgoingMessageQuery } from "../api/graphql";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/core/ui/attachment";
import { Addresses } from "../components/Addresses";
import { fileIcon, fileKind } from "../components/fileIcon";
import { InfoList } from "../components/InfoList";
import { describeError } from "../errors";
import { formatBytes } from "../format";
import { MailAccount, MailThread, OutgoingMail } from "../linkers";

/** A mail sent from here: what went out, to whom, and what the server said. */
const OutgoingPage = asDetailQueryRoute(useGetOutgoingMessageQuery, ({ data }) => {
  const mail = data.outgoingMessage;
  const failed = mail.status === OutgoingStatus.Failed;

  return (
    <OutgoingMail.ModelPage
      title={mail.subject || "(no subject)"}
      object={mail}
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              ["From", <MailAccount.DetailLink object={mail.account}>{mail.account.emailAddress}</MailAccount.DetailLink>],
              ["Status", mail.status.toLowerCase()],
              ["Asked", <Timestamp date={mail.createdAt} relative />],
              ["Sent", mail.sentAt && <Timestamp date={mail.sentAt} relative />],
              ["Copy in Sent", mail.savedToSent ? "yes" : "no"],
              [
                "In reply to",
                mail.inReplyTo?.thread && (
                  <MailThread.DetailLink object={mail.inReplyTo.thread}>{mail.inReplyTo.subject || "(no subject)"}</MailThread.DetailLink>
                ),
              ],
              ["Message-ID", <span className="font-mono text-xs">{mail.messageId}</span>],
            ]}
          />
        </Sidebars.Tab>
      }
    >
      <div className="flex flex-col gap-3 p-4">
        {failed && (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertTitle>Not sent</AlertTitle>
            <AlertDescription>{describeError(mail.errorCode, { message: mail.error }).text}</AlertDescription>
          </Alert>
        )}
        {mail.refused.length > 0 && (
          <Alert>
            <TriangleAlert />
            <AlertTitle>Some recipients were refused</AlertTitle>
            <AlertDescription>
              {mail.refused.map((r) => (
                <div key={r.address}>
                  <span className="font-medium">{r.address}</span> — {r.code} {r.message}
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-0.5">
          <Addresses label="to" list={mail.to} />
          <Addresses label="cc" list={mail.cc} />
          <Addresses label="bcc" list={mail.bcc} />
        </div>
        <div className="whitespace-pre-wrap break-words rounded-md border px-4 py-3 text-sm">{mail.textBody}</div>
        {mail.attachments.length > 0 && (
          <AttachmentGroup>
            {mail.attachments.map((a) => {
              const Icon = fileIcon(a.contentType, a.originalFileName);
              return (
                <Attachment key={a.id} size="sm" className="max-w-64">
                  <AttachmentMedia>
                    <Icon />
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{a.originalFileName ?? "attachment"}</AttachmentTitle>
                    <AttachmentDescription>
                      {fileKind(a.contentType, a.originalFileName)} · {formatBytes(a.sizeBytes)}
                    </AttachmentDescription>
                  </AttachmentContent>
                </Attachment>
              );
            })}
          </AttachmentGroup>
        )}
      </div>
    </OutgoingMail.ModelPage>
  );
});

export default OutgoingPage;
