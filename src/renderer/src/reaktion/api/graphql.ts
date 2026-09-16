import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/lib/fluss/hooks';
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
  /** The `AnyDefault` scalar is any JSON value used as a port default or a choice value; the server checks it against the port's kind */
  AnyDefault: { input: any; output: any; }
  /** The `Arg` scalar type represents a an Argument in a Action assignment */
  Arg: { input: any; output: any; }
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  /** The JSON-serializable payload carried by a run event. */
  EventValue: { input: any; output: any; }
  /** The `Identifier` scalar is a structure identifier of the form `@package/key` (e.g. `@mikro/image`) that types STRUCTURE, MEMORY_STRUCTURE and INTERFACE ports */
  Identifier: { input: any; output: any; }
  /** The `JSONSerializable` scalar type represents a JSON-serializable value. */
  JSONSerializable: { input: any; output: any; }
  /** The `SearchQuery` scalar is a GraphQL query string a search widget executes against its ward to populate its choices */
  SearchQuery: { input: any; output: any; }
  /** A JSON-serializable map of port keys to arbitrary values. */
  ValueMap: { input: any; output: any; }
  _Any: { input: any; output: any; }
};

/** A JSON-serializable argument entry for a multi-agent action trigger. */
export type ActionArgument = {
  __typename?: 'ActionArgument';
  agentCall?: Maybe<AgentCall>;
  key?: Maybe<Scalars['String']['output']>;
  utilCall?: Maybe<UtilCall>;
  valueDict?: Maybe<Array<ActionArgument>>;
  valueList?: Maybe<Array<ActionArgument>>;
  valueLiteral?: Maybe<Scalars['JSONSerializable']['output']>;
  valuePath?: Maybe<Scalars['String']['output']>;
};

/** A JSON-serializable argument entry for a multi-agent action trigger. */
export type ActionArgumentInput = {
  /** Defines a nested agent call if this argument should trigger an agent interaction. */
  agentCall?: InputMaybe<AgentProbeInput>;
  /** The argument property name. */
  key?: InputMaybe<Scalars['String']['input']>;
  /** Defines a nested utility call if this argument should trigger a system utility interaction. */
  utilCall?: InputMaybe<UtilCallInput>;
  /** Defines a list of key-value pairs if this argument should be a dictionary. */
  valueDict?: InputMaybe<Array<ActionArgumentInput>>;
  /** Defines a list of values if this argument should be an array. */
  valueList?: InputMaybe<Array<ActionArgumentInput>>;
  /** Static literal value if not dynamically bound. */
  valueLiteral?: InputMaybe<Scalars['JSONSerializable']['input']>;
  /** JSON Pointer referencing the shared Blok state to inject into this argument slot dynamically. */
  valuePath?: InputMaybe<Scalars['String']['input']>;
};

/** The kind of action. */
export enum ActionKind {
  Function = 'FUNCTION',
  Generator = 'GENERATOR'
}

/** Defines a callback that routes user interactions directly to an Arkitekt Agent via Rekuest. */
export type AgentCall = {
  __typename?: 'AgentCall';
  arguments?: Maybe<Array<ActionArgument>>;
  dependency: Scalars['String']['output'];
  operation: Scalars['String']['output'];
};

/** Defines a callback that routes user interactions directly to an Arkitekt Agent via Rekuest. */
export type AgentProbeInput = {
  /** Key-value arguments map compiled for the target agent call. */
  arguments?: InputMaybe<Array<ActionArgumentInput>>;
  /** The abstract agent dependency key declared in the Blok manifest (e.g., 'stage_dep'). */
  dependency: Scalars['String']['input'];
  /** The target function name registered on that specific agent's worker thread loop. */
  operation: Scalars['String']['input'];
};

/** A node that delegates a sub-flow to an agent selected by the app / version / device / user / instance filters, optionally auto-resolving the matching agent. */
export type AgentSubFlowNode = GraphNode & {
  __typename?: 'AgentSubFlowNode';
  /** Restrict the agent to a specific app. */
  appFilter?: Maybe<Scalars['String']['output']>;
  /** Whether this dependency is auto resolvable. If so the system will try to automatically resolve a matching agent based on the demands of the dependency and the capabilities of available agents. */
  autoResolvable: Scalars['Boolean']['output'];
  /** The constant ports configured on the node. */
  constants: Array<ArgPort>;
  /** A map of constant port keys to their configured values. */
  constantsMap: Scalars['ValueMap']['output'];
  /** A human-readable description of what the node does. */
  description?: Maybe<Scalars['String']['output']>;
  /** Restrict the agent to a specific device. */
  deviceFilter?: Maybe<Scalars['String']['output']>;
  /** A map of global argument keys to the node port keys they feed. */
  globalsMap: Scalars['ValueMap']['output'];
  /** The id of the node, unique within the graph. */
  id: Scalars['ID']['output'];
  /** The input port streams the node consumes (a list of streams, each a list of ports). */
  ins: Array<Array<ArgPort>>;
  /** Restrict the agent to a specific instance. */
  instanceFilter?: Maybe<Scalars['String']['output']>;
  /** The kind of node, discriminating the concrete node type. */
  kind: GraphNodeKind;
  /** The output port streams the node produces (a list of streams, each a list of ports). */
  outs: Array<Array<ReturnPort>>;
  /** The id of the parent node, if this node is nested inside another. */
  parentNode?: Maybe<Scalars['String']['output']>;
  /** The position of the node on the editor canvas. */
  position: Position;
  /** A human-readable title for the node. */
  title?: Maybe<Scalars['String']['output']>;
  /** Restrict the agent to one owned by a specific user. */
  userFilter?: Maybe<Scalars['String']['output']>;
  /** Restrict the agent to a specific app version. */
  versionFilter?: Maybe<Scalars['String']['output']>;
  /** The void ports of the node (neither streamed in nor out). */
  voids: Array<ArgPort>;
};

/** The entry node of a flow: it provides the flow's arguments as the initial output stream. */
export type ArgNode = GraphNode & {
  __typename?: 'ArgNode';
  /** A placeholder field specific to the args node. */
  argStuff?: Maybe<Scalars['String']['output']>;
  /** The constant ports configured on the node. */
  constants: Array<ArgPort>;
  /** A map of constant port keys to their configured values. */
  constantsMap: Scalars['ValueMap']['output'];
  /** A human-readable description of what the node does. */
  description?: Maybe<Scalars['String']['output']>;
  /** A map of global argument keys to the node port keys they feed. */
  globalsMap: Scalars['ValueMap']['output'];
  /** The id of the node, unique within the graph. */
  id: Scalars['ID']['output'];
  /** The input port streams the node consumes (a list of streams, each a list of ports). */
  ins: Array<Array<ArgPort>>;
  /** The kind of node, discriminating the concrete node type. */
  kind: GraphNodeKind;
  /** The output port streams the node produces (a list of streams, each a list of ports). */
  outs: Array<Array<ReturnPort>>;
  /** The id of the parent node, if this node is nested inside another. */
  parentNode?: Maybe<Scalars['String']['output']>;
  /** The position of the node on the editor canvas. */
  position: Position;
  /** A human-readable title for the node. */
  title?: Maybe<Scalars['String']['output']>;
  /** The void ports of the node (neither streamed in nor out). */
  voids: Array<ArgPort>;
};

export type ArgPort = {
  __typename?: 'ArgPort';
  children?: Maybe<Array<ArgPort>>;
  choices?: Maybe<Array<Choice>>;
  default?: Maybe<Scalars['AnyDefault']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  dimension?: Maybe<Scalars['String']['output']>;
  effects?: Maybe<Array<Effect>>;
  identifier?: Maybe<Scalars['Identifier']['output']>;
  key: Scalars['String']['output'];
  kind: PortKind;
  label?: Maybe<Scalars['String']['output']>;
  nullable: Scalars['Boolean']['output'];
  proposedUnits?: Maybe<Array<Scalars['String']['output']>>;
  referenceUnit?: Maybe<Scalars['String']['output']>;
  requires?: Maybe<Array<Requires>>;
  validators?: Maybe<Array<Validator>>;
  widget?: Maybe<AssignWidget>;
};

/**
 * A Port is a single input or output of an action, identified by its `key` and typed by its `kind`.
 *
 *     STRUCTURE, MEMORY_STRUCTURE and INTERFACE ports carry an `identifier` of the form `@package/key`
 *     (e.g. `@mikro/image`); ports with the same identifier are compatible. LIST and DICT ports have one
 *     child (the item type), UNION ports two or more (the variants), MODEL ports one per field. ENUM ports
 *     declare `choices`. See docs/design/ports.md for the full table.
 *
 */
export type ArgPortInput = {
  /** The child ports (used for list, dict, union and model ports). */
  children?: InputMaybe<Array<ArgPortInput>>;
  /** The values the port accepts (required for ENUM; optional for INT, FLOAT, STRING). Rendered by CHOICE widgets. */
  choices?: InputMaybe<Array<ChoiceInput>>;
  /** The default value for the port; must fit the port's kind. */
  default?: InputMaybe<Scalars['AnyDefault']['input']>;
  /** The description of the port. This is the text that is displayed in the UI when the user hovers over the port */
  description?: InputMaybe<Scalars['String']['input']>;
  /** For QUANTITY ports: the pint dimensionality string, e.g. "[mass] * [length] ** 2 / [time] ** 3 / [current]". This is the wiring-compatibility key between quantity ports. */
  dimension?: InputMaybe<Scalars['String']['input']>;
  /** The effects of the port */
  effects?: InputMaybe<Array<EffectInput>>;
  /** The identifier of a structure port. This is used to uniquely identify a specific type of structure. */
  identifier?: InputMaybe<Scalars['String']['input']>;
  /** The key of the port: unique among its siblings, free of '..', not 'value'. LIST/DICT item ports are conventionally keyed '...'. */
  key: Scalars['String']['input'];
  /** The kind of the port. This is the type of the port. Can be either int, string, structure, list, bool, dict, float, date, union or model */
  kind: PortKind;
  /** The label of the port. This is the text that is displayed in the UI */
  label?: InputMaybe<Scalars['String']['input']>;
  /** Whether the port is nullable or not. If the port is nullable, it can be set to null. If the port is not nullable, it cannot be set to null */
  nullable?: Scalars['Boolean']['input'];
  /** For QUANTITY ports: units offered as a dropdown in the UI, e.g. ["pF", "nF", "uF"]. Proposals only — any unit of the same dimension remains valid input. */
  proposedUnits?: InputMaybe<Array<Scalars['String']['input']>>;
  /** For QUANTITY ports: the canonical/reference unit of the physical quantity, e.g. "volt" or "farad". It is the default selection and the key used to resolve the concrete quantity type; other units of the same dimension are still allowed. */
  referenceUnit?: InputMaybe<Scalars['String']['input']>;
  /** The descriptors for the port. Descriptors are key-value pairs that can be used to add additional metadata to a port. When using rekuest's action search, you can filter actions based on their port descriptors */
  requires?: InputMaybe<Array<RequiresInput>>;
  /** The validators for the port */
  validators?: InputMaybe<Array<ValidatorInput>>;
  /** The assign widget to use for this port, discriminated by `kind`. */
  widget?: InputMaybe<AssignWidgetInput>;
};

export type AssignWidget = {
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
};

/** An assign widget: the UI element used to assign a value to a port, as a discriminated union over `kind`. Only the fields of the chosen kind may be set; see the `*AssignWidgetInput` members. */
export type AssignWidgetInput = {
  /** (STRING) Render as a multi-line paragraph. */
  asParagraph?: InputMaybe<Scalars['Boolean']['input']>;
  /** (CUSTOM) The catalog component to render. The port value is in scope as the reserved root `value`. */
  component?: InputMaybe<Scalars['String']['input']>;
  /** (SEARCH, CUSTOM, STATE_CHOICE) The other ports (port paths, `..` traverses children) whose values the query may reference. */
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  /** (STATE_CHOICE) The agent dependency (by key) whose state provides the choices; omitted: the implementing agent's own state. */
  dependency?: InputMaybe<Scalars['String']['input']>;
  /** (CUSTOM) Widget to render when the UI has no such component in its catalog. */
  fallback?: InputMaybe<AssignWidgetInput>;
  /** (SEARCH) Filter ports whose values are passed to the query as variables named by their keys. */
  filters?: InputMaybe<Array<ArgPortInput>>;
  /** (SLIDER, CHOICE, STRING, SEARCH, CUSTOM, STATE_CHOICE, PROXY) Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which kind of assign widget this is; decides which other fields are read. */
  kind: AssignWidgetKind;
  /** (SLIDER) The maximum value. */
  max?: InputMaybe<Scalars['Float']['input']>;
  /** (SLIDER) The minimum value. */
  min?: InputMaybe<Scalars['Float']['input']>;
  /** (CHOICE, STRING, SEARCH) The placeholder text shown before a choice is made. The choices themselves are the port's `choices`. */
  placeholder?: InputMaybe<Scalars['String']['input']>;
  /** (CUSTOM) Props of the component. value_paths may only reference `value` and `dependencies`; agent calls are not allowed. */
  props?: InputMaybe<Array<ComponentPropInput>>;
  /** (SEARCH) The GraphQL query the ward executes to populate the choices. Must be a single `query` operation declaring `$search: String` and `$values: [ID!]`, plus one variable per filter port key. */
  query?: InputMaybe<Scalars['SearchQuery']['input']>;
  /** (STATE_CHOICE) How to read label/description/logo/value out of each state entry; each accessor is a static pointer or a pure call. */
  stateAccessors?: InputMaybe<Array<StateAccessorInput>>;
  /** (STATE_CHOICE) Pure UtilCall returning that pointer dynamically; may reference `state`, `value` and `dependencies`. Mutually exclusive with `state_path`. */
  stateCall?: InputMaybe<UtilCallInput>;
  /** (STATE_CHOICE) Static JSON pointer into the state value that provides the choices. Mutually exclusive with `state_call`. */
  statePath?: InputMaybe<Scalars['String']['input']>;
  /** (SLIDER) The step between selectable values; must be positive. */
  step?: InputMaybe<Scalars['Float']['input']>;
  /** (PROXY) The action to target: an action-dependency key of `target_dependency` when that is set. */
  targetAction?: InputMaybe<Scalars['String']['input']>;
  /** (PROXY) The agent dependency (by key) that provides the targeted action; omitted: the implementing agent itself. */
  targetDependency?: InputMaybe<Scalars['String']['input']>;
  /** (PROXY) The port key on the targeted action. */
  targetPort?: InputMaybe<Scalars['String']['input']>;
  /** (SEARCH) The ward (service) that executes the query. */
  ward?: InputMaybe<Scalars['String']['input']>;
};

/** The kind of assign widget. */
export enum AssignWidgetKind {
  Choice = 'CHOICE',
  Custom = 'CUSTOM',
  Proxy = 'PROXY',
  Search = 'SEARCH',
  Slider = 'SLIDER',
  StateChoice = 'STATE_CHOICE',
  String = 'STRING'
}

/** Interface for nodes that assign work to an agent, carrying the assignment timeout. */
export type AssignableNode = {
  /** The timeout in milliseconds to wait for the assigned work before failing. */
  nextTimeout?: Maybe<Scalars['Int']['output']>;
};

export type Choice = {
  __typename?: 'Choice';
  description?: Maybe<Scalars['String']['output']>;
  image?: Maybe<Scalars['String']['output']>;
  label: Scalars['String']['output'];
  value: Scalars['AnyDefault']['output'];
};

/** A dropdown over the port's own `choices`. */
export type ChoiceAssignWidget = AssignWidget & {
  __typename?: 'ChoiceAssignWidget';
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  placeholder?: Maybe<Scalars['String']['output']>;
};

/** A dropdown over the port's `choices`. */
export type ChoiceAssignWidgetInput = {
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** The placeholder text shown before a choice is made. The choices themselves are the port's `choices`. */
  placeholder?: InputMaybe<Scalars['String']['input']>;
};

/**
 *
 * A choice is a value that can be selected in a dropdown.
 *
 * It is composed of a value, a label, and a description. The value is the
 * value that is returned when the choice is selected. The label is the
 * text that is displayed in the dropdown. The description is the text
 * that is displayed when the user hovers over the choice.
 *
 *
 */
export type ChoiceInput = {
  /** The description of the choice. This is the text that is displayed in the UI when the user hovers over the choice */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The image of the choice. This is the image that is displayed in the UI (must be a URL) */
  image?: InputMaybe<Scalars['String']['input']>;
  /** The label of the choice. This is the text that is displayed in the UI */
  label: Scalars['String']['input'];
  /** The value of the choice (any JSON value); must fit the port's kind. This is the value that is returned when the choice is selected */
  value: Scalars['AnyDefault']['input'];
};

/** Displays the label of the port's own `choices` for a returned value. */
export type ChoiceReturnWidget = ReturnWidget & {
  __typename?: 'ChoiceReturnWidget';
  kind: ReturnWidgetKind;
};

/** Displays the port's `choices` label for a returned value. */
export type ChoiceReturnWidgetInput = {
  /** Which member of ReturnWidgetInput this is. Displays the port's `choices`. */
  kind: ReturnWidgetKind;
};

export type CloseRunInput = {
  run: Scalars['ID']['input'];
};

/** A single key-value prop configuration for a component layout node. */
export type ComponentProp = {
  __typename?: 'ComponentProp';
  agentCall?: Maybe<AgentCall>;
  declaresValue?: Maybe<Scalars['String']['output']>;
  dynamicValue?: Maybe<DynamicValue>;
  key: Scalars['String']['output'];
  staticValue?: Maybe<Scalars['JSONSerializable']['output']>;
  utilCall?: Maybe<UtilCall>;
};

/** A single key-value prop configuration for a component layout node. */
export type ComponentPropInput = {
  /** Defines an imperative interactive network action callback loop if this prop should trigger an agent interaction. */
  agentCall?: InputMaybe<AgentProbeInput>;
  /** If set, this prop declares a new 'value' in the Blok state that can be referenced by other props or actions. The value of this field should be the name of the declared value (e.g., 'selected_user'). */
  declaresValue?: InputMaybe<Scalars['String']['input']>;
  /** A reactive state data-binding rule. */
  dynamicValue?: InputMaybe<DynamicValueInput>;
  /** The prop key name matching the target UI catalog constraint. */
  key: Scalars['String']['input'];
  /** A raw scalar or JSON-stringified literal configuration parameter (e.g. '40x' or True). */
  staticValue?: InputMaybe<Scalars['JSONSerializable']['input']>;
  /** Defines an imperative interactive network action callback loop if this prop should trigger a system utility interaction. */
  utilCall?: InputMaybe<UtilCallInput>;
};

export type CreateRunInput = {
  flow: Scalars['ID']['input'];
  snapshotInterval: Scalars['Int']['input'];
  taskId: Scalars['ID']['input'];
};

export type CreateWorkspaceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  graph?: InputMaybe<GraphInput>;
  title?: InputMaybe<Scalars['String']['input']>;
  vanilla?: Scalars['Boolean']['input'];
};

/** A catalog component rendered as the port's widget. */
export type CustomAssignWidget = AssignWidget & {
  __typename?: 'CustomAssignWidget';
  component: Scalars['String']['output'];
  dependencies?: Maybe<Array<Scalars['String']['output']>>;
  fallback?: Maybe<AssignWidget>;
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  props?: Maybe<Array<ComponentProp>>;
};

/** A catalog component rendered as the port's widget. */
export type CustomAssignWidgetInput = {
  /** The catalog component to render. The port value is in scope as the reserved root `value`. */
  component: Scalars['String']['input'];
  /** The other ports (port paths, `..` traverses children) whose values the props may reference. */
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Widget to render when the UI has no such component in its catalog. */
  fallback?: InputMaybe<AssignWidgetInput>;
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** Props of the component. value_paths may only reference `value` and `dependencies`; agent calls are not allowed. */
  props?: InputMaybe<Array<ComponentPropInput>>;
};

