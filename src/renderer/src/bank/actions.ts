import type { Service } from "@/core/connection/arkitekt/types";
import { ADMIN_ROLE } from "@/core/connection/roles";
import { buildDeleteAction } from "@/core/smart/localactions/builders/deleteAction";
import { Action, ActionParams } from "@/core/smart/localactions/LocalActionProvider";
import { ApolloClient, NormalizedCache } from "@apollo/client";
import {
  ArrowLeftRight,
  Check,
  EyeOff,
  Link2,
  ListPlus,
  MapPin,
  Merge,
  Pencil,
  Store,
  PiggyBank,
  Power,
  PowerOff,
  RefreshCw,
  Tag,
  Tags,
  Trash2,
  Unplug,
  X,
} from "lucide-react";
import { relinkProps } from "./relink";
import { toastText } from "./errors";
import {
  CancelAuthDocument,
  AssignMerchantDocument,
  CategorizeTransactionsDocument,
  DeleteBudgetDocument,
  DeleteCategoryRuleDocument,
  DeleteMerchantDocument,
  DeleteMerchantLocationDocument,
  DeleteProviderDocument,
  GetMerchantLocationDocument,
  GetMerchantLocationQuery,
  GetBankConnectionDocument,
  GetBankConnectionQuery,
  GetTransactionDocument,
  GetTransactionQuery,
  ListBankConnectionsDocument,
  ListBankProvidersDocument,
  MarkTransfersDocument,
  MergeMerchantsDocument,
  RecurringStatus,
  RevokeBankConnectionDocument,
  SetRecurringStatusesDocument,
  SyncAccountDocument,
  SyncConnectionDocument,
  UpdateProviderDocument,
} from "./api/graphql";

