import type { Service } from "@/core/connection/arkitekt/types";
import { buildDeleteAction } from "@/core/smart/localactions/builders/deleteAction";
import { Action, ActionParams } from "@/core/smart/localactions/LocalActionProvider";
import { ApolloClient, NormalizedCache } from "@apollo/client";
import { ArrowLeftRight, Check, EyeOff, Link2, ListPlus, PiggyBank, RefreshCw, Tag, Tags, Unplug, X } from "lucide-react";
import { toastText } from "./errors";
import {
  CancelLinkDocument,
  CategorizeTransactionsDocument,
  DeleteBudgetDocument,
  DeleteCategoryDocument,
  DeleteCategoryRuleDocument,
  GetBankConnectionDocument,
  GetBankConnectionQuery,
  GetTransactionDocument,
  GetTransactionQuery,
  ListBankConnectionsDocument,
  MarkTransfersDocument,
  Provider,
  RecurringStatus,
  RevokeBankConnectionDocument,
  SetRecurringStatusesDocument,
  SyncAccountDocument,
  SyncConnectionDocument,
} from "./api/graphql";

const CONNECTION = "@bank/connection";
const ACCOUNT = "@bank/account";
const TRANSACTION = "@bank/transaction";
const CATEGORY = "@bank/category";
const RULE = "@bank/rule";
const BUDGET = "@bank/budget";
const RECURRING = "@bank/recurring";

// Same cast as `buildDeleteAction`: the deferred service type does not resolve
// here, but every concrete service carries a `.client`.
const bankClient = (services: ActionParams["services"]) => {
  const client = (services.bank as unknown as Service | undefined)?.client as
    | ApolloClient<NormalizedCache>
    | undefined;
  if (!client) throw new Error("Bank service not available");
  return client;
};

/** One mutation, its failure reworded from the error code ("Try again at 14:00"). */
const bankMutate = async (services: ActionParams["services"], options: Parameters<ApolloClient<NormalizedCache>["mutate"]>[0]) => {
  try {
    return await bankClient(services).mutate(options);
  } catch (e) {
    throw new Error(toastText(e));
  }
};

/** The selected ids of one kind; the condition matches on any, so a mixed selection is narrowed here. */
const idsOf = (state: ActionParams["state"], identifier: string) =>
  state.left.filter((s) => s.identifier === identifier && s.id).map((s) => String(s.id));

/** Run one mutation per selected object, reporting progress. */
const forEach = async (ids: string[], onProgress: ActionParams["onProgress"], run: (id: string) => Promise<unknown>) => {
  if (ids.length === 0) throw new Error("Nothing selected");
  for (const [index, id] of ids.entries()) {
    await run(id);
    onProgress?.(((index + 1) / ids.length) * 100);
  }
};

const setRecurring = (title: string, description: string, status: RecurringStatus, icon: Action["icon"]): Action => ({
  title,
  description,
  icon,
  conditions: [{ type: "identifier", identifier: RECURRING }, { type: "nopartner" }],
  execute: async ({ services, state, onProgress }) => {
    const ids = idsOf(state, RECURRING);
    if (ids.length === 0) throw new Error("Nothing selected");
    await bankMutate(services, { mutation: SetRecurringStatusesDocument, variables: { ids, status } });
    onProgress?.(100);
  },
});

const markTransfers = (title: string, description: string, isTransfer: boolean, icon: Action["icon"]): Action => ({
  title,
  description,
  icon,
  conditions: [{ type: "identifier", identifier: TRANSACTION }, { type: "nopartner" }],
  execute: async ({ services, state, onProgress }) => {
    const ids = idsOf(state, TRANSACTION);
    if (ids.length === 0) throw new Error("No transactions selected");
    await bankMutate(services, { mutation: MarkTransfersDocument, variables: { ids, isTransfer } });
    onProgress?.(100);
  },
});

