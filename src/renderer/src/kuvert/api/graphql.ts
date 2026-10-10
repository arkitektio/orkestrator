import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/kuvert/api/funcs';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A number of bytes. 64-bit, unlike Int: serialized as a JSON number, and accepted as a number or a numeric string. */
  ByteCount: { input: number; output: number; }
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

/** A mail address with its display name. */
export type Address = {
  __typename?: 'Address';
  /** The address. */
  address: Scalars['String']['output'];
  /** The display name (may be empty). */
  name: Scalars['String']['output'];
};

/** A file attached to a message. */
export type Attachment = {
  __typename?: 'Attachment';
  /** The Content-ID an HTML body references (cid:), without angle brackets. */
  contentId?: Maybe<Scalars['String']['output']>;
  /** The MIME type. */
  contentType: Scalars['String']['output'];
  /** The file name, as the sender gave it. */
  filename: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Shown inside the HTML body (an inline image), not as a download. */
  inline: Scalars['Boolean']['output'];
  /** The part's position among the message's attachments. */
  position: Scalars['Int']['output'];
  /** The decoded size in bytes. */
  size: Scalars['Int']['output'];
  /** The bytes in the datalayer (request a read grant from it); null without a datalayer. */
  store?: Maybe<BigFileStore>;
};

/** How a started login finishes. */
export enum AuthFinish {
  Poll = 'POLL',
  Redirect = 'REDIRECT'
}

/** How the service logs in. PASSWORD: Username and (app) password; XOAUTH2: OAuth 2.0 access token (SASL XOAUTH2). */
export enum AuthMethod {
  Password = 'PASSWORD',
  Xoauth2 = 'XOAUTH2'
}

/** A Structure: what the login linked, so the app can open its page. */
export type AuthResult = {
  __typename?: 'AuthResult';
  id: Scalars['ID']['output'];
  identifier: Scalars['String']['output'];
  label?: Maybe<Scalars['String']['output']>;
};

/** A login at an external provider, the same shape in every service. Open `openUrl` in the user's browser; then, by `finish`: REDIRECT — the provider redirects to `redirectUrl` with `code` and `state`, call `completeAuth` with both; POLL — call `completeAuth` with the `state` every `interval` seconds until `status` is not PENDING. */
export type AuthSession = {
  __typename?: 'AuthSession';
  /** FAILED: machine-readable, the service's own error codes. */
  errorCode?: Maybe<Scalars['String']['output']>;
  /** FAILED: one sentence for the user. */
  errorMessage?: Maybe<Scalars['String']['output']>;
  /** Until when the first approval can happen. */
  expiresAt: Scalars['DateTime']['output'];
  finish: AuthFinish;
  /** POLL: seconds between two completeAuth calls. */
  interval?: Maybe<Scalars['Int']['output']>;
  /** https. What the app opens in the user's browser. */
  openUrl: Scalars['String']['output'];
  /** REDIRECT: where the provider sends the browser back to (the relay URL). */
  redirectUrl?: Maybe<Scalars['String']['output']>;
  /** DONE: what was linked. May be set earlier when it already exists (a relink). */
  result?: Maybe<AuthResult>;
  /** Opaque, unguessable, single-use, stored server-side. THE handle of the login. */
  state: Scalars['String']['output'];
  status: AuthStatus;
  /** Null until the first approval; then what is still awaited, e.g. MFA. */
  step?: Maybe<Scalars['String']['output']>;
  /** POLL: the code the user confirms on the provider's page. */
  userCode?: Maybe<Scalars['String']['output']>;
};

/** Where a login is. */
export enum AuthStatus {
  Cancelled = 'CANCELLED',
  Done = 'DONE',
  Expired = 'EXPIRED',
  Failed = 'FAILED',
  Pending = 'PENDING'
}

/** Temporary S3 credentials for reading a big file. */
export type BigFileAccessGrant = {
  __typename?: 'BigFileAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store?: Maybe<Scalars['String']['output']>;
};

/** A BigFileStore represents a large object stored behind the S3 datalayer. */
export type BigFileStore = {
  __typename?: 'BigFileStore';
  /** Get temporary S3 read credentials for the object. */
  accessGrant: BigFileAccessGrant;
  /** The datalayer bucket/service this store belongs to. */
  bucket: Scalars['String']['output'];
  /** The client-provided content type for the uploaded file. */
  contentType?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The object key/path within the datalayer bucket. */
  key: Scalars['String']['output'];
  /** The original client-provided file name. */
  originalFileName?: Maybe<Scalars['String']['output']>;
  /** The object-store URI of the file */
  path: Scalars['String']['output'];
  presignedUrl: Scalars['String']['output'];
  /** How many bytes this store actually holds, measured when its upload was finished. Null while unfinished, or for stores written before this was recorded */
  sizeBytes?: Maybe<Scalars['ByteCount']['output']>;
};


/** A BigFileStore represents a large object stored behind the S3 datalayer. */
export type BigFileStoreAccessGrantArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};

/** Temporary S3 credentials for uploading a big file. */
export type BigFileUploadGrant = {
  __typename?: 'BigFileUploadGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  maxBytes: Scalars['ByteCount']['output'];
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store: Scalars['String']['output'];
  uploadContentType?: Maybe<Scalars['String']['output']>;
  uploadFileName: Scalars['String']['output'];
  uploadFormField: Scalars['String']['output'];
};

/** Put messages into categories of their mailbox and take them out (every copy of each message). */
export type CategorizeMessagesInput = {
  /** Categories to put the messages into. */
  add?: Array<Scalars['ID']['input']>;
  messages: Array<Scalars['ID']['input']>;
  /** Categories to take the messages out of. */
  remove?: Array<Scalars['ID']['input']>;
};

/** A category of a mailbox, shared by everyone who sees the mailbox: LOCAL, or kept on the server as an IMAP keyword (KEYWORD). */
export type Category = {
  __typename?: 'Category';
  /** The mailbox. */
  account: MailAccount;
  /** A display color (e.g. #4f86f7). */
  color: Scalars['String']['output'];
  /** When the category was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** The IMAP keyword a KEYWORD category is kept as. */
  keyword: Scalars['String']['output'];
  /** Messages in the category (every copy counts). */
  messageCount: Scalars['Int']['output'];
  /** The category's name. */
  name: Scalars['String']['output'];
  /** Where the category lives. */
  sync: CategorySync;
};

/**
 * A category of a mailbox, shared by everyone who sees the mailbox.
 *
 * A KEYWORD category *is* its keyword: a message is in it when the keyword is among its flags,
 * so the membership reaches other mail clients and survives moves made there. A LOCAL
 * category's members are its assignments, kept under the message key.
 */
export type CategoryFilter = {
  AND?: InputMaybe<CategoryFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<CategoryFilter>;
  OR?: InputMaybe<CategoryFilter>;
  account?: InputMaybe<Scalars['ID']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  sync?: InputMaybe<CategorySync>;
};

/** Where a category lives. LOCAL: Only here; the server never sees it; KEYWORD: As an IMAP keyword on the server, so other mail clients see it. */
export enum CategorySync {
  Keyword = 'KEYWORD',
  Local = 'LOCAL'
}

/** Finish (REDIRECT) or advance (POLL) a started login. */
export type CompleteAuthInput = {
  /** REDIRECT: the `code` query parameter of the redirect. POLL: omitted. */
  code?: InputMaybe<Scalars['String']['input']>;
  /** REDIRECT: the provider's `error` / `error_description`, when it refused. */
  error?: InputMaybe<Scalars['String']['input']>;
  errorDescription?: InputMaybe<Scalars['String']['input']>;
  state: Scalars['String']['input'];
};

/** A new category of a mailbox. */
export type CreateCategoryInput = {
  account: Scalars['ID']['input'];
  color?: Scalars['String']['input'];
  /** The IMAP keyword (e.g. $Invoices); derived from the name when not given. A KEYWORD category starts out holding the messages that already carry it. */
  keyword?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  /** LOCAL keeps it here; KEYWORD keeps it on the server as `keyword`, so other mail clients see it. */
  sync?: CategorySync;
};

/** A mailbox to link with a username and (app) password. Servers default to the preset of the address's provider when there is one (`mailPresets`). */
export type CreateMailAccountInput = {
  /** The sender name of sent mail. */
  displayName?: InputMaybe<Scalars['String']['input']>;
  emailAddress: Scalars['String']['input'];
  /** The IMAP or POP3 server; the preset's by default. */
  incoming?: InputMaybe<ServerInput>;
  /** A display name for the mailbox; the address by default. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The (app) password. Stored encrypted, never returned. */
  password: Scalars['String']['input'];
  /** POP3: keep downloaded mail on the server. */
  popLeaveOnServer?: Scalars['Boolean']['input'];
  protocol?: Protocol;
  /** Append sent mail to the Sent folder; the preset's choice by default (off for Gmail/Microsoft). */
  saveSentCopy?: InputMaybe<Scalars['Boolean']['input']>;
  /** The SMTP server; the preset's by default. Without one the mailbox cannot send. */
  smtp?: InputMaybe<ServerInput>;
  /** The separate SMTP password. */
  smtpPassword?: InputMaybe<Scalars['String']['input']>;
  /** A separate SMTP login, if the server wants one. */
  smtpUsername?: InputMaybe<Scalars['String']['input']>;
  /** The login; the address by default. */
  username?: InputMaybe<Scalars['String']['input']>;
  visibility?: Visibility;
};

/** A new task, optionally with its conversations. */
export type CreateTaskInput = {
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  /** An app's own key; must be unique among the caller's tasks. */
  externalKey?: InputMaybe<Scalars['String']['input']>;
  /** How those conversations are linked. */
  link?: InputMaybe<ThreadLinkInput>;
  list?: InputMaybe<Scalars['ID']['input']>;
  notes?: Scalars['String']['input'];
  pinned?: Scalars['Boolean']['input'];
  /** Where it sorts; after the last task by default. */
  position?: InputMaybe<Scalars['Float']['input']>;
  /** Conversations to put into the task. */
  threads?: Array<Scalars['ID']['input']>;
  title: Scalars['String']['input'];
};

/** A new task list. */
export type CreateTaskListInput = {
  color?: Scalars['String']['input'];
  name: Scalars['String']['input'];
  /** Where it sorts; after the last list by default. */
  position?: InputMaybe<Scalars['Float']['input']>;
};

/** Delete messages: into Trash, or for good. */
export type DeleteMessagesInput = {
  messages: Array<Scalars['ID']['input']>;
  /** Expunge instead of moving to Trash (messages already in Trash are always expunged). */
  permanent?: Scalars['Boolean']['input'];
};

/** What a delete did. */
export type DeleteResult = {
  __typename?: 'DeleteResult';
  /** Messages deleted or moved to Trash (here at once; on the server after the undo window). */
  deleted: Scalars['Int']['output'];
};

export type FinishBigFileUploadInput = {
  storeId: Scalars['String']['input'];
  valid?: Scalars['Boolean']['input'];
};

/** What a folder is for (IMAP SPECIAL-USE, else guessed from its name). INBOX: Incoming mail; SENT: Sent mail; DRAFTS: Drafts; TRASH: Deleted mail; ARCHIVE: Archived mail; JUNK: Spam; ALL: Every message (Gmail's All Mail); FLAGGED: A virtual folder of flagged mail; OTHER: A user folder. */
export enum FolderRole {
  All = 'ALL',
  Archive = 'ARCHIVE',
  Drafts = 'DRAFTS',
  Flagged = 'FLAGGED',
  Inbox = 'INBOX',
  Junk = 'JUNK',
  Other = 'OTHER',
  Sent = 'SENT',
  Trash = 'TRASH'
}

/** Put conversations into a task. A conversation already in it keeps its place; its link details are updated. */
export type LinkThreadsInput = {
  link?: InputMaybe<ThreadLinkInput>;
  task: Scalars['ID']['input'];
  threads: Array<Scalars['ID']['input']>;
};

/** A linked mailbox. Private to the member who linked it unless shared (`visibility`). */
export type MailAccount = {
  __typename?: 'MailAccount';
  /** How the service logs in. */
  authMethod: AuthMethod;
  /** Every synced folder has reached the backfill window. */
  backfillDone: Scalars['Boolean']['output'];
  /** Whether the mailbox can send (it has an SMTP server). */
  canSend: Scalars['Boolean']['output'];
  /** What the incoming server announced (IMAP CAPABILITY, POP3 CAPA). */
  capabilities: Array<Scalars['String']['output']>;
  /** The mailbox's categories. */
  categories: Array<Category>;
  /** When the mailbox was linked. */
  createdAt: Scalars['DateTime']['output'];
  /** The member who linked the mailbox; only they change its credentials or sharing. */
  creator?: Maybe<User>;
  /** The sender name of sent mail. */
  displayName: Scalars['String']['output'];
  /** The mailbox's address; the From of sent mail. */
  emailAddress: Scalars['String']['output'];
  /** Changes made here that did not reach the server (see `mailChanges`). */
  failedChanges: Scalars['Int']['output'];
  /** The mailbox's folders (a POP3 mailbox has one, its INBOX). */
  folders: Array<MailFolder>;
  id: Scalars['ID']['output'];
  /** The IMAP or POP3 server. */
  incomingHost: Scalars['String']['output'];
  /** The IMAP or POP3 port. */
  incomingPort: Scalars['Int']['output'];
  /** Transport security of the incoming connection. */
  incomingSecurity: Security;
  /** Whether the caller linked the mailbox (and so may change its credentials, sharing, or delete it). */
  isOwner: Scalars['Boolean']['output'];
  /** Why the last sync or connection failed, if it did. */
  lastError?: Maybe<Scalars['String']['output']>;
  /** The machine-readable kind of `last_error`. */
  lastErrorCode?: Maybe<MailErrorCode>;
  /** When the last successful sync finished. */
  lastSyncedAt?: Maybe<Scalars['DateTime']['output']>;
  /** A display name for the mailbox (e.g. 'Work'). */
  name: Scalars['String']['output'];
  /** The organization this mailbox belongs to. */
  organization: Organization;
  /** The re-link of this mailbox still to be finished, when you started it and it is PENDING: continue it with `resumeAuth(state)`. Null otherwise. */
  pendingAuth?: Maybe<AuthSession>;
  /** Changes made here that have not reached the server yet. */
  pendingChanges: Scalars['Int']['output'];
  /** POP3: keep downloaded mail on the server. Off deletes it there once stored. */
  popLeaveOnServer: Scalars['Boolean']['output'];
  /** How incoming mail is read. */
  protocol: Protocol;
  /** Who hosts the mailbox. */
  provider: Provider;
  /** Deletes are pushed to the server (else only hidden here). */
  pushDeletes: Scalars['Boolean']['output'];
  /** Flagging is pushed to the server (else kept here). */
  pushFlagged: Scalars['Boolean']['output'];
  /** Keywords (KEYWORD categories) are pushed to the server (else kept here). */
  pushKeywords: Scalars['Boolean']['output'];
  /** Moves are pushed to the server (else refused). */
  pushMoves: Scalars['Boolean']['output'];
  /** Read/unread is pushed to the server (else kept here). */
  pushSeen: Scalars['Boolean']['output'];
  /** Append sent mail to the Sent folder (off for Gmail and Microsoft, which keep a copy themselves). */
  saveSentCopy: Scalars['Boolean']['output'];
  /** Whether folders, moves and flags live on the server (IMAP). On POP3 flags are local and moves are refused. */
  serverSideFolders: Scalars['Boolean']['output'];
  /** Members who see the mailbox when it is SHARED. */
  sharedWith: Array<User>;
  /** The SMTP server; without one the mailbox cannot send. */
  smtpHost?: Maybe<Scalars['String']['output']>;
  /** The SMTP port. */
  smtpPort?: Maybe<Scalars['Int']['output']>;
  /** Transport security of the SMTP connection. */
  smtpSecurity: Security;
  /** Where the mailbox is in its lifecycle. */
  status: MailAccountStatus;
  /** Whether a sync holds the mailbox right now. */
  syncing: Scalars['Boolean']['output'];
  /** Unread messages over the synced folders, as they are here. */
  unreadCount: Scalars['Int']['output'];
  /** The login name (usually the address). */
  username: Scalars['String']['output'];
  /** Who in the organization sees the mailbox and its mail. */
  visibility: Visibility;
};


