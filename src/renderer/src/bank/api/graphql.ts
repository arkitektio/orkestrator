import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/bank/api/funcs';
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
  ByteCount: { input: any; output: any; }
  /** Date (isoformat) */
  Date: { input: string; output: string; }
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string; }
  /** Decimal (fixed-point) */
  Decimal: { input: string; output: string; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

/** Everything about one account over a window. */
export type AccountInsights = {
  __typename?: 'AccountInsights';
  account: BankAccount;
  averageBalance: Array<CurrencyTotal>;
  highestBalance?: Maybe<BalanceExtreme>;
  largestIn: Array<Transaction>;
  largestOut: Array<Transaction>;
  lowestBalance?: Maybe<BalanceExtreme>;
  monthly: Array<CashflowBucket>;
  topCategories: Array<RankedCategory>;
  topMerchants: Array<RankedMerchant>;
  totals: Array<MoneyTotals>;
  window: WindowInfo;
};

/** What an account holds. A DEPOT's balance is its market valuation; its positions are `holdings`. */
export enum AccountKind {
  Cash = 'CASH',
  Depot = 'DEPOT',
  Savings = 'SAVINGS'
}

/** An account finished syncing. */
export type AccountSyncEvent = {
  __typename?: 'AccountSyncEvent';
  accountId: Scalars['ID']['output'];
  created: Scalars['Int']['output'];
  pendingReplaced: Scalars['Int']['output'];
  updated: Scalars['Int']['output'];
};

/** One way an account is pulled from a provider (an Enable Banking account, a Scalable pot). Lease, daily budget and last outcome are per syncer. */
export type AccountSyncer = {
  __typename?: 'AccountSyncer';
  /** The account it feeds. */
  account: BankAccount;
  /** Which provider it pulls from. */
  backend: Provider;
  /** The consent or login it is reached through; null once that is deleted. */
  connection?: Maybe<BankConnection>;
  /** When the syncer was first linked. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** True while a sync holds the syncer. */
  isSyncing: Scalars['Boolean']['output'];
  /** Why the last sync failed, if it did. */
  lastError?: Maybe<Scalars['String']['output']>;
  /** The kind of `lastError`, for the client to offer a fix. */
  lastErrorCode?: Maybe<BankErrorCode>;
  /** When the last successful sync finished. */
  lastSyncedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The earliest this syncer may sync (null: now) — after today's budget is spent or the provider asked to wait. */
  nextSyncAllowedAt?: Maybe<Scalars['DateTime']['output']>;
  /** Syncs left today under the provider's daily limit (null: no limit). */
  syncsRemainingToday?: Maybe<Scalars['Int']['output']>;
};

/** How much of the depot one security type is. */
export type Allocation = {
  __typename?: 'Allocation';
  currency: Scalars['String']['output'];
  securityType: Scalars['String']['output'];
  share: Scalars['Float']['output'];
  valuation: Scalars['Decimal']['output'];
};

/** Apply a previewed import. */
export type ApplyStatementImportInput = {
  /** Choices for accounts of the file; the others go where the preview said (an AMBIGUOUS one needs a choice). */
  accounts?: InputMaybe<Array<ImportAccountChoice>>;
  id: Scalars['ID']['input'];
};

/** A map area: a circle (`near`) or a viewport (`within`) — give one. */
export type AreaInput = {
  near?: InputMaybe<NearInput>;
  within?: InputMaybe<BoundsInput>;
};

/** Spending at located places inside a map area. */
export type AreaInsights = {
  __typename?: 'AreaInsights';
  categories: Array<RankedCategory>;
  locations: Array<RankedLocation>;
  merchants: Array<RankedMerchant>;
  monthly: Array<CashflowBucket>;
  totals: Array<MoneyTotals>;
  window: WindowInfo;
};

/** Link transactions to a merchant (and place) by hand — MANUAL, never re-matched. A null `merchant` hands them back to alias matching. */
export type AssignMerchantInput = {
  /** Create the place when `location.storeCode` is new for the merchant. */
  createLocation?: Scalars['Boolean']['input'];
  /** By id or store number (created if new, see `createLocation`). */
  location?: InputMaybe<LocationRef>;
  /** By id or key; null clears the manual link. */
  merchant?: InputMaybe<MerchantRef>;
  transactions: Array<Scalars['ID']['input']>;
};

/** How a started login finishes. */
export enum AuthFinish {
  Poll = 'POLL',
  Redirect = 'REDIRECT'
}

/** A started (or resumed) login, the same shape for every provider. Open `openUrl` in the user's browser; then, by `finish`: REDIRECT — the provider redirects to `redirectUrl` with `code` and `state`, call `completeBankLink`; POLL — call `completeScalableLink(state)` every `interval` seconds until the connection is ACTIVE. `state` is stored server-side, so any replica completes it and `resumeLink` returns it again. */
export type AuthSession = {
  __typename?: 'AuthSession';
  connection: BankConnection;
  expiresAt: Scalars['DateTime']['output'];
  finish: AuthFinish;
  /** POLL only: seconds between complete calls. */
  interval?: Maybe<Scalars['Int']['output']>;
  openUrl: Scalars['String']['output'];
  /** REDIRECT only: where the provider sends the browser back to. */
  redirectUrl?: Maybe<Scalars['String']['output']>;
  state: Scalars['String']['output'];
  /** POLL only: the code the user checks on the provider's page. */
  userCode?: Maybe<Scalars['String']['output']>;
};

/** An end-of-day balance. */
export type BalanceExtreme = {
  __typename?: 'BalanceExtreme';
  amount: Scalars['Decimal']['output'];
  currency: Scalars['String']['output'];
  date: Scalars['Date']['output'];
};

/** An end-of-day account balance. */
export type BalancePoint = {
  __typename?: 'BalancePoint';
  amount: Scalars['Decimal']['output'];
  currency: Scalars['String']['output'];
  date: Scalars['Date']['output'];
  /** True if the bank reported this balance; false if derived from transactions. */
  reported: Scalars['Boolean']['output'];
};

/** An account balance as the bank reported it on a day. */
export type BalanceSnapshot = {
  __typename?: 'BalanceSnapshot';
  /** The account. */
  account: BankAccount;
  /** The balance. */
  amount: Scalars['Decimal']['output'];
  /** The ISO 20022 balance type (CLBD closing booked, ITAV interim available, …). */
  balanceType: Scalars['String']['output'];
  /** ISO currency of the balance. */
  currency: Scalars['String']['output'];
  /** The day the balance refers to. */
  date: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
};

/** An account. Keeps its history across relinks; fed by its syncers and by imports. */
export type BankAccount = {
  __typename?: 'BankAccount';
  /** Every balance the bank reported, one per day and type. */
  balances: Array<BalanceSnapshot>;
  /** The connection of the account's live syncer (else of its newest one); null for an account fed only by imports. */
  connection?: Maybe<BankConnection>;
  /** When the account was first seen. */
  createdAt: Scalars['DateTime']['output'];
  /** The account's ISO currency. */
  currency: Scalars['String']['output'];
  /** A depot's positions as of its latest sync (empty for other accounts). */
  currentHoldings: Array<HoldingSnapshot>;
  /** The account's IBAN, if known. */
  iban?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** True when no live syncer pulls the account (no connection, or only expired/revoked ones): it grows by imports only. */
  isImportOnly: Scalars['Boolean']['output'];
  /** True while a sync holds one of the account's syncers. */
  isSyncing: Scalars['Boolean']['output'];
  /** Cash, securities depot, or savings. */
  kind: AccountKind;
  /** Why the last sync of a syncer failed, if one did. */
  lastError?: Maybe<Scalars['String']['output']>;
  /** The kind of `lastError`, for the client to offer a fix. */
  lastErrorCode?: Maybe<BankErrorCode>;
  /** When the last successful sync of any syncer finished. */
  lastSyncedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The newest balance the bank reported, of the most authoritative type. */
  latestBalance?: Maybe<BalanceSnapshot>;
  /** The account's name at the bank. */
  name?: Maybe<Scalars['String']['output']>;
  /** The earliest every live syncer may sync (null: now) — after today's budget is spent or the provider asked to wait. Syncing earlier fails with RATE_LIMITED without contacting the provider. */
  nextSyncAllowedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The organization this account belongs to. */
  organization: Organization;
  /** The bank's product name for the account. */
  product?: Maybe<Scalars['String']['output']>;
  /** How the account is pulled from providers; empty for an account fed only by imports. */
  syncers: Array<AccountSyncer>;
  /** The fewest syncs any live syncer has left today (null: no limit). */
  syncsRemainingToday?: Maybe<Scalars['Int']['output']>;
  /** The account's transactions. */
  transactions: Array<Transaction>;
};


/** An account. Keeps its history across relinks; fed by its syncers and by imports. */
export type BankAccountTransactionsArgs = {
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/**
 * An account: its identity, and the history of every syncer and import that fed it.
 *
 * What reaches the account at a provider lives on its :class:`AccountSyncer` rows (one per
 * provider identity); an account with no syncer is fed only by imports (a bank that is no
 * longer linked). A relink re-attaches the same account — by the syncer's identity, else by
 * IBAN — so the history, categories and notes stay.
 */
export type BankAccountFilter = {
  AND?: InputMaybe<BankAccountFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BankAccountFilter>;
  OR?: InputMaybe<BankAccountFilter>;
  connection?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  kind?: InputMaybe<AccountKind>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type BankAccountOrder =
  { createdAt: Ordering; currency?: never; kind?: never; lastSyncedAt?: never; name?: never; }
  |  { createdAt?: never; currency: Ordering; kind?: never; lastSyncedAt?: never; name?: never; }
  |  { createdAt?: never; currency?: never; kind: Ordering; lastSyncedAt?: never; name?: never; }
  |  { createdAt?: never; currency?: never; kind?: never; lastSyncedAt: Ordering; name?: never; }
  |  { createdAt?: never; currency?: never; kind?: never; lastSyncedAt?: never; name: Ordering; };

/** One consent at one bank. Accounts are synced through it while it is ACTIVE. */
export type BankConnection = {
  __typename?: 'BankConnection';
  /** The accounts reached through this connection (through their syncers). */
  accounts: Array<BankAccount>;
  /** The bank's ISO country code. */
  aspspCountry: Scalars['String']['output'];
  /** The bank's name, exactly as Enable Banking lists it. */
  aspspName: Scalars['String']['output'];
  /** When the link was started. */
  createdAt: Scalars['DateTime']['output'];
  /** The user who started the link. */
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  /** PENDING and past `pendingExpiresAt`: the login can no longer be completed. */
  isAbandoned: Scalars['Boolean']['output'];
  /** The last error talking to the bank, if any. */
  lastError?: Maybe<Scalars['String']['output']>;
  /** The kind of `lastError`, for the client to offer a fix. */
  lastErrorCode?: Maybe<BankErrorCode>;
  /** Where a Scalable link is in its login. */
  linkStep?: Maybe<LinkStep>;
  /** When the link was completed. */
  linkedAt?: Maybe<Scalars['DateTime']['output']>;
  /** True when the consent ran out or was withdrawn: start a new link to the same bank to continue. */
  needsReauth: Scalars['Boolean']['output'];
  /** The earliest every account of the connection may sync again (null: now). `syncConnection` needs all of them. */
  nextSyncAllowedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The organization this connection belongs to. */
  organization: Organization;
  /** PENDING only: when the login can no longer be completed. Nothing flips it on a timer — past this, a PENDING link is dead: hide it or `cancelLink` it. */
  pendingExpiresAt?: Maybe<Scalars['DateTime']['output']>;
  /** Who the accounts are reached through. */
  provider: Provider;
  /** Where this consent is in its lifecycle. */
  status: ConnectionStatus;
  /** The syncers reached through this connection. */
  syncers: Array<AccountSyncer>;
  /** The fewest syncs any account of the connection has left today (null: no limit). */
  syncsRemainingToday?: Maybe<Scalars['Int']['output']>;
  /** When the bank consent runs out. */
  validUntil?: Maybe<Scalars['DateTime']['output']>;
};

/**
 * One consent at one bank (an Enable Banking session) or one Scalable Capital login.
 *
 * A Scalable connection keeps its credentials — the DPoP private key and the rotating refresh
 * token bound to it — Fernet-encrypted in ``secret`` (see :mod:`finance.scalable.crypto`).
 */
export type BankConnectionFilter = {
  AND?: InputMaybe<BankConnectionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BankConnectionFilter>;
  OR?: InputMaybe<BankConnectionFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  status?: InputMaybe<ConnectionStatus>;
};

/** What went wrong, so a client can offer the fix: CONSENT_EXPIRED → relink, RATE_LIMITED → try again at nextSyncAllowedAt, MFA_REJECTED → log in again, CODE_EXPIRED → get a new code, INVALID_STATE → start over, BANK_UNAVAILABLE → try later. Also every GraphQL error's `extensions.code`. */
export enum BankErrorCode {
  BankError = 'BANK_ERROR',
  BankUnavailable = 'BANK_UNAVAILABLE',
  CodeExpired = 'CODE_EXPIRED',
  ConnectionInactive = 'CONNECTION_INACTIVE',
  ConsentExpired = 'CONSENT_EXPIRED',
  InvalidState = 'INVALID_STATE',
  MfaRejected = 'MFA_REJECTED',
  NotConfigured = 'NOT_CONFIGURED',
  RateLimited = 'RATE_LIMITED',
  SyncInProgress = 'SYNC_IN_PROGRESS'
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

/** A map viewport: the WGS84 box between south/north latitudes and west/east longitudes. */
export type BoundsInput = {
  east: Scalars['Float']['input'];
  north: Scalars['Float']['input'];
  south: Scalars['Float']['input'];
  west: Scalars['Float']['input'];
};

/** A monthly spending limit for a category and its children, in one currency. */
export type Budget = {
  __typename?: 'Budget';
  /** The monthly limit, as a positive amount. */
  amount: Scalars['Decimal']['output'];
  /** The budgeted category; child categories count towards it. */
  category: Category;
  /** When the budget was created. */
  createdAt: Scalars['DateTime']['output'];
  /** ISO currency of the limit; only transactions in it count. */
  currency: Scalars['String']['output'];
  /** Last month the budget applies to, or open-ended. */
  endMonth?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  /** First month the budget applies to (the first day of it). */
  startMonth: Scalars['Date']['output'];
};

/** A monthly spending limit for a category (and its children), in one currency. */
export type BudgetFilter = {
  AND?: InputMaybe<BudgetFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BudgetFilter>;
  OR?: InputMaybe<BudgetFilter>;
  activeIn?: InputMaybe<Scalars['Date']['input']>;
  category?: InputMaybe<Scalars['ID']['input']>;
};

export type BudgetOrder =
  { amount: Ordering; createdAt?: never; startMonth?: never; }
  |  { amount?: never; createdAt: Ordering; startMonth?: never; }
  |  { amount?: never; createdAt?: never; startMonth: Ordering; };

/** One budget in one month. */
export type BudgetStatus = {
  __typename?: 'BudgetStatus';
  budget: Budget;
  budgeted: Scalars['Decimal']['output'];
  month: Scalars['Date']['output'];
  /** spent / budgeted. */
  ratio: Scalars['Float']['output'];
  /** Negative when over budget. */
  remaining: Scalars['Decimal']['output'];
  /** Net money out in the category and its children, as a positive amount. */
  spent: Scalars['Decimal']['output'];
};

/** Money in and out during one month or week, in one currency. */
export type CashflowBucket = {
  __typename?: 'CashflowBucket';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  /** Money out, as a positive amount. */
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  net: Scalars['Decimal']['output'];
  periodStart: Scalars['Date']['output'];
};

/** Set or clear a transaction's category. */
export type CategorizeTransactionInput = {
  /** The category; null clears it and lets the rules decide again. */
  category?: InputMaybe<Scalars['ID']['input']>;
  id: Scalars['ID']['input'];
};

/** A spending or income category. Categories nest; budgets and stats roll children up. */
export type Category = {
  __typename?: 'Category';
  /** Uncategorized (or semantically guessed) transactions that look like they belong here, closest first: close to what the organization put in this category, or to one of its terms. */
  candidates: Array<Transaction>;
  /** The parent category, if nested. */
  children: Array<Category>;
  /** A display color (e.g. ``#4f46e5``). */
  color?: Maybe<Scalars['String']['output']>;
  /** When the category was created. */
  createdAt: Scalars['DateTime']['output'];
  /** What belongs here, in words bank lines use. Each comma-separated phrase is a term the category is recognized by. */
  description: Scalars['String']['output'];
  /** Hidden from pickers, suggestions and automatic assignment. */
  hidden: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  /** True for a base category (it has a `key`); it stays fully editable. */
  isBase: Scalars['Boolean']['output'];
  /** The base-taxonomy key (`food.groceries`) of a base category; null for the organization's own. */
  key?: Maybe<Scalars['String']['output']>;
  /** Expense, income or transfer — always the root's kind, for the whole subtree. */
  kind: CategoryKind;
  /** The category's name, unique among its siblings. */
  name: Scalars['String']['output'];
  /** The organization this category belongs to. */
  organization: Organization;
  /** The parent category, if nested. */
  parent?: Maybe<Category>;
  /** The category matching transactions get. */
  rules: Array<CategoryRule>;
  /** The phrases this category is recognized by: its name and each phrase of its description. */
  terms: Array<Scalars['String']['output']>;
};


/** A spending or income category. Categories nest; budgets and stats roll children up. */
export type CategoryCandidatesArgs = {
  limit?: Scalars['Int']['input'];
};


/** A spending or income category. Categories nest; budgets and stats roll children up. */
export type CategoryChildrenArgs = {
  filters?: InputMaybe<CategoryFilter>;
  ordering?: Array<CategoryOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A spending or income category. Categories nest; budgets and stats roll children up. */
export type CategoryRulesArgs = {
  filters?: InputMaybe<CategoryRuleFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** What a category commits per month in recurring payments. */
export type CategoryCommitment = {
  __typename?: 'CategoryCommitment';
  category?: Maybe<Category>;
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  /** Money per month (positive for payments out). */
  monthly: Scalars['Decimal']['output'];
};

/** What deleting a category does (or did): counted over the category and its children. */
export type CategoryDeletion = {
  __typename?: 'CategoryDeletion';
  /** Budgets on them (deleted with them). */
  budgets: Scalars['Int']['output'];
  /** The category and its descendants. */
  categories: Scalars['Int']['output'];
  /** Base categories among them; they are not re-added by syncBaseCategories until restored. */
  dismissedBaseKeys: Array<Scalars['String']['output']>;
  /** Rules assigning them (deleted with them). */
  rules: Scalars['Int']['output'];
  /** Transactions in them: reassigned, or handed back to rules and suggestions. */
  transactions: Scalars['Int']['output'];
};

/**
 * A spending or income category. Categories nest (groceries under food).
 *
 * A category's ``kind`` is always its root's: the whole subtree is expense, income or
 * transfer, so stats and budgets never disagree about a child. Base categories carry the
 * ``key`` of their node in :mod:`finance.taxonomy`; everything about them stays editable.
 * Name + description are embedded, which is what lets a never-seen merchant land in the
 * right category (:mod:`finance.semantic`).
 */
export type CategoryFilter = {
  AND?: InputMaybe<CategoryFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<CategoryFilter>;
  OR?: InputMaybe<CategoryFilter>;
  base?: InputMaybe<Scalars['Boolean']['input']>;
  hidden?: InputMaybe<Scalars['Boolean']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  kind?: InputMaybe<CategoryKind>;
  roots?: InputMaybe<Scalars['Boolean']['input']>;
  /** Search by text: a substring of name or description, or semantic similarity to both. */
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Everything about one category (children rolled up) over a window. */
export type CategoryInsights = {
  __typename?: 'CategoryInsights';
  /** This month's status of budgets on it. */
  budgets: Array<BudgetStatus>;
  category: Category;
  changes: Array<Change>;
  children: Array<RankedCategory>;
  monthly: Array<CashflowBucket>;
  /** Totals divided by the months in the window (`count` is the number of months). */
  monthlyAverage: Array<MoneyTotals>;
  previous: Array<MoneyTotals>;
  /** Its part of all expense. */
  shareOfSpending: Array<Share>;
  tickets: Array<TicketStats>;
  topCounterparties: Array<CounterpartyTotal>;
  topMerchants: Array<RankedMerchant>;
  totals: Array<MoneyTotals>;
  window: WindowInfo;
};

/** Whether a category holds expenses, income, or transfers between own accounts (excluded from stats). */
export enum CategoryKind {
  Expense = 'EXPENSE',
  Income = 'INCOME',
  Transfer = 'TRANSFER'
}

/** A category that moved most against the comparison window. */
export type CategoryMove = {
  __typename?: 'CategoryMove';
  category?: Maybe<Category>;
  change: Change;
};

export type CategoryOrder =
  { createdAt: Ordering; kind?: never; name?: never; }
  |  { createdAt?: never; kind: Ordering; name?: never; }
  |  { createdAt?: never; kind?: never; name: Ordering; };

/** Assigns a category to matching transactions; the first active rule by priority wins. */
export type CategoryRule = {
  __typename?: 'CategoryRule';
  /** Inactive rules are skipped. */
  active: Scalars['Boolean']['output'];
  /** Only match when the absolute amount is at most this. */
  amountMax?: Maybe<Scalars['Decimal']['output']>;
  /** Only match when the absolute amount is at least this. */
  amountMin?: Maybe<Scalars['Decimal']['output']>;
  /** The category matching transactions get. */
  category: Category;
  /** When the rule was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Only match money in, money out, or both. */
  direction: RuleDirection;
  /** The transaction field the pattern is matched against. */
  field: RuleField;
  id: Scalars['ID']['output'];
  /** How the pattern is compared (case-insensitive). */
  match: RuleMatch;
  /** The text or regular expression to match. */
  pattern: Scalars['String']['output'];
  /** Lower runs first; the first matching rule wins. */
  priority: Scalars['Int']['output'];
};

/** Assigns a category to matching transactions on import (never to manually categorized ones). */
export type CategoryRuleFilter = {
  AND?: InputMaybe<CategoryRuleFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<CategoryRuleFilter>;
  OR?: InputMaybe<CategoryRuleFilter>;
  active?: InputMaybe<Scalars['Boolean']['input']>;
  category?: InputMaybe<Scalars['ID']['input']>;
};

/** Who set a transaction's category: a rule, a user (MANUAL — nothing overrides it), or SEMANTIC (similar categorized transactions or a category term agreed; rules and users override it). */
export enum CategorySource {
  Import = 'IMPORT',
  Manual = 'MANUAL',
  Merchant = 'MERCHANT',
  None = 'NONE',
  Rule = 'RULE',
  Semantic = 'SEMANTIC'
}

/** A likely category for a transaction. */
export type CategorySuggestion = {
  __typename?: 'CategorySuggestion';
  category: Category;
  /** Up to three of those transactions. */
  evidence: Array<Transaction>;
  /** How many similar categorized transactions voted for it. */
  neighbours: Scalars['Int']['output'];
  reason: SuggestionReason;
  /** The category's share (0–1) of all votes; above the auto-assign threshold with evidence, sync assigns it (source SEMANTIC). */
  score: Scalars['Float']['output'];
};

/** Money in and out of one category, in one currency. `category` is null for uncategorized transactions. */
export type CategoryTotal = {
  __typename?: 'CategoryTotal';
  category?: Maybe<Category>;
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  /** Money out, as a positive amount. */
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  net: Scalars['Decimal']['output'];
};

/** How one metric moved against the comparison window. */
export type Change = {
  __typename?: 'Change';
  currency: Scalars['String']['output'];
  current: Scalars['Decimal']['output'];
  /** current − previous. */
  delta: Scalars['Decimal']['output'];
  metric: StatMetric;
  previous: Scalars['Decimal']['output'];
  /** delta / previous; null when previous is zero. */
  ratio?: Maybe<Scalars['Float']['output']>;
};

/** What a view compares its window with. */
export enum Comparison {
  None = 'NONE',
  PreviousPeriod = 'PREVIOUS_PERIOD',
  SamePeriodLastYear = 'SAME_PERIOD_LAST_YEAR'
}

/** Finish a bank link with what the bank redirected back with. */
export type CompleteBankLinkInput = {
  /** The `code` query parameter of the redirect. */
  code: Scalars['String']['input'];
  /** The `state` query parameter of the redirect. */
  state: Scalars['String']['input'];
};

/** Lifecycle of a bank consent. */
export enum ConnectionStatus {
  Active = 'ACTIVE',
  Expired = 'EXPIRED',
  Failed = 'FAILED',
  Pending = 'PENDING',
  Revoked = 'REVOKED'
}

/** Money to or from one counterparty, in one currency. */
export type CounterpartyTotal = {
  __typename?: 'CounterpartyTotal';
  count: Scalars['Int']['output'];
  counterparty: Scalars['String']['output'];
  currency: Scalars['String']['output'];
  /** As a positive amount. */
  total: Scalars['Decimal']['output'];
};

/** A new monthly budget. */
export type CreateBudgetInput = {
  /** The monthly limit, positive. */
  amount: Scalars['Decimal']['input'];
  category: Scalars['ID']['input'];
  currency?: Scalars['String']['input'];
  /** Any day of the last month; open-ended by default. */
  endMonth?: InputMaybe<Scalars['Date']['input']>;
  /** Any day of the first month; the current month by default. */
  startMonth?: InputMaybe<Scalars['Date']['input']>;
};

/** A new category. Under a parent it takes the parent's kind (a subtree is one kind). */
export type CreateCategoryInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  /** What belongs here, in words bank lines use (merchants, keywords; commas separate terms). Drives suggestions. */
  description?: Scalars['String']['input'];
  hidden?: Scalars['Boolean']['input'];
  /** For a top-level category; a child always takes its parent's kind. */
  kind?: CategoryKind;
  name: Scalars['String']['input'];
  parent?: InputMaybe<Scalars['ID']['input']>;
};

/** A new categorization rule. */
export type CreateCategoryRuleInput = {
  active?: Scalars['Boolean']['input'];
  amountMax?: InputMaybe<Scalars['Decimal']['input']>;
  amountMin?: InputMaybe<Scalars['Decimal']['input']>;
  /** Re-categorize existing transactions right away (never manually categorized ones). */
  apply?: Scalars['Boolean']['input'];
  category: Scalars['ID']['input'];
  direction?: RuleDirection;
  field: RuleField;
  match?: RuleMatch;
  pattern: Scalars['String']['input'];
  /** Lower runs first; the first matching rule wins. */
  priority?: Scalars['Int']['input'];
};

/** Preview an uploaded Finanzguru export. */
export type CreateFinanzguruImportInput = {
  /** The uploaded file's store (`finishBigfileUpload`'s id). */
  file: Scalars['ID']['input'];
};

/** A new merchant. Aliases default to the match keys of `fromTransactions` (else the name). */
export type CreateMerchantInput = {
  /** Texts that mean this merchant on a bank line; normalized ("Spar Dankt" → "spar"). */
  aliases?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Default category of its transactions. */
  category?: InputMaybe<Scalars['ID']['input']>;
  /** …or the default category by its base key ("food.groceries"). */
  categoryKey?: InputMaybe<Scalars['String']['input']>;
  description?: Scalars['String']['input'];
  /** Transactions to derive aliases from and attach (e.g. a `merchantCandidates` entry's `transactionIds`). */
  fromTransactions?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** The stable key to link by; the normalized name by default. It never changes on rename. */
  key?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  online?: Scalars['Boolean']['input'];
  website?: InputMaybe<Scalars['String']['input']>;
};

/** A new merchant rule: matching transactions get the merchant (before aliases; never over a manual link). */
export type CreateMerchantRuleInput = {
  active?: Scalars['Boolean']['input'];
  amountMax?: InputMaybe<Scalars['Decimal']['input']>;
  amountMin?: InputMaybe<Scalars['Decimal']['input']>;
  /** Re-match existing transactions right away. */
  apply?: Scalars['Boolean']['input'];
  direction?: RuleDirection;
  field: RuleField;
  /** Pin a place (by id or store number, created if new). */
  location?: InputMaybe<LocationRef>;
  match?: RuleMatch;
  merchant: MerchantRef;
  pattern: Scalars['String']['input'];
  /** Lower runs first; the first matching rule wins. */
  priority?: Scalars['Int']['input'];
};

/** An amount in one currency. */
export type CurrencyTotal = {
  __typename?: 'CurrencyTotal';
  amount: Scalars['Decimal']['output'];
  currency: Scalars['String']['output'];
};

/** Totals for one day (only days with activity). */
export type DayTotals = {
  __typename?: 'DayTotals';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  date: Scalars['Date']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
};

/** Money in or money out. */
export enum Direction {
  In = 'IN',
  Out = 'OUT'
}

export type FinishBigFileUploadInput = {
  storeId: Scalars['String']['input'];
  valid?: Scalars['Boolean']['input'];
};

/** An expected end-of-day balance. */
export type ForecastPoint = {
  __typename?: 'ForecastPoint';
  amount: Scalars['Decimal']['output'];
  currency: Scalars['String']['output'];
  date: Scalars['Date']['output'];
};

/** A geocoder hit. */
export type GeocodeResult = {
  __typename?: 'GeocodeResult';
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  label: Scalars['String']['output'];
  latitude: Scalars['Decimal']['output'];
  longitude: Scalars['Decimal']['output'];
  osmId?: Maybe<Scalars['String']['output']>;
  postalCode?: Maybe<Scalars['String']['output']>;
  region?: Maybe<Scalars['String']['output']>;
  street?: Maybe<Scalars['String']['output']>;
};

/** The bucket size of a cashflow series. */
export enum Granularity {
  Month = 'MONTH',
  Week = 'WEEK'
}

/** A GeoJSON Feature: one grid cell (its point is the cell's snapped center). */
export type GridCell = {
  __typename?: 'GridCell';
  geometry: PointGeometry;
  id: Scalars['ID']['output'];
  properties: GridCellProperties;
  type: Scalars['String']['output'];
};

/** A GeoJSON FeatureCollection of spending-grid cells — valid GeoJSON as returned, and typed. */
export type GridCellCollection = {
  __typename?: 'GridCellCollection';
  bbox?: Maybe<Array<Scalars['Float']['output']>>;
  cellMeters: Scalars['Float']['output'];
  features: Array<GridCell>;
  type: Scalars['String']['output'];
};

/** What a map styles a spending-grid cell by. */
export type GridCellProperties = {
  __typename?: 'GridCellProperties';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  locations: Scalars['Int']['output'];
  merchants: Scalars['Int']['output'];
};

/** One security position in a depot on a day. One row per day and ISIN is the depot's history. */
export type HoldingSnapshot = {
  __typename?: 'HoldingSnapshot';
  /** The depot. */
  account: BankAccount;
  /** ISO currency of the valuation. */
  currency: Scalars['String']['output'];
  /** The day the position refers to. */
  date: Scalars['Date']['output'];
  /** Average buy-in price per unit (FIFO). */
  fifoPrice?: Maybe<Scalars['Decimal']['output']>;
  id: Scalars['ID']['output'];
  /** The security's ISIN. */
  isin: Scalars['String']['output'];
  /** The security's name. */
  name: Scalars['String']['output'];
  /** The last quoted mid price per unit. */
  price?: Maybe<Scalars['Decimal']['output']>;
  /** Units held (filled). */
  quantity: Scalars['Decimal']['output'];
  /** ETF, STOCK, FUND, CRYPTO, … */
  securityType?: Maybe<Scalars['String']['output']>;
  /** valuation − quantity × fifoPrice: the unrealized gain (negative for a loss). */
  unrealizedGain?: Maybe<Scalars['Decimal']['output']>;
  /** The position's market value. */
  valuation: Scalars['Decimal']['output'];
};

/** Where one account of the file goes, overriding the preview's choice. */
export type ImportAccountChoice = {
  /** Land its rows in this account; null creates a new account. */
  account?: InputMaybe<Scalars['ID']['input']>;
  /** The account as the file names it (the preview's `accounts.reference`). */
  reference: Scalars['String']['input'];
  /** Leave this account out of the import. */
  skip?: Scalars['Boolean']['input'];
};

/** One account of the imported file (a Finanzguru `Referenzkonto`) and where its rows go. */
export type ImportAccountPlan = {
  __typename?: 'ImportAccountPlan';
  /** The account the rows go to; null for a new account (or when ambiguous or skipped). */
  account?: Maybe<BankAccount>;
  /** Rows an earlier import brought in already (they are refreshed, not duplicated). */
  alreadyImported: Scalars['Int']['output'];
  /** AMBIGUOUS only: the accounts that have its IBAN. */
  candidates: Array<BankAccount>;
  currency: Scalars['String']['output'];
  firstDate: Scalars['Date']['output'];
  how: ImportTargetKind;
  /** Its IBAN, if the reference is one. */
  iban?: Maybe<Scalars['String']['output']>;
  lastDate: Scalars['Date']['output'];
  /** Rows that are the same booking as a synced row: that row gets the import's category and note instead of a duplicate. */
  matched: Scalars['Int']['output'];
  /** The file's name for it (`Name Referenzkonto`). */
  name?: Maybe<Scalars['String']['output']>;
  /** Rows that become new transactions. */
  new: Scalars['Int']['output'];
  /** The account as the file names it (an IBAN, or e.g. a card or PayPal account). */
  reference: Scalars['String']['output'];
  rows: Scalars['Int']['output'];
};

/** Which category an imported app's (main, sub) category means. Proposed on first sight, editable; every import uses it. */
export type ImportCategoryMapping = {
  __typename?: 'ImportCategoryMapping';
  /** The category rows with this pair get; null leaves them to rules and suggestions. */
  category?: Maybe<Category>;
  /** When the pair was first seen. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** The app's main category (Finanzguru: Analyse-Hauptkategorie). */
  main: Scalars['String']['output'];
  /** Still the automatic proposal (false once a user set it). */
  proposed: Scalars['Boolean']['output'];
  /** The app whose categories this maps. */
  source: ImportSource;
  /** The app's subcategory (Finanzguru: Analyse-Unterkategorie); empty if none. */
  sub: Scalars['String']['output'];
};

/** Which category an imported (main, sub) category means. */
export type ImportCategoryMappingInput = {
  /** The category; null leaves such rows to rules and suggestions. */
  category?: InputMaybe<Scalars['ID']['input']>;
  main: Scalars['String']['input'];
  sub?: Scalars['String']['input'];
};

/** Which app or format a statement import came from. */
export enum ImportSource {
  Finanzguru = 'FINANZGURU'
}

/** Where a statement import is: PREVIEWED (nothing written yet), APPLIED, or FAILED (the file could not be read; see `error`). */
export enum ImportStatus {
  Applied = 'APPLIED',
  Failed = 'FAILED',
  Previewed = 'PREVIEWED'
}

/** How a source account's target was decided: IBAN (the organization's one account with its IBAN), IMPORTED (created by an earlier import), NEW (a new account will be created), AMBIGUOUS (several accounts have the IBAN — choose one when applying), CHOSEN (the caller chose it), SKIPPED. */
export enum ImportTargetKind {
  Ambiguous = 'AMBIGUOUS',
  Chosen = 'CHOSEN',
  Iban = 'IBAN',
  Imported = 'IMPORTED',
  New = 'NEW',
  Skipped = 'SKIPPED'
}

/** A bank Enable Banking can reach. */
export type Institution = {
  __typename?: 'Institution';
  bic?: Maybe<Scalars['String']['output']>;
  country: Scalars['String']['output'];
  logo?: Maybe<Scalars['String']['output']>;
  /** The longest consent this bank grants, in days. */
  maximumConsentDays?: Maybe<Scalars['Int']['output']>;
  name: Scalars['String']['output'];
};

/** Investment income or cost in one year. */
export type InvestmentIncome = {
  __typename?: 'InvestmentIncome';
  /** Signed: payouts positive, fees and taxes negative. */
  amount: Scalars['Decimal']['output'];
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  kind: TransactionKind;
  year: Scalars['Int']['output'];
};

/** Where a Scalable link is: waiting for the login code to be approved, then for the second factor. */
export enum LinkStep {
  Device = 'DEVICE',
  Done = 'DONE',
  Mfa = 'MFA'
}

/** Everything about one merchant place over a window. */
export type LocationInsights = {
  __typename?: 'LocationInsights';
  location: MerchantLocation;
  monthly: Array<CashflowBucket>;
  tickets: Array<TicketStats>;
  totals: Array<MoneyTotals>;
  visits: VisitStats;
  weekdays: Array<WeekdayTotals>;
  window: WindowInfo;
};

/** A place of the merchant, by `id` or by `storeCode` (the store number bank lines carry) — give exactly one. */
export type LocationRef = {
  id?: InputMaybe<Scalars['ID']['input']>;
  storeCode?: InputMaybe<Scalars['String']['input']>;
};

/** Where a merchant location came from: a store number on a bank line (DISCOVERED, no address yet), a user (MANUAL) or the geocoder (GEOCODED). */
export enum LocationSource {
  Discovered = 'DISCOVERED',
  Geocoded = 'GEOCODED',
  Manual = 'MANUAL'
}

/** Set whether a transaction moves money between own accounts. */
export type MarkTransferInput = {
  id: Scalars['ID']['input'];
  /** True or false pins it; null returns it to automatic detection (by counterparty IBAN). */
  isTransfer?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Someone the organization pays or is paid by. Recognized on bank lines by its aliases; its default category categorizes its transactions (after rules, before suggestions). */
export type Merchant = {
  __typename?: 'Merchant';
  /** The merchant it means. */
  aliases: Array<MerchantAlias>;
  /** The default category of its transactions (source MERCHANT). */
  category?: Maybe<Category>;
  /** When the merchant was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Notes about the merchant. */
  description: Scalars['String']['output'];
  /** Meters from the point of a `near` filter to its closest located store; null without one. */
  distanceMeters?: Maybe<Scalars['Float']['output']>;
  /** The day of its first transaction. */
  firstSeen?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  /** The normalized name; unique per organization. */
  key: Scalars['String']['output'];
  /** The day of its latest transaction. */
  lastSeen?: Maybe<Scalars['Date']['output']>;
  /** Its places. */
  locations: Array<MerchantLocation>;
  /** An image URL for the merchant's logo. */
  logoUrl?: Maybe<Scalars['String']['output']>;
  /** The merchant's display name. */
  name: Scalars['String']['output'];
  /** The net amount per currency over its booked transactions (negative: money spent there). */
  net: Array<CurrencyTotal>;
  /** Online only: no physical stores. */
  online: Scalars['Boolean']['output'];
  /** Rules mapping transactions to it. */
  rules: Array<MerchantRule>;
  /** The organization's merchants closest in meaning to this one (by name and description). */
  similarMerchants: Array<Merchant>;
  /** How many transactions it has. */
  transactionCount: Scalars['Int']['output'];
  /** Its transactions. */
  transactions: Array<Transaction>;
  /** The merchant's website. */
  website?: Maybe<Scalars['String']['output']>;
};


/** Someone the organization pays or is paid by. Recognized on bank lines by its aliases; its default category categorizes its transactions (after rules, before suggestions). */
export type MerchantLocationsArgs = {
  filters?: InputMaybe<MerchantLocationFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Someone the organization pays or is paid by. Recognized on bank lines by its aliases; its default category categorizes its transactions (after rules, before suggestions). */
export type MerchantRulesArgs = {
  filters?: InputMaybe<MerchantRuleFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** Someone the organization pays or is paid by. Recognized on bank lines by its aliases; its default category categorizes its transactions (after rules, before suggestions). */
export type MerchantSimilarMerchantsArgs = {
  limit?: Scalars['Int']['input'];
};


/** Someone the organization pays or is paid by. Recognized on bank lines by its aliases; its default category categorizes its transactions (after rules, before suggestions). */
export type MerchantTransactionsArgs = {
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A normalized counterparty prefix that means this merchant ("spar" matches "Spar Dankt 3418"). */
export type MerchantAlias = {
  __typename?: 'MerchantAlias';
  /** When the alias was added. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** The merchant it means. */
  merchant: Merchant;
  /** Normalized words (lower-case, no numbers or boilerplate) a line's key must start with. */
  pattern: Scalars['String']['output'];
};

/** A counterparty that recurs without a merchant: a merchant waiting to be created (`createMerchant(input: {fromTransactions: …})`). */
export type MerchantCandidate = {
  __typename?: 'MerchantCandidate';
  count: Scalars['Int']['output'];
  /** The normalized text its lines share (becomes the alias). */
  key: Scalars['String']['output'];
  /** Up to three counterparty spellings. */
  samples: Array<Scalars['String']['output']>;
  /** How many distinct store numbers its lines carry (each becomes a location). */
  storeCodes: Scalars['Int']['output'];
  /** What its latest transaction would most likely be categorized as. */
  suggestedCategory?: Maybe<Category>;
  /** Net amount per currency. */
  totals: Array<CurrencyTotal>;
  transactionIds: Array<Scalars['ID']['output']>;
};

/**
 * Someone the organization pays or is paid by — "Spar", "Wiener Linien", the landlord.
 *
 * Recognized on bank lines by its :class:`MerchantAlias` rows (see :mod:`finance.merchants`).
 * A merchant may carry a default ``category`` for its transactions (source MERCHANT: after
 * rules, before semantic guesses). Name + description are embedded for semantic ``search``.
 */
export type MerchantFilter = {
  AND?: InputMaybe<MerchantFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MerchantFilter>;
  OR?: InputMaybe<MerchantFilter>;
  category?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only merchants with a located store within `radiusMeters` of a point, nearest first (`distanceMeters` on each). */
  near?: InputMaybe<NearInput>;
  online?: InputMaybe<Scalars['Boolean']['input']>;
  /** Search by text: a substring of name, description or an alias, or semantic similarity to name and description. */
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Everything about one merchant over a window. */
export type MerchantInsights = {
  __typename?: 'MerchantInsights';
  changes: Array<Change>;
  locations: Array<RankedLocation>;
  merchant: Merchant;
  monthly: Array<CashflowBucket>;
  previous: Array<MoneyTotals>;
  /** Its part of the expense in its default category (and children). */
  shareOfCategory: Array<Share>;
  tickets: Array<TicketStats>;
  totals: Array<MoneyTotals>;
  visits: VisitStats;
  weekdays: Array<WeekdayTotals>;
  window: WindowInfo;
};

/** A place of a merchant — a store, a branch. `latitude`/`longitude` are null until known (a store discovered from a bank line starts without an address). */
export type MerchantLocation = {
  __typename?: 'MerchantLocation';
  /** City. */
  city?: Maybe<Scalars['String']['output']>;
  /** ISO 3166-1 alpha-2 country code. */
  country?: Maybe<Scalars['String']['output']>;
  /** When the location was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Meters from the point of a `near` filter; null without one. */
  distanceMeters?: Maybe<Scalars['Float']['output']>;
  /** When it was last geocoded. */
  geocodedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** The day of the latest transaction here. */
  lastVisit?: Maybe<Scalars['Date']['output']>;
  /** WGS84 latitude. */
  latitude?: Maybe<Scalars['Decimal']['output']>;
  /** WGS84 longitude. */
  longitude?: Maybe<Scalars['Decimal']['output']>;
  /** The merchant. */
  merchant: Merchant;
  /** A display name (e.g. 'Spar 3418', 'Spar Mariahilfer Straße'). */
  name: Scalars['String']['output'];
  /** Notes. */
  notes: Scalars['String']['output'];
  /** The OpenStreetMap object it was geocoded to (N123, W456). */
  osmId?: Maybe<Scalars['String']['output']>;
  /** Postal code. */
  postalCode?: Maybe<Scalars['String']['output']>;
  /** State or region. */
  region?: Maybe<Scalars['String']['output']>;
  /** Where the location came from. */
  source: LocationSource;
  /** The store number bank lines carry for this place; unique per merchant. */
  storeCode?: Maybe<Scalars['String']['output']>;
  /** Street and number. */
  street?: Maybe<Scalars['String']['output']>;
  /** How many transactions happened here. */
  transactionCount: Scalars['Int']['output'];
  /** Transactions at this place. */
  transactions: Array<Transaction>;
};


/** A place of a merchant — a store, a branch. `latitude`/`longitude` are null until known (a store discovered from a bank line starts without an address). */
export type MerchantLocationTransactionsArgs = {
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A GeoJSON Feature: one located merchant place. */
export type MerchantLocationFeature = {
  __typename?: 'MerchantLocationFeature';
  geometry: PointGeometry;
  id: Scalars['ID']['output'];
  properties: MerchantLocationProperties;
  /** Always `Feature`. */
  type: Scalars['String']['output'];
};

/** A GeoJSON FeatureCollection of merchant places — valid GeoJSON as returned, and fully typed. */
export type MerchantLocationFeatureCollection = {
  __typename?: 'MerchantLocationFeatureCollection';
  /** `[west, south, east, north]` around the features; null when empty. */
  bbox?: Maybe<Array<Scalars['Float']['output']>>;
  features: Array<MerchantLocationFeature>;
  /** Always `FeatureCollection`. */
  type: Scalars['String']['output'];
};

/**
 * A place of a merchant: a store, a branch, a station.
 *
 * ``latitude``/``longitude`` are what the API reads and writes; ``point`` is the PostGIS
 * geography Postgres generates from them (GiST-indexed) for ``near`` queries — see
 * :mod:`finance.geo`. A location discovered from a store number has no address until a user
 * fills it in or geocodes it.
 */
export type MerchantLocationFilter = {
  AND?: InputMaybe<MerchantLocationFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MerchantLocationFilter>;
  OR?: InputMaybe<MerchantLocationFilter>;
  category?: InputMaybe<Scalars['ID']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  merchant?: InputMaybe<Scalars['ID']['input']>;
  /** Only locations within `radiusMeters` of a point, nearest first (`distanceMeters` on each). */
  near?: InputMaybe<NearInput>;
  unlocated?: InputMaybe<Scalars['Boolean']['input']>;
  /** Only located places inside a map viewport. */
  within?: InputMaybe<BoundsInput>;
};

/** A new place of a merchant. */
export type MerchantLocationInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  latitude?: InputMaybe<Scalars['Decimal']['input']>;
  longitude?: InputMaybe<Scalars['Decimal']['input']>;
  merchant: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  notes?: Scalars['String']['input'];
  postalCode?: InputMaybe<Scalars['String']['input']>;
  region?: InputMaybe<Scalars['String']['input']>;
  /** The store number bank lines carry for this place. */
  storeCode?: InputMaybe<Scalars['String']['input']>;
  street?: InputMaybe<Scalars['String']['input']>;
};

/** What a map styles a merchant place by: flat, numeric where it matters. */
export type MerchantLocationProperties = {
  __typename?: 'MerchantLocationProperties';
  categoryId?: Maybe<Scalars['ID']['output']>;
  categoryKind?: Maybe<CategoryKind>;
  categoryName?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  /** The merchant's category color, if any. */
  color?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  currency: Scalars['String']['output'];
  /** Meters from the point of a `near` filter. */
  distanceMeters?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  lastVisit?: Maybe<Scalars['Date']['output']>;
  merchantId: Scalars['ID']['output'];
  merchantName: Scalars['String']['output'];
  name: Scalars['String']['output'];
  /** Net booked amount at this place (negative: money spent), in `currency`. A Decimal string like every amount. */
  net: Scalars['Decimal']['output'];
  postalCode?: Maybe<Scalars['String']['output']>;
  source: LocationSource;
  storeCode?: Maybe<Scalars['String']['output']>;
  street?: Maybe<Scalars['String']['output']>;
  transactionCount: Scalars['Int']['output'];
};

/** A merchant that moved most against the comparison window. */
export type MerchantMove = {
  __typename?: 'MerchantMove';
  change: Change;
  merchant?: Maybe<Merchant>;
};

export type MerchantOrder =
  { createdAt: Ordering; name?: never; }
  |  { createdAt?: never; name: Ordering; };

/** A merchant, by `id` or by `key` (its stable normalized name, e.g. "spar") — give exactly one. */
export type MerchantRef = {
  id?: InputMaybe<Scalars['ID']['input']>;
  /** The merchant's key; normalized like an alias ("Spar" → "spar"). */
  key?: InputMaybe<Scalars['String']['input']>;
};

/** Maps matching transactions to a merchant (like a category rule): the first active rule by priority wins, before aliases; a manual link wins over both. */
export type MerchantRule = {
  __typename?: 'MerchantRule';
  /** Inactive rules are skipped. */
  active: Scalars['Boolean']['output'];
  /** Only match when the absolute amount is at most this. */
  amountMax?: Maybe<Scalars['Decimal']['output']>;
  /** Only match when the absolute amount is at least this. */
  amountMin?: Maybe<Scalars['Decimal']['output']>;
  /** When the rule was created. */
  createdAt: Scalars['DateTime']['output'];
  /** Only match money in, money out, or both. */
  direction: RuleDirection;
  /** The transaction field the pattern is matched against. */
  field: RuleField;
  id: Scalars['ID']['output'];
  /** The pinned place, if any (else a store number on the line decides). */
  location?: Maybe<MerchantLocation>;
  /** How the pattern is compared (case-insensitive). */
  match: RuleMatch;
  /** The merchant matching transactions get. */
  merchant: Merchant;
  /** The text or regular expression to match. */
  pattern: Scalars['String']['output'];
  /** Lower runs first; the first matching rule wins. */
  priority: Scalars['Int']['output'];
  /** How many transactions this rule currently links. */
  transactionCount: Scalars['Int']['output'];
};

/**
 * Maps matching transactions to a merchant — the explicit counterpart of aliases.
 *
 * Same matching as :class:`CategoryRule` (field, match, pattern, direction, amount range;
 * :func:`finance.rules.matches`): e.g. the landlord's IBAN, or a remittance line that names a
 * shop. The first active rule by priority wins, and rules win over aliases; a user's manual
 * link wins over both. A rule may pin a place (``location``); otherwise a store number on the
 * line picks or discovers one, as with aliases.
 */
export type MerchantRuleFilter = {
  AND?: InputMaybe<MerchantRuleFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MerchantRuleFilter>;
  OR?: InputMaybe<MerchantRuleFilter>;
  active?: InputMaybe<Scalars['Boolean']['input']>;
  merchant?: InputMaybe<Scalars['ID']['input']>;
};

/** How a transaction got its merchant: a merchant rule (RULE) or an alias (AUTO) — both re-matched when rules or aliases change — or a user (MANUAL, never re-matched). */
export enum MerchantSource {
  Auto = 'AUTO',
  Manual = 'MANUAL',
  None = 'NONE',
  Rule = 'RULE'
}

/** Money in and out with one merchant, in one currency. `merchant` is null for transactions without one. */
export type MerchantTotal = {
  __typename?: 'MerchantTotal';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  /** Money out, as a positive amount. */
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  merchant?: Maybe<Merchant>;
  net: Scalars['Decimal']['output'];
};

/** Money in and out in one currency; `expense` is positive. */
export type MoneyTotals = {
  __typename?: 'MoneyTotals';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  net: Scalars['Decimal']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Teach a merchant another spelling. */
  addMerchantAlias: MerchantAlias;
  /** Write a previewed import into the accounts (idempotent). */
  applyStatementImport: StatementImport;
  /** Link many transactions to a merchant (by id or key) and place (by id or store number), by hand; null hands them back to matching. */
  assignMerchant: Array<Transaction>;
  /** Delete a pending link you started. */
  cancelLink: Scalars['ID']['output'];
  /** Set or clear a transaction's category. */
  categorizeTransaction: Transaction;
  /** Set or clear the category of many transactions at once. */
  categorizeTransactions: Array<Transaction>;
  /** Finish linking a bank with the redirect's code and state. */
  completeBankLink: BankConnection;
  /** Advance a Scalable Capital link; call until the connection is ACTIVE. */
  completeScalableLink: BankConnection;
  /** Create a monthly budget. */
  createBudget: Budget;
  /** Create a category. */
  createCategory: Category;
  /** Create a categorization rule. */
  createCategoryRule: CategoryRule;
  /** Preview an uploaded Finanzguru export (nothing is written into the accounts yet). */
  createFinanzguruImport: StatementImport;
  /** Create a merchant (aliases from `fromTransactions` by default) and match it everywhere. */
  createMerchant: Merchant;
  /** Add a place to a merchant. */
  createMerchantLocation: MerchantLocation;
  /** Create a rule mapping matching transactions to a merchant. */
  createMerchantRule: MerchantRule;
  /** Delete a budget. */
  deleteBudget: Scalars['ID']['output'];
  /** Delete a category (reassigning its transactions, or handing them back to rules and suggestions); `dryRun` reports what would happen. */
  deleteCategory: CategoryDeletion;
  /** Delete a categorization rule. */
  deleteCategoryRule: Scalars['ID']['output'];
  /** Delete a merchant; its transactions are categorized again. */
  deleteMerchant: Scalars['ID']['output'];
  /** Delete a merchant place. */
  deleteMerchantLocation: Scalars['ID']['output'];
  /** Delete a merchant rule. */
  deleteMerchantRule: Scalars['ID']['output'];
  /** Detect recurring payments. */
  detectRecurring: Array<RecurringPayment>;
  /** Finalize a file upload after the client has written the object. */
  finishBigfileUpload: BigFileStore;
  /** Look a place up (OpenStreetMap) and fill in its address and coordinates. */
  geocodeMerchantLocation: MerchantLocation;
  /** Pin or un-pin a transaction as a transfer between own accounts. */
  markTransfer: Transaction;
  /** Pin or un-pin many transactions as transfers at once. */
  markTransfers: Array<Transaction>;
  /** Fold one merchant into another. */
  mergeMerchants: Merchant;
  /** Run the rules over existing transactions. */
  reapplyRules: Scalars['Int']['output'];
  /** Forget a merchant spelling. */
  removeMerchantAlias: Scalars['ID']['output'];
  /** Request temporary S3 read credentials for an uploaded file. */
  requestBigfileAccess: BigFileAccessGrant;
  /** Request temporary S3 credentials to upload one file (e.g. a statement export to import). */
  requestBigfileUpload: BigFileUploadGrant;
  /** Bring back a deleted base category. */
  restoreBaseCategory: Array<Category>;
  /** Get the auth session of a pending link you started again (to continue a login). */
  resumeLink: AuthSession;
  /** Withdraw a bank consent; data is kept. */
  revokeBankConnection: BankConnection;
  /** Add the base categories this organization lacks; returns all categories. */
  seedDefaultCategories: Array<Category>;
  /** Set which category imported category pairs mean. */
  setImportCategoryMappings: Array<ImportCategoryMapping>;
  /** Confirm or ignore a recurring payment. */
  setRecurringStatus: RecurringPayment;
  /** Confirm or ignore many recurring payments at once. */
  setRecurringStatuses: Array<RecurringPayment>;
  /** Set or clear a transaction's note. */
  setTransactionNote: Transaction;
  /** Start linking a bank; returns the auth session (finish: REDIRECT). */
  startBankLink: AuthSession;
  /** Start linking Scalable Capital; returns the auth session (finish: POLL). */
  startScalableLink: AuthSession;
  /** Pull an account from the bank now. */
  syncAccount: SyncResult;
  /** Add base categories this organization does not have yet; returns the created ones. */
  syncBaseCategories: Array<Category>;
  /** Pull every account of a connection now. */
  syncConnection: Array<SyncResult>;
  /** Change a budget. */
  updateBudget: Budget;
  /** Change a category. */
  updateCategory: Category;
  /** Change a categorization rule. */
  updateCategoryRule: CategoryRule;
  /** Change a merchant; a new default category re-categorizes its transactions. */
  updateMerchant: Merchant;
  /** Correct a merchant place. */
  updateMerchantLocation: MerchantLocation;
  /** Change a merchant rule. */
  updateMerchantRule: MerchantRule;
  /** Create a merchant, or update the one with this key (aliases are added). */
  upsertMerchant: Merchant;
};


export type MutationAddMerchantAliasArgs = {
  merchant: Scalars['ID']['input'];
  text: Scalars['String']['input'];
};


export type MutationApplyStatementImportArgs = {
  input: ApplyStatementImportInput;
};


export type MutationAssignMerchantArgs = {
  input: AssignMerchantInput;
};


export type MutationCancelLinkArgs = {
  connection: Scalars['ID']['input'];
};


export type MutationCategorizeTransactionArgs = {
  input: CategorizeTransactionInput;
};


export type MutationCategorizeTransactionsArgs = {
  category?: InputMaybe<Scalars['ID']['input']>;
  ids: Array<Scalars['ID']['input']>;
};


export type MutationCompleteBankLinkArgs = {
  input: CompleteBankLinkInput;
};


export type MutationCompleteScalableLinkArgs = {
  state: Scalars['String']['input'];
};


export type MutationCreateBudgetArgs = {
  input: CreateBudgetInput;
};


export type MutationCreateCategoryArgs = {
  input: CreateCategoryInput;
};


export type MutationCreateCategoryRuleArgs = {
  input: CreateCategoryRuleInput;
};


export type MutationCreateFinanzguruImportArgs = {
  input: CreateFinanzguruImportInput;
};


export type MutationCreateMerchantArgs = {
  input: CreateMerchantInput;
};


export type MutationCreateMerchantLocationArgs = {
  input: MerchantLocationInput;
};


export type MutationCreateMerchantRuleArgs = {
  input: CreateMerchantRuleInput;
};


export type MutationDeleteBudgetArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCategoryArgs = {
  dryRun?: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
  reassignTo?: InputMaybe<Scalars['ID']['input']>;
};


export type MutationDeleteCategoryRuleArgs = {
  apply?: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};


export type MutationDeleteMerchantArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMerchantLocationArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteMerchantRuleArgs = {
  apply?: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};


export type MutationDetectRecurringArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type MutationFinishBigfileUploadArgs = {
  input: FinishBigFileUploadInput;
};


export type MutationGeocodeMerchantLocationArgs = {
  id: Scalars['ID']['input'];
  query?: InputMaybe<Scalars['String']['input']>;
};


export type MutationMarkTransferArgs = {
  input: MarkTransferInput;
};


export type MutationMarkTransfersArgs = {
  ids: Array<Scalars['ID']['input']>;
  isTransfer?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationMergeMerchantsArgs = {
  into: Scalars['ID']['input'];
  merchant: Scalars['ID']['input'];
};


export type MutationReapplyRulesArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  semanticAssign?: Scalars['Boolean']['input'];
};


export type MutationRemoveMerchantAliasArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRequestBigfileAccessArgs = {
  input: RequestBigFileAccessInput;
};


export type MutationRequestBigfileUploadArgs = {
  input: RequestBigFileUploadInput;
};


export type MutationRestoreBaseCategoryArgs = {
  key: Scalars['String']['input'];
};


export type MutationResumeLinkArgs = {
  connection: Scalars['ID']['input'];
};


export type MutationRevokeBankConnectionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSetImportCategoryMappingsArgs = {
  input: Array<ImportCategoryMappingInput>;
};


export type MutationSetRecurringStatusArgs = {
  input: SetRecurringStatusInput;
};


export type MutationSetRecurringStatusesArgs = {
  ids: Array<Scalars['ID']['input']>;
  status: RecurringStatus;
};


export type MutationSetTransactionNoteArgs = {
  input: SetTransactionNoteInput;
};


export type MutationStartBankLinkArgs = {
  input: StartBankLinkInput;
};


export type MutationSyncAccountArgs = {
  id: Scalars['ID']['input'];
};


export type MutationSyncConnectionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationUpdateBudgetArgs = {
  input: UpdateBudgetInput;
};


export type MutationUpdateCategoryArgs = {
  input: UpdateCategoryInput;
};


export type MutationUpdateCategoryRuleArgs = {
  input: UpdateCategoryRuleInput;
};


export type MutationUpdateMerchantArgs = {
  input: UpdateMerchantInput;
};


export type MutationUpdateMerchantLocationArgs = {
  input: UpdateMerchantLocationInput;
};


export type MutationUpdateMerchantRuleArgs = {
  input: UpdateMerchantRuleInput;
};


export type MutationUpsertMerchantArgs = {
  input: UpsertMerchantInput;
};

/** A circle on the map: WGS84 latitude/longitude and a radius in meters. */
export type NearInput = {
  latitude: Scalars['Float']['input'];
  longitude: Scalars['Float']['input'];
  /** Radius in meters (default 1 km). */
  radiusMeters?: Scalars['Float']['input'];
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

/** An organization (tenant). Every bank object belongs to exactly one, and queries only see the current one's data. */
export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
};

/** A dashboard for a window, compared with the previous period or the same period last year. */
export type PeriodOverview = {
  __typename?: 'PeriodOverview';
  categoryMovers: Array<CategoryMove>;
  changes: Array<Change>;
  daily: Array<DayTotals>;
  largestTransactions: Array<Transaction>;
  merchantMovers: Array<MerchantMove>;
  /** Merchants whose first transaction falls in the window. */
  newMerchants: Array<Merchant>;
  previous: Array<MoneyTotals>;
  /** Confirmed recurring payments expected within the window. */
  recurringDue: Array<RecurringPayment>;
  /** (income − expense) / income per currency; can be negative. */
  savingsRate: Array<Share>;
  totals: Array<MoneyTotals>;
  weekdays: Array<WeekdayTotals>;
  window: WindowInfo;
};

/** A GeoJSON Point: `coordinates` is `[longitude, latitude]` (WGS84), as GeoJSON orders them. */
export type PointGeometry = {
  __typename?: 'PointGeometry';
  /** `[longitude, latitude]`. */
  coordinates: Array<Scalars['Float']['output']>;
  /** Always `Point`. */
  type: Scalars['String']['output'];
};

/** The depot: value over time, allocation, positions and investment income. */
export type PortfolioInsights = {
  __typename?: 'PortfolioInsights';
  allocation: Array<Allocation>;
  /** Σ quantity × FIFO price of the current positions. */
  costBasis: Array<CurrencyTotal>;
  income: Array<InvestmentIncome>;
  positions: Array<HoldingSnapshot>;
  unrealizedGain: Array<CurrencyTotal>;
  valuation: Array<CurrencyTotal>;
  valuationHistory: Array<ValuationPoint>;
};

/** A recurring payment whose amount changed. */
export type PriceChange = {
  __typename?: 'PriceChange';
  currency: Scalars['String']['output'];
  current: Scalars['Decimal']['output'];
  delta: Scalars['Decimal']['output'];
  previous: Scalars['Decimal']['output'];
  recurring: RecurringPayment;
};

/** Who a connection reaches its accounts through. */
export enum Provider {
  Enablebanking = 'ENABLEBANKING',
  Scalable = 'SCALABLE'
}

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Stats for one account. */
  accountInsights: AccountInsights;
  /** Stats for located places inside a circle or viewport. */
  areaInsights: AreaInsights;
  /** An account's end-of-day balance over a range. */
  balanceHistory: Array<BalancePoint>;
  /** A bank account by id. */
  bankAccount: BankAccount;
  /** The organization's bank accounts. */
  bankAccounts: Array<BankAccount>;
  /** A bank connection by id. */
  bankConnection: BankConnection;
  /** The organization's bank connections. */
  bankConnections: Array<BankConnection>;
  /** The banks that can be linked in a country. */
  bankInstitutions: Array<Institution>;
  /** A budget by id. */
  budget: Budget;
  /** Budgeted vs. spent for a month. */
  budgetStatus: Array<BudgetStatus>;
  /** The organization's budgets. */
  budgets: Array<Budget>;
  /** Income, expense and net per month or week and currency. */
  cashflow: Array<CashflowBucket>;
  /** The organization's categories. */
  categories: Array<Category>;
  /** A category by id. */
  category: Category;
  /** Stats for one category, children rolled up. */
  categoryInsights: CategoryInsights;
  /** A categorization rule by id. */
  categoryRule: CategoryRule;
  /** The organization's categorization rules. */
  categoryRules: Array<CategoryRule>;
  /** An account's expected balance over the coming days. */
  forecast: Array<ForecastPoint>;
  /** Places matching an address or name (OpenStreetMap). */
  geocodeSearch: Array<GeocodeResult>;
  /** A depot's positions on a day (its latest synced day by default). */
  holdings: Array<HoldingSnapshot>;
  /** Which category each imported category pair means. */
  importCategoryMappings: Array<ImportCategoryMapping>;
  /** Stats for one merchant place. */
  locationInsights: LocationInsights;
  /** A merchant by id. */
  merchant: Merchant;
  /** Recurring counterparties without a merchant. */
  merchantCandidates: Array<MerchantCandidate>;
  /** Stats for one merchant (by id or key). */
  merchantInsights: MerchantInsights;
  /** A merchant location by id. */
  merchantLocation: MerchantLocation;
  /** Merchant locations (paginated, filterable — `near`, `unlocated`). */
  merchantLocations: Array<MerchantLocation>;
  /** Located merchant places as a typed GeoJSON FeatureCollection (valid GeoJSON as returned — hand it to a map renderer); same filters as `merchantLocations`, e.g. `within` a viewport. */
  merchantLocationsGeojson: MerchantLocationFeatureCollection;
  /** The organization's merchant rules. */
  merchantRules: Array<MerchantRule>;
  /** The organization's merchants (paginated, filterable — e.g. `near` a point). */
  merchants: Array<Merchant>;
  /** A dashboard for a window against a comparison window. */
  periodOverview: PeriodOverview;
  /** The depot: value over time, allocation, positions, investment income. */
  portfolioInsights: PortfolioInsights;
  /** Recurring payments: commitment, due, missed, price changes. */
  recurringInsights: RecurringInsights;
  /** A recurring payment by id. */
  recurringPayment: RecurringPayment;
  /** Detected recurring payments. */
  recurringPayments: Array<RecurringPayment>;
  /** Income, expense and net per category and currency. */
  spendingByCategory: Array<CategoryTotal>;
  /** Income, expense and net per merchant and currency. */
  spendingByMerchant: Array<MerchantTotal>;
  /** Spending in a viewport binned into map cells (typed GeoJSON). */
  spendingGrid: GridCellCollection;
  /** A statement import by id. */
  statementImport: StatementImport;
  /** The organization's statement imports (uploaded exports), newest first. */
  statementImports: Array<StatementImport>;
  /** The categories a transaction most likely belongs to. */
  suggestCategories: Array<CategorySuggestion>;
  /** Where the most money went, or came from. */
  topCounterparties: Array<CounterpartyTotal>;
  /** A transaction by id. */
  transaction: Transaction;
  /** Transactions across the organization's accounts (paginated, filterable, orderable). */
  transactions: Array<Transaction>;
  /** How many transactions match the filters. */
  transactionsCount: Scalars['Int']['output'];
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryAccountInsightsArgs = {
  account: Scalars['ID']['input'];
  limit?: Scalars['Int']['input'];
  window?: InputMaybe<StatsWindowInput>;
};


export type QueryAreaInsightsArgs = {
  area: AreaInput;
  limit?: Scalars['Int']['input'];
  window?: InputMaybe<StatsWindowInput>;
};


export type QueryBalanceHistoryArgs = {
  account: Scalars['ID']['input'];
  dateFrom: Scalars['Date']['input'];
  dateTo?: InputMaybe<Scalars['Date']['input']>;
};


export type QueryBankAccountArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBankAccountsArgs = {
  filters?: InputMaybe<BankAccountFilter>;
  ordering?: Array<BankAccountOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryBankConnectionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBankConnectionsArgs = {
  filters?: InputMaybe<BankConnectionFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryBankInstitutionsArgs = {
  country: Scalars['String']['input'];
};


export type QueryBudgetArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBudgetStatusArgs = {
  month?: InputMaybe<Scalars['Date']['input']>;
};


export type QueryBudgetsArgs = {
  filters?: InputMaybe<BudgetFilter>;
  ordering?: Array<BudgetOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryCashflowArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  granularity?: Granularity;
  includeTransfers?: Scalars['Boolean']['input'];
};


export type QueryCategoriesArgs = {
  filters?: InputMaybe<CategoryFilter>;
  ordering?: Array<CategoryOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCategoryInsightsArgs = {
  category: Scalars['ID']['input'];
  compareTo?: Comparison;
  includeChildren?: Scalars['Boolean']['input'];
  window?: InputMaybe<StatsWindowInput>;
};


export type QueryCategoryRuleArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCategoryRulesArgs = {
  filters?: InputMaybe<CategoryRuleFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryForecastArgs = {
  account: Scalars['ID']['input'];
  horizonDays?: Scalars['Int']['input'];
  includeBudgets?: Scalars['Boolean']['input'];
  includeDetected?: Scalars['Boolean']['input'];
};


export type QueryGeocodeSearchArgs = {
  limit?: Scalars['Int']['input'];
  query: Scalars['String']['input'];
};


export type QueryHoldingsArgs = {
  account: Scalars['ID']['input'];
  date?: InputMaybe<Scalars['Date']['input']>;
};


export type QueryImportCategoryMappingsArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryLocationInsightsArgs = {
  location: Scalars['ID']['input'];
  window?: InputMaybe<StatsWindowInput>;
};


export type QueryMerchantArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMerchantCandidatesArgs = {
  limit?: Scalars['Int']['input'];
  minCount?: Scalars['Int']['input'];
};


export type QueryMerchantInsightsArgs = {
  compareTo?: Comparison;
  merchant: MerchantRef;
  window?: InputMaybe<StatsWindowInput>;
};


export type QueryMerchantLocationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMerchantLocationsArgs = {
  filters?: InputMaybe<MerchantLocationFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMerchantLocationsGeojsonArgs = {
  filters?: InputMaybe<MerchantLocationFilter>;
  limit?: Scalars['Int']['input'];
};


export type QueryMerchantRulesArgs = {
  filters?: InputMaybe<MerchantRuleFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMerchantsArgs = {
  filters?: InputMaybe<MerchantFilter>;
  ordering?: Array<MerchantOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryPeriodOverviewArgs = {
  compareTo?: Comparison;
  limit?: Scalars['Int']['input'];
  window?: InputMaybe<StatsWindowInput>;
};


export type QueryPortfolioInsightsArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
};


export type QueryRecurringInsightsArgs = {
  includeDetected?: Scalars['Boolean']['input'];
};


export type QueryRecurringPaymentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRecurringPaymentsArgs = {
  filters?: InputMaybe<RecurringPaymentFilter>;
  ordering?: Array<RecurringPaymentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuerySpendingByCategoryArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  includeTransfers?: Scalars['Boolean']['input'];
};


export type QuerySpendingByMerchantArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  includeTransfers?: Scalars['Boolean']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QuerySpendingGridArgs = {
  cellMeters?: Scalars['Float']['input'];
  window?: InputMaybe<StatsWindowInput>;
  within: BoundsInput;
};


export type QueryStatementImportArgs = {
  id: Scalars['ID']['input'];
};


export type QueryStatementImportsArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuerySuggestCategoriesArgs = {
  limit?: Scalars['Int']['input'];
  transaction: Scalars['ID']['input'];
};


export type QueryTopCounterpartiesArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  direction?: Direction;
  limit?: Scalars['Int']['input'];
};


export type QueryTransactionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTransactionsArgs = {
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTransactionsCountArgs = {
  filters?: InputMaybe<TransactionFilter>;
};

/** A category's totals; `share` is its part of all expense in that currency. */
export type RankedCategory = {
  __typename?: 'RankedCategory';
  category?: Maybe<Category>;
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  net: Scalars['Decimal']['output'];
  share: Scalars['Float']['output'];
};

/** A place's totals; `share` is its part of all expense in that currency. */
export type RankedLocation = {
  __typename?: 'RankedLocation';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  location?: Maybe<MerchantLocation>;
  net: Scalars['Decimal']['output'];
  share: Scalars['Float']['output'];
};

/** A merchant's totals; `share` is its part of all expense in that currency. */
export type RankedMerchant = {
  __typename?: 'RankedMerchant';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  merchant?: Maybe<Merchant>;
  net: Scalars['Decimal']['output'];
  share: Scalars['Float']['output'];
};

/** Recurring payments: what they commit, what is due, what did not come, what got pricier. */
export type RecurringInsights = {
  __typename?: 'RecurringInsights';
  byCategory: Array<CategoryCommitment>;
  /** Expected within the next 30 days. */
  dueSoon: Array<RecurringPayment>;
  /** Expected more than 3 days ago and not seen since. */
  missed: Array<RecurringPayment>;
  /** Normalized to a month (× 30.44 / interval); `count` is the number of payments. */
  monthlyCommitted: Array<MoneyTotals>;
  priceChanges: Array<PriceChange>;
};

/** A payment that repeats at a regular interval, detected from an account's history. */
export type RecurringPayment = {
  __typename?: 'RecurringPayment';
  /** The account it recurs on. */
  account: BankAccount;
  /** The typical (median) signed amount. */
  amount: Scalars['Decimal']['output'];
  /** ISO currency. */
  currency: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Days between occurrences (7, 14, 30, 91 or 365). */
  intervalDays: Scalars['Int']['output'];
  /** A readable name (the counterparty as last seen). */
  label: Scalars['String']['output'];
  /** The date of the latest occurrence. */
  lastSeen: Scalars['Date']['output'];
  /** When the next occurrence is expected. */
  nextExpected: Scalars['Date']['output'];
  /** How many matching transactions were found. */
  occurrences: Scalars['Int']['output'];
  /** Whether a user confirmed or ignored it. */
  status: RecurringStatus;
  /** The transactions that make up the pattern. */
  transactions: Array<Transaction>;
};


/** A payment that repeats at a regular interval, detected from an account's history. */
export type RecurringPaymentTransactionsArgs = {
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A payment detected to repeat at a regular interval (rent, salary, a subscription). */
export type RecurringPaymentFilter = {
  AND?: InputMaybe<RecurringPaymentFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<RecurringPaymentFilter>;
  OR?: InputMaybe<RecurringPaymentFilter>;
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  status?: InputMaybe<RecurringStatus>;
};

export type RecurringPaymentOrder =
  { amount: Ordering; label?: never; lastSeen?: never; nextExpected?: never; }
  |  { amount?: never; label: Ordering; lastSeen?: never; nextExpected?: never; }
  |  { amount?: never; label?: never; lastSeen: Ordering; nextExpected?: never; }
  |  { amount?: never; label?: never; lastSeen?: never; nextExpected: Ordering; };

/** Whether a user confirmed or ignored a detected recurring payment. Only CONFIRMED ones feed forecasts by default. */
export enum RecurringStatus {
  Confirmed = 'CONFIRMED',
  Detected = 'DETECTED',
  Ignored = 'IGNORED'
}

export type RequestBigFileAccessInput = {
  storeId: Scalars['String']['input'];
};

export type RequestBigFileUploadInput = {
  contentType?: InputMaybe<Scalars['String']['input']>;
  fileSize?: InputMaybe<Scalars['ByteCount']['input']>;
  host?: InputMaybe<Scalars['String']['input']>;
  originalFileName: Scalars['String']['input'];
  port?: InputMaybe<Scalars['Int']['input']>;
};

/** Which transactions a rule applies to, by sign. */
export enum RuleDirection {
  Any = 'ANY',
  In = 'IN',
  Out = 'OUT'
}

/** The transaction field a rule matches against. */
export enum RuleField {
  Counterparty = 'COUNTERPARTY',
  Iban = 'IBAN',
  Remittance = 'REMITTANCE'
}

/** How a rule's pattern is compared (case-insensitive). */
export enum RuleMatch {
  Contains = 'CONTAINS',
  Equals = 'EQUALS',
  Regex = 'REGEX'
}

/** Confirm or ignore a detected recurring payment. */
export type SetRecurringStatusInput = {
  id: Scalars['ID']['input'];
  status: RecurringStatus;
};

/** Set or clear a transaction's note. */
export type SetTransactionNoteInput = {
  id: Scalars['ID']['input'];
  note?: InputMaybe<Scalars['String']['input']>;
};

/** A share (0–1) in one currency. */
export type Share = {
  __typename?: 'Share';
  currency: Scalars['String']['output'];
  share: Scalars['Float']['output'];
};

/** Start linking a bank. */
export type StartBankLinkInput = {
  /** The bank's name exactly as `bankInstitutions` lists it. */
  aspspName: Scalars['String']['input'];
  /** The bank's ISO country code, e.g. AT. */
  country: Scalars['String']['input'];
  /** One of the server's registered redirect URLs; the first by default. */
  redirectUrl?: InputMaybe<Scalars['String']['input']>;
};

/** Which total a change is about. */
export enum StatMetric {
  Expense = 'EXPENSE',
  Income = 'INCOME',
  Net = 'NET'
}

/** An uploaded statement export: previewed (nothing written), then applied into the accounts. Applying again is idempotent. */
export type StatementImport = {
  __typename?: 'StatementImport';
  /** Each account of the file and where its rows go. */
  accounts: Array<ImportAccountPlan>;
  /** When the import was (last) applied. */
  appliedAt?: Maybe<Scalars['DateTime']['output']>;
  /** When the file was previewed. */
  createdAt: Scalars['DateTime']['output'];
  /** The user who uploaded the file. */
  creator?: Maybe<User>;
  /** FAILED only: why the file could not be read. */
  error?: Maybe<Scalars['String']['output']>;
  /** The file's name as uploaded. */
  fileName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Everything the preview (and the last apply) found, as stored. */
  report: Scalars['JSON']['output'];
  /** Bookings in the file (split parts folded into their booking). */
  rows: Scalars['Int']['output'];
  /** Which app or format the file came from. */
  source: ImportSource;
  /** Previewed, applied, or failed. */
  status: ImportStatus;
  /** How many transactions carry this import (new ones and enriched synced ones). */
  transactionsCount: Scalars['Int']['output'];
  /** Category pairs of the file without a mapped category; `setImportCategoryMappings` maps them. */
  unmappedCategories: Array<UnmappedImportCategory>;
  /** What was odd about the file (skipped lines, split parts that do not add up, unknown columns). */
  warnings: Array<Scalars['String']['output']>;
};

/** Which transactions a view looks at: a booking-date range (the last 12 months by default) and optionally some accounts. */
export type StatsWindowInput = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  /** Inclusive; today by default. */
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  includePending?: Scalars['Boolean']['input'];
  /** Count transfers between own accounts (and investing) as spending/income. */
  includeTransfers?: Scalars['Boolean']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Events whenever one of the organization's accounts finished syncing. */
  accountSyncs: AccountSyncEvent;
};

/** Why a category was suggested. */
export enum SuggestionReason {
  Both = 'BOTH',
  Neighbours = 'NEIGHBOURS',
  Terms = 'TERMS'
}

/** What a sync of one account did. */
export type SyncResult = {
  __typename?: 'SyncResult';
  account: BankAccount;
  balances: Scalars['Int']['output'];
  categorized: Scalars['Int']['output'];
  created: Scalars['Int']['output'];
  /** Depot positions stored. */
  holdings: Scalars['Int']['output'];
  pendingReplaced: Scalars['Int']['output'];
  updated: Scalars['Int']['output'];
};

/** Size of the outgoing payments, in one currency. */
export type TicketStats = {
  __typename?: 'TicketStats';
  average: Scalars['Decimal']['output'];
  currency: Scalars['String']['output'];
  largest: Scalars['Decimal']['output'];
  median: Scalars['Decimal']['output'];
  smallest: Scalars['Decimal']['output'];
};

/** A booked or pending transaction. Amounts are signed: negative is money out. */
export type Transaction = {
  __typename?: 'Transaction';
  /** The account the transaction is on. */
  account: BankAccount;
  /** Signed amount: negative is money out. */
  amount: Scalars['Decimal']['output'];
  /** When the bank booked it. */
  bookingDate?: Maybe<Scalars['Date']['output']>;
  /** The transaction's category. */
  category?: Maybe<Category>;
  /** Who set the category; rules never override a manual one. */
  categorySource: CategorySource;
  /** Who was paid, or who paid. */
  counterparty?: Maybe<Scalars['String']['output']>;
  /** The counterparty's IBAN, if reported. */
  counterpartyIban?: Maybe<Scalars['String']['output']>;
  /** When this service first saw the transaction. */
  createdAt: Scalars['DateTime']['output'];
  /** ISO currency of the amount. */
  currency: Scalars['String']['output'];
  /** The bank's own reference, when it sends one. */
  entryReference?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** Money moved between own accounts; excluded from stats. */
  isTransfer: Scalars['Boolean']['output'];
  /** ``is_transfer`` was set by a user and is not recomputed. */
  isTransferManual: Scalars['Boolean']['output'];
  /** The security traded or paying out, if any. */
  isin?: Maybe<Scalars['String']['output']>;
  /** The provider's transaction type (Scalable: BUY, SELL, DEPOSIT, DISTRIBUTION, INTEREST, FEE, TAX, …); null for bank transactions. */
  kind?: Maybe<TransactionKind>;
  /** Who the transaction was with. */
  merchant?: Maybe<Merchant>;
  /** Where: the merchant's store, when the line names one. */
  merchantLocation?: Maybe<MerchantLocation>;
  /** How the merchant was set (AUTO by alias, MANUAL by a user). */
  merchantSource: MerchantSource;
  /** A user's note. */
  note?: Maybe<Scalars['String']['output']>;
  /** Whether the bank fields were synced or imported from a file. */
  origin: TransactionOrigin;
  /** Units of the security, if any. */
  quantity?: Maybe<Scalars['Decimal']['output']>;
  /** The remittance information (purpose line). */
  remittance?: Maybe<Scalars['String']['output']>;
  /** The organization's transactions most similar to this one (same merchant, same kind of payment), closest first. `maxDistance` (cosine, 0–2) drops the far ones. */
  similarTransactions: Array<Transaction>;
  /** Booked or pending. */
  status: TransactionStatus;
  /** The categories this transaction most likely belongs to, best first — from similar transactions the organization categorized and from category terms. Empty when it has no embedding yet. */
  suggestedCategories: Array<CategorySuggestion>;
  /** The syncer that last wrote the bank fields; null for imported rows. */
  syncer?: Maybe<AccountSyncer>;
  /** When it was made (e.g. the card payment). */
  transactionDate?: Maybe<Scalars['Date']['output']>;
  /** When the row last changed. */
  updatedAt: Scalars['DateTime']['output'];
  /** When it took effect for interest. */
  valueDate?: Maybe<Scalars['Date']['output']>;
};


/** A booked or pending transaction. Amounts are signed: negative is money out. */
export type TransactionSimilarTransactionsArgs = {
  limit?: Scalars['Int']['input'];
  maxDistance?: InputMaybe<Scalars['Float']['input']>;
};


/** A booked or pending transaction. Amounts are signed: negative is money out. */
export type TransactionSuggestedCategoriesArgs = {
  limit?: Scalars['Int']['input'];
};

/**
 * A single booked or pending transaction on an account.
 *
 * Counterparty, remittance and provider kind are embedded: similar transactions (the same
 * merchant, the same kind of payment) sit close together, which drives ``search``,
 * ``similarTransactions`` and category suggestions (:mod:`finance.semantic`).
 *
 * Bank fields are overwritten by every sync; ``category``, ``note`` and ``is_transfer``
 * belong to the users and survive re-syncs of booked rows (see :mod:`finance.sync`).
 *
 * A row is SYNC (a syncer wrote it) or IMPORT (a statement import did). A sync that finds the
 * same booking as an IMPORT row takes that row over instead of adding a second one
 * (:mod:`finance.matching`), keeping its category, note and ``import_raw``.
 */
export type TransactionFilter = {
  AND?: InputMaybe<TransactionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<TransactionFilter>;
  OR?: InputMaybe<TransactionFilter>;
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
  amountMax?: InputMaybe<Scalars['Decimal']['input']>;
  amountMin?: InputMaybe<Scalars['Decimal']['input']>;
  categories?: InputMaybe<Array<Scalars['ID']['input']>>;
  categorySource?: InputMaybe<CategorySource>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  direction?: InputMaybe<Direction>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  includeChildCategories?: InputMaybe<Scalars['Boolean']['input']>;
  isTransfer?: InputMaybe<Scalars['Boolean']['input']>;
  kind?: InputMaybe<TransactionKind>;
  kinds?: InputMaybe<Array<TransactionKind>>;
  locations?: InputMaybe<Array<Scalars['ID']['input']>>;
  merchantSource?: InputMaybe<MerchantSource>;
  merchants?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Only transactions at a merchant location within `radiusMeters` of a point, nearest first. */
  near?: InputMaybe<NearInput>;
  /** Keep transactions that look like they belong to this category — close to what the organization put there, or to one of its terms — closest first. */
  nearCategory?: InputMaybe<Scalars['ID']['input']>;
  /** Search by text: a case-insensitive substring of counterparty, remittance or note; semantic similarity to them; or a category whose terms mean the text ("supermarket" finds what is in Groceries). Substring matches rank first, then by similarity; an explicit `ordering` replaces that ranking. */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Order by similarity to the given transaction, nearest first (no cut-off, composes with other filters and pagination). Empty when it is not in this organization or has no embedding yet. */
  similarTo?: InputMaybe<Scalars['ID']['input']>;
  status?: InputMaybe<TransactionStatus>;
  uncategorized?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A provider's transaction type (Scalable's broker and savings types). OTHER is a type this service does not know yet. */
export enum TransactionKind {
  Buy = 'BUY',
  CashTransferIn = 'CASH_TRANSFER_IN',
  CashTransferOut = 'CASH_TRANSFER_OUT',
  CorporateAction = 'CORPORATE_ACTION',
  CurrencySwitchBuy = 'CURRENCY_SWITCH_BUY',
  CurrencySwitchSell = 'CURRENCY_SWITCH_SELL',
  Deposit = 'DEPOSIT',
  Distribution = 'DISTRIBUTION',
  Fee = 'FEE',
  Interest = 'INTEREST',
  Other = 'OTHER',
  PocketMoney = 'POCKET_MONEY',
  Reinvestment = 'REINVESTMENT',
  ReinvestmentDistribution = 'REINVESTMENT_DISTRIBUTION',
  ReinvestmentPocketMoney = 'REINVESTMENT_POCKET_MONEY',
  SavingsPlan = 'SAVINGS_PLAN',
  Sell = 'SELL',
  SwapIn = 'SWAP_IN',
  SwapOut = 'SWAP_OUT',
  Tax = 'TAX',
  TaxReturn = 'TAX_RETURN',
  TransferIn = 'TRANSFER_IN',
  TransferOut = 'TRANSFER_OUT',
  Withdrawal = 'WITHDRAWAL'
}

export type TransactionOrder =
  { amount: Ordering; bookingDate?: never; createdAt?: never; }
  |  { amount?: never; bookingDate: Ordering; createdAt?: never; }
  |  { amount?: never; bookingDate?: never; createdAt: Ordering; };

/** Where a transaction's bank fields came from: a syncer (SYNC), or a file import (IMPORT) — a sync that finds the same booking later takes an IMPORT row over, keeping its category and note. */
export enum TransactionOrigin {
  Import = 'IMPORT',
  Sync = 'SYNC'
}

/** Booking status as reported by the bank. */
export enum TransactionStatus {
  Booked = 'BOOKED',
  Other = 'OTHER',
  Pending = 'PENDING'
}

/** An imported category pair no category is mapped to (yet): its rows stay uncategorized, for rules and suggestions. */
export type UnmappedImportCategory = {
  __typename?: 'UnmappedImportCategory';
  main: Scalars['String']['output'];
  rows: Scalars['Int']['output'];
  sub: Scalars['String']['output'];
};

/** Changes to a budget; omitted fields stay as they are. */
export type UpdateBudgetInput = {
  amount?: InputMaybe<Scalars['Decimal']['input']>;
  currency?: InputMaybe<Scalars['String']['input']>;
  endMonth?: InputMaybe<Scalars['Date']['input']>;
  id: Scalars['ID']['input'];
  startMonth?: InputMaybe<Scalars['Date']['input']>;
};

/** Changes to a category; omitted fields stay as they are. */
export type UpdateCategoryInput = {
  color?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  hidden?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  /** Only for a top-level category; the whole subtree follows. */
  kind?: InputMaybe<CategoryKind>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new parent, or null to make it top-level. Moving takes the new root's kind. */
  parent?: InputMaybe<Scalars['ID']['input']>;
};

/** Changes to a rule; omitted fields stay as they are. */
export type UpdateCategoryRuleInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  amountMax?: InputMaybe<Scalars['Decimal']['input']>;
  amountMin?: InputMaybe<Scalars['Decimal']['input']>;
  apply?: Scalars['Boolean']['input'];
  category?: InputMaybe<Scalars['ID']['input']>;
  direction?: InputMaybe<RuleDirection>;
  field?: InputMaybe<RuleField>;
  id: Scalars['ID']['input'];
  match?: InputMaybe<RuleMatch>;
  pattern?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
};

/** Changes to a merchant; omitted fields stay as they are. */
export type UpdateMerchantInput = {
  /** The default category, or null for none; its transactions follow. */
  category?: InputMaybe<Scalars['ID']['input']>;
  /** …or the default category by its base key. */
  categoryKey?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  /** A new key — only when you mean to change what clients link by. */
  key?: InputMaybe<Scalars['String']['input']>;
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  /** A new display name; the `key` stays (links by key keep working). */
  name?: InputMaybe<Scalars['String']['input']>;
  online?: InputMaybe<Scalars['Boolean']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

/** Changes to a place; omitted fields stay as they are. */
export type UpdateMerchantLocationInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  latitude?: InputMaybe<Scalars['Decimal']['input']>;
  longitude?: InputMaybe<Scalars['Decimal']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['String']['input']>;
  region?: InputMaybe<Scalars['String']['input']>;
  storeCode?: InputMaybe<Scalars['String']['input']>;
  street?: InputMaybe<Scalars['String']['input']>;
};

/** Changes to a merchant rule; omitted fields stay as they are. */
export type UpdateMerchantRuleInput = {
  active?: InputMaybe<Scalars['Boolean']['input']>;
  amountMax?: InputMaybe<Scalars['Decimal']['input']>;
  amountMin?: InputMaybe<Scalars['Decimal']['input']>;
  apply?: Scalars['Boolean']['input'];
  direction?: InputMaybe<RuleDirection>;
  field?: InputMaybe<RuleField>;
  id: Scalars['ID']['input'];
  /** A place to pin, or null to let the store number decide. */
  location?: InputMaybe<LocationRef>;
  match?: InputMaybe<RuleMatch>;
  merchant?: InputMaybe<MerchantRef>;
  pattern?: InputMaybe<Scalars['String']['input']>;
  priority?: InputMaybe<Scalars['Int']['input']>;
};

/** Create a merchant, or update the one with this key. Omitted fields keep their value on update; `aliases` are added (never removed). */
export type UpsertMerchantInput = {
  /** Texts to add as aliases (the key itself is always one). */
  aliases?: InputMaybe<Array<Scalars['String']['input']>>;
  category?: InputMaybe<Scalars['ID']['input']>;
  categoryKey?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  /** What the merchant is found by; normalized ("McDonald's" → "mcdonald"). */
  key: Scalars['String']['input'];
  logoUrl?: InputMaybe<Scalars['String']['input']>;
  /** Display name; the key's text when creating without one. */
  name?: InputMaybe<Scalars['String']['input']>;
  online?: InputMaybe<Scalars['Boolean']['input']>;
  website?: InputMaybe<Scalars['String']['input']>;
};

/** A user account; sub is the stable subject identifier from the identity provider. */
export type User = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
  preferredUsername: Scalars['String']['output'];
  sub: Scalars['String']['output'];
};

/** The depot on one day: its value, what was put in, and the gain. */
export type ValuationPoint = {
  __typename?: 'ValuationPoint';
  currency: Scalars['String']['output'];
  date: Scalars['Date']['output'];
  gain: Scalars['Decimal']['output'];
  /** Net money put into securities up to this day (buys and savings plans minus sells). */
  invested: Scalars['Decimal']['output'];
  valuation: Scalars['Decimal']['output'];
};

/** When and how often: visits are distinct days with a transaction. */
export type VisitStats = {
  __typename?: 'VisitStats';
  averageDaysBetweenVisits?: Maybe<Scalars['Float']['output']>;
  daysSinceLastVisit?: Maybe<Scalars['Int']['output']>;
  firstVisit?: Maybe<Scalars['Date']['output']>;
  lastVisit?: Maybe<Scalars['Date']['output']>;
  visits: Scalars['Int']['output'];
  /** Visits per 30.44 days of the window. */
  visitsPerMonth?: Maybe<Scalars['Float']['output']>;
};

/** Totals for one ISO weekday (1 = Monday … 7 = Sunday). */
export type WeekdayTotals = {
  __typename?: 'WeekdayTotals';
  count: Scalars['Int']['output'];
  currency: Scalars['String']['output'];
  expense: Scalars['Decimal']['output'];
  income: Scalars['Decimal']['output'];
  weekday: Scalars['Int']['output'];
};

/** The window a view covered, and the one it was compared with. */
export type WindowInfo = {
  __typename?: 'WindowInfo';
  end: Scalars['Date']['output'];
  previousEnd?: Maybe<Scalars['Date']['output']>;
  previousStart?: Maybe<Scalars['Date']['output']>;
  start: Scalars['Date']['output'];
};

export type _Entity = AccountSyncer | BalanceSnapshot | BankAccount | BankConnection | BigFileStore | Budget | Category | CategoryRule | HoldingSnapshot | ImportCategoryMapping | Merchant | MerchantAlias | MerchantLocation | MerchantRule | Organization | RecurringPayment | StatementImport | Transaction | User;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type BalanceFragment = { __typename?: 'BalanceSnapshot', id: string, date: string, balanceType: string, amount: string, currency: string };

export type ListBankAccountFragment = { __typename?: 'BankAccount', id: string, iban?: string | null, name?: string | null, kind: AccountKind, currency: string, product?: string | null, lastSyncedAt?: string | null, lastError?: string | null, lastErrorCode?: BankErrorCode | null, isSyncing: boolean, nextSyncAllowedAt?: string | null, syncsRemainingToday?: number | null, latestBalance?: (
    { __typename?: 'BalanceSnapshot' }
    & BalanceFragment
  ) | null, connection?: { __typename?: 'BankConnection', id: string, aspspName: string, aspspCountry: string, provider: Provider, status: ConnectionStatus, needsReauth: boolean } | null };

export type BankAccountFragment = (
  { __typename?: 'BankAccount', createdAt: string, currentHoldings: Array<(
    { __typename?: 'HoldingSnapshot' }
    & HoldingFragment
  )> }
  & ListBankAccountFragment
);

export type AuthSessionFragment = { __typename?: 'AuthSession', state: string, openUrl: string, expiresAt: string, finish: AuthFinish, interval?: number | null, userCode?: string | null, redirectUrl?: string | null, connection: (
    { __typename?: 'BankConnection' }
    & ListBankConnectionFragment
  ) };

export type BudgetFragment = { __typename?: 'Budget', id: string, amount: string, currency: string, startMonth: string, endMonth?: string | null, createdAt: string, category: (
    { __typename?: 'Category' }
    & ListCategoryFragment
  ) };

export type BudgetStatusFragment = { __typename?: 'BudgetStatus', month: string, budgeted: string, spent: string, remaining: string, ratio: number, budget: (
    { __typename?: 'Budget' }
    & BudgetFragment
  ) };

export type ListCategoryFragment = { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind, key?: string | null, isBase: boolean, hidden: boolean, description: string, parent?: { __typename?: 'Category', id: string, name: string } | null };

export type CategoryRuleFragment = { __typename?: 'CategoryRule', id: string, priority: number, field: RuleField, match: RuleMatch, pattern: string, direction: RuleDirection, amountMin?: string | null, amountMax?: string | null, active: boolean, createdAt: string, category: (
    { __typename?: 'Category' }
    & ListCategoryFragment
  ) };

export type CategoryFragment = (
  { __typename?: 'Category', createdAt: string, terms: Array<string>, children: Array<(
    { __typename?: 'Category' }
    & ListCategoryFragment
  )>, rules: Array<(
    { __typename?: 'CategoryRule' }
    & CategoryRuleFragment
  )> }
  & ListCategoryFragment
);

export type CategoryDeletionFragment = { __typename?: 'CategoryDeletion', categories: number, transactions: number, rules: number, budgets: number, dismissedBaseKeys: Array<string> };

export type CategorySuggestionFragment = { __typename?: 'CategorySuggestion', score: number, reason: SuggestionReason, neighbours: number, category: (
    { __typename?: 'Category' }
    & TransactionCategoryFragment
  ), evidence: Array<{ __typename?: 'Transaction', id: string, counterparty?: string | null, remittance?: string | null, amount: string, currency: string, bookingDate?: string | null, transactionDate?: string | null }> };

export type SuggestionChipFragment = { __typename?: 'CategorySuggestion', score: number, reason: SuggestionReason, neighbours: number, category: (
    { __typename?: 'Category' }
    & TransactionCategoryFragment
  ) };

export type ListBankConnectionFragment = { __typename?: 'BankConnection', id: string, aspspName: string, aspspCountry: string, provider: Provider, status: ConnectionStatus, linkStep?: LinkStep | null, validUntil?: string | null, needsReauth: boolean, lastError?: string | null, lastErrorCode?: BankErrorCode | null, pendingExpiresAt?: string | null, isAbandoned: boolean, nextSyncAllowedAt?: string | null, syncsRemainingToday?: number | null };

export type BankConnectionFragment = (
  { __typename?: 'BankConnection', createdAt: string, linkedAt?: string | null, creator?: { __typename?: 'User', id: string, sub: string, preferredUsername: string } | null, accounts: Array<(
    { __typename?: 'BankAccount' }
    & ListBankAccountFragment
  )> }
  & ListBankConnectionFragment
);

export type HoldingFragment = { __typename?: 'HoldingSnapshot', id: string, date: string, isin: string, name: string, securityType?: string | null, quantity: string, fifoPrice?: string | null, price?: string | null, valuation: string, currency: string, unrealizedGain?: string | null };

export type PortfolioHoldingFragment = (
  { __typename?: 'HoldingSnapshot', account: { __typename?: 'BankAccount', id: string, name?: string | null } }
  & HoldingFragment
);

export type WindowInfoFragment = { __typename?: 'WindowInfo', start: string, end: string, previousStart?: string | null, previousEnd?: string | null };

export type MoneyTotalsFragment = { __typename?: 'MoneyTotals', currency: string, income: string, expense: string, net: string, count: number };

export type ChangeFragment = { __typename?: 'Change', metric: StatMetric, currency: string, current: string, previous: string, delta: string, ratio?: number | null };

export type ShareFragment = { __typename?: 'Share', currency: string, share: number };

export type TicketStatsFragment = { __typename?: 'TicketStats', currency: string, average: string, median: string, smallest: string, largest: string };

export type VisitStatsFragment = { __typename?: 'VisitStats', visits: number, firstVisit?: string | null, lastVisit?: string | null, daysSinceLastVisit?: number | null, averageDaysBetweenVisits?: number | null, visitsPerMonth?: number | null };

export type WeekdayTotalsFragment = { __typename?: 'WeekdayTotals', weekday: number, currency: string, income: string, expense: string, count: number };

export type RankedMerchantFragment = { __typename?: 'RankedMerchant', currency: string, income: string, expense: string, net: string, count: number, share: number, merchant?: { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null, category?: (
      { __typename?: 'Category' }
      & TransactionCategoryFragment
    ) | null } | null };

export type RankedCategoryFragment = { __typename?: 'RankedCategory', currency: string, income: string, expense: string, net: string, count: number, share: number, category?: (
    { __typename?: 'Category' }
    & TransactionCategoryFragment
  ) | null };

export type RankedLocationFragment = { __typename?: 'RankedLocation', currency: string, income: string, expense: string, net: string, count: number, share: number, location?: { __typename?: 'MerchantLocation', id: string, name: string, city?: string | null, merchant: { __typename?: 'Merchant', id: string, name: string } } | null };

export type PeriodOverviewFragment = { __typename?: 'PeriodOverview', window: (
    { __typename?: 'WindowInfo' }
    & WindowInfoFragment
  ), totals: Array<(
    { __typename?: 'MoneyTotals' }
    & MoneyTotalsFragment
  )>, previous: Array<(
    { __typename?: 'MoneyTotals' }
    & MoneyTotalsFragment
  )>, changes: Array<(
    { __typename?: 'Change' }
    & ChangeFragment
  )>, savingsRate: Array<(
    { __typename?: 'Share' }
    & ShareFragment
  )>, categoryMovers: Array<{ __typename?: 'CategoryMove', change: (
      { __typename?: 'Change' }
      & ChangeFragment
    ), category?: (
      { __typename?: 'Category' }
      & TransactionCategoryFragment
    ) | null }>, merchantMovers: Array<{ __typename?: 'MerchantMove', change: (
      { __typename?: 'Change' }
      & ChangeFragment
    ), merchant?: { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null } | null }>, largestTransactions: Array<(
    { __typename?: 'Transaction' }
    & ListTransactionFragment
  )>, newMerchants: Array<(
    { __typename?: 'Merchant' }
    & ListMerchantFragment
  )>, daily: Array<{ __typename?: 'DayTotals', date: string, currency: string, income: string, expense: string, count: number }>, weekdays: Array<(
    { __typename?: 'WeekdayTotals' }
    & WeekdayTotalsFragment
  )>, recurringDue: Array<(
    { __typename?: 'RecurringPayment' }
    & ListRecurringPaymentFragment
  )> };

export type MerchantInsightsFragment = { __typename?: 'MerchantInsights', window: (
    { __typename?: 'WindowInfo' }
    & WindowInfoFragment
  ), totals: Array<(
    { __typename?: 'MoneyTotals' }
    & MoneyTotalsFragment
  )>, previous: Array<(
    { __typename?: 'MoneyTotals' }
    & MoneyTotalsFragment
  )>, changes: Array<(
    { __typename?: 'Change' }
    & ChangeFragment
  )>, tickets: Array<(
    { __typename?: 'TicketStats' }
    & TicketStatsFragment
  )>, visits: (
    { __typename?: 'VisitStats' }
    & VisitStatsFragment
  ), monthly: Array<(
    { __typename?: 'CashflowBucket' }
    & CashflowBucketFragment
  )>, weekdays: Array<(
    { __typename?: 'WeekdayTotals' }
    & WeekdayTotalsFragment
  )>, locations: Array<(
    { __typename?: 'RankedLocation' }
    & RankedLocationFragment
  )>, shareOfCategory: Array<(
    { __typename?: 'Share' }
    & ShareFragment
  )> };

export type CategoryInsightsFragment = { __typename?: 'CategoryInsights', window: (
    { __typename?: 'WindowInfo' }
    & WindowInfoFragment
  ), totals: Array<(
    { __typename?: 'MoneyTotals' }
    & MoneyTotalsFragment
  )>, previous: Array<(
    { __typename?: 'MoneyTotals' }
    & MoneyTotalsFragment
  )>, changes: Array<(
    { __typename?: 'Change' }
    & ChangeFragment
  )>, monthly: Array<(
    { __typename?: 'CashflowBucket' }
    & CashflowBucketFragment
  )>, monthlyAverage: Array<(
    { __typename?: 'MoneyTotals' }
    & MoneyTotalsFragment
  )>, shareOfSpending: Array<(
    { __typename?: 'Share' }
    & ShareFragment
  )>, children: Array<(
    { __typename?: 'RankedCategory' }
    & RankedCategoryFragment
  )>, topMerchants: Array<(
    { __typename?: 'RankedMerchant' }
    & RankedMerchantFragment
  )>, topCounterparties: Array<(
    { __typename?: 'CounterpartyTotal' }
    & CounterpartyTotalFragment
  )>, tickets: Array<(
    { __typename?: 'TicketStats' }
    & TicketStatsFragment
  )> };

export type LocationInsightsFragment = { __typename?: 'LocationInsights', window: (
    { __typename?: 'WindowInfo' }
    & WindowInfoFragment
  ), totals: Array<(
    { __typename?: 'MoneyTotals' }
    & MoneyTotalsFragment
  )>, tickets: Array<(
    { __typename?: 'TicketStats' }
    & TicketStatsFragment
  )>, visits: (
    { __typename?: 'VisitStats' }
    & VisitStatsFragment
  ), monthly: Array<(
    { __typename?: 'CashflowBucket' }
    & CashflowBucketFragment
  )>, weekdays: Array<(
    { __typename?: 'WeekdayTotals' }
    & WeekdayTotalsFragment
  )> };

export type AccountInsightsFragment = { __typename?: 'AccountInsights', window: (
    { __typename?: 'WindowInfo' }
    & WindowInfoFragment
  ), totals: Array<(
    { __typename?: 'MoneyTotals' }
    & MoneyTotalsFragment
  )>, monthly: Array<(
    { __typename?: 'CashflowBucket' }
    & CashflowBucketFragment
  )>, averageBalance: Array<{ __typename?: 'CurrencyTotal', amount: string, currency: string }>, lowestBalance?: { __typename?: 'BalanceExtreme', amount: string, currency: string, date: string } | null, highestBalance?: { __typename?: 'BalanceExtreme', amount: string, currency: string, date: string } | null, largestIn: Array<(
    { __typename?: 'Transaction' }
    & ListTransactionFragment
  )>, largestOut: Array<(
    { __typename?: 'Transaction' }
    & ListTransactionFragment
  )>, topCategories: Array<(
    { __typename?: 'RankedCategory' }
    & RankedCategoryFragment
  )>, topMerchants: Array<(
    { __typename?: 'RankedMerchant' }
    & RankedMerchantFragment
  )> };

export type AreaInsightsFragment = { __typename?: 'AreaInsights', window: (
    { __typename?: 'WindowInfo' }
    & WindowInfoFragment
  ), totals: Array<(
    { __typename?: 'MoneyTotals' }
    & MoneyTotalsFragment
  )>, merchants: Array<(
    { __typename?: 'RankedMerchant' }
    & RankedMerchantFragment
  )>, categories: Array<(
    { __typename?: 'RankedCategory' }
    & RankedCategoryFragment
  )>, locations: Array<(
    { __typename?: 'RankedLocation' }
    & RankedLocationFragment
  )> };

export type GridCellFragment = { __typename?: 'GridCell', type: string, id: string, geometry: { __typename?: 'PointGeometry', type: string, coordinates: Array<number> }, properties: { __typename?: 'GridCellProperties', currency: string, income: string, expense: string, count: number, merchants: number, locations: number } };

export type RecurringInsightsFragment = { __typename?: 'RecurringInsights', monthlyCommitted: Array<(
    { __typename?: 'MoneyTotals' }
    & MoneyTotalsFragment
  )>, byCategory: Array<{ __typename?: 'CategoryCommitment', currency: string, monthly: string, count: number, category?: (
      { __typename?: 'Category' }
      & TransactionCategoryFragment
    ) | null }>, dueSoon: Array<(
    { __typename?: 'RecurringPayment' }
    & ListRecurringPaymentFragment
  )>, missed: Array<(
    { __typename?: 'RecurringPayment' }
    & ListRecurringPaymentFragment
  )>, priceChanges: Array<{ __typename?: 'PriceChange', currency: string, previous: string, current: string, delta: string, recurring: (
      { __typename?: 'RecurringPayment' }
      & ListRecurringPaymentFragment
    ) }> };

export type PortfolioInsightsFragment = { __typename?: 'PortfolioInsights', valuation: Array<{ __typename?: 'CurrencyTotal', amount: string, currency: string }>, costBasis: Array<{ __typename?: 'CurrencyTotal', amount: string, currency: string }>, unrealizedGain: Array<{ __typename?: 'CurrencyTotal', amount: string, currency: string }>, valuationHistory: Array<{ __typename?: 'ValuationPoint', date: string, currency: string, valuation: string, invested: string, gain: string }>, allocation: Array<{ __typename?: 'Allocation', securityType: string, currency: string, valuation: string, share: number }>, income: Array<{ __typename?: 'InvestmentIncome', year: number, kind: TransactionKind, currency: string, amount: string, count: number }> };

export type ListMerchantFragment = { __typename?: 'Merchant', id: string, name: string, key: string, online: boolean, logoUrl?: string | null, website?: string | null, transactionCount: number, firstSeen?: string | null, lastSeen?: string | null, net: Array<{ __typename?: 'CurrencyTotal', amount: string, currency: string }>, category?: (
    { __typename?: 'Category' }
    & TransactionCategoryFragment
  ) | null };

export type MerchantLocationFragment = { __typename?: 'MerchantLocation', id: string, name: string, street?: string | null, postalCode?: string | null, city?: string | null, region?: string | null, country?: string | null, latitude?: string | null, longitude?: string | null, source: LocationSource, storeCode?: string | null, transactionCount: number, lastVisit?: string | null, notes: string, geocodedAt?: string | null, merchant: { __typename?: 'Merchant', id: string, name: string } };

export type MerchantFragment = (
  { __typename?: 'Merchant', description: string, createdAt: string, aliases: Array<{ __typename?: 'MerchantAlias', id: string, pattern: string }>, locations: Array<(
    { __typename?: 'MerchantLocation' }
    & MerchantLocationFragment
  )>, rules: Array<(
    { __typename?: 'MerchantRule' }
    & MerchantRuleFragment
  )> }
  & ListMerchantFragment
);

export type MerchantLocationFeatureFragment = { __typename?: 'MerchantLocationFeature', type: string, id: string, geometry: { __typename?: 'PointGeometry', type: string, coordinates: Array<number> }, properties: { __typename?: 'MerchantLocationProperties', id: string, name: string, merchantId: string, merchantName: string, categoryName?: string | null, color?: string | null, street?: string | null, city?: string | null, net: string, currency: string, transactionCount: number, lastVisit?: string | null, source: LocationSource } };

export type MerchantRuleFragment = { __typename?: 'MerchantRule', id: string, priority: number, field: RuleField, match: RuleMatch, pattern: string, direction: RuleDirection, amountMin?: string | null, amountMax?: string | null, active: boolean, transactionCount: number, location?: { __typename?: 'MerchantLocation', id: string, name: string } | null };

export type MerchantCandidateFragment = { __typename?: 'MerchantCandidate', key: string, count: number, samples: Array<string>, storeCodes: number, transactionIds: Array<string>, totals: Array<{ __typename?: 'CurrencyTotal', amount: string, currency: string }>, suggestedCategory?: (
    { __typename?: 'Category' }
    & TransactionCategoryFragment
  ) | null };

export type MerchantTotalFragment = { __typename?: 'MerchantTotal', currency: string, income: string, expense: string, net: string, count: number, merchant?: { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null, category?: (
      { __typename?: 'Category' }
      & TransactionCategoryFragment
    ) | null } | null };

export type ListRecurringPaymentFragment = { __typename?: 'RecurringPayment', id: string, label: string, amount: string, currency: string, intervalDays: number, occurrences: number, lastSeen: string, nextExpected: string, status: RecurringStatus, account: { __typename?: 'BankAccount', id: string, name?: string | null, iban?: string | null } };

export type RecurringPaymentFragment = (
  { __typename?: 'RecurringPayment', transactions: Array<(
    { __typename?: 'Transaction' }
    & ListTransactionFragment
  )> }
  & ListRecurringPaymentFragment
);

export type CashflowBucketFragment = { __typename?: 'CashflowBucket', periodStart: string, currency: string, income: string, expense: string, net: string, count: number };

export type CategoryTotalFragment = { __typename?: 'CategoryTotal', currency: string, income: string, expense: string, net: string, count: number, category?: (
    { __typename?: 'Category' }
    & TransactionCategoryFragment
  ) | null };

export type CounterpartyTotalFragment = { __typename?: 'CounterpartyTotal', counterparty: string, currency: string, total: string, count: number };

export type SyncResultFragment = { __typename?: 'SyncResult', created: number, updated: number, pendingReplaced: number, balances: number, categorized: number, holdings: number, account: (
    { __typename?: 'BankAccount' }
    & ListBankAccountFragment
  ) };

export type TransactionCategoryFragment = { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind };

export type ListTransactionFragment = { __typename?: 'Transaction', id: string, bookingDate?: string | null, valueDate?: string | null, transactionDate?: string | null, amount: string, currency: string, status: TransactionStatus, counterparty?: string | null, remittance?: string | null, isTransfer: boolean, note?: string | null, kind?: TransactionKind | null, isin?: string | null, quantity?: string | null, categorySource: CategorySource, merchantSource: MerchantSource, merchant?: { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null } | null, category?: (
    { __typename?: 'Category' }
    & TransactionCategoryFragment
  ) | null, account: { __typename?: 'BankAccount', id: string, name?: string | null, iban?: string | null } };

export type TransactionFragment = (
  { __typename?: 'Transaction', counterpartyIban?: string | null, entryReference?: string | null, isTransferManual: boolean, createdAt: string, updatedAt: string, merchantLocation?: { __typename?: 'MerchantLocation', id: string, name: string, street?: string | null, city?: string | null, latitude?: string | null, longitude?: string | null } | null }
  & ListTransactionFragment
);

export type CreateBudgetMutationVariables = Exact<{
  input: CreateBudgetInput;
}>;


export type CreateBudgetMutation = { __typename?: 'Mutation', createBudget: (
    { __typename?: 'Budget' }
    & BudgetFragment
  ) };

export type UpdateBudgetMutationVariables = Exact<{
  input: UpdateBudgetInput;
}>;


export type UpdateBudgetMutation = { __typename?: 'Mutation', updateBudget: (
    { __typename?: 'Budget' }
    & BudgetFragment
  ) };

export type DeleteBudgetMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBudgetMutation = { __typename?: 'Mutation', deleteBudget: string };

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
  reassignTo?: InputMaybe<Scalars['ID']['input']>;
  dryRun?: Scalars['Boolean']['input'];
}>;


export type DeleteCategoryMutation = { __typename?: 'Mutation', deleteCategory: (
    { __typename?: 'CategoryDeletion' }
    & CategoryDeletionFragment
  ) };

export type SeedDefaultCategoriesMutationVariables = Exact<{ [key: string]: never; }>;


export type SeedDefaultCategoriesMutation = { __typename?: 'Mutation', seedDefaultCategories: Array<(
    { __typename?: 'Category' }
    & ListCategoryFragment
  )> };

export type SyncBaseCategoriesMutationVariables = Exact<{ [key: string]: never; }>;


export type SyncBaseCategoriesMutation = { __typename?: 'Mutation', syncBaseCategories: Array<(
    { __typename?: 'Category' }
    & ListCategoryFragment
  )> };

export type RestoreBaseCategoryMutationVariables = Exact<{
  key: Scalars['String']['input'];
}>;


export type RestoreBaseCategoryMutation = { __typename?: 'Mutation', restoreBaseCategory: Array<(
    { __typename?: 'Category' }
    & ListCategoryFragment
  )> };

export type CreateCategoryRuleMutationVariables = Exact<{
  input: CreateCategoryRuleInput;
}>;


export type CreateCategoryRuleMutation = { __typename?: 'Mutation', createCategoryRule: (
    { __typename?: 'CategoryRule' }
    & CategoryRuleFragment
  ) };

export type UpdateCategoryRuleMutationVariables = Exact<{
  input: UpdateCategoryRuleInput;
}>;


export type UpdateCategoryRuleMutation = { __typename?: 'Mutation', updateCategoryRule: (
    { __typename?: 'CategoryRule' }
    & CategoryRuleFragment
  ) };

export type DeleteCategoryRuleMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteCategoryRuleMutation = { __typename?: 'Mutation', deleteCategoryRule: string };

export type ReapplyRulesMutationVariables = Exact<{
  accounts?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  semanticAssign?: Scalars['Boolean']['input'];
}>;


export type ReapplyRulesMutation = { __typename?: 'Mutation', reapplyRules: number };

export type StartBankLinkMutationVariables = Exact<{
  input: StartBankLinkInput;
}>;


export type StartBankLinkMutation = { __typename?: 'Mutation', startBankLink: (
    { __typename?: 'AuthSession' }
    & AuthSessionFragment
  ) };

export type CompleteBankLinkMutationVariables = Exact<{
  input: CompleteBankLinkInput;
}>;


export type CompleteBankLinkMutation = { __typename?: 'Mutation', completeBankLink: (
    { __typename?: 'BankConnection' }
    & BankConnectionFragment
  ) };

export type RevokeBankConnectionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RevokeBankConnectionMutation = { __typename?: 'Mutation', revokeBankConnection: (
    { __typename?: 'BankConnection' }
    & BankConnectionFragment
  ) };

export type SyncAccountMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SyncAccountMutation = { __typename?: 'Mutation', syncAccount: (
    { __typename?: 'SyncResult' }
    & SyncResultFragment
  ) };

export type SyncConnectionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SyncConnectionMutation = { __typename?: 'Mutation', syncConnection: Array<(
    { __typename?: 'SyncResult' }
    & SyncResultFragment
  )> };

export type StartScalableLinkMutationVariables = Exact<{ [key: string]: never; }>;


export type StartScalableLinkMutation = { __typename?: 'Mutation', startScalableLink: (
    { __typename?: 'AuthSession' }
    & AuthSessionFragment
  ) };

export type CompleteScalableLinkMutationVariables = Exact<{
  state: Scalars['String']['input'];
}>;


export type CompleteScalableLinkMutation = { __typename?: 'Mutation', completeScalableLink: (
    { __typename?: 'BankConnection' }
    & BankConnectionFragment
  ) };

export type ResumeLinkMutationVariables = Exact<{
  connection: Scalars['ID']['input'];
}>;


export type ResumeLinkMutation = { __typename?: 'Mutation', resumeLink: (
    { __typename?: 'AuthSession' }
    & AuthSessionFragment
  ) };

export type CancelLinkMutationVariables = Exact<{
  connection: Scalars['ID']['input'];
}>;


export type CancelLinkMutation = { __typename?: 'Mutation', cancelLink: string };

export type UpdateMerchantMutationVariables = Exact<{
  input: UpdateMerchantInput;
}>;


export type UpdateMerchantMutation = { __typename?: 'Mutation', updateMerchant: (
    { __typename?: 'Merchant' }
    & MerchantFragment
  ) };

export type DeleteMerchantMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteMerchantMutation = { __typename?: 'Mutation', deleteMerchant: string };

export type AssignMerchantMutationVariables = Exact<{
  input: AssignMerchantInput;
}>;


export type AssignMerchantMutation = { __typename?: 'Mutation', assignMerchant: Array<(
    { __typename?: 'Transaction' }
    & ListTransactionFragment
  )> };

export type UpdateMerchantLocationMutationVariables = Exact<{
  input: UpdateMerchantLocationInput;
}>;


export type UpdateMerchantLocationMutation = { __typename?: 'Mutation', updateMerchantLocation: (
    { __typename?: 'MerchantLocation' }
    & MerchantLocationFragment
  ) };

export type GeocodeMerchantLocationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  query?: InputMaybe<Scalars['String']['input']>;
}>;


export type GeocodeMerchantLocationMutation = { __typename?: 'Mutation', geocodeMerchantLocation: (
    { __typename?: 'MerchantLocation' }
    & MerchantLocationFragment
  ) };

export type CreateMerchantMutationVariables = Exact<{
  input: CreateMerchantInput;
}>;


export type CreateMerchantMutation = { __typename?: 'Mutation', createMerchant: (
    { __typename?: 'Merchant' }
    & MerchantFragment
  ) };

export type MergeMerchantsMutationVariables = Exact<{
  merchant: Scalars['ID']['input'];
  into: Scalars['ID']['input'];
}>;


export type MergeMerchantsMutation = { __typename?: 'Mutation', mergeMerchants: (
    { __typename?: 'Merchant' }
    & MerchantFragment
  ) };

export type AddMerchantAliasMutationVariables = Exact<{
  merchant: Scalars['ID']['input'];
  text: Scalars['String']['input'];
}>;


export type AddMerchantAliasMutation = { __typename?: 'Mutation', addMerchantAlias: { __typename?: 'MerchantAlias', id: string, pattern: string, merchant: { __typename?: 'Merchant', id: string, aliases: Array<{ __typename?: 'MerchantAlias', id: string, pattern: string }> } } };

export type RemoveMerchantAliasMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RemoveMerchantAliasMutation = { __typename?: 'Mutation', removeMerchantAlias: string };

export type CreateMerchantLocationMutationVariables = Exact<{
  input: MerchantLocationInput;
}>;


export type CreateMerchantLocationMutation = { __typename?: 'Mutation', createMerchantLocation: (
    { __typename?: 'MerchantLocation' }
    & MerchantLocationFragment
  ) };

export type DeleteMerchantLocationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteMerchantLocationMutation = { __typename?: 'Mutation', deleteMerchantLocation: string };

export type CreateMerchantOptionMutationVariables = Exact<{
  name: Scalars['String']['input'];
  fromTransactions?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type CreateMerchantOptionMutation = { __typename?: 'Mutation', result: { __typename?: 'Merchant', value: string, label: string } };

export type DetectRecurringMutationVariables = Exact<{
  accounts?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type DetectRecurringMutation = { __typename?: 'Mutation', detectRecurring: Array<(
    { __typename?: 'RecurringPayment' }
    & ListRecurringPaymentFragment
  )> };

export type SetRecurringStatusesMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  status: RecurringStatus;
}>;


export type SetRecurringStatusesMutation = { __typename?: 'Mutation', setRecurringStatuses: Array<(
    { __typename?: 'RecurringPayment' }
    & ListRecurringPaymentFragment
  )> };

export type SetRecurringStatusMutationVariables = Exact<{
  input: SetRecurringStatusInput;
}>;


export type SetRecurringStatusMutation = { __typename?: 'Mutation', setRecurringStatus: (
    { __typename?: 'RecurringPayment' }
    & ListRecurringPaymentFragment
  ) };

export type CategorizeTransactionMutationVariables = Exact<{
  input: CategorizeTransactionInput;
}>;


export type CategorizeTransactionMutation = { __typename?: 'Mutation', categorizeTransaction: (
    { __typename?: 'Transaction' }
    & TransactionFragment
  ) };

export type SetTransactionNoteMutationVariables = Exact<{
  input: SetTransactionNoteInput;
}>;


export type SetTransactionNoteMutation = { __typename?: 'Mutation', setTransactionNote: (
    { __typename?: 'Transaction' }
    & TransactionFragment
  ) };

export type CategorizeTransactionsMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  category?: InputMaybe<Scalars['ID']['input']>;
}>;


export type CategorizeTransactionsMutation = { __typename?: 'Mutation', categorizeTransactions: Array<(
    { __typename?: 'Transaction' }
    & ListTransactionFragment
  )> };

export type MarkTransfersMutationVariables = Exact<{
  ids: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  isTransfer?: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type MarkTransfersMutation = { __typename?: 'Mutation', markTransfers: Array<(
    { __typename?: 'Transaction' }
    & ListTransactionFragment
  )> };

export type MarkTransferMutationVariables = Exact<{
  input: MarkTransferInput;
}>;


export type MarkTransferMutation = { __typename?: 'Mutation', markTransfer: (
    { __typename?: 'Transaction' }
    & TransactionFragment
  ) };

export type ListBankAccountsQueryVariables = Exact<{
  filters?: InputMaybe<BankAccountFilter>;
  ordering?: Array<BankAccountOrder> | BankAccountOrder;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListBankAccountsQuery = { __typename?: 'Query', bankAccounts: Array<(
    { __typename?: 'BankAccount' }
    & ListBankAccountFragment
  )> };

export type GetBankAccountQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetBankAccountQuery = { __typename?: 'Query', bankAccount: (
    { __typename?: 'BankAccount' }
    & BankAccountFragment
  ) };

export type SearchBankAccountsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchBankAccountsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'BankAccount', value: string, label?: string | null }> };

export type BalanceHistoryQueryVariables = Exact<{
  account: Scalars['ID']['input'];
  dateFrom: Scalars['Date']['input'];
  dateTo?: InputMaybe<Scalars['Date']['input']>;
}>;


export type BalanceHistoryQuery = { __typename?: 'Query', balanceHistory: Array<{ __typename?: 'BalancePoint', date: string, amount: string, currency: string, reported: boolean }> };

export type ForecastQueryVariables = Exact<{
  account: Scalars['ID']['input'];
  horizonDays: Scalars['Int']['input'];
  includeDetected: Scalars['Boolean']['input'];
  includeBudgets: Scalars['Boolean']['input'];
}>;


export type ForecastQuery = { __typename?: 'Query', forecast: Array<{ __typename?: 'ForecastPoint', date: string, amount: string, currency: string }> };

export type ListBudgetsQueryVariables = Exact<{
  filters?: InputMaybe<BudgetFilter>;
  ordering?: Array<BudgetOrder> | BudgetOrder;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListBudgetsQuery = { __typename?: 'Query', budgets: Array<(
    { __typename?: 'Budget' }
    & BudgetFragment
  )> };

export type GetBudgetQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetBudgetQuery = { __typename?: 'Query', budget: (
    { __typename?: 'Budget' }
    & BudgetFragment
  ) };

export type BudgetStatusQueryVariables = Exact<{
  month?: InputMaybe<Scalars['Date']['input']>;
}>;


export type BudgetStatusQuery = { __typename?: 'Query', budgetStatus: Array<(
    { __typename?: 'BudgetStatus' }
    & BudgetStatusFragment
  )> };

export type ListCategoriesQueryVariables = Exact<{
  filters?: InputMaybe<CategoryFilter>;
  ordering?: Array<CategoryOrder> | CategoryOrder;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListCategoriesQuery = { __typename?: 'Query', categories: Array<(
    { __typename?: 'Category' }
    & ListCategoryFragment
  )> };

export type GetCategoryQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetCategoryQuery = { __typename?: 'Query', category: (
    { __typename?: 'Category' }
    & CategoryFragment
  ) };

export type SearchCategoriesQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchCategoriesQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Category', value: string, label: string }> };

export type ListCategoryRulesQueryVariables = Exact<{
  filters?: InputMaybe<CategoryRuleFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListCategoryRulesQuery = { __typename?: 'Query', categoryRules: Array<(
    { __typename?: 'CategoryRule' }
    & CategoryRuleFragment
  )> };

export type GetCategoryRuleQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetCategoryRuleQuery = { __typename?: 'Query', categoryRule: (
    { __typename?: 'CategoryRule' }
    & CategoryRuleFragment
  ) };

export type CategoryCandidatesQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  limit?: Scalars['Int']['input'];
}>;


export type CategoryCandidatesQuery = { __typename?: 'Query', category: { __typename?: 'Category', id: string, candidates: Array<(
      { __typename?: 'Transaction' }
      & ListTransactionFragment
    )> } };

export type ListBankConnectionsQueryVariables = Exact<{
  filters?: InputMaybe<BankConnectionFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListBankConnectionsQuery = { __typename?: 'Query', bankConnections: Array<(
    { __typename?: 'BankConnection' }
    & ListBankConnectionFragment
  )> };

export type GetBankConnectionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetBankConnectionQuery = { __typename?: 'Query', bankConnection: (
    { __typename?: 'BankConnection' }
    & BankConnectionFragment
  ) };

export type BankInstitutionsQueryVariables = Exact<{
  country: Scalars['String']['input'];
}>;


export type BankInstitutionsQuery = { __typename?: 'Query', bankInstitutions: Array<{ __typename?: 'Institution', name: string, country: string, logo?: string | null, bic?: string | null, maximumConsentDays?: number | null }> };

export type HoldingsQueryVariables = Exact<{
  account: Scalars['ID']['input'];
  date?: InputMaybe<Scalars['Date']['input']>;
}>;


export type HoldingsQuery = { __typename?: 'Query', holdings: Array<(
    { __typename?: 'HoldingSnapshot' }
    & HoldingFragment
  )> };

export type PortfolioQueryVariables = Exact<{ [key: string]: never; }>;


export type PortfolioQuery = { __typename?: 'Query', bankAccounts: Array<{ __typename?: 'BankAccount', id: string, name?: string | null, kind: AccountKind, currency: string, latestBalance?: (
      { __typename?: 'BalanceSnapshot' }
      & BalanceFragment
    ) | null, currentHoldings: Array<(
      { __typename?: 'HoldingSnapshot' }
      & HoldingFragment
    )> }> };

export type PeriodOverviewQueryVariables = Exact<{
  window?: InputMaybe<StatsWindowInput>;
  compareTo?: Comparison;
  limit?: Scalars['Int']['input'];
}>;


export type PeriodOverviewQuery = { __typename?: 'Query', periodOverview: (
    { __typename?: 'PeriodOverview' }
    & PeriodOverviewFragment
  ) };

export type MerchantInsightsQueryVariables = Exact<{
  merchant: MerchantRef;
  window?: InputMaybe<StatsWindowInput>;
  compareTo?: Comparison;
}>;


export type MerchantInsightsQuery = { __typename?: 'Query', merchantInsights: (
    { __typename?: 'MerchantInsights' }
    & MerchantInsightsFragment
  ) };

export type CategoryInsightsQueryVariables = Exact<{
  category: Scalars['ID']['input'];
  window?: InputMaybe<StatsWindowInput>;
  compareTo?: Comparison;
  includeChildren?: Scalars['Boolean']['input'];
}>;


export type CategoryInsightsQuery = { __typename?: 'Query', categoryInsights: (
    { __typename?: 'CategoryInsights' }
    & CategoryInsightsFragment
  ) };

export type LocationInsightsQueryVariables = Exact<{
  location: Scalars['ID']['input'];
  window?: InputMaybe<StatsWindowInput>;
}>;


export type LocationInsightsQuery = { __typename?: 'Query', locationInsights: (
    { __typename?: 'LocationInsights' }
    & LocationInsightsFragment
  ) };

export type AccountInsightsQueryVariables = Exact<{
  account: Scalars['ID']['input'];
  window?: InputMaybe<StatsWindowInput>;
  limit?: Scalars['Int']['input'];
}>;


export type AccountInsightsQuery = { __typename?: 'Query', accountInsights: (
    { __typename?: 'AccountInsights' }
    & AccountInsightsFragment
  ) };

export type AreaInsightsQueryVariables = Exact<{
  area: AreaInput;
  window?: InputMaybe<StatsWindowInput>;
  limit?: Scalars['Int']['input'];
}>;


export type AreaInsightsQuery = { __typename?: 'Query', areaInsights: (
    { __typename?: 'AreaInsights' }
    & AreaInsightsFragment
  ) };

export type SpendingGridQueryVariables = Exact<{
  within: BoundsInput;
  cellMeters?: Scalars['Float']['input'];
  window?: InputMaybe<StatsWindowInput>;
}>;


export type SpendingGridQuery = { __typename?: 'Query', spendingGrid: { __typename?: 'GridCellCollection', bbox?: Array<number> | null, cellMeters: number, features: Array<(
      { __typename?: 'GridCell' }
      & GridCellFragment
    )> } };

export type RecurringInsightsQueryVariables = Exact<{
  includeDetected?: Scalars['Boolean']['input'];
}>;


export type RecurringInsightsQuery = { __typename?: 'Query', recurringInsights: (
    { __typename?: 'RecurringInsights' }
    & RecurringInsightsFragment
  ) };

export type PortfolioInsightsQueryVariables = Exact<{
  accounts?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
}>;


export type PortfolioInsightsQuery = { __typename?: 'Query', portfolioInsights: (
    { __typename?: 'PortfolioInsights' }
    & PortfolioInsightsFragment
  ) };

export type ListMerchantsQueryVariables = Exact<{
  filters?: InputMaybe<MerchantFilter>;
  ordering?: Array<MerchantOrder> | MerchantOrder;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListMerchantsQuery = { __typename?: 'Query', merchants: Array<(
    { __typename?: 'Merchant' }
    & ListMerchantFragment
  )> };

export type GetMerchantQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetMerchantQuery = { __typename?: 'Query', merchant: (
    { __typename?: 'Merchant' }
    & MerchantFragment
  ) };

export type SimilarMerchantsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  limit?: Scalars['Int']['input'];
}>;


export type SimilarMerchantsQuery = { __typename?: 'Query', merchant: { __typename?: 'Merchant', id: string, similarMerchants: Array<(
      { __typename?: 'Merchant' }
      & ListMerchantFragment
    )> } };

export type SearchMerchantsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchMerchantsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Merchant', value: string, label: string }> };

export type MerchantLocationsGeojsonQueryVariables = Exact<{
  filters?: InputMaybe<MerchantLocationFilter>;
  limit?: Scalars['Int']['input'];
}>;


export type MerchantLocationsGeojsonQuery = { __typename?: 'Query', merchantLocationsGeojson: { __typename?: 'MerchantLocationFeatureCollection', type: string, bbox?: Array<number> | null, features: Array<(
      { __typename?: 'MerchantLocationFeature' }
      & MerchantLocationFeatureFragment
    )> } };

export type ListMerchantLocationsQueryVariables = Exact<{
  filters?: InputMaybe<MerchantLocationFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListMerchantLocationsQuery = { __typename?: 'Query', merchantLocations: Array<(
    { __typename?: 'MerchantLocation' }
    & MerchantLocationFragment
  )> };

export type GetMerchantLocationQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetMerchantLocationQuery = { __typename?: 'Query', merchantLocation: (
    { __typename?: 'MerchantLocation', merchant: { __typename?: 'Merchant', id: string, name: string, logoUrl?: string | null, category?: (
        { __typename?: 'Category' }
        & TransactionCategoryFragment
      ) | null } }
    & MerchantLocationFragment
  ) };

export type SearchMerchantLocationsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  merchant?: InputMaybe<Scalars['ID']['input']>;
}>;


export type SearchMerchantLocationsQuery = { __typename?: 'Query', options: Array<{ __typename?: 'MerchantLocation', value: string, label: string }> };

export type MerchantCandidatesQueryVariables = Exact<{
  limit?: Scalars['Int']['input'];
  minCount?: Scalars['Int']['input'];
}>;


export type MerchantCandidatesQuery = { __typename?: 'Query', merchantCandidates: Array<(
    { __typename?: 'MerchantCandidate' }
    & MerchantCandidateFragment
  )> };

export type SpendingByMerchantQueryVariables = Exact<{
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  accounts?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SpendingByMerchantQuery = { __typename?: 'Query', spendingByMerchant: Array<(
    { __typename?: 'MerchantTotal' }
    & MerchantTotalFragment
  )> };

export type GeocodeSearchQueryVariables = Exact<{
  query: Scalars['String']['input'];
  limit?: Scalars['Int']['input'];
}>;


export type GeocodeSearchQuery = { __typename?: 'Query', geocodeSearch: Array<{ __typename?: 'GeocodeResult', label: string, street?: string | null, postalCode?: string | null, city?: string | null, region?: string | null, country?: string | null, latitude: string, longitude: string, osmId?: string | null }> };

export type ListRecurringPaymentsQueryVariables = Exact<{
  filters?: InputMaybe<RecurringPaymentFilter>;
  ordering?: Array<RecurringPaymentOrder> | RecurringPaymentOrder;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListRecurringPaymentsQuery = { __typename?: 'Query', recurringPayments: Array<(
    { __typename?: 'RecurringPayment' }
    & ListRecurringPaymentFragment
  )> };

export type GetRecurringPaymentQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetRecurringPaymentQuery = { __typename?: 'Query', recurringPayment: (
    { __typename?: 'RecurringPayment' }
    & RecurringPaymentFragment
  ) };

export type CashflowQueryVariables = Exact<{
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  granularity?: Granularity;
  accounts?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  includeTransfers?: Scalars['Boolean']['input'];
}>;


export type CashflowQuery = { __typename?: 'Query', cashflow: Array<(
    { __typename?: 'CashflowBucket' }
    & CashflowBucketFragment
  )> };

export type SpendingByCategoryQueryVariables = Exact<{
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  accounts?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  includeTransfers?: Scalars['Boolean']['input'];
}>;


export type SpendingByCategoryQuery = { __typename?: 'Query', spendingByCategory: Array<(
    { __typename?: 'CategoryTotal' }
    & CategoryTotalFragment
  )> };

export type TopCounterpartiesQueryVariables = Exact<{
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  direction?: Direction;
  limit?: Scalars['Int']['input'];
  accounts?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type TopCounterpartiesQuery = { __typename?: 'Query', topCounterparties: Array<(
    { __typename?: 'CounterpartyTotal' }
    & CounterpartyTotalFragment
  )> };

export type ListTransactionsQueryVariables = Exact<{
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder> | TransactionOrder;
  pagination?: InputMaybe<OffsetPaginationInput>;
  withSuggestions?: Scalars['Boolean']['input'];
}>;


export type ListTransactionsQuery = { __typename?: 'Query', transactions: Array<(
    { __typename?: 'Transaction', suggestedCategories?: Array<(
      { __typename?: 'CategorySuggestion' }
      & SuggestionChipFragment
    )> }
    & ListTransactionFragment
  )> };

export type TransactionsCountQueryVariables = Exact<{
  filters?: InputMaybe<TransactionFilter>;
}>;


export type TransactionsCountQuery = { __typename?: 'Query', transactionsCount: number };

export type GetTransactionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTransactionQuery = { __typename?: 'Query', transaction: (
    { __typename?: 'Transaction' }
    & TransactionFragment
  ) };

export type TransactionSuggestionsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  limit?: Scalars['Int']['input'];
}>;


export type TransactionSuggestionsQuery = { __typename?: 'Query', transaction: { __typename?: 'Transaction', id: string, suggestedCategories: Array<(
      { __typename?: 'CategorySuggestion' }
      & CategorySuggestionFragment
    )> } };

export type AccountSyncsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type AccountSyncsSubscription = { __typename?: 'Subscription', accountSyncs: { __typename?: 'AccountSyncEvent', accountId: string, created: number, updated: number, pendingReplaced: number } };

export const BalanceFragmentDoc = gql`
    fragment Balance on BalanceSnapshot {
  id
  date
  balanceType
  amount
  currency
}
    `;
export const ListBankAccountFragmentDoc = gql`
    fragment ListBankAccount on BankAccount {
  id
  iban
  name
  kind
  currency
  product
  lastSyncedAt
  lastError
  lastErrorCode
  isSyncing
  nextSyncAllowedAt
  syncsRemainingToday
  latestBalance {
    ...Balance
  }
  connection {
    id
    aspspName
    aspspCountry
    provider
    status
    needsReauth
  }
}
    ${BalanceFragmentDoc}`;
export const HoldingFragmentDoc = gql`
    fragment Holding on HoldingSnapshot {
  id
  date
  isin
  name
  securityType
  quantity
  fifoPrice
  price
  valuation
  currency
  unrealizedGain
}
    `;
export const BankAccountFragmentDoc = gql`
    fragment BankAccount on BankAccount {
  ...ListBankAccount
  createdAt
  currentHoldings {
    ...Holding
  }
}
    ${ListBankAccountFragmentDoc}
${HoldingFragmentDoc}`;
export const ListBankConnectionFragmentDoc = gql`
    fragment ListBankConnection on BankConnection {
  id
  aspspName
  aspspCountry
  provider
  status
  linkStep
  validUntil
  needsReauth
  lastError
  lastErrorCode
  pendingExpiresAt
  isAbandoned
  nextSyncAllowedAt
  syncsRemainingToday
}
    `;
export const AuthSessionFragmentDoc = gql`
    fragment AuthSession on AuthSession {
  state
  openUrl
  expiresAt
  finish
  interval
  userCode
  redirectUrl
  connection {
    ...ListBankConnection
  }
}
    ${ListBankConnectionFragmentDoc}`;
export const ListCategoryFragmentDoc = gql`
    fragment ListCategory on Category {
  id
  name
  color
  kind
  key
  isBase
  hidden
  description
  parent {
    id
    name
  }
}
    `;
export const BudgetFragmentDoc = gql`
    fragment Budget on Budget {
  id
  amount
  currency
  startMonth
  endMonth
  createdAt
  category {
    ...ListCategory
  }
}
    ${ListCategoryFragmentDoc}`;
export const BudgetStatusFragmentDoc = gql`
    fragment BudgetStatus on BudgetStatus {
  month
  budgeted
  spent
  remaining
  ratio
  budget {
    ...Budget
  }
}
    ${BudgetFragmentDoc}`;
export const CategoryRuleFragmentDoc = gql`
    fragment CategoryRule on CategoryRule {
  id
  priority
  field
  match
  pattern
  direction
  amountMin
  amountMax
  active
  createdAt
  category {
    ...ListCategory
  }
}
    ${ListCategoryFragmentDoc}`;
export const CategoryFragmentDoc = gql`
    fragment Category on Category {
  ...ListCategory
  createdAt
  terms
  children(ordering: [{name: ASC}]) {
    ...ListCategory
  }
  rules {
    ...CategoryRule
  }
}
    ${ListCategoryFragmentDoc}
${CategoryRuleFragmentDoc}`;
export const CategoryDeletionFragmentDoc = gql`
    fragment CategoryDeletion on CategoryDeletion {
  categories
  transactions
  rules
  budgets
  dismissedBaseKeys
}
    `;
export const TransactionCategoryFragmentDoc = gql`
    fragment TransactionCategory on Category {
  id
  name
  color
  kind
}
    `;
export const CategorySuggestionFragmentDoc = gql`
    fragment CategorySuggestion on CategorySuggestion {
  score
  reason
  neighbours
  category {
    ...TransactionCategory
  }
  evidence {
    id
    counterparty
    remittance
    amount
    currency
    bookingDate
    transactionDate
  }
}
    ${TransactionCategoryFragmentDoc}`;
export const SuggestionChipFragmentDoc = gql`
    fragment SuggestionChip on CategorySuggestion {
  score
  reason
  neighbours
  category {
    ...TransactionCategory
  }
}
    ${TransactionCategoryFragmentDoc}`;
export const BankConnectionFragmentDoc = gql`
    fragment BankConnection on BankConnection {
  ...ListBankConnection
  createdAt
  linkedAt
  creator {
    id
    sub
    preferredUsername
  }
  accounts {
    ...ListBankAccount
  }
}
    ${ListBankConnectionFragmentDoc}
${ListBankAccountFragmentDoc}`;
export const PortfolioHoldingFragmentDoc = gql`
    fragment PortfolioHolding on HoldingSnapshot {
  ...Holding
  account {
    id
    name
  }
}
    ${HoldingFragmentDoc}`;
export const WindowInfoFragmentDoc = gql`
    fragment WindowInfo on WindowInfo {
  start
  end
  previousStart
  previousEnd
}
    `;
export const MoneyTotalsFragmentDoc = gql`
    fragment MoneyTotals on MoneyTotals {
  currency
  income
  expense
  net
  count
}
    `;
export const ChangeFragmentDoc = gql`
    fragment Change on Change {
  metric
  currency
  current
  previous
  delta
  ratio
}
    `;
export const ShareFragmentDoc = gql`
    fragment Share on Share {
  currency
  share
}
    `;
export const ListTransactionFragmentDoc = gql`
    fragment ListTransaction on Transaction {
  id
  bookingDate
  valueDate
  transactionDate
  amount
  currency
  status
  counterparty
  remittance
  isTransfer
  note
  kind
  isin
  quantity
  categorySource
  merchantSource
  merchant {
    id
    name
    logoUrl
  }
  category {
    ...TransactionCategory
  }
  account {
    id
    name
    iban
  }
}
    ${TransactionCategoryFragmentDoc}`;
export const ListMerchantFragmentDoc = gql`
    fragment ListMerchant on Merchant {
  id
  name
  key
  online
  logoUrl
  website
  transactionCount
  firstSeen
  lastSeen
  net {
    amount
    currency
  }
  category {
    ...TransactionCategory
  }
}
    ${TransactionCategoryFragmentDoc}`;
export const WeekdayTotalsFragmentDoc = gql`
    fragment WeekdayTotals on WeekdayTotals {
  weekday
  currency
  income
  expense
  count
}
    `;
export const ListRecurringPaymentFragmentDoc = gql`
    fragment ListRecurringPayment on RecurringPayment {
  id
  label
  amount
  currency
  intervalDays
  occurrences
  lastSeen
  nextExpected
  status
  account {
    id
    name
    iban
  }
}
    `;
export const PeriodOverviewFragmentDoc = gql`
    fragment PeriodOverview on PeriodOverview {
  window {
    ...WindowInfo
  }
  totals {
    ...MoneyTotals
  }
  previous {
    ...MoneyTotals
  }
  changes {
    ...Change
  }
  savingsRate {
    ...Share
  }
  categoryMovers {
    change {
      ...Change
    }
    category {
      ...TransactionCategory
    }
  }
  merchantMovers {
    change {
      ...Change
    }
    merchant {
      id
      name
      logoUrl
    }
  }
  largestTransactions {
    ...ListTransaction
  }
  newMerchants {
    ...ListMerchant
  }
  daily {
    date
    currency
    income
    expense
    count
  }
  weekdays {
    ...WeekdayTotals
  }
  recurringDue {
    ...ListRecurringPayment
  }
}
    ${WindowInfoFragmentDoc}
${MoneyTotalsFragmentDoc}
${ChangeFragmentDoc}
${ShareFragmentDoc}
${TransactionCategoryFragmentDoc}
${ListTransactionFragmentDoc}
${ListMerchantFragmentDoc}
${WeekdayTotalsFragmentDoc}
${ListRecurringPaymentFragmentDoc}`;
export const TicketStatsFragmentDoc = gql`
    fragment TicketStats on TicketStats {
  currency
  average
  median
  smallest
  largest
}
    `;
export const VisitStatsFragmentDoc = gql`
    fragment VisitStats on VisitStats {
  visits
  firstVisit
  lastVisit
  daysSinceLastVisit
  averageDaysBetweenVisits
  visitsPerMonth
}
    `;
export const CashflowBucketFragmentDoc = gql`
    fragment CashflowBucket on CashflowBucket {
  periodStart
  currency
  income
  expense
  net
  count
}
    `;
export const RankedLocationFragmentDoc = gql`
    fragment RankedLocation on RankedLocation {
  currency
  income
  expense
  net
  count
  share
  location {
    id
    name
    city
    merchant {
      id
      name
    }
  }
}
    `;
export const MerchantInsightsFragmentDoc = gql`
    fragment MerchantInsights on MerchantInsights {
  window {
    ...WindowInfo
  }
  totals {
    ...MoneyTotals
  }
  previous {
    ...MoneyTotals
  }
  changes {
    ...Change
  }
  tickets {
    ...TicketStats
  }
  visits {
    ...VisitStats
  }
  monthly {
    ...CashflowBucket
  }
  weekdays {
    ...WeekdayTotals
  }
  locations {
    ...RankedLocation
  }
  shareOfCategory {
    ...Share
  }
}
    ${WindowInfoFragmentDoc}
${MoneyTotalsFragmentDoc}
${ChangeFragmentDoc}
${TicketStatsFragmentDoc}
${VisitStatsFragmentDoc}
${CashflowBucketFragmentDoc}
${WeekdayTotalsFragmentDoc}
${RankedLocationFragmentDoc}
${ShareFragmentDoc}`;
export const RankedCategoryFragmentDoc = gql`
    fragment RankedCategory on RankedCategory {
  currency
  income
  expense
  net
  count
  share
  category {
    ...TransactionCategory
  }
}
    ${TransactionCategoryFragmentDoc}`;
export const RankedMerchantFragmentDoc = gql`
    fragment RankedMerchant on RankedMerchant {
  currency
  income
  expense
  net
  count
  share
  merchant {
    id
    name
    logoUrl
    category {
      ...TransactionCategory
    }
  }
}
    ${TransactionCategoryFragmentDoc}`;
export const CounterpartyTotalFragmentDoc = gql`
    fragment CounterpartyTotal on CounterpartyTotal {
  counterparty
  currency
  total
  count
}
    `;
export const CategoryInsightsFragmentDoc = gql`
    fragment CategoryInsights on CategoryInsights {
  window {
    ...WindowInfo
  }
  totals {
    ...MoneyTotals
  }
  previous {
    ...MoneyTotals
  }
  changes {
    ...Change
  }
  monthly {
    ...CashflowBucket
  }
  monthlyAverage {
    ...MoneyTotals
  }
  shareOfSpending {
    ...Share
  }
  children {
    ...RankedCategory
  }
  topMerchants {
    ...RankedMerchant
  }
  topCounterparties {
    ...CounterpartyTotal
  }
  tickets {
    ...TicketStats
  }
}
    ${WindowInfoFragmentDoc}
${MoneyTotalsFragmentDoc}
${ChangeFragmentDoc}
${CashflowBucketFragmentDoc}
${ShareFragmentDoc}
${RankedCategoryFragmentDoc}
${RankedMerchantFragmentDoc}
${CounterpartyTotalFragmentDoc}
${TicketStatsFragmentDoc}`;
export const LocationInsightsFragmentDoc = gql`
    fragment LocationInsights on LocationInsights {
  window {
    ...WindowInfo
  }
  totals {
    ...MoneyTotals
  }
  tickets {
    ...TicketStats
  }
  visits {
    ...VisitStats
  }
  monthly {
    ...CashflowBucket
  }
  weekdays {
    ...WeekdayTotals
  }
}
    ${WindowInfoFragmentDoc}
${MoneyTotalsFragmentDoc}
${TicketStatsFragmentDoc}
${VisitStatsFragmentDoc}
${CashflowBucketFragmentDoc}
${WeekdayTotalsFragmentDoc}`;
export const AccountInsightsFragmentDoc = gql`
    fragment AccountInsights on AccountInsights {
  window {
    ...WindowInfo
  }
  totals {
    ...MoneyTotals
  }
  monthly {
    ...CashflowBucket
  }
  averageBalance {
    amount
    currency
  }
  lowestBalance {
    amount
    currency
    date
  }
  highestBalance {
    amount
    currency
    date
  }
  largestIn {
    ...ListTransaction
  }
  largestOut {
    ...ListTransaction
  }
  topCategories {
    ...RankedCategory
  }
  topMerchants {
    ...RankedMerchant
  }
}
    ${WindowInfoFragmentDoc}
${MoneyTotalsFragmentDoc}
${CashflowBucketFragmentDoc}
${ListTransactionFragmentDoc}
${RankedCategoryFragmentDoc}
${RankedMerchantFragmentDoc}`;
export const AreaInsightsFragmentDoc = gql`
    fragment AreaInsights on AreaInsights {
  window {
    ...WindowInfo
  }
  totals {
    ...MoneyTotals
  }
  merchants {
    ...RankedMerchant
  }
  categories {
    ...RankedCategory
  }
  locations {
    ...RankedLocation
  }
}
    ${WindowInfoFragmentDoc}
${MoneyTotalsFragmentDoc}
${RankedMerchantFragmentDoc}
${RankedCategoryFragmentDoc}
${RankedLocationFragmentDoc}`;
export const GridCellFragmentDoc = gql`
    fragment GridCell on GridCell {
  type
  id
  geometry {
    type
    coordinates
  }
  properties {
    currency
    income
    expense
    count
    merchants
    locations
  }
}
    `;
export const RecurringInsightsFragmentDoc = gql`
    fragment RecurringInsights on RecurringInsights {
  monthlyCommitted {
    ...MoneyTotals
  }
  byCategory {
    currency
    monthly
    count
    category {
      ...TransactionCategory
    }
  }
  dueSoon {
    ...ListRecurringPayment
  }
  missed {
    ...ListRecurringPayment
  }
  priceChanges {
    currency
    previous
    current
    delta
    recurring {
      ...ListRecurringPayment
    }
  }
}
    ${MoneyTotalsFragmentDoc}
${TransactionCategoryFragmentDoc}
${ListRecurringPaymentFragmentDoc}`;
export const PortfolioInsightsFragmentDoc = gql`
    fragment PortfolioInsights on PortfolioInsights {
  valuation {
    amount
    currency
  }
  costBasis {
    amount
    currency
  }
  unrealizedGain {
    amount
    currency
  }
  valuationHistory {
    date
    currency
    valuation
    invested
    gain
  }
  allocation {
    securityType
    currency
    valuation
    share
  }
  income {
    year
    kind
    currency
    amount
    count
  }
}
    `;
export const MerchantLocationFragmentDoc = gql`
    fragment MerchantLocation on MerchantLocation {
  id
  name
  street
  postalCode
  city
  region
  country
  latitude
  longitude
  source
  storeCode
  transactionCount
  lastVisit
  notes
  geocodedAt
  merchant {
    id
    name
  }
}
    `;
export const MerchantRuleFragmentDoc = gql`
    fragment MerchantRule on MerchantRule {
  id
  priority
  field
  match
  pattern
  direction
  amountMin
  amountMax
  active
  transactionCount
  location {
    id
    name
  }
}
    `;
export const MerchantFragmentDoc = gql`
    fragment Merchant on Merchant {
  ...ListMerchant
  description
  createdAt
  aliases {
    id
    pattern
  }
  locations {
    ...MerchantLocation
  }
  rules {
    ...MerchantRule
  }
}
    ${ListMerchantFragmentDoc}
${MerchantLocationFragmentDoc}
${MerchantRuleFragmentDoc}`;
export const MerchantLocationFeatureFragmentDoc = gql`
    fragment MerchantLocationFeature on MerchantLocationFeature {
  type
  id
  geometry {
    type
    coordinates
  }
  properties {
    id
    name
    merchantId
    merchantName
    categoryName
    color
    street
    city
    net
    currency
    transactionCount
    lastVisit
    source
  }
}
    `;
export const MerchantCandidateFragmentDoc = gql`
    fragment MerchantCandidate on MerchantCandidate {
  key
  count
  samples
  storeCodes
  transactionIds
  totals {
    amount
    currency
  }
  suggestedCategory {
    ...TransactionCategory
  }
}
    ${TransactionCategoryFragmentDoc}`;
export const MerchantTotalFragmentDoc = gql`
    fragment MerchantTotal on MerchantTotal {
  currency
  income
  expense
  net
  count
  merchant {
    id
    name
    logoUrl
    category {
      ...TransactionCategory
    }
  }
}
    ${TransactionCategoryFragmentDoc}`;
export const RecurringPaymentFragmentDoc = gql`
    fragment RecurringPayment on RecurringPayment {
  ...ListRecurringPayment
  transactions(ordering: [{bookingDate: DESC}], pagination: {limit: 24}) {
    ...ListTransaction
  }
}
    ${ListRecurringPaymentFragmentDoc}
${ListTransactionFragmentDoc}`;
export const CategoryTotalFragmentDoc = gql`
    fragment CategoryTotal on CategoryTotal {
  currency
  income
  expense
  net
  count
  category {
    ...TransactionCategory
  }
}
    ${TransactionCategoryFragmentDoc}`;
export const SyncResultFragmentDoc = gql`
    fragment SyncResult on SyncResult {
  created
  updated
  pendingReplaced
  balances
  categorized
  holdings
  account {
    ...ListBankAccount
  }
}
    ${ListBankAccountFragmentDoc}`;
export const TransactionFragmentDoc = gql`
    fragment Transaction on Transaction {
  ...ListTransaction
  counterpartyIban
  entryReference
  isTransferManual
  merchantLocation {
    id
    name
    street
    city
    latitude
    longitude
  }
  createdAt
  updatedAt
}
    ${ListTransactionFragmentDoc}`;
export const CreateBudgetDocument = gql`
    mutation CreateBudget($input: CreateBudgetInput!) {
  createBudget(input: $input) {
    ...Budget
  }
}
    ${BudgetFragmentDoc}`;
export type CreateBudgetMutationFn = Apollo.MutationFunction<CreateBudgetMutation, CreateBudgetMutationVariables>;

/**
 * __useCreateBudgetMutation__
 *
 * To run a mutation, you first call `useCreateBudgetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateBudgetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createBudgetMutation, { data, loading, error }] = useCreateBudgetMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateBudgetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateBudgetMutation, CreateBudgetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateBudgetMutation, CreateBudgetMutationVariables>(CreateBudgetDocument, options);
      }
export type CreateBudgetMutationHookResult = ReturnType<typeof useCreateBudgetMutation>;
export type CreateBudgetMutationResult = Apollo.MutationResult<CreateBudgetMutation>;
export type CreateBudgetMutationOptions = Apollo.BaseMutationOptions<CreateBudgetMutation, CreateBudgetMutationVariables>;
export const UpdateBudgetDocument = gql`
    mutation UpdateBudget($input: UpdateBudgetInput!) {
  updateBudget(input: $input) {
    ...Budget
  }
}
    ${BudgetFragmentDoc}`;
export type UpdateBudgetMutationFn = Apollo.MutationFunction<UpdateBudgetMutation, UpdateBudgetMutationVariables>;

/**
 * __useUpdateBudgetMutation__
 *
 * To run a mutation, you first call `useUpdateBudgetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateBudgetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateBudgetMutation, { data, loading, error }] = useUpdateBudgetMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateBudgetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateBudgetMutation, UpdateBudgetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateBudgetMutation, UpdateBudgetMutationVariables>(UpdateBudgetDocument, options);
      }
export type UpdateBudgetMutationHookResult = ReturnType<typeof useUpdateBudgetMutation>;
export type UpdateBudgetMutationResult = Apollo.MutationResult<UpdateBudgetMutation>;
export type UpdateBudgetMutationOptions = Apollo.BaseMutationOptions<UpdateBudgetMutation, UpdateBudgetMutationVariables>;
export const DeleteBudgetDocument = gql`
    mutation DeleteBudget($id: ID!) {
  deleteBudget(id: $id)
}
    `;
export type DeleteBudgetMutationFn = Apollo.MutationFunction<DeleteBudgetMutation, DeleteBudgetMutationVariables>;

/**
 * __useDeleteBudgetMutation__
 *
 * To run a mutation, you first call `useDeleteBudgetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteBudgetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteBudgetMutation, { data, loading, error }] = useDeleteBudgetMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteBudgetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteBudgetMutation, DeleteBudgetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteBudgetMutation, DeleteBudgetMutationVariables>(DeleteBudgetDocument, options);
      }
export type DeleteBudgetMutationHookResult = ReturnType<typeof useDeleteBudgetMutation>;
export type DeleteBudgetMutationResult = Apollo.MutationResult<DeleteBudgetMutation>;
export type DeleteBudgetMutationOptions = Apollo.BaseMutationOptions<DeleteBudgetMutation, DeleteBudgetMutationVariables>;
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
    mutation DeleteCategory($id: ID!, $reassignTo: ID, $dryRun: Boolean! = false) {
  deleteCategory(id: $id, reassignTo: $reassignTo, dryRun: $dryRun) {
    ...CategoryDeletion
  }
}
    ${CategoryDeletionFragmentDoc}`;
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
 *      reassignTo: // value for 'reassignTo'
 *      dryRun: // value for 'dryRun'
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
export const SeedDefaultCategoriesDocument = gql`
    mutation SeedDefaultCategories {
  seedDefaultCategories {
    ...ListCategory
  }
}
    ${ListCategoryFragmentDoc}`;
export type SeedDefaultCategoriesMutationFn = Apollo.MutationFunction<SeedDefaultCategoriesMutation, SeedDefaultCategoriesMutationVariables>;

/**
 * __useSeedDefaultCategoriesMutation__
 *
 * To run a mutation, you first call `useSeedDefaultCategoriesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSeedDefaultCategoriesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [seedDefaultCategoriesMutation, { data, loading, error }] = useSeedDefaultCategoriesMutation({
 *   variables: {
 *   },
 * });
 */
export function useSeedDefaultCategoriesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SeedDefaultCategoriesMutation, SeedDefaultCategoriesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SeedDefaultCategoriesMutation, SeedDefaultCategoriesMutationVariables>(SeedDefaultCategoriesDocument, options);
      }
export type SeedDefaultCategoriesMutationHookResult = ReturnType<typeof useSeedDefaultCategoriesMutation>;
export type SeedDefaultCategoriesMutationResult = Apollo.MutationResult<SeedDefaultCategoriesMutation>;
export type SeedDefaultCategoriesMutationOptions = Apollo.BaseMutationOptions<SeedDefaultCategoriesMutation, SeedDefaultCategoriesMutationVariables>;
export const SyncBaseCategoriesDocument = gql`
    mutation SyncBaseCategories {
  syncBaseCategories {
    ...ListCategory
  }
}
    ${ListCategoryFragmentDoc}`;
export type SyncBaseCategoriesMutationFn = Apollo.MutationFunction<SyncBaseCategoriesMutation, SyncBaseCategoriesMutationVariables>;

/**
 * __useSyncBaseCategoriesMutation__
 *
 * To run a mutation, you first call `useSyncBaseCategoriesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSyncBaseCategoriesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [syncBaseCategoriesMutation, { data, loading, error }] = useSyncBaseCategoriesMutation({
 *   variables: {
 *   },
 * });
 */
export function useSyncBaseCategoriesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SyncBaseCategoriesMutation, SyncBaseCategoriesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SyncBaseCategoriesMutation, SyncBaseCategoriesMutationVariables>(SyncBaseCategoriesDocument, options);
      }
export type SyncBaseCategoriesMutationHookResult = ReturnType<typeof useSyncBaseCategoriesMutation>;
export type SyncBaseCategoriesMutationResult = Apollo.MutationResult<SyncBaseCategoriesMutation>;
export type SyncBaseCategoriesMutationOptions = Apollo.BaseMutationOptions<SyncBaseCategoriesMutation, SyncBaseCategoriesMutationVariables>;
export const RestoreBaseCategoryDocument = gql`
    mutation RestoreBaseCategory($key: String!) {
  restoreBaseCategory(key: $key) {
    ...ListCategory
  }
}
    ${ListCategoryFragmentDoc}`;
export type RestoreBaseCategoryMutationFn = Apollo.MutationFunction<RestoreBaseCategoryMutation, RestoreBaseCategoryMutationVariables>;

/**
 * __useRestoreBaseCategoryMutation__
 *
 * To run a mutation, you first call `useRestoreBaseCategoryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRestoreBaseCategoryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [restoreBaseCategoryMutation, { data, loading, error }] = useRestoreBaseCategoryMutation({
 *   variables: {
 *      key: // value for 'key'
 *   },
 * });
 */
export function useRestoreBaseCategoryMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RestoreBaseCategoryMutation, RestoreBaseCategoryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RestoreBaseCategoryMutation, RestoreBaseCategoryMutationVariables>(RestoreBaseCategoryDocument, options);
      }
export type RestoreBaseCategoryMutationHookResult = ReturnType<typeof useRestoreBaseCategoryMutation>;
export type RestoreBaseCategoryMutationResult = Apollo.MutationResult<RestoreBaseCategoryMutation>;
export type RestoreBaseCategoryMutationOptions = Apollo.BaseMutationOptions<RestoreBaseCategoryMutation, RestoreBaseCategoryMutationVariables>;
export const CreateCategoryRuleDocument = gql`
    mutation CreateCategoryRule($input: CreateCategoryRuleInput!) {
  createCategoryRule(input: $input) {
    ...CategoryRule
  }
}
    ${CategoryRuleFragmentDoc}`;
export type CreateCategoryRuleMutationFn = Apollo.MutationFunction<CreateCategoryRuleMutation, CreateCategoryRuleMutationVariables>;

/**
 * __useCreateCategoryRuleMutation__
 *
 * To run a mutation, you first call `useCreateCategoryRuleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCategoryRuleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCategoryRuleMutation, { data, loading, error }] = useCreateCategoryRuleMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateCategoryRuleMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateCategoryRuleMutation, CreateCategoryRuleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateCategoryRuleMutation, CreateCategoryRuleMutationVariables>(CreateCategoryRuleDocument, options);
      }
export type CreateCategoryRuleMutationHookResult = ReturnType<typeof useCreateCategoryRuleMutation>;
export type CreateCategoryRuleMutationResult = Apollo.MutationResult<CreateCategoryRuleMutation>;
export type CreateCategoryRuleMutationOptions = Apollo.BaseMutationOptions<CreateCategoryRuleMutation, CreateCategoryRuleMutationVariables>;
export const UpdateCategoryRuleDocument = gql`
    mutation UpdateCategoryRule($input: UpdateCategoryRuleInput!) {
  updateCategoryRule(input: $input) {
    ...CategoryRule
  }
}
    ${CategoryRuleFragmentDoc}`;
export type UpdateCategoryRuleMutationFn = Apollo.MutationFunction<UpdateCategoryRuleMutation, UpdateCategoryRuleMutationVariables>;

/**
 * __useUpdateCategoryRuleMutation__
 *
 * To run a mutation, you first call `useUpdateCategoryRuleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCategoryRuleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCategoryRuleMutation, { data, loading, error }] = useUpdateCategoryRuleMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCategoryRuleMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateCategoryRuleMutation, UpdateCategoryRuleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateCategoryRuleMutation, UpdateCategoryRuleMutationVariables>(UpdateCategoryRuleDocument, options);
      }
export type UpdateCategoryRuleMutationHookResult = ReturnType<typeof useUpdateCategoryRuleMutation>;
export type UpdateCategoryRuleMutationResult = Apollo.MutationResult<UpdateCategoryRuleMutation>;
export type UpdateCategoryRuleMutationOptions = Apollo.BaseMutationOptions<UpdateCategoryRuleMutation, UpdateCategoryRuleMutationVariables>;
export const DeleteCategoryRuleDocument = gql`
    mutation DeleteCategoryRule($id: ID!) {
  deleteCategoryRule(id: $id)
}
    `;
export type DeleteCategoryRuleMutationFn = Apollo.MutationFunction<DeleteCategoryRuleMutation, DeleteCategoryRuleMutationVariables>;

/**
 * __useDeleteCategoryRuleMutation__
 *
 * To run a mutation, you first call `useDeleteCategoryRuleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCategoryRuleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCategoryRuleMutation, { data, loading, error }] = useDeleteCategoryRuleMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteCategoryRuleMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteCategoryRuleMutation, DeleteCategoryRuleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteCategoryRuleMutation, DeleteCategoryRuleMutationVariables>(DeleteCategoryRuleDocument, options);
      }
export type DeleteCategoryRuleMutationHookResult = ReturnType<typeof useDeleteCategoryRuleMutation>;
export type DeleteCategoryRuleMutationResult = Apollo.MutationResult<DeleteCategoryRuleMutation>;
export type DeleteCategoryRuleMutationOptions = Apollo.BaseMutationOptions<DeleteCategoryRuleMutation, DeleteCategoryRuleMutationVariables>;
export const ReapplyRulesDocument = gql`
    mutation ReapplyRules($accounts: [ID!], $semanticAssign: Boolean! = true) {
  reapplyRules(accounts: $accounts, semanticAssign: $semanticAssign)
}
    `;
export type ReapplyRulesMutationFn = Apollo.MutationFunction<ReapplyRulesMutation, ReapplyRulesMutationVariables>;

/**
 * __useReapplyRulesMutation__
 *
 * To run a mutation, you first call `useReapplyRulesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReapplyRulesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reapplyRulesMutation, { data, loading, error }] = useReapplyRulesMutation({
 *   variables: {
 *      accounts: // value for 'accounts'
 *      semanticAssign: // value for 'semanticAssign'
 *   },
 * });
 */
export function useReapplyRulesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ReapplyRulesMutation, ReapplyRulesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ReapplyRulesMutation, ReapplyRulesMutationVariables>(ReapplyRulesDocument, options);
      }
export type ReapplyRulesMutationHookResult = ReturnType<typeof useReapplyRulesMutation>;
export type ReapplyRulesMutationResult = Apollo.MutationResult<ReapplyRulesMutation>;
export type ReapplyRulesMutationOptions = Apollo.BaseMutationOptions<ReapplyRulesMutation, ReapplyRulesMutationVariables>;
export const StartBankLinkDocument = gql`
    mutation StartBankLink($input: StartBankLinkInput!) {
  startBankLink(input: $input) {
    ...AuthSession
  }
}
    ${AuthSessionFragmentDoc}`;
export type StartBankLinkMutationFn = Apollo.MutationFunction<StartBankLinkMutation, StartBankLinkMutationVariables>;

/**
 * __useStartBankLinkMutation__
 *
 * To run a mutation, you first call `useStartBankLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStartBankLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [startBankLinkMutation, { data, loading, error }] = useStartBankLinkMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useStartBankLinkMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<StartBankLinkMutation, StartBankLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<StartBankLinkMutation, StartBankLinkMutationVariables>(StartBankLinkDocument, options);
      }
export type StartBankLinkMutationHookResult = ReturnType<typeof useStartBankLinkMutation>;
export type StartBankLinkMutationResult = Apollo.MutationResult<StartBankLinkMutation>;
export type StartBankLinkMutationOptions = Apollo.BaseMutationOptions<StartBankLinkMutation, StartBankLinkMutationVariables>;
export const CompleteBankLinkDocument = gql`
    mutation CompleteBankLink($input: CompleteBankLinkInput!) {
  completeBankLink(input: $input) {
    ...BankConnection
  }
}
    ${BankConnectionFragmentDoc}`;
export type CompleteBankLinkMutationFn = Apollo.MutationFunction<CompleteBankLinkMutation, CompleteBankLinkMutationVariables>;

/**
 * __useCompleteBankLinkMutation__
 *
 * To run a mutation, you first call `useCompleteBankLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCompleteBankLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [completeBankLinkMutation, { data, loading, error }] = useCompleteBankLinkMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCompleteBankLinkMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CompleteBankLinkMutation, CompleteBankLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CompleteBankLinkMutation, CompleteBankLinkMutationVariables>(CompleteBankLinkDocument, options);
      }
export type CompleteBankLinkMutationHookResult = ReturnType<typeof useCompleteBankLinkMutation>;
export type CompleteBankLinkMutationResult = Apollo.MutationResult<CompleteBankLinkMutation>;
export type CompleteBankLinkMutationOptions = Apollo.BaseMutationOptions<CompleteBankLinkMutation, CompleteBankLinkMutationVariables>;
export const RevokeBankConnectionDocument = gql`
    mutation RevokeBankConnection($id: ID!) {
  revokeBankConnection(id: $id) {
    ...BankConnection
  }
}
    ${BankConnectionFragmentDoc}`;
export type RevokeBankConnectionMutationFn = Apollo.MutationFunction<RevokeBankConnectionMutation, RevokeBankConnectionMutationVariables>;

/**
 * __useRevokeBankConnectionMutation__
 *
 * To run a mutation, you first call `useRevokeBankConnectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeBankConnectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeBankConnectionMutation, { data, loading, error }] = useRevokeBankConnectionMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRevokeBankConnectionMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevokeBankConnectionMutation, RevokeBankConnectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevokeBankConnectionMutation, RevokeBankConnectionMutationVariables>(RevokeBankConnectionDocument, options);
      }
export type RevokeBankConnectionMutationHookResult = ReturnType<typeof useRevokeBankConnectionMutation>;
export type RevokeBankConnectionMutationResult = Apollo.MutationResult<RevokeBankConnectionMutation>;
export type RevokeBankConnectionMutationOptions = Apollo.BaseMutationOptions<RevokeBankConnectionMutation, RevokeBankConnectionMutationVariables>;
export const SyncAccountDocument = gql`
    mutation SyncAccount($id: ID!) {
  syncAccount(id: $id) {
    ...SyncResult
  }
}
    ${SyncResultFragmentDoc}`;
export type SyncAccountMutationFn = Apollo.MutationFunction<SyncAccountMutation, SyncAccountMutationVariables>;

/**
 * __useSyncAccountMutation__
 *
 * To run a mutation, you first call `useSyncAccountMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSyncAccountMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [syncAccountMutation, { data, loading, error }] = useSyncAccountMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useSyncAccountMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SyncAccountMutation, SyncAccountMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SyncAccountMutation, SyncAccountMutationVariables>(SyncAccountDocument, options);
      }
export type SyncAccountMutationHookResult = ReturnType<typeof useSyncAccountMutation>;
export type SyncAccountMutationResult = Apollo.MutationResult<SyncAccountMutation>;
export type SyncAccountMutationOptions = Apollo.BaseMutationOptions<SyncAccountMutation, SyncAccountMutationVariables>;
export const SyncConnectionDocument = gql`
    mutation SyncConnection($id: ID!) {
  syncConnection(id: $id) {
    ...SyncResult
  }
}
    ${SyncResultFragmentDoc}`;
export type SyncConnectionMutationFn = Apollo.MutationFunction<SyncConnectionMutation, SyncConnectionMutationVariables>;

/**
 * __useSyncConnectionMutation__
 *
 * To run a mutation, you first call `useSyncConnectionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSyncConnectionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [syncConnectionMutation, { data, loading, error }] = useSyncConnectionMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useSyncConnectionMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SyncConnectionMutation, SyncConnectionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SyncConnectionMutation, SyncConnectionMutationVariables>(SyncConnectionDocument, options);
      }
export type SyncConnectionMutationHookResult = ReturnType<typeof useSyncConnectionMutation>;
export type SyncConnectionMutationResult = Apollo.MutationResult<SyncConnectionMutation>;
export type SyncConnectionMutationOptions = Apollo.BaseMutationOptions<SyncConnectionMutation, SyncConnectionMutationVariables>;
export const StartScalableLinkDocument = gql`
    mutation StartScalableLink {
  startScalableLink {
    ...AuthSession
  }
}
    ${AuthSessionFragmentDoc}`;
export type StartScalableLinkMutationFn = Apollo.MutationFunction<StartScalableLinkMutation, StartScalableLinkMutationVariables>;

/**
 * __useStartScalableLinkMutation__
 *
 * To run a mutation, you first call `useStartScalableLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useStartScalableLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [startScalableLinkMutation, { data, loading, error }] = useStartScalableLinkMutation({
 *   variables: {
 *   },
 * });
 */
export function useStartScalableLinkMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<StartScalableLinkMutation, StartScalableLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<StartScalableLinkMutation, StartScalableLinkMutationVariables>(StartScalableLinkDocument, options);
      }
export type StartScalableLinkMutationHookResult = ReturnType<typeof useStartScalableLinkMutation>;
export type StartScalableLinkMutationResult = Apollo.MutationResult<StartScalableLinkMutation>;
export type StartScalableLinkMutationOptions = Apollo.BaseMutationOptions<StartScalableLinkMutation, StartScalableLinkMutationVariables>;
export const CompleteScalableLinkDocument = gql`
    mutation CompleteScalableLink($state: String!) {
  completeScalableLink(state: $state) {
    ...BankConnection
  }
}
    ${BankConnectionFragmentDoc}`;
export type CompleteScalableLinkMutationFn = Apollo.MutationFunction<CompleteScalableLinkMutation, CompleteScalableLinkMutationVariables>;

/**
 * __useCompleteScalableLinkMutation__
 *
 * To run a mutation, you first call `useCompleteScalableLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCompleteScalableLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [completeScalableLinkMutation, { data, loading, error }] = useCompleteScalableLinkMutation({
 *   variables: {
 *      state: // value for 'state'
 *   },
 * });
 */
export function useCompleteScalableLinkMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CompleteScalableLinkMutation, CompleteScalableLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CompleteScalableLinkMutation, CompleteScalableLinkMutationVariables>(CompleteScalableLinkDocument, options);
      }
export type CompleteScalableLinkMutationHookResult = ReturnType<typeof useCompleteScalableLinkMutation>;
export type CompleteScalableLinkMutationResult = Apollo.MutationResult<CompleteScalableLinkMutation>;
export type CompleteScalableLinkMutationOptions = Apollo.BaseMutationOptions<CompleteScalableLinkMutation, CompleteScalableLinkMutationVariables>;
export const ResumeLinkDocument = gql`
    mutation ResumeLink($connection: ID!) {
  resumeLink(connection: $connection) {
    ...AuthSession
  }
}
    ${AuthSessionFragmentDoc}`;
export type ResumeLinkMutationFn = Apollo.MutationFunction<ResumeLinkMutation, ResumeLinkMutationVariables>;

/**
 * __useResumeLinkMutation__
 *
 * To run a mutation, you first call `useResumeLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResumeLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resumeLinkMutation, { data, loading, error }] = useResumeLinkMutation({
 *   variables: {
 *      connection: // value for 'connection'
 *   },
 * });
 */
export function useResumeLinkMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ResumeLinkMutation, ResumeLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ResumeLinkMutation, ResumeLinkMutationVariables>(ResumeLinkDocument, options);
      }
export type ResumeLinkMutationHookResult = ReturnType<typeof useResumeLinkMutation>;
export type ResumeLinkMutationResult = Apollo.MutationResult<ResumeLinkMutation>;
export type ResumeLinkMutationOptions = Apollo.BaseMutationOptions<ResumeLinkMutation, ResumeLinkMutationVariables>;
export const CancelLinkDocument = gql`
    mutation CancelLink($connection: ID!) {
  cancelLink(connection: $connection)
}
    `;
export type CancelLinkMutationFn = Apollo.MutationFunction<CancelLinkMutation, CancelLinkMutationVariables>;

/**
 * __useCancelLinkMutation__
 *
 * To run a mutation, you first call `useCancelLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCancelLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cancelLinkMutation, { data, loading, error }] = useCancelLinkMutation({
 *   variables: {
 *      connection: // value for 'connection'
 *   },
 * });
 */
export function useCancelLinkMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CancelLinkMutation, CancelLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CancelLinkMutation, CancelLinkMutationVariables>(CancelLinkDocument, options);
      }
export type CancelLinkMutationHookResult = ReturnType<typeof useCancelLinkMutation>;
export type CancelLinkMutationResult = Apollo.MutationResult<CancelLinkMutation>;
export type CancelLinkMutationOptions = Apollo.BaseMutationOptions<CancelLinkMutation, CancelLinkMutationVariables>;
export const UpdateMerchantDocument = gql`
    mutation UpdateMerchant($input: UpdateMerchantInput!) {
  updateMerchant(input: $input) {
    ...Merchant
  }
}
    ${MerchantFragmentDoc}`;
export type UpdateMerchantMutationFn = Apollo.MutationFunction<UpdateMerchantMutation, UpdateMerchantMutationVariables>;

/**
 * __useUpdateMerchantMutation__
 *
 * To run a mutation, you first call `useUpdateMerchantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMerchantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMerchantMutation, { data, loading, error }] = useUpdateMerchantMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMerchantMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateMerchantMutation, UpdateMerchantMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateMerchantMutation, UpdateMerchantMutationVariables>(UpdateMerchantDocument, options);
      }
export type UpdateMerchantMutationHookResult = ReturnType<typeof useUpdateMerchantMutation>;
export type UpdateMerchantMutationResult = Apollo.MutationResult<UpdateMerchantMutation>;
export type UpdateMerchantMutationOptions = Apollo.BaseMutationOptions<UpdateMerchantMutation, UpdateMerchantMutationVariables>;
export const DeleteMerchantDocument = gql`
    mutation DeleteMerchant($id: ID!) {
  deleteMerchant(id: $id)
}
    `;
export type DeleteMerchantMutationFn = Apollo.MutationFunction<DeleteMerchantMutation, DeleteMerchantMutationVariables>;

/**
 * __useDeleteMerchantMutation__
 *
 * To run a mutation, you first call `useDeleteMerchantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMerchantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMerchantMutation, { data, loading, error }] = useDeleteMerchantMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteMerchantMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteMerchantMutation, DeleteMerchantMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteMerchantMutation, DeleteMerchantMutationVariables>(DeleteMerchantDocument, options);
      }
export type DeleteMerchantMutationHookResult = ReturnType<typeof useDeleteMerchantMutation>;
export type DeleteMerchantMutationResult = Apollo.MutationResult<DeleteMerchantMutation>;
export type DeleteMerchantMutationOptions = Apollo.BaseMutationOptions<DeleteMerchantMutation, DeleteMerchantMutationVariables>;
export const AssignMerchantDocument = gql`
    mutation AssignMerchant($input: AssignMerchantInput!) {
  assignMerchant(input: $input) {
    ...ListTransaction
  }
}
    ${ListTransactionFragmentDoc}`;
export type AssignMerchantMutationFn = Apollo.MutationFunction<AssignMerchantMutation, AssignMerchantMutationVariables>;

/**
 * __useAssignMerchantMutation__
 *
 * To run a mutation, you first call `useAssignMerchantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAssignMerchantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [assignMerchantMutation, { data, loading, error }] = useAssignMerchantMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAssignMerchantMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AssignMerchantMutation, AssignMerchantMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AssignMerchantMutation, AssignMerchantMutationVariables>(AssignMerchantDocument, options);
      }
export type AssignMerchantMutationHookResult = ReturnType<typeof useAssignMerchantMutation>;
export type AssignMerchantMutationResult = Apollo.MutationResult<AssignMerchantMutation>;
export type AssignMerchantMutationOptions = Apollo.BaseMutationOptions<AssignMerchantMutation, AssignMerchantMutationVariables>;
export const UpdateMerchantLocationDocument = gql`
    mutation UpdateMerchantLocation($input: UpdateMerchantLocationInput!) {
  updateMerchantLocation(input: $input) {
    ...MerchantLocation
  }
}
    ${MerchantLocationFragmentDoc}`;
export type UpdateMerchantLocationMutationFn = Apollo.MutationFunction<UpdateMerchantLocationMutation, UpdateMerchantLocationMutationVariables>;

/**
 * __useUpdateMerchantLocationMutation__
 *
 * To run a mutation, you first call `useUpdateMerchantLocationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMerchantLocationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMerchantLocationMutation, { data, loading, error }] = useUpdateMerchantLocationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMerchantLocationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateMerchantLocationMutation, UpdateMerchantLocationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateMerchantLocationMutation, UpdateMerchantLocationMutationVariables>(UpdateMerchantLocationDocument, options);
      }
export type UpdateMerchantLocationMutationHookResult = ReturnType<typeof useUpdateMerchantLocationMutation>;
export type UpdateMerchantLocationMutationResult = Apollo.MutationResult<UpdateMerchantLocationMutation>;
export type UpdateMerchantLocationMutationOptions = Apollo.BaseMutationOptions<UpdateMerchantLocationMutation, UpdateMerchantLocationMutationVariables>;
export const GeocodeMerchantLocationDocument = gql`
    mutation GeocodeMerchantLocation($id: ID!, $query: String) {
  geocodeMerchantLocation(id: $id, query: $query) {
    ...MerchantLocation
  }
}
    ${MerchantLocationFragmentDoc}`;
export type GeocodeMerchantLocationMutationFn = Apollo.MutationFunction<GeocodeMerchantLocationMutation, GeocodeMerchantLocationMutationVariables>;

/**
 * __useGeocodeMerchantLocationMutation__
 *
 * To run a mutation, you first call `useGeocodeMerchantLocationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGeocodeMerchantLocationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [geocodeMerchantLocationMutation, { data, loading, error }] = useGeocodeMerchantLocationMutation({
 *   variables: {
 *      id: // value for 'id'
 *      query: // value for 'query'
 *   },
 * });
 */
export function useGeocodeMerchantLocationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<GeocodeMerchantLocationMutation, GeocodeMerchantLocationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<GeocodeMerchantLocationMutation, GeocodeMerchantLocationMutationVariables>(GeocodeMerchantLocationDocument, options);
      }
export type GeocodeMerchantLocationMutationHookResult = ReturnType<typeof useGeocodeMerchantLocationMutation>;
export type GeocodeMerchantLocationMutationResult = Apollo.MutationResult<GeocodeMerchantLocationMutation>;
export type GeocodeMerchantLocationMutationOptions = Apollo.BaseMutationOptions<GeocodeMerchantLocationMutation, GeocodeMerchantLocationMutationVariables>;
export const CreateMerchantDocument = gql`
    mutation CreateMerchant($input: CreateMerchantInput!) {
  createMerchant(input: $input) {
    ...Merchant
  }
}
    ${MerchantFragmentDoc}`;
export type CreateMerchantMutationFn = Apollo.MutationFunction<CreateMerchantMutation, CreateMerchantMutationVariables>;

/**
 * __useCreateMerchantMutation__
 *
 * To run a mutation, you first call `useCreateMerchantMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMerchantMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMerchantMutation, { data, loading, error }] = useCreateMerchantMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMerchantMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateMerchantMutation, CreateMerchantMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateMerchantMutation, CreateMerchantMutationVariables>(CreateMerchantDocument, options);
      }
export type CreateMerchantMutationHookResult = ReturnType<typeof useCreateMerchantMutation>;
export type CreateMerchantMutationResult = Apollo.MutationResult<CreateMerchantMutation>;
export type CreateMerchantMutationOptions = Apollo.BaseMutationOptions<CreateMerchantMutation, CreateMerchantMutationVariables>;
export const MergeMerchantsDocument = gql`
    mutation MergeMerchants($merchant: ID!, $into: ID!) {
  mergeMerchants(merchant: $merchant, into: $into) {
    ...Merchant
  }
}
    ${MerchantFragmentDoc}`;
export type MergeMerchantsMutationFn = Apollo.MutationFunction<MergeMerchantsMutation, MergeMerchantsMutationVariables>;

/**
 * __useMergeMerchantsMutation__
 *
 * To run a mutation, you first call `useMergeMerchantsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMergeMerchantsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [mergeMerchantsMutation, { data, loading, error }] = useMergeMerchantsMutation({
 *   variables: {
 *      merchant: // value for 'merchant'
 *      into: // value for 'into'
 *   },
 * });
 */
export function useMergeMerchantsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MergeMerchantsMutation, MergeMerchantsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MergeMerchantsMutation, MergeMerchantsMutationVariables>(MergeMerchantsDocument, options);
      }
export type MergeMerchantsMutationHookResult = ReturnType<typeof useMergeMerchantsMutation>;
export type MergeMerchantsMutationResult = Apollo.MutationResult<MergeMerchantsMutation>;
export type MergeMerchantsMutationOptions = Apollo.BaseMutationOptions<MergeMerchantsMutation, MergeMerchantsMutationVariables>;
export const AddMerchantAliasDocument = gql`
    mutation AddMerchantAlias($merchant: ID!, $text: String!) {
  addMerchantAlias(merchant: $merchant, text: $text) {
    id
    pattern
    merchant {
      id
      aliases {
        id
        pattern
      }
    }
  }
}
    `;
export type AddMerchantAliasMutationFn = Apollo.MutationFunction<AddMerchantAliasMutation, AddMerchantAliasMutationVariables>;

/**
 * __useAddMerchantAliasMutation__
 *
 * To run a mutation, you first call `useAddMerchantAliasMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddMerchantAliasMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addMerchantAliasMutation, { data, loading, error }] = useAddMerchantAliasMutation({
 *   variables: {
 *      merchant: // value for 'merchant'
 *      text: // value for 'text'
 *   },
 * });
 */
export function useAddMerchantAliasMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AddMerchantAliasMutation, AddMerchantAliasMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AddMerchantAliasMutation, AddMerchantAliasMutationVariables>(AddMerchantAliasDocument, options);
      }
export type AddMerchantAliasMutationHookResult = ReturnType<typeof useAddMerchantAliasMutation>;
export type AddMerchantAliasMutationResult = Apollo.MutationResult<AddMerchantAliasMutation>;
export type AddMerchantAliasMutationOptions = Apollo.BaseMutationOptions<AddMerchantAliasMutation, AddMerchantAliasMutationVariables>;
export const RemoveMerchantAliasDocument = gql`
    mutation RemoveMerchantAlias($id: ID!) {
  removeMerchantAlias(id: $id)
}
    `;
export type RemoveMerchantAliasMutationFn = Apollo.MutationFunction<RemoveMerchantAliasMutation, RemoveMerchantAliasMutationVariables>;

/**
 * __useRemoveMerchantAliasMutation__
 *
 * To run a mutation, you first call `useRemoveMerchantAliasMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveMerchantAliasMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeMerchantAliasMutation, { data, loading, error }] = useRemoveMerchantAliasMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRemoveMerchantAliasMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RemoveMerchantAliasMutation, RemoveMerchantAliasMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RemoveMerchantAliasMutation, RemoveMerchantAliasMutationVariables>(RemoveMerchantAliasDocument, options);
      }
export type RemoveMerchantAliasMutationHookResult = ReturnType<typeof useRemoveMerchantAliasMutation>;
export type RemoveMerchantAliasMutationResult = Apollo.MutationResult<RemoveMerchantAliasMutation>;
export type RemoveMerchantAliasMutationOptions = Apollo.BaseMutationOptions<RemoveMerchantAliasMutation, RemoveMerchantAliasMutationVariables>;
export const CreateMerchantLocationDocument = gql`
    mutation CreateMerchantLocation($input: MerchantLocationInput!) {
  createMerchantLocation(input: $input) {
    ...MerchantLocation
  }
}
    ${MerchantLocationFragmentDoc}`;
export type CreateMerchantLocationMutationFn = Apollo.MutationFunction<CreateMerchantLocationMutation, CreateMerchantLocationMutationVariables>;

/**
 * __useCreateMerchantLocationMutation__
 *
 * To run a mutation, you first call `useCreateMerchantLocationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMerchantLocationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMerchantLocationMutation, { data, loading, error }] = useCreateMerchantLocationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMerchantLocationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateMerchantLocationMutation, CreateMerchantLocationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateMerchantLocationMutation, CreateMerchantLocationMutationVariables>(CreateMerchantLocationDocument, options);
      }
export type CreateMerchantLocationMutationHookResult = ReturnType<typeof useCreateMerchantLocationMutation>;
export type CreateMerchantLocationMutationResult = Apollo.MutationResult<CreateMerchantLocationMutation>;
export type CreateMerchantLocationMutationOptions = Apollo.BaseMutationOptions<CreateMerchantLocationMutation, CreateMerchantLocationMutationVariables>;
export const DeleteMerchantLocationDocument = gql`
    mutation DeleteMerchantLocation($id: ID!) {
  deleteMerchantLocation(id: $id)
}
    `;
export type DeleteMerchantLocationMutationFn = Apollo.MutationFunction<DeleteMerchantLocationMutation, DeleteMerchantLocationMutationVariables>;

/**
 * __useDeleteMerchantLocationMutation__
 *
 * To run a mutation, you first call `useDeleteMerchantLocationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMerchantLocationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMerchantLocationMutation, { data, loading, error }] = useDeleteMerchantLocationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteMerchantLocationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteMerchantLocationMutation, DeleteMerchantLocationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteMerchantLocationMutation, DeleteMerchantLocationMutationVariables>(DeleteMerchantLocationDocument, options);
      }
export type DeleteMerchantLocationMutationHookResult = ReturnType<typeof useDeleteMerchantLocationMutation>;
export type DeleteMerchantLocationMutationResult = Apollo.MutationResult<DeleteMerchantLocationMutation>;
export type DeleteMerchantLocationMutationOptions = Apollo.BaseMutationOptions<DeleteMerchantLocationMutation, DeleteMerchantLocationMutationVariables>;
export const CreateMerchantOptionDocument = gql`
    mutation CreateMerchantOption($name: String!, $fromTransactions: [ID!]) {
  result: createMerchant(
    input: {name: $name, fromTransactions: $fromTransactions}
  ) {
    value: id
    label: name
  }
}
    `;
export type CreateMerchantOptionMutationFn = Apollo.MutationFunction<CreateMerchantOptionMutation, CreateMerchantOptionMutationVariables>;

/**
 * __useCreateMerchantOptionMutation__
 *
 * To run a mutation, you first call `useCreateMerchantOptionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMerchantOptionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMerchantOptionMutation, { data, loading, error }] = useCreateMerchantOptionMutation({
 *   variables: {
 *      name: // value for 'name'
 *      fromTransactions: // value for 'fromTransactions'
 *   },
 * });
 */
export function useCreateMerchantOptionMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateMerchantOptionMutation, CreateMerchantOptionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateMerchantOptionMutation, CreateMerchantOptionMutationVariables>(CreateMerchantOptionDocument, options);
      }
export type CreateMerchantOptionMutationHookResult = ReturnType<typeof useCreateMerchantOptionMutation>;
export type CreateMerchantOptionMutationResult = Apollo.MutationResult<CreateMerchantOptionMutation>;
export type CreateMerchantOptionMutationOptions = Apollo.BaseMutationOptions<CreateMerchantOptionMutation, CreateMerchantOptionMutationVariables>;
export const DetectRecurringDocument = gql`
    mutation DetectRecurring($accounts: [ID!]) {
  detectRecurring(accounts: $accounts) {
    ...ListRecurringPayment
  }
}
    ${ListRecurringPaymentFragmentDoc}`;
export type DetectRecurringMutationFn = Apollo.MutationFunction<DetectRecurringMutation, DetectRecurringMutationVariables>;

/**
 * __useDetectRecurringMutation__
 *
 * To run a mutation, you first call `useDetectRecurringMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDetectRecurringMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [detectRecurringMutation, { data, loading, error }] = useDetectRecurringMutation({
 *   variables: {
 *      accounts: // value for 'accounts'
 *   },
 * });
 */
export function useDetectRecurringMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DetectRecurringMutation, DetectRecurringMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DetectRecurringMutation, DetectRecurringMutationVariables>(DetectRecurringDocument, options);
      }
export type DetectRecurringMutationHookResult = ReturnType<typeof useDetectRecurringMutation>;
export type DetectRecurringMutationResult = Apollo.MutationResult<DetectRecurringMutation>;
export type DetectRecurringMutationOptions = Apollo.BaseMutationOptions<DetectRecurringMutation, DetectRecurringMutationVariables>;
export const SetRecurringStatusesDocument = gql`
    mutation SetRecurringStatuses($ids: [ID!]!, $status: RecurringStatus!) {
  setRecurringStatuses(ids: $ids, status: $status) {
    ...ListRecurringPayment
  }
}
    ${ListRecurringPaymentFragmentDoc}`;
export type SetRecurringStatusesMutationFn = Apollo.MutationFunction<SetRecurringStatusesMutation, SetRecurringStatusesMutationVariables>;

/**
 * __useSetRecurringStatusesMutation__
 *
 * To run a mutation, you first call `useSetRecurringStatusesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetRecurringStatusesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setRecurringStatusesMutation, { data, loading, error }] = useSetRecurringStatusesMutation({
 *   variables: {
 *      ids: // value for 'ids'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useSetRecurringStatusesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SetRecurringStatusesMutation, SetRecurringStatusesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SetRecurringStatusesMutation, SetRecurringStatusesMutationVariables>(SetRecurringStatusesDocument, options);
      }
export type SetRecurringStatusesMutationHookResult = ReturnType<typeof useSetRecurringStatusesMutation>;
export type SetRecurringStatusesMutationResult = Apollo.MutationResult<SetRecurringStatusesMutation>;
export type SetRecurringStatusesMutationOptions = Apollo.BaseMutationOptions<SetRecurringStatusesMutation, SetRecurringStatusesMutationVariables>;
export const SetRecurringStatusDocument = gql`
    mutation SetRecurringStatus($input: SetRecurringStatusInput!) {
  setRecurringStatus(input: $input) {
    ...ListRecurringPayment
  }
}
    ${ListRecurringPaymentFragmentDoc}`;
export type SetRecurringStatusMutationFn = Apollo.MutationFunction<SetRecurringStatusMutation, SetRecurringStatusMutationVariables>;

/**
 * __useSetRecurringStatusMutation__
 *
 * To run a mutation, you first call `useSetRecurringStatusMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetRecurringStatusMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setRecurringStatusMutation, { data, loading, error }] = useSetRecurringStatusMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSetRecurringStatusMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SetRecurringStatusMutation, SetRecurringStatusMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SetRecurringStatusMutation, SetRecurringStatusMutationVariables>(SetRecurringStatusDocument, options);
      }
export type SetRecurringStatusMutationHookResult = ReturnType<typeof useSetRecurringStatusMutation>;
export type SetRecurringStatusMutationResult = Apollo.MutationResult<SetRecurringStatusMutation>;
export type SetRecurringStatusMutationOptions = Apollo.BaseMutationOptions<SetRecurringStatusMutation, SetRecurringStatusMutationVariables>;
export const CategorizeTransactionDocument = gql`
    mutation CategorizeTransaction($input: CategorizeTransactionInput!) {
  categorizeTransaction(input: $input) {
    ...Transaction
  }
}
    ${TransactionFragmentDoc}`;
export type CategorizeTransactionMutationFn = Apollo.MutationFunction<CategorizeTransactionMutation, CategorizeTransactionMutationVariables>;

/**
 * __useCategorizeTransactionMutation__
 *
 * To run a mutation, you first call `useCategorizeTransactionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCategorizeTransactionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [categorizeTransactionMutation, { data, loading, error }] = useCategorizeTransactionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCategorizeTransactionMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CategorizeTransactionMutation, CategorizeTransactionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CategorizeTransactionMutation, CategorizeTransactionMutationVariables>(CategorizeTransactionDocument, options);
      }
export type CategorizeTransactionMutationHookResult = ReturnType<typeof useCategorizeTransactionMutation>;
export type CategorizeTransactionMutationResult = Apollo.MutationResult<CategorizeTransactionMutation>;
export type CategorizeTransactionMutationOptions = Apollo.BaseMutationOptions<CategorizeTransactionMutation, CategorizeTransactionMutationVariables>;
export const SetTransactionNoteDocument = gql`
    mutation SetTransactionNote($input: SetTransactionNoteInput!) {
  setTransactionNote(input: $input) {
    ...Transaction
  }
}
    ${TransactionFragmentDoc}`;
export type SetTransactionNoteMutationFn = Apollo.MutationFunction<SetTransactionNoteMutation, SetTransactionNoteMutationVariables>;

/**
 * __useSetTransactionNoteMutation__
 *
 * To run a mutation, you first call `useSetTransactionNoteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetTransactionNoteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setTransactionNoteMutation, { data, loading, error }] = useSetTransactionNoteMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSetTransactionNoteMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SetTransactionNoteMutation, SetTransactionNoteMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SetTransactionNoteMutation, SetTransactionNoteMutationVariables>(SetTransactionNoteDocument, options);
      }
export type SetTransactionNoteMutationHookResult = ReturnType<typeof useSetTransactionNoteMutation>;
export type SetTransactionNoteMutationResult = Apollo.MutationResult<SetTransactionNoteMutation>;
export type SetTransactionNoteMutationOptions = Apollo.BaseMutationOptions<SetTransactionNoteMutation, SetTransactionNoteMutationVariables>;
export const CategorizeTransactionsDocument = gql`
    mutation CategorizeTransactions($ids: [ID!]!, $category: ID) {
  categorizeTransactions(ids: $ids, category: $category) {
    ...ListTransaction
  }
}
    ${ListTransactionFragmentDoc}`;
export type CategorizeTransactionsMutationFn = Apollo.MutationFunction<CategorizeTransactionsMutation, CategorizeTransactionsMutationVariables>;

/**
 * __useCategorizeTransactionsMutation__
 *
 * To run a mutation, you first call `useCategorizeTransactionsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCategorizeTransactionsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [categorizeTransactionsMutation, { data, loading, error }] = useCategorizeTransactionsMutation({
 *   variables: {
 *      ids: // value for 'ids'
 *      category: // value for 'category'
 *   },
 * });
 */
export function useCategorizeTransactionsMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CategorizeTransactionsMutation, CategorizeTransactionsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CategorizeTransactionsMutation, CategorizeTransactionsMutationVariables>(CategorizeTransactionsDocument, options);
      }
export type CategorizeTransactionsMutationHookResult = ReturnType<typeof useCategorizeTransactionsMutation>;
export type CategorizeTransactionsMutationResult = Apollo.MutationResult<CategorizeTransactionsMutation>;
export type CategorizeTransactionsMutationOptions = Apollo.BaseMutationOptions<CategorizeTransactionsMutation, CategorizeTransactionsMutationVariables>;
export const MarkTransfersDocument = gql`
    mutation MarkTransfers($ids: [ID!]!, $isTransfer: Boolean) {
  markTransfers(ids: $ids, isTransfer: $isTransfer) {
    ...ListTransaction
  }
}
    ${ListTransactionFragmentDoc}`;
export type MarkTransfersMutationFn = Apollo.MutationFunction<MarkTransfersMutation, MarkTransfersMutationVariables>;

/**
 * __useMarkTransfersMutation__
 *
 * To run a mutation, you first call `useMarkTransfersMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkTransfersMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markTransfersMutation, { data, loading, error }] = useMarkTransfersMutation({
 *   variables: {
 *      ids: // value for 'ids'
 *      isTransfer: // value for 'isTransfer'
 *   },
 * });
 */
export function useMarkTransfersMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MarkTransfersMutation, MarkTransfersMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MarkTransfersMutation, MarkTransfersMutationVariables>(MarkTransfersDocument, options);
      }
export type MarkTransfersMutationHookResult = ReturnType<typeof useMarkTransfersMutation>;
export type MarkTransfersMutationResult = Apollo.MutationResult<MarkTransfersMutation>;
export type MarkTransfersMutationOptions = Apollo.BaseMutationOptions<MarkTransfersMutation, MarkTransfersMutationVariables>;
export const MarkTransferDocument = gql`
    mutation MarkTransfer($input: MarkTransferInput!) {
  markTransfer(input: $input) {
    ...Transaction
  }
}
    ${TransactionFragmentDoc}`;
export type MarkTransferMutationFn = Apollo.MutationFunction<MarkTransferMutation, MarkTransferMutationVariables>;

/**
 * __useMarkTransferMutation__
 *
 * To run a mutation, you first call `useMarkTransferMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMarkTransferMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [markTransferMutation, { data, loading, error }] = useMarkTransferMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useMarkTransferMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<MarkTransferMutation, MarkTransferMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<MarkTransferMutation, MarkTransferMutationVariables>(MarkTransferDocument, options);
      }
export type MarkTransferMutationHookResult = ReturnType<typeof useMarkTransferMutation>;
export type MarkTransferMutationResult = Apollo.MutationResult<MarkTransferMutation>;
export type MarkTransferMutationOptions = Apollo.BaseMutationOptions<MarkTransferMutation, MarkTransferMutationVariables>;
export const ListBankAccountsDocument = gql`
    query ListBankAccounts($filters: BankAccountFilter, $ordering: [BankAccountOrder!]! = [{kind: ASC}, {name: ASC}], $pagination: OffsetPaginationInput) {
  bankAccounts(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListBankAccount
  }
}
    ${ListBankAccountFragmentDoc}`;

/**
 * __useListBankAccountsQuery__
 *
 * To run a query within a React component, call `useListBankAccountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListBankAccountsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListBankAccountsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListBankAccountsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListBankAccountsQuery, ListBankAccountsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListBankAccountsQuery, ListBankAccountsQueryVariables>(ListBankAccountsDocument, options);
      }
export function useListBankAccountsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListBankAccountsQuery, ListBankAccountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListBankAccountsQuery, ListBankAccountsQueryVariables>(ListBankAccountsDocument, options);
        }
export type ListBankAccountsQueryHookResult = ReturnType<typeof useListBankAccountsQuery>;
export type ListBankAccountsLazyQueryHookResult = ReturnType<typeof useListBankAccountsLazyQuery>;
export type ListBankAccountsQueryResult = Apollo.QueryResult<ListBankAccountsQuery, ListBankAccountsQueryVariables>;
export const GetBankAccountDocument = gql`
    query GetBankAccount($id: ID!) {
  bankAccount(id: $id) {
    ...BankAccount
  }
}
    ${BankAccountFragmentDoc}`;

/**
 * __useGetBankAccountQuery__
 *
 * To run a query within a React component, call `useGetBankAccountQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBankAccountQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBankAccountQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetBankAccountQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetBankAccountQuery, GetBankAccountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetBankAccountQuery, GetBankAccountQueryVariables>(GetBankAccountDocument, options);
      }
export function useGetBankAccountLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetBankAccountQuery, GetBankAccountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetBankAccountQuery, GetBankAccountQueryVariables>(GetBankAccountDocument, options);
        }
export type GetBankAccountQueryHookResult = ReturnType<typeof useGetBankAccountQuery>;
export type GetBankAccountLazyQueryHookResult = ReturnType<typeof useGetBankAccountLazyQuery>;
export type GetBankAccountQueryResult = Apollo.QueryResult<GetBankAccountQuery, GetBankAccountQueryVariables>;
export const SearchBankAccountsDocument = gql`
    query SearchBankAccounts($search: String, $values: [ID!]) {
  options: bankAccounts(
    filters: {search: $search, ids: $values}
    pagination: {limit: 10}
  ) {
    value: id
    label: name
  }
}
    `;

/**
 * __useSearchBankAccountsQuery__
 *
 * To run a query within a React component, call `useSearchBankAccountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchBankAccountsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchBankAccountsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchBankAccountsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchBankAccountsQuery, SearchBankAccountsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchBankAccountsQuery, SearchBankAccountsQueryVariables>(SearchBankAccountsDocument, options);
      }
export function useSearchBankAccountsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchBankAccountsQuery, SearchBankAccountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchBankAccountsQuery, SearchBankAccountsQueryVariables>(SearchBankAccountsDocument, options);
        }
export type SearchBankAccountsQueryHookResult = ReturnType<typeof useSearchBankAccountsQuery>;
export type SearchBankAccountsLazyQueryHookResult = ReturnType<typeof useSearchBankAccountsLazyQuery>;
export type SearchBankAccountsQueryResult = Apollo.QueryResult<SearchBankAccountsQuery, SearchBankAccountsQueryVariables>;
export const BalanceHistoryDocument = gql`
    query BalanceHistory($account: ID!, $dateFrom: Date!, $dateTo: Date) {
  balanceHistory(account: $account, dateFrom: $dateFrom, dateTo: $dateTo) {
    date
    amount
    currency
    reported
  }
}
    `;

/**
 * __useBalanceHistoryQuery__
 *
 * To run a query within a React component, call `useBalanceHistoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useBalanceHistoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBalanceHistoryQuery({
 *   variables: {
 *      account: // value for 'account'
 *      dateFrom: // value for 'dateFrom'
 *      dateTo: // value for 'dateTo'
 *   },
 * });
 */
export function useBalanceHistoryQuery(baseOptions: ApolloReactHooks.QueryHookOptions<BalanceHistoryQuery, BalanceHistoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<BalanceHistoryQuery, BalanceHistoryQueryVariables>(BalanceHistoryDocument, options);
      }
export function useBalanceHistoryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<BalanceHistoryQuery, BalanceHistoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<BalanceHistoryQuery, BalanceHistoryQueryVariables>(BalanceHistoryDocument, options);
        }
export type BalanceHistoryQueryHookResult = ReturnType<typeof useBalanceHistoryQuery>;
export type BalanceHistoryLazyQueryHookResult = ReturnType<typeof useBalanceHistoryLazyQuery>;
export type BalanceHistoryQueryResult = Apollo.QueryResult<BalanceHistoryQuery, BalanceHistoryQueryVariables>;
export const ForecastDocument = gql`
    query Forecast($account: ID!, $horizonDays: Int!, $includeDetected: Boolean!, $includeBudgets: Boolean!) {
  forecast(
    account: $account
    horizonDays: $horizonDays
    includeDetected: $includeDetected
    includeBudgets: $includeBudgets
  ) {
    date
    amount
    currency
  }
}
    `;

/**
 * __useForecastQuery__
 *
 * To run a query within a React component, call `useForecastQuery` and pass it any options that fit your needs.
 * When your component renders, `useForecastQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useForecastQuery({
 *   variables: {
 *      account: // value for 'account'
 *      horizonDays: // value for 'horizonDays'
 *      includeDetected: // value for 'includeDetected'
 *      includeBudgets: // value for 'includeBudgets'
 *   },
 * });
 */
export function useForecastQuery(baseOptions: ApolloReactHooks.QueryHookOptions<ForecastQuery, ForecastQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ForecastQuery, ForecastQueryVariables>(ForecastDocument, options);
      }
export function useForecastLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ForecastQuery, ForecastQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ForecastQuery, ForecastQueryVariables>(ForecastDocument, options);
        }
export type ForecastQueryHookResult = ReturnType<typeof useForecastQuery>;
export type ForecastLazyQueryHookResult = ReturnType<typeof useForecastLazyQuery>;
export type ForecastQueryResult = Apollo.QueryResult<ForecastQuery, ForecastQueryVariables>;
export const ListBudgetsDocument = gql`
    query ListBudgets($filters: BudgetFilter, $ordering: [BudgetOrder!]! = [{startMonth: DESC}], $pagination: OffsetPaginationInput) {
  budgets(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...Budget
  }
}
    ${BudgetFragmentDoc}`;

/**
 * __useListBudgetsQuery__
 *
 * To run a query within a React component, call `useListBudgetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListBudgetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListBudgetsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListBudgetsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListBudgetsQuery, ListBudgetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListBudgetsQuery, ListBudgetsQueryVariables>(ListBudgetsDocument, options);
      }
export function useListBudgetsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListBudgetsQuery, ListBudgetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListBudgetsQuery, ListBudgetsQueryVariables>(ListBudgetsDocument, options);
        }
export type ListBudgetsQueryHookResult = ReturnType<typeof useListBudgetsQuery>;
export type ListBudgetsLazyQueryHookResult = ReturnType<typeof useListBudgetsLazyQuery>;
export type ListBudgetsQueryResult = Apollo.QueryResult<ListBudgetsQuery, ListBudgetsQueryVariables>;
export const GetBudgetDocument = gql`
    query GetBudget($id: ID!) {
  budget(id: $id) {
    ...Budget
  }
}
    ${BudgetFragmentDoc}`;

/**
 * __useGetBudgetQuery__
 *
 * To run a query within a React component, call `useGetBudgetQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBudgetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBudgetQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetBudgetQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetBudgetQuery, GetBudgetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetBudgetQuery, GetBudgetQueryVariables>(GetBudgetDocument, options);
      }
export function useGetBudgetLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetBudgetQuery, GetBudgetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetBudgetQuery, GetBudgetQueryVariables>(GetBudgetDocument, options);
        }
export type GetBudgetQueryHookResult = ReturnType<typeof useGetBudgetQuery>;
export type GetBudgetLazyQueryHookResult = ReturnType<typeof useGetBudgetLazyQuery>;
export type GetBudgetQueryResult = Apollo.QueryResult<GetBudgetQuery, GetBudgetQueryVariables>;
export const BudgetStatusDocument = gql`
    query BudgetStatus($month: Date) {
  budgetStatus(month: $month) {
    ...BudgetStatus
  }
}
    ${BudgetStatusFragmentDoc}`;

/**
 * __useBudgetStatusQuery__
 *
 * To run a query within a React component, call `useBudgetStatusQuery` and pass it any options that fit your needs.
 * When your component renders, `useBudgetStatusQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBudgetStatusQuery({
 *   variables: {
 *      month: // value for 'month'
 *   },
 * });
 */
export function useBudgetStatusQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<BudgetStatusQuery, BudgetStatusQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<BudgetStatusQuery, BudgetStatusQueryVariables>(BudgetStatusDocument, options);
      }
