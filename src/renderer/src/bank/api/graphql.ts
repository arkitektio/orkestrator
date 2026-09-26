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
  /** Date (isoformat) */
  Date: { input: string; output: string; }
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string; }
  /** Decimal (fixed-point) */
  Decimal: { input: string; output: string; }
  _Any: { input: any; output: any; }
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

/** An account at a bank. Keeps its history across relinks. */
export type BankAccount = {
  __typename?: 'BankAccount';
  /** Every balance the bank reported, one per day and type. */
  balances: Array<BalanceSnapshot>;
  /** The consent this account is currently reached through. */
  connection?: Maybe<BankConnection>;
  /** When the account was first linked. */
  createdAt: Scalars['DateTime']['output'];
  /** The account's ISO currency. */
  currency: Scalars['String']['output'];
  /** A depot's positions as of its latest sync (empty for other accounts). */
  currentHoldings: Array<HoldingSnapshot>;
  /** The account's IBAN, if the bank reports one. */
  iban?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** True while a sync holds the account. */
  isSyncing: Scalars['Boolean']['output'];
  /** Cash, securities depot, or savings. */
  kind: AccountKind;
  /** Why the last sync failed, if it did. */
  lastError?: Maybe<Scalars['String']['output']>;
  /** The kind of `lastError`, for the client to offer a fix. */
  lastErrorCode?: Maybe<BankErrorCode>;
  /** When the last successful sync finished. */
  lastSyncedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The newest balance the bank reported, of the most authoritative type. */
  latestBalance?: Maybe<BalanceSnapshot>;
  /** The account's name at the bank. */
  name?: Maybe<Scalars['String']['output']>;
  /** The earliest this account may sync (null: now) — after today's budget is spent or the provider asked to wait. Syncing earlier fails with RATE_LIMITED without contacting the provider. */
  nextSyncAllowedAt?: Maybe<Scalars['DateTime']['output']>;
  /** The organization this account belongs to. */
  organization: Organization;
  /** The bank's product name for the account. */
  product?: Maybe<Scalars['String']['output']>;
  /** Syncs left today under the provider's daily limit (null: no limit). */
  syncsRemainingToday?: Maybe<Scalars['Int']['output']>;
  /** The account's transactions. */
  transactions: Array<Transaction>;
};


/** An account at a bank. Keeps its history across relinks. */
export type BankAccountTransactionsArgs = {
  filters?: InputMaybe<TransactionFilter>;
  ordering?: Array<TransactionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/**
 * An account at a bank, reached through a connection.
 *
 * Keyed by ``identification_key`` (Enable Banking's cross-session identification hash,
 * else the IBAN), so relinking an expired consent re-attaches the same account and its
 * history instead of starting over.
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
  /** The consent this account is currently reached through. */
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
  /** The fewest syncs any account of the connection has left today (null: no limit). */
  syncsRemainingToday?: Maybe<Scalars['Int']['output']>;
  /** When the bank consent runs out. */
  validUntil?: Maybe<Scalars['DateTime']['output']>;
};