/** An effect whose behaviour is entirely defined by its call. */
export type CustomEffect = Effect & {
  __typename?: 'CustomEffect';
  call: UtilCall;
  /** The full call tree as raw JSON, so deep trees are not truncated by fragment depth. */
  callJson: Scalars['JSONSerializable']['output'];
  dependencies: Array<Scalars['String']['output']>;
  kind: EffectKind;
  source?: Maybe<Scalars['String']['output']>;
};

/** A catalog component rendered for a returned value. */
export type CustomReturnWidget = ReturnWidget & {
  __typename?: 'CustomReturnWidget';
  component: Scalars['String']['output'];
  kind: ReturnWidgetKind;
  props?: Maybe<Array<ComponentProp>>;
};

/** A catalog component rendered for a returned value. */
export type CustomReturnWidgetInput = {
  /** The catalog component to render. The returned value is in scope as the reserved root `value`. */
  component: Scalars['String']['input'];
  /** Which member of ReturnWidgetInput this is. */
  kind: ReturnWidgetKind;
  /** Props of the component; value_paths may only reference `value`, agent calls are not allowed. */
  props?: InputMaybe<Array<ComponentPropInput>>;
};

export type DeleteRunInput = {
  run: Scalars['ID']['input'];
};

export type DeleteSnapshotInput = {
  snapshot: Scalars['ID']['input'];
};

/** The operator of a requires/provides descriptor: how a port's constraint compares the object's value at `key` with `value`. */
export enum DescriptorOperator {
  Contains = 'CONTAINS',
  Equals = 'EQUALS',
  Exists = 'EXISTS',
  Gte = 'GTE',
  In = 'IN',
  Lte = 'LTE',
  Matches = 'MATCHES',
  NotEquals = 'NOT_EQUALS',
  NotIn = 'NOT_IN'
}

/** A bound state pointer referencing a variable inside a Blok state instance. */
export type DynamicValue = {
  __typename?: 'DynamicValue';
  literal?: Maybe<Scalars['String']['output']>;
  path?: Maybe<Scalars['String']['output']>;
};

/** A bound state pointer referencing a variable inside a Blok state instance. */
export type DynamicValueInput = {
  /** A static fallback literal value (serialized string or JSON primitive) used when `path` does not resolve. */
  literal?: InputMaybe<Scalars['String']['input']>;
  /** JSON Pointer to a variable inside the Blok's isolated data model (e.g., '/microscope/exposure'). */
  path?: InputMaybe<Scalars['String']['input']>;
};

export type Effect = {
  call: UtilCall;
  /** The full call tree as raw JSON, so deep trees are not truncated by fragment depth. */
  callJson: Scalars['JSONSerializable']['output'];
  dependencies: Array<Scalars['String']['output']>;
  kind: EffectKind;
  source?: Maybe<Scalars['String']['output']>;
};

/**
 *
 *     An effect is a way to modify a port based on a condition. For example,
 *     you could have an effect that hides the port if another port meets a condition,
 *     e.g. when the user selects a certain option in a dropdown, another port is hidden.
 *
 *     The condition is a pure blok UtilCall (`call`) evaluated client-side against the
 *     catalog; it must return a boolean deciding whether the effect applies. `dependencies`
 *     is the authoritative list of other ports the call may reference (plus `value` for the
 *     port's own value).
 *
 */
export type EffectInput = {
  /** The pure blok UtilCall, evaluated client-side against the catalog, that decides whether the effect applies. It must return a boolean. Argument value_paths may only reference names listed in `dependencies`, plus `value` for the port's own value. */
  call: UtilCallInput;
  /** The form-field subscription list of the effect: the keys of the other ports whose values the call may reference. This list is authoritative: a value_path in the call may only reference these names (plus `value` for the port's own value). Use the .. syntax to traverse the tree of ports, e.g. 'foo..bar' for the child 'bar' of port 'foo'. */
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Whether to fade out the port when the effect is applied (if it is a hide effect) */
  fade?: InputMaybe<Scalars['Boolean']['input']>;
  /** The kind of the effect. Can be either message, hide or custom */
  kind: EffectKind;
  /** The message to display when the effect is applied (if it is a message effect) */
  message?: InputMaybe<Scalars['String']['input']>;
  /** The authoring expression the call was compiled from (informational; never parsed or validated by the server). */
  source?: InputMaybe<Scalars['String']['input']>;
};

/** The kind of effect. */
export enum EffectKind {
  Custom = 'CUSTOM',
  Hide = 'HIDE',
  Message = 'MESSAGE'
}

/** A Flow is a versioned, executable graph of nodes and edges that lives inside a Workspace. It is the concrete definition that Runs (live executions) and Traces (dry runs) are created from. Flows with the same graph hash within a workspace are deduplicated. */
export type Flow = {
  __typename?: 'Flow';
  /** The time at which the flow was created. */
  createdAt: Scalars['DateTime']['output'];
  /** An optional longer description of what the flow does. */
  description?: Maybe<Scalars['String']['output']>;
  /** The full node-and-edge graph (nodes, edges and globals) that defines the flow. */
  graph: Graph;
  /** A content hash of the graph, used to deduplicate identical flows within a workspace. */
  hash: Scalars['String']['output'];
  /** The unique identifier of the flow. */
  id: Scalars['ID']['output'];
  /** A human-readable title for the flow. */
  title: Scalars['String']['output'];
  /** The workspace this flow belongs to. */
  workspace: Workspace;
};

