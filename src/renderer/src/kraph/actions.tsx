import { buildDeleteAction } from "@/core/smart/localactions/builders/deleteAction";
import { Action } from "@/core/smart/localactions/LocalActionProvider";
import type { ServiceMap } from "@/core/connection/arkitekt/provider";
import type { ApolloClient, NormalizedCache } from "@apollo/client";
import {
  DeleteEntityCategoryDocument,
  RetractEntityDocument,
  AttestEntityDocument,
  AttestLinkDocument,
  AttestMetricDocument,
  AttestStructureDocument,
  RetractLinksDocument,
  SetTermHiddenDocument,
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
  AttachToTodoItemDocument,
  DeleteTodoItemDocument,
  type AttachToTodoItemMutation,
  type AttachToTodoItemMutationVariables,
  MoveTodoItemDocument,
  type MoveTodoItemMutation,
  type MoveTodoItemMutationVariables,
  SetTodoStructuresStatusDocument,
  type SetTodoStructuresStatusMutation,
  type SetTodoStructuresStatusMutationVariables,
  TodoItemDocument,
  type TodoItemQuery,
  type TodoItemQueryVariables,
  TodoItemAssignmentDocument,
  type TodoItemAssignmentQuery,
  type TodoItemAssignmentQueryVariables,
  TodoListAssignmentDocument,
  type TodoListAssignmentQuery,
  type TodoListAssignmentQueryVariables,
  TodoStatus,
} from "./api/graphql";
import { smartRegistry } from "@/core/smart/registry";
import type { Structure } from "@/core/types";
import { CalendarClock, Check, CheckCheck, Circle, Equal, Eye, EyeOff, Link2, ListPlus, ListTodo, Pencil, Play, PlusCircle, Ruler, Stamp, Undo2, UserRoundPen, Workflow } from "lucide-react";
import { toast } from "@/core/notify";
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

/**
 * "This datum measures a <word>" — the lookup (recent words first, or a new
 * one) is the `measureterm` dialog; the recent words also come back as rows
 * of the menu's Measures section (`smart/sections.tsx`).
 */
