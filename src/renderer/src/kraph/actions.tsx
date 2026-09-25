import { buildDeleteAction } from "@/core/lib/localactions/builders/deleteAction";
import { Action } from "@/core/lib/localactions/LocalActionProvider";
import type { ApolloClient, NormalizedCache } from "@apollo/client";
import {
  DeleteEntityCategoryDocument,
  RetractEntityDocument,
  AttestEntityDocument,
  AttestLinkDocument,
  AttestMetricDocument,
  AttestStructureDocument,
  RetractLinksDocument,
  AttestNaturalEventDocument,
  AttestProtocolEventDocument,
  DeleteGraphDocument,
  DeleteMeasurementCategoryDocument,
  DeleteNaturalEventCategoryDocument,
  DeleteProtocolEventCategoryDocument,
  AssertInformsDocument,
  GetEntityCategoryDocument,
  GetStructureDocument,
  type GetEntityCategoryQuery,
  type GetEntityCategoryQueryVariables,
  type GetStructureQuery,
  type GetStructureQueryVariables,
} from "./api/graphql";
import { smartRegistry } from "@/core/providers/smart/registry";
import type { Structure } from "@/core/types";
import { Equal, Link2, PlusCircle, Ruler, Stamp, Undo2, Workflow } from "lucide-react";
import { toast } from "sonner";
import { executeSameness, explainSameness, planSameness } from "./lib/sameness";

export const NewEntityAction: Action = {
  title: "Create New Entity",
  description: "Create a new entity in the current graph",
  icon: PlusCircle,
  conditions: [
    {
      type: "identifier",
      identifier: "@kraph/entitycategory",
    },
    {
      type: "nopartner",
    },
  ],
  execute: async ({ state, dialog }) => {
    if (!state.left || state.left.length === 0) {
      throw new Error("No graph provided for Create New Entity action");
    }
    const graph = state.left[0];
    if (!graph) {
      throw new Error("No graph object found for Create New Entity action");
    }

    dialog.openDialog("createentity", {
      category: graph.id,
    });
  },
};

export const LinkStructureToEntityAction: Action = {
  title: "Link Structure to Entity",
  description: "Record that this structure informs the partner entity",
  icon: Link2,
  conditions: [
    {
      type: "identifier",
      identifier: "@kraph/structure",
    },
    {
      type: "pidentifier",
      identifier: "@kraph/entity",
    },
  ],
  execute: async ({ state, services }) => {
    const entity = state.right?.[0];
    if (!entity || typeof entity.id !== "string") {
      throw new Error("No entity selected to link this structure to");
    }

    const client = (services.kraph as unknown as { client: ApolloClient<NormalizedCache> })
      .client;
    if (!client) {
      throw new Error("Kraph service is not available");
    }

    // Structures are organization-scoped, so they are addressed by their
    // foreign identifier/object pair rather than by a kraph id.
    const structures = state.left.filter(
      (structure) => structure.identifier === "@kraph/structure",
    );

    for (const structure of structures) {
      // The foreign reference lives on kraph's structure row; ask kraph for it
      // rather than trusting whatever fragment a card happened to carry.
      const { data } = await client.query<GetStructureQuery, GetStructureQueryVariables>({
        query: GetStructureDocument,
        variables: { id: structure.id },
      });
      await client.mutate({
        mutation: AssertInformsDocument,
        variables: {
          input: {
            structureIdentifier: data.structure.identifier,
            structureObject: data.structure.object,
            entityId: entity.id,
          },
        },
      });
    }
  },
  collections: ["io"],
};

// Attesting is the round-trip counterpart of archiving: `archive*` returns the
// uuid that `attest*` takes back, so a retracted claim can be re-asserted. It
// does not displace anyone else's claim on the same node.
const ATTEST_DOCUMENTS = {
  "@kraph/entity": AttestEntityDocument,
  "@kraph/naturalevent": AttestNaturalEventDocument,
  "@kraph/protocolevent": AttestProtocolEventDocument,
  // The three claim kinds that had no attestation path until the evidence layer
  // grew one. A structure and a metric are rows of their own tables — neither is
  // an instance and neither is ever drawn — but a position can be taken on them
  // exactly as on any other claim.
  "@kraph/link": AttestLinkDocument,
  "@kraph/metric": AttestMetricDocument,
  "@kraph/structure": AttestStructureDocument,
} as const;