export function useBudgetStatusLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<BudgetStatusQuery, BudgetStatusQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<BudgetStatusQuery, BudgetStatusQueryVariables>(BudgetStatusDocument, options);
        }
export type BudgetStatusQueryHookResult = ReturnType<typeof useBudgetStatusQuery>;
export type BudgetStatusLazyQueryHookResult = ReturnType<typeof useBudgetStatusLazyQuery>;
export type BudgetStatusQueryResult = Apollo.QueryResult<BudgetStatusQuery, BudgetStatusQueryVariables>;
export const ListCategoriesDocument = gql`
    query ListCategories($filters: CategoryFilter, $ordering: [CategoryOrder!]! = [{name: ASC}], $pagination: OffsetPaginationInput) {
  categories(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListCategory
  }
}
    ${ListCategoryFragmentDoc}`;

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
 *      ordering: // value for 'ordering'
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
export const SearchCategoriesDocument = gql`
    query SearchCategories($search: String, $values: [ID!]) {
  options: categories(
    filters: {search: $search, ids: $values, hidden: false}
    ordering: [{name: ASC}]
    pagination: {limit: 20}
  ) {
    value: id
    label: name
  }
}
    `;

/**
 * __useSearchCategoriesQuery__
 *
 * To run a query within a React component, call `useSearchCategoriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchCategoriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchCategoriesQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchCategoriesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchCategoriesQuery, SearchCategoriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchCategoriesQuery, SearchCategoriesQueryVariables>(SearchCategoriesDocument, options);
      }
export function useSearchCategoriesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchCategoriesQuery, SearchCategoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchCategoriesQuery, SearchCategoriesQueryVariables>(SearchCategoriesDocument, options);
        }
export type SearchCategoriesQueryHookResult = ReturnType<typeof useSearchCategoriesQuery>;
export type SearchCategoriesLazyQueryHookResult = ReturnType<typeof useSearchCategoriesLazyQuery>;
export type SearchCategoriesQueryResult = Apollo.QueryResult<SearchCategoriesQuery, SearchCategoriesQueryVariables>;
export const ListCategoryRulesDocument = gql`
    query ListCategoryRules($filters: CategoryRuleFilter, $pagination: OffsetPaginationInput) {
  categoryRules(filters: $filters, pagination: $pagination) {
    ...CategoryRule
  }
}
    ${CategoryRuleFragmentDoc}`;

/**
 * __useListCategoryRulesQuery__
 *
 * To run a query within a React component, call `useListCategoryRulesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListCategoryRulesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListCategoryRulesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListCategoryRulesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListCategoryRulesQuery, ListCategoryRulesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListCategoryRulesQuery, ListCategoryRulesQueryVariables>(ListCategoryRulesDocument, options);
      }
export function useListCategoryRulesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListCategoryRulesQuery, ListCategoryRulesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListCategoryRulesQuery, ListCategoryRulesQueryVariables>(ListCategoryRulesDocument, options);
        }
export type ListCategoryRulesQueryHookResult = ReturnType<typeof useListCategoryRulesQuery>;
export type ListCategoryRulesLazyQueryHookResult = ReturnType<typeof useListCategoryRulesLazyQuery>;
export type ListCategoryRulesQueryResult = Apollo.QueryResult<ListCategoryRulesQuery, ListCategoryRulesQueryVariables>;
export const GetCategoryRuleDocument = gql`
    query GetCategoryRule($id: ID!) {
  categoryRule(id: $id) {
    ...CategoryRule
  }
}
    ${CategoryRuleFragmentDoc}`;

/**
 * __useGetCategoryRuleQuery__
 *
 * To run a query within a React component, call `useGetCategoryRuleQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCategoryRuleQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCategoryRuleQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetCategoryRuleQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetCategoryRuleQuery, GetCategoryRuleQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetCategoryRuleQuery, GetCategoryRuleQueryVariables>(GetCategoryRuleDocument, options);
      }
export function useGetCategoryRuleLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetCategoryRuleQuery, GetCategoryRuleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetCategoryRuleQuery, GetCategoryRuleQueryVariables>(GetCategoryRuleDocument, options);
        }
export type GetCategoryRuleQueryHookResult = ReturnType<typeof useGetCategoryRuleQuery>;
export type GetCategoryRuleLazyQueryHookResult = ReturnType<typeof useGetCategoryRuleLazyQuery>;
export type GetCategoryRuleQueryResult = Apollo.QueryResult<GetCategoryRuleQuery, GetCategoryRuleQueryVariables>;
export const CategoryCandidatesDocument = gql`
    query CategoryCandidates($id: ID!, $limit: Int! = 20) {
  category(id: $id) {
    id
    candidates(limit: $limit) {
      ...ListTransaction
    }
  }
}
    ${ListTransactionFragmentDoc}`;

/**
 * __useCategoryCandidatesQuery__
 *
 * To run a query within a React component, call `useCategoryCandidatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useCategoryCandidatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCategoryCandidatesQuery({
 *   variables: {
 *      id: // value for 'id'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useCategoryCandidatesQuery(baseOptions: ApolloReactHooks.QueryHookOptions<CategoryCandidatesQuery, CategoryCandidatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<CategoryCandidatesQuery, CategoryCandidatesQueryVariables>(CategoryCandidatesDocument, options);
      }
export function useCategoryCandidatesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<CategoryCandidatesQuery, CategoryCandidatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<CategoryCandidatesQuery, CategoryCandidatesQueryVariables>(CategoryCandidatesDocument, options);
        }
export type CategoryCandidatesQueryHookResult = ReturnType<typeof useCategoryCandidatesQuery>;
export type CategoryCandidatesLazyQueryHookResult = ReturnType<typeof useCategoryCandidatesLazyQuery>;
export type CategoryCandidatesQueryResult = Apollo.QueryResult<CategoryCandidatesQuery, CategoryCandidatesQueryVariables>;
export const ListBankConnectionsDocument = gql`
    query ListBankConnections($filters: BankConnectionFilter, $pagination: OffsetPaginationInput) {
  bankConnections(filters: $filters, pagination: $pagination) {
    ...ListBankConnection
  }
}
    ${ListBankConnectionFragmentDoc}`;

/**
 * __useListBankConnectionsQuery__
 *
 * To run a query within a React component, call `useListBankConnectionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListBankConnectionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListBankConnectionsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListBankConnectionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListBankConnectionsQuery, ListBankConnectionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListBankConnectionsQuery, ListBankConnectionsQueryVariables>(ListBankConnectionsDocument, options);
      }
export function useListBankConnectionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListBankConnectionsQuery, ListBankConnectionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListBankConnectionsQuery, ListBankConnectionsQueryVariables>(ListBankConnectionsDocument, options);
        }
export type ListBankConnectionsQueryHookResult = ReturnType<typeof useListBankConnectionsQuery>;
export type ListBankConnectionsLazyQueryHookResult = ReturnType<typeof useListBankConnectionsLazyQuery>;
export type ListBankConnectionsQueryResult = Apollo.QueryResult<ListBankConnectionsQuery, ListBankConnectionsQueryVariables>;
export const GetBankConnectionDocument = gql`
    query GetBankConnection($id: ID!) {
  bankConnection(id: $id) {
    ...BankConnection
  }
}
    ${BankConnectionFragmentDoc}`;

/**
 * __useGetBankConnectionQuery__
 *
 * To run a query within a React component, call `useGetBankConnectionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBankConnectionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBankConnectionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetBankConnectionQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetBankConnectionQuery, GetBankConnectionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetBankConnectionQuery, GetBankConnectionQueryVariables>(GetBankConnectionDocument, options);
      }
export function useGetBankConnectionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetBankConnectionQuery, GetBankConnectionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetBankConnectionQuery, GetBankConnectionQueryVariables>(GetBankConnectionDocument, options);
        }
export type GetBankConnectionQueryHookResult = ReturnType<typeof useGetBankConnectionQuery>;
export type GetBankConnectionLazyQueryHookResult = ReturnType<typeof useGetBankConnectionLazyQuery>;
export type GetBankConnectionQueryResult = Apollo.QueryResult<GetBankConnectionQuery, GetBankConnectionQueryVariables>;
export const BankInstitutionsDocument = gql`
    query BankInstitutions($country: String!) {
  bankInstitutions(country: $country) {
    name
    country
    logo
    bic
    maximumConsentDays
  }
}
    `;

/**
 * __useBankInstitutionsQuery__
 *
 * To run a query within a React component, call `useBankInstitutionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useBankInstitutionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBankInstitutionsQuery({
 *   variables: {
 *      country: // value for 'country'
 *   },
 * });
 */