/** One consent at one bank. Accounts are synced through it while it is ACTIVE. */
export type BankConnectionAccountsArgs = {
  filters?: InputMaybe<BankAccountFilter>;
  ordering?: Array<BankAccountOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
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
  /** The parent category, if nested. */
  children: Array<Category>;
  /** A display color (e.g. ``#4f46e5``). */
  color?: Maybe<Scalars['String']['output']>;
  /** When the category was created. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** Whether money in this category is an expense, income, or a transfer between own accounts. */
  kind: CategoryKind;
  /** The category's name, unique among its siblings. */
  name: Scalars['String']['output'];
  /** The organization this category belongs to. */
  organization: Organization;
  /** The parent category, if nested. */
  parent?: Maybe<Category>;
  /** The category matching transactions get. */
  rules: Array<CategoryRule>;
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

/** A spending or income category. Categories nest (groceries under household). */
export type CategoryFilter = {
  AND?: InputMaybe<CategoryFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<CategoryFilter>;
  OR?: InputMaybe<CategoryFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  kind?: InputMaybe<CategoryKind>;
  roots?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Whether a category holds expenses, income, or transfers between own accounts (excluded from stats). */
export enum CategoryKind {
  Expense = 'EXPENSE',
  Income = 'INCOME',
  Transfer = 'TRANSFER'
}

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

/** Who set a transaction's category; rules never override a manual one. */
export enum CategorySource {
  Manual = 'MANUAL',
  None = 'NONE',
  Rule = 'RULE'
}

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

/** A new category. */
export type CreateCategoryInput = {
  color?: InputMaybe<Scalars['String']['input']>;
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

/** Money in or money out. */
export enum Direction {
  In = 'IN',
  Out = 'OUT'
}

/** An expected end-of-day balance. */
export type ForecastPoint = {
  __typename?: 'ForecastPoint';
  amount: Scalars['Decimal']['output'];
  currency: Scalars['String']['output'];
  date: Scalars['Date']['output'];
};

/** The bucket size of a cashflow series. */
export enum Granularity {
  Month = 'MONTH',
  Week = 'WEEK'
}

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

/** Where a Scalable link is: waiting for the login code to be approved, then for the second factor. */
export enum LinkStep {
  Device = 'DEVICE',
  Done = 'DONE',
  Mfa = 'MFA'
}

/** Set whether a transaction moves money between own accounts. */
export type MarkTransferInput = {
  id: Scalars['ID']['input'];
  /** True or false pins it; null returns it to automatic detection (by counterparty IBAN). */
  isTransfer?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Mutation = {
  __typename?: 'Mutation';
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
  /** Delete a budget. */
  deleteBudget: Scalars['ID']['output'];
  /** Delete a category. */
  deleteCategory: Scalars['ID']['output'];
  /** Delete a categorization rule. */
  deleteCategoryRule: Scalars['ID']['output'];
  /** Detect recurring payments. */
  detectRecurring: Array<RecurringPayment>;
  /** Pin or un-pin a transaction as a transfer between own accounts. */
  markTransfer: Transaction;
  /** Pin or un-pin many transactions as transfers at once. */
  markTransfers: Array<Transaction>;
  /** Run the rules over existing transactions. */
  reapplyRules: Scalars['Int']['output'];
  /** Get the auth session of a pending link you started again (to continue a login). */
  resumeLink: AuthSession;
  /** Withdraw a bank consent; data is kept. */
  revokeBankConnection: BankConnection;
  /** Add the default categories. */
  seedDefaultCategories: Array<Category>;
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
  /** Pull every account of a connection now. */
  syncConnection: Array<SyncResult>;
  /** Change a budget. */
  updateBudget: Budget;
  /** Change a category. */
  updateCategory: Category;
  /** Change a categorization rule. */
  updateCategoryRule: CategoryRule;
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


export type MutationDeleteBudgetArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCategoryArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteCategoryRuleArgs = {
  apply?: Scalars['Boolean']['input'];
  id: Scalars['ID']['input'];
};


export type MutationDetectRecurringArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type MutationMarkTransferArgs = {
  input: MarkTransferInput;
};


export type MutationMarkTransfersArgs = {
  ids: Array<Scalars['ID']['input']>;
  isTransfer?: InputMaybe<Scalars['Boolean']['input']>;
};


export type MutationReapplyRulesArgs = {
  accounts?: InputMaybe<Array<Scalars['ID']['input']>>;
};


export type MutationResumeLinkArgs = {
  connection: Scalars['ID']['input'];
};


export type MutationRevokeBankConnectionArgs = {
  id: Scalars['ID']['input'];
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

/** Who a connection reaches its accounts through. */
export enum Provider {
  Enablebanking = 'ENABLEBANKING',
  Scalable = 'SCALABLE'
}

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
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
  /** A categorization rule by id. */
  categoryRule: CategoryRule;
  /** The organization's categorization rules. */
  categoryRules: Array<CategoryRule>;
  /** An account's expected balance over the coming days. */
  forecast: Array<ForecastPoint>;
  /** A depot's positions on a day (its latest synced day by default). */
  holdings: Array<HoldingSnapshot>;
  /** A recurring payment by id. */
  recurringPayment: RecurringPayment;
  /** Detected recurring payments. */
  recurringPayments: Array<RecurringPayment>;
  /** Income, expense and net per category and currency. */
  spendingByCategory: Array<CategoryTotal>;
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


export type QueryHoldingsArgs = {
  account: Scalars['ID']['input'];
  date?: InputMaybe<Scalars['Date']['input']>;
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

/** Start linking a bank. */
export type StartBankLinkInput = {
  /** The bank's name exactly as `bankInstitutions` lists it. */
  aspspName: Scalars['String']['input'];
  /** The bank's ISO country code, e.g. AT. */
  country: Scalars['String']['input'];
  /** One of the server's registered redirect URLs; the first by default. */
  redirectUrl?: InputMaybe<Scalars['String']['input']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Events whenever one of the organization's accounts finished syncing. */
  accountSyncs: AccountSyncEvent;
};

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
  /** A user's note. */
  note?: Maybe<Scalars['String']['output']>;
  /** Units of the security, if any. */
  quantity?: Maybe<Scalars['Decimal']['output']>;
  /** The remittance information (purpose line). */
  remittance?: Maybe<Scalars['String']['output']>;
  /** Booked or pending. */
  status: TransactionStatus;
  /** When it was made (e.g. the card payment). */
  transactionDate?: Maybe<Scalars['Date']['output']>;
  /** When the row last changed. */
  updatedAt: Scalars['DateTime']['output'];
  /** When it took effect for interest. */
  valueDate?: Maybe<Scalars['Date']['output']>;
};

/**
 * A single booked or pending transaction on an account.
 *
 * Bank fields are overwritten by every sync; ``category``, ``note`` and ``is_transfer``
 * belong to the users and survive re-syncs of booked rows (see :mod:`finance.sync`).
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
  dateFrom?: InputMaybe<Scalars['Date']['input']>;
  dateTo?: InputMaybe<Scalars['Date']['input']>;
  direction?: InputMaybe<Direction>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  includeChildCategories?: InputMaybe<Scalars['Boolean']['input']>;
  isTransfer?: InputMaybe<Scalars['Boolean']['input']>;
  kind?: InputMaybe<TransactionKind>;
  kinds?: InputMaybe<Array<TransactionKind>>;
  search?: InputMaybe<Scalars['String']['input']>;
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

/** Booking status as reported by the bank. */
export enum TransactionStatus {
  Booked = 'BOOKED',
  Other = 'OTHER',
  Pending = 'PENDING'
}

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
  id: Scalars['ID']['input'];
  kind?: InputMaybe<CategoryKind>;
  name?: InputMaybe<Scalars['String']['input']>;
  /** The new parent, or null to make it top-level. */
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

/** A user account; sub is the stable subject identifier from the identity provider. */
export type User = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
  preferredUsername: Scalars['String']['output'];
  sub: Scalars['String']['output'];
};

export type _Entity = BalanceSnapshot | BankAccount | BankConnection | Budget | Category | CategoryRule | HoldingSnapshot | Organization | RecurringPayment | Transaction | User;

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

export type ListCategoryFragment = { __typename?: 'Category', id: string, name: string, color?: string | null, kind: CategoryKind, parent?: { __typename?: 'Category', id: string, name: string } | null };

export type CategoryRuleFragment = { __typename?: 'CategoryRule', id: string, priority: number, field: RuleField, match: RuleMatch, pattern: string, direction: RuleDirection, amountMin?: string | null, amountMax?: string | null, active: boolean, createdAt: string, category: (
    { __typename?: 'Category' }
    & ListCategoryFragment
  ) };

export type CategoryFragment = (
  { __typename?: 'Category', createdAt: string, children: Array<(
    { __typename?: 'Category' }
    & ListCategoryFragment
  )>, rules: Array<(
    { __typename?: 'CategoryRule' }
    & CategoryRuleFragment
  )> }
  & ListCategoryFragment
);

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

export type ListTransactionFragment = { __typename?: 'Transaction', id: string, bookingDate?: string | null, valueDate?: string | null, transactionDate?: string | null, amount: string, currency: string, status: TransactionStatus, counterparty?: string | null, remittance?: string | null, isTransfer: boolean, note?: string | null, kind?: TransactionKind | null, isin?: string | null, quantity?: string | null, categorySource: CategorySource, category?: (
    { __typename?: 'Category' }
    & TransactionCategoryFragment
  ) | null, account: { __typename?: 'BankAccount', id: string, name?: string | null, iban?: string | null } };

export type TransactionFragment = (
  { __typename?: 'Transaction', counterpartyIban?: string | null, entryReference?: string | null, isTransferManual: boolean, createdAt: string, updatedAt: string }
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
}>;


export type DeleteCategoryMutation = { __typename?: 'Mutation', deleteCategory: string };

export type SeedDefaultCategoriesMutationVariables = Exact<{ [key: string]: never; }>;


export type SeedDefaultCategoriesMutation = { __typename?: 'Mutation', seedDefaultCategories: Array<(
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
}>;


export type ListTransactionsQuery = { __typename?: 'Query', transactions: Array<(
    { __typename?: 'Transaction' }
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
  children(ordering: [{name: ASC}]) {
    ...ListCategory
  }
  rules {
    ...CategoryRule
  }
}
    ${ListCategoryFragmentDoc}
${CategoryRuleFragmentDoc}`;
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
export const TransactionCategoryFragmentDoc = gql`
    fragment TransactionCategory on Category {
  id
  name
  color
  kind
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
export const RecurringPaymentFragmentDoc = gql`
    fragment RecurringPayment on RecurringPayment {
  ...ListRecurringPayment
  transactions(ordering: [{bookingDate: DESC}], pagination: {limit: 24}) {
    ...ListTransaction
  }
}
    ${ListRecurringPaymentFragmentDoc}
${ListTransactionFragmentDoc}`;
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
export const CounterpartyTotalFragmentDoc = gql`
    fragment CounterpartyTotal on CounterpartyTotal {
  counterparty
  currency
  total
  count
}
    `;
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
    mutation DeleteCategory($id: ID!) {
  deleteCategory(id: $id)
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
    mutation ReapplyRules($accounts: [ID!]) {
  reapplyRules(accounts: $accounts)
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
    query ListTransactions($filters: TransactionFilter, $ordering: [TransactionOrder!]! = [{bookingDate: DESC}], $pagination: OffsetPaginationInput) {
  transactions(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListTransaction
  }
}
    ${ListTransactionFragmentDoc}`;

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