/** A linked mailbox. Private to the member who linked it unless shared (`visibility`). */
export type MailAccountCategoriesArgs = {
  filters?: InputMaybe<CategoryFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A linked mailbox. Private to the member who linked it unless shared (`visibility`). */
export type MailAccountFoldersArgs = {
  filters?: InputMaybe<MailFolderFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/**
 * One linked mailbox: where it lives, how to log in, and how far it is synced.
 *
 * ``secret`` holds the password (PASSWORD) or the refresh token (XOAUTH2), and
 * ``access_token`` the current OAuth access token -- both Fernet-encrypted
 * (:mod:`mail.crypto`), never exposed and never written to history rows.
 */
export type MailAccountFilter = {
  AND?: InputMaybe<MailAccountFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MailAccountFilter>;
  OR?: InputMaybe<MailAccountFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<MailAccountStatus>;
};

/** Lifecycle of a linked mailbox. ACTIVE: Linked; syncs and sends; NEEDS_REAUTH: The credentials stopped working; update the password or link again; DISABLED: Paused by a user; neither synced nor used to send. */
export enum MailAccountStatus {
  Active = 'ACTIVE',
  Disabled = 'DISABLED',
  NeedsReauth = 'NEEDS_REAUTH'
}

/** A change made here that has not reached the server yet (a pushed one is gone). */
export type MailChange = {
  __typename?: 'MailChange';
  /** The mailbox. */
  account: MailAccount;
  /** FLAGS: flags and keywords to add. */
  add: Array<Scalars['String']['output']>;
  /** Failed attempts so far. */
  attempts: Scalars['Int']['output'];
  /** When the change was made. */
  createdAt: Scalars['DateTime']['output'];
  /** The member who made the change. */
  createdBy?: Maybe<User>;
  /** Why the last attempt failed. */
  error?: Maybe<Scalars['String']['output']>;
  /** The machine-readable kind of `error`. */
  errorCode?: Maybe<MailErrorCode>;
  id: Scalars['ID']['output'];
  /** What the change does. */
  kind: MailChangeKind;
  /** The message (also one deleted here, while its delete is on its way). */
  message?: Maybe<Message>;
  /** MOVE/EXPUNGE: the folder the server has the message in. */
  originFolder?: Maybe<MailFolder>;
  /** Not pushed before then (the undo window, or the wait after a failure). */
  pushAfter: Scalars['DateTime']['output'];
  /** FLAGS: flags and keywords to remove. */
  remove: Array<Scalars['String']['output']>;
  /** Where the change is. */
  state: MailChangeState;
  /** MOVE: the folder it goes to. */
  targetFolder?: Maybe<MailFolder>;
  /** Whether `undoMailChanges` can still take it back (in its undo window, or FAILED). */
  undoable: Scalars['Boolean']['output'];
};

/**
 * A change made here that still has to reach the server (see :mod:`mail.push`).
 *
 * ``origin_*`` is where a MOVE or EXPUNGE finds the message on the server: the row itself has
 * already left (moved rows wait with a null UID, deleted ones carry ``deleted_at``). A FLAGS
 * change finds it through its row, and through ``message_key`` once sync replaced the row.
 */
export type MailChangeFilter = {
  AND?: InputMaybe<MailChangeFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MailChangeFilter>;
  OR?: InputMaybe<MailChangeFilter>;
  account?: InputMaybe<Scalars['ID']['input']>;
  kind?: InputMaybe<MailChangeKind>;
  message?: InputMaybe<Scalars['ID']['input']>;
  state?: InputMaybe<MailChangeState>;
};

/** What a queued change does on the server. FLAGS: Add and remove flags and keywords (STORE); MOVE: Move the message to another folder; EXPUNGE: Delete the message for good; POP_DELE: Delete the message on a POP3 server. */
export enum MailChangeKind {
  Expunge = 'EXPUNGE',
  Flags = 'FLAGS',
  Move = 'MOVE',
  PopDele = 'POP_DELE'
}

/** Where a queued change is (a pushed one is gone). PENDING: Waiting to be pushed (from `pushAfter` on); FAILED: The server refused it or it ran out of attempts; the local state stays. */
export enum MailChangeState {
  Failed = 'FAILED',
  Pending = 'PENDING'
}

/** What went wrong, for a client to offer a fix. Also stored as ``last_error_code``. NOT_CONFIGURED: The service is not configured for this (an OAuth client, the datalayer); AUTH_FAILED: The server refused the username or password; CONSENT_EXPIRED: The OAuth grant was revoked or ran out; link the mailbox again; CONNECTION_FAILED: The server could not be reached, or the connection broke; TLS_FAILED: The TLS handshake failed (certificate or protocol); TLS_REQUIRED: The mailbox asks for a connection without TLS, which is not allowed; HOST_NOT_ALLOWED: The host resolves to a private or internal address; SYNC_IN_PROGRESS: Another sync holds this mailbox right now; RATE_LIMITED: Synced too recently; try again later; SERVER_ERROR: The server answered a command with an error; SEND_REJECTED: The SMTP server refused the message or a recipient; UNSUPPORTED_BY_PROTOCOL: POP3 cannot do this (folders, flags on the server); MAILBOX_INACTIVE: The mailbox is disabled or needs new credentials; INVALID_STATE: The link state is unknown, used or belongs to someone else; CODE_EXPIRED: The link was not completed in time; PROVIDER_ERROR: The OAuth provider answered with an error; UNSUPPORTED_BY_POLICY: The mailbox is set not to change this on the server (its push settings); KEYWORDS_NOT_PERMITTED: The folder does not keep keywords (no \\* in PERMANENTFLAGS), the category stays local; MESSAGE_GONE: The message is no longer where the change expected it on the server; UNSAFE_EXPUNGE: Without UIDPLUS an expunge would also remove other deleted messages of the folder. */
export enum MailErrorCode {
  AuthFailed = 'AUTH_FAILED',
  CodeExpired = 'CODE_EXPIRED',
  ConnectionFailed = 'CONNECTION_FAILED',
  ConsentExpired = 'CONSENT_EXPIRED',
  HostNotAllowed = 'HOST_NOT_ALLOWED',
  InvalidState = 'INVALID_STATE',
  KeywordsNotPermitted = 'KEYWORDS_NOT_PERMITTED',
  MailboxInactive = 'MAILBOX_INACTIVE',
  MessageGone = 'MESSAGE_GONE',
  NotConfigured = 'NOT_CONFIGURED',
  ProviderError = 'PROVIDER_ERROR',
  RateLimited = 'RATE_LIMITED',
  SendRejected = 'SEND_REJECTED',
  ServerError = 'SERVER_ERROR',
  SyncInProgress = 'SYNC_IN_PROGRESS',
  TlsFailed = 'TLS_FAILED',
  TlsRequired = 'TLS_REQUIRED',
  UnsafeExpunge = 'UNSAFE_EXPUNGE',
  UnsupportedByPolicy = 'UNSUPPORTED_BY_POLICY',
  UnsupportedByProtocol = 'UNSUPPORTED_BY_PROTOCOL'
}

/** A folder of a mailbox. */
export type MailFolder = {
  __typename?: 'MailFolder';
  /** The mailbox this folder is in. */
  account: MailAccount;
  /** The backfill reached the window (or the first message). */
  backfillDone: Scalars['Boolean']['output'];
  /** The server's hierarchy delimiter. */
  delimiter?: Maybe<Scalars['String']['output']>;
  /** False once the server stopped listing the folder. */
  existsOnServer: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** The folder keeps any keyword on the server (else KEYWORD categories stay local here). */
  keywordsAllowed: Scalars['Boolean']['output'];
  /** When the folder was last synced. */
  lastSyncedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The folder's messages. */
  messages: Array<Message>;
  /** The last segment of the path. */
  name: Scalars['String']['output'];
  /** The folder's full name on the server, decoded (e.g. 'INBOX/Receipts'). */
  path: Scalars['String']['output'];
  /** What the folder is for. */
  role: FolderRole;
  /** Whether the folder can hold messages (\Noselect folders only hold folders). */
  selectable: Scalars['Boolean']['output'];
  /** Unread messages in the folder, as the server counted them at the last sync. */
  serverUnreadCount: Scalars['Int']['output'];
  /** Whether syncs read this folder. */
  syncEnabled: Scalars['Boolean']['output'];
  /** Messages in the folder, as the server counts them. */
  totalCount: Scalars['Int']['output'];
  /** Unread messages in the folder, as they are here (local changes included). */
  unreadCount: Scalars['Int']['output'];
};


/** A folder of a mailbox. */
export type MailFolderMessagesArgs = {
  filters?: InputMaybe<MessageFilter>;
  ordering?: Array<MessageOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A folder (IMAP mailbox) of a linked mailbox; a POP3 mailbox has exactly one, its INBOX. */
export type MailFolderFilter = {
  AND?: InputMaybe<MailFolderFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MailFolderFilter>;
  OR?: InputMaybe<MailFolderFilter>;
  account?: InputMaybe<Scalars['ID']['input']>;
  role?: InputMaybe<FolderRole>;
  syncEnabled?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Server settings of a well-known mail provider, to fill in a new mailbox. */
export type MailPreset = {
  __typename?: 'MailPreset';
  domains: Array<Scalars['String']['output']>;
  imap?: Maybe<ServerSettings>;
  key: Scalars['String']['output'];
  name: Scalars['String']['output'];
  note: Scalars['String']['output'];
  /** The provider is linked through OAuth (`startOAuthLink`). */
  oauth: Scalars['Boolean']['output'];
  /** This deployment has an OAuth client for it. */
  oauthConfigured: Scalars['Boolean']['output'];
  pop3?: Maybe<ServerSettings>;
  provider: Provider;
  saveSentCopy: Scalars['Boolean']['output'];
  smtp?: Maybe<ServerSettings>;
};

/** A mailbox finished syncing. */
export type MailboxSyncEvent = {
  __typename?: 'MailboxSyncEvent';
  accountId: Scalars['ID']['output'];
  created: Scalars['Int']['output'];
  deleted: Scalars['Int']['output'];
  /** The folders whose messages changed, so a client refetches only those lists. */
  folders: Array<Scalars['ID']['output']>;
  more: Scalars['Boolean']['output'];
  updated: Scalars['Int']['output'];
};

/** Mark messages read or unread. */
export type MarkMessagesInput = {
  messages: Array<Scalars['ID']['input']>;
  read?: Scalars['Boolean']['input'];
};

/** A message in a folder. A copy in another folder is another message with the same `messageId`. */
export type Message = {
  __typename?: 'Message';
  /** The mailbox. */
  account: MailAccount;
  /** Attached files, inline images included (`inline`). */
  attachments: Array<Attachment>;
  /** Bcc addresses (only known on sent mail). */
  bcc: Array<Address>;
  /** The categories the message is in. */
  categories: Array<Category>;
  /** Cc addresses. */
  cc: Array<Address>;
  /** Changes made here that have not reached the server (pending or failed). */
  changes: Array<MailChange>;
  /** When the message was first stored. */
  createdAt: Scalars['DateTime']['output'];
  /** The Date header (else when the server received it). */
  date?: Maybe<Scalars['DateTime']['output']>;
  /** This object's descriptors, a flat mapping of key to value: the facts about it that an action's port can `require` and a trigger can test (e.g. `@kuvert/message_count`). The keys are the ones kuvert declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** The flags and keywords as they are here: the server's with local changes applied. */
  flags: Array<Scalars['String']['output']>;
  /** The folder the message is in. */
  folder: MailFolder;
  /** The message has attachments (not counting inline images). */
  hasAttachments: Scalars['Boolean']['output'];
  /** The HTML loads images from the internet. */
  hasRemoteImages: Scalars['Boolean']['output'];
  /** The HTML body, sanitized: no scripts, styles, event handlers or forms. Remote images are removed unless `allowRemote` (loading one tells the sender the mail was read); inline images keep their `cid:` references (see `attachments.contentId`). Null for a plain-text message. */
  html?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The In-Reply-To header, without angle brackets. */
  inReplyTo?: Maybe<Scalars['String']['output']>;
  /** Whether the message was answered (\Answered). */
  isAnswered: Scalars['Boolean']['output'];
  /** Whether the message is flagged (\Flagged). */
  isFlagged: Scalars['Boolean']['output'];
  /** Whether the message is read (\Seen). */
  isRead: Scalars['Boolean']['output'];
  /** The Message-ID header, without angle brackets. */
  messageId?: Maybe<Scalars['String']['output']>;
  /** The raw RFC 5322 message in the datalayer; null without a datalayer. */
  raw?: Maybe<BigFileStore>;
  /** When the server received the message (IMAP INTERNALDATE). */
  receivedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The References header, oldest first. */
  references: Array<Scalars['String']['output']>;
  /** Reply-To addresses. */
  replyTo: Array<Address>;
  /** The sender. */
  sender: Address;
  /** The From address, lower-cased. */
  senderAddress: Scalars['String']['output'];
  /** The From display name. */
  senderName: Scalars['String']['output'];
  /** The flags and keywords as the server last had them. */
  serverFlags: Array<Scalars['String']['output']>;
  /** The message size in bytes. */
  size: Scalars['Int']['output'];
  /** The start of the text, for list views. */
  snippet: Scalars['String']['output'];
  /** The decoded subject. */
  subject: Scalars['String']['output'];
  /** How the message here relates to the server. */
  syncState: SyncState;
  /** The plain-text body (converted from HTML when there is none). */
  textBody: Scalars['String']['output'];
  /** The conversation. */
  thread?: Maybe<Thread>;
  /** To addresses. */
  to: Array<Address>;
  /** The message was larger than the sync limit; only its headers are stored. */
  truncated: Scalars['Boolean']['output'];
  /** IMAP: the UID in the folder (a string: UIDs are 32-bit unsigned). */
  uid?: Maybe<Scalars['String']['output']>;
};


/** A message in a folder. A copy in another folder is another message with the same `messageId`. */
export type MessageHtmlArgs = {
  allowRemote?: Scalars['Boolean']['input'];
};

/** One message in one folder. A copy in another folder is another row with the same ``message_id``. */
export type MessageFilter = {
  AND?: InputMaybe<MessageFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MessageFilter>;
  OR?: InputMaybe<MessageFilter>;
  account?: InputMaybe<Scalars['ID']['input']>;
  category?: InputMaybe<Scalars['ID']['input']>;
  dateFrom?: InputMaybe<Scalars['DateTime']['input']>;
  dateTo?: InputMaybe<Scalars['DateTime']['input']>;
  flagged?: InputMaybe<Scalars['Boolean']['input']>;
  folder?: InputMaybe<Scalars['ID']['input']>;
  folderRole?: InputMaybe<FolderRole>;
  hasAttachments?: InputMaybe<Scalars['Boolean']['input']>;
  hasFlag?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  recipient?: InputMaybe<Scalars['String']['input']>;
  /** Search by text: a case-insensitive substring of the subject, sender or text; or semantic similarity to them ("flight booking" finds the airline's confirmation). Substring matches rank first, then by similarity; an explicit `ordering` replaces that ranking. */
  search?: InputMaybe<Scalars['String']['input']>;
  sender?: InputMaybe<Scalars['String']['input']>;
  /** Order by similarity to the given message, nearest first (no cut-off; composes with other filters and pagination). Empty when the message is not visible or has no embedding yet. */
  similarTo?: InputMaybe<Scalars['ID']['input']>;
  syncState?: InputMaybe<SyncState>;
  thread?: InputMaybe<Scalars['ID']['input']>;
  unread?: InputMaybe<Scalars['Boolean']['input']>;
};

export type MessageOrder =
  { date: Ordering; receivedAt?: never; senderAddress?: never; size?: never; subject?: never; }
  |  { date?: never; receivedAt: Ordering; senderAddress?: never; size?: never; subject?: never; }
  |  { date?: never; receivedAt?: never; senderAddress: Ordering; size?: never; subject?: never; }
  |  { date?: never; receivedAt?: never; senderAddress?: never; size: Ordering; subject?: never; }
  |  { date?: never; receivedAt?: never; senderAddress?: never; size?: never; subject: Ordering; };

/** Move messages to another folder of their mailbox. */
export type MoveMessagesInput = {
  folder: Scalars['ID']['input'];
  messages: Array<Scalars['ID']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Drop a login that will not be finished. Idempotent. */
  cancelAuth: AuthSession;
  /** Put messages into categories and take them out. */
  categorizeMessages: Array<Message>;
  /** REDIRECT: finish with the code. POLL: advance one step; call until not PENDING. */
  completeAuth: AuthSession;
  /** Create a category of a mailbox. */
  createCategory: Category;
  /** Link a mailbox with a username and (app) password; the login is tested first. */
  createMailAccount: MailAccount;
  /** Create a task, optionally with conversations. */
  createTask: Task;
  /** Create a task list. */
  createTaskList: TaskList;
  /** Delete a category. */
  deleteCategory: Scalars['ID']['output'];
  /** Unlink a mailbox (owner only). Mail on the server is untouched. */
  deleteMailAccount: Scalars['ID']['output'];
  /** Delete messages (into Trash, or for good). */
  deleteMessages: DeleteResult;
  /** Delete a task. */
  deleteTask: Scalars['ID']['output'];
  /** Delete a task list; its tasks stay, on no list. */
  deleteTaskList: Scalars['ID']['output'];
  /** Finalize the caller's file upload after the client has written the object. */
  finishBigfileUpload: BigFileStore;
  /** Put conversations into a task. */
  linkThreads: Array<TaskThread>;
  /** Mark messages read or unread. */
  markMessagesRead: Array<Message>;
  /** Move messages to another folder of their mailbox. */
  moveMessages: Array<Message>;
  /** Push a mailbox's due changes now. */
  pushMailChanges: PushResult;
  /** Request temporary S3 credentials to upload one file (an attachment to send). */
  requestBigfileUpload: BigFileUploadGrant;
  /** The same login again (a fresh openUrl if the old one cannot be reused). */
  resumeAuth: AuthSession;
  /** Queue failed changes again. */
  retryMailChanges: Array<MailChange>;
  /** Drop local-only and queued flag changes of messages: back to what the server has. */
  revertMessagesToServer: Array<Message>;
  /** Send a message through a mailbox's SMTP server. */
  sendMessage: OutgoingMessage;
  /** Add and remove flags of messages. */
  setMessageFlags: Array<Message>;
  /** Mark tasks OPEN, DONE or DISMISSED. */
  setTaskStatus: Array<Task>;
  /** Set who sees a mailbox (owner only). */
  shareMailAccount: MailAccount;
  /** Snooze tasks until a time (null wakes them). */
  snoozeTasks: Array<Task>;
  /** Start linking (or re-linking) a mailbox through OAuth. */
  startOAuthLink: AuthSession;
  /** Sync a mailbox now. */
  syncMailAccount: SyncResult;
  /** Log in to a mailbox's servers now. */
  testMailAccount: MailAccount;
  /** Take back changes that have not reached the server. */
  undoMailChanges: Array<Message>;
  /** Take conversations out of a task. */
  unlinkThreads: Task;
  /** Change a category. */
  updateCategory: Category;
  /** Change a mailbox (owner only); new servers or credentials are tested first. */
  updateMailAccount: MailAccount;
  /** Turn syncing a folder on or off. */
  updateMailFolder: MailFolder;
  /** Change a task. */
  updateTask: Task;
  /** Rename, recolor or move a task list. */
  updateTaskList: TaskList;
  /** Create or update the caller's task with this externalKey, and add conversations to it. */
  upsertTask: Task;
};


export type MutationCancelAuthArgs = {
  state: Scalars['String']['input'];
};


export type MutationCategorizeMessagesArgs = {
  input: CategorizeMessagesInput;
};


export type MutationCompleteAuthArgs = {
  input: CompleteAuthInput;
};


export type MutationCreateCategoryArgs = {
  input: CreateCategoryInput;
};


export type MutationCreateMailAccountArgs = {
  input: CreateMailAccountInput;
};


export type MutationCreateTaskArgs = {
  input: CreateTaskInput;
};


export type MutationCreateTaskListArgs = {
  input: CreateTaskListInput;
};


export type MutationDeleteCategoryArgs = {
  id: Scalars['ID']['input'];
  removeKeywords?: Scalars['Boolean']['input'];
};


export type MutationDeleteMailAccountArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMessagesArgs = {
  input: DeleteMessagesInput;
};


export type MutationDeleteTaskArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteTaskListArgs = {
  id: Scalars['ID']['input'];
};


export type MutationFinishBigfileUploadArgs = {
  input: FinishBigFileUploadInput;
};


export type MutationLinkThreadsArgs = {
  input: LinkThreadsInput;
};


export type MutationMarkMessagesReadArgs = {
  input: MarkMessagesInput;
};


export type MutationMoveMessagesArgs = {
  input: MoveMessagesInput;
};


export type MutationPushMailChangesArgs = {
  account: Scalars['ID']['input'];
};


export type MutationRequestBigfileUploadArgs = {
  input: RequestBigFileUploadInput;
};


export type MutationResumeAuthArgs = {
  state: Scalars['String']['input'];
};


export type MutationRetryMailChangesArgs = {
  changes: Array<Scalars['ID']['input']>;
};


export type MutationRevertMessagesToServerArgs = {
  messages: Array<Scalars['ID']['input']>;
};


export type MutationSendMessageArgs = {
  input: SendMessageInput;
};


export type MutationSetMessageFlagsArgs = {
  input: SetMessageFlagsInput;
};


export type MutationSetTaskStatusArgs = {
  input: SetTaskStatusInput;
};


export type MutationShareMailAccountArgs = {
  input: ShareMailAccountInput;
};


export type MutationSnoozeTasksArgs = {
  input: SnoozeTasksInput;
};


export type MutationStartOAuthLinkArgs = {
  input: StartOAuthLinkInput;
};


export type MutationSyncMailAccountArgs = {
  folders?: InputMaybe<Array<Scalars['ID']['input']>>;
  id: Scalars['ID']['input'];
};


export type MutationTestMailAccountArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUndoMailChangesArgs = {
  input: UndoMailChangesInput;
};


export type MutationUnlinkThreadsArgs = {
  input: UnlinkThreadsInput;
};


export type MutationUpdateCategoryArgs = {
  input: UpdateCategoryInput;
};


export type MutationUpdateMailAccountArgs = {
  input: UpdateMailAccountInput;
};


export type MutationUpdateMailFolderArgs = {
  input: UpdateMailFolderInput;
};


export type MutationUpdateTaskArgs = {
  input: UpdateTaskInput;
};


export type MutationUpdateTaskListArgs = {
  input: UpdateTaskListInput;
};


export type MutationUpsertTaskArgs = {
  input: UpsertTaskInput;
};

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

export enum Ordering {
  Asc = 'ASC',
  AscNullsFirst = 'ASC_NULLS_FIRST',
  AscNullsLast = 'ASC_NULLS_LAST',
  Desc = 'DESC',
  DescNullsFirst = 'DESC_NULLS_FIRST',
  DescNullsLast = 'DESC_NULLS_LAST'
}

/** An organization (tenant). Every mailbox belongs to exactly one, and queries only see the current one's data. */
export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
};

/** A message sent through a mailbox's SMTP server. */
export type OutgoingMessage = {
  __typename?: 'OutgoingMessage';
  /** The mailbox it is sent from. */
  account: MailAccount;
  /** The files attached. */
  attachments: Array<BigFileStore>;
  /** Bcc addresses. */
  bcc: Array<Address>;
  /** Cc addresses. */
  cc: Array<Address>;
  /** When sending was asked for. */
  createdAt: Scalars['DateTime']['output'];
  /** The member who sent it. */
  creator?: Maybe<User>;
  /** This object's descriptors, a flat mapping of key to value: the facts about it that an action's port can `require` and a trigger can test (e.g. `@kuvert/message_count`). The keys are the ones kuvert declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** Why sending failed. */
  error?: Maybe<Scalars['String']['output']>;
  /** The machine-readable kind of `error`. */
  errorCode?: Maybe<MailErrorCode>;
  /** The HTML body, as given. */
  htmlBody: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** The message this answers (sets In-Reply-To/References). */
  inReplyTo?: Maybe<Message>;
  /** The Message-ID given to the message. */
  messageId: Scalars['String']['output'];
  /** Recipients the SMTP server refused while accepting the rest. */
  refused: Array<RefusedRecipient>;
  /** A copy was appended to the Sent folder. */
  savedToSent: Scalars['Boolean']['output'];
  /** When the SMTP server accepted it. */
  sentAt?: Maybe<Scalars['DateTime']['output']>;
  /** Where the message is. */
  status: OutgoingStatus;
  /** The subject. */
  subject: Scalars['String']['output'];
  /** The plain-text body. */
  textBody: Scalars['String']['output'];
  /** To addresses. */
  to: Array<Address>;
};

/** A message sent through a mailbox's SMTP server: what was asked, and what happened. */
export type OutgoingMessageFilter = {
  AND?: InputMaybe<OutgoingMessageFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<OutgoingMessageFilter>;
  OR?: InputMaybe<OutgoingMessageFilter>;
  account?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<OutgoingStatus>;
};

/** Where a sent message is. SENDING: Being handed to the SMTP server; SENT: Accepted by the SMTP server; FAILED: Refused or not delivered to the SMTP server. */
export enum OutgoingStatus {
  Failed = 'FAILED',
  Sending = 'SENDING',
  Sent = 'SENT'
}

/** How incoming mail is read. IMAP: IMAP: folders, flags and moves live on the server; POP3: POP3: one inbox, downloaded; flags are local. */
export enum Protocol {
  Imap = 'IMAP',
  Pop3 = 'POP3'
}

/** Who hosts a mailbox (decides OAuth, presets and Sent-copy behaviour). GENERIC: Any IMAP/POP3 server; GMAIL: Gmail / Google Workspace; MICROSOFT: Outlook.com / Microsoft 365. */
export enum Provider {
  Generic = 'GENERIC',
  Gmail = 'GMAIL',
  Microsoft = 'MICROSOFT'
}

/** What pushing a mailbox's changes did. */
export type PushResult = {
  __typename?: 'PushResult';
  account: MailAccount;
  /** Changes that did not reach the server. */
  failed: Scalars['Int']['output'];
  /** Changes still waiting (in their undo window, backing off, or a sync held the mailbox). */
  pending: Scalars['Int']['output'];
  /** Changes that reached the server. */
  pushed: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Where a login is. No side effect. */
  authSession: AuthSession;
  /** Categories of the visible mailboxes (filter by `account`). */
  categories: Array<Category>;
  /** A category by id. */
  category: Category;
  /** A mailbox by id. */
  mailAccount: MailAccount;
  /** The mailboxes the caller sees: their own, shared with them, and the organization's. */
  mailAccounts: Array<MailAccount>;
  /** Changes made here that have not reached the server yet (pending or failed), oldest first. */
  mailChanges: Array<MailChange>;
  /** A folder by id. */
  mailFolder: MailFolder;
  /** Folders of the visible mailboxes (filter by `account`). */
  mailFolders: Array<MailFolder>;
  /** Server settings of well-known providers (the one for `address`, when given). */
  mailPresets: Array<MailPreset>;
  /** A message by id. */
  message: Message;
  /** Messages of the visible mailboxes (paginated, filterable — `search` also matches by meaning — and orderable). */
  messages: Array<Message>;
  /** How many messages match the filters. */
  messagesCount: Scalars['Int']['output'];
  /** Providers this deployment can link through OAuth. */
  oauthProviders: Array<Provider>;
  /** Mail sent through the visible mailboxes, newest first. */
  outbox: Array<OutgoingMessage>;
  /** A sent message by id. */
  outgoingMessage: OutgoingMessage;
  /** A task by id. */
  task: Task;
  /** A task list by id. */
  taskList: TaskList;
  /** The caller's task lists. */
  taskLists: Array<TaskList>;
  /** The caller's tasks (paginated, filterable — `active` is the Inbox view — and orderable). */
  tasks: Array<Task>;
  /** How many of the caller's tasks match the filters. */
  tasksCount: Scalars['Int']['output'];
  /** A conversation by id. */
  thread: Thread;
  /** Conversations of the visible mailboxes (paginated, filterable, orderable). */
  threads: Array<Thread>;
  /** How many conversations match the filters (for a list header). */
  threadsCount: Scalars['Int']['output'];
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryAuthSessionArgs = {
  state: Scalars['String']['input'];
};


export type QueryCategoriesArgs = {
  filters?: InputMaybe<CategoryFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMailAccountArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMailAccountsArgs = {
  filters?: InputMaybe<MailAccountFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMailChangesArgs = {
  filters?: InputMaybe<MailChangeFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMailFolderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMailFoldersArgs = {
  filters?: InputMaybe<MailFolderFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMailPresetsArgs = {
  address?: InputMaybe<Scalars['String']['input']>;
};


export type QueryMessageArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMessagesArgs = {
  filters?: InputMaybe<MessageFilter>;
  ordering?: Array<MessageOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMessagesCountArgs = {
  filters?: InputMaybe<MessageFilter>;
};


export type QueryOutboxArgs = {
  filters?: InputMaybe<OutgoingMessageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryOutgoingMessageArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTaskArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTaskListArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTaskListsArgs = {
  filters?: InputMaybe<TaskListFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTasksArgs = {
  filters?: InputMaybe<TaskFilter>;
  ordering?: Array<TaskOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTasksCountArgs = {
  filters?: InputMaybe<TaskFilter>;
};


export type QueryThreadArgs = {
  id: Scalars['ID']['input'];
};


export type QueryThreadsArgs = {
  filters?: InputMaybe<ThreadFilter>;
  ordering?: Array<ThreadOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryThreadsCountArgs = {
  filters?: InputMaybe<ThreadFilter>;
};

/** A recipient. */
export type RecipientInput = {
  address: Scalars['String']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

/** A recipient the SMTP server refused. */
export type RefusedRecipient = {
  __typename?: 'RefusedRecipient';
  address: Scalars['String']['output'];
  code: Scalars['Int']['output'];
  message: Scalars['String']['output'];
};

export type RequestBigFileUploadInput = {
  contentType?: InputMaybe<Scalars['String']['input']>;
  fileSize?: InputMaybe<Scalars['ByteCount']['input']>;
  host?: InputMaybe<Scalars['String']['input']>;
  originalFileName: Scalars['String']['input'];
  port?: InputMaybe<Scalars['Int']['input']>;
};

/** Transport security of a connection. TLS: Implicit TLS (IMAPS 993, POP3S 995, SMTPS 465); STARTTLS: Plain connection upgraded with STARTTLS (IMAP 143, POP3 110, SMTP 587); NONE: No encryption (only when the deployment allows it). */
export enum Security {
  None = 'NONE',
  Starttls = 'STARTTLS',
  Tls = 'TLS'
}

/** A message to send from a mailbox. A reply (`inReplyTo`) gets In-Reply-To/References and, without a subject, 'Re: ' + the original's. */
export type SendMessageInput = {
  account: Scalars['ID']['input'];
  /** Stores uploaded with `requestBigfileUpload` / `finishBigfileUpload` (by the caller). */
  attachments?: Array<Scalars['String']['input']>;
  bcc?: Array<RecipientInput>;
  cc?: Array<RecipientInput>;
  /** An HTML alternative, sent as given. */
  html?: InputMaybe<Scalars['String']['input']>;
  /** The message this answers (from any visible folder of the same mailbox). */
  inReplyTo?: InputMaybe<Scalars['ID']['input']>;
  subject?: Scalars['String']['input'];
  /** The plain-text body. */
  text?: Scalars['String']['input'];
  to?: Array<RecipientInput>;
};

/** Where a server is reached. */
export type ServerInput = {
  host: Scalars['String']['input'];
  port: Scalars['Int']['input'];
  security?: Security;
};

/** Where a server is reached. */
export type ServerSettings = {
  __typename?: 'ServerSettings';
  host: Scalars['String']['output'];
  port: Scalars['Int']['output'];
  security: Security;
};

/** Flags to add to and remove from messages (\Seen, \Flagged, \Answered, \Draft, or keywords like $Label1). */
export type SetMessageFlagsInput = {
  add?: Array<Scalars['String']['input']>;
  messages: Array<Scalars['ID']['input']>;
  remove?: Array<Scalars['String']['input']>;
};

/** Set the status of tasks (DONE records when; OPEN clears it). */
export type SetTaskStatusInput = {
  status: TaskStatus;
  tasks: Array<Scalars['ID']['input']>;
};

/** Who sees a mailbox. */
export type ShareMailAccountInput = {
  id: Scalars['ID']['input'];
  /** The members a SHARED mailbox is shared with (replaces the list). Must be members of the organization. */
  users?: InputMaybe<Array<Scalars['ID']['input']>>;
  visibility: Visibility;
};

/** Hide tasks from the active view until a time; null wakes them now. */
export type SnoozeTasksInput = {
  tasks: Array<Scalars['ID']['input']>;
  until?: InputMaybe<Scalars['DateTime']['input']>;
};

/** Start linking a mailbox through OAuth, or re-link one (`account`) whose grant ran out. */
export type StartOAuthLinkInput = {
  /** Re-link this mailbox (owner only). */
  account?: InputMaybe<Scalars['ID']['input']>;
  /** The address to pre-fill at the provider. */
  loginHint?: InputMaybe<Scalars['String']['input']>;
  /** A display name for the new mailbox. */
  name?: InputMaybe<Scalars['String']['input']>;
  protocol?: Protocol;
  provider: Provider;
  /** One of the deployment's registered redirect URLs; the first by default. */
  redirectUrl?: InputMaybe<Scalars['String']['input']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Events whenever a visible mailbox finished syncing. */
  mailboxSyncs: MailboxSyncEvent;
};

/** What one mailbox sync did. */
export type SyncResult = {
  __typename?: 'SyncResult';
  account: MailAccount;
  /** New messages. */
  created: Scalars['Int']['output'];
  /** Messages gone from the server. */
  deleted: Scalars['Int']['output'];
  /** Folders synced. */
  folders: Scalars['Int']['output'];
  /** More mail is waiting (the backfill or a burst of new mail continues on the next sync). */
  more: Scalars['Boolean']['output'];
  /** Messages whose flags changed. */
  updated: Scalars['Int']['output'];
};

/** How a message here relates to the server. SYNCED: As the server has it; PENDING: Changed here, the change is on its way to the server; LOCAL: Changed here only (the mailbox does not push it, or it was deleted here only); FAILED: A change did not reach the server (see `changes`). */
export enum SyncState {
  Failed = 'FAILED',
  Local = 'LOCAL',
  Pending = 'PENDING',
  Synced = 'SYNCED'
}

/** Something to do, made of mail conversations from any mailbox its owner can see. Only its owner sees it. Its status is independent of the mail: finishing a task changes no message. */
export type Task = {
  __typename?: 'Task';
  /** The client id of the app that created the task, if one did. */
  appClientId?: Maybe<Scalars['String']['output']>;
  /** When it was marked DONE. */
  completedAt?: Maybe<Scalars['DateTime']['output']>;
  /** When the task was created. */
  createdAt: Scalars['DateTime']['output'];
  /** When it is due. */
  dueAt?: Maybe<Scalars['DateTime']['output']>;
  /** An app's own key for the task: `upsertTask` finds the task by it, so sorting again updates instead of duplicating. */
  externalKey?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The newest message over the task's conversations. */
  latestMessage?: Maybe<Message>;
  /** The task's conversations with who put them there; only those in mailboxes the caller can still see. */
  links: Array<TaskThread>;
  /** The list it is on, if any. */
  list?: Maybe<TaskList>;
  /** Free notes. */
  notes: Scalars['String']['output'];
  /** Pinned to the top. */
  pinned: Scalars['Boolean']['output'];
  /** Where the task sorts in its list. */
  position: Scalars['Float']['output'];
  /** Whether the task is snoozed right now. */
  snoozed: Scalars['Boolean']['output'];
  /** Hidden from the active view until then. */
  snoozedUntil?: Maybe<Scalars['DateTime']['output']>;
  /** Where the task is. */
  status: TaskStatus;
  /** How many conversations the task has (visible ones). */
  threadCount: Scalars['Int']['output'];
  /** The task's conversations, newest first; only those in mailboxes the caller can still see. */
  threads: Array<Thread>;
  /** What to do. */
  title: Scalars['String']['output'];
  /** Unread messages over the task's conversations. */
  unreadCount: Scalars['Int']['output'];
  /** When the task last changed. */
  updatedAt: Scalars['DateTime']['output'];
};

/** Something to do, made of mail threads (from any mailbox its owner can see). Personal: only its owner sees it. */
export type TaskFilter = {
  AND?: InputMaybe<TaskFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<TaskFilter>;
  OR?: InputMaybe<TaskFilter>;
  active?: InputMaybe<Scalars['Boolean']['input']>;
  dueBefore?: InputMaybe<Scalars['DateTime']['input']>;
  externalKey?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  list?: InputMaybe<Scalars['ID']['input']>;
  noList?: InputMaybe<Scalars['Boolean']['input']>;
  pinned?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  snoozed?: InputMaybe<Scalars['Boolean']['input']>;
  status?: InputMaybe<TaskStatus>;
  thread?: InputMaybe<Scalars['ID']['input']>;
};

/** Who put a thread into a task. USER: A person, by hand; APP: An app that sorts mail. */
export enum TaskLinkSource {
  App = 'APP',
  User = 'USER'
}

/** A member's list of tasks (an Inbox bundle or project). Only its owner sees it. */
export type TaskList = {
  __typename?: 'TaskList';
  /** A display color (e.g. #4f86f7). */
  color: Scalars['String']['output'];
  /** When the list was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** The list's name. */
  name: Scalars['String']['output'];
  /** How many tasks on the list are OPEN. */
  openCount: Scalars['Int']['output'];
  /** Where the list sorts among the owner's lists. */
  position: Scalars['Float']['output'];
  /** The tasks on the list. */
  tasks: Array<Task>;
};


/** A member's list of tasks (an Inbox bundle or project). Only its owner sees it. */
export type TaskListTasksArgs = {
  filters?: InputMaybe<TaskFilter>;
  ordering?: Array<TaskOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A member's list of tasks (an Inbox "bundle" or project). Personal: only its owner sees it. */
export type TaskListFilter = {
  AND?: InputMaybe<TaskListFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<TaskListFilter>;
  OR?: InputMaybe<TaskListFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type TaskOrder =
  { createdAt: Ordering; dueAt?: never; position?: never; title?: never; updatedAt?: never; }
  |  { createdAt?: never; dueAt: Ordering; position?: never; title?: never; updatedAt?: never; }
  |  { createdAt?: never; dueAt?: never; position: Ordering; title?: never; updatedAt?: never; }
  |  { createdAt?: never; dueAt?: never; position?: never; title: Ordering; updatedAt?: never; }
  |  { createdAt?: never; dueAt?: never; position?: never; title?: never; updatedAt: Ordering; };

/** Where a task is. OPEN: To do; DONE: Done; DISMISSED: Dropped without doing it. */
export enum TaskStatus {
  Dismissed = 'DISMISSED',
  Done = 'DONE',
  Open = 'OPEN'
}

/** A conversation in a task: who put it there, and (for an app) how sure it was and why. */
export type TaskThread = {
  __typename?: 'TaskThread';
  /** The client id of the app the link was made from, if any. */
  appClientId?: Maybe<Scalars['String']['output']>;
  /** An app's confidence (0–1) that the thread belongs here. */
  confidence?: Maybe<Scalars['Float']['output']>;
  /** When the thread was put into the task. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Where the thread sorts within the task. */
  position: Scalars['Float']['output'];
  /** Why the thread belongs here, in words. */
  reason: Scalars['String']['output'];
  /** Who put the thread into the task. */
  source: TaskLinkSource;
  /** The task. */
  task: Task;
  /** The conversation. */
  thread: Thread;
};

/** A conversation: messages linked by In-Reply-To/References, across the mailbox's folders. */
export type Thread = {
  __typename?: 'Thread';
  /** The mailbox the conversation is in. */
  account: MailAccount;
  /** This object's descriptors, a flat mapping of key to value: the facts about it that an action's port can `require` and a trigger can test (e.g. `@kuvert/message_count`). The keys are the ones kuvert declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** Whether any message of the conversation is flagged. */
  flagged: Scalars['Boolean']['output'];
  /** Whether any message of the conversation has attachments. */
  hasAttachments: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** The date of the newest message. */
  lastMessageAt?: Maybe<Scalars['DateTime']['output']>;
  /** The newest message, optionally only within a folder or a folder role: what a list row shows. Null when the conversation has no message there. */
  latestMessage?: Maybe<Message>;
  /** How many messages are in the conversation. */
  messageCount: Scalars['Int']['output'];
  /** The conversation's messages, oldest first. */
  messages: Array<Message>;
  /** Distinct senders, oldest first ("Anna, Ben & 2 more"). */
  participants: Array<Address>;
  /** The subject without Re:/Fwd: prefixes. */
  subject: Scalars['String']['output'];
  /** The caller's tasks this conversation is in. */
  tasks: Array<Task>;
  /** Whether a message of the conversation is unread. */
  unread: Scalars['Boolean']['output'];
  /** Unread messages, optionally only within a folder or a folder role. */
  unreadCount: Scalars['Int']['output'];
};


/** A conversation: messages linked by In-Reply-To/References, across the mailbox's folders. */
export type ThreadLatestMessageArgs = {
  folder?: InputMaybe<Scalars['ID']['input']>;
  folderRole?: InputMaybe<FolderRole>;
};


/** A conversation: messages linked by In-Reply-To/References, across the mailbox's folders. */
export type ThreadUnreadCountArgs = {
  folder?: InputMaybe<Scalars['ID']['input']>;
  folderRole?: InputMaybe<FolderRole>;
};

/** A conversation: messages linked by In-Reply-To/References, across the mailbox's folders. */
export type ThreadFilter = {
  AND?: InputMaybe<ThreadFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ThreadFilter>;
  OR?: InputMaybe<ThreadFilter>;
  account?: InputMaybe<Scalars['ID']['input']>;
  category?: InputMaybe<Scalars['ID']['input']>;
  flagged?: InputMaybe<Scalars['Boolean']['input']>;
  folder?: InputMaybe<Scalars['ID']['input']>;
  folderRole?: InputMaybe<FolderRole>;
  hasAttachments?: InputMaybe<Scalars['Boolean']['input']>;
  hasTask?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only conversations with a message matching the text: the same substring and meaning search as `messages(filters: {search})`. */
  search?: InputMaybe<Scalars['String']['input']>;
  task?: InputMaybe<Scalars['ID']['input']>;
  unread?: InputMaybe<Scalars['Boolean']['input']>;
};

/** How a conversation is put into a task. */
export type ThreadLinkInput = {
  /** An app's confidence, 0–1. */
  confidence?: InputMaybe<Scalars['Float']['input']>;
  /** Why the conversation belongs here. */
  reason?: Scalars['String']['input'];
  /** APP when an app sorted it; USER when a person did. */
  source?: TaskLinkSource;
};

export type ThreadOrder =
  { lastMessageAt: Ordering; messageCount?: never; }
  |  { lastMessageAt?: never; messageCount: Ordering; };

/** Take back changes that have not reached the server: by change, or every one of some messages. */
export type UndoMailChangesInput = {
  changes?: InputMaybe<Array<Scalars['ID']['input']>>;
  messages?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Take conversations out of a task. */
export type UnlinkThreadsInput = {
  task: Scalars['ID']['input'];
  threads: Array<Scalars['ID']['input']>;
};

/** Changes to a category. */
export type UpdateCategoryInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  /** A new keyword; a KEYWORD category's messages are re-keyed on the server. */
  keyword?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** KEYWORD → LOCAL: also take the keyword off the messages on the server. */
  removeKeywords?: Scalars['Boolean']['input'];
  /** Move the category between LOCAL and KEYWORD; its messages stay in it. */
  sync?: InputMaybe<CategorySync>;
};

/** Changes to a mailbox; omitted fields stay as they are. Changing servers or credentials tests the login first. */
export type UpdateMailAccountInput = {
  displayName?: InputMaybe<Scalars['String']['input']>;
  /** False pauses the mailbox (DISABLED); true makes it ACTIVE again (after a successful login). */
  enabled?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  incoming?: InputMaybe<ServerInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
  popLeaveOnServer?: InputMaybe<Scalars['Boolean']['input']>;
  /** Push deletes. Off only hides deleted mail here. */
  pushDeletes?: InputMaybe<Scalars['Boolean']['input']>;
  /** Push flagging to the server. Off keeps it here. */
  pushFlagged?: InputMaybe<Scalars['Boolean']['input']>;
  /** Push keywords (KEYWORD categories) to the server. Off keeps them here. */
  pushKeywords?: InputMaybe<Scalars['Boolean']['input']>;
  /** Push moves and archiving. Off refuses moves (a folder only exists on the server). */
  pushMoves?: InputMaybe<Scalars['Boolean']['input']>;
  /** Push read/unread to the server. Off keeps it here; turning it on pushes what was kept. */
  pushSeen?: InputMaybe<Scalars['Boolean']['input']>;
  saveSentCopy?: InputMaybe<Scalars['Boolean']['input']>;
  smtp?: InputMaybe<ServerInput>;
  smtpPassword?: InputMaybe<Scalars['String']['input']>;
  smtpUsername?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
};

/** Changes to a folder. */
export type UpdateMailFolderInput = {
  id: Scalars['ID']['input'];
  /** Whether syncs read the folder. Turning it off keeps what is stored. */
  syncEnabled: Scalars['Boolean']['input'];
};

/** Changes to a task; omitted fields stay as they are. */
export type UpdateTaskInput = {
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  id: Scalars['ID']['input'];
  /** Another list; null takes it off its list. */
  list?: InputMaybe<Scalars['ID']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  pinned?: InputMaybe<Scalars['Boolean']['input']>;
  position?: InputMaybe<Scalars['Float']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
};

/** Changes to a task list; omitted fields stay as they are. */
export type UpdateTaskListInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Float']['input']>;
};

/** Create or update the caller's task with this `externalKey` (an app's idempotent sort call). Omitted fields keep their value on update; `threads` are added (never removed). */
export type UpsertTaskInput = {
  dueAt?: InputMaybe<Scalars['DateTime']['input']>;
  externalKey: Scalars['String']['input'];
  link?: InputMaybe<ThreadLinkInput>;
  list?: InputMaybe<Scalars['ID']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  pinned?: InputMaybe<Scalars['Boolean']['input']>;
  threads?: Array<Scalars['ID']['input']>;
  title: Scalars['String']['input'];
};

/** A user account; sub is the stable subject identifier from the identity provider. */
export type User = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
  preferredUsername: Scalars['String']['output'];
  sub: Scalars['String']['output'];
};

/** Who in the organization sees a mailbox and its mail. PRIVATE: Only the member who linked it; SHARED: The member who linked it and the members it is shared with; ORGANIZATION: Every member of the organization (a team mailbox). */
export enum Visibility {
  Organization = 'ORGANIZATION',
  Private = 'PRIVATE',
  Shared = 'SHARED'
}

export type _Entity = Attachment | BigFileStore | Category | MailAccount | MailChange | MailFolder | Message | Organization | OutgoingMessage | Task | TaskList | TaskThread | Thread | User;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type ListMailAccountFragment = { __typename?: 'MailAccount', id: string, name: string, emailAddress: string, displayName: string, provider: Provider, status: MailAccountStatus, protocol: Protocol, visibility: Visibility, authMethod: AuthMethod, lastSyncedAt?: string | null, lastError?: string | null, lastErrorCode?: MailErrorCode | null, syncing: boolean, canSend: boolean, isOwner: boolean, unreadCount: number, pendingChanges: number, failedChanges: number };

export type MailAccountFragment = (
  { __typename?: 'MailAccount', incomingHost: string, incomingPort: number, incomingSecurity: Security, smtpHost?: string | null, smtpPort?: number | null, smtpSecurity: Security, username: string, saveSentCopy: boolean, popLeaveOnServer: boolean, pushSeen: boolean, pushFlagged: boolean, pushMoves: boolean, pushDeletes: boolean, pushKeywords: boolean, capabilities: Array<string>, backfillDone: boolean, serverSideFolders: boolean, createdAt: string, creator?: { __typename?: 'User', id: string, sub: string, preferredUsername: string } | null, sharedWith: Array<{ __typename?: 'User', id: string, sub: string, preferredUsername: string }>, folders: Array<(
    { __typename?: 'MailFolder' }
    & MailFolderFragment
  )>, categories: Array<(
    { __typename?: 'Category' }
    & CategoryFragment
  )> }
  & ListMailAccountFragment
);

export type SenderAccountFragment = { __typename?: 'MailAccount', id: string, name: string, emailAddress: string, displayName: string, canSend: boolean, status: MailAccountStatus };

export type AttachmentFragment = { __typename?: 'Attachment', id: string, position: number, filename: string, contentType: string, size: number, contentId?: string | null, inline: boolean, store?: { __typename?: 'BigFileStore', id: string } | null };

export type AuthSessionFragment = { __typename?: 'AuthSession', state: string, status: AuthStatus, finish: AuthFinish, openUrl: string, expiresAt: string, redirectUrl?: string | null, interval?: number | null, userCode?: string | null, step?: string | null, errorCode?: string | null, errorMessage?: string | null, result?: { __typename?: 'AuthResult', identifier: string, id: string, label?: string | null } | null };

export type CategoryChipFragment = { __typename?: 'Category', id: string, name: string, color: string, sync: CategorySync };

export type CategoryFragment = (
  { __typename?: 'Category', keyword: string, messageCount: number, createdAt: string, account: { __typename?: 'MailAccount', id: string, name: string, emailAddress: string } }
  & CategoryChipFragment
);

export type MailChangeFragment = { __typename?: 'MailChange', id: string, kind: MailChangeKind, state: MailChangeState, add: Array<string>, remove: Array<string>, attempts: number, error?: string | null, errorCode?: MailErrorCode | null, createdAt: string, pushAfter: string, undoable: boolean, createdBy?: { __typename?: 'User', id: string, sub: string } | null, account: { __typename?: 'MailAccount', id: string, name: string, emailAddress: string }, message?: { __typename?: 'Message', id: string, subject: string, senderName: string, senderAddress: string, thread?: { __typename?: 'Thread', id: string } | null } | null, originFolder?: { __typename?: 'MailFolder', id: string, name: string, role: FolderRole } | null, targetFolder?: { __typename?: 'MailFolder', id: string, name: string, role: FolderRole } | null };

export type BigFileAccessGrantFragment = { __typename?: 'BigFileAccessGrant', accessKey: string, secretKey: string, sessionToken: string, region: string, expiresIn: number, path: string, key: string, bucket: string };

export type BigFileUploadGrantFragment = { __typename?: 'BigFileUploadGrant', accessKey: string, secretKey: string, sessionToken: string, region: string, path: string, key: string, bucket: string, expiresIn: number, maxBytes: number, store: string };

export type MailFolderFragment = { __typename?: 'MailFolder', id: string, path: string, name: string, role: FolderRole, selectable: boolean, syncEnabled: boolean, existsOnServer: boolean, totalCount: number, unreadCount: number, serverUnreadCount: number, keywordsAllowed: boolean, backfillDone: boolean, lastSyncedAt?: string | null };

export type DetailMailFolderFragment = (
  { __typename?: 'MailFolder', delimiter?: string | null, account: (
    { __typename?: 'MailAccount' }
    & ListMailAccountFragment
  ) }
  & MailFolderFragment
);

export type AddressFragment = { __typename?: 'Address', name: string, address: string };

export type ListMessageFragment = { __typename?: 'Message', id: string, subject: string, senderName: string, senderAddress: string, date?: string | null, snippet: string, isRead: boolean, isFlagged: boolean, isAnswered: boolean, hasAttachments: boolean, syncState: SyncState, categories: Array<(
    { __typename?: 'Category' }
    & CategoryChipFragment
  )>, account: { __typename?: 'MailAccount', id: string, name: string, emailAddress: string, canSend: boolean }, folder: { __typename?: 'MailFolder', id: string, name: string, role: FolderRole }, thread?: { __typename?: 'Thread', id: string, messageCount: number } | null };

export type MessageFragment = (
  { __typename?: 'Message', messageId?: string | null, receivedAt?: string | null, textBody: string, hasRemoteImages: boolean, size: number, flags: Array<string>, serverFlags: Array<string>, truncated: boolean, html?: string | null, changes: Array<(
    { __typename?: 'MailChange' }
    & MailChangeFragment
  )>, sender: (
    { __typename?: 'Address' }
    & AddressFragment
  ), replyTo: Array<(
    { __typename?: 'Address' }
    & AddressFragment
  )>, to: Array<(
    { __typename?: 'Address' }
    & AddressFragment
  )>, cc: Array<(
    { __typename?: 'Address' }
    & AddressFragment
  )>, bcc: Array<(
    { __typename?: 'Address' }
    & AddressFragment
  )>, attachments: Array<(
    { __typename?: 'Attachment' }
    & AttachmentFragment
  )> }
  & ListMessageFragment
);

export type RecipientsFragment = { __typename?: 'OutgoingMessage', to: Array<(
    { __typename?: 'Address' }
    & AddressFragment
  )>, cc: Array<(
    { __typename?: 'Address' }
    & AddressFragment
  )>, bcc: Array<(
    { __typename?: 'Address' }
    & AddressFragment
  )> };

export type ListOutgoingMessageFragment = { __typename?: 'OutgoingMessage', id: string, subject: string, status: OutgoingStatus, error?: string | null, errorCode?: MailErrorCode | null, createdAt: string, sentAt?: string | null, account: { __typename?: 'MailAccount', id: string, name: string, emailAddress: string }, to: Array<(
    { __typename?: 'Address' }
    & AddressFragment
  )> };

export type OutgoingMessageFragment = (
  { __typename?: 'OutgoingMessage', textBody: string, htmlBody: string, messageId: string, savedToSent: boolean, creator?: { __typename?: 'User', id: string, sub: string } | null, inReplyTo?: { __typename?: 'Message', id: string, subject: string, thread?: { __typename?: 'Thread', id: string } | null } | null, attachments: Array<{ __typename?: 'BigFileStore', id: string, originalFileName?: string | null, contentType?: string | null, sizeBytes?: number | null }>, refused: Array<{ __typename?: 'RefusedRecipient', address: string, code: number, message: string }> }
  & ListOutgoingMessageFragment
  & RecipientsFragment
);

export type ServerSettingsFragment = { __typename?: 'ServerSettings', host: string, port: number, security: Security };

export type MailPresetFragment = { __typename?: 'MailPreset', key: string, name: string, domains: Array<string>, provider: Provider, saveSentCopy: boolean, oauth: boolean, oauthConfigured: boolean, note: string, imap?: (
    { __typename?: 'ServerSettings' }
    & ServerSettingsFragment
  ) | null, pop3?: (
    { __typename?: 'ServerSettings' }
    & ServerSettingsFragment
  ) | null, smtp?: (
    { __typename?: 'ServerSettings' }
    & ServerSettingsFragment
  ) | null };

export type ListTaskListFragment = { __typename?: 'TaskList', id: string, name: string, color: string, position: number, openCount: number, createdAt: string };

export type TaskChipFragment = { __typename?: 'Task', id: string, title: string, status: TaskStatus, list?: { __typename?: 'TaskList', id: string, name: string, color: string } | null };

export type ListTaskFragment = { __typename?: 'Task', id: string, title: string, notes: string, status: TaskStatus, pinned: boolean, dueAt?: string | null, snoozed: boolean, snoozedUntil?: string | null, completedAt?: string | null, position: number, threadCount: number, unreadCount: number, createdAt: string, updatedAt: string, externalKey?: string | null, appClientId?: string | null, list?: (
    { __typename?: 'TaskList' }
    & ListTaskListFragment
  ) | null, latestMessage?: (
    { __typename?: 'Message' }
    & ListMessageFragment
  ) | null };

export type TaskThreadFragment = { __typename?: 'TaskThread', id: string, source: TaskLinkSource, reason: string, confidence?: number | null, position: number, createdAt: string, appClientId?: string | null, thread: (
    { __typename?: 'Thread' }
    & ListThreadFragment
  ) };

export type TaskFragment = (
  { __typename?: 'Task', links: Array<(
    { __typename?: 'TaskThread' }
    & TaskThreadFragment
  )> }
  & ListTaskFragment
);

export type ListThreadFragment = { __typename?: 'Thread', id: string, subject: string, lastMessageAt?: string | null, messageCount: number, unread: boolean, flagged: boolean, hasAttachments: boolean, unreadCount: number, participants: Array<(
    { __typename?: 'Address' }
    & AddressFragment
  )>, account: { __typename?: 'MailAccount', id: string, name: string, emailAddress: string }, latestMessage?: (
    { __typename?: 'Message' }
    & ListMessageFragment
  ) | null };

export type ThreadFragment = { __typename?: 'Thread', id: string, subject: string, lastMessageAt?: string | null, messageCount: number, unread: boolean, tasks: Array<(
    { __typename?: 'Task' }
    & TaskChipFragment
  )>, account: (
    { __typename?: 'MailAccount' }
    & SenderAccountFragment
  ), messages: Array<(
    { __typename?: 'Message' }
    & MessageFragment
  )> };

export type CreateMailAccountMutationVariables = Exact<{
  input: CreateMailAccountInput;
}>;


export type CreateMailAccountMutation = { __typename?: 'Mutation', createMailAccount: (
    { __typename?: 'MailAccount' }
    & MailAccountFragment
  ) };

export type UpdateMailAccountMutationVariables = Exact<{
  input: UpdateMailAccountInput;
}>;


export type UpdateMailAccountMutation = { __typename?: 'Mutation', updateMailAccount: (
    { __typename?: 'MailAccount' }
    & MailAccountFragment
  ) };

export type TestMailAccountMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type TestMailAccountMutation = { __typename?: 'Mutation', testMailAccount: (
    { __typename?: 'MailAccount' }
    & ListMailAccountFragment
  ) };

export type DeleteMailAccountMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteMailAccountMutation = { __typename?: 'Mutation', deleteMailAccount: string };

export type ShareMailAccountMutationVariables = Exact<{
  input: ShareMailAccountInput;
}>;


export type ShareMailAccountMutation = { __typename?: 'Mutation', shareMailAccount: (
    { __typename?: 'MailAccount' }
    & MailAccountFragment
  ) };

export type UpdateMailFolderMutationVariables = Exact<{
  input: UpdateMailFolderInput;
}>;


export type UpdateMailFolderMutation = { __typename?: 'Mutation', updateMailFolder: (
    { __typename?: 'MailFolder' }
    & MailFolderFragment
  ) };

export type SyncMailAccountMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  folders?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SyncMailAccountMutation = { __typename?: 'Mutation', syncMailAccount: { __typename?: 'SyncResult', created: number, updated: number, deleted: number, folders: number, more: boolean, account: (
      { __typename?: 'MailAccount' }
      & ListMailAccountFragment
    ) } };

export type CreateCategoryMutationVariables = Exact<{
  input: CreateCategoryInput;
}>;


export type CreateCategoryMutation = { __typename?: 'Mutation', createCategory: (
    { __typename?: 'Category' }
    & CategoryFragment
  ) };

export type UpdateCategoryMutationVariables = Exact<{
  input: UpdateCategoryInput;
}>;


export type UpdateCategoryMutation = { __typename?: 'Mutation', updateCategory: (
    { __typename?: 'Category' }
    & CategoryFragment
  ) };

export type DeleteCategoryMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  removeKeywords?: Scalars['Boolean']['input'];
}>;


export type DeleteCategoryMutation = { __typename?: 'Mutation', deleteCategory: string };

export type CategorizeMessagesMutationVariables = Exact<{
  input: CategorizeMessagesInput;
}>;


export type CategorizeMessagesMutation = { __typename?: 'Mutation', categorizeMessages: Array<(
    { __typename?: 'Message' }
    & MessageStateFragment
  )> };

export type PushMailChangesMutationVariables = Exact<{
  account: Scalars['ID']['input'];
}>;


export type PushMailChangesMutation = { __typename?: 'Mutation', pushMailChanges: { __typename?: 'PushResult', pushed: number, failed: number, pending: number, account: (
      { __typename?: 'MailAccount' }
      & ListMailAccountFragment
    ) } };

export type RetryMailChangesMutationVariables = Exact<{
  changes: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type RetryMailChangesMutation = { __typename?: 'Mutation', retryMailChanges: Array<(
    { __typename?: 'MailChange' }
    & MailChangeFragment
  )> };

export type UndoMailChangesMutationVariables = Exact<{
  input: UndoMailChangesInput;
}>;


export type UndoMailChangesMutation = { __typename?: 'Mutation', undoMailChanges: Array<(
    { __typename?: 'Message' }
    & MessageStateFragment
  )> };

export type RevertMessagesToServerMutationVariables = Exact<{
  messages: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
}>;


export type RevertMessagesToServerMutation = { __typename?: 'Mutation', revertMessagesToServer: Array<(
    { __typename?: 'Message' }
    & MessageStateFragment
  )> };

export type RequestBigfileUploadMutationVariables = Exact<{
  input: RequestBigFileUploadInput;
}>;


export type RequestBigfileUploadMutation = { __typename?: 'Mutation', requestBigfileUpload: (
    { __typename?: 'BigFileUploadGrant' }
    & BigFileUploadGrantFragment
  ) };

export type FinishBigfileUploadMutationVariables = Exact<{
  input: FinishBigFileUploadInput;
}>;


export type FinishBigfileUploadMutation = { __typename?: 'Mutation', finishBigfileUpload: { __typename?: 'BigFileStore', id: string, originalFileName?: string | null, sizeBytes?: number | null } };

export type MessageStateFragment = { __typename?: 'Message', id: string, flags: Array<string>, isRead: boolean, isFlagged: boolean, isAnswered: boolean, syncState: SyncState, categories: Array<(
    { __typename?: 'Category' }
    & CategoryChipFragment
  )>, changes: Array<(
    { __typename?: 'MailChange' }
    & MailChangeFragment
  )>, folder: { __typename?: 'MailFolder', id: string, name: string, role: FolderRole } };

export type SetMessageFlagsMutationVariables = Exact<{
  input: SetMessageFlagsInput;
}>;


export type SetMessageFlagsMutation = { __typename?: 'Mutation', setMessageFlags: Array<(
    { __typename?: 'Message' }
    & MessageStateFragment
  )> };

export type MarkMessagesReadMutationVariables = Exact<{
  input: MarkMessagesInput;
}>;


export type MarkMessagesReadMutation = { __typename?: 'Mutation', markMessagesRead: Array<(
    { __typename?: 'Message' }
    & MessageStateFragment
  )> };

export type MoveMessagesMutationVariables = Exact<{
  input: MoveMessagesInput;
}>;


export type MoveMessagesMutation = { __typename?: 'Mutation', moveMessages: Array<(
    { __typename?: 'Message' }
    & MessageStateFragment
  )> };

export type DeleteMessagesMutationVariables = Exact<{
  input: DeleteMessagesInput;
}>;


export type DeleteMessagesMutation = { __typename?: 'Mutation', deleteMessages: { __typename?: 'DeleteResult', deleted: number } };

export type SendMessageMutationVariables = Exact<{
  input: SendMessageInput;
}>;


export type SendMessageMutation = { __typename?: 'Mutation', sendMessage: (
    { __typename?: 'OutgoingMessage' }
    & OutgoingMessageFragment
  ) };

export type StartOAuthLinkMutationVariables = Exact<{
  input: StartOAuthLinkInput;
}>;


export type StartOAuthLinkMutation = { __typename?: 'Mutation', startOAuthLink: (
    { __typename?: 'AuthSession' }
    & AuthSessionFragment
  ) };

export type CompleteAuthMutationVariables = Exact<{
  input: CompleteAuthInput;
}>;


export type CompleteAuthMutation = { __typename?: 'Mutation', completeAuth: (
    { __typename?: 'AuthSession' }
    & AuthSessionFragment
  ) };

export type ResumeAuthMutationVariables = Exact<{
  state: Scalars['String']['input'];
}>;


export type ResumeAuthMutation = { __typename?: 'Mutation', resumeAuth: (
    { __typename?: 'AuthSession' }
    & AuthSessionFragment
  ) };

export type CancelAuthMutationVariables = Exact<{
  state: Scalars['String']['input'];
}>;


export type CancelAuthMutation = { __typename?: 'Mutation', cancelAuth: (
    { __typename?: 'AuthSession' }
    & AuthSessionFragment
  ) };

export type CreateTaskMutationVariables = Exact<{
  input: CreateTaskInput;
}>;


export type CreateTaskMutation = { __typename?: 'Mutation', createTask: (
    { __typename?: 'Task' }
    & ListTaskFragment
  ) };

export type UpdateTaskMutationVariables = Exact<{
  input: UpdateTaskInput;
}>;


export type UpdateTaskMutation = { __typename?: 'Mutation', updateTask: (
    { __typename?: 'Task' }
    & ListTaskFragment
  ) };

export type DeleteTaskMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTaskMutation = { __typename?: 'Mutation', deleteTask: string };

export type SetTaskStatusMutationVariables = Exact<{
  input: SetTaskStatusInput;
}>;


export type SetTaskStatusMutation = { __typename?: 'Mutation', setTaskStatus: Array<(
    { __typename?: 'Task' }
    & ListTaskFragment
  )> };

export type SnoozeTasksMutationVariables = Exact<{
  input: SnoozeTasksInput;
}>;


export type SnoozeTasksMutation = { __typename?: 'Mutation', snoozeTasks: Array<(
    { __typename?: 'Task' }
    & ListTaskFragment
  )> };

export type LinkThreadsMutationVariables = Exact<{
  input: LinkThreadsInput;
}>;


export type LinkThreadsMutation = { __typename?: 'Mutation', linkThreads: Array<{ __typename?: 'TaskThread', id: string, task: { __typename?: 'Task', id: string, threadCount: number, unreadCount: number }, thread: { __typename?: 'Thread', id: string, tasks: Array<(
        { __typename?: 'Task' }
        & TaskChipFragment
      )> } }> };

export type UnlinkThreadsMutationVariables = Exact<{
  input: UnlinkThreadsInput;
}>;


export type UnlinkThreadsMutation = { __typename?: 'Mutation', unlinkThreads: (
    { __typename?: 'Task' }
    & ListTaskFragment
  ) };

export type CreateTaskListMutationVariables = Exact<{
  input: CreateTaskListInput;
}>;


export type CreateTaskListMutation = { __typename?: 'Mutation', createTaskList: (
    { __typename?: 'TaskList' }
    & ListTaskListFragment
  ) };

export type UpdateTaskListMutationVariables = Exact<{
  input: UpdateTaskListInput;
}>;


export type UpdateTaskListMutation = { __typename?: 'Mutation', updateTaskList: (
    { __typename?: 'TaskList' }
    & ListTaskListFragment
  ) };

export type DeleteTaskListMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteTaskListMutation = { __typename?: 'Mutation', deleteTaskList: string };

export type ListMailAccountsQueryVariables = Exact<{
  filters?: InputMaybe<MailAccountFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListMailAccountsQuery = { __typename?: 'Query', mailAccounts: Array<(
    { __typename?: 'MailAccount' }
    & ListMailAccountFragment
  )> };

export type GetMailAccountQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetMailAccountQuery = { __typename?: 'Query', mailAccount: (
    { __typename?: 'MailAccount' }
    & MailAccountFragment
  ) };

export type MailboxTreeQueryVariables = Exact<{ [key: string]: never; }>;


export type MailboxTreeQuery = { __typename?: 'Query', mailAccounts: Array<(
    { __typename?: 'MailAccount', folders: Array<(
      { __typename?: 'MailFolder' }
      & MailFolderFragment
    )> }
    & ListMailAccountFragment
  )> };

export type SenderAccountsQueryVariables = Exact<{ [key: string]: never; }>;


export type SenderAccountsQuery = { __typename?: 'Query', mailAccounts: Array<(
    { __typename?: 'MailAccount' }
    & SenderAccountFragment
  )> };

export type SearchMailAccountsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchMailAccountsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'MailAccount', value: string, label: string }> };

export type MailPresetsQueryVariables = Exact<{
  address?: InputMaybe<Scalars['String']['input']>;
}>;


export type MailPresetsQuery = { __typename?: 'Query', mailPresets: Array<(
    { __typename?: 'MailPreset' }
    & MailPresetFragment
  )> };

export type OAuthProvidersQueryVariables = Exact<{ [key: string]: never; }>;


export type OAuthProvidersQuery = { __typename?: 'Query', oauthProviders: Array<Provider> };

export type AuthSessionQueryVariables = Exact<{
  state: Scalars['String']['input'];
}>;


export type AuthSessionQuery = { __typename?: 'Query', authSession: (
    { __typename?: 'AuthSession' }
    & AuthSessionFragment
  ) };

export type ListCategoriesQueryVariables = Exact<{
  filters?: InputMaybe<CategoryFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListCategoriesQuery = { __typename?: 'Query', categories: Array<(
    { __typename?: 'Category' }
    & CategoryFragment
  )> };

export type GetCategoryQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetCategoryQuery = { __typename?: 'Query', category: (
    { __typename?: 'Category' }
    & CategoryFragment
  ) };

export type ListMailChangesQueryVariables = Exact<{
  filters?: InputMaybe<MailChangeFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListMailChangesQuery = { __typename?: 'Query', mailChanges: Array<(
    { __typename?: 'MailChange' }
    & MailChangeFragment
  )> };

export type MessageAttachmentAccessQueryVariables = Exact<{
  message: Scalars['ID']['input'];
  host?: InputMaybe<Scalars['String']['input']>;
}>;


export type MessageAttachmentAccessQuery = { __typename?: 'Query', message: { __typename?: 'Message', id: string, attachments: Array<{ __typename?: 'Attachment', id: string, contentId?: string | null, filename: string, store?: { __typename?: 'BigFileStore', id: string, accessGrant: (
          { __typename?: 'BigFileAccessGrant' }
          & BigFileAccessGrantFragment
        ) } | null }> } };

export type ListMailFoldersQueryVariables = Exact<{
  filters?: InputMaybe<MailFolderFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListMailFoldersQuery = { __typename?: 'Query', mailFolders: Array<(
    { __typename?: 'MailFolder' }
    & MailFolderFragment
  )> };

export type GetMailFolderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetMailFolderQuery = { __typename?: 'Query', mailFolder: (
    { __typename?: 'MailFolder' }
    & DetailMailFolderFragment
  ) };

export type SearchMailFoldersQueryVariables = Exact<{
  account?: InputMaybe<Scalars['ID']['input']>;
}>;


export type SearchMailFoldersQuery = { __typename?: 'Query', options: Array<{ __typename?: 'MailFolder', value: string, label: string }> };

export type ListMessagesQueryVariables = Exact<{
  filters?: InputMaybe<MessageFilter>;
  ordering?: Array<MessageOrder> | MessageOrder;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListMessagesQuery = { __typename?: 'Query', messages: Array<(
    { __typename?: 'Message' }
    & ListMessageFragment
  )> };

export type GetMessageQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  allowRemote?: Scalars['Boolean']['input'];
}>;


export type GetMessageQuery = { __typename?: 'Query', message: (
    { __typename?: 'Message' }
    & MessageFragment
  ) };

export type ListOutboxQueryVariables = Exact<{
  filters?: InputMaybe<OutgoingMessageFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListOutboxQuery = { __typename?: 'Query', outbox: Array<(
    { __typename?: 'OutgoingMessage' }
    & ListOutgoingMessageFragment
  )> };

export type GetOutgoingMessageQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetOutgoingMessageQuery = { __typename?: 'Query', outgoingMessage: (
    { __typename?: 'OutgoingMessage' }
    & OutgoingMessageFragment
  ) };

export type KuvertPaletteSearchQueryVariables = Exact<{
  search: Scalars['String']['input'];
  limit: Scalars['Int']['input'];
}>;


export type KuvertPaletteSearchQuery = { __typename?: 'Query', messages: Array<{ __typename?: 'Message', id: string, subject: string, senderName: string, senderAddress: string, date?: string | null }> };

export type ListTasksQueryVariables = Exact<{
  filters?: InputMaybe<TaskFilter>;
  ordering?: Array<TaskOrder> | TaskOrder;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListTasksQuery = { __typename?: 'Query', tasks: Array<(
    { __typename?: 'Task' }
    & ListTaskFragment
  )> };

export type TasksCountQueryVariables = Exact<{
  filters?: InputMaybe<TaskFilter>;
}>;


export type TasksCountQuery = { __typename?: 'Query', tasksCount: number };

export type GetTaskQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  inFolder?: InputMaybe<Scalars['ID']['input']>;
  inRole?: InputMaybe<FolderRole>;
}>;


export type GetTaskQuery = { __typename?: 'Query', task: (
    { __typename?: 'Task' }
    & TaskFragment
  ) };

export type ListTaskListsQueryVariables = Exact<{
  filters?: InputMaybe<TaskListFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListTaskListsQuery = { __typename?: 'Query', taskLists: Array<(
    { __typename?: 'TaskList' }
    & ListTaskListFragment
  )> };

export type GetTaskListQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTaskListQuery = { __typename?: 'Query', taskList: (
    { __typename?: 'TaskList' }
    & ListTaskListFragment
  ) };

export type SearchTasksQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchTasksQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Task', value: string, label: string }> };

export type SearchTaskListsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchTaskListsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'TaskList', value: string, label: string }> };

export type ListThreadsQueryVariables = Exact<{
  filters?: InputMaybe<ThreadFilter>;
  ordering?: Array<ThreadOrder> | ThreadOrder;
  pagination?: InputMaybe<OffsetPaginationInput>;
  inFolder?: InputMaybe<Scalars['ID']['input']>;
  inRole?: InputMaybe<FolderRole>;
}>;


export type ListThreadsQuery = { __typename?: 'Query', threads: Array<(
    { __typename?: 'Thread' }
    & ListThreadFragment
  )> };

export type GetThreadQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  allowRemote?: Scalars['Boolean']['input'];
}>;


export type GetThreadQuery = { __typename?: 'Query', thread: (
    { __typename?: 'Thread' }
    & ThreadFragment
  ) };

export type ThreadMessageIdsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ThreadMessageIdsQuery = { __typename?: 'Query', thread: { __typename?: 'Thread', id: string, account: { __typename?: 'MailAccount', id: string }, messages: Array<{ __typename?: 'Message', id: string }> } };

export type ThreadsCountQueryVariables = Exact<{
  filters?: InputMaybe<ThreadFilter>;
}>;


export type ThreadsCountQuery = { __typename?: 'Query', threadsCount: number };

export type MailboxSyncsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type MailboxSyncsSubscription = { __typename?: 'Subscription', mailboxSyncs: { __typename?: 'MailboxSyncEvent', accountId: string, created: number, updated: number, deleted: number, more: boolean } };

export const ListMailAccountFragmentDoc = gql`
    fragment ListMailAccount on MailAccount {
  id
  name
  emailAddress
  displayName
  provider
  status
  protocol
  visibility
  authMethod
  lastSyncedAt
  lastError
  lastErrorCode
  syncing
  canSend
  isOwner
  unreadCount
  pendingChanges
  failedChanges
}
    `;
export const MailFolderFragmentDoc = gql`
    fragment MailFolder on MailFolder {
  id
  path
  name
  role
  selectable
  syncEnabled
  existsOnServer
  totalCount
  unreadCount
  serverUnreadCount
  keywordsAllowed
  backfillDone
  lastSyncedAt
}
    `;
export const CategoryChipFragmentDoc = gql`
    fragment CategoryChip on Category {
  id
  name
  color
  sync
}
    `;
export const CategoryFragmentDoc = gql`
    fragment Category on Category {
  ...CategoryChip
  keyword
  messageCount
  createdAt
  account {
    id
    name
    emailAddress
  }
}
    ${CategoryChipFragmentDoc}`;
export const MailAccountFragmentDoc = gql`
    fragment MailAccount on MailAccount {
  ...ListMailAccount
  incomingHost
  incomingPort
  incomingSecurity
  smtpHost
  smtpPort
  smtpSecurity
  username
  saveSentCopy
  popLeaveOnServer
  pushSeen
  pushFlagged
  pushMoves
  pushDeletes
  pushKeywords
  capabilities
  backfillDone
  serverSideFolders
  createdAt
  creator {
    id
    sub
    preferredUsername
  }
  sharedWith {
    id
    sub
    preferredUsername
  }
  folders {
    ...MailFolder
  }
  categories {
    ...Category
  }
}
    ${ListMailAccountFragmentDoc}
${MailFolderFragmentDoc}
${CategoryFragmentDoc}`;
export const AuthSessionFragmentDoc = gql`
    fragment AuthSession on AuthSession {
  state
  status
  finish
  openUrl
  expiresAt
  redirectUrl
  interval
  userCode
  step
  errorCode
  errorMessage
  result {
    identifier
    id
    label
  }
}
    `;
export const BigFileAccessGrantFragmentDoc = gql`
    fragment BigFileAccessGrant on BigFileAccessGrant {
  accessKey
  secretKey
  sessionToken
  region
  expiresIn
  path
  key
  bucket
}
    `;
export const BigFileUploadGrantFragmentDoc = gql`
    fragment BigFileUploadGrant on BigFileUploadGrant {
  accessKey
  secretKey
  sessionToken
  region
  path
  key
  bucket
  expiresIn
  maxBytes
  store
}
    `;
export const DetailMailFolderFragmentDoc = gql`
    fragment DetailMailFolder on MailFolder {
  ...MailFolder
  delimiter
  account {
    ...ListMailAccount
  }
}
    ${MailFolderFragmentDoc}
${ListMailAccountFragmentDoc}`;
export const AddressFragmentDoc = gql`
    fragment Address on Address {
  name
  address
}
    `;
export const ListOutgoingMessageFragmentDoc = gql`
    fragment ListOutgoingMessage on OutgoingMessage {
  id
  subject
  status
  error
  errorCode
  createdAt
  sentAt
  account {
    id
    name
    emailAddress
  }
  to {
    ...Address
  }
}
    ${AddressFragmentDoc}`;
export const RecipientsFragmentDoc = gql`
    fragment Recipients on OutgoingMessage {
  to {
    ...Address
  }
  cc {
    ...Address
  }
  bcc {
    ...Address
  }
}
    ${AddressFragmentDoc}`;
export const OutgoingMessageFragmentDoc = gql`
    fragment OutgoingMessage on OutgoingMessage {
  ...ListOutgoingMessage
  ...Recipients
  textBody
  htmlBody
  messageId
  savedToSent
  creator {
    id
    sub
  }
  inReplyTo {
    id
    subject
    thread {
      id
    }
  }
  attachments {
    id
    originalFileName
    contentType
    sizeBytes
  }
  refused {
    address
    code
    message
  }
}
    ${ListOutgoingMessageFragmentDoc}
${RecipientsFragmentDoc}`;
export const ServerSettingsFragmentDoc = gql`
    fragment ServerSettings on ServerSettings {
  host
  port
  security
}
    `;
export const MailPresetFragmentDoc = gql`
    fragment MailPreset on MailPreset {
  key
  name
  domains
  provider
  imap {
    ...ServerSettings
  }
  pop3 {
    ...ServerSettings
  }
  smtp {
    ...ServerSettings
  }
  saveSentCopy
  oauth
  oauthConfigured
  note
}
    ${ServerSettingsFragmentDoc}`;
export const ListTaskListFragmentDoc = gql`
    fragment ListTaskList on TaskList {
  id
  name
  color
  position
  openCount
  createdAt
}
    `;
export const ListMessageFragmentDoc = gql`
    fragment ListMessage on Message {
  id
  subject
  senderName
  senderAddress
  date
  snippet
  isRead
  isFlagged
  isAnswered
  hasAttachments
  syncState
  categories {
    ...CategoryChip
  }
  account {
    id
    name
    emailAddress
    canSend
  }
  folder {
    id
    name
    role
  }
  thread {
    id
    messageCount
  }
}
    ${CategoryChipFragmentDoc}`;
export const ListTaskFragmentDoc = gql`
    fragment ListTask on Task {
  id
  title
  notes
  status
  pinned
  dueAt
  snoozed
  snoozedUntil
  completedAt
  position
  threadCount
  unreadCount
  createdAt
  updatedAt
  externalKey
  appClientId
  list {
    ...ListTaskList
  }
  latestMessage {
    ...ListMessage
  }
}
    ${ListTaskListFragmentDoc}
${ListMessageFragmentDoc}`;
export const ListThreadFragmentDoc = gql`
    fragment ListThread on Thread {
  id
  subject
  lastMessageAt
  messageCount
  unread
  flagged
  hasAttachments
  unreadCount(folder: $inFolder, folderRole: $inRole)
  participants {
    ...Address
  }
  account {
    id
    name
    emailAddress
  }
  latestMessage(folder: $inFolder, folderRole: $inRole) {
    ...ListMessage
  }
}
    ${AddressFragmentDoc}
${ListMessageFragmentDoc}`;
export const TaskThreadFragmentDoc = gql`
    fragment TaskThread on TaskThread {
  id
  source
  reason
  confidence
  position
  createdAt
  appClientId
  thread {
    ...ListThread
  }
}
    ${ListThreadFragmentDoc}`;
export const TaskFragmentDoc = gql`
    fragment Task on Task {
  ...ListTask
  links {
    ...TaskThread
  }
}
    ${ListTaskFragmentDoc}
${TaskThreadFragmentDoc}`;
export const TaskChipFragmentDoc = gql`
    fragment TaskChip on Task {
  id
  title
  status
  list {
    id
    name
    color
  }
}
    `;
export const SenderAccountFragmentDoc = gql`
    fragment SenderAccount on MailAccount {
  id
  name
  emailAddress
  displayName
  canSend
  status
}
    `;
export const MailChangeFragmentDoc = gql`
    fragment MailChange on MailChange {
  id
  kind
  state
  add
  remove
  attempts
  error
  errorCode
  createdAt
  pushAfter
  undoable
  createdBy {
    id
    sub
  }
  account {
    id
    name
    emailAddress
  }
  message {
    id
    subject
    senderName
    senderAddress
    thread {
      id
    }
  }
  originFolder {
    id
    name
    role
  }
  targetFolder {
    id
    name
    role
  }
}
    `;
export const AttachmentFragmentDoc = gql`
    fragment Attachment on Attachment {
  id
  position
  filename
  contentType
  size
  contentId
  inline
  store {
    id
  }
}
    `;
export const MessageFragmentDoc = gql`
    fragment Message on Message {
  ...ListMessage
  messageId
  receivedAt
  textBody
  hasRemoteImages
  size
  flags
  serverFlags
  changes {
    ...MailChange
  }
  truncated
  html(allowRemote: $allowRemote)
  sender {
    ...Address
  }
  replyTo {
    ...Address
  }
  to {
    ...Address
  }
  cc {
    ...Address
  }
  bcc {
    ...Address
  }
  attachments {
    ...Attachment
  }
}
    ${ListMessageFragmentDoc}
${MailChangeFragmentDoc}
${AddressFragmentDoc}
${AttachmentFragmentDoc}`;
export const ThreadFragmentDoc = gql`
    fragment Thread on Thread {
  id
  subject
  lastMessageAt
  messageCount
  unread
  tasks {
    ...TaskChip
  }
  account {
    ...SenderAccount
  }
  messages {
    ...Message
  }
}
    ${TaskChipFragmentDoc}
${SenderAccountFragmentDoc}
${MessageFragmentDoc}`;
export const MessageStateFragmentDoc = gql`
    fragment MessageState on Message {
  id
  flags
  isRead
  isFlagged
  isAnswered
  syncState
  categories {
    ...CategoryChip
  }
  changes {
    ...MailChange
  }
  folder {
    id
    name
    role
  }
}
    ${CategoryChipFragmentDoc}
${MailChangeFragmentDoc}`;
export const CreateMailAccountDocument = gql`
    mutation CreateMailAccount($input: CreateMailAccountInput!) {
  createMailAccount(input: $input) {
    ...MailAccount
  }
}
    ${MailAccountFragmentDoc}`;
export type CreateMailAccountMutationFn = Apollo.MutationFunction<CreateMailAccountMutation, CreateMailAccountMutationVariables>;

/**
 * __useCreateMailAccountMutation__
 *
 * To run a mutation, you first call `useCreateMailAccountMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMailAccountMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMailAccountMutation, { data, loading, error }] = useCreateMailAccountMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMailAccountMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateMailAccountMutation, CreateMailAccountMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateMailAccountMutation, CreateMailAccountMutationVariables>(CreateMailAccountDocument, options);
      }
export type CreateMailAccountMutationHookResult = ReturnType<typeof useCreateMailAccountMutation>;
export type CreateMailAccountMutationResult = Apollo.MutationResult<CreateMailAccountMutation>;
export type CreateMailAccountMutationOptions = Apollo.BaseMutationOptions<CreateMailAccountMutation, CreateMailAccountMutationVariables>;
export const UpdateMailAccountDocument = gql`
    mutation UpdateMailAccount($input: UpdateMailAccountInput!) {
  updateMailAccount(input: $input) {
    ...MailAccount
  }
}
    ${MailAccountFragmentDoc}`;
export type UpdateMailAccountMutationFn = Apollo.MutationFunction<UpdateMailAccountMutation, UpdateMailAccountMutationVariables>;

/**
 * __useUpdateMailAccountMutation__
 *
 * To run a mutation, you first call `useUpdateMailAccountMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMailAccountMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMailAccountMutation, { data, loading, error }] = useUpdateMailAccountMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMailAccountMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateMailAccountMutation, UpdateMailAccountMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateMailAccountMutation, UpdateMailAccountMutationVariables>(UpdateMailAccountDocument, options);
      }
export type UpdateMailAccountMutationHookResult = ReturnType<typeof useUpdateMailAccountMutation>;
export type UpdateMailAccountMutationResult = Apollo.MutationResult<UpdateMailAccountMutation>;
export type UpdateMailAccountMutationOptions = Apollo.BaseMutationOptions<UpdateMailAccountMutation, UpdateMailAccountMutationVariables>;
export const TestMailAccountDocument = gql`
    mutation TestMailAccount($id: ID!) {
  testMailAccount(id: $id) {
    ...ListMailAccount
  }
}
    ${ListMailAccountFragmentDoc}`;
export type TestMailAccountMutationFn = Apollo.MutationFunction<TestMailAccountMutation, TestMailAccountMutationVariables>;

/**
 * __useTestMailAccountMutation__
 *
 * To run a mutation, you first call `useTestMailAccountMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useTestMailAccountMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [testMailAccountMutation, { data, loading, error }] = useTestMailAccountMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useTestMailAccountMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<TestMailAccountMutation, TestMailAccountMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<TestMailAccountMutation, TestMailAccountMutationVariables>(TestMailAccountDocument, options);
      }
export type TestMailAccountMutationHookResult = ReturnType<typeof useTestMailAccountMutation>;
export type TestMailAccountMutationResult = Apollo.MutationResult<TestMailAccountMutation>;
export type TestMailAccountMutationOptions = Apollo.BaseMutationOptions<TestMailAccountMutation, TestMailAccountMutationVariables>;
export const DeleteMailAccountDocument = gql`
    mutation DeleteMailAccount($id: ID!) {
  deleteMailAccount(id: $id)
}
    `;
export type DeleteMailAccountMutationFn = Apollo.MutationFunction<DeleteMailAccountMutation, DeleteMailAccountMutationVariables>;

/**
 * __useDeleteMailAccountMutation__
 *
 * To run a mutation, you first call `useDeleteMailAccountMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMailAccountMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMailAccountMutation, { data, loading, error }] = useDeleteMailAccountMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteMailAccountMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteMailAccountMutation, DeleteMailAccountMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteMailAccountMutation, DeleteMailAccountMutationVariables>(DeleteMailAccountDocument, options);
      }
export type DeleteMailAccountMutationHookResult = ReturnType<typeof useDeleteMailAccountMutation>;
export type DeleteMailAccountMutationResult = Apollo.MutationResult<DeleteMailAccountMutation>;
export type DeleteMailAccountMutationOptions = Apollo.BaseMutationOptions<DeleteMailAccountMutation, DeleteMailAccountMutationVariables>;
export const ShareMailAccountDocument = gql`
    mutation ShareMailAccount($input: ShareMailAccountInput!) {
  shareMailAccount(input: $input) {
    ...MailAccount
  }
}
    ${MailAccountFragmentDoc}`;
export type ShareMailAccountMutationFn = Apollo.MutationFunction<ShareMailAccountMutation, ShareMailAccountMutationVariables>;

/**
 * __useShareMailAccountMutation__
 *
 * To run a mutation, you first call `useShareMailAccountMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useShareMailAccountMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [shareMailAccountMutation, { data, loading, error }] = useShareMailAccountMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useShareMailAccountMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ShareMailAccountMutation, ShareMailAccountMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ShareMailAccountMutation, ShareMailAccountMutationVariables>(ShareMailAccountDocument, options);
      }
export type ShareMailAccountMutationHookResult = ReturnType<typeof useShareMailAccountMutation>;
export type ShareMailAccountMutationResult = Apollo.MutationResult<ShareMailAccountMutation>;
export type ShareMailAccountMutationOptions = Apollo.BaseMutationOptions<ShareMailAccountMutation, ShareMailAccountMutationVariables>;
export const UpdateMailFolderDocument = gql`
    mutation UpdateMailFolder($input: UpdateMailFolderInput!) {
  updateMailFolder(input: $input) {
    ...MailFolder
  }
}
    ${MailFolderFragmentDoc}`;
export type UpdateMailFolderMutationFn = Apollo.MutationFunction<UpdateMailFolderMutation, UpdateMailFolderMutationVariables>;

/**
 * __useUpdateMailFolderMutation__
 *
 * To run a mutation, you first call `useUpdateMailFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMailFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMailFolderMutation, { data, loading, error }] = useUpdateMailFolderMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMailFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateMailFolderMutation, UpdateMailFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateMailFolderMutation, UpdateMailFolderMutationVariables>(UpdateMailFolderDocument, options);
      }
export type UpdateMailFolderMutationHookResult = ReturnType<typeof useUpdateMailFolderMutation>;
export type UpdateMailFolderMutationResult = Apollo.MutationResult<UpdateMailFolderMutation>;
export type UpdateMailFolderMutationOptions = Apollo.BaseMutationOptions<UpdateMailFolderMutation, UpdateMailFolderMutationVariables>;
export const SyncMailAccountDocument = gql`
    mutation SyncMailAccount($id: ID!, $folders: [ID!]) {
  syncMailAccount(id: $id, folders: $folders) {
    created
    updated
    deleted
    folders
    more
    account {
      ...ListMailAccount
    }
  }
}
    ${ListMailAccountFragmentDoc}`;
export type SyncMailAccountMutationFn = Apollo.MutationFunction<SyncMailAccountMutation, SyncMailAccountMutationVariables>;

/**
 * __useSyncMailAccountMutation__
 *
 * To run a mutation, you first call `useSyncMailAccountMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSyncMailAccountMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [syncMailAccountMutation, { data, loading, error }] = useSyncMailAccountMutation({
 *   variables: {
 *      id: // value for 'id'
 *      folders: // value for 'folders'
 *   },
 * });
 */
export function useSyncMailAccountMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SyncMailAccountMutation, SyncMailAccountMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SyncMailAccountMutation, SyncMailAccountMutationVariables>(SyncMailAccountDocument, options);
      }
export type SyncMailAccountMutationHookResult = ReturnType<typeof useSyncMailAccountMutation>;
export type SyncMailAccountMutationResult = Apollo.MutationResult<SyncMailAccountMutation>;
export type SyncMailAccountMutationOptions = Apollo.BaseMutationOptions<SyncMailAccountMutation, SyncMailAccountMutationVariables>;
export const CreateCategoryDocument = gql`
    mutation CreateCategory($input: CreateCategoryInput!) {
  createCategory(input: $input) {
    ...Category
  }
}
    ${CategoryFragmentDoc}`;
export type CreateCategoryMutationFn = Apollo.MutationFunction<CreateCategoryMutation, CreateCategoryMutationVariables>;

/**
 * __useCreateCategoryMutation__
 *
 * To run a mutation, you first call `useCreateCategoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCategoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCategoryMutation, { data, loading, error }] = useCreateCategoryMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCategoryMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateCategoryMutation, CreateCategoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateCategoryMutation, CreateCategoryMutationVariables>(CreateCategoryDocument, options);
      }
export type CreateCategoryMutationHookResult = ReturnType<typeof useCreateCategoryMutation>;
export type CreateCategoryMutationResult = Apollo.MutationResult<CreateCategoryMutation>;
export type CreateCategoryMutationOptions = Apollo.BaseMutationOptions<CreateCategoryMutation, CreateCategoryMutationVariables>;
export const UpdateCategoryDocument = gql`
    mutation UpdateCategory($input: UpdateCategoryInput!) {
  updateCategory(input: $input) {
    ...Category
  }
}
    ${CategoryFragmentDoc}`;
export type UpdateCategoryMutationFn = Apollo.MutationFunction<UpdateCategoryMutation, UpdateCategoryMutationVariables>;

/**
 * __useUpdateCategoryMutation__
 *
 * To run a mutation, you first call `useUpdateCategoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCategoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCategoryMutation, { data, loading, error }] = useUpdateCategoryMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCategoryMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateCategoryMutation, UpdateCategoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateCategoryMutation, UpdateCategoryMutationVariables>(UpdateCategoryDocument, options);
      }
export type UpdateCategoryMutationHookResult = ReturnType<typeof useUpdateCategoryMutation>;
export type UpdateCategoryMutationResult = Apollo.MutationResult<UpdateCategoryMutation>;
export type UpdateCategoryMutationOptions = Apollo.BaseMutationOptions<UpdateCategoryMutation, UpdateCategoryMutationVariables>;
export const DeleteCategoryDocument = gql`
    mutation DeleteCategory($id: ID!, $removeKeywords: Boolean! = false) {
  deleteCategory(id: $id, removeKeywords: $removeKeywords)
}
    `;
export type DeleteCategoryMutationFn = Apollo.MutationFunction<DeleteCategoryMutation, DeleteCategoryMutationVariables>;

/**
 * __useDeleteCategoryMutation__
 *
 * To run a mutation, you first call `useDeleteCategoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCategoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCategoryMutation, { data, loading, error }] = useDeleteCategoryMutation({
 *   variables: {
 *      id: // value for 'id'
 *      removeKeywords: // value for 'removeKeywords'
 *   },
 * });
 */
export function useDeleteCategoryMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteCategoryMutation, DeleteCategoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteCategoryMutation, DeleteCategoryMutationVariables>(DeleteCategoryDocument, options);
      }
export type DeleteCategoryMutationHookResult = ReturnType<typeof useDeleteCategoryMutation>;
export type DeleteCategoryMutationResult = Apollo.MutationResult<DeleteCategoryMutation>;
export type DeleteCategoryMutationOptions = Apollo.BaseMutationOptions<DeleteCategoryMutation, DeleteCategoryMutationVariables>;
export const CategorizeMessagesDocument = gql`
    mutation CategorizeMessages($input: CategorizeMessagesInput!) {
  categorizeMessages(input: $input) {
    ...MessageState
  }
}
    ${MessageStateFragmentDoc}`;
export type CategorizeMessagesMutationFn = Apollo.MutationFunction<CategorizeMessagesMutation, CategorizeMessagesMutationVariables>;

/**
 * __useCategorizeMessagesMutation__
 *
 * To run a mutation, you first call `useCategorizeMessagesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCategorizeMessagesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [categorizeMessagesMutation, { data, loading, error }] = useCategorizeMessagesMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCategorizeMessagesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CategorizeMessagesMutation, CategorizeMessagesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CategorizeMessagesMutation, CategorizeMessagesMutationVariables>(CategorizeMessagesDocument, options);
      }
export type CategorizeMessagesMutationHookResult = ReturnType<typeof useCategorizeMessagesMutation>;
export type CategorizeMessagesMutationResult = Apollo.MutationResult<CategorizeMessagesMutation>;
export type CategorizeMessagesMutationOptions = Apollo.BaseMutationOptions<CategorizeMessagesMutation, CategorizeMessagesMutationVariables>;
export const PushMailChangesDocument = gql`
    mutation PushMailChanges($account: ID!) {
  pushMailChanges(account: $account) {
    pushed
    failed
    pending
    account {
      ...ListMailAccount
    }
  }
}
    ${ListMailAccountFragmentDoc}`;
export type PushMailChangesMutationFn = Apollo.MutationFunction<PushMailChangesMutation, PushMailChangesMutationVariables>;

/**
 * __usePushMailChangesMutation__
 *
 * To run a mutation, you first call `usePushMailChangesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePushMailChangesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pushMailChangesMutation, { data, loading, error }] = usePushMailChangesMutation({
 *   variables: {
 *      account: // value for 'account'
 *   },
 * });
 */
export function usePushMailChangesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PushMailChangesMutation, PushMailChangesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PushMailChangesMutation, PushMailChangesMutationVariables>(PushMailChangesDocument, options);
      }
export type PushMailChangesMutationHookResult = ReturnType<typeof usePushMailChangesMutation>;
export type PushMailChangesMutationResult = Apollo.MutationResult<PushMailChangesMutation>;
export type PushMailChangesMutationOptions = Apollo.BaseMutationOptions<PushMailChangesMutation, PushMailChangesMutationVariables>;
export const RetryMailChangesDocument = gql`
    mutation RetryMailChanges($changes: [ID!]!) {
  retryMailChanges(changes: $changes) {
    ...MailChange
  }
}
    ${MailChangeFragmentDoc}`;
export type RetryMailChangesMutationFn = Apollo.MutationFunction<RetryMailChangesMutation, RetryMailChangesMutationVariables>;

/**
 * __useRetryMailChangesMutation__
 *
 * To run a mutation, you first call `useRetryMailChangesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRetryMailChangesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [retryMailChangesMutation, { data, loading, error }] = useRetryMailChangesMutation({
 *   variables: {
 *      changes: // value for 'changes'
 *   },
 * });
 */
export function useRetryMailChangesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RetryMailChangesMutation, RetryMailChangesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RetryMailChangesMutation, RetryMailChangesMutationVariables>(RetryMailChangesDocument, options);
      }
export type RetryMailChangesMutationHookResult = ReturnType<typeof useRetryMailChangesMutation>;
export type RetryMailChangesMutationResult = Apollo.MutationResult<RetryMailChangesMutation>;
export type RetryMailChangesMutationOptions = Apollo.BaseMutationOptions<RetryMailChangesMutation, RetryMailChangesMutationVariables>;
export const UndoMailChangesDocument = gql`
    mutation UndoMailChanges($input: UndoMailChangesInput!) {
  undoMailChanges(input: $input) {
    ...MessageState
  }
}
    ${MessageStateFragmentDoc}`;
export type UndoMailChangesMutationFn = Apollo.MutationFunction<UndoMailChangesMutation, UndoMailChangesMutationVariables>;

/**
 * __useUndoMailChangesMutation__
 *
 * To run a mutation, you first call `useUndoMailChangesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUndoMailChangesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [undoMailChangesMutation, { data, loading, error }] = useUndoMailChangesMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUndoMailChangesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UndoMailChangesMutation, UndoMailChangesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UndoMailChangesMutation, UndoMailChangesMutationVariables>(UndoMailChangesDocument, options);
      }
export type UndoMailChangesMutationHookResult = ReturnType<typeof useUndoMailChangesMutation>;
export type UndoMailChangesMutationResult = Apollo.MutationResult<UndoMailChangesMutation>;
export type UndoMailChangesMutationOptions = Apollo.BaseMutationOptions<UndoMailChangesMutation, UndoMailChangesMutationVariables>;
export const RevertMessagesToServerDocument = gql`
    mutation RevertMessagesToServer($messages: [ID!]!) {
  revertMessagesToServer(messages: $messages) {
    ...MessageState
  }
}
    ${MessageStateFragmentDoc}`;
export type RevertMessagesToServerMutationFn = Apollo.MutationFunction<RevertMessagesToServerMutation, RevertMessagesToServerMutationVariables>;

/**
 * __useRevertMessagesToServerMutation__
 *
 * To run a mutation, you first call `useRevertMessagesToServerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevertMessagesToServerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revertMessagesToServerMutation, { data, loading, error }] = useRevertMessagesToServerMutation({
 *   variables: {
 *      messages: // value for 'messages'
 *   },
 * });
 */
export function useRevertMessagesToServerMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevertMessagesToServerMutation, RevertMessagesToServerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevertMessagesToServerMutation, RevertMessagesToServerMutationVariables>(RevertMessagesToServerDocument, options);
      }
export type RevertMessagesToServerMutationHookResult = ReturnType<typeof useRevertMessagesToServerMutation>;
export type RevertMessagesToServerMutationResult = Apollo.MutationResult<RevertMessagesToServerMutation>;
export type RevertMessagesToServerMutationOptions = Apollo.BaseMutationOptions<RevertMessagesToServerMutation, RevertMessagesToServerMutationVariables>;
export const RequestBigfileUploadDocument = gql`
    mutation RequestBigfileUpload($input: RequestBigFileUploadInput!) {
  requestBigfileUpload(input: $input) {
    ...BigFileUploadGrant
  }
}
    ${BigFileUploadGrantFragmentDoc}`;
export type RequestBigfileUploadMutationFn = Apollo.MutationFunction<RequestBigfileUploadMutation, RequestBigfileUploadMutationVariables>;

/**
 * __useRequestBigfileUploadMutation__
 *
 * To run a mutation, you first call `useRequestBigfileUploadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestBigfileUploadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestBigfileUploadMutation, { data, loading, error }] = useRequestBigfileUploadMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestBigfileUploadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestBigfileUploadMutation, RequestBigfileUploadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestBigfileUploadMutation, RequestBigfileUploadMutationVariables>(RequestBigfileUploadDocument, options);
      }
export type RequestBigfileUploadMutationHookResult = ReturnType<typeof useRequestBigfileUploadMutation>;
export type RequestBigfileUploadMutationResult = Apollo.MutationResult<RequestBigfileUploadMutation>;
export type RequestBigfileUploadMutationOptions = Apollo.BaseMutationOptions<RequestBigfileUploadMutation, RequestBigfileUploadMutationVariables>;
export const FinishBigfileUploadDocument = gql`
    mutation FinishBigfileUpload($input: FinishBigFileUploadInput!) {
  finishBigfileUpload(input: $input) {
    id
    originalFileName
    sizeBytes
  }
}
    `;
export type FinishBigfileUploadMutationFn = Apollo.MutationFunction<FinishBigfileUploadMutation, FinishBigfileUploadMutationVariables>;

/**
 * __useFinishBigfileUploadMutation__
 *
 * To run a mutation, you first call `useFinishBigfileUploadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFinishBigfileUploadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [finishBigfileUploadMutation, { data, loading, error }] = useFinishBigfileUploadMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useFinishBigfileUploadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<FinishBigfileUploadMutation, FinishBigfileUploadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<FinishBigfileUploadMutation, FinishBigfileUploadMutationVariables>(FinishBigfileUploadDocument, options);
      }
export type FinishBigfileUploadMutationHookResult = ReturnType<typeof useFinishBigfileUploadMutation>;
export type FinishBigfileUploadMutationResult = Apollo.MutationResult<FinishBigfileUploadMutation>;
export type FinishBigfileUploadMutationOptions = Apollo.BaseMutationOptions<FinishBigfileUploadMutation, FinishBigfileUploadMutationVariables>;
export const SetMessageFlagsDocument = gql`
    mutation SetMessageFlags($input: SetMessageFlagsInput!) {
  setMessageFlags(input: $input) {
    ...MessageState
  }
}
    ${MessageStateFragmentDoc}`;
export type SetMessageFlagsMutationFn = Apollo.MutationFunction<SetMessageFlagsMutation, SetMessageFlagsMutationVariables>;

/**
 * __useSetMessageFlagsMutation__
 *
 * To run a mutation, you first call `useSetMessageFlagsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetMessageFlagsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setMessageFlagsMutation, { data, loading, error }] = useSetMessageFlagsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSetMessageFlagsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SetMessageFlagsMutation, SetMessageFlagsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SetMessageFlagsMutation, SetMessageFlagsMutationVariables>(SetMessageFlagsDocument, options);
      }
export type SetMessageFlagsMutationHookResult = ReturnType<typeof useSetMessageFlagsMutation>;
export type SetMessageFlagsMutationResult = Apollo.MutationResult<SetMessageFlagsMutation>;
export type SetMessageFlagsMutationOptions = Apollo.BaseMutationOptions<SetMessageFlagsMutation, SetMessageFlagsMutationVariables>;
export const MarkMessagesReadDocument = gql`
    mutation MarkMessagesRead($input: MarkMessagesInput!) {
  markMessagesRead(input: $input) {
    ...MessageState
  }
}
    ${MessageStateFragmentDoc}`;
export type MarkMessagesReadMutationFn = Apollo.MutationFunction<MarkMessagesReadMutation, MarkMessagesReadMutationVariables>;

/**
 * __useMarkMessagesReadMutation__
 *
 * To run a mutation, you first call `useMarkMessagesReadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkMessagesReadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markMessagesReadMutation, { data, loading, error }] = useMarkMessagesReadMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useMarkMessagesReadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MarkMessagesReadMutation, MarkMessagesReadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MarkMessagesReadMutation, MarkMessagesReadMutationVariables>(MarkMessagesReadDocument, options);
      }
export type MarkMessagesReadMutationHookResult = ReturnType<typeof useMarkMessagesReadMutation>;
export type MarkMessagesReadMutationResult = Apollo.MutationResult<MarkMessagesReadMutation>;
export type MarkMessagesReadMutationOptions = Apollo.BaseMutationOptions<MarkMessagesReadMutation, MarkMessagesReadMutationVariables>;
export const MoveMessagesDocument = gql`
    mutation MoveMessages($input: MoveMessagesInput!) {
  moveMessages(input: $input) {
    ...MessageState
  }
}
    ${MessageStateFragmentDoc}`;
export type MoveMessagesMutationFn = Apollo.MutationFunction<MoveMessagesMutation, MoveMessagesMutationVariables>;

/**
 * __useMoveMessagesMutation__
 *
 * To run a mutation, you first call `useMoveMessagesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMoveMessagesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [moveMessagesMutation, { data, loading, error }] = useMoveMessagesMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useMoveMessagesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MoveMessagesMutation, MoveMessagesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MoveMessagesMutation, MoveMessagesMutationVariables>(MoveMessagesDocument, options);
      }
export type MoveMessagesMutationHookResult = ReturnType<typeof useMoveMessagesMutation>;
export type MoveMessagesMutationResult = Apollo.MutationResult<MoveMessagesMutation>;
export type MoveMessagesMutationOptions = Apollo.BaseMutationOptions<MoveMessagesMutation, MoveMessagesMutationVariables>;
export const DeleteMessagesDocument = gql`
    mutation DeleteMessages($input: DeleteMessagesInput!) {
  deleteMessages(input: $input) {
    deleted
  }
}
    `;
export type DeleteMessagesMutationFn = Apollo.MutationFunction<DeleteMessagesMutation, DeleteMessagesMutationVariables>;

/**
 * __useDeleteMessagesMutation__
 *
 * To run a mutation, you first call `useDeleteMessagesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMessagesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMessagesMutation, { data, loading, error }] = useDeleteMessagesMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDeleteMessagesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteMessagesMutation, DeleteMessagesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteMessagesMutation, DeleteMessagesMutationVariables>(DeleteMessagesDocument, options);
      }
export type DeleteMessagesMutationHookResult = ReturnType<typeof useDeleteMessagesMutation>;
export type DeleteMessagesMutationResult = Apollo.MutationResult<DeleteMessagesMutation>;
export type DeleteMessagesMutationOptions = Apollo.BaseMutationOptions<DeleteMessagesMutation, DeleteMessagesMutationVariables>;
export const SendMessageDocument = gql`
    mutation SendMessage($input: SendMessageInput!) {
  sendMessage(input: $input) {
    ...OutgoingMessage
  }
}
    ${OutgoingMessageFragmentDoc}`;
export type SendMessageMutationFn = Apollo.MutationFunction<SendMessageMutation, SendMessageMutationVariables>;

/**
 * __useSendMessageMutation__
 *
 * To run a mutation, you first call `useSendMessageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendMessageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendMessageMutation, { data, loading, error }] = useSendMessageMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSendMessageMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SendMessageMutation, SendMessageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SendMessageMutation, SendMessageMutationVariables>(SendMessageDocument, options);
      }
export type SendMessageMutationHookResult = ReturnType<typeof useSendMessageMutation>;
export type SendMessageMutationResult = Apollo.MutationResult<SendMessageMutation>;
export type SendMessageMutationOptions = Apollo.BaseMutationOptions<SendMessageMutation, SendMessageMutationVariables>;
export const StartOAuthLinkDocument = gql`
    mutation StartOAuthLink($input: StartOAuthLinkInput!) {
  startOAuthLink(input: $input) {
    ...AuthSession
  }
}
    ${AuthSessionFragmentDoc}`;
export type StartOAuthLinkMutationFn = Apollo.MutationFunction<StartOAuthLinkMutation, StartOAuthLinkMutationVariables>;

/**
 * __useStartOAuthLinkMutation__
 *
 * To run a mutation, you first call `useStartOAuthLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStartOAuthLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [startOAuthLinkMutation, { data, loading, error }] = useStartOAuthLinkMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useStartOAuthLinkMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<StartOAuthLinkMutation, StartOAuthLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<StartOAuthLinkMutation, StartOAuthLinkMutationVariables>(StartOAuthLinkDocument, options);
      }
export type StartOAuthLinkMutationHookResult = ReturnType<typeof useStartOAuthLinkMutation>;
export type StartOAuthLinkMutationResult = Apollo.MutationResult<StartOAuthLinkMutation>;
export type StartOAuthLinkMutationOptions = Apollo.BaseMutationOptions<StartOAuthLinkMutation, StartOAuthLinkMutationVariables>;
export const CompleteAuthDocument = gql`
    mutation CompleteAuth($input: CompleteAuthInput!) {
  completeAuth(input: $input) {
    ...AuthSession
  }
}
    ${AuthSessionFragmentDoc}`;
export type CompleteAuthMutationFn = Apollo.MutationFunction<CompleteAuthMutation, CompleteAuthMutationVariables>;

/**
 * __useCompleteAuthMutation__
 *
 * To run a mutation, you first call `useCompleteAuthMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCompleteAuthMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [completeAuthMutation, { data, loading, error }] = useCompleteAuthMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCompleteAuthMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CompleteAuthMutation, CompleteAuthMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CompleteAuthMutation, CompleteAuthMutationVariables>(CompleteAuthDocument, options);
      }
export type CompleteAuthMutationHookResult = ReturnType<typeof useCompleteAuthMutation>;
export type CompleteAuthMutationResult = Apollo.MutationResult<CompleteAuthMutation>;
export type CompleteAuthMutationOptions = Apollo.BaseMutationOptions<CompleteAuthMutation, CompleteAuthMutationVariables>;
export const ResumeAuthDocument = gql`
    mutation ResumeAuth($state: String!) {
  resumeAuth(state: $state) {
    ...AuthSession
  }
}
    ${AuthSessionFragmentDoc}`;
export type ResumeAuthMutationFn = Apollo.MutationFunction<ResumeAuthMutation, ResumeAuthMutationVariables>;

/**
 * __useResumeAuthMutation__
 *
 * To run a mutation, you first call `useResumeAuthMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResumeAuthMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resumeAuthMutation, { data, loading, error }] = useResumeAuthMutation({
 *   variables: {
 *      state: // value for 'state'
 *   },
 * });
 */
export function useResumeAuthMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ResumeAuthMutation, ResumeAuthMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ResumeAuthMutation, ResumeAuthMutationVariables>(ResumeAuthDocument, options);
      }
export type ResumeAuthMutationHookResult = ReturnType<typeof useResumeAuthMutation>;
export type ResumeAuthMutationResult = Apollo.MutationResult<ResumeAuthMutation>;
export type ResumeAuthMutationOptions = Apollo.BaseMutationOptions<ResumeAuthMutation, ResumeAuthMutationVariables>;
export const CancelAuthDocument = gql`
    mutation CancelAuth($state: String!) {
  cancelAuth(state: $state) {
    ...AuthSession
  }
}
    ${AuthSessionFragmentDoc}`;
export type CancelAuthMutationFn = Apollo.MutationFunction<CancelAuthMutation, CancelAuthMutationVariables>;

/**
 * __useCancelAuthMutation__
 *
 * To run a mutation, you first call `useCancelAuthMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelAuthMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelAuthMutation, { data, loading, error }] = useCancelAuthMutation({
 *   variables: {
 *      state: // value for 'state'
 *   },
 * });
 */
export function useCancelAuthMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CancelAuthMutation, CancelAuthMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CancelAuthMutation, CancelAuthMutationVariables>(CancelAuthDocument, options);
      }
export type CancelAuthMutationHookResult = ReturnType<typeof useCancelAuthMutation>;
export type CancelAuthMutationResult = Apollo.MutationResult<CancelAuthMutation>;
export type CancelAuthMutationOptions = Apollo.BaseMutationOptions<CancelAuthMutation, CancelAuthMutationVariables>;
export const CreateTaskDocument = gql`
    mutation CreateTask($input: CreateTaskInput!) {
  createTask(input: $input) {
    ...ListTask
  }
}
    ${ListTaskFragmentDoc}`;
export type CreateTaskMutationFn = Apollo.MutationFunction<CreateTaskMutation, CreateTaskMutationVariables>;

/**
 * __useCreateTaskMutation__
 *
 * To run a mutation, you first call `useCreateTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTaskMutation, { data, loading, error }] = useCreateTaskMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTaskMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateTaskMutation, CreateTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateTaskMutation, CreateTaskMutationVariables>(CreateTaskDocument, options);
      }
export type CreateTaskMutationHookResult = ReturnType<typeof useCreateTaskMutation>;
export type CreateTaskMutationResult = Apollo.MutationResult<CreateTaskMutation>;
export type CreateTaskMutationOptions = Apollo.BaseMutationOptions<CreateTaskMutation, CreateTaskMutationVariables>;
export const UpdateTaskDocument = gql`
    mutation UpdateTask($input: UpdateTaskInput!) {
  updateTask(input: $input) {
    ...ListTask
  }
}
    ${ListTaskFragmentDoc}`;
export type UpdateTaskMutationFn = Apollo.MutationFunction<UpdateTaskMutation, UpdateTaskMutationVariables>;

/**
 * __useUpdateTaskMutation__
 *
 * To run a mutation, you first call `useUpdateTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateTaskMutation, { data, loading, error }] = useUpdateTaskMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateTaskMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateTaskMutation, UpdateTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateTaskMutation, UpdateTaskMutationVariables>(UpdateTaskDocument, options);
      }
export type UpdateTaskMutationHookResult = ReturnType<typeof useUpdateTaskMutation>;
export type UpdateTaskMutationResult = Apollo.MutationResult<UpdateTaskMutation>;
export type UpdateTaskMutationOptions = Apollo.BaseMutationOptions<UpdateTaskMutation, UpdateTaskMutationVariables>;
export const DeleteTaskDocument = gql`
    mutation DeleteTask($id: ID!) {
  deleteTask(id: $id)
}
    `;
export type DeleteTaskMutationFn = Apollo.MutationFunction<DeleteTaskMutation, DeleteTaskMutationVariables>;

/**
 * __useDeleteTaskMutation__
 *
 * To run a mutation, you first call `useDeleteTaskMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTaskMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteTaskMutation, { data, loading, error }] = useDeleteTaskMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteTaskMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteTaskMutation, DeleteTaskMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteTaskMutation, DeleteTaskMutationVariables>(DeleteTaskDocument, options);
      }
export type DeleteTaskMutationHookResult = ReturnType<typeof useDeleteTaskMutation>;
export type DeleteTaskMutationResult = Apollo.MutationResult<DeleteTaskMutation>;
export type DeleteTaskMutationOptions = Apollo.BaseMutationOptions<DeleteTaskMutation, DeleteTaskMutationVariables>;
export const SetTaskStatusDocument = gql`
    mutation SetTaskStatus($input: SetTaskStatusInput!) {
  setTaskStatus(input: $input) {
    ...ListTask
  }
}
    ${ListTaskFragmentDoc}`;
export type SetTaskStatusMutationFn = Apollo.MutationFunction<SetTaskStatusMutation, SetTaskStatusMutationVariables>;

/**
 * __useSetTaskStatusMutation__
 *
 * To run a mutation, you first call `useSetTaskStatusMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetTaskStatusMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setTaskStatusMutation, { data, loading, error }] = useSetTaskStatusMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSetTaskStatusMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SetTaskStatusMutation, SetTaskStatusMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SetTaskStatusMutation, SetTaskStatusMutationVariables>(SetTaskStatusDocument, options);
      }
export type SetTaskStatusMutationHookResult = ReturnType<typeof useSetTaskStatusMutation>;
export type SetTaskStatusMutationResult = Apollo.MutationResult<SetTaskStatusMutation>;
export type SetTaskStatusMutationOptions = Apollo.BaseMutationOptions<SetTaskStatusMutation, SetTaskStatusMutationVariables>;
export const SnoozeTasksDocument = gql`
    mutation SnoozeTasks($input: SnoozeTasksInput!) {
  snoozeTasks(input: $input) {
    ...ListTask
  }
}
    ${ListTaskFragmentDoc}`;
export type SnoozeTasksMutationFn = Apollo.MutationFunction<SnoozeTasksMutation, SnoozeTasksMutationVariables>;

/**
 * __useSnoozeTasksMutation__
 *
 * To run a mutation, you first call `useSnoozeTasksMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSnoozeTasksMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [snoozeTasksMutation, { data, loading, error }] = useSnoozeTasksMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSnoozeTasksMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SnoozeTasksMutation, SnoozeTasksMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SnoozeTasksMutation, SnoozeTasksMutationVariables>(SnoozeTasksDocument, options);
      }
export type SnoozeTasksMutationHookResult = ReturnType<typeof useSnoozeTasksMutation>;
export type SnoozeTasksMutationResult = Apollo.MutationResult<SnoozeTasksMutation>;
export type SnoozeTasksMutationOptions = Apollo.BaseMutationOptions<SnoozeTasksMutation, SnoozeTasksMutationVariables>;
export const LinkThreadsDocument = gql`
    mutation LinkThreads($input: LinkThreadsInput!) {
  linkThreads(input: $input) {
    id
    task {
      id
      threadCount
      unreadCount
    }
    thread {
      id
      tasks {
        ...TaskChip
      }
    }
  }
}
    ${TaskChipFragmentDoc}`;
export type LinkThreadsMutationFn = Apollo.MutationFunction<LinkThreadsMutation, LinkThreadsMutationVariables>;

/**
 * __useLinkThreadsMutation__
 *
 * To run a mutation, you first call `useLinkThreadsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLinkThreadsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [linkThreadsMutation, { data, loading, error }] = useLinkThreadsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useLinkThreadsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<LinkThreadsMutation, LinkThreadsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<LinkThreadsMutation, LinkThreadsMutationVariables>(LinkThreadsDocument, options);
      }
export type LinkThreadsMutationHookResult = ReturnType<typeof useLinkThreadsMutation>;
export type LinkThreadsMutationResult = Apollo.MutationResult<LinkThreadsMutation>;
export type LinkThreadsMutationOptions = Apollo.BaseMutationOptions<LinkThreadsMutation, LinkThreadsMutationVariables>;
export const UnlinkThreadsDocument = gql`
    mutation UnlinkThreads($input: UnlinkThreadsInput!) {
  unlinkThreads(input: $input) {
    ...ListTask
  }
}
    ${ListTaskFragmentDoc}`;
export type UnlinkThreadsMutationFn = Apollo.MutationFunction<UnlinkThreadsMutation, UnlinkThreadsMutationVariables>;

/**
 * __useUnlinkThreadsMutation__
 *
 * To run a mutation, you first call `useUnlinkThreadsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnlinkThreadsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unlinkThreadsMutation, { data, loading, error }] = useUnlinkThreadsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUnlinkThreadsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UnlinkThreadsMutation, UnlinkThreadsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UnlinkThreadsMutation, UnlinkThreadsMutationVariables>(UnlinkThreadsDocument, options);
      }
export type UnlinkThreadsMutationHookResult = ReturnType<typeof useUnlinkThreadsMutation>;
export type UnlinkThreadsMutationResult = Apollo.MutationResult<UnlinkThreadsMutation>;
export type UnlinkThreadsMutationOptions = Apollo.BaseMutationOptions<UnlinkThreadsMutation, UnlinkThreadsMutationVariables>;
export const CreateTaskListDocument = gql`
    mutation CreateTaskList($input: CreateTaskListInput!) {
  createTaskList(input: $input) {
    ...ListTaskList
  }
}
    ${ListTaskListFragmentDoc}`;
export type CreateTaskListMutationFn = Apollo.MutationFunction<CreateTaskListMutation, CreateTaskListMutationVariables>;

/**
 * __useCreateTaskListMutation__
 *
 * To run a mutation, you first call `useCreateTaskListMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTaskListMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTaskListMutation, { data, loading, error }] = useCreateTaskListMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTaskListMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateTaskListMutation, CreateTaskListMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateTaskListMutation, CreateTaskListMutationVariables>(CreateTaskListDocument, options);
      }
export type CreateTaskListMutationHookResult = ReturnType<typeof useCreateTaskListMutation>;
export type CreateTaskListMutationResult = Apollo.MutationResult<CreateTaskListMutation>;
export type CreateTaskListMutationOptions = Apollo.BaseMutationOptions<CreateTaskListMutation, CreateTaskListMutationVariables>;
export const UpdateTaskListDocument = gql`
    mutation UpdateTaskList($input: UpdateTaskListInput!) {
  updateTaskList(input: $input) {
    ...ListTaskList
  }
}
    ${ListTaskListFragmentDoc}`;
export type UpdateTaskListMutationFn = Apollo.MutationFunction<UpdateTaskListMutation, UpdateTaskListMutationVariables>;

/**
 * __useUpdateTaskListMutation__
 *
 * To run a mutation, you first call `useUpdateTaskListMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTaskListMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateTaskListMutation, { data, loading, error }] = useUpdateTaskListMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateTaskListMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateTaskListMutation, UpdateTaskListMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateTaskListMutation, UpdateTaskListMutationVariables>(UpdateTaskListDocument, options);
      }
export type UpdateTaskListMutationHookResult = ReturnType<typeof useUpdateTaskListMutation>;
export type UpdateTaskListMutationResult = Apollo.MutationResult<UpdateTaskListMutation>;
export type UpdateTaskListMutationOptions = Apollo.BaseMutationOptions<UpdateTaskListMutation, UpdateTaskListMutationVariables>;
export const DeleteTaskListDocument = gql`
    mutation DeleteTaskList($id: ID!) {
  deleteTaskList(id: $id)
}
    `;
export type DeleteTaskListMutationFn = Apollo.MutationFunction<DeleteTaskListMutation, DeleteTaskListMutationVariables>;

/**
 * __useDeleteTaskListMutation__
 *
 * To run a mutation, you first call `useDeleteTaskListMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTaskListMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteTaskListMutation, { data, loading, error }] = useDeleteTaskListMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteTaskListMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteTaskListMutation, DeleteTaskListMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteTaskListMutation, DeleteTaskListMutationVariables>(DeleteTaskListDocument, options);
      }
export type DeleteTaskListMutationHookResult = ReturnType<typeof useDeleteTaskListMutation>;
export type DeleteTaskListMutationResult = Apollo.MutationResult<DeleteTaskListMutation>;
export type DeleteTaskListMutationOptions = Apollo.BaseMutationOptions<DeleteTaskListMutation, DeleteTaskListMutationVariables>;
export const ListMailAccountsDocument = gql`
    query ListMailAccounts($filters: MailAccountFilter, $pagination: OffsetPaginationInput) {
  mailAccounts(filters: $filters, pagination: $pagination) {
    ...ListMailAccount
  }
}
    ${ListMailAccountFragmentDoc}`;

/**
 * __useListMailAccountsQuery__
 *
 * To run a query within a React component, call `useListMailAccountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListMailAccountsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListMailAccountsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListMailAccountsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListMailAccountsQuery, ListMailAccountsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListMailAccountsQuery, ListMailAccountsQueryVariables>(ListMailAccountsDocument, options);
      }
export function useListMailAccountsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListMailAccountsQuery, ListMailAccountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListMailAccountsQuery, ListMailAccountsQueryVariables>(ListMailAccountsDocument, options);
        }
export type ListMailAccountsQueryHookResult = ReturnType<typeof useListMailAccountsQuery>;
export type ListMailAccountsLazyQueryHookResult = ReturnType<typeof useListMailAccountsLazyQuery>;
export type ListMailAccountsQueryResult = Apollo.QueryResult<ListMailAccountsQuery, ListMailAccountsQueryVariables>;
export const GetMailAccountDocument = gql`
    query GetMailAccount($id: ID!) {
  mailAccount(id: $id) {
    ...MailAccount
  }
}
    ${MailAccountFragmentDoc}`;

/**
 * __useGetMailAccountQuery__
 *
 * To run a query within a React component, call `useGetMailAccountQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMailAccountQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMailAccountQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetMailAccountQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetMailAccountQuery, GetMailAccountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetMailAccountQuery, GetMailAccountQueryVariables>(GetMailAccountDocument, options);
      }
export function useGetMailAccountLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetMailAccountQuery, GetMailAccountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetMailAccountQuery, GetMailAccountQueryVariables>(GetMailAccountDocument, options);
        }
export type GetMailAccountQueryHookResult = ReturnType<typeof useGetMailAccountQuery>;
export type GetMailAccountLazyQueryHookResult = ReturnType<typeof useGetMailAccountLazyQuery>;
export type GetMailAccountQueryResult = Apollo.QueryResult<GetMailAccountQuery, GetMailAccountQueryVariables>;
export const MailboxTreeDocument = gql`
    query MailboxTree {
  mailAccounts {
    ...ListMailAccount
    folders(filters: {syncEnabled: true}) {
      ...MailFolder
    }
  }
}
    ${ListMailAccountFragmentDoc}
${MailFolderFragmentDoc}`;

/**
 * __useMailboxTreeQuery__
 *
 * To run a query within a React component, call `useMailboxTreeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMailboxTreeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMailboxTreeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMailboxTreeQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MailboxTreeQuery, MailboxTreeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MailboxTreeQuery, MailboxTreeQueryVariables>(MailboxTreeDocument, options);
      }
export function useMailboxTreeLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MailboxTreeQuery, MailboxTreeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MailboxTreeQuery, MailboxTreeQueryVariables>(MailboxTreeDocument, options);
        }
export type MailboxTreeQueryHookResult = ReturnType<typeof useMailboxTreeQuery>;
export type MailboxTreeLazyQueryHookResult = ReturnType<typeof useMailboxTreeLazyQuery>;
export type MailboxTreeQueryResult = Apollo.QueryResult<MailboxTreeQuery, MailboxTreeQueryVariables>;
export const SenderAccountsDocument = gql`
    query SenderAccounts {
  mailAccounts(filters: {status: ACTIVE}) {
    ...SenderAccount
  }
}
    ${SenderAccountFragmentDoc}`;

/**
 * __useSenderAccountsQuery__
 *
 * To run a query within a React component, call `useSenderAccountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSenderAccountsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSenderAccountsQuery({
 *   variables: {
 *   },
 * });
 */
export function useSenderAccountsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SenderAccountsQuery, SenderAccountsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SenderAccountsQuery, SenderAccountsQueryVariables>(SenderAccountsDocument, options);
      }
export function useSenderAccountsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SenderAccountsQuery, SenderAccountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SenderAccountsQuery, SenderAccountsQueryVariables>(SenderAccountsDocument, options);
        }
export type SenderAccountsQueryHookResult = ReturnType<typeof useSenderAccountsQuery>;
export type SenderAccountsLazyQueryHookResult = ReturnType<typeof useSenderAccountsLazyQuery>;
export type SenderAccountsQueryResult = Apollo.QueryResult<SenderAccountsQuery, SenderAccountsQueryVariables>;
export const SearchMailAccountsDocument = gql`
    query SearchMailAccounts($search: String, $values: [ID!]) {
  options: mailAccounts(
    filters: {search: $search, ids: $values}
    pagination: {limit: 20}
  ) {
    value: id
    label: emailAddress
  }
}
    `;

/**
 * __useSearchMailAccountsQuery__
 *
 * To run a query within a React component, call `useSearchMailAccountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchMailAccountsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchMailAccountsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchMailAccountsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchMailAccountsQuery, SearchMailAccountsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchMailAccountsQuery, SearchMailAccountsQueryVariables>(SearchMailAccountsDocument, options);
      }
export function useSearchMailAccountsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchMailAccountsQuery, SearchMailAccountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchMailAccountsQuery, SearchMailAccountsQueryVariables>(SearchMailAccountsDocument, options);
        }
export type SearchMailAccountsQueryHookResult = ReturnType<typeof useSearchMailAccountsQuery>;
export type SearchMailAccountsLazyQueryHookResult = ReturnType<typeof useSearchMailAccountsLazyQuery>;
export type SearchMailAccountsQueryResult = Apollo.QueryResult<SearchMailAccountsQuery, SearchMailAccountsQueryVariables>;
export const MailPresetsDocument = gql`
    query MailPresets($address: String) {
  mailPresets(address: $address) {
    ...MailPreset
  }
}
    ${MailPresetFragmentDoc}`;

/**
 * __useMailPresetsQuery__
 *
 * To run a query within a React component, call `useMailPresetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMailPresetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMailPresetsQuery({
 *   variables: {
 *      address: // value for 'address'
 *   },
 * });
 */
export function useMailPresetsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MailPresetsQuery, MailPresetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MailPresetsQuery, MailPresetsQueryVariables>(MailPresetsDocument, options);
      }
export function useMailPresetsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MailPresetsQuery, MailPresetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MailPresetsQuery, MailPresetsQueryVariables>(MailPresetsDocument, options);
        }
export type MailPresetsQueryHookResult = ReturnType<typeof useMailPresetsQuery>;
export type MailPresetsLazyQueryHookResult = ReturnType<typeof useMailPresetsLazyQuery>;
export type MailPresetsQueryResult = Apollo.QueryResult<MailPresetsQuery, MailPresetsQueryVariables>;
export const OAuthProvidersDocument = gql`
    query OAuthProviders {
  oauthProviders
}
    `;

/**
 * __useOAuthProvidersQuery__
 *
 * To run a query within a React component, call `useOAuthProvidersQuery` and pass it any options that fit your needs.
 * When your component renders, `useOAuthProvidersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOAuthProvidersQuery({
 *   variables: {
 *   },
 * });
 */
export function useOAuthProvidersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<OAuthProvidersQuery, OAuthProvidersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<OAuthProvidersQuery, OAuthProvidersQueryVariables>(OAuthProvidersDocument, options);
      }
export function useOAuthProvidersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<OAuthProvidersQuery, OAuthProvidersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<OAuthProvidersQuery, OAuthProvidersQueryVariables>(OAuthProvidersDocument, options);
        }
export type OAuthProvidersQueryHookResult = ReturnType<typeof useOAuthProvidersQuery>;
export type OAuthProvidersLazyQueryHookResult = ReturnType<typeof useOAuthProvidersLazyQuery>;
export type OAuthProvidersQueryResult = Apollo.QueryResult<OAuthProvidersQuery, OAuthProvidersQueryVariables>;
export const AuthSessionDocument = gql`
    query AuthSession($state: String!) {
  authSession(state: $state) {
    ...AuthSession
  }
}
    ${AuthSessionFragmentDoc}`;

/**
 * __useAuthSessionQuery__
 *
 * To run a query within a React component, call `useAuthSessionQuery` and pass it any options that fit your needs.
 * When your component renders, `useAuthSessionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAuthSessionQuery({
 *   variables: {
 *      state: // value for 'state'
 *   },
 * });
 */
export function useAuthSessionQuery(baseOptions: ApolloReactHooks.QueryHookOptions<AuthSessionQuery, AuthSessionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AuthSessionQuery, AuthSessionQueryVariables>(AuthSessionDocument, options);
      }
export function useAuthSessionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AuthSessionQuery, AuthSessionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AuthSessionQuery, AuthSessionQueryVariables>(AuthSessionDocument, options);
        }
export type AuthSessionQueryHookResult = ReturnType<typeof useAuthSessionQuery>;
export type AuthSessionLazyQueryHookResult = ReturnType<typeof useAuthSessionLazyQuery>;
export type AuthSessionQueryResult = Apollo.QueryResult<AuthSessionQuery, AuthSessionQueryVariables>;
export const ListCategoriesDocument = gql`
    query ListCategories($filters: CategoryFilter, $pagination: OffsetPaginationInput) {
  categories(filters: $filters, pagination: $pagination) {
    ...Category
  }
}
    ${CategoryFragmentDoc}`;

/**
 * __useListCategoriesQuery__
 *
 * To run a query within a React component, call `useListCategoriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListCategoriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListCategoriesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListCategoriesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListCategoriesQuery, ListCategoriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListCategoriesQuery, ListCategoriesQueryVariables>(ListCategoriesDocument, options);
      }
export function useListCategoriesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListCategoriesQuery, ListCategoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListCategoriesQuery, ListCategoriesQueryVariables>(ListCategoriesDocument, options);
        }
export type ListCategoriesQueryHookResult = ReturnType<typeof useListCategoriesQuery>;
export type ListCategoriesLazyQueryHookResult = ReturnType<typeof useListCategoriesLazyQuery>;
export type ListCategoriesQueryResult = Apollo.QueryResult<ListCategoriesQuery, ListCategoriesQueryVariables>;
export const GetCategoryDocument = gql`
    query GetCategory($id: ID!) {
  category(id: $id) {
    ...Category
  }
}
    ${CategoryFragmentDoc}`;

/**
 * __useGetCategoryQuery__
 *
 * To run a query within a React component, call `useGetCategoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCategoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCategoryQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetCategoryQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetCategoryQuery, GetCategoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetCategoryQuery, GetCategoryQueryVariables>(GetCategoryDocument, options);
      }
export function useGetCategoryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetCategoryQuery, GetCategoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetCategoryQuery, GetCategoryQueryVariables>(GetCategoryDocument, options);
        }
export type GetCategoryQueryHookResult = ReturnType<typeof useGetCategoryQuery>;
export type GetCategoryLazyQueryHookResult = ReturnType<typeof useGetCategoryLazyQuery>;
export type GetCategoryQueryResult = Apollo.QueryResult<GetCategoryQuery, GetCategoryQueryVariables>;
export const ListMailChangesDocument = gql`
    query ListMailChanges($filters: MailChangeFilter, $pagination: OffsetPaginationInput) {
  mailChanges(filters: $filters, pagination: $pagination) {
    ...MailChange
  }
}
    ${MailChangeFragmentDoc}`;

/**
 * __useListMailChangesQuery__
 *
 * To run a query within a React component, call `useListMailChangesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListMailChangesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListMailChangesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListMailChangesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListMailChangesQuery, ListMailChangesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListMailChangesQuery, ListMailChangesQueryVariables>(ListMailChangesDocument, options);
      }
export function useListMailChangesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListMailChangesQuery, ListMailChangesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListMailChangesQuery, ListMailChangesQueryVariables>(ListMailChangesDocument, options);
        }
export type ListMailChangesQueryHookResult = ReturnType<typeof useListMailChangesQuery>;
export type ListMailChangesLazyQueryHookResult = ReturnType<typeof useListMailChangesLazyQuery>;
export type ListMailChangesQueryResult = Apollo.QueryResult<ListMailChangesQuery, ListMailChangesQueryVariables>;
export const MessageAttachmentAccessDocument = gql`
    query MessageAttachmentAccess($message: ID!, $host: String) {
  message(id: $message) {
    id
    attachments {
      id
      contentId
      filename
      store {
        id
        accessGrant(host: $host) {
          ...BigFileAccessGrant
        }
      }
    }
  }
}
    ${BigFileAccessGrantFragmentDoc}`;

/**
 * __useMessageAttachmentAccessQuery__
 *
 * To run a query within a React component, call `useMessageAttachmentAccessQuery` and pass it any options that fit your needs.
 * When your component renders, `useMessageAttachmentAccessQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMessageAttachmentAccessQuery({
 *   variables: {
 *      message: // value for 'message'
 *      host: // value for 'host'
 *   },
 * });
 */
export function useMessageAttachmentAccessQuery(baseOptions: ApolloReactHooks.QueryHookOptions<MessageAttachmentAccessQuery, MessageAttachmentAccessQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MessageAttachmentAccessQuery, MessageAttachmentAccessQueryVariables>(MessageAttachmentAccessDocument, options);
      }
export function useMessageAttachmentAccessLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MessageAttachmentAccessQuery, MessageAttachmentAccessQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MessageAttachmentAccessQuery, MessageAttachmentAccessQueryVariables>(MessageAttachmentAccessDocument, options);
        }