export function useBankInstitutionsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<BankInstitutionsQuery, BankInstitutionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<BankInstitutionsQuery, BankInstitutionsQueryVariables>(BankInstitutionsDocument, options);
      }
export function useBankInstitutionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<BankInstitutionsQuery, BankInstitutionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<BankInstitutionsQuery, BankInstitutionsQueryVariables>(BankInstitutionsDocument, options);
        }
export type BankInstitutionsQueryHookResult = ReturnType<typeof useBankInstitutionsQuery>;
export type BankInstitutionsLazyQueryHookResult = ReturnType<typeof useBankInstitutionsLazyQuery>;
export type BankInstitutionsQueryResult = Apollo.QueryResult<BankInstitutionsQuery, BankInstitutionsQueryVariables>;
export const HoldingsDocument = gql`
    query Holdings($account: ID!, $date: Date) {
  holdings(account: $account, date: $date) {
    ...Holding
  }
}
    ${HoldingFragmentDoc}`;

/**
 * __useHoldingsQuery__
 *
 * To run a query within a React component, call `useHoldingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useHoldingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHoldingsQuery({
 *   variables: {
 *      account: // value for 'account'
 *      date: // value for 'date'
 *   },
 * });
 */
export function useHoldingsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<HoldingsQuery, HoldingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<HoldingsQuery, HoldingsQueryVariables>(HoldingsDocument, options);
      }
