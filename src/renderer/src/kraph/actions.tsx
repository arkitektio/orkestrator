import { buildDeleteAction } from "@/lib/localactions/builders/deleteAction";
import { Action } from "@/lib/localactions/LocalActionProvider";
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
} from "./api/graphql";
import { Link2, PlusCircle, Ruler, Stamp, Undo2, Workflow } from "lucide-react";

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
    const graph = state.left[0].object;
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
    const entity = state.right?.[0]?.object;
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
      await client.mutate({
        mutation: AssertInformsDocument,
        variables: {
          input: {
            structureIdentifier: String(structure.object.identifier ?? structure.identifier),
            structureObject: String(structure.object.object ?? structure.object.id),
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
        variables: { id: String(node.object.id) },
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
      .map((node) => String(node.object.id));
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

export const KRAPH_ACTIONS = {
  "create-new-entity": NewEntityAction,
  "link-structure-to-entity": LinkStructureToEntityAction,
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
          graph: state.left[0].object.id,
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
    execute: async ({ state, dialog }) => {
      const graphField = state.left[0]?.object?.graph;
      const graph =
        graphField &&
        typeof graphField === "object" &&
        !Array.isArray(graphField) &&
        "id" in graphField &&
        typeof graphField.id === "string"
          ? graphField.id
          : undefined;
      if (!graph) {
        throw new Error("Structure category does not have a graph. Use the context menu to select a graph.");
      }
      dialog.openDialog("createnewmeasurement", {
        left: state.left,
        right: state.right || [],
        graph,
      });
    },
    collections: ["io"],
  },
} as const satisfies Record<string, Action>;