export const AttestNodeAction: Action = {
  title: "Attest",
  description: "Re-assert that this node stands, without displacing other claims",
  icon: Stamp,
  conditions: [
    {
      type: "mixture",
      identifiers: Object.keys(ATTEST_DOCUMENTS),
    },
  ],
  execute: async ({ state, services }) => {
    const client = (services.kraph as unknown as { client: ApolloClient<NormalizedCache> })
      .client;
    if (!client) {
      throw new Error("Kraph service is not available");
    }

    for (const node of state.left) {
      const mutation = ATTEST_DOCUMENTS[node.identifier as keyof typeof ATTEST_DOCUMENTS];
      if (!mutation) continue;
      await client.mutate({
        mutation,
        variables: { id: String(node.id) },
      });
    }
  },
  collections: ["io"],
};

/**
 * Retracting is a claim too: it writes a `Standing` saying this no longer holds,
 * and leaves the evidence in place. `retractLinks` takes a list of `Link` ids —
 * it was `retractClaims`, which named neither the table it reads nor the one a
 * retraction writes.
 */
export const RetractLinksAction: Action = {
  title: "Retract",
  description: "Record that these links no longer hold, without deleting them",
  icon: Undo2,
  conditions: [{ type: "identifier", identifier: "@kraph/link" }],
  execute: async ({ state, services, confirm }) => {
    const client = (services.kraph as unknown as { client: ApolloClient<NormalizedCache> })
      .client;
    if (!client) {
      throw new Error("Kraph service is not available");
    }

    const ids = state.left
      .filter((node) => node.identifier === "@kraph/link")
      .map((node) => String(node.id));
    if (ids.length === 0) return;

    await confirm({
      title: `Retract ${ids.length} link${ids.length === 1 ? "" : "s"}?`,
      description:
        "The evidence stays and nothing is deleted — this records that they no longer hold.",
      confirmLabel: "Retract",
    });

    await client.mutate({
      mutation: RetractLinksDocument,
      variables: { ids },
    });
  },
  collections: ["io"],
};

/** How a datum is named in a confirmation: its label if it has one, else its model and id. */
const describeDatum = (structure: Structure) => {
  if (structure.label) return structure.label;
  return `${smartRegistry.getDisplayName(structure.identifier)} ${structure.id}`;
};

/**
 * "This is the same thing as that one." Two datums — the one this runs on and
 * the one dropped onto it (or chosen as its partner) — are evidence for one
 * individual. Organization-grain: it names no graph, and every view whose
 * sameness rule trusts the claimant folds the two into one node.
 *
 * A local action rather than a button so the same gesture works from a drop on
 * the Knowledge panel, the context menu and the `ObjectButton` alike. The
 * decision of *what* to write lives in `kraph/lib/sameness` and is shared with
 * the per-label drop target in the Knowledge sidebar.
 */
export const SameAsDatumAction: Action = {
  title: "Same thing as…",
  description:
    "Claim that this datum and the partner datum are evidence for one and the same thing",
  icon: Equal,
  conditions: [{ type: "datum" }, { type: "pdatum" }],
  execute: async ({ state, services, confirm }) => {
    const left = state.left[0];
    const right = state.right?.[0];
    if (!left || !right || state.left.length !== 1 || state.right?.length !== 1) {
      throw new Error("Pick exactly one datum on each side");
    }

    const client = (services.kraph as unknown as { client: ApolloClient<NormalizedCache> })
      .client;
    if (!client) {
      throw new Error("Kraph service is not available");
    }

    const plan = await planSameness({ client, left, right });
    if (plan.kind === "needs-term" || plan.kind === "ambiguous") {
      throw new Error(explainSameness(plan) ?? "Cannot claim sameness here");
    }
    if (plan.kind === "already-same") {
      toast.info(`Already the same ${plan.term}`);
      return;
    }

    // A drop is cheap to do by accident, and this is the one claim here that
    // merges identities — so it is confirmed, unlike a label.
    const confirmed = await confirm({
      title: `Same ${plan.term}?`,
      description: `${describeDatum(left)} and ${describeDatum(right)} will be recorded as evidence for one ${plan.term}. This is a claim in the log and can be retracted.`,
      confirmLabel: "Claim same",
    });
    if (!confirmed) {
      return;
    }

    await executeSameness(client, plan);
    toast.success(`Claimed the same ${plan.term}`);
  },
  collections: ["io"],
};

