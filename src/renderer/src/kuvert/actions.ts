import type { Service } from "@/core/connection/arkitekt/types";
import { buildDeleteAction } from "@/core/smart/localactions/builders/deleteAction";
import { Action, ActionParams } from "@/core/smart/localactions/LocalActionProvider";
import { ApolloClient, NormalizedCache } from "@apollo/client";
import {
  Archive,
  CheckCheck,
  Flag,
  FlagOff,
  FolderInput,
  Forward,
  KeyRound,
  Mail,
  MailOpen,
  Pause,
  PenSquare,
  Pencil,
  Play,
  PlugZap,
  RefreshCw,
  Reply,
  ReplyAll,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  AuthMethod,
  DeleteMailAccountDocument,
  FolderRole,
  GetMailAccountDocument,
  GetMailAccountQuery,
  GetMailFolderDocument,
  GetMailFolderQuery,
  MailboxTreeDocument,
  SyncMailAccountDocument,
  TestMailAccountDocument,
  UpdateMailAccountDocument,
  UpdateMailFolderDocument,
} from "./api/graphql";
import { toastText } from "./errors";
import { deleteMail, MAIL_VIEWS, markRead, moveTo, moveToRole, setFlagged, threadMessages } from "./mailOps";

const ACCOUNT = "@kuvert/account";
const FOLDER = "@kuvert/folder";
const THREAD = "@kuvert/thread";
const MESSAGE = "@kuvert/message";

// Same cast as `buildDeleteAction`: the deferred service type does not resolve
// here, but every concrete service carries a `.client`.
const kuvertClient = (services: ActionParams["services"]) => {
  const client = (services.kuvert as unknown as Service | undefined)?.client as
    | ApolloClient<NormalizedCache>
    | undefined;
  if (!client) throw new Error("Mail service not available");
  return client;
};

/** One mutation, its failure reworded from the error code. */
const kuvertMutate = async (
  services: ActionParams["services"],
  options: Parameters<ApolloClient<NormalizedCache>["mutate"]>[0],
) => {
  try {
    return await kuvertClient(services).mutate(options);
  } catch (e) {
    throw new Error(toastText(e));
  }
};

/** The selected ids of one kind; the condition matches on any, so a mixed selection is narrowed here. */
const idsOf = (state: ActionParams["state"], identifier: string) =>
  state.left.filter((s) => s.identifier === identifier && s.id).map((s) => String(s.id));

const need = (ids: string[], what: string) => {
  if (ids.length === 0) throw new Error(`No ${what} selected`);
  return ids;
};

/** Into Trash, or (Shift) for good, after asking. */
const confirmDelete = async ({ services, confirm, modifiers }: ActionParams, messages: string[], what: string) => {
  const permanent = modifiers.shiftKey;
  const ok = await confirm({
    title: permanent ? `Delete ${what} for good?` : `Move ${what} to Trash?`,
    description: permanent
      ? "They are removed from the server and cannot be restored."
      : "Mail already in Trash is removed for good. Hold Shift to skip Trash.",
    confirmLabel: permanent ? "Delete for good" : "Move to Trash",
    destructive: true,
  });
  if (ok) await deleteMail(kuvertClient(services), messages, permanent);
};

const reply = (title: string, description: string, mode: "reply" | "replyAll" | "forward", icon: Action["icon"]): Action => ({
  title,
  description,
  icon,
  conditions: [{ type: "identifier", identifier: MESSAGE }, { type: "nopartner" }],
  execute: async ({ dialog, state }) => {
    const [id] = need(idsOf(state, MESSAGE), "mail");
    dialog.openSheet("kuvertcompose", { replyTo: id, mode }, { size: "large" });
  },
});

const flag = (add: boolean): Action => ({
  title: add ? "Flag" : "Unflag",
  description: add ? "Mark the mail as important" : "Take the flag off the mail",
  icon: add ? Flag : FlagOff,
  conditions: [{ type: "identifier", identifier: MESSAGE }, { type: "nopartner" }],
  execute: async ({ services, state, onProgress }) => {
    const messages = need(idsOf(state, MESSAGE), "mail");
    await setFlagged(kuvertClient(services), messages, add);
    onProgress(100);
  },
});

const pause = (enabled: boolean): Action => ({
  title: enabled ? "Resume mailbox" : "Pause mailbox",
  description: enabled
    ? "Sync and send again (the login is tested first)"
    : "Stop syncing and sending until resumed; mail is kept",
  icon: enabled ? Play : Pause,
  conditions: [{ type: "identifier", identifier: ACCOUNT }, { type: "nopartner" }],
  execute: async ({ services, state, onProgress }) => {
    const ids = need(idsOf(state, ACCOUNT), "mailbox");
    for (const [i, id] of ids.entries()) {
      await kuvertMutate(services, {
        mutation: UpdateMailAccountDocument,
        variables: { input: { id, enabled } },
        refetchQueries: [MailboxTreeDocument],
      });
      onProgress(((i + 1) / ids.length) * 100);
    }
  },
});