export type MessageAttachmentAccessQueryHookResult = ReturnType<typeof useMessageAttachmentAccessQuery>;
export type MessageAttachmentAccessLazyQueryHookResult = ReturnType<typeof useMessageAttachmentAccessLazyQuery>;
export type MessageAttachmentAccessQueryResult = Apollo.QueryResult<MessageAttachmentAccessQuery, MessageAttachmentAccessQueryVariables>;
export const ListMailFoldersDocument = gql`
    query ListMailFolders($filters: MailFolderFilter, $pagination: OffsetPaginationInput) {
  mailFolders(filters: $filters, pagination: $pagination) {
    ...MailFolder
  }
}
    ${MailFolderFragmentDoc}`;

/**
 * __useListMailFoldersQuery__
 *
 * To run a query within a React component, call `useListMailFoldersQuery` and pass it any options that fit your needs.
 * When your component renders, `useListMailFoldersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListMailFoldersQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListMailFoldersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListMailFoldersQuery, ListMailFoldersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListMailFoldersQuery, ListMailFoldersQueryVariables>(ListMailFoldersDocument, options);
      }
export function useListMailFoldersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListMailFoldersQuery, ListMailFoldersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListMailFoldersQuery, ListMailFoldersQueryVariables>(ListMailFoldersDocument, options);
        }
export type ListMailFoldersQueryHookResult = ReturnType<typeof useListMailFoldersQuery>;
export type ListMailFoldersLazyQueryHookResult = ReturnType<typeof useListMailFoldersLazyQuery>;
export type ListMailFoldersQueryResult = Apollo.QueryResult<ListMailFoldersQuery, ListMailFoldersQueryVariables>;
export const GetMailFolderDocument = gql`
    query GetMailFolder($id: ID!) {
  mailFolder(id: $id) {
    ...DetailMailFolder
  }
}
    ${DetailMailFolderFragmentDoc}`;

/**
 * __useGetMailFolderQuery__
 *
 * To run a query within a React component, call `useGetMailFolderQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMailFolderQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMailFolderQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetMailFolderQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetMailFolderQuery, GetMailFolderQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetMailFolderQuery, GetMailFolderQueryVariables>(GetMailFolderDocument, options);
      }
export function useGetMailFolderLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetMailFolderQuery, GetMailFolderQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetMailFolderQuery, GetMailFolderQueryVariables>(GetMailFolderDocument, options);
        }
export type GetMailFolderQueryHookResult = ReturnType<typeof useGetMailFolderQuery>;
export type GetMailFolderLazyQueryHookResult = ReturnType<typeof useGetMailFolderLazyQuery>;
export type GetMailFolderQueryResult = Apollo.QueryResult<GetMailFolderQuery, GetMailFolderQueryVariables>;
export const SearchMailFoldersDocument = gql`
    query SearchMailFolders($account: ID) {
  options: mailFolders(filters: {account: $account}, pagination: {limit: 200}) {
    value: id
    label: path
  }
}
    `;

/**
 * __useSearchMailFoldersQuery__
 *
 * To run a query within a React component, call `useSearchMailFoldersQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchMailFoldersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchMailFoldersQuery({
 *   variables: {
 *      account: // value for 'account'
 *   },
 * });
 */