export type FlowFilter = {
  AND?: InputMaybe<FlowFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<FlowFilter>;
  OR?: InputMaybe<FlowFilter>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by a list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by whether the current user has pinned the item */
  pinned?: InputMaybe<Scalars['Boolean']['input']>;
  /** Search by title (case-insensitive substring) */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type FlowOrder =
  { createdAt: Ordering; id?: never; title?: never; }
  |  { createdAt?: never; id: Ordering; title?: never; }
  |  { createdAt?: never; id?: never; title: Ordering; };

/** A graph-level global argument: a named port whose value is shared across the whole flow. */
export type GlobalArg = {
  __typename?: 'GlobalArg';
  /** The key identifying this global argument within the graph. */
  key: Scalars['String']['output'];
  /** The argument port describing the type and widget of the global value. */
  port: ArgPort;
};

export type GlobalArgInput = {
  key: Scalars['String']['input'];
  port: ArgPortInput;
};

export enum Granularity {
  Day = 'DAY',
  Hour = 'HOUR',
  Month = 'MONTH',
  Quarter = 'QUARTER',
  Week = 'WEEK',
  Year = 'YEAR'
}

/** The full definition of a flow: its nodes, the edges connecting them, the graph-level global arguments and the editor zoom level. This is the serialized form stored on a Flow. */
export type Graph = {
  __typename?: 'Graph';
  /** All edges connecting the nodes in the graph. */
  edges: Array<GraphEdge>;
  /** The graph-level global arguments shared across nodes. */
  globals: Array<GlobalArg>;
  /** All nodes in the graph. */
  nodes: Array<GraphNode>;
  /** The zoom level of the flow editor when the graph was saved. */
  zoom: Scalars['Float']['output'];
};

/** An edge connecting a source node handle to a target node handle in a flow graph. The common interface for all edge kinds, carrying the stream of items that flow across it. */
export type GraphEdge = {
  /** The id of the edge, unique within the graph. */
  id: Scalars['ID']['output'];
  /** The kind of edge, discriminating the concrete edge type (VANILLA or LOGGING). */
  kind: GraphEdgeKind;
  /** The id of the source node. */
  source: Scalars['String']['output'];
  /** The handle (port) on the source node the edge leaves from. */
  sourceHandle: Scalars['String']['output'];
  /** The ordered items (the shape of the data) that flow across this edge. */
  stream: Array<StreamItem>;
  /** The id of the target node. */
  target: Scalars['String']['output'];
  /** The handle (port) on the target node the edge arrives at. */
  targetHandle: Scalars['String']['output'];
};

export type GraphEdgeInput = {
  id: Scalars['String']['input'];
  kind: GraphEdgeKind;
  label?: InputMaybe<Scalars['String']['input']>;
  level?: InputMaybe<Scalars['String']['input']>;
  source: Scalars['String']['input'];
  sourceHandle: Scalars['String']['input'];
  stream: Array<StreamItemInput>;
  target: Scalars['String']['input'];
  targetHandle: Scalars['String']['input'];
};

export enum GraphEdgeKind {
  Logging = 'LOGGING',
  Vanilla = 'VANILLA'
}

export type GraphInput = {
  edges: Array<GraphEdgeInput>;
  globals: Array<GlobalArgInput>;
  nodes: Array<GraphNodeInput>;
};

/** A node in a flow graph. This is the common interface implemented by every concrete node kind (args, returns, reactive, rekuest map/filter, agent subflow), carrying its id, kind, canvas position and port streams. */
export type GraphNode = {
  /** The constant ports configured on the node. */
  constants: Array<ArgPort>;
  /** A map of constant port keys to their configured values. */
  constantsMap: Scalars['ValueMap']['output'];
  /** A human-readable description of what the node does. */
  description?: Maybe<Scalars['String']['output']>;
  /** A map of global argument keys to the node port keys they feed. */
  globalsMap: Scalars['ValueMap']['output'];
  /** The id of the node, unique within the graph. */
  id: Scalars['ID']['output'];
  /** The input port streams the node consumes (a list of streams, each a list of ports). */
  ins: Array<Array<ArgPort>>;
  /** The kind of node, discriminating the concrete node type. */
  kind: GraphNodeKind;
  /** The output port streams the node produces (a list of streams, each a list of ports). */
  outs: Array<Array<ReturnPort>>;
  /** The id of the parent node, if this node is nested inside another. */
  parentNode?: Maybe<Scalars['String']['output']>;
  /** The position of the node on the editor canvas. */
  position: Position;
  /** A human-readable title for the node. */
  title?: Maybe<Scalars['String']['output']>;
  /** The void ports of the node (neither streamed in nor out). */
  voids: Array<ArgPort>;
};

export type GraphNodeInput = {
  actionKind?: InputMaybe<ActionKind>;
  allowLocalExecution?: InputMaybe<Scalars['Boolean']['input']>;
  appFilter?: InputMaybe<Scalars['String']['input']>;
  autoResolvable?: Scalars['Boolean']['input'];
  constants?: InputMaybe<Array<ArgPortInput>>;
  constantsMap?: InputMaybe<Scalars['ValueMap']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  deviceFilter?: InputMaybe<Scalars['String']['input']>;
  globalsMap?: InputMaybe<Scalars['ValueMap']['input']>;
  hash?: InputMaybe<Scalars['String']['input']>;
  hello?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['String']['input'];
  implementation?: InputMaybe<ReactiveImplementation>;
  ins?: InputMaybe<Array<Array<ArgPortInput>>>;
  instanceFilter?: InputMaybe<Scalars['String']['input']>;
  kind: GraphNodeKind;
  mapStrategy?: InputMaybe<MapStrategy>;
  nextTimeout?: InputMaybe<Scalars['Int']['input']>;
  outs?: InputMaybe<Array<Array<ReturnPortInput>>>;
  parentNode?: InputMaybe<Scalars['String']['input']>;
  path?: InputMaybe<Scalars['String']['input']>;
  position: PositionInput;
  retries?: InputMaybe<Scalars['Int']['input']>;
  retryDelay?: InputMaybe<Scalars['Int']['input']>;
  title?: InputMaybe<Scalars['String']['input']>;
  userFilter?: InputMaybe<Scalars['String']['input']>;
  versionFilter?: InputMaybe<Scalars['String']['input']>;
  voids?: InputMaybe<Array<ArgPortInput>>;
};

export enum GraphNodeKind {
  AgentSubflow = 'AGENT_SUBFLOW',
  Args = 'ARGS',
  Reactive = 'REACTIVE',
  Rekuest = 'REKUEST',
  RekuestFilter = 'REKUEST_FILTER',
  Returns = 'RETURNS'
}

export type HideEffect = Effect & {
  __typename?: 'HideEffect';
  call: UtilCall;
  /** The full call tree as raw JSON, so deep trees are not truncated by fragment depth. */
  callJson: Scalars['JSONSerializable']['output'];
  dependencies: Array<Scalars['String']['output']>;
  fade: Scalars['Boolean']['output'];
  kind: EffectKind;
  source?: Maybe<Scalars['String']['output']>;
};

/** An edge that, in addition to streaming items, logs them at the configured level for debugging. */
export type LoggingEdge = GraphEdge & {
  __typename?: 'LoggingEdge';
  /** The id of the edge, unique within the graph. */
  id: Scalars['ID']['output'];
  /** The kind of edge, discriminating the concrete edge type (VANILLA or LOGGING). */
  kind: GraphEdgeKind;
  /** The log level at which items crossing this edge are logged. */
  level: Scalars['String']['output'];
  /** The id of the source node. */
  source: Scalars['String']['output'];
  /** The handle (port) on the source node the edge leaves from. */
  sourceHandle: Scalars['String']['output'];
  /** The ordered items (the shape of the data) that flow across this edge. */
  stream: Array<StreamItem>;
  /** The id of the target node. */
  target: Scalars['String']['output'];
  /** The handle (port) on the target node the edge arrives at. */
  targetHandle: Scalars['String']['output'];
};

export enum MapStrategy {
  Map = 'MAP',
  MapFrom = 'MAP_FROM',
  MapTo = 'MAP_TO'
}

export type MessageEffect = Effect & {
  __typename?: 'MessageEffect';
  call: UtilCall;
  /** The full call tree as raw JSON, so deep trees are not truncated by fragment depth. */
  callJson: Scalars['JSONSerializable']['output'];
  dependencies: Array<Scalars['String']['output']>;
  kind: EffectKind;
  message: Scalars['String']['output'];
  source?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Mark a run as COMPLETED. */
  closeRun: Run;
  /** Start (or reuse) a run of a flow for a given task. */
  createRun: Run;
  /** Create a new workspace, seeded with an initial flow. */
  createWorkspace: Workspace;
  /** Delete a run and its events and snapshots. */
  deleteRun: Scalars['ID']['output'];
  /** Delete a run snapshot. */
  deleteSnapshot: Scalars['ID']['output'];
  /** Capture a state snapshot of a run at a logical time. */
  snapshot: Snapshot;
  /** Record a single run event (a value, error or completion) for a run. */
  track: RunEvent;
  /** Update a workspace's metadata and upsert the flow for the posted graph. */
  updateWorkspace: Workspace;
};


export type MutationCloseRunArgs = {
  input: CloseRunInput;
};


export type MutationCreateRunArgs = {
  input: CreateRunInput;
};


export type MutationCreateWorkspaceArgs = {
  input: CreateWorkspaceInput;
};


export type MutationDeleteRunArgs = {
  input: DeleteRunInput;
};


export type MutationDeleteSnapshotArgs = {
  input: DeleteSnapshotInput;
};


export type MutationSnapshotArgs = {
  input: SnapshotRunInput;
};


export type MutationTrackArgs = {
  input: TrackInput;
};


export type MutationUpdateWorkspaceArgs = {
  input: UpdateWorkspaceInput;
};

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

export enum OptionKey {
  Description = 'DESCRIPTION',
  Label = 'LABEL',
  Logo = 'LOGO',
  Value = 'VALUE'
}

export enum Ordering {
  Asc = 'ASC',
  AscNullsFirst = 'ASC_NULLS_FIRST',
  AscNullsLast = 'ASC_NULLS_LAST',
  Desc = 'DESC',
  DescNullsFirst = 'DESC_NULLS_FIRST',
  DescNullsLast = 'DESC_NULLS_LAST'
}

/** The kind of a port: its structural type. Decides which of children, identifier and choices the port must, may or must not carry (see docs/design/ports.md). */
export enum PortKind {
  /** A boolean. No children. */
  Bool = 'BOOL',
  /** An ISO-8601 date or datetime string. No children. */
  Date = 'DATE',
  /** A string-keyed map. One child keyed '...' describes a homogeneous value type; several named children describe the known keys. */
  Dict = 'DICT',
  /** One of a fixed set of values; `choices` required. */
  Enum = 'ENUM',
  /** A floating point number. No children; choices optional. */
  Float = 'FLOAT',
  /** An integer. No children; choices optional. */
  Int = 'INT',
  /** A reference to any object implementing an interface, typed by `identifier` (required). No children. */
  Interface = 'INTERFACE',
  /** A list; exactly one child describes the item type (conventionally keyed '...'). */
  List = 'LIST',
  /** A reference to an object that lives in the agent's memory, typed by `identifier` (required). Makes the action LOCAL-scoped. No children. */
  MemoryStructure = 'MEMORY_STRUCTURE',
  /** An object with named fields; at least one child per field, `identifier` optional. */
  Model = 'MODEL',
  /** A physical quantity with a unit; `reference_unit` required, `dimension` derived. No children. */
  Quantity = 'QUANTITY',
  /** A string. No children; choices optional. */
  String = 'STRING',
  /** A reference to an object held by a service, typed by `identifier` (@package/key, required). Values are ids. No children. */
  Structure = 'STRUCTURE',
  /** One of several variants; at least two children, each a variant. */
  Union = 'UNION'
}

/** The 2D canvas position (x, y) of a node in the flow editor. */
export type Position = {
  __typename?: 'Position';
  /** The horizontal position of the node on the editor canvas. */
  x: Scalars['Float']['output'];
  /** The vertical position of the node on the editor canvas. */
  y: Scalars['Float']['output'];
};

export type PositionInput = {
  x: Scalars['Float']['input'];
  y: Scalars['Float']['input'];
};

export type Provides = {
  __typename?: 'Provides';
  key: Scalars['String']['output'];
  operator: DescriptorOperator;
  value?: Maybe<Scalars['Arg']['output']>;
};

export type ProvidesInput = {
  /** The key of the provision: the path into the object the constraint reads */
  key: Scalars['String']['input'];
  /** The operator for the provision */
  operator: DescriptorOperator;
  /** The value of the provision. This can be any JSON serializable value; IN/NOT_IN take a list, LTE/GTE a number, EXISTS none */
  value?: InputMaybe<Scalars['Arg']['input']>;
};

/** Delegates the port to a port of another action. */
export type ProxyAssignWidgetInput = {
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** The action to target: an action-dependency key of `target_dependency` when that is set. */
  targetAction: Scalars['String']['input'];
  /** The agent dependency (by key) that provides the targeted action; omitted: the implementing agent itself. */
  targetDependency?: InputMaybe<Scalars['String']['input']>;
  /** The port key on the targeted action. */
  targetPort: Scalars['String']['input'];
};

export type ProxyWidget = AssignWidget & {
  __typename?: 'ProxyWidget';
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  targetAction: Scalars['String']['output'];
  targetDependency?: Maybe<Scalars['String']['output']>;
  targetPort: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Fetch the events of a run between two logical times, seeded from the latest snapshot at or before the lower bound. */
  eventsBetween: Array<RunEvent>;
  /** Fetch a single flow by id. */
  flow: Flow;
  /** List all flows in your organization. */
  flows: Array<Flow>;
  /** Fetch a single reactive template by id. */
  reactiveTemplate: ReactiveTemplate;
  /** List all reactive operator templates (a shared, global catalog). */
  reactiveTemplates: Array<ReactiveTemplate>;
  /** Fetch a single run by id. */
  run: Run;
  /** Fetch the run created for a given task id. */
  runForTask: Run;
  /** List all runs in your organization. */
  runs: Array<Run>;
  /** Fetch a single run snapshot by id. */
  snapshot: Snapshot;
  /** List all run snapshots in your organization. */
  snapshots: Array<Snapshot>;
  /** Fetch a single workspace by id. */
  workspace: Workspace;
  /** Aggregate statistics over the workspaces in your organization. */
  workspaceStats: WorkspaceStats;
  /** List all workspaces in your organization. */
  workspaces: Array<Workspace>;
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryEventsBetweenArgs = {
  max?: InputMaybe<Scalars['Int']['input']>;
  min?: InputMaybe<Scalars['Int']['input']>;
  run: Scalars['ID']['input'];
};


export type QueryFlowArgs = {
  id: Scalars['ID']['input'];
};


export type QueryFlowsArgs = {
  filters?: InputMaybe<FlowFilter>;
  ordering?: Array<FlowOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryReactiveTemplateArgs = {
  id: Scalars['ID']['input'];
};


export type QueryReactiveTemplatesArgs = {
  filters?: InputMaybe<ReactiveTemplateFilter>;
  ordering?: Array<ReactiveTemplateOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryRunArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRunForTaskArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRunsArgs = {
  filters?: InputMaybe<RunFilter>;
  ordering?: Array<RunOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuerySnapshotArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySnapshotsArgs = {
  filters?: InputMaybe<SnapshotFilter>;
  ordering?: Array<SnapshotOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryWorkspaceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWorkspaceStatsArgs = {
  filters?: InputMaybe<WorkspaceFilter>;
};


export type QueryWorkspacesArgs = {
  filters?: InputMaybe<WorkspaceFilter>;
  ordering?: Array<WorkspaceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export enum ReactiveImplementation {
  Add = 'ADD',
  All = 'ALL',
  And = 'AND',
  BufferComplete = 'BUFFER_COMPLETE',
  BufferCount = 'BUFFER_COUNT',
  BufferUntil = 'BUFFER_UNTIL',
  Chunk = 'CHUNK',
  Combinelatest = 'COMBINELATEST',
  Delay = 'DELAY',
  DelayUntil = 'DELAY_UNTIL',
  Divide = 'DIVIDE',
  Ensure = 'ENSURE',
  Filter = 'FILTER',
  Foreach = 'FOREACH',
  Gate = 'GATE',
  If = 'IF',
  Just = 'JUST',
  Modulo = 'MODULO',
  Multiply = 'MULTIPLY',
  Omit = 'OMIT',
  Power = 'POWER',
  Prefix = 'PREFIX',
  Reorder = 'REORDER',
  Select = 'SELECT',
  Split = 'SPLIT',
  Subtract = 'SUBTRACT',
  Suffix = 'SUFFIX',
  ToList = 'TO_LIST',
  Withlatest = 'WITHLATEST',
  Zip = 'ZIP'
}

/** A node that runs a built-in reactive operator (the implementation) over its input streams. */
export type ReactiveNode = GraphNode & {
  __typename?: 'ReactiveNode';
  argStuff?: Maybe<Scalars['String']['output']>;
  /** The constant ports configured on the node. */
  constants: Array<ArgPort>;
  /** A map of constant port keys to their configured values. */
  constantsMap: Scalars['ValueMap']['output'];
  /** A human-readable description of what the node does. */
  description?: Maybe<Scalars['String']['output']>;
  /** A map of global argument keys to the node port keys they feed. */
  globalsMap: Scalars['ValueMap']['output'];
  /** The id of the node, unique within the graph. */
  id: Scalars['ID']['output'];
  /** The reactive operator this node runs (e.g. ZIP, COMBINELATEST, FILTER). */
  implementation: ReactiveImplementation;
  /** The input port streams the node consumes (a list of streams, each a list of ports). */
  ins: Array<Array<ArgPort>>;
  /** The kind of node, discriminating the concrete node type. */
  kind: GraphNodeKind;
  /** The output port streams the node produces (a list of streams, each a list of ports). */
  outs: Array<Array<ReturnPort>>;
  /** The id of the parent node, if this node is nested inside another. */
  parentNode?: Maybe<Scalars['String']['output']>;
  /** The position of the node on the editor canvas. */
  position: Position;
  /** A human-readable title for the node. */
  title?: Maybe<Scalars['String']['output']>;
  /** The void ports of the node (neither streamed in nor out). */
  voids: Array<ArgPort>;
};

/** A ReactiveTemplate is a reusable, global catalog entry describing a reactive operator — its implementation (zip, combine-latest, chunk, filter, arithmetic, …) together with its input/output port streams and constants. Reactive nodes in a flow instantiate one of these templates. */
export type ReactiveTemplate = {
  __typename?: 'ReactiveTemplate';
  /** The constant argument ports configured on the operator. */
  constants: Array<ArgPort>;
  /** An optional longer description of the operator's behaviour. */
  description?: Maybe<Scalars['String']['output']>;
  /** The unique identifier of the reactive template. */
  id: Scalars['ID']['output'];
  /** The reactive operator this template implements (e.g. ZIP, COMBINELATEST, FILTER). */
  implementation: ReactiveImplementation;
  /** The input port streams the operator consumes (a list of streams, each a list of argument ports). */
  ins: Array<Array<ArgPort>>;
  /** The output port streams the operator produces (a list of streams, each a list of return ports). */
  outs: Array<Array<ReturnPort>>;
  /** A human-readable title for the template. */
  title: Scalars['String']['output'];
  /** The void ports of the operator (ports that neither stream in nor out). */
  voids: Array<ArgPort>;
};

export type ReactiveTemplateFilter = {
  AND?: InputMaybe<ReactiveTemplateFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ReactiveTemplateFilter>;
  OR?: InputMaybe<ReactiveTemplateFilter>;
  /** Filter by a list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by reactive implementation */
  implementations?: InputMaybe<Array<ReactiveImplementation>>;
  /** Search by title (case-insensitive substring) */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ReactiveTemplateOrder =
  { id: Ordering; title?: never; }
  |  { id?: never; title: Ordering; };

/** Interface for nodes that invoke a rekuest action, carrying the action hash, the map strategy and whether local execution is allowed. */
export type RekuestActionNode = {
  /** The kind of the rekuest action (e.g. function or generator). */
  actionKind: ActionKind;
  /** Whether the action may be executed locally instead of being assigned to an agent. */
  allowLocalExecution: Scalars['Boolean']['output'];
  /** The hash of the rekuest action this node invokes. */
  hash: Scalars['String']['output'];
  /** The strategy used to map the input stream onto the action (e.g. MAP, MAP_TO, MAP_FROM). */
  mapStrategy: Scalars['String']['output'];
};

/** A node that uses a rekuest action as a predicate to filter its input stream. */
export type RekuestFilterActionNode = AssignableNode & GraphNode & RekuestActionNode & RetriableNode & {
  __typename?: 'RekuestFilterActionNode';
  /** The kind of the rekuest action (e.g. function or generator). */
  actionKind: ActionKind;
  /** Whether the action may be executed locally instead of being assigned to an agent. */
  allowLocalExecution: Scalars['Boolean']['output'];
  /** The constant ports configured on the node. */
  constants: Array<ArgPort>;
  /** A map of constant port keys to their configured values. */
  constantsMap: Scalars['ValueMap']['output'];
  /** A human-readable description of what the node does. */
  description?: Maybe<Scalars['String']['output']>;
  /** A map of global argument keys to the node port keys they feed. */
  globalsMap: Scalars['ValueMap']['output'];
  /** The hash of the rekuest action this node invokes. */
  hash: Scalars['String']['output'];
  /** The id of the node, unique within the graph. */
  id: Scalars['ID']['output'];
  /** The input port streams the node consumes (a list of streams, each a list of ports). */
  ins: Array<Array<ArgPort>>;
  /** The kind of node, discriminating the concrete node type. */
  kind: GraphNodeKind;
  /** The strategy used to map the input stream onto the action (e.g. MAP, MAP_TO, MAP_FROM). */
  mapStrategy: Scalars['String']['output'];
  /** The timeout in milliseconds to wait for the assigned work before failing. */
  nextTimeout?: Maybe<Scalars['Int']['output']>;
  /** The output port streams the node produces (a list of streams, each a list of ports). */
  outs: Array<Array<ReturnPort>>;
  /** The id of the parent node, if this node is nested inside another. */
  parentNode?: Maybe<Scalars['String']['output']>;
  /** A placeholder field used to disambiguate this node type in the schema. */
  path?: Maybe<Scalars['String']['output']>;
  /** The position of the node on the editor canvas. */
  position: Position;
  /** The number of times to retry the node on failure. */
  retries?: Maybe<Scalars['Int']['output']>;
  /** The delay in milliseconds between retries. */
  retryDelay?: Maybe<Scalars['Int']['output']>;
  /** A human-readable title for the node. */
  title?: Maybe<Scalars['String']['output']>;
  /** The void ports of the node (neither streamed in nor out). */
  voids: Array<ArgPort>;
};

/** A node that maps a rekuest action over its input stream, producing one output per input. */
export type RekuestMapActionNode = AssignableNode & GraphNode & RekuestActionNode & RetriableNode & {
  __typename?: 'RekuestMapActionNode';
  /** The kind of the rekuest action (e.g. function or generator). */
  actionKind: ActionKind;
  /** Whether the action may be executed locally instead of being assigned to an agent. */
  allowLocalExecution: Scalars['Boolean']['output'];
  /** The constant ports configured on the node. */
  constants: Array<ArgPort>;
  /** A map of constant port keys to their configured values. */
  constantsMap: Scalars['ValueMap']['output'];
  /** A human-readable description of what the node does. */
  description?: Maybe<Scalars['String']['output']>;
  /** A map of global argument keys to the node port keys they feed. */
  globalsMap: Scalars['ValueMap']['output'];
  /** The hash of the rekuest action this node invokes. */
  hash: Scalars['String']['output'];
  /** A placeholder field used to disambiguate this node type in the schema. */
  hello?: Maybe<Scalars['String']['output']>;
  /** The id of the node, unique within the graph. */
  id: Scalars['ID']['output'];
  /** The input port streams the node consumes (a list of streams, each a list of ports). */
  ins: Array<Array<ArgPort>>;
  /** The kind of node, discriminating the concrete node type. */
  kind: GraphNodeKind;
  /** The strategy used to map the input stream onto the action (e.g. MAP, MAP_TO, MAP_FROM). */
  mapStrategy: Scalars['String']['output'];
  /** The timeout in milliseconds to wait for the assigned work before failing. */
  nextTimeout?: Maybe<Scalars['Int']['output']>;
  /** The output port streams the node produces (a list of streams, each a list of ports). */
  outs: Array<Array<ReturnPort>>;
  /** The id of the parent node, if this node is nested inside another. */
  parentNode?: Maybe<Scalars['String']['output']>;
  /** The position of the node on the editor canvas. */
  position: Position;
  /** The number of times to retry the node on failure. */
  retries?: Maybe<Scalars['Int']['output']>;
  /** The delay in milliseconds between retries. */
  retryDelay?: Maybe<Scalars['Int']['output']>;
  /** A human-readable title for the node. */
  title?: Maybe<Scalars['String']['output']>;
  /** The void ports of the node (neither streamed in nor out). */
  voids: Array<ArgPort>;
};

export type Requires = {
  __typename?: 'Requires';
  key: Scalars['String']['output'];
  operator: DescriptorOperator;
  value?: Maybe<Scalars['Arg']['output']>;
};

export type RequiresInput = {
  /** The key of the requirement: the path into the object the constraint reads */
  key: Scalars['String']['input'];
  /** The operator for the requirement */
  operator: DescriptorOperator;
  /** The value of the requirement. This can be any JSON serializable value; IN/NOT_IN take a list, LTE/GTE a number, EXISTS none */
  value?: InputMaybe<Scalars['Arg']['input']>;
};

/** Interface for nodes that can retry on failure, carrying the retry count and delay. */
export type RetriableNode = {
  /** The number of times to retry the node on failure. */
  retries?: Maybe<Scalars['Int']['output']>;
  /** The delay in milliseconds between retries. */
  retryDelay?: Maybe<Scalars['Int']['output']>;
};

/** The exit node of a flow: the values it receives become the flow's return values. */
export type ReturnNode = GraphNode & {
  __typename?: 'ReturnNode';
  /** The constant ports configured on the node. */
  constants: Array<ArgPort>;
  /** A map of constant port keys to their configured values. */
  constantsMap: Scalars['ValueMap']['output'];
  /** A human-readable description of what the node does. */
  description?: Maybe<Scalars['String']['output']>;
  /** A map of global argument keys to the node port keys they feed. */
  globalsMap: Scalars['ValueMap']['output'];
  /** The id of the node, unique within the graph. */
  id: Scalars['ID']['output'];
  /** The input port streams the node consumes (a list of streams, each a list of ports). */
  ins: Array<Array<ArgPort>>;
  /** The kind of node, discriminating the concrete node type. */
  kind: GraphNodeKind;
  /** The output port streams the node produces (a list of streams, each a list of ports). */
  outs: Array<Array<ReturnPort>>;
  /** The id of the parent node, if this node is nested inside another. */
  parentNode?: Maybe<Scalars['String']['output']>;
  /** The position of the node on the editor canvas. */
  position: Position;
  /** A placeholder field specific to the returns node. */
  returnStuff?: Maybe<Scalars['String']['output']>;
  /** A human-readable title for the node. */
  title?: Maybe<Scalars['String']['output']>;
  /** The void ports of the node (neither streamed in nor out). */
  voids: Array<ArgPort>;
};

export type ReturnPort = {
  __typename?: 'ReturnPort';
  children?: Maybe<Array<ReturnPort>>;
  choices?: Maybe<Array<Choice>>;
  description?: Maybe<Scalars['String']['output']>;
  dimension?: Maybe<Scalars['String']['output']>;
  effects?: Maybe<Array<Effect>>;
  identifier?: Maybe<Scalars['Identifier']['output']>;
  key: Scalars['String']['output'];
  kind: PortKind;
  label?: Maybe<Scalars['String']['output']>;
  nullable: Scalars['Boolean']['output'];
  proposedUnits?: Maybe<Array<Scalars['String']['output']>>;
  provides?: Maybe<Array<Provides>>;
  referenceUnit?: Maybe<Scalars['String']['output']>;
  widget?: Maybe<ReturnWidget>;
};

/**
 * A Port is a single input or output of an action, identified by its `key` and typed by its `kind`.
 *
 *     STRUCTURE, MEMORY_STRUCTURE and INTERFACE ports carry an `identifier` of the form `@package/key`
 *     (e.g. `@mikro/image`); ports with the same identifier are compatible. LIST and DICT ports have one
 *     child (the item type), UNION ports two or more (the variants), MODEL ports one per field. ENUM ports
 *     declare `choices`. See docs/design/ports.md for the full table.
 *
 */
export type ReturnPortInput = {
  /** The child ports (used for list, dict, union and model ports). */
  children?: InputMaybe<Array<ReturnPortInput>>;
  /** The values the port accepts (required for ENUM; optional for INT, FLOAT, STRING). Rendered by CHOICE widgets. */
  choices?: InputMaybe<Array<ChoiceInput>>;
  /** The description of the port. This is the text that is displayed in the UI when the user hovers over the port */
  description?: InputMaybe<Scalars['String']['input']>;
  /** For QUANTITY ports: the pint dimensionality string, e.g. "[mass] * [length] ** 2 / [time] ** 3 / [current]". This is the wiring-compatibility key between quantity ports. */
  dimension?: InputMaybe<Scalars['String']['input']>;
  /** The effects of the port */
  effects?: InputMaybe<Array<EffectInput>>;
  /** The identifier of a structure port. This is used to uniquely identify a specific type of structure. */
  identifier?: InputMaybe<Scalars['String']['input']>;
  /** The key of the port: unique among its siblings, free of '..', not 'value'. LIST/DICT item ports are conventionally keyed '...'. */
  key: Scalars['String']['input'];
  /** The kind of the port. This is the type of the port. Can be either int, string, structure, list, bool, dict, float, date, union or model */
  kind: PortKind;
  /** The label of the port. This is the text that is displayed in the UI */
  label?: InputMaybe<Scalars['String']['input']>;
  /** Whether the port is nullable or not. If the port is nullable, it can be set to null. If the port is not nullable, it cannot be set to null */
  nullable?: Scalars['Boolean']['input'];
  /** For QUANTITY ports: units offered as a dropdown in the UI, e.g. ["pF", "nF", "uF"]. Proposals only — any unit of the same dimension remains valid input. */
  proposedUnits?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The provisions for the port. Provisions are key-value pairs that can be used to add additional metadata to a port. When using rekuest's action search, you can filter actions based on their port provisions */
  provides?: InputMaybe<Array<ProvidesInput>>;
  /** For QUANTITY ports: the canonical/reference unit of the physical quantity, e.g. "volt" or "farad". It is the default selection and the key used to resolve the concrete quantity type; other units of the same dimension are still allowed. */
  referenceUnit?: InputMaybe<Scalars['String']['input']>;
  /** The return widget to use for this port, discriminated by `kind`. */
  widget?: InputMaybe<ReturnWidgetInput>;
};

export type ReturnWidget = {
  kind: ReturnWidgetKind;
};

/** A return widget: the UI element used to display a port's value, as a discriminated union over `kind`. Only the fields of the chosen kind may be set; see the `*ReturnWidgetInput` members. */
export type ReturnWidgetInput = {
  /** (CUSTOM) The catalog component to render. The returned value is in scope as the reserved root `value`. */
  component?: InputMaybe<Scalars['String']['input']>;
  /** Which kind of return widget this is; decides which other fields are read. */
  kind: ReturnWidgetKind;
  /** (CUSTOM) Props of the component; value_paths may only reference `value`, agent calls are not allowed. */
  props?: InputMaybe<Array<ComponentPropInput>>;
};

/** The kind of return widget. */
export enum ReturnWidgetKind {
  Choice = 'CHOICE',
  Custom = 'CUSTOM'
}

/** A Run is a single live execution of a Flow, tied to a task. As it executes it accumulates RunEvents (per-node values, errors and completions) and periodic Snapshots that capture its state over time. */
export type Run = {
  __typename?: 'Run';
  /** The time at which the run was started. */
  createdAt: Scalars['DateTime']['output'];
  /** All events emitted during this run, in order. */
  events: Array<RunEvent>;
  /** The flow that is being executed by this run. */
  flow: Flow;
  /** The unique identifier of the run. */
  id: Scalars['ID']['output'];
  /** The most recent state snapshot of this run, if any. */
  latestSnapshot?: Maybe<Snapshot>;
  /** The state snapshots captured during this run. */
  snapshots: Array<Snapshot>;
  /** The current status of the run (RUNNING or COMPLETED). */
  status: RunStatus;
  /** The id of the task that triggered this run. */
  taskId: Scalars['ID']['output'];
};


/** A Run is a single live execution of a Flow, tied to a task. As it executes it accumulates RunEvents (per-node values, errors and completions) and periodic Snapshots that capture its state over time. */
export type RunEventsArgs = {
  filters?: InputMaybe<RunEventFilter>;
  ordering?: Array<RunEventOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A Run is a single live execution of a Flow, tied to a task. As it executes it accumulates RunEvents (per-node values, errors and completions) and periodic Snapshots that capture its state over time. */
export type RunSnapshotsArgs = {
  filters?: InputMaybe<SnapshotFilter>;
  ordering?: Array<SnapshotOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A RunEvent is a single event emitted while a Run executes: a streamed value (NEXT), an ERROR, or a COMPLETE, originating from a specific node handle in the flow. */
export type RunEvent = {
  __typename?: 'RunEvent';
  /** The ids of the events that caused this event (its causal parents). */
  causedBy: Array<Scalars['ID']['output']>;
  /** The wall-clock time at which the event was recorded. */
  createdAt: Scalars['DateTime']['output'];
  /** A human-readable exception message, set for ERROR events. */
  exception?: Maybe<Scalars['String']['output']>;
  /** The node handle (port) the event was emitted on. */
  handle: Scalars['String']['output'];
  /** The unique identifier of the event. */
  id: Scalars['ID']['output'];
  /** The kind of event: NEXT, ERROR, COMPLETE or UNKNOWN. */
  kind: RunEventKind;
  /** The id of the node that emitted the event. */
  source: Scalars['String']['output'];
  /** The logical time of the run at which this event was emitted. */
  t: Scalars['Int']['output'];
  /** The payload of the event (the streamed value, or the exception for an ERROR). */
  value?: Maybe<Scalars['EventValue']['output']>;
};

export type RunEventFilter = {
  AND?: InputMaybe<RunEventFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<RunEventFilter>;
  OR?: InputMaybe<RunEventFilter>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by a list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by event kind */
  kinds?: InputMaybe<Array<RunEventKind>>;
};

export enum RunEventKind {
  Complete = 'COMPLETE',
  Error = 'ERROR',
  Next = 'NEXT',
  Unknown = 'UNKNOWN'
}

export type RunEventOrder =
  { createdAt: Ordering; id?: never; t?: never; }
  |  { createdAt?: never; id: Ordering; t?: never; }
  |  { createdAt?: never; id?: never; t: Ordering; };

export type RunFilter = {
  AND?: InputMaybe<RunFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<RunFilter>;
  OR?: InputMaybe<RunFilter>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by a list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by whether the current user has pinned the item */
  pinned?: InputMaybe<Scalars['Boolean']['input']>;
  /** Search by task id (case-insensitive substring) */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type RunOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

export enum RunStatus {
  Completed = 'COMPLETED',
  Running = 'RUNNING'
}

export type SearchAssignWidget = AssignWidget & {
  __typename?: 'SearchAssignWidget';
  dependencies?: Maybe<Array<Scalars['String']['output']>>;
  filters?: Maybe<Array<ArgPort>>;
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  placeholder?: Maybe<Scalars['String']['output']>;
  query: Scalars['String']['output'];
  ward: Scalars['String']['output'];
};

/** A search over a ward for STRUCTURE ports (or lists of them). */
export type SearchAssignWidgetInput = {
  /** The other ports (port paths, `..` traverses children) whose values the query may reference. */
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Filter ports whose values are passed to the query as variables named by their keys. */
  filters?: InputMaybe<Array<ArgPortInput>>;
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** The placeholder text. */
  placeholder?: InputMaybe<Scalars['String']['input']>;
  /** The GraphQL query the ward executes to populate the choices. Must be a single `query` operation declaring `$search: String` and `$values: [ID!]`, plus one variable per filter port key. */
  query: Scalars['SearchQuery']['input'];
  /** The ward (service) that executes the query. */
  ward: Scalars['String']['input'];
};

export type SliderAssignWidget = AssignWidget & {
  __typename?: 'SliderAssignWidget';
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  max?: Maybe<Scalars['Float']['output']>;
  min?: Maybe<Scalars['Float']['output']>;
  step?: Maybe<Scalars['Float']['output']>;
};

/** A numeric slider for INT, FLOAT and QUANTITY ports. */
export type SliderAssignWidgetInput = {
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** The maximum value. */
  max?: InputMaybe<Scalars['Float']['input']>;
  /** The minimum value. */
  min?: InputMaybe<Scalars['Float']['input']>;
  /** The step between selectable values; must be positive. */
  step?: InputMaybe<Scalars['Float']['input']>;
};

/** A Snapshot captures the state of a Run at a logical time `t`, grouping the events that were active at that point so a client can reconstruct the run's state without replaying every event. */
export type Snapshot = {
  __typename?: 'Snapshot';
  /** The wall-clock time at which the snapshot was taken. */
  createdAt: Scalars['DateTime']['output'];
  /** The events that were active at the snapshot's logical time. */
  events: Array<RunEvent>;
  /** The unique identifier of the snapshot. */
  id: Scalars['ID']['output'];
  /** The run this snapshot belongs to. */
  run: Run;
  /** An optional status label describing the run state at this snapshot. */
  status?: Maybe<Scalars['String']['output']>;
  /** The logical time of the run at which this snapshot was taken. */
  t: Scalars['Int']['output'];
};


/** A Snapshot captures the state of a Run at a logical time `t`, grouping the events that were active at that point so a client can reconstruct the run's state without replaying every event. */
export type SnapshotEventsArgs = {
  filters?: InputMaybe<RunEventFilter>;
  ordering?: Array<RunEventOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type SnapshotFilter = {
  AND?: InputMaybe<SnapshotFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<SnapshotFilter>;
  OR?: InputMaybe<SnapshotFilter>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by a list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type SnapshotOrder =
  { createdAt: Ordering; id?: never; t?: never; }
  |  { createdAt?: never; id: Ordering; t?: never; }
  |  { createdAt?: never; id?: never; t: Ordering; };

export type SnapshotRunInput = {
  events: Array<Scalars['ID']['input']>;
  run: Scalars['ID']['input'];
  t: Scalars['Int']['input'];
};

export type StateAccessor = {
  __typename?: 'StateAccessor';
  call?: Maybe<UtilCall>;
  optionKey: OptionKey;
  path?: Maybe<Scalars['String']['output']>;
};

export type StateAccessorInput = {
  /** Pure UtilCall returning the pointer string dynamically. May reference `state`, `value` and the widget's `dependencies`. Mutually exclusive with `path`. */
  call?: InputMaybe<UtilCallInput>;
  /** The part of the state accessor to use as the value for the assign widget (e.g. the key, the description, the logo, etc.) */
  optionKey: OptionKey;
  /** Static JSON pointer into the state value ('/x/y'). Omit for the whole value. Mutually exclusive with `call`. */
  path?: InputMaybe<Scalars['String']['input']>;
};

export type StateChoiceAssignWidget = AssignWidget & {
  __typename?: 'StateChoiceAssignWidget';
  dependencies?: Maybe<Array<Scalars['String']['output']>>;
  dependency?: Maybe<Scalars['String']['output']>;
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  stateAccessors?: Maybe<Array<StateAccessor>>;
  stateCall?: Maybe<UtilCall>;
  statePath?: Maybe<Scalars['String']['output']>;
};

/** A choice over entries of an agent's state. */
export type StateChoiceAssignWidgetInput = {
  /** The other ports (port paths, `..` traverses children) whose values the calls may reference. */
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The agent dependency (by key) whose state provides the choices; omitted: the implementing agent's own state. */
  dependency?: InputMaybe<Scalars['String']['input']>;
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** How to read label/description/logo/value out of each state entry; each accessor is a static pointer or a pure call. */
  stateAccessors?: InputMaybe<Array<StateAccessorInput>>;
  /** Pure UtilCall returning that pointer dynamically; may reference `state`, `value` and `dependencies`. Mutually exclusive with `state_path`. */
  stateCall?: InputMaybe<UtilCallInput>;
  /** Static JSON pointer into the state value that provides the choices. Mutually exclusive with `state_call`. */
  statePath?: InputMaybe<Scalars['String']['input']>;
};

/** A single item carried on an edge's stream, describing the port kind and a label of the value that flows through. */
export type StreamItem = {
  __typename?: 'StreamItem';
  /** The port kind of the value carried at this position of the stream. */
  kind: PortKind;
  /** A human-readable label for the value carried at this position of the stream. */
  label: Scalars['String']['output'];
};

export type StreamItemInput = {
  kind: PortKind;
  label: Scalars['String']['input'];
};

export type StringAssignWidget = AssignWidget & {
  __typename?: 'StringAssignWidget';
  asParagraph?: Maybe<Scalars['Boolean']['output']>;
  followValue?: Maybe<Scalars['String']['output']>;
  kind: AssignWidgetKind;
  placeholder?: Maybe<Scalars['String']['output']>;
};

/** A text input for STRING ports. */
export type StringAssignWidgetInput = {
  /** Render as a multi-line paragraph. */
  asParagraph?: InputMaybe<Scalars['Boolean']['input']>;
  /** Port path of another port whose value this widget follows and mirrors. */
  followValue?: InputMaybe<Scalars['String']['input']>;
  /** Which member of AssignWidgetInput this is. */
  kind: AssignWidgetKind;
  /** The placeholder text. */
  placeholder?: InputMaybe<Scalars['String']['input']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Subscribe to the live stream of events for a given run. */
  events: RunEvent;
};


export type SubscriptionEventsArgs = {
  run: Scalars['ID']['input'];
};

export type TimeBucket = {
  __typename?: 'TimeBucket';
  avg?: Maybe<Scalars['Float']['output']>;
  count: Scalars['Int']['output'];
  distinctCount: Scalars['Int']['output'];
  max?: Maybe<Scalars['Float']['output']>;
  min?: Maybe<Scalars['Float']['output']>;
  sum?: Maybe<Scalars['Float']['output']>;
  ts: Scalars['DateTime']['output'];
};

export type TrackInput = {
  causedBy?: Array<Scalars['ID']['input']>;
  exception?: InputMaybe<Scalars['String']['input']>;
  handle?: InputMaybe<Scalars['String']['input']>;
  kind: RunEventKind;
  message?: InputMaybe<Scalars['String']['input']>;
  reference: Scalars['String']['input'];
  run: Scalars['ID']['input'];
  source?: InputMaybe<Scalars['String']['input']>;
  t: Scalars['Int']['input'];
  value?: InputMaybe<Scalars['EventValue']['input']>;
};

export type UpdateWorkspaceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  graph: GraphInput;
  title?: InputMaybe<Scalars['String']['input']>;
  workspace: Scalars['ID']['input'];
};

/** Defines a utility call that can be invoked within the system. */
export type UtilCall = {
  __typename?: 'UtilCall';
  arguments?: Maybe<Array<ActionArgument>>;
  operation: Scalars['String']['output'];
};

/** Defines a utility call that can be invoked within the system. */
export type UtilCallInput = {
  /** Key-value arguments map compiled for the target utility call. */
  arguments?: InputMaybe<Array<ActionArgumentInput>>;
  /** The utility function name to invoke. */
  operation: Scalars['String']['input'];
};

export type Validator = {
  __typename?: 'Validator';
  call: UtilCall;
  /** The full call tree as raw JSON, so deep trees are not truncated by fragment depth. */
  callJson: Scalars['JSONSerializable']['output'];
  dependencies?: Maybe<Array<Scalars['String']['output']>>;
  errorMessage?: Maybe<Scalars['String']['output']>;
  label?: Maybe<Scalars['String']['output']>;
  source?: Maybe<Scalars['String']['output']>;
};

/**
 *
 * A validator for a port. `call` is a pure blok UtilCall evaluated client-side against the
 * catalog; it must return a boolean meaning 'valid'. Other ports the call references must be
 * listed in `dependencies` (the authoritative subscription list); `value` refers to the port's
 * own value. Use the .. syntax when traversing the tree of ports.
 *
 */
export type ValidatorInput = {
  /** The pure blok UtilCall, evaluated client-side against the catalog, that validates the port value. It must return a boolean meaning 'valid'. Argument value_paths may only reference names listed in `dependencies`, plus `value` for the port's own value. */
  call: UtilCallInput;
  /** The form-field subscription list of the validator: the keys of the other ports whose values the call may reference. This list is authoritative: a value_path in the call may only reference these names (plus `value` for the port's own value). Use the .. syntax to traverse the tree of ports, e.g. 'foo..bar' for the child 'bar' of port 'foo'. */
  dependencies?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The error message to display when the validation fails */
  errorMessage?: InputMaybe<Scalars['String']['input']>;
  /** An optional human-readable label for the validator. */
  label?: InputMaybe<Scalars['String']['input']>;
  /** The authoring expression the call was compiled from (informational; never parsed or validated by the server). */
  source?: InputMaybe<Scalars['String']['input']>;
};

/** A plain edge that streams items from a source handle to a target handle. */
export type VanillaEdge = GraphEdge & {
  __typename?: 'VanillaEdge';
  /** The id of the edge, unique within the graph. */
  id: Scalars['ID']['output'];
  /** The kind of edge, discriminating the concrete edge type (VANILLA or LOGGING). */
  kind: GraphEdgeKind;
  /** An optional label shown on the edge in the editor. */
  label?: Maybe<Scalars['String']['output']>;
  /** The id of the source node. */
  source: Scalars['String']['output'];
  /** The handle (port) on the source node the edge leaves from. */
  sourceHandle: Scalars['String']['output'];
  /** The ordered items (the shape of the data) that flow across this edge. */
  stream: Array<StreamItem>;
  /** The id of the target node. */
  target: Scalars['String']['output'];
  /** The handle (port) on the target node the edge arrives at. */
  targetHandle: Scalars['String']['output'];
};

/** A Workspace is the top-level container that groups the Flows of an organization, mirroring the concept of a project or folder. It is the entry point users edit flows within. */
export type Workspace = {
  __typename?: 'Workspace';
  /** The time at which the workspace was created. */
  createdAt: Scalars['DateTime']['output'];
  /** An optional longer description of the workspace. */
  description?: Maybe<Scalars['String']['output']>;
  /** All flows contained in this workspace. */
  flows: Array<Flow>;
  /** The unique identifier of the workspace. */
  id: Scalars['ID']['output'];
  /** The most recently created flow in this workspace, if any. */
  latestFlow?: Maybe<Flow>;
  /** A human-readable title for the workspace. */
  title: Scalars['String']['output'];
};


/** A Workspace is the top-level container that groups the Flows of an organization, mirroring the concept of a project or folder. It is the entry point users edit flows within. */
export type WorkspaceFlowsArgs = {
  filters?: InputMaybe<FlowFilter>;
  ordering?: Array<FlowOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Numeric/aggregatable fields of Workspace */
export enum WorkspaceField {
  CreatedAt = 'CREATED_AT'
}

export type WorkspaceFilter = {
  AND?: InputMaybe<WorkspaceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<WorkspaceFilter>;
  OR?: InputMaybe<WorkspaceFilter>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by a list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by whether the current user has pinned the item */
  pinned?: InputMaybe<Scalars['Boolean']['input']>;
  /** Search by title (case-insensitive substring) */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type WorkspaceOrder =
  { createdAt: Ordering; id?: never; title?: never; }
  |  { createdAt?: never; id: Ordering; title?: never; }
  |  { createdAt?: never; id?: never; title: Ordering; };

export type WorkspaceStats = {
  __typename?: 'WorkspaceStats';
  /** Average */
  avg?: Maybe<Scalars['Float']['output']>;
  /** Total number of items in the selection */
  count: Scalars['Int']['output'];
  /** Number of distinct values for the field */
  distinctCount: Scalars['Int']['output'];
  /** Maximum */
  max?: Maybe<Scalars['Float']['output']>;
  /** Minimum */
  min?: Maybe<Scalars['Float']['output']>;
  /** Time-bucketed stats over a datetime field. */
  series: Array<TimeBucket>;
  /** Sum */
  sum?: Maybe<Scalars['Float']['output']>;
};


export type WorkspaceStatsAvgArgs = {
  field: WorkspaceField;
};


export type WorkspaceStatsDistinctCountArgs = {
  field: WorkspaceField;
};


export type WorkspaceStatsMaxArgs = {
  field: WorkspaceField;
};


export type WorkspaceStatsMinArgs = {
  field: WorkspaceField;
};


export type WorkspaceStatsSeriesArgs = {
  by: Granularity;
  field: WorkspaceField;
  timestampField: WorkspaceTimestampField;
};


export type WorkspaceStatsSumArgs = {
  field: WorkspaceField;
};

/** Datetime fields of Workspace for bucketing */
export enum WorkspaceTimestampField {
  CreatedAt = 'CREATED_AT'
}

export type _Entity = Flow | ReactiveTemplate | Run | RunEvent | Snapshot | Workspace;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

type BaseGraphNode_AgentSubFlowNode_Fragment = { __typename: 'AgentSubFlowNode', globalsMap: any, constantsMap: any, title?: string | null, description?: string | null, kind: GraphNodeKind, ins: Array<Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>>, outs: Array<Array<(
    { __typename?: 'ReturnPort' }
    & FlussReturnPortFragment
  )>>, constants: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>, voids: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )> };

type BaseGraphNode_ArgNode_Fragment = { __typename: 'ArgNode', globalsMap: any, constantsMap: any, title?: string | null, description?: string | null, kind: GraphNodeKind, ins: Array<Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>>, outs: Array<Array<(
    { __typename?: 'ReturnPort' }
    & FlussReturnPortFragment
  )>>, constants: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>, voids: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )> };

type BaseGraphNode_ReactiveNode_Fragment = { __typename: 'ReactiveNode', globalsMap: any, constantsMap: any, title?: string | null, description?: string | null, kind: GraphNodeKind, ins: Array<Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>>, outs: Array<Array<(
    { __typename?: 'ReturnPort' }
    & FlussReturnPortFragment
  )>>, constants: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>, voids: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )> };

type BaseGraphNode_RekuestFilterActionNode_Fragment = { __typename: 'RekuestFilterActionNode', globalsMap: any, constantsMap: any, title?: string | null, description?: string | null, kind: GraphNodeKind, ins: Array<Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>>, outs: Array<Array<(
    { __typename?: 'ReturnPort' }
    & FlussReturnPortFragment
  )>>, constants: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>, voids: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )> };

type BaseGraphNode_RekuestMapActionNode_Fragment = { __typename: 'RekuestMapActionNode', globalsMap: any, constantsMap: any, title?: string | null, description?: string | null, kind: GraphNodeKind, ins: Array<Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>>, outs: Array<Array<(
    { __typename?: 'ReturnPort' }
    & FlussReturnPortFragment
  )>>, constants: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>, voids: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )> };

type BaseGraphNode_ReturnNode_Fragment = { __typename: 'ReturnNode', globalsMap: any, constantsMap: any, title?: string | null, description?: string | null, kind: GraphNodeKind, ins: Array<Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>>, outs: Array<Array<(
    { __typename?: 'ReturnPort' }
    & FlussReturnPortFragment
  )>>, constants: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>, voids: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )> };

export type BaseGraphNodeFragment = BaseGraphNode_AgentSubFlowNode_Fragment | BaseGraphNode_ArgNode_Fragment | BaseGraphNode_ReactiveNode_Fragment | BaseGraphNode_RekuestFilterActionNode_Fragment | BaseGraphNode_RekuestMapActionNode_Fragment | BaseGraphNode_ReturnNode_Fragment;

type RetriableNode_RekuestFilterActionNode_Fragment = { __typename?: 'RekuestFilterActionNode', retries?: number | null, retryDelay?: number | null };

type RetriableNode_RekuestMapActionNode_Fragment = { __typename?: 'RekuestMapActionNode', retries?: number | null, retryDelay?: number | null };

export type RetriableNodeFragment = RetriableNode_RekuestFilterActionNode_Fragment | RetriableNode_RekuestMapActionNode_Fragment;

type AssignableNode_RekuestFilterActionNode_Fragment = { __typename?: 'RekuestFilterActionNode', nextTimeout?: number | null };

type AssignableNode_RekuestMapActionNode_Fragment = { __typename?: 'RekuestMapActionNode', nextTimeout?: number | null };

export type AssignableNodeFragment = AssignableNode_RekuestFilterActionNode_Fragment | AssignableNode_RekuestMapActionNode_Fragment;

type RekuestActionNode_RekuestFilterActionNode_Fragment = { __typename?: 'RekuestFilterActionNode', hash: string, mapStrategy: string, allowLocalExecution: boolean, actionKind: ActionKind };

type RekuestActionNode_RekuestMapActionNode_Fragment = { __typename?: 'RekuestMapActionNode', hash: string, mapStrategy: string, allowLocalExecution: boolean, actionKind: ActionKind };

export type RekuestActionNodeFragment = RekuestActionNode_RekuestFilterActionNode_Fragment | RekuestActionNode_RekuestMapActionNode_Fragment;

export type RekuestMapActionNodeFragment = (
  { __typename: 'RekuestMapActionNode', hello?: string | null }
  & BaseGraphNode_RekuestMapActionNode_Fragment
  & RetriableNode_RekuestMapActionNode_Fragment
  & AssignableNode_RekuestMapActionNode_Fragment
  & RekuestActionNode_RekuestMapActionNode_Fragment
);

export type RekuestFilterActionNodeFragment = (
  { __typename: 'RekuestFilterActionNode', path?: string | null }
  & BaseGraphNode_RekuestFilterActionNode_Fragment
  & RetriableNode_RekuestFilterActionNode_Fragment
  & AssignableNode_RekuestFilterActionNode_Fragment
  & RekuestActionNode_RekuestFilterActionNode_Fragment
);

export type ReactiveNodeFragment = (
  { __typename: 'ReactiveNode', implementation: ReactiveImplementation }
  & BaseGraphNode_ReactiveNode_Fragment
);

export type ArgNodeFragment = (
  { __typename: 'ArgNode' }
  & BaseGraphNode_ArgNode_Fragment
);

export type ReturnNodeFragment = (
  { __typename: 'ReturnNode' }
  & BaseGraphNode_ReturnNode_Fragment
);

export type AgentSubFlowNodeFragment = (
  { __typename: 'AgentSubFlowNode', appFilter?: string | null, versionFilter?: string | null, instanceFilter?: string | null, deviceFilter?: string | null, userFilter?: string | null, autoResolvable: boolean }
  & BaseGraphNode_AgentSubFlowNode_Fragment
);

type GraphNode_AgentSubFlowNode_Fragment = (
  { __typename: 'AgentSubFlowNode', id: string, parentNode?: string | null, position: { __typename?: 'Position', x: number, y: number } }
  & AgentSubFlowNodeFragment
);

type GraphNode_ArgNode_Fragment = (
  { __typename: 'ArgNode', id: string, parentNode?: string | null, position: { __typename?: 'Position', x: number, y: number } }
  & ArgNodeFragment
);

type GraphNode_ReactiveNode_Fragment = (
  { __typename: 'ReactiveNode', id: string, parentNode?: string | null, position: { __typename?: 'Position', x: number, y: number } }
  & ReactiveNodeFragment
);

type GraphNode_RekuestFilterActionNode_Fragment = (
  { __typename: 'RekuestFilterActionNode', id: string, parentNode?: string | null, position: { __typename?: 'Position', x: number, y: number } }
  & RekuestFilterActionNodeFragment
);

type GraphNode_RekuestMapActionNode_Fragment = (
  { __typename: 'RekuestMapActionNode', id: string, parentNode?: string | null, position: { __typename?: 'Position', x: number, y: number } }
  & RekuestMapActionNodeFragment
);

type GraphNode_ReturnNode_Fragment = (
  { __typename: 'ReturnNode', id: string, parentNode?: string | null, position: { __typename?: 'Position', x: number, y: number } }
  & ReturnNodeFragment
);

export type GraphNodeFragment = GraphNode_AgentSubFlowNode_Fragment | GraphNode_ArgNode_Fragment | GraphNode_ReactiveNode_Fragment | GraphNode_RekuestFilterActionNode_Fragment | GraphNode_RekuestMapActionNode_Fragment | GraphNode_ReturnNode_Fragment;

type BaseGraphEdge_LoggingEdge_Fragment = { __typename: 'LoggingEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, kind: GraphEdgeKind, stream: Array<(
    { __typename?: 'StreamItem' }
    & StreamItemFragment
  )> };

type BaseGraphEdge_VanillaEdge_Fragment = { __typename: 'VanillaEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, kind: GraphEdgeKind, stream: Array<(
    { __typename?: 'StreamItem' }
    & StreamItemFragment
  )> };

export type BaseGraphEdgeFragment = BaseGraphEdge_LoggingEdge_Fragment | BaseGraphEdge_VanillaEdge_Fragment;

export type LoggingEdgeFragment = (
  { __typename?: 'LoggingEdge', level: string }
  & BaseGraphEdge_LoggingEdge_Fragment
);

export type VanillaEdgeFragment = (
  { __typename: 'VanillaEdge' }
  & BaseGraphEdge_VanillaEdge_Fragment
);

type GraphEdge_LoggingEdge_Fragment = (
  { __typename?: 'LoggingEdge' }
  & LoggingEdgeFragment
);

type GraphEdge_VanillaEdge_Fragment = (
  { __typename?: 'VanillaEdge' }
  & VanillaEdgeFragment
);

export type GraphEdgeFragment = GraphEdge_LoggingEdge_Fragment | GraphEdge_VanillaEdge_Fragment;

export type StreamItemFragment = { __typename?: 'StreamItem', kind: PortKind, label: string };

export type GlobalArgFragment = { __typename?: 'GlobalArg', key: string, port: (
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  ) };

export type GraphFragment = { __typename?: 'Graph', nodes: Array<(
    { __typename?: 'AgentSubFlowNode' }
    & GraphNode_AgentSubFlowNode_Fragment
  ) | (
    { __typename?: 'ArgNode' }
    & GraphNode_ArgNode_Fragment
  ) | (
    { __typename?: 'ReactiveNode' }
    & GraphNode_ReactiveNode_Fragment
  ) | (
    { __typename?: 'RekuestFilterActionNode' }
    & GraphNode_RekuestFilterActionNode_Fragment
  ) | (
    { __typename?: 'RekuestMapActionNode' }
    & GraphNode_RekuestMapActionNode_Fragment
  ) | (
    { __typename?: 'ReturnNode' }
    & GraphNode_ReturnNode_Fragment
  )>, edges: Array<(
    { __typename?: 'LoggingEdge' }
    & GraphEdge_LoggingEdge_Fragment
  ) | (
    { __typename?: 'VanillaEdge' }
    & GraphEdge_VanillaEdge_Fragment
  )>, globals: Array<(
    { __typename?: 'GlobalArg' }
    & GlobalArgFragment
  )> };

export type FlowFragment = { __typename: 'Flow', id: string, title: string, description?: string | null, createdAt: any, graph: (
    { __typename?: 'Graph' }
    & GraphFragment
  ), workspace: { __typename?: 'Workspace', id: string } };

export type ListFlowFragment = { __typename?: 'Flow', id: string, title: string, description?: string | null, createdAt: any, workspace: { __typename?: 'Workspace', id: string, title: string } };

export type ListWorkspaceFragment = { __typename?: 'Workspace', id: string, title: string, description?: string | null, createdAt: any, latestFlow?: (
    { __typename?: 'Flow' }
    & ListFlowFragment
  ) | null };

export type WorkspaceFragment = { __typename?: 'Workspace', id: string, title: string, latestFlow?: (
    { __typename?: 'Flow' }
    & FlowFragment
  ) | null, flows: Array<(
    { __typename?: 'Flow' }
    & ListFlowFragment
  )> };

export type CarouselWorkspaceFragment = { __typename?: 'Workspace', id: string, title: string, description?: string | null, latestFlow?: (
    { __typename?: 'Flow' }
    & FlowFragment
  ) | null };

export type FlussStringAssignWidgetFragment = { __typename: 'StringAssignWidget', kind: AssignWidgetKind, placeholder?: string | null, asParagraph?: boolean | null };

export type FlussSliderAssignWidgetFragment = { __typename: 'SliderAssignWidget', kind: AssignWidgetKind, min?: number | null, max?: number | null, step?: number | null };

export type FlussStateChoiceAssignWidgetFragment = { __typename: 'StateChoiceAssignWidget', kind: AssignWidgetKind, followValue?: string | null, statePath?: string | null, dependency?: string | null, dependencies?: Array<string> | null, stateCall?: (
    { __typename?: 'UtilCall' }
    & FlussPortCallFragment
  ) | null, stateAccessors?: Array<{ __typename?: 'StateAccessor', optionKey: OptionKey, path?: string | null, call?: (
      { __typename?: 'UtilCall' }
      & FlussPortCallFragment
    ) | null }> | null };

export type FlussProxyWidgetFragment = { __typename: 'ProxyWidget', kind: AssignWidgetKind, targetPort: string, targetAction: string, targetDependency?: string | null };

export type FlussFilterPortFragment = { __typename: 'ArgPort', kind: PortKind, key: string, identifier?: any | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'ChoiceAssignWidget' } | { __typename?: 'CustomAssignWidget' } | { __typename?: 'ProxyWidget' } | { __typename?: 'SearchAssignWidget', query: string } | { __typename?: 'SliderAssignWidget' } | { __typename?: 'StateChoiceAssignWidget' } | { __typename?: 'StringAssignWidget' } | null };

export type FlussSearchAssignWidgetFragment = { __typename: 'SearchAssignWidget', kind: AssignWidgetKind, query: string, ward: string, dependencies?: Array<string> | null, filters?: Array<(
    { __typename?: 'ArgPort' }
    & FlussFilterPortFragment
  )> | null };

export type FlussCustomAssignWidgetFragment = { __typename: 'CustomAssignWidget', kind: AssignWidgetKind, followValue?: string | null, component: string, dependencies?: Array<string> | null, props?: Array<(
    { __typename?: 'ComponentProp' }
    & FlussBlokComponentPropFragment
  )> | null, fallback?: (
    { __typename: 'ChoiceAssignWidget', kind: AssignWidgetKind }
    & FlussChoiceAssignWidgetFragment
  ) | { __typename: 'CustomAssignWidget', kind: AssignWidgetKind } | (
    { __typename: 'ProxyWidget', kind: AssignWidgetKind }
    & FlussProxyWidgetFragment
  ) | (
    { __typename: 'SearchAssignWidget', kind: AssignWidgetKind }
    & FlussSearchAssignWidgetFragment
  ) | (
    { __typename: 'SliderAssignWidget', kind: AssignWidgetKind }
    & FlussSliderAssignWidgetFragment
  ) | (
    { __typename: 'StateChoiceAssignWidget', kind: AssignWidgetKind }
    & FlussStateChoiceAssignWidgetFragment
  ) | (
    { __typename: 'StringAssignWidget', kind: AssignWidgetKind }
    & FlussStringAssignWidgetFragment
  ) | null };

export type FlussChoiceAssignWidgetFragment = { __typename: 'ChoiceAssignWidget', kind: AssignWidgetKind, followValue?: string | null, placeholder?: string | null };

export type FlussArgChildPortDeepFragment = { __typename: 'ArgPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, description?: string | null, nullable: boolean, default?: any | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, widget?: (
    { __typename?: 'ChoiceAssignWidget' }
    & FlussAssignWidget_ChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'CustomAssignWidget' }
    & FlussAssignWidget_CustomAssignWidget_Fragment
  ) | (
    { __typename?: 'ProxyWidget' }
    & FlussAssignWidget_ProxyWidget_Fragment
  ) | (
    { __typename?: 'SearchAssignWidget' }
    & FlussAssignWidget_SearchAssignWidget_Fragment
  ) | (
    { __typename?: 'SliderAssignWidget' }
    & FlussAssignWidget_SliderAssignWidget_Fragment
  ) | (
    { __typename?: 'StateChoiceAssignWidget' }
    & FlussAssignWidget_StateChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'StringAssignWidget' }
    & FlussAssignWidget_StringAssignWidget_Fragment
  ) | null, children?: Array<{ __typename: 'ArgPort', kind: PortKind, key: string, identifier?: any | null, nullable: boolean, widget?: (
      { __typename?: 'ChoiceAssignWidget' }
      & FlussAssignWidget_ChoiceAssignWidget_Fragment
    ) | (
      { __typename?: 'CustomAssignWidget' }
      & FlussAssignWidget_CustomAssignWidget_Fragment
    ) | (
      { __typename?: 'ProxyWidget' }
      & FlussAssignWidget_ProxyWidget_Fragment
    ) | (
      { __typename?: 'SearchAssignWidget' }
      & FlussAssignWidget_SearchAssignWidget_Fragment
    ) | (
      { __typename?: 'SliderAssignWidget' }
      & FlussAssignWidget_SliderAssignWidget_Fragment
    ) | (
      { __typename?: 'StateChoiceAssignWidget' }
      & FlussAssignWidget_StateChoiceAssignWidget_Fragment
    ) | (
      { __typename?: 'StringAssignWidget' }
      & FlussAssignWidget_StringAssignWidget_Fragment
    ) | null }> | null };

export type FlussArgChildPortNestedFragment = { __typename: 'ArgPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, description?: string | null, nullable: boolean, default?: any | null, children?: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgChildPortDeepFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, widget?: (
    { __typename?: 'ChoiceAssignWidget' }
    & FlussAssignWidget_ChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'CustomAssignWidget' }
    & FlussAssignWidget_CustomAssignWidget_Fragment
  ) | (
    { __typename?: 'ProxyWidget' }
    & FlussAssignWidget_ProxyWidget_Fragment
  ) | (
    { __typename?: 'SearchAssignWidget' }
    & FlussAssignWidget_SearchAssignWidget_Fragment
  ) | (
    { __typename?: 'SliderAssignWidget' }
    & FlussAssignWidget_SliderAssignWidget_Fragment
  ) | (
    { __typename?: 'StateChoiceAssignWidget' }
    & FlussAssignWidget_StateChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'StringAssignWidget' }
    & FlussAssignWidget_StringAssignWidget_Fragment
  ) | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & FlussPortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & FlussPortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & FlussPortEffect_MessageEffect_Fragment
  )> | null, validators?: Array<(
    { __typename?: 'Validator' }
    & ValidatorFragment
  )> | null };