export function useHoldingsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<HoldingsQuery, HoldingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<HoldingsQuery, HoldingsQueryVariables>(HoldingsDocument, options);
        }
export type HoldingsQueryHookResult = ReturnType<typeof useHoldingsQuery>;
export type HoldingsLazyQueryHookResult = ReturnType<typeof useHoldingsLazyQuery>;
export type HoldingsQueryResult = Apollo.QueryResult<HoldingsQuery, HoldingsQueryVariables>;
export const PortfolioDocument = gql`
    query Portfolio {
  bankAccounts(
    filters: {kind: DEPOT}
    ordering: [{name: ASC}]
    pagination: {limit: 100}
  ) {
    id
    name
    kind
    currency
    latestBalance {
      ...Balance
    }
    currentHoldings {
      ...Holding
    }
  }
}
    ${BalanceFragmentDoc}
${HoldingFragmentDoc}`;

/**
 * __usePortfolioQuery__
 *
 * To run a query within a React component, call `usePortfolioQuery` and pass it any options that fit your needs.
 * When your component renders, `usePortfolioQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePortfolioQuery({
 *   variables: {
 *   },
 * });
 */
export function usePortfolioQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<PortfolioQuery, PortfolioQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PortfolioQuery, PortfolioQueryVariables>(PortfolioDocument, options);
      }