export function useSearchMailFoldersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchMailFoldersQuery, SearchMailFoldersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchMailFoldersQuery, SearchMailFoldersQueryVariables>(SearchMailFoldersDocument, options);
      }
export function useSearchMailFoldersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchMailFoldersQuery, SearchMailFoldersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchMailFoldersQuery, SearchMailFoldersQueryVariables>(SearchMailFoldersDocument, options);
        }
export type SearchMailFoldersQueryHookResult = ReturnType<typeof useSearchMailFoldersQuery>;
export type SearchMailFoldersLazyQueryHookResult = ReturnType<typeof useSearchMailFoldersLazyQuery>;
export type SearchMailFoldersQueryResult = Apollo.QueryResult<SearchMailFoldersQuery, SearchMailFoldersQueryVariables>;
export const ListMessagesDocument = gql`
    query ListMessages($filters: MessageFilter, $ordering: [MessageOrder!]! = [], $pagination: OffsetPaginationInput) {
  messages(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListMessage
  }
}
    ${ListMessageFragmentDoc}`;

/**
 * __useListMessagesQuery__
 *
 * To run a query within a React component, call `useListMessagesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListMessagesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListMessagesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListMessagesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListMessagesQuery, ListMessagesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListMessagesQuery, ListMessagesQueryVariables>(ListMessagesDocument, options);
      }
export function useListMessagesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListMessagesQuery, ListMessagesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListMessagesQuery, ListMessagesQueryVariables>(ListMessagesDocument, options);
        }
export type ListMessagesQueryHookResult = ReturnType<typeof useListMessagesQuery>;
export type ListMessagesLazyQueryHookResult = ReturnType<typeof useListMessagesLazyQuery>;
export type ListMessagesQueryResult = Apollo.QueryResult<ListMessagesQuery, ListMessagesQueryVariables>;
export const GetMessageDocument = gql`
    query GetMessage($id: ID!, $allowRemote: Boolean! = false) {
  message(id: $id) {
    ...Message
  }
}
    ${MessageFragmentDoc}`;

/**
 * __useGetMessageQuery__
 *
 * To run a query within a React component, call `useGetMessageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMessageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMessageQuery({
 *   variables: {
 *      id: // value for 'id'
 *      allowRemote: // value for 'allowRemote'
 *   },
 * });
 */
