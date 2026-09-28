import type { Service } from "@/core/connection/arkitekt/types";
import { Action, ActionParams } from "@/core/smart/localactions/LocalActionProvider";
import { ApolloClient, NormalizedCache } from "@apollo/client";
import { Pencil, Tag, Tags, Trash2 } from "lucide-react";
import {
  CategorizeMessagesDocument,
  CategorySync,
  DeleteCategoryDocument,
  GetCategoryDocument,
  GetCategoryQuery,
  GetMailAccountDocument,
  ListCategoriesDocument,
  ListMessagesDocument,
  ListThreadsDocument,
} from "../api/graphql";
import { toastText } from "../errors";

const ACCOUNT = "@kuvert/account";
const MESSAGE = "@kuvert/message";
const CATEGORY = "@kuvert/category";

// Same cast as `buildDeleteAction`: every concrete service carries a `.client`.
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

const idsOf = (state: ActionParams["state"], identifier: string) =>
  state.left.filter((s) => s.identifier === identifier && s.id).map((s) => String(s.id));

const partnerIdsOf = (state: ActionParams["state"], identifier: string) =>
  (state.right ?? []).filter((s) => s.identifier === identifier && s.id).map((s) => String(s.id));

const need = (ids: string[], what: string) => {
  if (ids.length === 0) throw new Error(`No ${what} selected`);
  return ids;
};

/** What shows categories and their mail; refetched (when mounted) after a change to one. */
const CATEGORY_VIEWS = [ListCategoriesDocument, GetCategoryDocument, GetMailAccountDocument, ListThreadsDocument, ListMessagesDocument];

export const CATEGORY_ACTIONS: Record<string, Action> = {
  "kuvert-categorize": {
    title: "Categorize…",
    description: "Put the mail into categories of its mailbox, or take it out",
    icon: Tags,
    conditions: [{ type: "identifier", identifier: MESSAGE }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const messages = need(idsOf(state, MESSAGE), "mail");
      dialog.openDialog("kuvertcategorize", { messages }, { size: "small" });
    },
  },
  "kuvert-categorize-drop": {
    title: "Put into category",
    description: "Put the mail into this category",
    icon: Tag,
    conditions: [
      { type: "identifier", identifier: MESSAGE },
      { type: "pidentifier", identifier: CATEGORY },
    ],
    execute: async ({ services, state, onProgress }) => {
      const messages = need(idsOf(state, MESSAGE), "mail");
      const categories = need(partnerIdsOf(state, CATEGORY), "category");
      await kuvertMutate(services, {
        mutation: CategorizeMessagesDocument,
        variables: { input: { messages, add: categories, remove: [] } },
        refetchQueries: CATEGORY_VIEWS,
      });
      onProgress(100);
    },
  },
  "kuvert-new-category": {
    title: "New category",
    description: "Add a category to the mailbox, to sort its mail into",
    icon: Tag,
    conditions: [{ type: "identifier", identifier: ACCOUNT }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const [account] = need(idsOf(state, ACCOUNT), "mailbox");
      dialog.openDialog("kuvertcategory", { account }, { size: "small" });
    },
  },
  "kuvert-edit-category": {
    title: "Edit category",
    description: "Rename or recolour the category, or change where it lives",
    icon: Pencil,
    pinned: true,
    conditions: [{ type: "identifier", identifier: CATEGORY }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const [id] = need(idsOf(state, CATEGORY), "category");
      dialog.openDialog("kuvertcategory", { id }, { size: "small" });
    },
  },
  "kuvert-delete-category": {
    title: "Delete category",
    description: "Delete the category; its mail stays where it is. Hold Shift to also take its keyword off the mail on the server",
    icon: Trash2,
    conditions: [{ type: "identifier", identifier: CATEGORY }, { type: "nopartner" }],
    execute: async ({ services, state, confirm, modifiers, onProgress }) => {
      const ids = need(idsOf(state, CATEGORY), "category");
      const client = kuvertClient(services);
      const categories = await Promise.all(
        ids.map((id) => client.query<GetCategoryQuery>({ query: GetCategoryDocument, variables: { id } }).then((r) => r.data.category)),
      );
      const keywords = categories.filter((c) => c.sync === CategorySync.Keyword);
      const removeKeywords = modifiers.shiftKey && keywords.length > 0;
      const what = categories.length === 1 ? categories[0].name : `${categories.length} categories`;
      const ok = await confirm({
        title: `Delete ${what}?`,
        description: removeKeywords
          ? `The mail stays; its keyword${keywords.length === 1 ? ` ${keywords[0].keyword} is` : "s are"} also taken off the mail on the server.`
          : keywords.length > 0
            ? "The mail stays, and keeps its keyword on the server (other mail clients still see it). Hold Shift to also remove the keyword."
            : "The mail stays where it is; only the category goes.",
        confirmLabel: "Delete",
        destructive: true,
      });
      if (!ok) return;
      for (const [i, c] of categories.entries()) {
        await kuvertMutate(services, {
          mutation: DeleteCategoryDocument,
          variables: { id: c.id, removeKeywords: removeKeywords && c.sync === CategorySync.Keyword },
          refetchQueries: CATEGORY_VIEWS,
        });
        client.cache.evict({ id: client.cache.identify({ __typename: "Category", id: c.id }) });
        onProgress(((i + 1) / categories.length) * 100);
      }
      client.cache.gc();
    },
  },
};