export const KRAPH_ACTIONS = {
  "create-new-entity": NewEntityAction,
  "link-structure-to-entity": LinkStructureToEntityAction,
  "same-datum": SameAsDatumAction,
  "attest-node": AttestNodeAction,
  "retract-links": RetractLinksAction,
  "delete-kraph-graph": buildDeleteAction({
    title: "Delete Graph",
    identifier: "@kraph/graph",
    description: "Delete the Graph",
    service: "kraph",
    typename: "Graph",
    mutation: DeleteGraphDocument,
  }),
  "delete-kraph-protocoleventcategory": buildDeleteAction({
    title: "Delete Protocol Event Category",
    identifier: "@kraph/protocoleventcategory",
    description: "Delete the Protocol Event Category",
    service: "kraph",
    typename: "ProtocolEventCategory",
    mutation: DeleteProtocolEventCategoryDocument,
  }),
  "delete-kraph-naturaleventcategory": buildDeleteAction({
    title: "Delete Naturl Event Category",
    identifier: "@kraph/naturaleventcategory",
    description: "Delete the Protocol Event",
    service: "kraph",
    typename: "NaturalEventCategory",
    mutation: DeleteNaturalEventCategoryDocument,
  }),
  "delete-kraph-entitycategory": buildDeleteAction({
    title: "Delete Entity Category",
    identifier: "@kraph/entitycategory",
    description: "Delete the Entity Category",
    service: "kraph",
    typename: "EntityCategory",
    mutation: DeleteEntityCategoryDocument,
  }),
  "delete-kraph-measurementcategory": buildDeleteAction({
    title: "Delete Measurement Category",
    identifier: "@kraph/measurementcategory",
    description: "Delete the Measurment Category",
    service: "kraph",
    typename: "MeasurementCategory",
    mutation: DeleteMeasurementCategoryDocument,
  }),

  // Entities are an append-only log: nothing is deleted. Retracting withdraws
  // *your* claim — anyone else's claim on the same word stands, and the
  // evidence behind it stays in the log. The entity is still evicted from the
  // cache so it drops out of active lists.
  "retract-entity": buildDeleteAction({
    title: "Retract Claim",
    identifier: "@kraph/entity",
    description:
      "Withdraw your claim on this entity. Other subjects' claims and the evidence behind them are untouched.",
    service: "kraph",
    typename: ["Entity", "Node"],
    mutation: RetractEntityDocument,
    icon: Undo2,
    verb: { present: "Retract", past: "Retracted", reversible: true },
  }),

  // Custom Actions

  "create-protocol-event-category": {
    title: "Create Protocol Event Category",
    description: "Create a new Protocol Event Category",
    icon: Workflow,
    conditions: [
      {
        type: "identifier",
        identifier: "@kraph/graph",
      },
    ],
    execute: async ({ state, dialog }) => {
      dialog.openSheet(
        "createprotocoleventcategory",
        {
          graph: state.left[0].id,
        },
        { className: "w-[600px] max-w-none" },
      );
    },
    collections: ["io"],
  },
  "create-new-measurment-category": {
    title: "Create New Measurement Category",
    description:
      "Create a new measurement category between structure and entity",
    icon: Ruler,
    conditions: [
      {
        type: "identifier",
        identifier: "@kraph/structurekind",
      },
      {
        type: "pidentifier",
        identifier: "@kraph/entitycategory",
      },
    ],
    execute: async ({ state, dialog, services }) => {
      // A structure kind belongs to no graph; the entity category it is
      // measured against does, so the new category goes into that graph.
      const category = state.right?.[0];
      if (!category) {
        throw new Error("Drop the structure kind onto an entity category.");
      }
      const client = (services.kraph as unknown as { client: ApolloClient<NormalizedCache> })
        .client;
      const { data } = await client.query<GetEntityCategoryQuery, GetEntityCategoryQueryVariables>({
        query: GetEntityCategoryDocument,
        variables: { id: category.id },
      });
      const graph = data.entityCategory.graph.id;
      dialog.openDialog("createnewmeasurement", {
        left: state.left,
        right: state.right || [],
        graph,
      });
    },
    collections: ["io"],
  },
} as const satisfies Record<string, Action>;