export function useGetMessageQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetMessageQuery, GetMessageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetMessageQuery, GetMessageQueryVariables>(GetMessageDocument, options);
      }
export function useGetMessageLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetMessageQuery, GetMessageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetMessageQuery, GetMessageQueryVariables>(GetMessageDocument, options);
        }
export type GetMessageQueryHookResult = ReturnType<typeof useGetMessageQuery>;
export type GetMessageLazyQueryHookResult = ReturnType<typeof useGetMessageLazyQuery>;
export type GetMessageQueryResult = Apollo.QueryResult<GetMessageQuery, GetMessageQueryVariables>;
export const ListOutboxDocument = gql`
    query ListOutbox($filters: OutgoingMessageFilter, $pagination: OffsetPaginationInput) {
  outbox(filters: $filters, pagination: $pagination) {
    ...ListOutgoingMessage
  }
}
    ${ListOutgoingMessageFragmentDoc}`;

/**
 * __useListOutboxQuery__
 *
 * To run a query within a React component, call `useListOutboxQuery` and pass it any options that fit your needs.
 * When your component renders, `useListOutboxQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListOutboxQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListOutboxQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListOutboxQuery, ListOutboxQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListOutboxQuery, ListOutboxQueryVariables>(ListOutboxDocument, options);
      }
export function useListOutboxLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListOutboxQuery, ListOutboxQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListOutboxQuery, ListOutboxQueryVariables>(ListOutboxDocument, options);
        }
export type ListOutboxQueryHookResult = ReturnType<typeof useListOutboxQuery>;
export type ListOutboxLazyQueryHookResult = ReturnType<typeof useListOutboxLazyQuery>;
export type ListOutboxQueryResult = Apollo.QueryResult<ListOutboxQuery, ListOutboxQueryVariables>;
export const GetOutgoingMessageDocument = gql`
    query GetOutgoingMessage($id: ID!) {
  outgoingMessage(id: $id) {
    ...OutgoingMessage
  }
}
    ${OutgoingMessageFragmentDoc}`;

/**
 * __useGetOutgoingMessageQuery__
 *
 * To run a query within a React component, call `useGetOutgoingMessageQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOutgoingMessageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOutgoingMessageQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetOutgoingMessageQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetOutgoingMessageQuery, GetOutgoingMessageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetOutgoingMessageQuery, GetOutgoingMessageQueryVariables>(GetOutgoingMessageDocument, options);
      }
export function useGetOutgoingMessageLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetOutgoingMessageQuery, GetOutgoingMessageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetOutgoingMessageQuery, GetOutgoingMessageQueryVariables>(GetOutgoingMessageDocument, options);
        }
export type GetOutgoingMessageQueryHookResult = ReturnType<typeof useGetOutgoingMessageQuery>;
export type GetOutgoingMessageLazyQueryHookResult = ReturnType<typeof useGetOutgoingMessageLazyQuery>;
export type GetOutgoingMessageQueryResult = Apollo.QueryResult<GetOutgoingMessageQuery, GetOutgoingMessageQueryVariables>;
export const KuvertPaletteSearchDocument = gql`
    query KuvertPaletteSearch($search: String!, $limit: Int!) {
  messages(filters: {search: $search}, pagination: {limit: $limit}) {
    id
    subject
    senderName
    senderAddress
    date
  }
}
    `;

/**
 * __useKuvertPaletteSearchQuery__
 *
 * To run a query within a React component, call `useKuvertPaletteSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useKuvertPaletteSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useKuvertPaletteSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useKuvertPaletteSearchQuery(baseOptions: ApolloReactHooks.QueryHookOptions<KuvertPaletteSearchQuery, KuvertPaletteSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<KuvertPaletteSearchQuery, KuvertPaletteSearchQueryVariables>(KuvertPaletteSearchDocument, options);
      }
export function useKuvertPaletteSearchLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<KuvertPaletteSearchQuery, KuvertPaletteSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<KuvertPaletteSearchQuery, KuvertPaletteSearchQueryVariables>(KuvertPaletteSearchDocument, options);
        }
export type KuvertPaletteSearchQueryHookResult = ReturnType<typeof useKuvertPaletteSearchQuery>;
export type KuvertPaletteSearchLazyQueryHookResult = ReturnType<typeof useKuvertPaletteSearchLazyQuery>;
export type KuvertPaletteSearchQueryResult = Apollo.QueryResult<KuvertPaletteSearchQuery, KuvertPaletteSearchQueryVariables>;
export const ListTasksDocument = gql`
    query ListTasks($filters: TaskFilter, $ordering: [TaskOrder!]! = [{position: ASC}], $pagination: OffsetPaginationInput) {
  tasks(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListTask
  }
}
    ${ListTaskFragmentDoc}`;

/**
 * __useListTasksQuery__
 *
 * To run a query within a React component, call `useListTasksQuery` and pass it any options that fit your needs.
 * When your component renders, `useListTasksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListTasksQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListTasksQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListTasksQuery, ListTasksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListTasksQuery, ListTasksQueryVariables>(ListTasksDocument, options);
      }
export function useListTasksLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListTasksQuery, ListTasksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListTasksQuery, ListTasksQueryVariables>(ListTasksDocument, options);
        }
export type ListTasksQueryHookResult = ReturnType<typeof useListTasksQuery>;
export type ListTasksLazyQueryHookResult = ReturnType<typeof useListTasksLazyQuery>;
export type ListTasksQueryResult = Apollo.QueryResult<ListTasksQuery, ListTasksQueryVariables>;
export const TasksCountDocument = gql`
    query TasksCount($filters: TaskFilter) {
  tasksCount(filters: $filters)
}
    `;

/**
 * __useTasksCountQuery__
 *
 * To run a query within a React component, call `useTasksCountQuery` and pass it any options that fit your needs.
 * When your component renders, `useTasksCountQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTasksCountQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useTasksCountQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TasksCountQuery, TasksCountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<TasksCountQuery, TasksCountQueryVariables>(TasksCountDocument, options);
      }
export function useTasksCountLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TasksCountQuery, TasksCountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<TasksCountQuery, TasksCountQueryVariables>(TasksCountDocument, options);
        }
export type TasksCountQueryHookResult = ReturnType<typeof useTasksCountQuery>;
export type TasksCountLazyQueryHookResult = ReturnType<typeof useTasksCountLazyQuery>;
export type TasksCountQueryResult = Apollo.QueryResult<TasksCountQuery, TasksCountQueryVariables>;
export const GetTaskDocument = gql`
    query GetTask($id: ID!, $inFolder: ID, $inRole: FolderRole) {
  task(id: $id) {
    ...Task
  }
}
    ${TaskFragmentDoc}`;

/**
 * __useGetTaskQuery__
 *
 * To run a query within a React component, call `useGetTaskQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTaskQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTaskQuery({
 *   variables: {
 *      id: // value for 'id'
 *      inFolder: // value for 'inFolder'
 *      inRole: // value for 'inRole'
 *   },
 * });
 */
