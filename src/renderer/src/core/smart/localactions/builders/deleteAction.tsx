import { Smart } from "@/core/smart/builder";
import {
  ApolloClient,
  NormalizedCache,
  TypedDocumentNode,
} from "@apollo/client";
import { Trash2 } from "lucide-react";
import { Action, ResolveActionServices } from "../LocalActionProvider";
import type { Service } from "@/core/connection/arkitekt/types";

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

/**
 * What a delete would cost, as the service that owns the structures answers it
 * (mikro: `preflightDelete<Model>`). Neutral on purpose: the builder knows no
 * service's documents, only what to say and whether to send `cascade`.
 */
export type DeletePreflightSummary = {
  /** Why the delete cannot go ahead at all, one sentence each. */
  blockers: string[];
  /** How many things made from the targets would go with them. */
  casualtyCount: number;
  /** One sentence naming them, for the confirm dialog. Empty when nothing goes along. */
  description: string;
  /** More would go along than one delete may take: refused. */
  truncated: boolean;
  /** Targets another target's cascade takes along: not deleted on their own. */
  skipIds: string[];
  /** The service's keys of what would go along (mikro: `<kind>:<id>`), for cache upkeep. */
  casualtyKeys: string[];
};

/** One structure, or several that the action deletes alike (the kinds of one model). */
type DeleteTarget = Smart | string | readonly (Smart | string)[];

const identifiersOf = (target: DeleteTarget): string[] =>
  (Array.isArray(target) ? target : [target]).map(identifierFromSmartOrString);

export type DeleteActionParams<
  TAppOrServices = never,
  TServiceKey extends DeleteActionServiceKey<TAppOrServices> = DeleteActionServiceKey<TAppOrServices>,
> = {
  identifier: DeleteTarget;
  title: string;
  mutation: TypedDocumentNode<unknown, { id: string; cascade?: boolean }>;
  /**
   * Ask first what the delete would take along. When anything would, the confirm
   * names it -- always, Ctrl or not -- and the mutation is sent with
   * `cascade: true`; a blocker refuses before any dialog.
   */
  preflight?: (client: ApolloClient<NormalizedCache>, ids: string[]) => Promise<DeletePreflightSummary>;
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
    Array.isArray(params.identifier)
      ? { type: "mixture", identifiers: identifiersOf(params.identifier) }
      : { type: "identifier", identifier: identifierFromSmartOrString(params.identifier as Smart | string) },
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
    const identifiers = identifiersOf(params.identifier);
    const targets = state.left.filter(
      (structure) => identifiers.includes(structure.identifier),
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

    const summary = params.preflight ? await params.preflight(service, targets.map((structure) => structure.id)) : null;
    if (summary && (summary.blockers.length > 0 || summary.truncated)) {
      throw new Error(
        summary.truncated
          ? "More was made from this than one delete may take along. Delete what was made from it first."
          : `Cannot ${verb.present.toLowerCase()}: ${summary.blockers.join(" ")}`,
      );
    }
    const cascade = (summary?.casualtyCount ?? 0) > 0;

    if (cascade && summary) {
      const confirmed = await confirm({
        title: targets.length > 1 ? `${verb.present} ${targets.length} items and what was made from them?` : `${params.title} and what was made from it?`,
        description: `${summary.description}${permanence}`,
        confirmLabel: `${verb.present} all ${targets.length + summary.casualtyCount}`,
        cancelLabel: "Keep",
        destructive: true,
      });
      if (!confirmed) {
        return;
      }
    } else if (!modifiers.ctrlKey) {
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
    const skipped = new Set(summary?.skipIds ?? []);
    for (const structure of targets) {
      const id = structure.id;
      try {
        if (!skipped.has(id)) {
          await service.mutate({
            mutation: params.mutation,
            variables: cascade ? { id, cascade: true } : { id },
          });
        }

        for (const typename of typenames) {
          service.cache.evict({
            id: service.cache.identify({ __typename: typename, id }),
          });
        }
      } catch (error) {
        failures.push({ id, error });
        console.error(`Failed to ${verb.present.toLowerCase()} ${structure.identifier} ${id}`, error);
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