export function usePortfolioLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PortfolioQuery, PortfolioQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PortfolioQuery, PortfolioQueryVariables>(PortfolioDocument, options);
        }
export type PortfolioQueryHookResult = ReturnType<typeof usePortfolioQuery>;
export type PortfolioLazyQueryHookResult = ReturnType<typeof usePortfolioLazyQuery>;
export type PortfolioQueryResult = Apollo.QueryResult<PortfolioQuery, PortfolioQueryVariables>;
export const PeriodOverviewDocument = gql`
    query PeriodOverview($window: StatsWindowInput, $compareTo: Comparison! = PREVIOUS_PERIOD, $limit: Int! = 10) {
  periodOverview(window: $window, compareTo: $compareTo, limit: $limit) {
    ...PeriodOverview
  }
}
    ${PeriodOverviewFragmentDoc}`;

/**
 * __usePeriodOverviewQuery__
 *
 * To run a query within a React component, call `usePeriodOverviewQuery` and pass it any options that fit your needs.
 * When your component renders, `usePeriodOverviewQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePeriodOverviewQuery({
 *   variables: {
 *      window: // value for 'window'
 *      compareTo: // value for 'compareTo'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function usePeriodOverviewQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<PeriodOverviewQuery, PeriodOverviewQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PeriodOverviewQuery, PeriodOverviewQueryVariables>(PeriodOverviewDocument, options);
      }
export function usePeriodOverviewLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PeriodOverviewQuery, PeriodOverviewQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PeriodOverviewQuery, PeriodOverviewQueryVariables>(PeriodOverviewDocument, options);
        }
export type PeriodOverviewQueryHookResult = ReturnType<typeof usePeriodOverviewQuery>;
export type PeriodOverviewLazyQueryHookResult = ReturnType<typeof usePeriodOverviewLazyQuery>;
export type PeriodOverviewQueryResult = Apollo.QueryResult<PeriodOverviewQuery, PeriodOverviewQueryVariables>;
export const MerchantInsightsDocument = gql`
    query MerchantInsights($merchant: MerchantRef!, $window: StatsWindowInput, $compareTo: Comparison! = PREVIOUS_PERIOD) {
  merchantInsights(merchant: $merchant, window: $window, compareTo: $compareTo) {
    ...MerchantInsights
  }
}
    ${MerchantInsightsFragmentDoc}`;

/**
 * __useMerchantInsightsQuery__
 *
 * To run a query within a React component, call `useMerchantInsightsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMerchantInsightsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMerchantInsightsQuery({
 *   variables: {
 *      merchant: // value for 'merchant'
 *      window: // value for 'window'
 *      compareTo: // value for 'compareTo'
 *   },
 * });
 */