export function useGetTaskQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetTaskQuery, GetTaskQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetTaskQuery, GetTaskQueryVariables>(GetTaskDocument, options);
      }
export function useGetTaskLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetTaskQuery, GetTaskQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetTaskQuery, GetTaskQueryVariables>(GetTaskDocument, options);
        }
export type GetTaskQueryHookResult = ReturnType<typeof useGetTaskQuery>;
export type GetTaskLazyQueryHookResult = ReturnType<typeof useGetTaskLazyQuery>;
export type GetTaskQueryResult = Apollo.QueryResult<GetTaskQuery, GetTaskQueryVariables>;
export const ListTaskListsDocument = gql`
    query ListTaskLists($filters: TaskListFilter, $pagination: OffsetPaginationInput) {
  taskLists(filters: $filters, pagination: $pagination) {
    ...ListTaskList
  }
}
    ${ListTaskListFragmentDoc}`;

/**
 * __useListTaskListsQuery__
 *
 * To run a query within a React component, call `useListTaskListsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListTaskListsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListTaskListsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListTaskListsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListTaskListsQuery, ListTaskListsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListTaskListsQuery, ListTaskListsQueryVariables>(ListTaskListsDocument, options);
      }
export function useListTaskListsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListTaskListsQuery, ListTaskListsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListTaskListsQuery, ListTaskListsQueryVariables>(ListTaskListsDocument, options);
        }
export type ListTaskListsQueryHookResult = ReturnType<typeof useListTaskListsQuery>;
export type ListTaskListsLazyQueryHookResult = ReturnType<typeof useListTaskListsLazyQuery>;
export type ListTaskListsQueryResult = Apollo.QueryResult<ListTaskListsQuery, ListTaskListsQueryVariables>;
export const GetTaskListDocument = gql`
    query GetTaskList($id: ID!) {
  taskList(id: $id) {
    ...ListTaskList
  }
}
    ${ListTaskListFragmentDoc}`;

/**
 * __useGetTaskListQuery__
 *
 * To run a query within a React component, call `useGetTaskListQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTaskListQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTaskListQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetTaskListQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetTaskListQuery, GetTaskListQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetTaskListQuery, GetTaskListQueryVariables>(GetTaskListDocument, options);
      }
export function useGetTaskListLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetTaskListQuery, GetTaskListQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetTaskListQuery, GetTaskListQueryVariables>(GetTaskListDocument, options);
        }
export type GetTaskListQueryHookResult = ReturnType<typeof useGetTaskListQuery>;
export type GetTaskListLazyQueryHookResult = ReturnType<typeof useGetTaskListLazyQuery>;
export type GetTaskListQueryResult = Apollo.QueryResult<GetTaskListQuery, GetTaskListQueryVariables>;
export const SearchTasksDocument = gql`
    query SearchTasks($search: String, $values: [ID!]) {
  options: tasks(
    filters: {search: $search, ids: $values, status: OPEN}
    pagination: {limit: 20}
  ) {
    value: id
    label: title
  }
}
    `;

/**
 * __useSearchTasksQuery__
 *
 * To run a query within a React component, call `useSearchTasksQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchTasksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchTasksQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchTasksQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchTasksQuery, SearchTasksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchTasksQuery, SearchTasksQueryVariables>(SearchTasksDocument, options);
      }
export function useSearchTasksLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchTasksQuery, SearchTasksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchTasksQuery, SearchTasksQueryVariables>(SearchTasksDocument, options);
        }
export type SearchTasksQueryHookResult = ReturnType<typeof useSearchTasksQuery>;
export type SearchTasksLazyQueryHookResult = ReturnType<typeof useSearchTasksLazyQuery>;
export type SearchTasksQueryResult = Apollo.QueryResult<SearchTasksQuery, SearchTasksQueryVariables>;
export const SearchTaskListsDocument = gql`
    query SearchTaskLists($search: String, $values: [ID!]) {
  options: taskLists(
    filters: {search: $search, ids: $values}
    pagination: {limit: 50}
  ) {
    value: id
    label: name
  }
}
    `;

/**
 * __useSearchTaskListsQuery__
 *
 * To run a query within a React component, call `useSearchTaskListsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchTaskListsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchTaskListsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchTaskListsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchTaskListsQuery, SearchTaskListsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchTaskListsQuery, SearchTaskListsQueryVariables>(SearchTaskListsDocument, options);
      }
export function useSearchTaskListsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchTaskListsQuery, SearchTaskListsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchTaskListsQuery, SearchTaskListsQueryVariables>(SearchTaskListsDocument, options);
        }
export type SearchTaskListsQueryHookResult = ReturnType<typeof useSearchTaskListsQuery>;
export type SearchTaskListsLazyQueryHookResult = ReturnType<typeof useSearchTaskListsLazyQuery>;
export type SearchTaskListsQueryResult = Apollo.QueryResult<SearchTaskListsQuery, SearchTaskListsQueryVariables>;
export const ListThreadsDocument = gql`
    query ListThreads($filters: ThreadFilter, $ordering: [ThreadOrder!]! = [{lastMessageAt: DESC}], $pagination: OffsetPaginationInput, $inFolder: ID, $inRole: FolderRole) {
  threads(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListThread
  }
}
    ${ListThreadFragmentDoc}`;

/**
 * __useListThreadsQuery__
 *
 * To run a query within a React component, call `useListThreadsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListThreadsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListThreadsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *      inFolder: // value for 'inFolder'
 *      inRole: // value for 'inRole'
 *   },
 * });
 */