export type FlussArgChildPortFragment = { __typename: 'ArgPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, nullable: boolean, description?: string | null, default?: any | null, children?: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgChildPortNestedFragment
  )> | null, widget?: (
    { __typename?: 'ChoiceAssignWidget' }
    & FlussAssignWidget_ChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'CustomAssignWidget' }
    & FlussAssignWidget_CustomAssignWidget_Fragment
  ) | (
    { __typename?: 'ProxyWidget' }
    & FlussAssignWidget_ProxyWidget_Fragment
  ) | (
    { __typename?: 'SearchAssignWidget' }
    & FlussAssignWidget_SearchAssignWidget_Fragment
  ) | (
    { __typename?: 'SliderAssignWidget' }
    & FlussAssignWidget_SliderAssignWidget_Fragment
  ) | (
    { __typename?: 'StateChoiceAssignWidget' }
    & FlussAssignWidget_StateChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'StringAssignWidget' }
    & FlussAssignWidget_StringAssignWidget_Fragment
  ) | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & FlussPortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & FlussPortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & FlussPortEffect_MessageEffect_Fragment
  )> | null, validators?: Array<(
    { __typename?: 'Validator' }
    & ValidatorFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null };

export type FlussReturnChildPortDeepFragment = { __typename: 'ReturnPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, description?: string | null, nullable: boolean, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, widget?: (
    { __typename?: 'ChoiceReturnWidget' }
    & FlussReturnWidget_ChoiceReturnWidget_Fragment
  ) | (
    { __typename?: 'CustomReturnWidget' }
    & FlussReturnWidget_CustomReturnWidget_Fragment
  ) | null, children?: Array<{ __typename: 'ReturnPort', kind: PortKind, key: string, identifier?: any | null, nullable: boolean, widget?: (
      { __typename?: 'ChoiceReturnWidget' }
      & FlussReturnWidget_ChoiceReturnWidget_Fragment
    ) | (
      { __typename?: 'CustomReturnWidget' }
      & FlussReturnWidget_CustomReturnWidget_Fragment
    ) | null }> | null };