export function useMerchantInsightsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<MerchantInsightsQuery, MerchantInsightsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MerchantInsightsQuery, MerchantInsightsQueryVariables>(MerchantInsightsDocument, options);
      }
export function useMerchantInsightsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MerchantInsightsQuery, MerchantInsightsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MerchantInsightsQuery, MerchantInsightsQueryVariables>(MerchantInsightsDocument, options);
        }
export type MerchantInsightsQueryHookResult = ReturnType<typeof useMerchantInsightsQuery>;
export type MerchantInsightsLazyQueryHookResult = ReturnType<typeof useMerchantInsightsLazyQuery>;
export type MerchantInsightsQueryResult = Apollo.QueryResult<MerchantInsightsQuery, MerchantInsightsQueryVariables>;
export const CategoryInsightsDocument = gql`
    query CategoryInsights($category: ID!, $window: StatsWindowInput, $compareTo: Comparison! = PREVIOUS_PERIOD, $includeChildren: Boolean! = true) {
  categoryInsights(
    category: $category
    window: $window
    compareTo: $compareTo
    includeChildren: $includeChildren
  ) {
    ...CategoryInsights
  }
}
    ${CategoryInsightsFragmentDoc}`;

/**
 * __useCategoryInsightsQuery__
 *
 * To run a query within a React component, call `useCategoryInsightsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCategoryInsightsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCategoryInsightsQuery({
 *   variables: {
 *      category: // value for 'category'
 *      window: // value for 'window'
 *      compareTo: // value for 'compareTo'
 *      includeChildren: // value for 'includeChildren'
 *   },
 * });
 */