export function useListThreadsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListThreadsQuery, ListThreadsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListThreadsQuery, ListThreadsQueryVariables>(ListThreadsDocument, options);
      }
export function useListThreadsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListThreadsQuery, ListThreadsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListThreadsQuery, ListThreadsQueryVariables>(ListThreadsDocument, options);
        }
export type ListThreadsQueryHookResult = ReturnType<typeof useListThreadsQuery>;
export type ListThreadsLazyQueryHookResult = ReturnType<typeof useListThreadsLazyQuery>;
export type ListThreadsQueryResult = Apollo.QueryResult<ListThreadsQuery, ListThreadsQueryVariables>;
export const GetThreadDocument = gql`
    query GetThread($id: ID!, $allowRemote: Boolean! = false) {
  thread(id: $id) {
    ...Thread
  }
}
    ${ThreadFragmentDoc}`;

/**
 * __useGetThreadQuery__
 *
 * To run a query within a React component, call `useGetThreadQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetThreadQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetThreadQuery({
 *   variables: {
 *      id: // value for 'id'
 *      allowRemote: // value for 'allowRemote'
 *   },
 * });
 */
export function useGetThreadQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetThreadQuery, GetThreadQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetThreadQuery, GetThreadQueryVariables>(GetThreadDocument, options);
      }