export type FlussReturnChildPortNestedFragment = { __typename: 'ReturnPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, description?: string | null, nullable: boolean, children?: Array<(
    { __typename?: 'ReturnPort' }
    & FlussReturnChildPortDeepFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, widget?: (
    { __typename?: 'ChoiceReturnWidget' }
    & FlussReturnWidget_ChoiceReturnWidget_Fragment
  ) | (
    { __typename?: 'CustomReturnWidget' }
    & FlussReturnWidget_CustomReturnWidget_Fragment
  ) | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & FlussPortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & FlussPortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & FlussPortEffect_MessageEffect_Fragment
  )> | null };

export type FlussReturnChildPortFragment = { __typename: 'ReturnPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, nullable: boolean, description?: string | null, children?: Array<(
    { __typename?: 'ReturnPort' }
    & FlussReturnChildPortNestedFragment
  )> | null, widget?: (
    { __typename?: 'ChoiceReturnWidget' }
    & FlussReturnWidget_ChoiceReturnWidget_Fragment
  ) | (
    { __typename?: 'CustomReturnWidget' }
    & FlussReturnWidget_CustomReturnWidget_Fragment
  ) | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & FlussPortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & FlussPortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & FlussPortEffect_MessageEffect_Fragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null };

type FlussBaseEffect_CustomEffect_Fragment = { __typename: 'CustomEffect', kind: EffectKind, dependencies: Array<string>, source?: string | null, call: (
    { __typename?: 'UtilCall' }
    & FlussPortCallFragment
  ) };

type FlussBaseEffect_HideEffect_Fragment = { __typename: 'HideEffect', kind: EffectKind, dependencies: Array<string>, source?: string | null, call: (
    { __typename?: 'UtilCall' }
    & FlussPortCallFragment
  ) };

type FlussBaseEffect_MessageEffect_Fragment = { __typename: 'MessageEffect', kind: EffectKind, dependencies: Array<string>, source?: string | null, call: (
    { __typename?: 'UtilCall' }
    & FlussPortCallFragment
  ) };

export type FlussBaseEffectFragment = FlussBaseEffect_CustomEffect_Fragment | FlussBaseEffect_HideEffect_Fragment | FlussBaseEffect_MessageEffect_Fragment;

export type FlussCustomEffectFragment = (
  { __typename: 'CustomEffect', kind: EffectKind }
  & FlussBaseEffect_CustomEffect_Fragment
);

export type FlussMessageEffectFragment = (
  { __typename: 'MessageEffect', kind: EffectKind, message: string }
  & FlussBaseEffect_MessageEffect_Fragment
);

export type FlussHideEffectFragment = (
  { __typename: 'HideEffect', fade: boolean }
  & FlussBaseEffect_HideEffect_Fragment
);

type FlussPortEffect_CustomEffect_Fragment = (
  { __typename?: 'CustomEffect' }
  & FlussCustomEffectFragment
);

type FlussPortEffect_HideEffect_Fragment = (
  { __typename?: 'HideEffect' }
  & FlussHideEffectFragment
);

type FlussPortEffect_MessageEffect_Fragment = (
  { __typename?: 'MessageEffect' }
  & FlussMessageEffectFragment
);

export type FlussPortEffectFragment = FlussPortEffect_CustomEffect_Fragment | FlussPortEffect_HideEffect_Fragment | FlussPortEffect_MessageEffect_Fragment;

type FlussAssignWidget_ChoiceAssignWidget_Fragment = (
  { __typename: 'ChoiceAssignWidget', kind: AssignWidgetKind }
  & FlussChoiceAssignWidgetFragment
);

type FlussAssignWidget_CustomAssignWidget_Fragment = (
  { __typename: 'CustomAssignWidget', kind: AssignWidgetKind }
  & FlussCustomAssignWidgetFragment
);

