import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/ui/select";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from "@/core/ui/input-group";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/core/ui/attachment";
import { Kbd } from "@/core/ui/kbd";
import { Spinner } from "@/core/ui/spinner";
import { Paperclip, X } from "lucide-react";
import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/core/notify";
import {
  ListOutboxDocument,
  MessageFragment,
  OutgoingStatus,
  SenderAccountFragment,
  useGetMessageQuery,
  useSendMessageMutation,
  useSenderAccountsQuery,
} from "../api/graphql";
import { MailContent, MailEditor, MailToolbar, useMailEditor } from "../components/editor/MailEditor";
import { fileIcon } from "../components/fileIcon";
import type { ComposeMode } from "../components/MessageView";
import { useAttachmentUpload } from "../datalayer/upload";
import { fromText, MailNode, toMailHtml, toText } from "../editor/serialize";
import { toastText } from "../errors";
import {
  formatBytes,
  forwardSubject,
  parseRecipients,
  quoteForForward,
  quoteForReply,
  recipientsText,
  replyRecipients,
  replySubject,
} from "../format";
import { OutgoingMail } from "../linkers";

export type ComposeProps = {
  /** The mailbox to send from. */
  account?: string;
  /** The mail this answers or forwards. */
  replyTo?: string;
  mode?: ComposeMode;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  /** A plain-text start for the body. */
  body?: string;
  /** A formatted start for the body (the inline reply handing over); wins over `body`. */
  content?: MailNode[];
};

type Upload = { key: string; file: File; store?: string; error?: string };

/** One address line (To, Cc, Bcc) as a shadcn input group; red while something is not an address. */
const RecipientInput = ({
  label,
  value,
  onChange,
  autoFocus,
  end,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  end?: React.ReactNode;
}) => {
  const { invalid } = parseRecipients(value);
  return (
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText className="w-12">{label}</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid.length > 0}
        title={invalid.length ? `Not an address: ${invalid.join(", ")}` : undefined}
        placeholder="name@example.org, …"
      />
      {end && <InputGroupAddon align="inline-end">{end}</InputGroupAddon>}
    </InputGroup>
  );
};

/** What a new mail starts with: empty, or a reply/forward of `original` (quoted below the body). */
const initial = (props: ComposeProps, original: MessageFragment | undefined) => {
  const body = props.content ?? fromText(props.body ?? "");
  const base = {
    to: (props.to ?? []).join(", "),
    cc: (props.cc ?? []).join(", "),
    bcc: (props.bcc ?? []).join(", "),
    subject: props.subject ?? "",
    body,
  };
  if (!original || !props.mode) return base;
  if (props.mode === "forward") {
    return { ...base, subject: forwardSubject(original.subject), body: [...body, ...fromText(quoteForForward(original))] };
  }
  const { to, cc } = replyRecipients(original, original.account.emailAddress, props.mode === "replyAll");
  return {
    ...base,
    to: recipientsText(to),
    cc: recipientsText(cc),
    subject: replySubject(original.subject),
    body: [...body, ...fromText(quoteForReply(original))],
  };
};

