import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { Form } from "@/core/ui/form";
import { Switch } from "@/core/ui/switch";
import { cn } from "@/core/util/utils";
import { toast } from "@/core/notify";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import {
  AuthMethod,
  MailAccountFragment,
  MailboxTreeDocument,
  MailFolderFragment,
  Protocol,
  Security,
  UpdateMailAccountInput,
  Visibility,
  useUpdateMailAccountMutation,
  useUpdateMailFolderMutation,
} from "../../api/graphql";
import { toastText } from "../../errors";
import { PasswordField, ServerFields, serverInput, ServerValues, TextField } from "../../forms/fields";
import { sortFolders } from "../../format";
import { MailFolder } from "../../linkers";
import { AccountCategories } from "../categories/AccountCategories";
import { LOGIN_ANCHOR } from "./anchors";

export { LOGIN_ANCHOR } from "./anchors";

/** A titled block of the settings page. */
const Section = ({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <section id={id} className="flex scroll-mt-4 flex-col gap-2">
    <header className="px-1">
      <h2 className="text-sm font-medium">{title}</h2>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </header>
    {children}
  </section>
);

/** One setting as a row: what it is, what it does, its control. */
const Row = ({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-4 px-3 py-2">
    <div className="min-w-0">
      <div className="text-sm">{label}</div>
      {description && <div className="text-xs text-muted-foreground">{description}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Rows = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col divide-y rounded-md border">{children}</div>
);

type SwitchKey = "saveSentCopy" | "popLeaveOnServer" | "pushSeen" | "pushFlagged" | "pushMoves" | "pushDeletes" | "pushKeywords";

/** A switch that saves the moment it flips. */
const SettingSwitch = ({
  account,
  field,
  label,
  description,
}: {
  account: MailAccountFragment;
  field: SwitchKey;
  label: string;
  description?: string;
}) => {
  const [update, { loading }] = useUpdateMailAccountMutation();
  return (
    <Row label={label} description={description}>
      <Switch
        checked={account[field]}
        disabled={loading || !account.isOwner}
        onCheckedChange={(value) =>
          update({ variables: { input: { id: account.id, [field]: value } } }).catch((e) => toast.error(toastText(e)))
        }
      />
    </Row>
  );
};

/** What a mailbox pushes to the server; POP3 has nothing on the server but deletes. */
const PUSH_SETTINGS: { key: SwitchKey; label: string; description: string; pop3?: boolean }[] = [
  { key: "pushSeen", label: "Read and unread", description: "Off keeps it here. Turning it on pushes what was kept." },
  { key: "pushFlagged", label: "Flags", description: "Off keeps flags here." },
  { key: "pushMoves", label: "Moves and archiving", description: "Off refuses moves: a folder only exists on the server." },
  { key: "pushDeletes", label: "Deletes", description: "Off only hides deleted mail here.", pop3: true },
  { key: "pushKeywords", label: "Categories", description: "Keyword categories go to the server as keywords. Off keeps them here." },
];

const SHARING: Record<Visibility, string> = {
  [Visibility.Private]: "Only you see this mailbox.",
  [Visibility.Shared]: "The people it is shared with see this mailbox.",
  [Visibility.Organization]: "Everyone in the organization sees this mailbox.",
};

/** A form that shows its Save button only once something changed. */
const SaveBar = ({ dirty, loading, label, onReset }: { dirty: boolean; loading: boolean; label: string; onReset: () => void }) =>
  dirty ? (
    <div className="flex justify-end gap-2 px-3 pb-3">
      <Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={loading}>
        Cancel
      </Button>
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Saving…" : label}
      </Button>
    </div>
  ) : null;

/** The mailbox's names: what it is called here and on sent mail. */
const NamesForm = ({ account }: { account: MailAccountFragment }) => {
  const [update, { loading }] = useUpdateMailAccountMutation({ refetchQueries: [MailboxTreeDocument] });
  const defaults = { name: account.name, displayName: account.displayName };
  const form = useForm({ defaultValues: defaults });
  useEffect(() => form.reset(defaults), [account.name, account.displayName]);

  const submit = (v: typeof defaults) =>
    update({ variables: { input: { id: account.id, name: v.name.trim(), displayName: v.displayName.trim() } } })
      .then(() => toast.success("Mailbox updated"))
      .catch((e) => toast.error(toastText(e)));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className={cn("flex flex-col gap-3", !form.formState.isDirty && "pb-3")}>
        <fieldset disabled={!account.isOwner} className="grid grid-cols-2 gap-2 px-3 pt-3">
          <TextField name="name" label="Name" description="What the mailbox is called here." />
          <TextField name="displayName" label="Sender name" description="The name on mail you send." />
        </fieldset>
        <SaveBar dirty={form.formState.isDirty} loading={loading} label="Save" onReset={() => form.reset(defaults)} />
      </form>
    </Form>
  );
};

type LoginValues = {
  password: string;
  username: string;
  incoming: ServerValues;
  smtp: ServerValues;
  smtpUsername: string;
  smtpPassword: string;
};

/** Password and servers of a password mailbox; the server tests a new login before keeping it. */
const LoginForm = ({ account }: { account: MailAccountFragment }) => {
  const [update, { loading }] = useUpdateMailAccountMutation({ refetchQueries: [MailboxTreeDocument] });
  const defaults: LoginValues = {
    password: "",
    username: account.username,
    incoming: { host: account.incomingHost, port: account.incomingPort, security: account.incomingSecurity },
    smtp: { host: account.smtpHost ?? "", port: account.smtpPort ?? 465, security: account.smtpSecurity ?? Security.Tls },
    smtpUsername: "",
    smtpPassword: "",
  };
  const form = useForm<LoginValues>({ defaultValues: defaults });

  // Only what changed is sent.
  const submit = (v: LoginValues) => {
    const dirty = form.formState.dirtyFields;
    const input: UpdateMailAccountInput = {
      id: account.id,
      password: v.password || undefined,
      username: dirty.username ? v.username.trim() : undefined,
      incoming: dirty.incoming ? serverInput(v.incoming) : undefined,
      smtp: dirty.smtp ? serverInput(v.smtp) : undefined,
      smtpUsername: v.smtpUsername.trim() || undefined,
      smtpPassword: v.smtpPassword || undefined,
    };
    return update({ variables: { input } })
      .then(() => {
        toast.success("Login tested and saved");
        form.reset({ ...v, password: "", smtpPassword: "" });
      })
      .catch((e) => toast.error(toastText(e)));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className={cn("flex flex-col gap-3", !form.formState.isDirty && "pb-3")}>
        <fieldset disabled={!account.isOwner} className="flex flex-col gap-3 px-3 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <TextField name="username" label="Username" />
            <PasswordField name="password" label="New password" description="Leave empty to keep the current one." />
          </div>
          <ServerFields prefix="incoming" label={account.protocol === Protocol.Pop3 ? "POP3" : "IMAP"} />
          <ServerFields prefix="smtp" label="SMTP" />
          <div className="grid grid-cols-2 gap-2">
            <TextField name="smtpUsername" label="SMTP username" placeholder="same as above" />
            <PasswordField name="smtpPassword" label="SMTP password" />
          </div>
        </fieldset>
        <SaveBar
          dirty={form.formState.isDirty}
          loading={loading}
          label={loading ? "Testing…" : "Test and save"}
          onReset={() => form.reset(defaults)}
        />
      </form>
    </Form>
  );
};

const FolderRow = ({ folder, canToggle }: { folder: MailFolderFragment; canToggle: boolean }) => {
  const [update, { loading }] = useUpdateMailFolderMutation();
  return (
    <MailFolder.Smart object={folder}>
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
        <MailFolder.DetailLink object={folder} className="min-w-0 truncate">
          {folder.path}
        </MailFolder.DetailLink>
        <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span>
            {folder.unreadCount > 0 && `${folder.unreadCount} unread · `}
            {folder.totalCount}
          </span>
          {canToggle && (
            <Switch
              checked={folder.syncEnabled}
              disabled={loading || !folder.selectable}
              title={folder.syncEnabled ? "Synced" : "Not synced"}
              onCheckedChange={(syncEnabled) =>
                update({ variables: { input: { id: folder.id, syncEnabled } } }).catch((e) => toast.error(toastText(e)))
              }
            />
          )}
        </span>
      </div>
    </MailFolder.Smart>
  );
};

/** Scroll to (and focus the first field of) the section the URL's hash names. */
const useHashTarget = () => {
  const { hash } = useLocation();
  useEffect(() => {
    const id = hash.slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: "start" });
    el?.querySelector<HTMLInputElement>("input:not([disabled])")?.focus({ preventScroll: true });
  }, [hash]);
};