type FlussAssignWidget_ProxyWidget_Fragment = (
  { __typename: 'ProxyWidget', kind: AssignWidgetKind }
  & FlussProxyWidgetFragment
);

type FlussAssignWidget_SearchAssignWidget_Fragment = (
  { __typename: 'SearchAssignWidget', kind: AssignWidgetKind }
  & FlussSearchAssignWidgetFragment
);

type FlussAssignWidget_SliderAssignWidget_Fragment = (
  { __typename: 'SliderAssignWidget', kind: AssignWidgetKind }
  & FlussSliderAssignWidgetFragment
);

type FlussAssignWidget_StateChoiceAssignWidget_Fragment = (
  { __typename: 'StateChoiceAssignWidget', kind: AssignWidgetKind }
  & FlussStateChoiceAssignWidgetFragment
);

type FlussAssignWidget_StringAssignWidget_Fragment = (
  { __typename: 'StringAssignWidget', kind: AssignWidgetKind }
  & FlussStringAssignWidgetFragment
);

export type FlussAssignWidgetFragment = FlussAssignWidget_ChoiceAssignWidget_Fragment | FlussAssignWidget_CustomAssignWidget_Fragment | FlussAssignWidget_ProxyWidget_Fragment | FlussAssignWidget_SearchAssignWidget_Fragment | FlussAssignWidget_SliderAssignWidget_Fragment | FlussAssignWidget_StateChoiceAssignWidget_Fragment | FlussAssignWidget_StringAssignWidget_Fragment;

export type ValidatorFragment = { __typename?: 'Validator', dependencies?: Array<string> | null, label?: string | null, errorMessage?: string | null, source?: string | null, call: (
    { __typename?: 'UtilCall' }
    & FlussPortCallFragment
  ) };

export type FlussArgPortFragment = { __typename: 'ArgPort', key: string, label?: string | null, nullable: boolean, description?: string | null, kind: PortKind, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, default?: any | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & FlussPortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & FlussPortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & FlussPortEffect_MessageEffect_Fragment
  )> | null, widget?: (
    { __typename?: 'ChoiceAssignWidget' }
    & FlussAssignWidget_ChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'CustomAssignWidget' }
    & FlussAssignWidget_CustomAssignWidget_Fragment
  ) | (
    { __typename?: 'ProxyWidget' }
    & FlussAssignWidget_ProxyWidget_Fragment
  ) | (
    { __typename?: 'SearchAssignWidget' }
    & FlussAssignWidget_SearchAssignWidget_Fragment
  ) | (
    { __typename?: 'SliderAssignWidget' }
    & FlussAssignWidget_SliderAssignWidget_Fragment
  ) | (
    { __typename?: 'StateChoiceAssignWidget' }
    & FlussAssignWidget_StateChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'StringAssignWidget' }
    & FlussAssignWidget_StringAssignWidget_Fragment
  ) | null, children?: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgChildPortFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, validators?: Array<(
    { __typename?: 'Validator' }
    & ValidatorFragment
  )> | null, requires?: Array<{ __typename?: 'Requires', key: string, operator: DescriptorOperator, value?: any | null }> | null };

export type FlussReturnPortFragment = { __typename: 'ReturnPort', key: string, label?: string | null, nullable: boolean, description?: string | null, kind: PortKind, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & FlussPortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & FlussPortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & FlussPortEffect_MessageEffect_Fragment
  )> | null, widget?: (
    { __typename?: 'ChoiceReturnWidget' }
    & FlussReturnWidget_ChoiceReturnWidget_Fragment
  ) | (
    { __typename?: 'CustomReturnWidget' }
    & FlussReturnWidget_CustomReturnWidget_Fragment
  ) | null, children?: Array<(
    { __typename?: 'ReturnPort' }
    & FlussReturnChildPortFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, provides?: Array<{ __typename?: 'Provides', key: string, operator: DescriptorOperator, value?: any | null }> | null };

export type FlussCustomReturnWidgetFragment = { __typename: 'CustomReturnWidget', kind: ReturnWidgetKind, component: string, props?: Array<(
    { __typename?: 'ComponentProp' }
    & FlussBlokComponentPropFragment
  )> | null };

export type FlussChoiceReturnWidgetFragment = { __typename: 'ChoiceReturnWidget', kind: ReturnWidgetKind };

type FlussReturnWidget_ChoiceReturnWidget_Fragment = (
  { __typename: 'ChoiceReturnWidget', kind: ReturnWidgetKind }
  & FlussChoiceReturnWidgetFragment
);

type FlussReturnWidget_CustomReturnWidget_Fragment = (
  { __typename: 'CustomReturnWidget', kind: ReturnWidgetKind }
  & FlussCustomReturnWidgetFragment
);

export type FlussReturnWidgetFragment = FlussReturnWidget_ChoiceReturnWidget_Fragment | FlussReturnWidget_CustomReturnWidget_Fragment;

export type FlussPortCallLeafArgumentFragment = { __typename?: 'ActionArgument', key?: string | null, valueLiteral?: any | null, valuePath?: string | null };

export type FlussPortCallLeafFragment = { __typename?: 'UtilCall', operation: string, arguments?: Array<(
    { __typename?: 'ActionArgument' }
    & FlussPortCallLeafArgumentFragment
  )> | null };

export type FlussPortCallInnerArgumentFragment = (
  { __typename?: 'ActionArgument', utilCall?: (
    { __typename?: 'UtilCall' }
    & FlussPortCallLeafFragment
  ) | null, valueList?: Array<(
    { __typename?: 'ActionArgument' }
    & FlussPortCallLeafArgumentFragment
  )> | null, valueDict?: Array<(
    { __typename?: 'ActionArgument' }
    & FlussPortCallLeafArgumentFragment
  )> | null }
  & FlussPortCallLeafArgumentFragment
);

export type FlussPortCallInnerFragment = { __typename?: 'UtilCall', operation: string, arguments?: Array<(
    { __typename?: 'ActionArgument' }
    & FlussPortCallInnerArgumentFragment
  )> | null };

export type FlussPortCallArgumentFragment = (
  { __typename?: 'ActionArgument', utilCall?: (
    { __typename?: 'UtilCall' }
    & FlussPortCallInnerFragment
  ) | null, valueList?: Array<(
    { __typename?: 'ActionArgument' }
    & FlussPortCallInnerArgumentFragment
  )> | null, valueDict?: Array<(
    { __typename?: 'ActionArgument' }
    & FlussPortCallInnerArgumentFragment
  )> | null }
  & FlussPortCallLeafArgumentFragment
);

export type FlussPortCallFragment = { __typename?: 'UtilCall', operation: string, arguments?: Array<(
    { __typename?: 'ActionArgument' }
    & FlussPortCallArgumentFragment
  )> | null };

export type FlussBlokAgentCallLeafFragment = { __typename?: 'AgentCall', dependency: string, operation: string, arguments?: Array<(
    { __typename?: 'ActionArgument' }
    & FlussPortCallLeafArgumentFragment
  )> | null };

export type FlussBlokArgumentInnerFragment = (
  { __typename?: 'ActionArgument', agentCall?: (
    { __typename?: 'AgentCall' }
    & FlussBlokAgentCallLeafFragment
  ) | null }
  & FlussPortCallInnerArgumentFragment
);

export type FlussBlokArgumentFragment = (
  { __typename?: 'ActionArgument', utilCall?: { __typename?: 'UtilCall', operation: string, arguments?: Array<(
      { __typename?: 'ActionArgument' }
      & FlussBlokArgumentInnerFragment
    )> | null } | null, agentCall?: { __typename?: 'AgentCall', dependency: string, operation: string, arguments?: Array<(
      { __typename?: 'ActionArgument' }
      & FlussBlokArgumentInnerFragment
    )> | null } | null, valueList?: Array<(
    { __typename?: 'ActionArgument' }
    & FlussBlokArgumentInnerFragment
  )> | null, valueDict?: Array<(
    { __typename?: 'ActionArgument' }
    & FlussBlokArgumentInnerFragment
  )> | null }
  & FlussPortCallLeafArgumentFragment
);

export type FlussBlokComponentPropFragment = { __typename?: 'ComponentProp', key: string, staticValue?: any | null, declaresValue?: string | null, dynamicValue?: { __typename?: 'DynamicValue', path?: string | null, literal?: string | null } | null, agentCall?: { __typename?: 'AgentCall', dependency: string, operation: string, arguments?: Array<(
      { __typename?: 'ActionArgument' }
      & FlussBlokArgumentFragment
    )> | null } | null, utilCall?: { __typename?: 'UtilCall', operation: string, arguments?: Array<(
      { __typename?: 'ActionArgument' }
      & FlussBlokArgumentFragment
    )> | null } | null };

export type ReactiveTemplateFragment = { __typename?: 'ReactiveTemplate', id: string, implementation: ReactiveImplementation, title: string, description?: string | null, ins: Array<Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )>>, outs: Array<Array<(
    { __typename?: 'ReturnPort' }
    & FlussReturnPortFragment
  )>>, constants: Array<(
    { __typename?: 'ArgPort' }
    & FlussArgPortFragment
  )> };

export type ListReactiveTemplatesFragment = { __typename?: 'ReactiveTemplate', id: string, title: string, description?: string | null, implementation: ReactiveImplementation };

export type RunEventFragment = { __typename?: 'RunEvent', id: string, source: string, handle: string, kind: RunEventKind, createdAt: any, exception?: string | null, value?: any | null, t: number, causedBy: Array<string> };

export type SnapshotFragment = { __typename?: 'Snapshot', id: string, status?: string | null, t: number, run: { __typename?: 'Run', id: string, taskId: string }, events: Array<(
    { __typename?: 'RunEvent' }
    & RunEventFragment
  )> };

export type ListSnapshotFragment = { __typename?: 'Snapshot', id: string, t: number, run: { __typename?: 'Run', id: string, taskId: string } };

export type DetailRunFragment = { __typename?: 'Run', id: string, taskId: string, createdAt: any, status: RunStatus, snapshots: Array<{ __typename?: 'Snapshot', id: string, status?: string | null, t: number, createdAt: any }>, latestSnapshot?: { __typename?: 'Snapshot', createdAt: any, t: number, events: Array<(
      { __typename?: 'RunEvent' }
      & RunEventFragment
    )> } | null, flow: (
    { __typename?: 'Flow' }
    & FlowFragment
  ) };

export type ListRunFragment = { __typename?: 'Run', id: string, taskId: string, createdAt: any, status: RunStatus, flow: { __typename?: 'Flow', id: string, title: string, workspace: { __typename?: 'Workspace', id: string, title: string } } };

export type CarouselRunFragment = { __typename?: 'Run', id: string, taskId: string, createdAt: any, status: RunStatus, snapshots: Array<{ __typename?: 'Snapshot', id: string, status?: string | null, t: number, createdAt: any }>, latestSnapshot?: { __typename?: 'Snapshot', createdAt: any, t: number, events: Array<(
      { __typename?: 'RunEvent' }
      & RunEventFragment
    )> } | null, flow: (
    { __typename?: 'Flow' }
    & FlowFragment
  ) };

export type UpdateWorkspaceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  graph: GraphInput;
}>;


export type UpdateWorkspaceMutation = { __typename?: 'Mutation', updateWorkspace: (
    { __typename?: 'Workspace' }
    & WorkspaceFragment
  ) };

export type CreateWorkspaceMutationVariables = Exact<{
  name?: InputMaybe<Scalars['String']['input']>;
}>;


export type CreateWorkspaceMutation = { __typename?: 'Mutation', createWorkspace: (
    { __typename?: 'Workspace' }
    & ListWorkspaceFragment
  ) };

export type FlowQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type FlowQuery = { __typename?: 'Query', flow: (
    { __typename?: 'Flow' }
    & FlowFragment
  ) };

export type FlowsQueryVariables = Exact<{
  filters?: InputMaybe<FlowFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
  ordering?: InputMaybe<Array<FlowOrder> | FlowOrder>;
}>;


export type FlowsQuery = { __typename?: 'Query', flows: Array<(
    { __typename?: 'Flow' }
    & ListFlowFragment
  )> };

export type HomePageStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type HomePageStatsQuery = { __typename?: 'Query', workspaceStats: { __typename?: 'WorkspaceStats', count: number } };

export type ReactiveTemplatesQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ReactiveTemplatesQuery = { __typename?: 'Query', reactiveTemplates: Array<(
    { __typename?: 'ReactiveTemplate' }
    & ReactiveTemplateFragment
  )> };

export type ReactiveTemplateQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type ReactiveTemplateQuery = { __typename?: 'Query', reactiveTemplate: (
    { __typename?: 'ReactiveTemplate' }
    & ReactiveTemplateFragment
  ) };

export type SnapshotsQueryVariables = Exact<{ [key: string]: never; }>;


export type SnapshotsQuery = { __typename?: 'Query', snapshots: Array<(
    { __typename?: 'Snapshot' }
    & ListSnapshotFragment
  )> };

export type DetailSnapshotQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailSnapshotQuery = { __typename?: 'Query', snapshot: (
    { __typename?: 'Snapshot' }
    & SnapshotFragment
  ) };

export type RunForTaskQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RunForTaskQuery = { __typename?: 'Query', runForTask: (
    { __typename?: 'Run' }
    & DetailRunFragment
  ) };

export type EventsBetweenQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  min?: InputMaybe<Scalars['Int']['input']>;
  max?: InputMaybe<Scalars['Int']['input']>;
}>;


export type EventsBetweenQuery = { __typename?: 'Query', eventsBetween: Array<(
    { __typename?: 'RunEvent' }
    & RunEventFragment
  )> };

export type ListRunsQueryVariables = Exact<{
  filters?: InputMaybe<RunFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
  ordering?: InputMaybe<Array<RunOrder> | RunOrder>;
}>;


export type ListRunsQuery = { __typename?: 'Query', runs: Array<(
    { __typename?: 'Run' }
    & ListRunFragment
  )> };

export type GetRunQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetRunQuery = { __typename?: 'Query', run: (
    { __typename?: 'Run' }
    & DetailRunFragment
  ) };

export type RunCarouselQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<RunFilter>;
  ordering?: InputMaybe<Array<RunOrder> | RunOrder>;
}>;


export type RunCarouselQuery = { __typename?: 'Query', runs: Array<(
    { __typename?: 'Run' }
    & CarouselRunFragment
  )> };

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', workspaces: Array<(
    { __typename?: 'Workspace' }
    & ListWorkspaceFragment
  )> };

export type WorkspaceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type WorkspaceQuery = { __typename?: 'Query', workspace: (
    { __typename?: 'Workspace' }
    & WorkspaceFragment
  ) };

export type WorkspacesQueryVariables = Exact<{
  filters?: InputMaybe<WorkspaceFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
  ordering?: InputMaybe<Array<WorkspaceOrder> | WorkspaceOrder>;
}>;


export type WorkspacesQuery = { __typename?: 'Query', workspaces: Array<(
    { __typename?: 'Workspace' }
    & ListWorkspaceFragment
  )> };

export type WorkspaceCarouselQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<WorkspaceFilter>;
  ordering?: InputMaybe<Array<WorkspaceOrder> | WorkspaceOrder>;
}>;


export type WorkspaceCarouselQuery = { __typename?: 'Query', workspaces: Array<(
    { __typename?: 'Workspace' }
    & CarouselWorkspaceFragment
  )> };

export type EventsSubscriptionVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type EventsSubscription = { __typename?: 'Subscription', events: (
    { __typename?: 'RunEvent' }
    & RunEventFragment
  ) };

export const ListFlowFragmentDoc = gql`
    fragment ListFlow on Flow {
  id
  title
  description
  createdAt
  workspace {
    id
    title
  }
}
    `;
export const ListWorkspaceFragmentDoc = gql`
    fragment ListWorkspace on Workspace {
  id
  title
  description
  createdAt
  latestFlow {
    ...ListFlow
  }
}
    ${ListFlowFragmentDoc}`;
export const FlussPortCallLeafArgumentFragmentDoc = gql`
    fragment FlussPortCallLeafArgument on ActionArgument {
  key
  valueLiteral
  valuePath
}
    `;
export const FlussPortCallLeafFragmentDoc = gql`
    fragment FlussPortCallLeaf on UtilCall {
  operation
  arguments {
    ...FlussPortCallLeafArgument
  }
}
    ${FlussPortCallLeafArgumentFragmentDoc}`;
export const FlussPortCallInnerArgumentFragmentDoc = gql`
    fragment FlussPortCallInnerArgument on ActionArgument {
  ...FlussPortCallLeafArgument
  utilCall {
    ...FlussPortCallLeaf
  }
  valueList {
    ...FlussPortCallLeafArgument
  }
  valueDict {
    ...FlussPortCallLeafArgument
  }
}
    ${FlussPortCallLeafArgumentFragmentDoc}
${FlussPortCallLeafFragmentDoc}`;
export const FlussPortCallInnerFragmentDoc = gql`
    fragment FlussPortCallInner on UtilCall {
  operation
  arguments {
    ...FlussPortCallInnerArgument
  }
}
    ${FlussPortCallInnerArgumentFragmentDoc}`;
export const FlussPortCallArgumentFragmentDoc = gql`
    fragment FlussPortCallArgument on ActionArgument {
  ...FlussPortCallLeafArgument
  utilCall {
    ...FlussPortCallInner
  }
  valueList {
    ...FlussPortCallInnerArgument
  }
  valueDict {
    ...FlussPortCallInnerArgument
  }
}
    ${FlussPortCallLeafArgumentFragmentDoc}
${FlussPortCallInnerFragmentDoc}
${FlussPortCallInnerArgumentFragmentDoc}`;
export const FlussPortCallFragmentDoc = gql`
    fragment FlussPortCall on UtilCall {
  operation
  arguments {
    ...FlussPortCallArgument
  }
}
    ${FlussPortCallArgumentFragmentDoc}`;
export const FlussBaseEffectFragmentDoc = gql`
    fragment FlussBaseEffect on Effect {
  __typename
  kind
  dependencies
  source
  call {
    ...FlussPortCall
  }
}
    ${FlussPortCallFragmentDoc}`;
export const FlussCustomEffectFragmentDoc = gql`
    fragment FlussCustomEffect on CustomEffect {
  ...FlussBaseEffect
  __typename
  kind
}
    ${FlussBaseEffectFragmentDoc}`;
export const FlussMessageEffectFragmentDoc = gql`
    fragment FlussMessageEffect on MessageEffect {
  ...FlussBaseEffect
  __typename
  kind
  message
}
    ${FlussBaseEffectFragmentDoc}`;
export const FlussHideEffectFragmentDoc = gql`
    fragment FlussHideEffect on HideEffect {
  ...FlussBaseEffect
  __typename
  fade
}
    ${FlussBaseEffectFragmentDoc}`;
export const FlussPortEffectFragmentDoc = gql`
    fragment FlussPortEffect on Effect {
  ...FlussCustomEffect
  ...FlussMessageEffect
  ...FlussHideEffect
}
    ${FlussCustomEffectFragmentDoc}
${FlussMessageEffectFragmentDoc}
${FlussHideEffectFragmentDoc}`;
export const FlussStringAssignWidgetFragmentDoc = gql`
    fragment FlussStringAssignWidget on StringAssignWidget {
  __typename
  kind
  placeholder
  asParagraph
}
    `;
export const FlussFilterPortFragmentDoc = gql`
    fragment FlussFilterPort on ArgPort {
  __typename
  kind
  key
  identifier
  widget {
    ... on SearchAssignWidget {
      query
    }
  }
  description
  nullable
}
    `;
export const FlussSearchAssignWidgetFragmentDoc = gql`
    fragment FlussSearchAssignWidget on SearchAssignWidget {
  __typename
  kind
  query
  ward
  filters {
    ...FlussFilterPort
  }
  dependencies
}
    ${FlussFilterPortFragmentDoc}`;