export function useCategoryInsightsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<CategoryInsightsQuery, CategoryInsightsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<CategoryInsightsQuery, CategoryInsightsQueryVariables>(CategoryInsightsDocument, options);
      }
export function useCategoryInsightsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<CategoryInsightsQuery, CategoryInsightsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<CategoryInsightsQuery, CategoryInsightsQueryVariables>(CategoryInsightsDocument, options);
        }
export type CategoryInsightsQueryHookResult = ReturnType<typeof useCategoryInsightsQuery>;
export type CategoryInsightsLazyQueryHookResult = ReturnType<typeof useCategoryInsightsLazyQuery>;
export type CategoryInsightsQueryResult = Apollo.QueryResult<CategoryInsightsQuery, CategoryInsightsQueryVariables>;
export const LocationInsightsDocument = gql`
    query LocationInsights($location: ID!, $window: StatsWindowInput) {
  locationInsights(location: $location, window: $window) {
    ...LocationInsights
  }
}
    ${LocationInsightsFragmentDoc}`;

/**
 * __useLocationInsightsQuery__
 *
 * To run a query within a React component, call `useLocationInsightsQuery` and pass it any options that fit your needs.
 * When your component renders, `useLocationInsightsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLocationInsightsQuery({
 *   variables: {
 *      location: // value for 'location'
 *      window: // value for 'window'
 *   },
 * });
 */
export function useLocationInsightsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<LocationInsightsQuery, LocationInsightsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<LocationInsightsQuery, LocationInsightsQueryVariables>(LocationInsightsDocument, options);
      }
export function useLocationInsightsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<LocationInsightsQuery, LocationInsightsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<LocationInsightsQuery, LocationInsightsQueryVariables>(LocationInsightsDocument, options);
        }
export type LocationInsightsQueryHookResult = ReturnType<typeof useLocationInsightsQuery>;
export type LocationInsightsLazyQueryHookResult = ReturnType<typeof useLocationInsightsLazyQuery>;
export type LocationInsightsQueryResult = Apollo.QueryResult<LocationInsightsQuery, LocationInsightsQueryVariables>;
export const AccountInsightsDocument = gql`
    query AccountInsights($account: ID!, $window: StatsWindowInput, $limit: Int! = 5) {
  accountInsights(account: $account, window: $window, limit: $limit) {
    ...AccountInsights
  }
}
    ${AccountInsightsFragmentDoc}`;