const folderSync = (syncEnabled: boolean): Action => ({
  title: syncEnabled ? "Start syncing folder" : "Stop syncing folder",
  description: syncEnabled ? "Read this folder on every sync" : "Leave this folder out of syncs; what is stored is kept",
  icon: RefreshCw,
  conditions: [{ type: "identifier", identifier: FOLDER }, { type: "nopartner" }],
  execute: async ({ services, state, onProgress }) => {
    const ids = need(idsOf(state, FOLDER), "folder");
    for (const [i, id] of ids.entries()) {
      await kuvertMutate(services, {
        mutation: UpdateMailFolderDocument,
        variables: { input: { id, syncEnabled } },
        refetchQueries: [MailboxTreeDocument],
      });
      onProgress(((i + 1) / ids.length) * 100);
    }
  },
});

export const KUVERT_ACTIONS: Record<string, Action> = {
  // --- Mail -----------------------------------------------------------------
  "kuvert-reply": reply("Reply", "Answer the sender", "reply", Reply),
  "kuvert-reply-all": reply("Reply all", "Answer the sender and everyone else on the mail", "replyAll", ReplyAll),
  "kuvert-forward": reply("Forward", "Send the mail on to someone else", "forward", Forward),
  "kuvert-mark-read": {
    title: "Mark read",
    description: "Mark the selected mail as read",
    icon: MailOpen,
    pinned: true,
    conditions: [{ type: "identifier", identifier: MESSAGE }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      await markRead(kuvertClient(services), need(idsOf(state, MESSAGE), "mail"), true);
      onProgress(100);
    },
  },
  "kuvert-mark-unread": {
    title: "Mark unread",
    description: "Mark the selected mail as unread",
    icon: Mail,
    conditions: [{ type: "identifier", identifier: MESSAGE }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      await markRead(kuvertClient(services), need(idsOf(state, MESSAGE), "mail"), false);
      onProgress(100);
    },
  },
  "kuvert-flag": flag(true),
  "kuvert-unflag": flag(false),
  "kuvert-archive": {
    title: "Archive",
    description: "Move the mail to its mailbox's Archive folder",
    icon: Archive,
    pinned: true,
    conditions: [{ type: "identifier", identifier: MESSAGE }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      await moveToRole(kuvertClient(services), need(idsOf(state, MESSAGE), "mail"), FolderRole.Archive, "Archive");
      onProgress(100);
    },
  },
  "kuvert-move": {
    title: "Move to…",
    description: "Move the mail to another folder of its mailbox",
    icon: FolderInput,
    conditions: [{ type: "identifier", identifier: MESSAGE }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("kuvertmove", { messages: need(idsOf(state, MESSAGE), "mail") }, { size: "small" });
    },
  },
  "kuvert-move-into": {
    title: "Move here",
    description: "Move the dragged mail into this folder",
    icon: FolderInput,
    conditions: [
      { type: "identifier", identifier: MESSAGE },
      { type: "pidentifier", identifier: FOLDER },
    ],
    execute: async ({ services, state, onProgress }) => {
      const folder = state.right?.find((s) => s.identifier === FOLDER);
      if (!folder) throw new Error("Drop the mail onto a folder");
      await moveTo(kuvertClient(services), need(idsOf(state, MESSAGE), "mail"), String(folder.id));
      onProgress(100);
    },
  },
  "kuvert-delete": {
    title: "Delete",
    description: "Move the mail to Trash (hold Shift to delete it for good)",
    icon: Trash2,
    conditions: [{ type: "identifier", identifier: MESSAGE }, { type: "nopartner" }],
    execute: async (params) => {
      const messages = need(idsOf(params.state, MESSAGE), "mail");
      await confirmDelete(params, messages, messages.length === 1 ? "this mail" : `${messages.length} mails`);
    },
  },
  "kuvert-find-similar": {
    title: "Find similar",
    description: "Mail about the same thing, nearest first",
    icon: Sparkles,
    conditions: [{ type: "identifier", identifier: MESSAGE }, { type: "nopartner" }],
    execute: async ({ navigate, state }) => {
      const [id] = need(idsOf(state, MESSAGE), "mail");
      navigate(`/kuvert/search?similar=${encodeURIComponent(id)}`);
    },
  },

  // --- Conversations ----------------------------------------------------------
  "kuvert-thread-read": {
    title: "Mark read",
    description: "Mark every mail of the conversation as read",
    icon: CheckCheck,
    pinned: true,
    conditions: [{ type: "identifier", identifier: THREAD }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      const client = kuvertClient(services);
      await markRead(client, await threadMessages(client, need(idsOf(state, THREAD), "conversation")), true);
      onProgress(100);
    },
  },
  "kuvert-thread-archive": {
    title: "Archive",
    description: "Move the conversation to its mailbox's Archive folder",
    icon: Archive,
    pinned: true,
    conditions: [{ type: "identifier", identifier: THREAD }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      const client = kuvertClient(services);
      const messages = await threadMessages(client, need(idsOf(state, THREAD), "conversation"));
      await moveToRole(client, messages, FolderRole.Archive, "Archive");
      onProgress(100);
    },
  },
  "kuvert-thread-delete": {
    title: "Delete",
    description: "Move the conversation to Trash (hold Shift to delete it for good)",
    icon: Trash2,
    conditions: [{ type: "identifier", identifier: THREAD }, { type: "nopartner" }],
    execute: async (params) => {
      const threads = need(idsOf(params.state, THREAD), "conversation");
      const messages = await threadMessages(kuvertClient(params.services), threads);
      await confirmDelete(params, messages, threads.length === 1 ? "this conversation" : `${threads.length} conversations`);
    },
  },

  // --- Mailboxes --------------------------------------------------------------
  "kuvert-sync-account": {
    title: "Sync now",
    description: "Fetch new mail and flag changes from the server",
    icon: RefreshCw,
    pinned: true,
    conditions: [{ type: "identifier", identifier: ACCOUNT }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      const ids = need(idsOf(state, ACCOUNT), "mailbox");
      for (const [i, id] of ids.entries()) {
        await kuvertMutate(services, { mutation: SyncMailAccountDocument, variables: { id }, refetchQueries: MAIL_VIEWS });
        onProgress(((i + 1) / ids.length) * 100);
      }
    },
  },
  "kuvert-test-account": {
    title: "Test login",
    description: "Log in to the mailbox's servers now",
    icon: PlugZap,
    conditions: [{ type: "identifier", identifier: ACCOUNT }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      for (const id of need(idsOf(state, ACCOUNT), "mailbox")) {
        await kuvertMutate(services, { mutation: TestMailAccountDocument, variables: { id } });
      }
      onProgress(100);
    },
  },
  "kuvert-compose": {
    title: "New mail",
    description: "Write a mail from this mailbox",
    icon: PenSquare,
    conditions: [{ type: "identifier", identifier: ACCOUNT }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const [account] = need(idsOf(state, ACCOUNT), "mailbox");
      dialog.openSheet("kuvertcompose", { account }, { size: "large" });
    },
  },
  "kuvert-edit-account": {
    title: "Edit mailbox",
    description: "Change its name, password or servers",
    icon: Pencil,
    conditions: [{ type: "identifier", identifier: ACCOUNT }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const [id] = need(idsOf(state, ACCOUNT), "mailbox");
      dialog.openDialog("kuverteditaccount", { id }, { size: "medium" });
    },
  },
  "kuvert-share-account": {
    title: "Share mailbox",
    description: "Set who in the organization sees this mailbox",
    icon: Share2,
    conditions: [{ type: "identifier", identifier: ACCOUNT }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const [id] = need(idsOf(state, ACCOUNT), "mailbox");
      dialog.openDialog("kuvertshare", { id }, { size: "medium" });
    },
  },
  "kuvert-relink-account": {
    title: "Sign in again",
    description: "Renew the mailbox's sign-in or password; its mail is kept",
    icon: KeyRound,
    conditions: [{ type: "identifier", identifier: ACCOUNT }, { type: "nopartner" }],
    execute: async ({ dialog, services, state }) => {
      const [id] = need(idsOf(state, ACCOUNT), "mailbox");
      const { data } = await kuvertClient(services).query<GetMailAccountQuery>({
        query: GetMailAccountDocument,
        variables: { id },
      });
      const account = data.mailAccount;
      if (account.authMethod === AuthMethod.Xoauth2) {
        dialog.openDialog(
          "kuvertlink",
          { relink: id, provider: account.provider, address: account.emailAddress },
          { size: "medium" },
        );
      } else {
        dialog.openDialog("kuverteditaccount", { id }, { size: "medium" });
      }
    },
  },
  "kuvert-pause-account": pause(false),
  "kuvert-resume-account": pause(true),
  "kuvert-delete-account": buildDeleteAction({
    title: "Remove mailbox",
    identifier: ACCOUNT,
    description: "Unlink the mailbox and drop its synced mail here; mail on the server is untouched",
    service: "kuvert",
    typename: "MailAccount",
    mutation: DeleteMailAccountDocument,
  }),

  // --- Folders ----------------------------------------------------------------
  "kuvert-sync-folder": {
    title: "Sync folder",
    description: "Fetch this folder's new mail now",
    icon: RefreshCw,
    pinned: true,
    conditions: [{ type: "identifier", identifier: FOLDER }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      const folders = need(idsOf(state, FOLDER), "folder");
      const client = kuvertClient(services);
      // A sync is per mailbox: group the folders by theirs.
      const byAccount = new Map<string, string[]>();
      for (const id of folders) {
        const { data } = await client.query<GetMailFolderQuery>({ query: GetMailFolderDocument, variables: { id } });
        const account = data.mailFolder.account.id;
        byAccount.set(account, [...(byAccount.get(account) ?? []), id]);
      }
      for (const [id, ids] of byAccount) {
        await kuvertMutate(services, {
          mutation: SyncMailAccountDocument,
          variables: { id, folders: ids },
          refetchQueries: MAIL_VIEWS,
        });
      }
      onProgress(100);
    },
  },
  "kuvert-folder-sync-on": folderSync(true),
  "kuvert-folder-sync-off": folderSync(false),
};