export const FlussSliderAssignWidgetFragmentDoc = gql`
    fragment FlussSliderAssignWidget on SliderAssignWidget {
  __typename
  kind
  min
  max
  step
}
    `;
export const FlussChoiceAssignWidgetFragmentDoc = gql`
    fragment FlussChoiceAssignWidget on ChoiceAssignWidget {
  __typename
  kind
  followValue
  placeholder
}
    `;
export const FlussProxyWidgetFragmentDoc = gql`
    fragment FlussProxyWidget on ProxyWidget {
  __typename
  kind
  targetPort
  targetAction
  targetDependency
}
    `;
export const FlussBlokAgentCallLeafFragmentDoc = gql`
    fragment FlussBlokAgentCallLeaf on AgentCall {
  dependency
  operation
  arguments {
    ...FlussPortCallLeafArgument
  }
}
    ${FlussPortCallLeafArgumentFragmentDoc}`;
export const FlussBlokArgumentInnerFragmentDoc = gql`
    fragment FlussBlokArgumentInner on ActionArgument {
  ...FlussPortCallInnerArgument
  agentCall {
    ...FlussBlokAgentCallLeaf
  }
}
    ${FlussPortCallInnerArgumentFragmentDoc}
${FlussBlokAgentCallLeafFragmentDoc}`;
export const FlussBlokArgumentFragmentDoc = gql`
    fragment FlussBlokArgument on ActionArgument {
  ...FlussPortCallLeafArgument
  utilCall {
    operation
    arguments {
      ...FlussBlokArgumentInner
    }
  }
  agentCall {
    dependency
    operation
    arguments {
      ...FlussBlokArgumentInner
    }
  }
  valueList {
    ...FlussBlokArgumentInner
  }
  valueDict {
    ...FlussBlokArgumentInner
  }
}
    ${FlussPortCallLeafArgumentFragmentDoc}
${FlussBlokArgumentInnerFragmentDoc}`;
export const FlussBlokComponentPropFragmentDoc = gql`
    fragment FlussBlokComponentProp on ComponentProp {
  key
  staticValue
  declaresValue
  dynamicValue {
    path
    literal
  }
  agentCall {
    dependency
    operation
    arguments {
      ...FlussBlokArgument
    }
  }
  utilCall {
    operation
    arguments {
      ...FlussBlokArgument
    }
  }
}
    ${FlussBlokArgumentFragmentDoc}`;
export const FlussStateChoiceAssignWidgetFragmentDoc = gql`
    fragment FlussStateChoiceAssignWidget on StateChoiceAssignWidget {
  __typename
  kind
  followValue
  statePath
  stateCall {
    ...FlussPortCall
  }
  stateAccessors {
    optionKey
    path
    call {
      ...FlussPortCall
    }
  }
  dependency
  dependencies
}
    ${FlussPortCallFragmentDoc}`;
export const FlussCustomAssignWidgetFragmentDoc = gql`
    fragment FlussCustomAssignWidget on CustomAssignWidget {
  __typename
  kind
  followValue
  component
  props {
    ...FlussBlokComponentProp
  }
  dependencies
  fallback {
    __typename
    kind
    ...FlussStringAssignWidget
    ...FlussSearchAssignWidget
    ...FlussSliderAssignWidget
    ...FlussChoiceAssignWidget
    ...FlussProxyWidget
    ...FlussStateChoiceAssignWidget
  }
}
    ${FlussBlokComponentPropFragmentDoc}
${FlussStringAssignWidgetFragmentDoc}
${FlussSearchAssignWidgetFragmentDoc}
${FlussSliderAssignWidgetFragmentDoc}
${FlussChoiceAssignWidgetFragmentDoc}
${FlussProxyWidgetFragmentDoc}
${FlussStateChoiceAssignWidgetFragmentDoc}`;
export const FlussAssignWidgetFragmentDoc = gql`
    fragment FlussAssignWidget on AssignWidget {
  __typename
  kind
  ...FlussStringAssignWidget
  ...FlussSearchAssignWidget
  ...FlussSliderAssignWidget
  ...FlussChoiceAssignWidget
  ...FlussProxyWidget
  ...FlussCustomAssignWidget
  ...FlussStateChoiceAssignWidget
}
    ${FlussStringAssignWidgetFragmentDoc}
${FlussSearchAssignWidgetFragmentDoc}
${FlussSliderAssignWidgetFragmentDoc}
${FlussChoiceAssignWidgetFragmentDoc}
${FlussProxyWidgetFragmentDoc}
${FlussCustomAssignWidgetFragmentDoc}
${FlussStateChoiceAssignWidgetFragmentDoc}`;
export const FlussArgChildPortDeepFragmentDoc = gql`
    fragment FlussArgChildPortDeep on ArgPort {
  __typename
  kind
  key
  label
  identifier
  referenceUnit
  proposedUnits
  dimension
  choices {
    value
    label
    description
  }
  widget {
    ...FlussAssignWidget
  }
  description
  nullable
  default
  children {
    __typename
    kind
    key
    identifier
    nullable
    widget {
      ...FlussAssignWidget
    }
  }
}
    ${FlussAssignWidgetFragmentDoc}`;
export const ValidatorFragmentDoc = gql`
    fragment Validator on Validator {
  call {
    ...FlussPortCall
  }
  dependencies
  label
  errorMessage
  source
}
    ${FlussPortCallFragmentDoc}`;
export const FlussArgChildPortNestedFragmentDoc = gql`
    fragment FlussArgChildPortNested on ArgPort {
  __typename
  kind
  key
  label
  identifier
  referenceUnit
  proposedUnits
  dimension
  children {
    ...FlussArgChildPortDeep
  }
  choices {
    value
    label
    description
  }
  widget {
    ...FlussAssignWidget
  }
  effects {
    ...FlussPortEffect
  }
  validators {
    ...Validator
  }
  description
  nullable
  default
}
    ${FlussArgChildPortDeepFragmentDoc}
${FlussAssignWidgetFragmentDoc}
${FlussPortEffectFragmentDoc}
${ValidatorFragmentDoc}`;
export const FlussArgChildPortFragmentDoc = gql`
    fragment FlussArgChildPort on ArgPort {
  __typename
  kind
  key
  label
  identifier
  referenceUnit
  proposedUnits
  dimension
  children {
    ...FlussArgChildPortNested
  }
  widget {
    ...FlussAssignWidget
  }
  effects {
    ...FlussPortEffect
  }
  validators {
    ...Validator
  }
  choices {
    value
    label
    description
  }
  nullable
  description
  default
}
    ${FlussArgChildPortNestedFragmentDoc}
${FlussAssignWidgetFragmentDoc}
${FlussPortEffectFragmentDoc}
${ValidatorFragmentDoc}`;
export const FlussArgPortFragmentDoc = gql`
    fragment FlussArgPort on ArgPort {
  __typename
  key
  label
  nullable
  description
  effects {
    ...FlussPortEffect
  }
  widget {
    ...FlussAssignWidget
  }
  kind
  identifier
  referenceUnit
  proposedUnits
  dimension
  children {
    ...FlussArgChildPort
  }
  choices {
    value
    label
    description
  }
  default
  nullable
  validators {
    ...Validator
  }
  requires {
    key
    operator
    value
  }
}
    ${FlussPortEffectFragmentDoc}
${FlussAssignWidgetFragmentDoc}
${FlussArgChildPortFragmentDoc}
${ValidatorFragmentDoc}`;
export const FlussCustomReturnWidgetFragmentDoc = gql`
    fragment FlussCustomReturnWidget on CustomReturnWidget {
  __typename
  kind
  component
  props {
    ...FlussBlokComponentProp
  }
}
    ${FlussBlokComponentPropFragmentDoc}`;
export const FlussChoiceReturnWidgetFragmentDoc = gql`
    fragment FlussChoiceReturnWidget on ChoiceReturnWidget {
  __typename
  kind
}
    `;
export const FlussReturnWidgetFragmentDoc = gql`
    fragment FlussReturnWidget on ReturnWidget {
  __typename
  kind
  ...FlussCustomReturnWidget
  ...FlussChoiceReturnWidget
}
    ${FlussCustomReturnWidgetFragmentDoc}
${FlussChoiceReturnWidgetFragmentDoc}`;
export const FlussReturnChildPortDeepFragmentDoc = gql`
    fragment FlussReturnChildPortDeep on ReturnPort {
  __typename
  kind
  key
  label
  identifier
  referenceUnit
  proposedUnits
  dimension
  choices {
    value
    label
    description
  }
  widget {
    ...FlussReturnWidget
  }
  description
  nullable
  children {
    __typename
    kind
    key
    identifier
    nullable
    widget {
      ...FlussReturnWidget
    }
  }
}
    ${FlussReturnWidgetFragmentDoc}`;
export const FlussReturnChildPortNestedFragmentDoc = gql`
    fragment FlussReturnChildPortNested on ReturnPort {
  __typename
  kind
  key
  label
  identifier
  referenceUnit
  proposedUnits
  dimension
  children {
    ...FlussReturnChildPortDeep
  }
  choices {
    value
    label
    description
  }
  widget {
    ...FlussReturnWidget
  }
  effects {
    ...FlussPortEffect
  }
  description
  nullable
}
    ${FlussReturnChildPortDeepFragmentDoc}
${FlussReturnWidgetFragmentDoc}
${FlussPortEffectFragmentDoc}`;
export const FlussReturnChildPortFragmentDoc = gql`
    fragment FlussReturnChildPort on ReturnPort {
  __typename
  kind
  key
  label
  identifier
  referenceUnit
  proposedUnits
  dimension
  children {
    ...FlussReturnChildPortNested
  }
  widget {
    ...FlussReturnWidget
  }
  effects {
    ...FlussPortEffect
  }
  choices {
    value
    label
    description
  }
  nullable
  description
}
    ${FlussReturnChildPortNestedFragmentDoc}
${FlussReturnWidgetFragmentDoc}
${FlussPortEffectFragmentDoc}`;
export const FlussReturnPortFragmentDoc = gql`
    fragment FlussReturnPort on ReturnPort {
  __typename
  key
  label
  nullable
  description
  effects {
    ...FlussPortEffect
  }
  widget {
    ...FlussReturnWidget
  }
  kind
  identifier
  referenceUnit
  proposedUnits
  dimension
  children {
    ...FlussReturnChildPort
  }
  choices {
    value
    label
    description
  }
  nullable
  provides {
    key
    operator
    value
  }
}
    ${FlussPortEffectFragmentDoc}
${FlussReturnWidgetFragmentDoc}
${FlussReturnChildPortFragmentDoc}`;
export const BaseGraphNodeFragmentDoc = gql`
    fragment BaseGraphNode on GraphNode {
  __typename
  ins {
    ...FlussArgPort
  }
  outs {
    ...FlussReturnPort
  }
  constants {
    ...FlussArgPort
  }
  voids {
    ...FlussArgPort
  }
  globalsMap
  constantsMap
  title
  description
  kind
}
    ${FlussArgPortFragmentDoc}
${FlussReturnPortFragmentDoc}`;
export const RetriableNodeFragmentDoc = gql`
    fragment RetriableNode on RetriableNode {
  retries
  retryDelay
}
    `;
export const AssignableNodeFragmentDoc = gql`
    fragment AssignableNode on AssignableNode {
  nextTimeout
}
    `;
export const RekuestActionNodeFragmentDoc = gql`
    fragment RekuestActionNode on RekuestActionNode {
  hash
  mapStrategy
  allowLocalExecution
  actionKind
}
    `;
export const RekuestFilterActionNodeFragmentDoc = gql`
    fragment RekuestFilterActionNode on RekuestFilterActionNode {
  ...BaseGraphNode
  ...RetriableNode
  ...AssignableNode
  ...RekuestActionNode
  __typename
  path
}
    ${BaseGraphNodeFragmentDoc}
${RetriableNodeFragmentDoc}
${AssignableNodeFragmentDoc}
${RekuestActionNodeFragmentDoc}`;
export const RekuestMapActionNodeFragmentDoc = gql`
    fragment RekuestMapActionNode on RekuestMapActionNode {
  ...BaseGraphNode
  ...RetriableNode
  ...AssignableNode
  ...RekuestActionNode
  __typename
  hello
}
    ${BaseGraphNodeFragmentDoc}
${RetriableNodeFragmentDoc}
${AssignableNodeFragmentDoc}
${RekuestActionNodeFragmentDoc}`;
export const ReactiveNodeFragmentDoc = gql`
    fragment ReactiveNode on ReactiveNode {
  ...BaseGraphNode
  __typename
  implementation
}
    ${BaseGraphNodeFragmentDoc}`;
export const ArgNodeFragmentDoc = gql`
    fragment ArgNode on ArgNode {
  ...BaseGraphNode
  __typename
}
    ${BaseGraphNodeFragmentDoc}`;
export const ReturnNodeFragmentDoc = gql`
    fragment ReturnNode on ReturnNode {
  ...BaseGraphNode
  __typename
}
    ${BaseGraphNodeFragmentDoc}`;
export const AgentSubFlowNodeFragmentDoc = gql`
    fragment AgentSubFlowNode on AgentSubFlowNode {
  ...BaseGraphNode
  __typename
  appFilter
  versionFilter
  instanceFilter
  deviceFilter
  userFilter
  autoResolvable
}
    ${BaseGraphNodeFragmentDoc}`;
export const GraphNodeFragmentDoc = gql`
    fragment GraphNode on GraphNode {
  __typename
  id
  position {
    x
    y
  }
  parentNode
  ...RekuestFilterActionNode
  ...RekuestMapActionNode
  ...ReactiveNode
  ...ArgNode
  ...ReturnNode
  ...AgentSubFlowNode
}
    ${RekuestFilterActionNodeFragmentDoc}
${RekuestMapActionNodeFragmentDoc}
${ReactiveNodeFragmentDoc}
${ArgNodeFragmentDoc}
${ReturnNodeFragmentDoc}
${AgentSubFlowNodeFragmentDoc}`;
export const StreamItemFragmentDoc = gql`
    fragment StreamItem on StreamItem {
  kind
  label
}
    `;
export const BaseGraphEdgeFragmentDoc = gql`
    fragment BaseGraphEdge on GraphEdge {
  __typename
  id
  source
  sourceHandle
  target
  targetHandle
  kind
  stream {
    ...StreamItem
  }
}
    ${StreamItemFragmentDoc}`;
export const LoggingEdgeFragmentDoc = gql`
    fragment LoggingEdge on LoggingEdge {
  ...BaseGraphEdge
  level
}
    ${BaseGraphEdgeFragmentDoc}`;
export const VanillaEdgeFragmentDoc = gql`
    fragment VanillaEdge on VanillaEdge {
  ...BaseGraphEdge
  __typename
}
    ${BaseGraphEdgeFragmentDoc}`;
export const GraphEdgeFragmentDoc = gql`
    fragment GraphEdge on GraphEdge {
  ...LoggingEdge
  ...VanillaEdge
}
    ${LoggingEdgeFragmentDoc}
${VanillaEdgeFragmentDoc}`;
export const GlobalArgFragmentDoc = gql`
    fragment GlobalArg on GlobalArg {
  key
  port {
    ...FlussArgPort
  }
}
    ${FlussArgPortFragmentDoc}`;
export const GraphFragmentDoc = gql`
    fragment Graph on Graph {
  nodes {
    ...GraphNode
  }
  edges {
    ...GraphEdge
  }
  globals {
    ...GlobalArg
  }
}
    ${GraphNodeFragmentDoc}
${GraphEdgeFragmentDoc}
${GlobalArgFragmentDoc}`;
export const FlowFragmentDoc = gql`
    fragment Flow on Flow {
  __typename
  id
  graph {
    ...Graph
  }
  title
  description
  createdAt
  workspace {
    id
  }
}
    ${GraphFragmentDoc}`;
export const WorkspaceFragmentDoc = gql`
    fragment Workspace on Workspace {
  id
  title
  latestFlow {
    ...Flow
  }
  flows {
    ...ListFlow
  }
}
    ${FlowFragmentDoc}
${ListFlowFragmentDoc}`;
export const CarouselWorkspaceFragmentDoc = gql`
    fragment CarouselWorkspace on Workspace {
  id
  title
  description
  latestFlow {
    ...Flow
  }
}
    ${FlowFragmentDoc}`;
export const ReactiveTemplateFragmentDoc = gql`
    fragment ReactiveTemplate on ReactiveTemplate {
  id
  ins {
    ...FlussArgPort
  }
  outs {
    ...FlussReturnPort
  }
  constants {
    ...FlussArgPort
  }
  implementation
  title
  description
}
    ${FlussArgPortFragmentDoc}
${FlussReturnPortFragmentDoc}`;
export const ListReactiveTemplatesFragmentDoc = gql`
    fragment ListReactiveTemplates on ReactiveTemplate {
  id
  title
  description
  implementation
}
    `;
export const RunEventFragmentDoc = gql`
    fragment RunEvent on RunEvent {
  id
  source
  handle
  kind
  createdAt
  exception
  value
  t
  causedBy
}
    `;
export const SnapshotFragmentDoc = gql`
    fragment Snapshot on Snapshot {
  id
  run {
    id
    taskId
  }
  status
  events {
    ...RunEvent
  }
  t
}
    ${RunEventFragmentDoc}`;
export const ListSnapshotFragmentDoc = gql`
    fragment ListSnapshot on Snapshot {
  id
  run {
    id
    taskId
  }
  t
}
    `;
export const DetailRunFragmentDoc = gql`
    fragment DetailRun on Run {
  id
  taskId
  snapshots {
    id
    status
    t
    createdAt
  }
  createdAt
  latestSnapshot {
    createdAt
    events {
      ...RunEvent
    }
    t
  }
  status
  flow {
    ...Flow
  }
}
    ${RunEventFragmentDoc}
${FlowFragmentDoc}`;
export const ListRunFragmentDoc = gql`
    fragment ListRun on Run {
  id
  taskId
  createdAt
  status
  flow {
    id
    title
    workspace {
      id
      title
    }
  }
}
    `;
export const CarouselRunFragmentDoc = gql`
    fragment CarouselRun on Run {
  id
  taskId
  snapshots {
    id
    status
    t
    createdAt
  }
  createdAt
  latestSnapshot {
    createdAt
    events {
      ...RunEvent
    }
    t
  }
  status
  flow {
    ...Flow
  }
}
    ${RunEventFragmentDoc}
${FlowFragmentDoc}`;
export const UpdateWorkspaceDocument = gql`
    mutation UpdateWorkspace($id: ID!, $graph: GraphInput!) {
  updateWorkspace(input: {workspace: $id, graph: $graph}) {
    ...Workspace
  }
}
    ${WorkspaceFragmentDoc}`;
export type UpdateWorkspaceMutationFn = Apollo.MutationFunction<UpdateWorkspaceMutation, UpdateWorkspaceMutationVariables>;

/**
 * __useUpdateWorkspaceMutation__
 *
 * To run a mutation, you first call `useUpdateWorkspaceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateWorkspaceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateWorkspaceMutation, { data, loading, error }] = useUpdateWorkspaceMutation({
 *   variables: {
 *      id: // value for 'id'
 *      graph: // value for 'graph'
 *   },
 * });
 */
export function useUpdateWorkspaceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateWorkspaceMutation, UpdateWorkspaceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateWorkspaceMutation, UpdateWorkspaceMutationVariables>(UpdateWorkspaceDocument, options);
      }