const Compose = ({
  props,
  original,
  senders,
}: {
  props: ComposeProps;
  original?: MessageFragment;
  senders: SenderAccountFragment[];
}) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const start = initial(props, original);
  const [from, setFrom] = useState(
    props.account ?? original?.account.id ?? senders.find((s) => s.canSend)?.id ?? "",
  );
  const [to, setTo] = useState(start.to);
  const [cc, setCc] = useState(start.cc);
  const [bcc, setBcc] = useState(start.bcc);
  const [showCc, setShowCc] = useState(!!start.cc || !!start.bcc);
  const [subject, setSubject] = useState(start.subject);
  // A reply or forward starts writing above the quote.
  const editor = useMailEditor(start.body, props.mode ? "start" : undefined);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = useAttachmentUpload();
  const [send, { loading }] = useSendMessageMutation({ refetchQueries: [ListOutboxDocument] });

  const attach = (files: FileList | null) => {
    for (const file of Array.from(files ?? [])) {
      const key = crypto.randomUUID();
      setUploads((u) => [...u, { key, file }]);
      upload(file)
        .then((store) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, store } : x))))
        .catch((e: Error) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: e.message } : x))));
    }
  };

  const recipients = { to: parseRecipients(to), cc: parseRecipients(cc), bcc: parseRecipients(bcc) };
  const invalid = [...recipients.to.invalid, ...recipients.cc.invalid, ...recipients.bcc.invalid];
  const count = recipients.to.recipients.length + recipients.cc.recipients.length + recipients.bcc.recipients.length;
  const uploading = uploads.some((u) => !u.store && !u.error);
  const ready = !!from && count > 0 && invalid.length === 0 && !uploading && !loading;

  const submit = () =>
    send({
      variables: {
        input: {
          account: from,
          to: recipients.to.recipients,
          cc: recipients.cc.recipients,
          bcc: recipients.bcc.recipients,
          subject,
          text: toText(editor.children as MailNode[]),
          html: toMailHtml(editor.children as MailNode[]),
          inReplyTo: original && props.mode !== "forward" ? original.id : null,
          attachments: uploads.flatMap((u) => (u.store ? [u.store] : [])),
        },
      },
    })
      .then((r) => {
        const sent = r.data?.sendMessage;
        const open = sent ? { label: "Show", onClick: () => navigate(OutgoingMail.linkBuilder(sent.id)) } : undefined;
        if (sent?.status === OutgoingStatus.Failed) {
          toast.error(sent.error || "The mail could not be sent", { action: open });
          return;
        }
        if (sent?.refused.length) {
          toast.warning(`Sent, but refused for ${sent.refused.map((x) => x.address).join(", ")}`, { action: open });
        } else {
          toast.success("Sent");
        }
        closeDialog();
      })
      .catch((e) => toast.error(toastText(e)));

  const title = props.mode === "forward" ? "Forward" : props.mode ? "Reply" : "New mail";

  return (
    <form
      className="flex h-full flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) void submit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && ready) {
          e.preventDefault();
          void submit();
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText className="w-12">From</InputGroupText>
          </InputGroupAddon>
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger className="h-full flex-1 border-0 bg-transparent px-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent">
              <SelectValue placeholder="Pick a mailbox" />
            </SelectTrigger>
            <SelectContent>
              {senders.map((s) => (
                <SelectItem key={s.id} value={s.id} disabled={!s.canSend}>
                  {s.displayName ? `${s.displayName} <${s.emailAddress}>` : s.emailAddress}
                  {!s.canSend && " (cannot send)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </InputGroup>
        <RecipientInput
          label="To"
          value={to}
          onChange={setTo}
          autoFocus={!to}
          end={
            !showCc && (
              <InputGroupButton size="xs" onClick={() => setShowCc(true)}>
                Cc/Bcc
              </InputGroupButton>
            )
          }
        />
        {showCc && (
          <>
            <RecipientInput label="Cc" value={cc} onChange={setCc} />
            <RecipientInput label="Bcc" value={bcc} onChange={setBcc} />
          </>
        )}
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText className="w-12">Subject</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput value={subject} onChange={(e) => setSubject(e.target.value)} />
        </InputGroup>
      </div>
      <MailEditor editor={editor}>
        <div className="flex min-h-64 flex-1 flex-col overflow-hidden rounded-md border shadow-xs focus-within:ring-[3px] focus-within:ring-ring/50">
          <MailToolbar className="border-b px-2 py-1" />
          <MailContent autoFocus={!!to} className="flex-1 overflow-y-auto p-3" />
        </div>
      </MailEditor>
      {uploads.length > 0 && (
        <AttachmentGroup>
          {uploads.map((u) => {
            const Icon = fileIcon(u.file.type, u.file.name);
            return (
              <Attachment
                key={u.key}
                size="sm"
                state={u.error ? "error" : u.store ? "done" : "uploading"}
                className="max-w-64"
              >
                <AttachmentMedia>{u.error || u.store ? <Icon /> : <Spinner />}</AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle title={u.file.name}>{u.file.name}</AttachmentTitle>
                  <AttachmentDescription title={u.error}>
                    {u.error ?? (u.store ? formatBytes(u.file.size) : "Uploading…")}
                  </AttachmentDescription>
                </AttachmentContent>
                <AttachmentActions>
                  <AttachmentAction
                    aria-label="Remove"
                    onClick={() => setUploads((all) => all.filter((x) => x.key !== u.key))}
                  >
                    <X />
                  </AttachmentAction>
                </AttachmentActions>
              </Attachment>
            );
          })}
        </AttachmentGroup>
      )}
      {props.mode === "forward" && original?.hasAttachments && (
        <span className="text-xs text-muted-foreground">
          The original's attachments are not forwarded; attach them again if they should go along.
        </span>
      )}
      <DialogFooter className="items-center gap-2">
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => attach(e.target.files)} />
        <Button type="button" variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
          <Paperclip />
          Attach
        </Button>
        <Button type="submit" disabled={!ready} className="gap-2">
          {(loading || uploading) && <Spinner />}
          {loading ? "Sending…" : uploading ? "Uploading…" : "Send"}
          <Kbd className="bg-primary-foreground/15 text-primary-foreground">⌘↵</Kbd>
        </Button>
      </DialogFooter>
    </form>
  );
};

/** Write a mail, or answer or forward one (`replyTo` + `mode`). */
export const ComposeForm = (props: ComposeProps) => {
  const senders = useSenderAccountsQuery();
  const original = useGetMessageQuery({ variables: { id: props.replyTo ?? "" }, skip: !props.replyTo });

  if (senders.loading || original.loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="size-5 text-muted-foreground" />
      </div>
    );
  }
  if (!senders.data?.mailAccounts.some((a) => a.canSend)) {
    return <p className="p-6 text-sm text-muted-foreground">No mailbox here can send: add one with an outgoing (SMTP) server.</p>;
  }
  return <Compose props={props} original={original.data?.message} senders={senders.data.mailAccounts} />;
};