export function useGetThreadLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetThreadQuery, GetThreadQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetThreadQuery, GetThreadQueryVariables>(GetThreadDocument, options);
        }
export type GetThreadQueryHookResult = ReturnType<typeof useGetThreadQuery>;
export type GetThreadLazyQueryHookResult = ReturnType<typeof useGetThreadLazyQuery>;
export type GetThreadQueryResult = Apollo.QueryResult<GetThreadQuery, GetThreadQueryVariables>;
export const ThreadMessageIdsDocument = gql`
    query ThreadMessageIds($id: ID!) {
  thread(id: $id) {
    id
    account {
      id
    }
    messages {
      id
    }
  }
}
    `;

/**
 * __useThreadMessageIdsQuery__
 *
 * To run a query within a React component, call `useThreadMessageIdsQuery` and pass it any options that fit your needs.
 * When your component renders, `useThreadMessageIdsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useThreadMessageIdsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useThreadMessageIdsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<ThreadMessageIdsQuery, ThreadMessageIdsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ThreadMessageIdsQuery, ThreadMessageIdsQueryVariables>(ThreadMessageIdsDocument, options);
      }
export function useThreadMessageIdsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ThreadMessageIdsQuery, ThreadMessageIdsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ThreadMessageIdsQuery, ThreadMessageIdsQueryVariables>(ThreadMessageIdsDocument, options);
        }
export type ThreadMessageIdsQueryHookResult = ReturnType<typeof useThreadMessageIdsQuery>;
export type ThreadMessageIdsLazyQueryHookResult = ReturnType<typeof useThreadMessageIdsLazyQuery>;
export type ThreadMessageIdsQueryResult = Apollo.QueryResult<ThreadMessageIdsQuery, ThreadMessageIdsQueryVariables>;
export const ThreadsCountDocument = gql`
    query ThreadsCount($filters: ThreadFilter) {
  threadsCount(filters: $filters)
}
    `;

/**
 * __useThreadsCountQuery__
 *
 * To run a query within a React component, call `useThreadsCountQuery` and pass it any options that fit your needs.
 * When your component renders, `useThreadsCountQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useThreadsCountQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useThreadsCountQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ThreadsCountQuery, ThreadsCountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ThreadsCountQuery, ThreadsCountQueryVariables>(ThreadsCountDocument, options);
      }
export function useThreadsCountLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ThreadsCountQuery, ThreadsCountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ThreadsCountQuery, ThreadsCountQueryVariables>(ThreadsCountDocument, options);
        }
export type ThreadsCountQueryHookResult = ReturnType<typeof useThreadsCountQuery>;
export type ThreadsCountLazyQueryHookResult = ReturnType<typeof useThreadsCountLazyQuery>;
export type ThreadsCountQueryResult = Apollo.QueryResult<ThreadsCountQuery, ThreadsCountQueryVariables>;
export const MailboxSyncsDocument = gql`
    subscription MailboxSyncs {
  mailboxSyncs {
    accountId
    created
    updated
    deleted
    more
  }
}
    `;

/**
 * __useMailboxSyncsSubscription__
 *
 * To run a query within a React component, call `useMailboxSyncsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useMailboxSyncsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMailboxSyncsSubscription({
 *   variables: {
 *   },
 * });
 */
export function useMailboxSyncsSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<MailboxSyncsSubscription, MailboxSyncsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<MailboxSyncsSubscription, MailboxSyncsSubscriptionVariables>(MailboxSyncsDocument, options);
      }
export type MailboxSyncsSubscriptionHookResult = ReturnType<typeof useMailboxSyncsSubscription>;
export type MailboxSyncsSubscriptionResult = Apollo.SubscriptionResult<MailboxSyncsSubscription>;