export type UpdateWorkspaceMutationHookResult = ReturnType<typeof useUpdateWorkspaceMutation>;
export type UpdateWorkspaceMutationResult = Apollo.MutationResult<UpdateWorkspaceMutation>;
export type UpdateWorkspaceMutationOptions = Apollo.BaseMutationOptions<UpdateWorkspaceMutation, UpdateWorkspaceMutationVariables>;
export const CreateWorkspaceDocument = gql`
    mutation CreateWorkspace($name: String) {
  createWorkspace(input: {title: $name}) {
    ...ListWorkspace
  }
}
    ${ListWorkspaceFragmentDoc}`;
export type CreateWorkspaceMutationFn = Apollo.MutationFunction<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>;

/**
 * __useCreateWorkspaceMutation__
 *
 * To run a mutation, you first call `useCreateWorkspaceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateWorkspaceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createWorkspaceMutation, { data, loading, error }] = useCreateWorkspaceMutation({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCreateWorkspaceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>(CreateWorkspaceDocument, options);
      }
export type CreateWorkspaceMutationHookResult = ReturnType<typeof useCreateWorkspaceMutation>;
export type CreateWorkspaceMutationResult = Apollo.MutationResult<CreateWorkspaceMutation>;
export type CreateWorkspaceMutationOptions = Apollo.BaseMutationOptions<CreateWorkspaceMutation, CreateWorkspaceMutationVariables>;
export const FlowDocument = gql`
    query Flow($id: ID!) {
  flow(id: $id) {
    ...Flow
  }
}
    ${FlowFragmentDoc}`;

/**
 * __useFlowQuery__
 *
 * To run a query within a React component, call `useFlowQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useFlowQuery(baseOptions: ApolloReactHooks.QueryHookOptions<FlowQuery, FlowQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<FlowQuery, FlowQueryVariables>(FlowDocument, options);
      }
export function useFlowLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<FlowQuery, FlowQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<FlowQuery, FlowQueryVariables>(FlowDocument, options);
        }
export type FlowQueryHookResult = ReturnType<typeof useFlowQuery>;
export type FlowLazyQueryHookResult = ReturnType<typeof useFlowLazyQuery>;
export type FlowQueryResult = Apollo.QueryResult<FlowQuery, FlowQueryVariables>;
export const FlowsDocument = gql`
    query Flows($filters: FlowFilter, $pagination: OffsetPaginationInput, $ordering: [FlowOrder!]) {
  flows(filters: $filters, pagination: $pagination, ordering: $ordering) {
    ...ListFlow
  }
}
    ${ListFlowFragmentDoc}`;

/**
 * __useFlowsQuery__
 *
 * To run a query within a React component, call `useFlowsQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlowsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlowsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useFlowsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<FlowsQuery, FlowsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<FlowsQuery, FlowsQueryVariables>(FlowsDocument, options);
      }
export function useFlowsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<FlowsQuery, FlowsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<FlowsQuery, FlowsQueryVariables>(FlowsDocument, options);
        }
export type FlowsQueryHookResult = ReturnType<typeof useFlowsQuery>;
export type FlowsLazyQueryHookResult = ReturnType<typeof useFlowsLazyQuery>;
export type FlowsQueryResult = Apollo.QueryResult<FlowsQuery, FlowsQueryVariables>;
export const HomePageStatsDocument = gql`
    query HomePageStats {
  workspaceStats {
    count
  }
}
    `;

/**
 * __useHomePageStatsQuery__
 *
 * To run a query within a React component, call `useHomePageStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useHomePageStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHomePageStatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useHomePageStatsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<HomePageStatsQuery, HomePageStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<HomePageStatsQuery, HomePageStatsQueryVariables>(HomePageStatsDocument, options);
      }
export function useHomePageStatsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<HomePageStatsQuery, HomePageStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<HomePageStatsQuery, HomePageStatsQueryVariables>(HomePageStatsDocument, options);
        }
export type HomePageStatsQueryHookResult = ReturnType<typeof useHomePageStatsQuery>;
export type HomePageStatsLazyQueryHookResult = ReturnType<typeof useHomePageStatsLazyQuery>;
export type HomePageStatsQueryResult = Apollo.QueryResult<HomePageStatsQuery, HomePageStatsQueryVariables>;
export const ReactiveTemplatesDocument = gql`
    query ReactiveTemplates($pagination: OffsetPaginationInput) {
  reactiveTemplates(pagination: $pagination) {
    ...ReactiveTemplate
  }
}
    ${ReactiveTemplateFragmentDoc}`;

/**
 * __useReactiveTemplatesQuery__
 *
 * To run a query within a React component, call `useReactiveTemplatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useReactiveTemplatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReactiveTemplatesQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useReactiveTemplatesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ReactiveTemplatesQuery, ReactiveTemplatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ReactiveTemplatesQuery, ReactiveTemplatesQueryVariables>(ReactiveTemplatesDocument, options);
      }
export function useReactiveTemplatesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ReactiveTemplatesQuery, ReactiveTemplatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ReactiveTemplatesQuery, ReactiveTemplatesQueryVariables>(ReactiveTemplatesDocument, options);
        }
export type ReactiveTemplatesQueryHookResult = ReturnType<typeof useReactiveTemplatesQuery>;
export type ReactiveTemplatesLazyQueryHookResult = ReturnType<typeof useReactiveTemplatesLazyQuery>;
export type ReactiveTemplatesQueryResult = Apollo.QueryResult<ReactiveTemplatesQuery, ReactiveTemplatesQueryVariables>;
export const ReactiveTemplateDocument = gql`
    query ReactiveTemplate($id: ID!) {
  reactiveTemplate(id: $id) {
    ...ReactiveTemplate
  }
}
    ${ReactiveTemplateFragmentDoc}`;

/**
 * __useReactiveTemplateQuery__
 *
 * To run a query within a React component, call `useReactiveTemplateQuery` and pass it any options that fit your needs.
 * When your component renders, `useReactiveTemplateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReactiveTemplateQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useReactiveTemplateQuery(baseOptions: ApolloReactHooks.QueryHookOptions<ReactiveTemplateQuery, ReactiveTemplateQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ReactiveTemplateQuery, ReactiveTemplateQueryVariables>(ReactiveTemplateDocument, options);
      }
export function useReactiveTemplateLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ReactiveTemplateQuery, ReactiveTemplateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ReactiveTemplateQuery, ReactiveTemplateQueryVariables>(ReactiveTemplateDocument, options);
        }
export type ReactiveTemplateQueryHookResult = ReturnType<typeof useReactiveTemplateQuery>;
export type ReactiveTemplateLazyQueryHookResult = ReturnType<typeof useReactiveTemplateLazyQuery>;
export type ReactiveTemplateQueryResult = Apollo.QueryResult<ReactiveTemplateQuery, ReactiveTemplateQueryVariables>;
export const SnapshotsDocument = gql`
    query Snapshots {
  snapshots {
    ...ListSnapshot
  }
}
    ${ListSnapshotFragmentDoc}`;

/**
 * __useSnapshotsQuery__
 *
 * To run a query within a React component, call `useSnapshotsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSnapshotsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSnapshotsQuery({
 *   variables: {
 *   },
 * });
 */
export function useSnapshotsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SnapshotsQuery, SnapshotsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SnapshotsQuery, SnapshotsQueryVariables>(SnapshotsDocument, options);
      }
export function useSnapshotsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SnapshotsQuery, SnapshotsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SnapshotsQuery, SnapshotsQueryVariables>(SnapshotsDocument, options);
        }
export type SnapshotsQueryHookResult = ReturnType<typeof useSnapshotsQuery>;
export type SnapshotsLazyQueryHookResult = ReturnType<typeof useSnapshotsLazyQuery>;
export type SnapshotsQueryResult = Apollo.QueryResult<SnapshotsQuery, SnapshotsQueryVariables>;
export const DetailSnapshotDocument = gql`
    query DetailSnapshot($id: ID!) {
  snapshot(id: $id) {
    ...Snapshot
  }
}
    ${SnapshotFragmentDoc}`;

/**
 * __useDetailSnapshotQuery__
 *
 * To run a query within a React component, call `useDetailSnapshotQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailSnapshotQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailSnapshotQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailSnapshotQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailSnapshotQuery, DetailSnapshotQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailSnapshotQuery, DetailSnapshotQueryVariables>(DetailSnapshotDocument, options);
      }
export function useDetailSnapshotLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailSnapshotQuery, DetailSnapshotQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailSnapshotQuery, DetailSnapshotQueryVariables>(DetailSnapshotDocument, options);
        }
export type DetailSnapshotQueryHookResult = ReturnType<typeof useDetailSnapshotQuery>;
export type DetailSnapshotLazyQueryHookResult = ReturnType<typeof useDetailSnapshotLazyQuery>;
export type DetailSnapshotQueryResult = Apollo.QueryResult<DetailSnapshotQuery, DetailSnapshotQueryVariables>;
export const RunForTaskDocument = gql`
    query RunForTask($id: ID!) {
  runForTask(id: $id) {
    ...DetailRun
  }
}
    ${DetailRunFragmentDoc}`;

/**
 * __useRunForTaskQuery__
 *
 * To run a query within a React component, call `useRunForTaskQuery` and pass it any options that fit your needs.
 * When your component renders, `useRunForTaskQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRunForTaskQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRunForTaskQuery(baseOptions: ApolloReactHooks.QueryHookOptions<RunForTaskQuery, RunForTaskQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RunForTaskQuery, RunForTaskQueryVariables>(RunForTaskDocument, options);
      }
export function useRunForTaskLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RunForTaskQuery, RunForTaskQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RunForTaskQuery, RunForTaskQueryVariables>(RunForTaskDocument, options);
        }
export type RunForTaskQueryHookResult = ReturnType<typeof useRunForTaskQuery>;
export type RunForTaskLazyQueryHookResult = ReturnType<typeof useRunForTaskLazyQuery>;
export type RunForTaskQueryResult = Apollo.QueryResult<RunForTaskQuery, RunForTaskQueryVariables>;
export const EventsBetweenDocument = gql`
    query EventsBetween($id: ID!, $min: Int, $max: Int) {
  eventsBetween(run: $id, min: $min, max: $max) {
    ...RunEvent
  }
}
    ${RunEventFragmentDoc}`;

/**
 * __useEventsBetweenQuery__
 *
 * To run a query within a React component, call `useEventsBetweenQuery` and pass it any options that fit your needs.
 * When your component renders, `useEventsBetweenQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEventsBetweenQuery({
 *   variables: {
 *      id: // value for 'id'
 *      min: // value for 'min'
 *      max: // value for 'max'
 *   },
 * });
 */
export function useEventsBetweenQuery(baseOptions: ApolloReactHooks.QueryHookOptions<EventsBetweenQuery, EventsBetweenQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<EventsBetweenQuery, EventsBetweenQueryVariables>(EventsBetweenDocument, options);
      }
export function useEventsBetweenLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<EventsBetweenQuery, EventsBetweenQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<EventsBetweenQuery, EventsBetweenQueryVariables>(EventsBetweenDocument, options);
        }
export type EventsBetweenQueryHookResult = ReturnType<typeof useEventsBetweenQuery>;
export type EventsBetweenLazyQueryHookResult = ReturnType<typeof useEventsBetweenLazyQuery>;
export type EventsBetweenQueryResult = Apollo.QueryResult<EventsBetweenQuery, EventsBetweenQueryVariables>;
export const ListRunsDocument = gql`
    query ListRuns($filters: RunFilter, $pagination: OffsetPaginationInput, $ordering: [RunOrder!]) {
  runs(filters: $filters, pagination: $pagination, ordering: $ordering) {
    ...ListRun
  }
}
    ${ListRunFragmentDoc}`;

/**
 * __useListRunsQuery__
 *
 * To run a query within a React component, call `useListRunsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListRunsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListRunsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListRunsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListRunsQuery, ListRunsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListRunsQuery, ListRunsQueryVariables>(ListRunsDocument, options);
      }
export function useListRunsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListRunsQuery, ListRunsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListRunsQuery, ListRunsQueryVariables>(ListRunsDocument, options);
        }
export type ListRunsQueryHookResult = ReturnType<typeof useListRunsQuery>;
export type ListRunsLazyQueryHookResult = ReturnType<typeof useListRunsLazyQuery>;
export type ListRunsQueryResult = Apollo.QueryResult<ListRunsQuery, ListRunsQueryVariables>;
export const GetRunDocument = gql`
    query GetRun($id: ID!) {
  run(id: $id) {
    ...DetailRun
  }
}
    ${DetailRunFragmentDoc}`;

/**
 * __useGetRunQuery__
 *
 * To run a query within a React component, call `useGetRunQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRunQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRunQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetRunQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetRunQuery, GetRunQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetRunQuery, GetRunQueryVariables>(GetRunDocument, options);
      }
export function useGetRunLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetRunQuery, GetRunQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetRunQuery, GetRunQueryVariables>(GetRunDocument, options);
        }
export type GetRunQueryHookResult = ReturnType<typeof useGetRunQuery>;
export type GetRunLazyQueryHookResult = ReturnType<typeof useGetRunLazyQuery>;
export type GetRunQueryResult = Apollo.QueryResult<GetRunQuery, GetRunQueryVariables>;
export const RunCarouselDocument = gql`
    query RunCarousel($pagination: OffsetPaginationInput, $filters: RunFilter, $ordering: [RunOrder!]) {
  runs(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...CarouselRun
  }
}
    ${CarouselRunFragmentDoc}`;

/**
 * __useRunCarouselQuery__
 *
 * To run a query within a React component, call `useRunCarouselQuery` and pass it any options that fit your needs.
 * When your component renders, `useRunCarouselQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRunCarouselQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useRunCarouselQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<RunCarouselQuery, RunCarouselQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RunCarouselQuery, RunCarouselQueryVariables>(RunCarouselDocument, options);
      }
export function useRunCarouselLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RunCarouselQuery, RunCarouselQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RunCarouselQuery, RunCarouselQueryVariables>(RunCarouselDocument, options);
        }
export type RunCarouselQueryHookResult = ReturnType<typeof useRunCarouselQuery>;
export type RunCarouselLazyQueryHookResult = ReturnType<typeof useRunCarouselLazyQuery>;
export type RunCarouselQueryResult = Apollo.QueryResult<RunCarouselQuery, RunCarouselQueryVariables>;
export const GlobalSearchDocument = gql`
    query GlobalSearch($search: String, $pagination: OffsetPaginationInput) {
  workspaces: workspaces(filters: {search: $search}, pagination: $pagination) {
    ...ListWorkspace
  }
}
    ${ListWorkspaceFragmentDoc}`;

/**
 * __useGlobalSearchQuery__
 *
 * To run a query within a React component, call `useGlobalSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useGlobalSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGlobalSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useGlobalSearchQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GlobalSearchQuery, GlobalSearchQueryVariables>(GlobalSearchDocument, options);
      }
export function useGlobalSearchLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GlobalSearchQuery, GlobalSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GlobalSearchQuery, GlobalSearchQueryVariables>(GlobalSearchDocument, options);
        }
export type GlobalSearchQueryHookResult = ReturnType<typeof useGlobalSearchQuery>;
export type GlobalSearchLazyQueryHookResult = ReturnType<typeof useGlobalSearchLazyQuery>;
export type GlobalSearchQueryResult = Apollo.QueryResult<GlobalSearchQuery, GlobalSearchQueryVariables>;
export const WorkspaceDocument = gql`
    query Workspace($id: ID!) {
  workspace(id: $id) {
    ...Workspace
  }
}
    ${WorkspaceFragmentDoc}`;

/**
 * __useWorkspaceQuery__
 *
 * To run a query within a React component, call `useWorkspaceQuery` and pass it any options that fit your needs.
 * When your component renders, `useWorkspaceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWorkspaceQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useWorkspaceQuery(baseOptions: ApolloReactHooks.QueryHookOptions<WorkspaceQuery, WorkspaceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<WorkspaceQuery, WorkspaceQueryVariables>(WorkspaceDocument, options);
      }
export function useWorkspaceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<WorkspaceQuery, WorkspaceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<WorkspaceQuery, WorkspaceQueryVariables>(WorkspaceDocument, options);
        }
export type WorkspaceQueryHookResult = ReturnType<typeof useWorkspaceQuery>;
export type WorkspaceLazyQueryHookResult = ReturnType<typeof useWorkspaceLazyQuery>;
export type WorkspaceQueryResult = Apollo.QueryResult<WorkspaceQuery, WorkspaceQueryVariables>;
export const WorkspacesDocument = gql`
    query Workspaces($filters: WorkspaceFilter, $pagination: OffsetPaginationInput, $ordering: [WorkspaceOrder!]) {
  workspaces(filters: $filters, pagination: $pagination, ordering: $ordering) {
    ...ListWorkspace
  }
}
    ${ListWorkspaceFragmentDoc}`;

/**
 * __useWorkspacesQuery__
 *
 * To run a query within a React component, call `useWorkspacesQuery` and pass it any options that fit your needs.
 * When your component renders, `useWorkspacesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWorkspacesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useWorkspacesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<WorkspacesQuery, WorkspacesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<WorkspacesQuery, WorkspacesQueryVariables>(WorkspacesDocument, options);
      }
export function useWorkspacesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<WorkspacesQuery, WorkspacesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<WorkspacesQuery, WorkspacesQueryVariables>(WorkspacesDocument, options);
        }
export type WorkspacesQueryHookResult = ReturnType<typeof useWorkspacesQuery>;
export type WorkspacesLazyQueryHookResult = ReturnType<typeof useWorkspacesLazyQuery>;
export type WorkspacesQueryResult = Apollo.QueryResult<WorkspacesQuery, WorkspacesQueryVariables>;
export const WorkspaceCarouselDocument = gql`
    query WorkspaceCarousel($pagination: OffsetPaginationInput, $filters: WorkspaceFilter, $ordering: [WorkspaceOrder!]) {
  workspaces(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...CarouselWorkspace
  }
}
    ${CarouselWorkspaceFragmentDoc}`;

/**
 * __useWorkspaceCarouselQuery__
 *
 * To run a query within a React component, call `useWorkspaceCarouselQuery` and pass it any options that fit your needs.
 * When your component renders, `useWorkspaceCarouselQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWorkspaceCarouselQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useWorkspaceCarouselQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<WorkspaceCarouselQuery, WorkspaceCarouselQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<WorkspaceCarouselQuery, WorkspaceCarouselQueryVariables>(WorkspaceCarouselDocument, options);
      }
export function useWorkspaceCarouselLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<WorkspaceCarouselQuery, WorkspaceCarouselQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<WorkspaceCarouselQuery, WorkspaceCarouselQueryVariables>(WorkspaceCarouselDocument, options);
        }
export type WorkspaceCarouselQueryHookResult = ReturnType<typeof useWorkspaceCarouselQuery>;
export type WorkspaceCarouselLazyQueryHookResult = ReturnType<typeof useWorkspaceCarouselLazyQuery>;
export type WorkspaceCarouselQueryResult = Apollo.QueryResult<WorkspaceCarouselQuery, WorkspaceCarouselQueryVariables>;
export const EventsDocument = gql`
    subscription Events($id: ID!) {
  events(run: $id) {
    ...RunEvent
  }
}
    ${RunEventFragmentDoc}`;

/**
 * __useEventsSubscription__
 *
 * To run a query within a React component, call `useEventsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useEventsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useEventsSubscription({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useEventsSubscription(baseOptions: ApolloReactHooks.SubscriptionHookOptions<EventsSubscription, EventsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useSubscription<EventsSubscription, EventsSubscriptionVariables>(EventsDocument, options);
      }
export type EventsSubscriptionHookResult = ReturnType<typeof useEventsSubscription>;
export type EventsSubscriptionResult = Apollo.SubscriptionResult<EventsSubscription>;