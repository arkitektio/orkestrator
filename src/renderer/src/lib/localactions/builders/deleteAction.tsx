import { Smart } from "@/providers/smart/builder";
import {
  ApolloClient,
  NormalizedCache,
  TypedDocumentNode,
} from "@apollo/client";
import { Trash2 } from "lucide-react";
import { Action, ResolveActionServices } from "../LocalActionProvider";
import type { Service } from "@/lib/arkitekt/types";

export const identifierFromSmartOrString = (identifier: Smart | string) => {
  if (typeof identifier === "string") {
    return identifier;
  }
  return identifier.identifier;
};

type DeleteActionServiceKey<TAppOrServices> = Extract<
  keyof ResolveActionServices<TAppOrServices>,
  string
>;

export type DeleteActionParams<
  TAppOrServices = never,
  TServiceKey extends DeleteActionServiceKey<TAppOrServices> = DeleteActionServiceKey<TAppOrServices>,
> = {
  identifier: Smart | string;
  title: string;
  mutation: TypedDocumentNode<unknown, { id: string }>;
  typename: string | string[];
  service: TServiceKey;
  description?: string;
  icon?: Action<TAppOrServices>["icon"];
  pinned?: Action<TAppOrServices>["pinned"];
  /**
   * Wording for the confirm dialog and error copy. Kraph instances are an
   * append-only log — they can only be archived, never deleted — so the
   * "cannot be undone" phrasing has to be suppressible.
   */
  verb?: { present: string; past: string; reversible?: boolean };
};

export const buildDeleteAction = <
  TAppOrServices = never,
  TServiceKey extends DeleteActionServiceKey<TAppOrServices> = DeleteActionServiceKey<TAppOrServices>,
>(
  params: DeleteActionParams<TAppOrServices, TServiceKey>,
): Action<TAppOrServices> => ({
  title: params.title,
  description: params.description || "Delete the structure",
  icon: params.icon ?? Trash2,
  pinned: params.pinned,
  conditions: [
    {
      type: "identifier",
      identifier: identifierFromSmartOrString(params.identifier),
    },
    {
      type: "nopartner",
    },
  ],
  execute: async ({ services, onProgress, abortSignal: _abortSignal, state, modifiers, confirm }) => {
    // `services[key]` is typed against the deferred `ResolveActionServices<TAppOrServices>`
    // conditional, which TS can't resolve for a generic `TAppOrServices` inside this
    // function body — every concrete service in `ServiceMap` has `.client`, though.
    const resolvedService = services[params.service] as unknown as Service;
    const service = resolvedService.client as ApolloClient<NormalizedCache>;
    if (!service) {
      throw new Error("Service not found");
    }

    // Only act on the selected structures this action actually applies to. The
    // identifier condition matches when ANY selected item matches, so a mixed
    // selection can include items of other types — never delete those here.
    const identifier = identifierFromSmartOrString(params.identifier);
    const targets = state.left.filter(
      (structure) => structure.identifier === identifier,
    );
    const typenames = Array.isArray(params.typename)
      ? params.typename
      : [params.typename];

    if (targets.length === 0) {
      return;
    }

    const verb = params.verb ?? { present: "Delete", past: "Deleted" };
    const permanence = verb.reversible
      ? ""
      : " This action cannot be undone.";

    if (!modifiers.ctrlKey) {
      const itemCount = targets.length;
      const confirmed = await confirm({
        title:
          itemCount > 1
            ? `${verb.present} ${itemCount} items?`
            : params.title,
        description:
          itemCount > 1
            ? `You are about to ${verb.present.toLowerCase()} ${itemCount} selected items.${permanence} To skip this dialog, hold Ctrl when doing it.`
            : `${params.description || `${verb.present} the selected item`}${permanence} To skip this dialog, hold Ctrl when doing it.`,
        confirmLabel: verb.present,
        cancelLabel: "Keep",
        destructive: true,
      });

      if (!confirmed) {
        return;
      }
    }

    // Act on every target, isolating failures so one bad mutation never aborts
    // the rest of the batch.
    const failures: { id: string; error: unknown }[] = [];
    let done = 0;
    for (const structure of targets) {
      const id = structure.id;
      try {
        await service.mutate({
          mutation: params.mutation,
          variables: { id },
        });

        for (const typename of typenames) {
          service.cache.evict({
            id: service.cache.identify({ __typename: typename, id }),
          });
        }
      } catch (error) {
        failures.push({ id, error });
        console.error(`Failed to ${verb.present.toLowerCase()} ${identifier} ${id}`, error);
      } finally {
        done += 1;
        onProgress(Math.round((done / targets.length) * 100));
      }
    }

    service.cache.gc();

    if (failures.length > 0) {
      const succeeded = targets.length - failures.length;
      throw new Error(
        `${verb.past} ${succeeded} of ${targets.length} — ${failures.length} failed.`,
      );
    }

    return {
      left: [],
      isCommand: false,
    };
  },
  collections: ["io"],
});