const PROVIDER = "@bank/provider";
const CONNECTION = "@bank/connection";
const ACCOUNT = "@bank/account";
const TRANSACTION = "@bank/transaction";
const CATEGORY = "@bank/category";
const MERCHANT = "@bank/merchant";
const PLACE = "@bank/place";
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
  "bank-link-through-provider": {
    title: "Link through this provider",
    description: "Link a bank or broker through this provider",
    icon: Link2,
    pinned: true,
    conditions: [{ type: "identifier", identifier: PROVIDER }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const [provider] = idsOf(state, PROVIDER);
      if (!provider) throw new Error("No provider selected");
      dialog.openDialog("banklink", { provider }, { size: "medium" });
    },
  },
  "bank-edit-provider": {
    title: "Edit provider",
    description: "Change its name, settings and capabilities",
    icon: Pencil,
    roles: ADMIN_ROLE,
    conditions: [{ type: "identifier", identifier: PROVIDER }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const [id] = idsOf(state, PROVIDER);
      if (!id) throw new Error("No provider selected");
      dialog.openDialog("bankeditprovider", { id }, { size: "medium" });
    },
  },
  "bank-enable-provider": {
    title: "Enable provider",
    description: "Let it start links and sync again",
    icon: Power,
    roles: ADMIN_ROLE,
    conditions: [{ type: "identifier", identifier: PROVIDER }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      await forEach(idsOf(state, PROVIDER), onProgress, (id) =>
        bankMutate(services, {
          mutation: UpdateProviderDocument,
          variables: { input: { id, enabled: true } },
          refetchQueries: [ListBankProvidersDocument],
        }),
      );
    },
  },
  "bank-disable-provider": {
    title: "Disable provider",
    description: "It starts no links and syncs nothing until enabled again",
    icon: PowerOff,
    roles: ADMIN_ROLE,
    conditions: [{ type: "identifier", identifier: PROVIDER }, { type: "nopartner" }],
    execute: async ({ services, state, onProgress }) => {
      await forEach(idsOf(state, PROVIDER), onProgress, (id) =>
        bankMutate(services, {
          mutation: UpdateProviderDocument,
          variables: { input: { id, enabled: false } },
          refetchQueries: [ListBankProvidersDocument],
        }),
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
      dialog.openDialog("banklink", relinkProps(data.bankConnection), { size: "medium" });
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
      // A login is cancelled by its state, which only its starter is told.
      let skipped = 0;
      await forEach(ids, onProgress, async (id) => {
        const { data } = await bankClient(services).query<GetBankConnectionQuery>({
          query: GetBankConnectionDocument,
          variables: { id },
          fetchPolicy: "network-only",
        });
        const state = data.bankConnection.pendingAuth?.state;
        if (!state) {
          skipped += 1;
          return;
        }
        await bankMutate(services, {
          mutation: CancelAuthDocument,
          variables: { state },
          refetchQueries: [ListBankConnectionsDocument],
        });
      });
      if (skipped === ids.length) throw new Error("There is no unfinished login of yours here to cancel");
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
  "bank-assign-merchant-into": {
    title: "Set merchant",
    description: "Say the dragged transactions were with this merchant",
    icon: Store,
    conditions: [
      { type: "identifier", identifier: TRANSACTION },
      { type: "pidentifier", identifier: MERCHANT },
    ],
    execute: async ({ services, state, onProgress }) => {
      const merchant = state.right?.find((s) => s.identifier === MERCHANT);
      if (!merchant) throw new Error("Drop the transactions onto a merchant");
      const ids = idsOf(state, TRANSACTION);
      if (ids.length === 0) throw new Error("No transactions selected");
      await bankMutate(services, {
        mutation: AssignMerchantDocument,
        variables: { input: { transactions: ids, merchant: { id: String(merchant.id) } } },
      });
      onProgress?.(100);
    },
  },
  "bank-assign-place-into": {
    title: "Set place",
    description: "Say the dragged transactions happened at this place",
    icon: MapPin,
    conditions: [
      { type: "identifier", identifier: TRANSACTION },
      { type: "pidentifier", identifier: PLACE },
    ],
    execute: async ({ services, state, onProgress }) => {
      const place = state.right?.find((s) => s.identifier === PLACE);
      if (!place) throw new Error("Drop the transactions onto a place");
      const ids = idsOf(state, TRANSACTION);
      if (ids.length === 0) throw new Error("No transactions selected");
      // A place belongs to one merchant; the link needs both.
      const { data } = await bankClient(services).query<GetMerchantLocationQuery>({
        query: GetMerchantLocationDocument,
        variables: { id: String(place.id) },
      });
      await bankMutate(services, {
        mutation: AssignMerchantDocument,
        variables: {
          input: {
            transactions: ids,
            merchant: { id: data.merchantLocation.merchant.id },
            location: { id: String(place.id) },
          },
        },
      });
      onProgress?.(100);
    },
  },
  "bank-assign-merchant": {
    title: "Set merchant",
    description: "Say who the selected transactions were with, and where",
    icon: Store,
    conditions: [{ type: "identifier", identifier: TRANSACTION }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("bankassignmerchant", { ids: idsOf(state, TRANSACTION) }, { size: "medium" });
    },
  },
  "bank-merge-merchant-into": {
    title: "Merge into this merchant",
    description: "Fold the dragged merchant into this one: its aliases, places and transactions move over",
    icon: Merge,
    conditions: [
      { type: "identifier", identifier: MERCHANT },
      { type: "pidentifier", identifier: MERCHANT },
    ],
    execute: async ({ services, state, confirm }) => {
      const into = state.right?.find((s) => s.identifier === MERCHANT);
      const merchants = idsOf(state, MERCHANT).filter((id) => id !== String(into?.id));
      if (!into || merchants.length === 0) throw new Error("Drop a merchant onto another one");
      const ok = await confirm({
        title: merchants.length === 1 ? "Merge this merchant?" : `Merge ${merchants.length} merchants?`,
        description: `They are folded into ${into.label ?? "the target"} and deleted.`,
        confirmLabel: "Merge",
        destructive: true,
      });
      if (!ok) return;
      for (const merchant of merchants) {
        await bankMutate(services, { mutation: MergeMerchantsDocument, variables: { merchant, into: String(into.id) } });
      }
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
      dialog.openDialog("bankcreatebudget", { category: idsOf(state, CATEGORY)[0] }, { size: "medium" });
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
  "bank-edit-category": {
    title: "Edit category",
    description: "Rename, describe, move or hide the category",
    icon: Pencil,
    conditions: [{ type: "identifier", identifier: CATEGORY }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("bankeditcategory", { id: idsOf(state, CATEGORY)[0] }, { size: "medium" });
    },
  },
  "bank-delete-category": {
    title: "Delete category",
    description: "Delete the category, after showing what goes with it",
    icon: Trash2,
    conditions: [{ type: "identifier", identifier: CATEGORY }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const category = state.left.find((s) => s.identifier === CATEGORY);
      if (!category) throw new Error("No category selected");
      dialog.openDialog(
        "bankdeletecategory",
        { id: String(category.id), name: category.label ?? undefined },
        { size: "small" },
      );
    },
  },
  "bank-edit-merchant": {
    title: "Edit merchant",
    description: "Rename the merchant or set its category, website and logo",
    icon: Pencil,
    conditions: [{ type: "identifier", identifier: MERCHANT }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("bankeditmerchant", { id: idsOf(state, MERCHANT)[0] }, { size: "medium" });
    },
  },
  "bank-merge-merchant": {
    title: "Merge into…",
    description: "Fold this merchant into another one",
    icon: Merge,
    conditions: [{ type: "identifier", identifier: MERCHANT }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("bankmergemerchant", { id: idsOf(state, MERCHANT)[0] }, { size: "small" });
    },
  },
  "bank-add-place": {
    title: "Add place",
    description: "Add a store of this merchant",
    icon: MapPin,
    conditions: [{ type: "identifier", identifier: MERCHANT }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("bankplace", { merchant: idsOf(state, MERCHANT)[0] }, { size: "medium" });
    },
  },
  "bank-edit-place": {
    title: "Edit place",
    description: "Change the place's name, address or store number",
    icon: Pencil,
    conditions: [{ type: "identifier", identifier: PLACE }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      dialog.openDialog("bankplace", { id: idsOf(state, PLACE)[0] }, { size: "medium" });
    },
  },
  "bank-delete-provider": {
    ...buildDeleteAction({
      title: "Delete provider",
      identifier: PROVIDER,
      description: "Remove the provider; only one without active or pending connections can go",
      service: "bank",
      typename: "BankProvider",
      mutation: DeleteProviderDocument,
    }),
    roles: ADMIN_ROLE,
  },
  "bank-delete-place": buildDeleteAction({
    title: "Delete place",
    identifier: PLACE,
    description: "Delete the place; its transactions keep their merchant",
    service: "bank",
    typename: "MerchantLocation",
    mutation: DeleteMerchantLocationDocument,
  }),
  "bank-delete-merchant": buildDeleteAction({
    title: "Delete merchant",
    identifier: MERCHANT,
    description: "Delete the merchant and its places; its transactions stay",
    service: "bank",
    typename: "Merchant",
    mutation: DeleteMerchantDocument,
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