export const MeasureTermAction: Action = {
  title: "Measures…",
  description: "Record what this datum measures, as one of the organization's terms",
  icon: Ruler,
  conditions: [{ type: "datum" }, { type: "nopartner" }],
  execute: async ({ state, dialog }) => {
    if (!state.left.length) {
      throw new Error("Nothing selected to measure");
    }
    dialog.openDialog("measureterm", { structures: state.left }, { size: "medium" });
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

/** The data among `structures`: what a todo item can carry. */
const dataOf = (structures: Structure[]) =>
  structures.filter((structure) => smartRegistry.isDatum(structure.identifier));

/**
 * Put the selected data on a todo item — an existing one or a new one, picked
 * in the `addtotodo` dialog. Several images selected make one item with each
 * image ticked on its own.
 */
export const AddToTodoAction: Action = {
  title: "Add to todo…",
  description: "Put it on a todo item, to be ticked off when done",
  icon: ListTodo,
  conditions: [{ type: "nopartner" }, { type: "datum" }],
  execute: async ({ state, dialog, services }) => {
    if (!services.kraph) {
      throw new Error("Kraph is not available, so there are no todo lists.");
    }
    dialog.openDialog("addtotodo", { structures: dataOf(state.left) }, { size: "medium" });
  },
  collections: ["io"],
};

/** Drop data on a todo item (a board card) to put it on that item. The card shows it at once. */
export const AttachToTodoItemAction: Action = {
  title: "Attach to todo item",
  description: "Put it on this todo item, to be ticked off when done",
  icon: ListPlus,
  conditions: [{ type: "datum" }, { type: "pidentifier", identifier: "@kraph/todoitem" }],
  execute: async ({ state, services }) => {
    const item = state.right?.find((structure) => structure.identifier === "@kraph/todoitem");
    if (!item) {
      throw new Error("Drop the objects onto a todo item.");
    }
    const client = (services.kraph as unknown as { client?: ApolloClient<NormalizedCache> } | undefined)?.client;
    if (!client) {
      throw new Error("Kraph is not available, so there are no todo lists.");
    }
    await client.mutate<AttachToTodoItemMutation, AttachToTodoItemMutationVariables>({
      mutation: AttachToTodoItemDocument,
      variables: {
        input: {
          item: item.id,
          structures: dataOf(state.left).map((structure) => ({ identifier: structure.identifier, object: structure.id })),
        },
      },
      // The card updates from the answer; the Knowledge sidebar and My todos read "items carrying …".
      refetchQueries: ["TodoItems", "TodoTrack", "TodoSummary", "TodoItem", "TodoItemObjects"],
    });
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

/**
 * A word is never deleted — every claim recorded under it names it. Hiding puts
 * it away instead: pickers stop offering it, its claims still stand, and showing
 * it again is the same call. One builder, two actions, because the menu does
 * not know which state a term is in.
 */
const buildSetTermHiddenAction = (hidden: boolean): Action => ({
  title: hidden ? "Hide term" : "Show term",
  description: hidden
    ? "Stop offering this word in pickers. Its claims still stand; it can be shown again"
    : "Offer this hidden word in pickers again",
  icon: hidden ? EyeOff : Eye,
  conditions: [{ type: "identifier", identifier: "@kraph/term" }, { type: "nopartner" }],
  execute: async ({ state, services }) => {
    const client = (services.kraph as unknown as { client: ApolloClient<NormalizedCache> })
      .client;
    if (!client) {
      throw new Error("Kraph service is not available");
    }

    const terms = state.left.filter((term) => term.identifier === "@kraph/term");
    for (const term of terms) {
      await client.mutate({
        mutation: SetTermHiddenDocument,
        variables: { id: String(term.id), hidden },
        refetchQueries: ["ListTerms"],
      });
    }
    const what = terms.length === 1 ? (terms[0].label ?? "the term") : `${terms.length} terms`;
    toast.success(hidden ? `Hid ${what}` : `Showing ${what} again`);
  },
});

const deleteTodoItem = buildDeleteAction<ServiceMap>({
  title: "Delete todo item",
  identifier: "@kraph/todoitem",
  description: "Delete the todo item. The objects on it stay as they are",
  service: "kraph",
  typename: "TodoItem",
  mutation: DeleteTodoItemDocument,
});

/**
 * Delete todo items. The card leaves its board at once (evicted); the lists'
 * Done counts are read again afterwards, as only the server knows them.
 */
export const DeleteTodoItemAction: Action = {
  ...deleteTodoItem,
  execute: async (params) => {
    const result = await deleteTodoItem.execute(params);
    const client = (params.services.kraph as unknown as { client?: ApolloClient<NormalizedCache> }).client;
    await client?.refetchQueries({ include: ["TodoList", "Project", "TodoItems", "TodoTrack", "TodoSummary", "SlimTodoItems"] });
    return result;
  },
};

/**
 * Every object on the selected todo items to Done in one write
 * (`setTodoStructuresStatus`): each item then settles into Done. The cards
 * and chips follow from the answer.
 */
export const MarkTodoItemsDoneAction: Action = {
  title: "Mark all done",
  description: "Tick every object on the item; the item moves to Done",
  icon: Check,
  conditions: [{ type: "identifier", identifier: "@kraph/todoitem" }, { type: "nopartner" }],
  execute: async ({ state, services }) => {
    const client = (services.kraph as unknown as { client?: ApolloClient<NormalizedCache> } | undefined)?.client;
    if (!client) throw new Error("Kraph is not available, so there are no todo lists.");
    const items = await Promise.all(
      state.left.map((item) =>
        client.query<TodoItemQuery, TodoItemQueryVariables>({ query: TodoItemDocument, variables: { id: String(item.id) }, fetchPolicy: "network-only" }),
      ),
    );
    const ids = items.flatMap(({ data }) => data.todoItem.allStructures.filter((structure) => !structure.done).map((structure) => structure.id));
    if (ids.length === 0) return;
    await client.mutate<SetTodoStructuresStatusMutation, SetTodoStructuresStatusMutationVariables>({
      mutation: SetTodoStructuresStatusDocument,
      variables: { ids, status: TodoStatus.Done },
      // Item columns move; the summary and a moved board column are counted on the server.
      refetchQueries: ["TodoList", "TodoSummary", "SlimTodoItems"],
    });
  },
};

/**
 * Who a todo item or list is for and when it is due, as the server holds it:
 * what the "Reassign…" and "Due…" dialogs start from, so pressing Save
 * without touching anything changes nothing. A small read (cache first).
 */
const readAssignment = async (
  services: Parameters<Action["execute"]>[0]["services"],
  kind: "item" | "list",
  id: string,
): Promise<{ assignee?: string | null; dueAt?: string | null }> => {
  const client = (services.kraph as unknown as { client?: ApolloClient<NormalizedCache> } | undefined)?.client;
  if (!client) throw new Error("Kraph is not available, so there are no todo lists.");
  if (kind === "item") {
    const { data } = await client.query<TodoItemAssignmentQuery, TodoItemAssignmentQueryVariables>({ query: TodoItemAssignmentDocument, variables: { id } });
    return data.todoItem;
  }
  const { data } = await client.query<TodoListAssignmentQuery, TodoListAssignmentQueryVariables>({ query: TodoListAssignmentDocument, variables: { id } });
  return data.todoList;
};

/** "Reassign…" on a todo item or list: who it is for, and nothing else. */
const buildReassignAction = (kind: "item" | "list", identifier: string): Action => ({
  title: "Reassign…",
  description: kind === "item" ? "Change who the item is for" : "Change who the list is for",
  icon: UserRoundPen,
  conditions: [{ type: "identifier", identifier }, { type: "nopartner" }],
  execute: async ({ state, dialog, services }) => {
    const target = state.left.at(0);
    if (!target) throw new Error(`Pick a todo ${kind} to reassign.`);
    const { assignee } = await readAssignment(services, kind, String(target.id));
    dialog.openDialog("assigntodo", { kind, id: String(target.id), current: assignee ?? null });
  },
});

/** "Due…" on a todo item or list: when it is due, and nothing else. */
const buildScheduleAction = (kind: "item" | "list", identifier: string): Action => ({
  title: "Due…",
  description: kind === "item" ? "Change when the item is due" : "Change when the list is due",
  icon: CalendarClock,
  conditions: [{ type: "identifier", identifier }, { type: "nopartner" }],
  execute: async ({ state, dialog, services }) => {
    const target = state.left.at(0);
    if (!target) throw new Error(`Pick a todo ${kind} to schedule.`);
    const { dueAt } = await readAssignment(services, kind, String(target.id));
    dialog.openDialog("scheduletodo", { kind, id: String(target.id), current: dueAt ?? null });
  },
});

/** Past the end of any column: the server puts the card last. */
const COLUMN_END = 1_000_000;

/**
 * "Move to To do / Doing / Done" for todo items: the board's drag, from the
 * keyboard, the context menu and the ObjectButton. The card goes last in its
 * new column. Moving a card ticks nothing; its objects keep their own status.
 */
const buildMoveTodoItemAction = (status: TodoStatus, title: string, icon: Action["icon"]): Action => ({
  title,
  description: `Move the item to the ${title.replace("Move to ", "")} column`,
  icon,
  conditions: [{ type: "identifier", identifier: "@kraph/todoitem" }, { type: "nopartner" }],
  execute: async ({ state, services }) => {
    const client = (services.kraph as unknown as { client?: ApolloClient<NormalizedCache> } | undefined)?.client;
    if (!client) throw new Error("Kraph is not available, so there are no todo lists.");
    for (const item of state.left) {
      await client.mutate<MoveTodoItemMutation, MoveTodoItemMutationVariables>({
        mutation: MoveTodoItemDocument,
        variables: { input: { id: String(item.id), status, index: COLUMN_END } },
      });
    }
    // The other cards of the column were renumbered on the server.
    await client.refetchQueries({ include: ["TodoList", "TodoItems", "TodoSummary", "SlimTodoItems", "TodoTrack"] });
  },
});

/** Rename a project or change its description. */
export const EditProjectAction: Action = {
  title: "Edit project…",
  description: "Rename the project or change its description",
  icon: Pencil,
  conditions: [{ type: "identifier", identifier: "@kraph/project" }, { type: "nopartner" }],
  execute: async ({ state, dialog }) => {
    const project = state.left.at(0);
    if (!project) throw new Error("Pick a project to edit.");
    dialog.openDialog("editkraphproject", { id: String(project.id) }, { size: "medium" });
  },
};

export const KRAPH_ACTIONS = {
  "edit-kraph-project": EditProjectAction,
  "delete-kraph-todoitem": DeleteTodoItemAction,
  "mark-kraph-todoitems-done": MarkTodoItemsDoneAction,
  "reassign-kraph-todoitem": buildReassignAction("item", "@kraph/todoitem"),
  "reassign-kraph-todolist": buildReassignAction("list", "@kraph/todolist"),
  "schedule-kraph-todoitem": buildScheduleAction("item", "@kraph/todoitem"),
  "schedule-kraph-todolist": buildScheduleAction("list", "@kraph/todolist"),
  "move-kraph-todoitem-todo": buildMoveTodoItemAction(TodoStatus.Todo, "Move to To do", Circle),
  "move-kraph-todoitem-doing": buildMoveTodoItemAction(TodoStatus.Doing, "Move to Doing", Play),
  "move-kraph-todoitem-done": buildMoveTodoItemAction(TodoStatus.Done, "Move to Done", CheckCheck),
  "add-to-todo": AddToTodoAction,
  "attach-to-todo-item": AttachToTodoItemAction,
  "create-new-entity": NewEntityAction,
  "link-structure-to-entity": LinkStructureToEntityAction,
  "measure-term": MeasureTermAction,
  "same-datum": SameAsDatumAction,
  "attest-node": AttestNodeAction,
  "retract-links": RetractLinksAction,
  "hide-term": buildSetTermHiddenAction(true),
  "show-term": buildSetTermHiddenAction(false),
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
        { size: "large" },
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