/**
 * A mailbox's settings, as the body of its page: names and sending, what
 * goes back to the server, folders, categories, and how it signs in. Switches
 * save as they flip; the forms save on their own button. Only the owner can
 * change anything.
 */
export const AccountSettings = ({ account }: { account: MailAccountFragment }) => {
  const { openDialog } = useDialog();
  useHashTarget();
  const pop3 = account.protocol === Protocol.Pop3;
  const oauth = account.authMethod === AuthMethod.Xoauth2;

  return (
    <div className="flex flex-col gap-6">
      {!account.isOwner && (
        <p className="px-1 text-xs text-muted-foreground">This mailbox is shared with you; only its owner can change its settings.</p>
      )}

      <Section title="Mailbox">
        <Rows>
          <NamesForm account={account} />
          <SettingSwitch account={account} field="saveSentCopy" label="Keep a copy in Sent" description="Gmail and Microsoft keep one themselves." />
          {pop3 && <SettingSwitch account={account} field="popLeaveOnServer" label="Keep mail on the server" description="Off deletes it there once it is stored here." />}
          <Row label="Sharing" description={SHARING[account.visibility]}>
            <Button size="sm" variant="outline" disabled={!account.isOwner} onClick={() => openDialog("kuvertshare", { id: account.id }, { size: "medium" })}>
              Share…
            </Button>
          </Row>
        </Rows>
      </Section>

      <Section
        title="Sync to the server"
        description="Changes made here wait a moment (so they can be undone), then go to the server. What is off stays here only."
      >
        <Rows>
          {PUSH_SETTINGS.filter((s) => s.pop3 || !pop3).map((s) => (
            <SettingSwitch key={s.key} account={account} field={s.key} label={s.label} description={s.description} />
          ))}
        </Rows>
      </Section>

      <Section title="Folders" description={account.serverSideFolders ? "Which folders are synced." : undefined}>
        <Rows>
          {sortFolders(account.folders).map((folder) => (
            <FolderRow key={folder.id} folder={folder} canToggle={account.serverSideFolders && account.isOwner} />
          ))}
        </Rows>
      </Section>

      <Section title="Categories" description="Shared by everyone who sees the mailbox.">
        <AccountCategories account={account} />
      </Section>

      <Section
        id={LOGIN_ANCHOR}
        title="Sign-in and servers"
        description={oauth ? undefined : "A new password or new servers are tested before they are kept."}
      >
        {oauth ? (
          <Rows>
            <Row label={`Signed in with ${account.provider.charAt(0) + account.provider.slice(1).toLowerCase()}`} description={account.username}>
              <Button
                size="sm"
                variant="outline"
                disabled={!account.isOwner}
                onClick={() =>
                  openDialog("kuvertlink", { relink: account.id, provider: account.provider, address: account.emailAddress }, { size: "medium" })
                }
              >
                Sign in again
              </Button>
            </Row>
          </Rows>
        ) : (
          <Rows>
            <LoginForm account={account} />
          </Rows>
        )}
      </Section>
    </div>
  );
};
