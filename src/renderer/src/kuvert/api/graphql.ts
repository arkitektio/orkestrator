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

/** How the service logs in. PASSWORD: Username and (app) password; XOAUTH2: OAuth 2.0 access token (SASL XOAUTH2). */
export enum AuthMethod {
  Password = 'PASSWORD',
  Xoauth2 = 'XOAUTH2'
}

/** A started OAuth login: open `openUrl`; the provider redirects to `redirectUrl` with `?code&state`; call `completeOAuthLink` with them. */
export type AuthSession = {
  __typename?: 'AuthSession';
  /** The mailbox this login re-links, if it does. */
  account?: Maybe<MailAccount>;
  expiresAt: Scalars['DateTime']['output'];
  /** How the login finishes: REDIRECT (catch the redirect, then `completeOAuthLink`). */
  finish: Scalars['String']['output'];
  openUrl: Scalars['String']['output'];
  provider: Provider;
  redirectUrl: Scalars['String']['output'];
  state: Scalars['String']['output'];
};

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

/** What the provider's redirect carried. */
export type CompleteOAuthLinkInput = {
  code: Scalars['String']['input'];
  state: Scalars['String']['input'];
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

/** Delete messages: into Trash, or for good. */
export type DeleteMessagesInput = {
  messages: Array<Scalars['ID']['input']>;
  /** Expunge instead of moving to Trash (messages already in Trash are always expunged). */
  permanent?: Scalars['Boolean']['input'];
};

/** What a delete did. */
export type DeleteResult = {
  __typename?: 'DeleteResult';
  /** Messages deleted or moved to Trash. */
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
  /** When the mailbox was linked. */
  createdAt: Scalars['DateTime']['output'];
  /** The member who linked the mailbox; only they change its credentials or sharing. */
  creator?: Maybe<User>;
  /** The sender name of sent mail. */
  displayName: Scalars['String']['output'];
  /** The mailbox's address; the From of sent mail. */
  emailAddress: Scalars['String']['output'];
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
  /** POP3: keep downloaded mail on the server. Off deletes it there once stored. */
  popLeaveOnServer: Scalars['Boolean']['output'];
  /** How incoming mail is read. */
  protocol: Protocol;
  /** Who hosts the mailbox. */
  provider: Provider;
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
  /** Unread messages over the synced folders, as the server counts them. */
  unreadCount: Scalars['Int']['output'];
  /** The login name (usually the address). */
  username: Scalars['String']['output'];
  /** Who in the organization sees the mailbox and its mail. */
  visibility: Visibility;
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

/** What went wrong, for a client to offer a fix. Also stored as ``last_error_code``. NOT_CONFIGURED: The service is not configured for this (an OAuth client, the datalayer); AUTH_FAILED: The server refused the username or password; CONSENT_EXPIRED: The OAuth grant was revoked or ran out; link the mailbox again; CONNECTION_FAILED: The server could not be reached, or the connection broke; TLS_FAILED: The TLS handshake failed (certificate or protocol); TLS_REQUIRED: The mailbox asks for a connection without TLS, which is not allowed; HOST_NOT_ALLOWED: The host resolves to a private or internal address; SYNC_IN_PROGRESS: Another sync holds this mailbox right now; RATE_LIMITED: Synced too recently; try again later; SERVER_ERROR: The server answered a command with an error; SEND_REJECTED: The SMTP server refused the message or a recipient; UNSUPPORTED_BY_PROTOCOL: POP3 cannot do this (folders, flags on the server); MAILBOX_INACTIVE: The mailbox is disabled or needs new credentials; INVALID_STATE: The link state is unknown, used or belongs to someone else; CODE_EXPIRED: The link was not completed in time; PROVIDER_ERROR: The OAuth provider answered with an error. */
export enum MailErrorCode {
  AuthFailed = 'AUTH_FAILED',
  CodeExpired = 'CODE_EXPIRED',
  ConnectionFailed = 'CONNECTION_FAILED',
  ConsentExpired = 'CONSENT_EXPIRED',
  HostNotAllowed = 'HOST_NOT_ALLOWED',
  InvalidState = 'INVALID_STATE',
  MailboxInactive = 'MAILBOX_INACTIVE',
  NotConfigured = 'NOT_CONFIGURED',
  ProviderError = 'PROVIDER_ERROR',
  RateLimited = 'RATE_LIMITED',
  SendRejected = 'SEND_REJECTED',
  ServerError = 'SERVER_ERROR',
  SyncInProgress = 'SYNC_IN_PROGRESS',
  TlsFailed = 'TLS_FAILED',
  TlsRequired = 'TLS_REQUIRED',
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
  /** Whether syncs read this folder. */
  syncEnabled: Scalars['Boolean']['output'];
  /** Messages in the folder, as the server counts them. */
  totalCount: Scalars['Int']['output'];
  /** Unread messages in the folder, as the server counts them. */
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
  /** Cc addresses. */
  cc: Array<Address>;
  /** When the message was first stored. */
  createdAt: Scalars['DateTime']['output'];
  /** The Date header (else when the server received it). */
  date?: Maybe<Scalars['DateTime']['output']>;
  /** IMAP flags and keywords (\Seen, \Flagged, \Answered, \Draft, $Label…). */
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
  /** The message size in bytes. */
  size: Scalars['Int']['output'];
  /** The start of the text, for list views. */
  snippet: Scalars['String']['output'];
  /** The decoded subject. */
  subject: Scalars['String']['output'];
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
  /** Drop the caller's pending OAuth login. */
  cancelOAuthLink: Scalars['String']['output'];
  /** Finish an OAuth login with the redirect's code and state. */
  completeOAuthLink: MailAccount;
  /** Link a mailbox with a username and (app) password; the login is tested first. */
  createMailAccount: MailAccount;
  /** Unlink a mailbox (owner only). Mail on the server is untouched. */
  deleteMailAccount: Scalars['ID']['output'];
  /** Delete messages (into Trash, or for good). */
  deleteMessages: DeleteResult;
  /** Finalize the caller's file upload after the client has written the object. */
  finishBigfileUpload: BigFileStore;
  /** Mark messages read or unread. */
  markMessagesRead: Array<Message>;
  /** Move messages to another folder of their mailbox. */
  moveMessages: Array<Message>;
  /** Request temporary S3 credentials to upload one file (an attachment to send). */
  requestBigfileUpload: BigFileUploadGrant;
  /** The caller's pending OAuth login again. */
  resumeOAuthLink: AuthSession;
  /** Send a message through a mailbox's SMTP server. */
  sendMessage: OutgoingMessage;
  /** Add and remove flags of messages. */
  setMessageFlags: Array<Message>;
  /** Set who sees a mailbox (owner only). */
  shareMailAccount: MailAccount;
  /** Start linking (or re-linking) a mailbox through OAuth. */
  startOAuthLink: AuthSession;
  /** Sync a mailbox now. */
  syncMailAccount: SyncResult;
  /** Log in to a mailbox's servers now. */
  testMailAccount: MailAccount;
  /** Change a mailbox (owner only); new servers or credentials are tested first. */
  updateMailAccount: MailAccount;
  /** Turn syncing a folder on or off. */
  updateMailFolder: MailFolder;
};


export type MutationCancelOAuthLinkArgs = {
  state: Scalars['String']['input'];
};


export type MutationCompleteOAuthLinkArgs = {
  input: CompleteOAuthLinkInput;
};


export type MutationCreateMailAccountArgs = {
  input: CreateMailAccountInput;
};


export type MutationDeleteMailAccountArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMessagesArgs = {
  input: DeleteMessagesInput;
};


export type MutationFinishBigfileUploadArgs = {
  input: FinishBigFileUploadInput;
};


export type MutationMarkMessagesReadArgs = {
  input: MarkMessagesInput;
};


export type MutationMoveMessagesArgs = {
  input: MoveMessagesInput;
};


export type MutationRequestBigfileUploadArgs = {
  input: RequestBigFileUploadInput;
};


export type MutationResumeOAuthLinkArgs = {
  state: Scalars['String']['input'];
};


export type MutationSendMessageArgs = {
  input: SendMessageInput;
};


export type MutationSetMessageFlagsArgs = {
  input: SetMessageFlagsInput;
};


export type MutationShareMailAccountArgs = {
  input: ShareMailAccountInput;
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


export type MutationUpdateMailAccountArgs = {
  input: UpdateMailAccountInput;
};


export type MutationUpdateMailFolderArgs = {
  input: UpdateMailFolderInput;
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

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** A mailbox by id. */
  mailAccount: MailAccount;
  /** The mailboxes the caller sees: their own, shared with them, and the organization's. */
  mailAccounts: Array<MailAccount>;
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


export type QueryMailAccountArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMailAccountsArgs = {
  filters?: InputMaybe<MailAccountFilter>;
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

/** Who sees a mailbox. */
export type ShareMailAccountInput = {
  id: Scalars['ID']['input'];
  /** The members a SHARED mailbox is shared with (replaces the list). Must be members of the organization. */
  users?: InputMaybe<Array<Scalars['ID']['input']>>;
  visibility: Visibility;
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

/** A conversation: messages linked by In-Reply-To/References, across the mailbox's folders. */
export type Thread = {
  __typename?: 'Thread';
  /** The mailbox the conversation is in. */
  account: MailAccount;
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
  flagged?: InputMaybe<Scalars['Boolean']['input']>;
  folder?: InputMaybe<Scalars['ID']['input']>;
  folderRole?: InputMaybe<FolderRole>;
  hasAttachments?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only conversations with a message matching the text: the same substring and meaning search as `messages(filters: {search})`. */
  search?: InputMaybe<Scalars['String']['input']>;
  unread?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ThreadOrder =
  { lastMessageAt: Ordering; messageCount?: never; }
  |  { lastMessageAt?: never; messageCount: Ordering; };

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

export type _Entity = Attachment | BigFileStore | MailAccount | MailFolder | Message | Organization | OutgoingMessage | Thread | User;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type ListMailAccountFragment = { __typename?: 'MailAccount', id: string, name: string, emailAddress: string, displayName: string, provider: Provider, status: MailAccountStatus, protocol: Protocol, visibility: Visibility, authMethod: AuthMethod, lastSyncedAt?: string | null, lastError?: string | null, lastErrorCode?: MailErrorCode | null, syncing: boolean, canSend: boolean, isOwner: boolean, unreadCount: number };

export type MailAccountFragment = (
  { __typename?: 'MailAccount', incomingHost: string, incomingPort: number, incomingSecurity: Security, smtpHost?: string | null, smtpPort?: number | null, smtpSecurity: Security, username: string, saveSentCopy: boolean, popLeaveOnServer: boolean, capabilities: Array<string>, backfillDone: boolean, serverSideFolders: boolean, createdAt: string, creator?: { __typename?: 'User', id: string, sub: string, preferredUsername: string } | null, sharedWith: Array<{ __typename?: 'User', id: string, sub: string, preferredUsername: string }>, folders: Array<(
    { __typename?: 'MailFolder' }
    & MailFolderFragment
  )> }
  & ListMailAccountFragment
);

export type SenderAccountFragment = { __typename?: 'MailAccount', id: string, name: string, emailAddress: string, displayName: string, canSend: boolean, status: MailAccountStatus };

export type AttachmentFragment = { __typename?: 'Attachment', id: string, position: number, filename: string, contentType: string, size: number, contentId?: string | null, inline: boolean, store?: { __typename?: 'BigFileStore', id: string } | null };

export type AuthSessionFragment = { __typename?: 'AuthSession', state: string, openUrl: string, expiresAt: string, finish: string, redirectUrl: string, provider: Provider, account?: { __typename?: 'MailAccount', id: string, name: string, emailAddress: string } | null };

export type BigFileAccessGrantFragment = { __typename?: 'BigFileAccessGrant', accessKey: string, secretKey: string, sessionToken: string, region: string, expiresIn: number, path: string, key: string, bucket: string };

export type BigFileUploadGrantFragment = { __typename?: 'BigFileUploadGrant', accessKey: string, secretKey: string, sessionToken: string, region: string, path: string, key: string, bucket: string, expiresIn: number, maxBytes: number, store: string };

export type MailFolderFragment = { __typename?: 'MailFolder', id: string, path: string, name: string, role: FolderRole, selectable: boolean, syncEnabled: boolean, existsOnServer: boolean, totalCount: number, unreadCount: number, backfillDone: boolean, lastSyncedAt?: string | null };

export type DetailMailFolderFragment = (
  { __typename?: 'MailFolder', delimiter?: string | null, account: (
    { __typename?: 'MailAccount' }
    & ListMailAccountFragment
  ) }
  & MailFolderFragment
);

export type AddressFragment = { __typename?: 'Address', name: string, address: string };

export type ListMessageFragment = { __typename?: 'Message', id: string, subject: string, senderName: string, senderAddress: string, date?: string | null, snippet: string, isRead: boolean, isFlagged: boolean, isAnswered: boolean, hasAttachments: boolean, account: { __typename?: 'MailAccount', id: string, name: string, emailAddress: string, canSend: boolean }, folder: { __typename?: 'MailFolder', id: string, name: string, role: FolderRole }, thread?: { __typename?: 'Thread', id: string, messageCount: number } | null };

export type MessageFragment = (
  { __typename?: 'Message', messageId?: string | null, receivedAt?: string | null, textBody: string, hasRemoteImages: boolean, size: number, flags: Array<string>, truncated: boolean, html?: string | null, sender: (
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

export type ListThreadFragment = { __typename?: 'Thread', id: string, subject: string, lastMessageAt?: string | null, messageCount: number, unread: boolean, flagged: boolean, hasAttachments: boolean, unreadCount: number, participants: Array<(
    { __typename?: 'Address' }
    & AddressFragment
  )>, account: { __typename?: 'MailAccount', id: string, name: string, emailAddress: string }, latestMessage?: (
    { __typename?: 'Message' }
    & ListMessageFragment
  ) | null };

export type ThreadFragment = { __typename?: 'Thread', id: string, subject: string, lastMessageAt?: string | null, messageCount: number, unread: boolean, account: (
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

export type MessageStateFragment = { __typename?: 'Message', id: string, flags: Array<string>, isRead: boolean, isFlagged: boolean, isAnswered: boolean, folder: { __typename?: 'MailFolder', id: string, name: string, role: FolderRole } };

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

export type CompleteOAuthLinkMutationVariables = Exact<{
  input: CompleteOAuthLinkInput;
}>;


export type CompleteOAuthLinkMutation = { __typename?: 'Mutation', completeOAuthLink: (
    { __typename?: 'MailAccount' }
    & ListMailAccountFragment
  ) };

export type ResumeOAuthLinkMutationVariables = Exact<{
  state: Scalars['String']['input'];
}>;


export type ResumeOAuthLinkMutation = { __typename?: 'Mutation', resumeOAuthLink: (
    { __typename?: 'AuthSession' }
    & AuthSessionFragment
  ) };

export type CancelOAuthLinkMutationVariables = Exact<{
  state: Scalars['String']['input'];
}>;


export type CancelOAuthLinkMutation = { __typename?: 'Mutation', cancelOAuthLink: string };

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
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
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
  backfillDone
  lastSyncedAt
}
    `;
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
}
    ${ListMailAccountFragmentDoc}
${MailFolderFragmentDoc}`;
export const AuthSessionFragmentDoc = gql`
    fragment AuthSession on AuthSession {
  state
  openUrl
  expiresAt
  finish
  redirectUrl
  provider
  account {
    id
    name
    emailAddress
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
    `;
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
${AddressFragmentDoc}
${AttachmentFragmentDoc}`;
export const ThreadFragmentDoc = gql`
    fragment Thread on Thread {
  id
  subject
  lastMessageAt
  messageCount
  unread
  account {
    ...SenderAccount
  }
  messages {
    ...Message
  }
}
    ${SenderAccountFragmentDoc}
${MessageFragmentDoc}`;
export const MessageStateFragmentDoc = gql`
    fragment MessageState on Message {
  id
  flags
  isRead
  isFlagged
  isAnswered
  folder {
    id
    name
    role
  }
}
    `;
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
export const CompleteOAuthLinkDocument = gql`
    mutation CompleteOAuthLink($input: CompleteOAuthLinkInput!) {
  completeOAuthLink(input: $input) {
    ...ListMailAccount
  }
}
    ${ListMailAccountFragmentDoc}`;
export type CompleteOAuthLinkMutationFn = Apollo.MutationFunction<CompleteOAuthLinkMutation, CompleteOAuthLinkMutationVariables>;

/**
 * __useCompleteOAuthLinkMutation__
 *
 * To run a mutation, you first call `useCompleteOAuthLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCompleteOAuthLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [completeOAuthLinkMutation, { data, loading, error }] = useCompleteOAuthLinkMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCompleteOAuthLinkMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CompleteOAuthLinkMutation, CompleteOAuthLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CompleteOAuthLinkMutation, CompleteOAuthLinkMutationVariables>(CompleteOAuthLinkDocument, options);
      }
export type CompleteOAuthLinkMutationHookResult = ReturnType<typeof useCompleteOAuthLinkMutation>;
export type CompleteOAuthLinkMutationResult = Apollo.MutationResult<CompleteOAuthLinkMutation>;
export type CompleteOAuthLinkMutationOptions = Apollo.BaseMutationOptions<CompleteOAuthLinkMutation, CompleteOAuthLinkMutationVariables>;
export const ResumeOAuthLinkDocument = gql`
    mutation ResumeOAuthLink($state: String!) {
  resumeOAuthLink(state: $state) {
    ...AuthSession
  }
}
    ${AuthSessionFragmentDoc}`;
export type ResumeOAuthLinkMutationFn = Apollo.MutationFunction<ResumeOAuthLinkMutation, ResumeOAuthLinkMutationVariables>;

/**
 * __useResumeOAuthLinkMutation__
 *
 * To run a mutation, you first call `useResumeOAuthLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResumeOAuthLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resumeOAuthLinkMutation, { data, loading, error }] = useResumeOAuthLinkMutation({
 *   variables: {
 *      state: // value for 'state'
 *   },
 * });
 */
export function useResumeOAuthLinkMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ResumeOAuthLinkMutation, ResumeOAuthLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ResumeOAuthLinkMutation, ResumeOAuthLinkMutationVariables>(ResumeOAuthLinkDocument, options);
      }
export type ResumeOAuthLinkMutationHookResult = ReturnType<typeof useResumeOAuthLinkMutation>;
export type ResumeOAuthLinkMutationResult = Apollo.MutationResult<ResumeOAuthLinkMutation>;
export type ResumeOAuthLinkMutationOptions = Apollo.BaseMutationOptions<ResumeOAuthLinkMutation, ResumeOAuthLinkMutationVariables>;
export const CancelOAuthLinkDocument = gql`
    mutation CancelOAuthLink($state: String!) {
  cancelOAuthLink(state: $state)
}
    `;
export type CancelOAuthLinkMutationFn = Apollo.MutationFunction<CancelOAuthLinkMutation, CancelOAuthLinkMutationVariables>;

/**
 * __useCancelOAuthLinkMutation__
 *
 * To run a mutation, you first call `useCancelOAuthLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelOAuthLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelOAuthLinkMutation, { data, loading, error }] = useCancelOAuthLinkMutation({
 *   variables: {
 *      state: // value for 'state'
 *   },
 * });
 */
export function useCancelOAuthLinkMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CancelOAuthLinkMutation, CancelOAuthLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CancelOAuthLinkMutation, CancelOAuthLinkMutationVariables>(CancelOAuthLinkDocument, options);
      }
export type CancelOAuthLinkMutationHookResult = ReturnType<typeof useCancelOAuthLinkMutation>;
export type CancelOAuthLinkMutationResult = Apollo.MutationResult<CancelOAuthLinkMutation>;
export type CancelOAuthLinkMutationOptions = Apollo.BaseMutationOptions<CancelOAuthLinkMutation, CancelOAuthLinkMutationVariables>;
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
  options: mailAccounts(filters: {ids: $values}, pagination: {limit: 20}) {
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
    query SearchMailFolders($account: ID, $search: String, $values: [ID!]) {
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
 *      search: // value for 'search'
 *      values: // value for 'values'
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