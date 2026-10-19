import type { Service } from "@/core/connection/arkitekt/types";
import { ADMIN_ROLE } from "@/core/connection/roles";
import { buildDeleteAction } from "@/core/smart/localactions/builders/deleteAction";
import { Action, ActionParams } from "@/core/smart/localactions/LocalActionProvider";
import { ApolloClient, NormalizedCache } from "@apollo/client";
import { Link2, Pencil, Power, PowerOff } from "lucide-react";
import { DeleteProviderDocument, ListMailProvidersDocument, UpdateProviderDocument } from "../api/graphql";
import { asKuvertError } from "../errors";

const PROVIDER = "@kuvert/provider";

// Same cast as `buildDeleteAction`: every concrete service carries a `.client`.
const kuvertClient = (services: ActionParams["services"]) => {
  const client = (services.kuvert as unknown as Service | undefined)?.client as
    | ApolloClient<NormalizedCache>
    | undefined;
  if (!client) throw new Error("Mail service not available");
  return client;
};

const idsOf = (state: ActionParams["state"]) =>
  state.left.filter((s) => s.identifier === PROVIDER && s.id).map((s) => String(s.id));

const need = (ids: string[]) => {
  if (ids.length === 0) throw new Error("No provider selected");
  return ids;
};

const setEnabled = (enabled: boolean): Action => ({
  title: enabled ? "Enable provider" : "Disable provider",
  description: enabled
    ? "Let it link mailboxes, and its mailboxes sync and send again"
    : "It links no mailbox, and its mailboxes neither sync nor send until enabled again",
  icon: enabled ? Power : PowerOff,
  roles: ADMIN_ROLE,
  conditions: [{ type: "identifier", identifier: PROVIDER }, { type: "nopartner" }],
  execute: async ({ services, state, onProgress }) => {
    const ids = need(idsOf(state));
    for (const [i, id] of ids.entries()) {
      try {
        await kuvertClient(services).mutate({
          mutation: UpdateProviderDocument,
          variables: { input: { id, enabled } },
          refetchQueries: [ListMailProvidersDocument],
        });
      } catch (e) {
        throw asKuvertError(e);
      }
      onProgress(((i + 1) / ids.length) * 100);
    }
  },
});

/** The organization's mail providers (admins set them up; anyone links through one). */
export const PROVIDER_ACTIONS: Record<string, Action> = {
  "kuvert-link-through-provider": {
    title: "Link through this provider",
    description: "Add a mailbox through this provider",
    icon: Link2,
    pinned: true,
    conditions: [{ type: "identifier", identifier: PROVIDER }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const [provider] = need(idsOf(state));
      dialog.openDialog("kuvertlink", { provider }, { size: "medium" });
    },
  },
  "kuvert-edit-provider": {
    title: "Edit provider",
    description: "Change its name, client or servers, and capabilities",
    icon: Pencil,
    roles: ADMIN_ROLE,
    conditions: [{ type: "identifier", identifier: PROVIDER }, { type: "nopartner" }],
    execute: async ({ dialog, state }) => {
      const [id] = need(idsOf(state));
      dialog.openDialog("kuverteditprovider", { id }, { size: "medium" });
    },
  },
  "kuvert-enable-provider": setEnabled(true),
  "kuvert-disable-provider": setEnabled(false),
  "kuvert-delete-provider": {
    ...buildDeleteAction({
      title: "Delete provider",
      identifier: PROVIDER,
      description: "Remove the provider; only one no mailbox goes through can go",
      service: "kuvert",
      typename: "MailProvider",
      mutation: DeleteProviderDocument,
    }),
    roles: ADMIN_ROLE,
  },
};