export const BANK_ACTIONS: Record<string, Action> = {
  "bank-sync-account": {
    title: "Sync now",
    description: "Pull the account's transactions and balances from the bank",
    icon: RefreshCw,
    pinned: true,
    conditions: [{ type: "identifier", identifier: ACCOUNT }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      await forEach(idsOf(state, ACCOUNT), onProgress, (id) =>
        bankMutate(services, { mutation: SyncAccountDocument, variables: { id } }),
      );
    },
  },
  "bank-sync-connection": {
    title: "Sync all accounts",
    description: "Pull every account of this bank connection now",
    icon: RefreshCw,
    pinned: true,
    conditions: [{ type: "identifier", identifier: CONNECTION }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      await forEach(idsOf(state, CONNECTION), onProgress, (id) =>
        bankMutate(services, { mutation: SyncConnectionDocument, variables: { id } }),
      );
    },
  },
  "bank-relink-connection": {
    title: "Relink bank",
    description: "Give consent again; the same accounts and their history are kept",
    icon: Link2,
    conditions: [{ type: "identifier", identifier: CONNECTION }, { type: "nopartner" }],
    execute: async ({ dialog, services, state }) => {
      const [id] = idsOf(state, CONNECTION);
      if (!id) throw new Error("No connection selected");
      const { data } = await bankClient(services).query<GetBankConnectionQuery>({
        query: GetBankConnectionDocument,
        variables: { id },
      });
      // Opens on the same provider (and bank, pre-searched); consent is one click away.
      const { aspspCountry, aspspName, provider } = data.bankConnection;
      dialog.openDialog(
        "banklink",
        provider === Provider.Scalable ? { provider } : { provider, country: aspspCountry, bank: aspspName },
        { size: "medium" },
      );
    },
  },
  "bank-revoke-connection": {
    title: "Revoke consent",
    description: "Withdraw the bank consent. Accounts and transactions are kept.",
    icon: Unplug,
    conditions: [{ type: "identifier", identifier: CONNECTION }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress, confirm }) => {
      const ids = idsOf(state, CONNECTION);
      const ok = await confirm({
        title: ids.length === 1 ? "Revoke this bank consent?" : `Revoke ${ids.length} bank consents?`,
        description: "Syncing stops. Accounts and their history stay; relinking the bank picks them up again.",
        confirmLabel: "Revoke",
        destructive: true,
      });
      if (!ok) return;
      await forEach(ids, onProgress, (id) =>
        bankMutate(services, { mutation: RevokeBankConnectionDocument, variables: { id } }),
      );
    },
  },
  "bank-cancel-link": {
    title: "Cancel login",
    description: "Throw away a login that was started but never finished",
    icon: X,
    conditions: [{ type: "identifier", identifier: CONNECTION }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress, confirm }) => {
      const ids = idsOf(state, CONNECTION);
      const ok = await confirm({
        title: ids.length === 1 ? "Cancel this login?" : `Cancel ${ids.length} logins?`,
        description: "Only unfinished logins can be cancelled; linked connections stay as they are.",
        confirmLabel: "Cancel login",
        destructive: true,
      });
      if (!ok) return;
      await forEach(ids, onProgress, (connection) =>
        bankMutate(services, {
          mutation: CancelLinkDocument,
          variables: { connection },
          refetchQueries: [ListBankConnectionsDocument],
        }),
      );
    },
  },
  "bank-categorize": {
    title: "Categorize",
    description: "Set the category of the selected transactions",
    icon: Tag,
    pinned: true,
    conditions: [{ type: "identifier", identifier: TRANSACTION }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("bankcategorize", { ids: idsOf(state, TRANSACTION) }, { size: "small" });
    },
  },
  "bank-categorize-into": {
    title: "Move into category",
    description: "Give the dragged transactions this category",
    icon: Tags,
    conditions: [
      { type: "identifier", identifier: TRANSACTION },
      { type: "pidentifier", identifier: CATEGORY },
    ],
    execute: async ({ services, state, onProgress }) => {
      const category = state.right?.find((s) => s.identifier === CATEGORY);
      if (!category) throw new Error("Drop the transactions onto a category");
      const ids = idsOf(state, TRANSACTION);
      if (ids.length === 0) throw new Error("No transactions selected");
      await bankMutate(services, {
        mutation: CategorizeTransactionsDocument,
        variables: { ids, category: String(category.id) },
      });
      onProgress?.(100);
    },
  },
  "bank-rule-from-transaction": {
    title: "Rule from counterparty",
    description: "Categorize every transaction from this counterparty the same way",
    icon: ListPlus,
    conditions: [{ type: "identifier", identifier: TRANSACTION }, { type: "nopartner" }],
    execute: async ({ services, state, dialog }) => {
      const [id] = idsOf(state, TRANSACTION);
      if (!id) throw new Error("No transaction selected");
      const { data } = await bankClient(services).query<GetTransactionQuery>({
        query: GetTransactionDocument,
        variables: { id },
      });
      const tx = data.transaction;
      dialog.openDialog(
        "bankcreaterule",
        { pattern: tx.counterparty ?? tx.remittance ?? "", category: tx.category?.id },
        { size: "medium" },
      );
    },
  },
  "bank-mark-transfer": markTransfers(
    "Mark as transfer",
    "Money moved between own accounts; left out of stats",
    true,
    ArrowLeftRight,
  ),
  "bank-unmark-transfer": markTransfers(
    "Not a transfer",
    "Count these transactions in stats again",
    false,
    ArrowLeftRight,
  ),
  "bank-new-rule": {
    title: "New rule",
    description: "Add a rule that sorts transactions into this category",
    icon: ListPlus,
    conditions: [{ type: "identifier", identifier: CATEGORY }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("bankcreaterule", { category: idsOf(state, CATEGORY)[0] }, { size: "medium" });
    },
  },
  "bank-new-budget": {
    title: "Set budget",
    description: "Set a monthly limit for this category",
    icon: PiggyBank,
    conditions: [{ type: "identifier", identifier: CATEGORY }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("bankcreatebudget", { category: idsOf(state, CATEGORY)[0] }, { size: "small" });
    },
  },
  "bank-confirm-recurring": setRecurring(
    "Confirm recurring",
    "Count this payment in balance forecasts",
    RecurringStatus.Confirmed,
    Check,
  ),
  "bank-ignore-recurring": setRecurring(
    "Ignore recurring",
    "This is not a real recurring payment",
    RecurringStatus.Ignored,
    EyeOff,
  ),
  "bank-delete-category": buildDeleteAction({
    title: "Delete category",
    identifier: CATEGORY,
    description: "Delete the category",
    service: "bank",
    typename: "Category",
    mutation: DeleteCategoryDocument,
  }),
  "bank-delete-rule": buildDeleteAction({
    title: "Delete rule",
    identifier: RULE,
    description: "Delete the rule; transactions it sorted are re-categorized",
    service: "bank",
    typename: "CategoryRule",
    mutation: DeleteCategoryRuleDocument,
  }),
  "bank-delete-budget": buildDeleteAction({
    title: "Delete budget",
    identifier: BUDGET,
    description: "Delete the budget",
    service: "bank",
    typename: "Budget",
    mutation: DeleteBudgetDocument,
  }),
};