/**
 * __useAccountInsightsQuery__
 *
 * To run a query within a React component, call `useAccountInsightsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAccountInsightsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAccountInsightsQuery({
 *   variables: {
 *      account: // value for 'account'
 *      window: // value for 'window'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useAccountInsightsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<AccountInsightsQuery, AccountInsightsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AccountInsightsQuery, AccountInsightsQueryVariables>(AccountInsightsDocument, options);
      }
export function useAccountInsightsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AccountInsightsQuery, AccountInsightsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AccountInsightsQuery, AccountInsightsQueryVariables>(AccountInsightsDocument, options);
        }
export type AccountInsightsQueryHookResult = ReturnType<typeof useAccountInsightsQuery>;
export type AccountInsightsLazyQueryHookResult = ReturnType<typeof useAccountInsightsLazyQuery>;
export type AccountInsightsQueryResult = Apollo.QueryResult<AccountInsightsQuery, AccountInsightsQueryVariables>;
export const AreaInsightsDocument = gql`
    query AreaInsights($area: AreaInput!, $window: StatsWindowInput, $limit: Int! = 10) {
  areaInsights(area: $area, window: $window, limit: $limit) {
    ...AreaInsights
  }
}
    ${AreaInsightsFragmentDoc}`;

/**
 * __useAreaInsightsQuery__
 *
 * To run a query within a React component, call `useAreaInsightsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAreaInsightsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAreaInsightsQuery({
 *   variables: {
 *      area: // value for 'area'
 *      window: // value for 'window'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useAreaInsightsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<AreaInsightsQuery, AreaInsightsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AreaInsightsQuery, AreaInsightsQueryVariables>(AreaInsightsDocument, options);
      }
export function useAreaInsightsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AreaInsightsQuery, AreaInsightsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AreaInsightsQuery, AreaInsightsQueryVariables>(AreaInsightsDocument, options);
        }
export type AreaInsightsQueryHookResult = ReturnType<typeof useAreaInsightsQuery>;
export type AreaInsightsLazyQueryHookResult = ReturnType<typeof useAreaInsightsLazyQuery>;
export type AreaInsightsQueryResult = Apollo.QueryResult<AreaInsightsQuery, AreaInsightsQueryVariables>;
export const SpendingGridDocument = gql`
    query SpendingGrid($within: BoundsInput!, $cellMeters: Float! = 500, $window: StatsWindowInput) {
  spendingGrid(within: $within, cellMeters: $cellMeters, window: $window) {
    bbox
    cellMeters
    features {
      ...GridCell
    }
  }
}
    ${GridCellFragmentDoc}`;

/**
 * __useSpendingGridQuery__
 *
 * To run a query within a React component, call `useSpendingGridQuery` and pass it any options that fit your needs.
 * When your component renders, `useSpendingGridQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSpendingGridQuery({
 *   variables: {
 *      within: // value for 'within'
 *      cellMeters: // value for 'cellMeters'
 *      window: // value for 'window'
 *   },
 * });
 */
export function useSpendingGridQuery(baseOptions: ApolloReactHooks.QueryHookOptions<SpendingGridQuery, SpendingGridQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SpendingGridQuery, SpendingGridQueryVariables>(SpendingGridDocument, options);
      }
export function useSpendingGridLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SpendingGridQuery, SpendingGridQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SpendingGridQuery, SpendingGridQueryVariables>(SpendingGridDocument, options);
        }
export type SpendingGridQueryHookResult = ReturnType<typeof useSpendingGridQuery>;
export type SpendingGridLazyQueryHookResult = ReturnType<typeof useSpendingGridLazyQuery>;
export type SpendingGridQueryResult = Apollo.QueryResult<SpendingGridQuery, SpendingGridQueryVariables>;
export const RecurringInsightsDocument = gql`
    query RecurringInsights($includeDetected: Boolean! = false) {
  recurringInsights(includeDetected: $includeDetected) {
    ...RecurringInsights
  }
}
    ${RecurringInsightsFragmentDoc}`;

/**
 * __useRecurringInsightsQuery__
 *
 * To run a query within a React component, call `useRecurringInsightsQuery` and pass it any options that fit your needs.
 * When your component renders, `useRecurringInsightsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRecurringInsightsQuery({
 *   variables: {
 *      includeDetected: // value for 'includeDetected'
 *   },
 * });
 */
export function useRecurringInsightsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<RecurringInsightsQuery, RecurringInsightsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RecurringInsightsQuery, RecurringInsightsQueryVariables>(RecurringInsightsDocument, options);
      }
export function useRecurringInsightsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RecurringInsightsQuery, RecurringInsightsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RecurringInsightsQuery, RecurringInsightsQueryVariables>(RecurringInsightsDocument, options);
        }
export type RecurringInsightsQueryHookResult = ReturnType<typeof useRecurringInsightsQuery>;
export type RecurringInsightsLazyQueryHookResult = ReturnType<typeof useRecurringInsightsLazyQuery>;
export type RecurringInsightsQueryResult = Apollo.QueryResult<RecurringInsightsQuery, RecurringInsightsQueryVariables>;
export const PortfolioInsightsDocument = gql`
    query PortfolioInsights($accounts: [ID!], $dateFrom: Date) {
  portfolioInsights(accounts: $accounts, dateFrom: $dateFrom) {
    ...PortfolioInsights
  }
}
    ${PortfolioInsightsFragmentDoc}`;

/**
 * __usePortfolioInsightsQuery__
 *
 * To run a query within a React component, call `usePortfolioInsightsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePortfolioInsightsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePortfolioInsightsQuery({
 *   variables: {
 *      accounts: // value for 'accounts'
 *      dateFrom: // value for 'dateFrom'
 *   },
 * });
 */
export function usePortfolioInsightsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<PortfolioInsightsQuery, PortfolioInsightsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PortfolioInsightsQuery, PortfolioInsightsQueryVariables>(PortfolioInsightsDocument, options);
      }
export function usePortfolioInsightsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PortfolioInsightsQuery, PortfolioInsightsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PortfolioInsightsQuery, PortfolioInsightsQueryVariables>(PortfolioInsightsDocument, options);
        }
export type PortfolioInsightsQueryHookResult = ReturnType<typeof usePortfolioInsightsQuery>;
export type PortfolioInsightsLazyQueryHookResult = ReturnType<typeof usePortfolioInsightsLazyQuery>;
export type PortfolioInsightsQueryResult = Apollo.QueryResult<PortfolioInsightsQuery, PortfolioInsightsQueryVariables>;
export const ListMerchantsDocument = gql`
    query ListMerchants($filters: MerchantFilter, $ordering: [MerchantOrder!]! = [{name: ASC}], $pagination: OffsetPaginationInput) {
  merchants(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListMerchant
  }
}
    ${ListMerchantFragmentDoc}`;

/**
 * __useListMerchantsQuery__
 *
 * To run a query within a React component, call `useListMerchantsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListMerchantsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListMerchantsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListMerchantsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListMerchantsQuery, ListMerchantsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListMerchantsQuery, ListMerchantsQueryVariables>(ListMerchantsDocument, options);
      }
export function useListMerchantsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListMerchantsQuery, ListMerchantsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListMerchantsQuery, ListMerchantsQueryVariables>(ListMerchantsDocument, options);
        }
export type ListMerchantsQueryHookResult = ReturnType<typeof useListMerchantsQuery>;
export type ListMerchantsLazyQueryHookResult = ReturnType<typeof useListMerchantsLazyQuery>;
export type ListMerchantsQueryResult = Apollo.QueryResult<ListMerchantsQuery, ListMerchantsQueryVariables>;
export const GetMerchantDocument = gql`
    query GetMerchant($id: ID!) {
  merchant(id: $id) {
    ...Merchant
  }
}
    ${MerchantFragmentDoc}`;

/**
 * __useGetMerchantQuery__
 *
 * To run a query within a React component, call `useGetMerchantQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMerchantQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMerchantQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetMerchantQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetMerchantQuery, GetMerchantQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetMerchantQuery, GetMerchantQueryVariables>(GetMerchantDocument, options);
      }
export function useGetMerchantLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetMerchantQuery, GetMerchantQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetMerchantQuery, GetMerchantQueryVariables>(GetMerchantDocument, options);
        }
export type GetMerchantQueryHookResult = ReturnType<typeof useGetMerchantQuery>;
export type GetMerchantLazyQueryHookResult = ReturnType<typeof useGetMerchantLazyQuery>;
export type GetMerchantQueryResult = Apollo.QueryResult<GetMerchantQuery, GetMerchantQueryVariables>;
export const SimilarMerchantsDocument = gql`
    query SimilarMerchants($id: ID!, $limit: Int! = 5) {
  merchant(id: $id) {
    id
    similarMerchants(limit: $limit) {
      ...ListMerchant
    }
  }
}
    ${ListMerchantFragmentDoc}`;

/**
 * __useSimilarMerchantsQuery__
 *
 * To run a query within a React component, call `useSimilarMerchantsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSimilarMerchantsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSimilarMerchantsQuery({
 *   variables: {
 *      id: // value for 'id'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useSimilarMerchantsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<SimilarMerchantsQuery, SimilarMerchantsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SimilarMerchantsQuery, SimilarMerchantsQueryVariables>(SimilarMerchantsDocument, options);
      }
export function useSimilarMerchantsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SimilarMerchantsQuery, SimilarMerchantsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SimilarMerchantsQuery, SimilarMerchantsQueryVariables>(SimilarMerchantsDocument, options);
        }
export type SimilarMerchantsQueryHookResult = ReturnType<typeof useSimilarMerchantsQuery>;
export type SimilarMerchantsLazyQueryHookResult = ReturnType<typeof useSimilarMerchantsLazyQuery>;
export type SimilarMerchantsQueryResult = Apollo.QueryResult<SimilarMerchantsQuery, SimilarMerchantsQueryVariables>;
export const SearchMerchantsDocument = gql`
    query SearchMerchants($search: String, $values: [ID!]) {
  options: merchants(
    filters: {search: $search, ids: $values}
    ordering: [{name: ASC}]
    pagination: {limit: 20}
  ) {
    value: id
    label: name
  }
}
    `;

/**
 * __useSearchMerchantsQuery__
 *
 * To run a query within a React component, call `useSearchMerchantsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchMerchantsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchMerchantsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchMerchantsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchMerchantsQuery, SearchMerchantsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchMerchantsQuery, SearchMerchantsQueryVariables>(SearchMerchantsDocument, options);
      }
export function useSearchMerchantsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchMerchantsQuery, SearchMerchantsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchMerchantsQuery, SearchMerchantsQueryVariables>(SearchMerchantsDocument, options);
        }
export type SearchMerchantsQueryHookResult = ReturnType<typeof useSearchMerchantsQuery>;
export type SearchMerchantsLazyQueryHookResult = ReturnType<typeof useSearchMerchantsLazyQuery>;
export type SearchMerchantsQueryResult = Apollo.QueryResult<SearchMerchantsQuery, SearchMerchantsQueryVariables>;
export const MerchantLocationsGeojsonDocument = gql`
    query MerchantLocationsGeojson($filters: MerchantLocationFilter, $limit: Int! = 5000) {
  merchantLocationsGeojson(filters: $filters, limit: $limit) {
    type
    bbox
    features {
      ...MerchantLocationFeature
    }
  }
}
    ${MerchantLocationFeatureFragmentDoc}`;

/**
 * __useMerchantLocationsGeojsonQuery__
 *
 * To run a query within a React component, call `useMerchantLocationsGeojsonQuery` and pass it any options that fit your needs.
 * When your component renders, `useMerchantLocationsGeojsonQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMerchantLocationsGeojsonQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useMerchantLocationsGeojsonQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MerchantLocationsGeojsonQuery, MerchantLocationsGeojsonQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MerchantLocationsGeojsonQuery, MerchantLocationsGeojsonQueryVariables>(MerchantLocationsGeojsonDocument, options);
      }
export function useMerchantLocationsGeojsonLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MerchantLocationsGeojsonQuery, MerchantLocationsGeojsonQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MerchantLocationsGeojsonQuery, MerchantLocationsGeojsonQueryVariables>(MerchantLocationsGeojsonDocument, options);
        }
export type MerchantLocationsGeojsonQueryHookResult = ReturnType<typeof useMerchantLocationsGeojsonQuery>;
export type MerchantLocationsGeojsonLazyQueryHookResult = ReturnType<typeof useMerchantLocationsGeojsonLazyQuery>;
export type MerchantLocationsGeojsonQueryResult = Apollo.QueryResult<MerchantLocationsGeojsonQuery, MerchantLocationsGeojsonQueryVariables>;
export const ListMerchantLocationsDocument = gql`
    query ListMerchantLocations($filters: MerchantLocationFilter, $pagination: OffsetPaginationInput) {
  merchantLocations(filters: $filters, pagination: $pagination) {
    ...MerchantLocation
  }
}
    ${MerchantLocationFragmentDoc}`;

/**
 * __useListMerchantLocationsQuery__
 *
 * To run a query within a React component, call `useListMerchantLocationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListMerchantLocationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListMerchantLocationsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListMerchantLocationsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListMerchantLocationsQuery, ListMerchantLocationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListMerchantLocationsQuery, ListMerchantLocationsQueryVariables>(ListMerchantLocationsDocument, options);
      }
export function useListMerchantLocationsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListMerchantLocationsQuery, ListMerchantLocationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListMerchantLocationsQuery, ListMerchantLocationsQueryVariables>(ListMerchantLocationsDocument, options);
        }
export type ListMerchantLocationsQueryHookResult = ReturnType<typeof useListMerchantLocationsQuery>;
export type ListMerchantLocationsLazyQueryHookResult = ReturnType<typeof useListMerchantLocationsLazyQuery>;
export type ListMerchantLocationsQueryResult = Apollo.QueryResult<ListMerchantLocationsQuery, ListMerchantLocationsQueryVariables>;
export const GetMerchantLocationDocument = gql`
    query GetMerchantLocation($id: ID!) {
  merchantLocation(id: $id) {
    ...MerchantLocation
    merchant {
      id
      name
      logoUrl
      category {
        ...TransactionCategory
      }
    }
  }
}
    ${MerchantLocationFragmentDoc}
${TransactionCategoryFragmentDoc}`;

/**
 * __useGetMerchantLocationQuery__
 *
 * To run a query within a React component, call `useGetMerchantLocationQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMerchantLocationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMerchantLocationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetMerchantLocationQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetMerchantLocationQuery, GetMerchantLocationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetMerchantLocationQuery, GetMerchantLocationQueryVariables>(GetMerchantLocationDocument, options);
      }
export function useGetMerchantLocationLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetMerchantLocationQuery, GetMerchantLocationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetMerchantLocationQuery, GetMerchantLocationQueryVariables>(GetMerchantLocationDocument, options);
        }
export type GetMerchantLocationQueryHookResult = ReturnType<typeof useGetMerchantLocationQuery>;
export type GetMerchantLocationLazyQueryHookResult = ReturnType<typeof useGetMerchantLocationLazyQuery>;
export type GetMerchantLocationQueryResult = Apollo.QueryResult<GetMerchantLocationQuery, GetMerchantLocationQueryVariables>;
export const SearchMerchantLocationsDocument = gql`
    query SearchMerchantLocations($search: String, $values: [ID!], $merchant: ID) {
  options: merchantLocations(
    filters: {ids: $values, merchant: $merchant}
    pagination: {limit: 50}
  ) {
    value: id
    label: name
  }
}
    `;

/**
 * __useSearchMerchantLocationsQuery__
 *
 * To run a query within a React component, call `useSearchMerchantLocationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchMerchantLocationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchMerchantLocationsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *      merchant: // value for 'merchant'
 *   },
 * });
 */
export function useSearchMerchantLocationsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchMerchantLocationsQuery, SearchMerchantLocationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchMerchantLocationsQuery, SearchMerchantLocationsQueryVariables>(SearchMerchantLocationsDocument, options);
      }
export function useSearchMerchantLocationsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchMerchantLocationsQuery, SearchMerchantLocationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchMerchantLocationsQuery, SearchMerchantLocationsQueryVariables>(SearchMerchantLocationsDocument, options);
        }
export type SearchMerchantLocationsQueryHookResult = ReturnType<typeof useSearchMerchantLocationsQuery>;
export type SearchMerchantLocationsLazyQueryHookResult = ReturnType<typeof useSearchMerchantLocationsLazyQuery>;
export type SearchMerchantLocationsQueryResult = Apollo.QueryResult<SearchMerchantLocationsQuery, SearchMerchantLocationsQueryVariables>;
export const MerchantCandidatesDocument = gql`
    query MerchantCandidates($limit: Int! = 20, $minCount: Int! = 2) {
  merchantCandidates(limit: $limit, minCount: $minCount) {
    ...MerchantCandidate
  }
}
    ${MerchantCandidateFragmentDoc}`;

/**
 * __useMerchantCandidatesQuery__
 *
 * To run a query within a React component, call `useMerchantCandidatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMerchantCandidatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMerchantCandidatesQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      minCount: // value for 'minCount'
 *   },
 * });
 */
export function useMerchantCandidatesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<MerchantCandidatesQuery, MerchantCandidatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<MerchantCandidatesQuery, MerchantCandidatesQueryVariables>(MerchantCandidatesDocument, options);
      }
export function useMerchantCandidatesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<MerchantCandidatesQuery, MerchantCandidatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<MerchantCandidatesQuery, MerchantCandidatesQueryVariables>(MerchantCandidatesDocument, options);
        }
export type MerchantCandidatesQueryHookResult = ReturnType<typeof useMerchantCandidatesQuery>;
export type MerchantCandidatesLazyQueryHookResult = ReturnType<typeof useMerchantCandidatesLazyQuery>;
export type MerchantCandidatesQueryResult = Apollo.QueryResult<MerchantCandidatesQuery, MerchantCandidatesQueryVariables>;
export const SpendingByMerchantDocument = gql`
    query SpendingByMerchant($dateFrom: Date, $dateTo: Date, $accounts: [ID!], $limit: Int) {
  spendingByMerchant(
    dateFrom: $dateFrom
    dateTo: $dateTo
    accounts: $accounts
    limit: $limit
  ) {
    ...MerchantTotal
  }
}
    ${MerchantTotalFragmentDoc}`;

/**
 * __useSpendingByMerchantQuery__
 *
 * To run a query within a React component, call `useSpendingByMerchantQuery` and pass it any options that fit your needs.
 * When your component renders, `useSpendingByMerchantQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSpendingByMerchantQuery({
 *   variables: {
 *      dateFrom: // value for 'dateFrom'
 *      dateTo: // value for 'dateTo'
 *      accounts: // value for 'accounts'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useSpendingByMerchantQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SpendingByMerchantQuery, SpendingByMerchantQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SpendingByMerchantQuery, SpendingByMerchantQueryVariables>(SpendingByMerchantDocument, options);
      }
export function useSpendingByMerchantLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SpendingByMerchantQuery, SpendingByMerchantQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SpendingByMerchantQuery, SpendingByMerchantQueryVariables>(SpendingByMerchantDocument, options);
        }
export type SpendingByMerchantQueryHookResult = ReturnType<typeof useSpendingByMerchantQuery>;
export type SpendingByMerchantLazyQueryHookResult = ReturnType<typeof useSpendingByMerchantLazyQuery>;
export type SpendingByMerchantQueryResult = Apollo.QueryResult<SpendingByMerchantQuery, SpendingByMerchantQueryVariables>;
export const GeocodeSearchDocument = gql`
    query GeocodeSearch($query: String!, $limit: Int! = 5) {
  geocodeSearch(query: $query, limit: $limit) {
    label
    street
    postalCode
    city
    region
    country
    latitude
    longitude
    osmId
  }
}
    `;

/**
 * __useGeocodeSearchQuery__
 *
 * To run a query within a React component, call `useGeocodeSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useGeocodeSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGeocodeSearchQuery({
 *   variables: {
 *      query: // value for 'query'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useGeocodeSearchQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GeocodeSearchQuery, GeocodeSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GeocodeSearchQuery, GeocodeSearchQueryVariables>(GeocodeSearchDocument, options);
      }
export function useGeocodeSearchLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GeocodeSearchQuery, GeocodeSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GeocodeSearchQuery, GeocodeSearchQueryVariables>(GeocodeSearchDocument, options);
        }
export type GeocodeSearchQueryHookResult = ReturnType<typeof useGeocodeSearchQuery>;
export type GeocodeSearchLazyQueryHookResult = ReturnType<typeof useGeocodeSearchLazyQuery>;
export type GeocodeSearchQueryResult = Apollo.QueryResult<GeocodeSearchQuery, GeocodeSearchQueryVariables>;
export const ListRecurringPaymentsDocument = gql`
    query ListRecurringPayments($filters: RecurringPaymentFilter, $ordering: [RecurringPaymentOrder!]! = [{nextExpected: ASC}], $pagination: OffsetPaginationInput) {
  recurringPayments(
    filters: $filters
    ordering: $ordering
    pagination: $pagination
  ) {
    ...ListRecurringPayment
  }
}
    ${ListRecurringPaymentFragmentDoc}`;

/**
 * __useListRecurringPaymentsQuery__
 *
 * To run a query within a React component, call `useListRecurringPaymentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListRecurringPaymentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListRecurringPaymentsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListRecurringPaymentsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListRecurringPaymentsQuery, ListRecurringPaymentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListRecurringPaymentsQuery, ListRecurringPaymentsQueryVariables>(ListRecurringPaymentsDocument, options);
      }
export function useListRecurringPaymentsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListRecurringPaymentsQuery, ListRecurringPaymentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListRecurringPaymentsQuery, ListRecurringPaymentsQueryVariables>(ListRecurringPaymentsDocument, options);
        }
export type ListRecurringPaymentsQueryHookResult = ReturnType<typeof useListRecurringPaymentsQuery>;
export type ListRecurringPaymentsLazyQueryHookResult = ReturnType<typeof useListRecurringPaymentsLazyQuery>;
export type ListRecurringPaymentsQueryResult = Apollo.QueryResult<ListRecurringPaymentsQuery, ListRecurringPaymentsQueryVariables>;
export const GetRecurringPaymentDocument = gql`
    query GetRecurringPayment($id: ID!) {
  recurringPayment(id: $id) {
    ...RecurringPayment
  }
}
    ${RecurringPaymentFragmentDoc}`;

/**
 * __useGetRecurringPaymentQuery__
 *
 * To run a query within a React component, call `useGetRecurringPaymentQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRecurringPaymentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRecurringPaymentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetRecurringPaymentQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetRecurringPaymentQuery, GetRecurringPaymentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetRecurringPaymentQuery, GetRecurringPaymentQueryVariables>(GetRecurringPaymentDocument, options);
      }
export function useGetRecurringPaymentLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetRecurringPaymentQuery, GetRecurringPaymentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetRecurringPaymentQuery, GetRecurringPaymentQueryVariables>(GetRecurringPaymentDocument, options);
        }
export type GetRecurringPaymentQueryHookResult = ReturnType<typeof useGetRecurringPaymentQuery>;
export type GetRecurringPaymentLazyQueryHookResult = ReturnType<typeof useGetRecurringPaymentLazyQuery>;
export type GetRecurringPaymentQueryResult = Apollo.QueryResult<GetRecurringPaymentQuery, GetRecurringPaymentQueryVariables>;
export const CashflowDocument = gql`
    query Cashflow($dateFrom: Date, $dateTo: Date, $granularity: Granularity! = MONTH, $accounts: [ID!], $includeTransfers: Boolean! = false) {
  cashflow(
    dateFrom: $dateFrom
    dateTo: $dateTo
    granularity: $granularity
    accounts: $accounts
    includeTransfers: $includeTransfers
  ) {
    ...CashflowBucket
  }
}
    ${CashflowBucketFragmentDoc}`;

/**
 * __useCashflowQuery__
 *
 * To run a query within a React component, call `useCashflowQuery` and pass it any options that fit your needs.
 * When your component renders, `useCashflowQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCashflowQuery({
 *   variables: {
 *      dateFrom: // value for 'dateFrom'
 *      dateTo: // value for 'dateTo'
 *      granularity: // value for 'granularity'
 *      accounts: // value for 'accounts'
 *      includeTransfers: // value for 'includeTransfers'
 *   },
 * });
 */
export function useCashflowQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<CashflowQuery, CashflowQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<CashflowQuery, CashflowQueryVariables>(CashflowDocument, options);
      }
export function useCashflowLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<CashflowQuery, CashflowQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<CashflowQuery, CashflowQueryVariables>(CashflowDocument, options);
        }
export type CashflowQueryHookResult = ReturnType<typeof useCashflowQuery>;
export type CashflowLazyQueryHookResult = ReturnType<typeof useCashflowLazyQuery>;
export type CashflowQueryResult = Apollo.QueryResult<CashflowQuery, CashflowQueryVariables>;
export const SpendingByCategoryDocument = gql`
    query SpendingByCategory($dateFrom: Date, $dateTo: Date, $accounts: [ID!], $includeTransfers: Boolean! = false) {
  spendingByCategory(
    dateFrom: $dateFrom
    dateTo: $dateTo
    accounts: $accounts
    includeTransfers: $includeTransfers
  ) {
    ...CategoryTotal
  }
}
    ${CategoryTotalFragmentDoc}`;

/**
 * __useSpendingByCategoryQuery__
 *
 * To run a query within a React component, call `useSpendingByCategoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useSpendingByCategoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSpendingByCategoryQuery({
 *   variables: {
 *      dateFrom: // value for 'dateFrom'
 *      dateTo: // value for 'dateTo'
 *      accounts: // value for 'accounts'
 *      includeTransfers: // value for 'includeTransfers'
 *   },
 * });
 */
export function useSpendingByCategoryQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SpendingByCategoryQuery, SpendingByCategoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SpendingByCategoryQuery, SpendingByCategoryQueryVariables>(SpendingByCategoryDocument, options);
      }
export function useSpendingByCategoryLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SpendingByCategoryQuery, SpendingByCategoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SpendingByCategoryQuery, SpendingByCategoryQueryVariables>(SpendingByCategoryDocument, options);
        }
export type SpendingByCategoryQueryHookResult = ReturnType<typeof useSpendingByCategoryQuery>;
export type SpendingByCategoryLazyQueryHookResult = ReturnType<typeof useSpendingByCategoryLazyQuery>;
export type SpendingByCategoryQueryResult = Apollo.QueryResult<SpendingByCategoryQuery, SpendingByCategoryQueryVariables>;
export const TopCounterpartiesDocument = gql`
    query TopCounterparties($dateFrom: Date, $dateTo: Date, $direction: Direction! = OUT, $limit: Int! = 10, $accounts: [ID!]) {
  topCounterparties(
    dateFrom: $dateFrom
    dateTo: $dateTo
    direction: $direction
    limit: $limit
    accounts: $accounts
  ) {
    ...CounterpartyTotal
  }
}
    ${CounterpartyTotalFragmentDoc}`;

/**
 * __useTopCounterpartiesQuery__
 *
 * To run a query within a React component, call `useTopCounterpartiesQuery` and pass it any options that fit your needs.
 * When your component renders, `useTopCounterpartiesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTopCounterpartiesQuery({
 *   variables: {
 *      dateFrom: // value for 'dateFrom'
 *      dateTo: // value for 'dateTo'
 *      direction: // value for 'direction'
 *      limit: // value for 'limit'
 *      accounts: // value for 'accounts'
 *   },
 * });
 */
export function useTopCounterpartiesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TopCounterpartiesQuery, TopCounterpartiesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<TopCounterpartiesQuery, TopCounterpartiesQueryVariables>(TopCounterpartiesDocument, options);
      }
export function useTopCounterpartiesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TopCounterpartiesQuery, TopCounterpartiesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<TopCounterpartiesQuery, TopCounterpartiesQueryVariables>(TopCounterpartiesDocument, options);
        }
export type TopCounterpartiesQueryHookResult = ReturnType<typeof useTopCounterpartiesQuery>;
export type TopCounterpartiesLazyQueryHookResult = ReturnType<typeof useTopCounterpartiesLazyQuery>;
export type TopCounterpartiesQueryResult = Apollo.QueryResult<TopCounterpartiesQuery, TopCounterpartiesQueryVariables>;
export const ListTransactionsDocument = gql`
    query ListTransactions($filters: TransactionFilter, $ordering: [TransactionOrder!]! = [{bookingDate: DESC}], $pagination: OffsetPaginationInput, $withSuggestions: Boolean! = false) {
  transactions(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListTransaction
    suggestedCategories(limit: 3) @include(if: $withSuggestions) {
      ...SuggestionChip
    }
  }
}
    ${ListTransactionFragmentDoc}
${SuggestionChipFragmentDoc}`;

/**
 * __useListTransactionsQuery__
 *
 * To run a query within a React component, call `useListTransactionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListTransactionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListTransactionsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *      withSuggestions: // value for 'withSuggestions'
 *   },
 * });
 */
export function useListTransactionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListTransactionsQuery, ListTransactionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListTransactionsQuery, ListTransactionsQueryVariables>(ListTransactionsDocument, options);
      }
export function useListTransactionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListTransactionsQuery, ListTransactionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListTransactionsQuery, ListTransactionsQueryVariables>(ListTransactionsDocument, options);
        }
export type ListTransactionsQueryHookResult = ReturnType<typeof useListTransactionsQuery>;
export type ListTransactionsLazyQueryHookResult = ReturnType<typeof useListTransactionsLazyQuery>;
export type ListTransactionsQueryResult = Apollo.QueryResult<ListTransactionsQuery, ListTransactionsQueryVariables>;
export const TransactionsCountDocument = gql`
    query TransactionsCount($filters: TransactionFilter) {
  transactionsCount(filters: $filters)
}
    `;

/**
 * __useTransactionsCountQuery__
 *
 * To run a query within a React component, call `useTransactionsCountQuery` and pass it any options that fit your needs.
 * When your component renders, `useTransactionsCountQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTransactionsCountQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *   },
 * });
 */
export function useTransactionsCountQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TransactionsCountQuery, TransactionsCountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<TransactionsCountQuery, TransactionsCountQueryVariables>(TransactionsCountDocument, options);
      }
export function useTransactionsCountLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TransactionsCountQuery, TransactionsCountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<TransactionsCountQuery, TransactionsCountQueryVariables>(TransactionsCountDocument, options);
        }
export type TransactionsCountQueryHookResult = ReturnType<typeof useTransactionsCountQuery>;
export type TransactionsCountLazyQueryHookResult = ReturnType<typeof useTransactionsCountLazyQuery>;
export type TransactionsCountQueryResult = Apollo.QueryResult<TransactionsCountQuery, TransactionsCountQueryVariables>;
export const GetTransactionDocument = gql`
    query GetTransaction($id: ID!) {
  transaction(id: $id) {
    ...Transaction
  }
}
    ${TransactionFragmentDoc}`;

/**
 * __useGetTransactionQuery__
 *
 * To run a query within a React component, call `useGetTransactionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTransactionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTransactionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetTransactionQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetTransactionQuery, GetTransactionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetTransactionQuery, GetTransactionQueryVariables>(GetTransactionDocument, options);
      }
export function useGetTransactionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetTransactionQuery, GetTransactionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetTransactionQuery, GetTransactionQueryVariables>(GetTransactionDocument, options);
        }
export type GetTransactionQueryHookResult = ReturnType<typeof useGetTransactionQuery>;
export type GetTransactionLazyQueryHookResult = ReturnType<typeof useGetTransactionLazyQuery>;
export type GetTransactionQueryResult = Apollo.QueryResult<GetTransactionQuery, GetTransactionQueryVariables>;
export const TransactionSuggestionsDocument = gql`
    query TransactionSuggestions($id: ID!, $limit: Int! = 3) {
  transaction(id: $id) {
    id
    suggestedCategories(limit: $limit) {
      ...CategorySuggestion
    }
  }
}
    ${CategorySuggestionFragmentDoc}`;

/**
 * __useTransactionSuggestionsQuery__
 *
 * To run a query within a React component, call `useTransactionSuggestionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useTransactionSuggestionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTransactionSuggestionsQuery({
 *   variables: {
 *      id: // value for 'id'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useTransactionSuggestionsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<TransactionSuggestionsQuery, TransactionSuggestionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<TransactionSuggestionsQuery, TransactionSuggestionsQueryVariables>(TransactionSuggestionsDocument, options);
      }
export function useTransactionSuggestionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TransactionSuggestionsQuery, TransactionSuggestionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<TransactionSuggestionsQuery, TransactionSuggestionsQueryVariables>(TransactionSuggestionsDocument, options);
        }
export type TransactionSuggestionsQueryHookResult = ReturnType<typeof useTransactionSuggestionsQuery>;
export type TransactionSuggestionsLazyQueryHookResult = ReturnType<typeof useTransactionSuggestionsLazyQuery>;
export type TransactionSuggestionsQueryResult = Apollo.QueryResult<TransactionSuggestionsQuery, TransactionSuggestionsQueryVariables>;
export const AccountSyncsDocument = gql`
    subscription AccountSyncs {
  accountSyncs {
    accountId
    created
    updated
    pendingReplaced
  }
}
    `;

/**
 * __useAccountSyncsSubscription__
 *
 * To run a query within a React component, call `useAccountSyncsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useAccountSyncsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAccountSyncsSubscription({
 *   variables: {
 *   },
 * });
 */
export function useAccountSyncsSubscription(baseOptions?: ApolloReactHooks.SubscriptionHookOptions<AccountSyncsSubscription, AccountSyncsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<AccountSyncsSubscription, AccountSyncsSubscriptionVariables>(AccountSyncsDocument, options);
      }
export type AccountSyncsSubscriptionHookResult = ReturnType<typeof useAccountSyncsSubscription>;
export type AccountSyncsSubscriptionResult = Apollo.SubscriptionResult<AccountSyncsSubscription>;