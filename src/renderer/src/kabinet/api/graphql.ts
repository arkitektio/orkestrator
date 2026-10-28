import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/kabinet/api/hooks';
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
  /** The `ActionHash` scalar is the sha256 identity hash of an action definition (key, version, ports, ...) */
  ActionHash: { input: any; output: any; }
  /** The `AnyDefault` scalar is any JSON value used as a port default or a choice value; the server checks it against the port's kind */
  AnyDefault: { input: any; output: any; }
  /** The `Arg` scalar type represents a an Argument in a Action assignment */
  Arg: { input: any; output: any; }
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  /** A stored vector, as `<model id>:<comma-separated floats>` -- e.g. `potion-base-8M:0.0123,-0.0456,...`. The model id is part of the value because vectors from different models are not comparable. Null when the row has no vector yet (it carries no text, or indexing has not caught up with it). */
  Embedding: { input: any; output: any; }
  /** The `Identifier` scalar is a structure identifier of the form `@package/key` (e.g. `@mikro/image`) that types STRUCTURE, MEMORY_STRUCTURE and INTERFACE ports */
  Identifier: { input: any; output: any; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
  /** The `JSONSerializable` scalar type represents a JSON-serializable value. */
  JSONSerializable: { input: any; output: any; }
  /** The `SearchQuery` scalar is a GraphQL query string a search widget executes against its ward to populate its choices */
  SearchQuery: { input: any; output: any; }
  /** An untyped, free-form JSON object whose shape is not known to the schema. */
  UntypedParams: { input: any; output: any; }
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

/** An argument of a call: a literal, a path, a nested call, a list or an object; null when it sets none. */
export type ActionArgumentInput = {
  /** Defines a nested agent call if this argument should trigger an agent interaction. */
  agentCall?: InputMaybe<AgentProbeInput>;
  /** The argument property name. */
  key?: InputMaybe<Scalars['String']['input']>;
  /** A nested function call. */
  utilCall?: InputMaybe<UtilCallInput>;
  /** Defines a list of key-value pairs if this argument should be a dictionary. */
  valueDict?: InputMaybe<Array<ActionArgumentInput>>;
  /** Defines a list of values if this argument should be an array. */
  valueList?: InputMaybe<Array<ActionArgumentInput>>;
  /** A JSON literal. */
  valueLiteral?: InputMaybe<Scalars['JSONSerializable']['input']>;
  /** A path the argument reads, as a prop's dynamic_value does. */
  valuePath?: InputMaybe<Scalars['String']['input']>;
};

/** An action's own blok (blok language v2): how a client shows a run of it in one context, naming devices by the action's dependency keys. */
export type ActionBlokInput = {
  /** The catalogs it needs, as name@version. */
  catalogs?: Array<Scalars['String']['input']>;
  /** The UI component tree, unless the blok is sent as its `source`. */
  components?: InputMaybe<Array<ComponentNodeInput>>;
  /** Where a client shows the run with it: HTML in a task panel, SCENE as a 3D view of its own, OVERLAY drawn into the space that hosts the run (its root an `Overlay`). */
  context?: ComponentContext;
  /** What a preview renders it with. */
  demo?: InputMaybe<BlokDemoInput>;
  /** What the blok shows of a run. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Its locals: form state that feeds a call, written only through bind. */
  locals?: Array<BlokLocalInput>;
  /** The module the blok renders against besides its catalogs; the Orkestrator's when absent. */
  module?: InputMaybe<Scalars['String']['input']>;
  /** Its declared reads. */
  queries?: Array<BlokQueryInput>;
  /** The blok as v2 BSX, parsed by the server into its component tree. Exactly one of `components` and `source` is sent. */
  source?: InputMaybe<Scalars['String']['input']>;
  /** Its declared streams. */
  subscriptions?: Array<BlokSubscriptionInput>;
  /** The blok language version the blok speaks; 2 is the only one. */
  vocab: Scalars['Int']['input'];
};

/**
 * Pure matching criteria for an action: hash or name short-circuits, arg/return
 *     port matches, protocols and forced port counts. Used directly by query filters and, wrapped
 *     in an ActionDependencyInput, by dependency declarations.
 */
export type ActionDemandInput = {
  /** The identifier of the app providing the action, e.g. 'imagej'. Omit (or drop when loosening) to allow equivalent actions from any app. */
  app?: InputMaybe<Scalars['String']['input']>;
  /** The matches the action's arg ports must satisfy. */
  argMatches?: InputMaybe<Array<PortMatchInput>>;
  /** Require that the action has exactly this number of root args. */
  forceArgLength?: InputMaybe<Scalars['Int']['input']>;
  /** Require that the action has exactly this number of root returns. */
  forceReturnLength?: InputMaybe<Scalars['Int']['input']>;
  /** The exact hash of the action. When set, matching short-circuits on the hash and everything else is ignored. */
  hash?: InputMaybe<Scalars['String']['input']>;
  /** Require the action to be (or not be) idempotent. Omit to match either. */
  idempotent?: InputMaybe<Scalars['Boolean']['input']>;
  /** The action's key within its app, e.g. 'open_image'. Together with `app` this is the preferred identification of the demanded action. */
  key?: InputMaybe<Scalars['String']['input']>;
  /** The display name of the action to match. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Protocols (by name) the action must implement, e.g. 'predicate'. */
  protocols?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Require the action to be (or not be) pure. Omit to match either. */
  pure?: InputMaybe<Scalars['Boolean']['input']>;
  /** The matches the action's return ports must satisfy. */
  returnMatches?: InputMaybe<Array<PortMatchInput>>;
  /** Require the action to be (or not be) stateful. Omit to match either. */
  stateful?: InputMaybe<Scalars['Boolean']['input']>;
  /** The exact version of the action. */
  version?: InputMaybe<Scalars['String']['input']>;
};

/**
 * A named action requirement of a dependency: a slot key plus the demand the
 *     resolved action must satisfy, and resolution-lifecycle filters.
 */
export type ActionDependencyInput = {
  /** Allow inactive nodes, defaults to true */
  allowInactive?: InputMaybe<Scalars['Boolean']['input']>;
  /** The matching criteria the resolved action must satisfy (app/key preferred; matches loosen). */
  demand?: InputMaybe<ActionDemandInput>;
  /** The description of the dependency, why it is needed and what it is used for. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The local slot key of this action requirement — callers reference it when assigning. */
  key: Scalars['String']['input'];
  /** Whether the dependency is optional or not. If the dependency is optional, the agent doesn't have to provide it to be potentially callable */
  optional?: Scalars['Boolean']['input'];
};

/** The kind of action. */
export enum ActionKind {
  Function = 'FUNCTION',
  Generator = 'GENERATOR'
}

/** The kind of action scope. */
export enum ActionScope {
  BridgeGlobalToLocal = 'BRIDGE_GLOBAL_TO_LOCAL',
  BridgeLocalToGlobal = 'BRIDGE_LOCAL_TO_GLOBAL',
  Global = 'GLOBAL',
  Local = 'LOCAL'
}

/** Defines a callback that routes user interactions directly to an Arkitekt Agent via Rekuest. */
export type AgentCall = {
  __typename?: 'AgentCall';
  arguments?: Maybe<Array<ActionArgument>>;
  dependency: Scalars['String']['output'];
  operation: Scalars['String']['output'];
};

/**
 * A dependency for a implementation. By defining dependencies, you can
 *     create a dependency graph for your implementations and actions
 */
export type AgentDependencyInput = {
  /** The named action requirements of the agent — each a slot key plus the demand the resolved action must satisfy. */
  actionDependencies?: InputMaybe<Array<ActionDependencyInput>>;
  /** Which app this dependency corresponds to (i.e. do you want to use a stardist agent for that or imagej agents needs to be a world unique classsifier (reverse domain notation) that identifies the type of agent you want to use, and then we can have multiple agents of the same type running in the system, e.g. startdist could be the app for all agents that correpsond to a startdist instance) */
  app?: InputMaybe<Scalars['String']['input']>;
  /** Whether this dependency is auto resolvable or not. If so we will try to automatically resolve it based on the demands specified in the dependency and the capabilities of the available agents in the system. This is used to identify the demand in the system. Attention if any of the dependencies of this agent dependency is not auto resolvable, this dependency will also not be auto resolvable */
  autoResolvable?: Scalars['Boolean']['input'];
  /** A description of the dependency, why it is needed and what it is used for. This can be used to provide more context to users when assigning dependencies. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The key of this dependency, when assigning you can reference this key to specify which agent_dependency you are assigning to. */
  key: Scalars['String']['input'];
  /** The maximum amount of viable instances for the agent. This is used to identify the demand in the system. */
  maxViableInstances?: InputMaybe<Scalars['Int']['input']>;
  /** The minimum amount of viable instances for the agent. This is used to identify the demand in the system. */
  minViableInstances?: InputMaybe<Scalars['Int']['input']>;
  /** A list of keys of other agent dependencies that are mutually exclusive with this one. This means two agent dependencies with mutually exclusive keys cannot be assigned to the same implementing agent. This is used to identify the demand in the system. */
  mutuallyExclusiveKeys?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The name of the agent. This is used to identify the agent in the system. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Whether the dependency is optional or not. If the dependency is optional, users can choose to not provide it */
  optional?: Scalars['Boolean']['input'];
  /** The prefered amount of instances for the agent. This is used to identify the demand in the system. */
  preferedInstances?: InputMaybe<Scalars['Int']['input']>;
  /** The named state requirements of the agent — each a slot key plus the demand the agent's state must satisfy. */
  stateDependencies?: InputMaybe<Array<StateDependencyInput>>;
  /** The version of the app this dependency corresponds to. */
  version?: InputMaybe<Scalars['String']['input']>;
};

/** Defines a callback that routes user interactions directly to an Arkitekt Agent via Rekuest. */
export type AgentProbeInput = {
  /** Its arguments, each named. */
  arguments?: InputMaybe<Array<ActionArgumentInput>>;
  /** `self`, or the dependency key the task goes to (`deps.<key>`). */
  dependency: Scalars['String']['input'];
  /** The action called, by its key in the dependency's action demands. */
  operation: Scalars['String']['input'];
};

/** An application, identified by a globally unique, reverse-domain identifier (e.g. live.arkitekt.app). */
export type App = {
  __typename?: 'App';
  /** This object's descriptors, a flat mapping of key to value: the facts about it that a trigger can test (e.g. `@kabinet/status`). The keys are the ones kabinet declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** This app's stored vector, as `<model id>:<floats>`. Null until it has been indexed. */
  embedding?: Maybe<Scalars['Embedding']['output']>;
  id: Scalars['ID']['output'];
  /** The globally unique, reverse-domain identifier of the app. */
  identifier: Scalars['String']['output'];
  /** The app's logo: the LOGO blok of its newest release that brings one. */
  logoBlok?: Maybe<FlavourBlok>;
  /** The versions of this app. Filter, order and paginate them exactly like the root `releases` query -- an app page reads them from here instead of fetching every release and grouping client-side. There is no implicit ordering; ask for `releasedAt` to get them newest first. */
  releases: Array<Release>;
};


/** An application, identified by a globally unique, reverse-domain identifier (e.g. live.arkitekt.app). */
export type AppReleasesArgs = {
  filters?: InputMaybe<ReleaseFilter>;
  ordering?: Array<ReleaseOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Filter for apps. */
export type AppFilter = {
  AND?: InputMaybe<AppFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AppFilter>;
  OR?: InputMaybe<AppFilter>;
  /** Keep only apps whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Search by identifier: a case-insensitive substring, or semantic similarity of the query to it. Substring matches rank first, then by similarity; an explicit `ordering` replaces that ranking. */
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Input describing a built app image to register (its manifest, image, selectors and inspection). */
export type AppImageInput = {
  appImageId: Scalars['String']['input'];
  flavourName?: InputMaybe<Scalars['String']['input']>;
  image: DockerImageInput;
  inspection: InspectionInput;
  manifest: ManifestInput;
  selectors: Array<SelectorInput>;
};

export type AppOrder =
  { id: Ordering; identifier?: never; }
  |  { id?: never; identifier: Ordering; };

/** Record that you pre-authorized a release (via a lok mandate) so deployers may install it. */
export type ApproveReleaseInput = {
  /** Identifier of the deployer app the mandate names. */
  agent: Scalars['String']['input'];
  /** Backends allowed to deploy under this approval. Omit for any. */
  backends?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** The release's approvalDigest you reviewed; refused if the release changed since. */
  digest: Scalars['String']['input'];
  /** The lok agent mandate (createMandate) that lets the deployer issue mandate keys that run this release as you. */
  mandate: Scalars['ID']['input'];
  /** The release to approve. */
  release: Scalars['ID']['input'];
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
  /** The identifier of the port's type, of the form @package/key. Required for STRUCTURE, MEMORY_STRUCTURE and INTERFACE, where it is the only identity a value has; optional for MODEL and ENUM, where it names the class or enum the port was built from so that agents can map a value back to it. */
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

/** What a file an agent brings with it is: a 3D model (a binary glTF file) or an image (PNG, JPEG or WebP). */
export enum AssetKind {
  Image = 'IMAGE',
  Model_3D = 'MODEL_3D'
}

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

/** A deployment target (agent) registered by a client that runs pods on behalf of an organization. */
export type Backend = {
  __typename?: 'Backend';
  /** The OAuth2 client this backend authenticates as. */
  client: Client;
  /** The OAuth2 client ID of this backend. */
  clientId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** The kind of backend (its runtime type). */
  kind: Scalars['String']['output'];
  /** The human-readable name of this backend. */
  name: Scalars['String']['output'];
  /** The organization this backend belongs to. */
  organization: Organization;
  /** The pods currently running on this backend. */
  pods: Array<Pod>;
  /** The resources declared on this backend. */
  resources: Array<Resource>;
  /** The user that registered this backend. */
  user: User;
};


/** A deployment target (agent) registered by a client that runs pods on behalf of an organization. */
export type BackendPodsArgs = {
  filters?: InputMaybe<PodFilter>;
  ordering?: Array<PodOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A deployment target (agent) registered by a client that runs pods on behalf of an organization. */
export type BackendResourcesArgs = {
  filters?: InputMaybe<ResourceFilter>;
  ordering?: Array<ResourceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Filter for backends. */
export type BackendFilter = {
  AND?: InputMaybe<BackendFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BackendFilter>;
  OR?: InputMaybe<BackendFilter>;
  /** Keep only backends whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Case-insensitive search on the backend name. */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type BackendOrder =
  { id: Ordering; lastHeartbeat?: never; name?: never; }
  |  { id?: never; lastHeartbeat: Ordering; name?: never; }
  |  { id?: never; lastHeartbeat?: never; name: Ordering; };

/** What a preview renders a blok with, mirroring the roots it reads. */
export type BlokDemoInput = {
  /** What it is opened on. */
  args?: InputMaybe<Scalars['JSONSerializable']['input']>;
  /** Per dependency key (`self` included), its states and tasks: `{self: {arm: {joints: [...]}}}`. */
  deps?: InputMaybe<Scalars['JSONSerializable']['input']>;
  /** Per declared query, the value it answers. */
  queries?: InputMaybe<Scalars['JSONSerializable']['input']>;
  /** Per declared subscription, its value. */
  subscriptions?: InputMaybe<Scalars['JSONSerializable']['input']>;
  /** The task record it is about (task and action bloks, action logos). */
  task?: InputMaybe<Scalars['JSONSerializable']['input']>;
};

/** A blok an agent declares (blok language v2). */
export type BlokImplementationInput = {
  /** The items this Blok is opened for, declared like an action's args and read under `args.<key>`. A UI offers the Blok on any item its args accept (`MaterializedBlokFilter.demands`). HTML bloks only. */
  args?: Array<ArgPortInput>;
  /** The catalogs it needs, as name@version ('ui@1', 'scene@1'). */
  catalogs?: Array<Scalars['String']['input']>;
  /** The UI component tree blueprint for this Blok (one root), unless it is sent as its `source`. */
  components?: InputMaybe<Array<ComponentNodeInput>>;
  /** The renderer for this Blok's root: HTML for panels and dashboards, SCENE for a full 3D view whose root is a Scene, LOGO an agent's logo, ACTION_LOGO an action's. */
  context?: ComponentContext;
  /** Whether this Blok is its agent's default for its context. A newly declared default replaces the previous one. */
  default?: Scalars['Boolean']['input'];
  /** What a preview renders it with. */
  demo?: InputMaybe<BlokDemoInput>;
  /** The dependencies required by this Blok: for an agent's blok the one dependency `self`, its demands what the tree reads and calls of it. */
  dependencies?: Array<AgentDependencyInput>;
  /** A human-readable description about this Blok's purpose and functionality. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The model ('sha256:...') this Blok decorates: viewers showing that model offer this Blok at `for_node`. HTML bloks only. */
  forModel?: InputMaybe<Scalars['String']['input']>;
  /** The node of `for_model` this Blok attaches to; the model's root when absent. */
  forNode?: InputMaybe<Scalars['String']['input']>;
  /** The key of this Blok implementation. */
  key: Scalars['String']['input'];
  /** Its locals: form state that feeds a call, written only through bind. */
  locals?: Array<BlokLocalInput>;
  /** The module (an app's own unversioned extras, registered by a UI app such as the Orkestrator) the blok renders against besides its catalogs; the Orkestrator's when absent. */
  module?: InputMaybe<Scalars['String']['input']>;
  /** Its declared reads, as `queries.<key>`. */
  queries?: Array<BlokQueryInput>;
  /** The Blok as v2 BSX, parsed by the server into its component tree. Exactly one of `components` and `source` is sent. */
  source?: InputMaybe<Scalars['String']['input']>;
  /** Its declared streams, as `subscriptions.<key>`. */
  subscriptions?: Array<BlokSubscriptionInput>;
  /** The blok language version the blok speaks; 2 is the only one. */
  vocab: Scalars['Int']['input'];
};

/** A local: blok-level form state that feeds a call, written only through `bind` on controls. A local is an arg port plus `persist`; its `kind` is a port kind or ANY. Every field left out (or null) is the tree's to tell: the kind is inferred (its default, the task argument it is passed to whole, the control bound to it; ANY when nothing tells), and an inferred port fills only the fields the local leaves out. */
export type BlokLocalInput = {
  /** Its child ports (the item of a LIST, the fields of a DICT or MODEL). */
  children?: InputMaybe<Array<ArgPortInput>>;
  /** The values it takes (an ENUM's). */
  choices?: InputMaybe<Array<ChoiceInput>>;
  /** The value it starts with. */
  default?: InputMaybe<Scalars['AnyDefault']['input']>;
  /** What it is for. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** For a QUANTITY: its dimensionality (derived from the unit). */
  dimension?: InputMaybe<Scalars['String']['input']>;
  /** Its effects. */
  effects?: InputMaybe<Array<EffectInput>>;
  /** The structure (or model, enum) identifier of what it holds. */
  identifier?: InputMaybe<Scalars['String']['input']>;
  /** Its name, read bare in the tree (`{iterations}`); never a reserved root. */
  key: Scalars['String']['input'];
  /** A port kind or ANY. Left out or null: inferred from the tree, ANY when nothing tells. */
  kind?: InputMaybe<LocalKind>;
  /** Its label. */
  label?: InputMaybe<Scalars['String']['input']>;
  /** Whether it may hold null; left out, what is inferred says (false when nothing does). */
  nullable?: InputMaybe<Scalars['Boolean']['input']>;
  /** Remember the last input on this device (never on a server); false when left out. */
  persist?: InputMaybe<Scalars['Boolean']['input']>;
  /** For a QUANTITY: the units offered. */
  proposedUnits?: InputMaybe<Array<Scalars['String']['input']>>;
  /** For a QUANTITY: its reference unit. */
  referenceUnit?: InputMaybe<Scalars['String']['input']>;
  /** Its descriptor requirements. */
  requires?: InputMaybe<Array<RequiresInput>>;
  /** Its validators. */
  validators?: InputMaybe<Array<ValidatorInput>>;
  /** The widget a form of it uses. */
  widget?: InputMaybe<AssignWidgetInput>;
};

/** A declared read: one GraphQL query on a service, re-run when its variables change; the blok reads it as `queries.<key>`. */
export type BlokQueryInput = {
  /** One GraphQL `query` operation; never a mutation. */
  document: Scalars['String']['input'];
  /** Its name: the blok reads it as `queries.<key>` (status, value, error, refetching, fetching_more). */
  key: Scalars['String']['input'];
  /** The list field of its result that `queries.<key>.fetch_more(...)` appends new pages to, as a dotted path into the data (`positions`, `images.items`). A query without it cannot fetch more. */
  more?: InputMaybe<Scalars['String']['input']>;
  /** Re-run every this many seconds, besides when its variables change. */
  poll?: InputMaybe<Scalars['Float']['input']>;
  /** The service it runs on, by its key ('mikro'). */
  service: Scalars['String']['input'];
  /** Its variables, each an expression over args, locals and dependencies (as a call argument is stored). */
  variables?: Array<ActionArgumentInput>;
};

/** A declared stream: one GraphQL subscription on a service; the blok reads it as `subscriptions.<key>`. */
export type BlokSubscriptionInput = {
  /** One GraphQL `subscription` operation. */
  document: Scalars['String']['input'];
  /** A declared query to replay from while travelling; without it the value at travel start shows, stale. */
  history?: InputMaybe<Scalars['String']['input']>;
  /** Keep the last this many payloads as a list; the latest only when absent. */
  keep?: InputMaybe<Scalars['Int']['input']>;
  /** Its name: the blok reads it as `subscriptions.<key>` (status, value, error). */
  key: Scalars['String']['input'];
  /** The service it runs on, by its key. */
  service: Scalars['String']['input'];
  /** Its variables, as a query's. */
  variables?: Array<ActionArgumentInput>;
};

/** Requires CPU resources on the backend. */
export type CpuSelector = Selector & {
  __typename?: 'CPUSelector';
  /** The CPU architecture the image is built for (docker platform / kubernetes.io/arch values, e.g. 'amd64', 'arm64'). */
  arch?: Maybe<Scalars['String']['output']>;
  /** The minimum CPU frequency required, in MHz. */
  frequency?: Maybe<Scalars['Float']['output']>;
  kind: Scalars['String']['output'];
  /** The minimum number of CPU cores required. */
  minCount?: Maybe<Scalars['Int']['output']>;
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required: Scalars['Boolean']['output'];
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight: Scalars['Int']['output'];
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

/** Represents a registered OAuth2 client. */
export type Client = {
  __typename?: 'Client';
  /** OAuth2 client ID. */
  clientId: Scalars['String']['output'];
  /** Device associated with the client. */
  device?: Maybe<Device>;
  /** Unique ID of the client. */
  id: Scalars['ID']['output'];
  /** Name of the client. */
  name: Scalars['String']['output'];
  /** Release associated with the client. */
  release?: Maybe<ClientRelease>;
};

/** A client application registered with the authentication provider. */
export type ClientApp = {
  __typename?: 'ClientApp';
  /** Unique ID of the app. */
  id: Scalars['ID']['output'];
  /** The unique identifier of the app. */
  identifier: Scalars['String']['output'];
};

/** A released version of a client application. */
export type ClientRelease = {
  __typename?: 'ClientRelease';
  /** The app this release belongs to. */
  app: ClientApp;
  /** Unique ID of the release. */
  id: Scalars['ID']['output'];
  /** Version string of the release. */
  version: Scalars['String']['output'];
};

/** A named grouping of related action definitions. */
export type Collection = {
  __typename?: 'Collection';
  /** When this collection was defined. */
  definedAt: Scalars['DateTime']['output'];
  /** A description of this collection. */
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** The name of this collection. */
  name: Scalars['String']['output'];
};

/** Filter for collections. */
export type CollectionFilter = {
  AND?: InputMaybe<CollectionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<CollectionFilter>;
  OR?: InputMaybe<CollectionFilter>;
  /** Keep only collections whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Case-insensitive search on the collection name. */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type CollectionOrder =
  { definedAt: Ordering; id?: never; name?: never; }
  |  { definedAt?: never; id: Ordering; name?: never; }
  |  { definedAt?: never; id?: never; name: Ordering; };

/** The renderer a catalog component lives in. A component may only be placed where its context is in force. ACTION_LOGO and OVERLAY are blok contexts only: an OVERLAY blok is an action's own, drawn into the space that hosts its run. */
export enum ComponentContext {
  ActionLogo = 'ACTION_LOGO',
  Html = 'HTML',
  Logo = 'LOGO',
  Overlay = 'OVERLAY',
  Scene = 'SCENE'
}

/** A node of a blok tree (blok language v2). */
export type ComponentNodeInput = {
  /** Its children, in order. */
  children?: InputMaybe<Array<ComponentNodeInput>>;
  /** The catalog component (`Button`) or language component (`if`, `foreach`, `suspense`). */
  component: Scalars['String']['input'];
  /** An explicit id, or one derived from the node's place (`Card[0]/Button[1]`); unique in the tree. */
  id: Scalars['String']['input'];
  /** The collection of static values, state pointers, or action endpoints assigned to this component. */
  props?: InputMaybe<Array<ComponentPropInput>>;
};

/** One prop of a component node: a literal, a path, a function call, a task call (named by `declaresValue`), an effect, or nothing (null). */
export type ComponentProp = {
  __typename?: 'ComponentProp';
  agentCall?: Maybe<AgentCall>;
  declaresValue?: Maybe<Scalars['String']['output']>;
  dynamicValue?: Maybe<DynamicValue>;
  key: Scalars['String']['output'];
  staticValue?: Maybe<Scalars['JSONSerializable']['output']>;
  utilCall?: Maybe<UtilCall>;
};

/** One prop of a component node: a literal, a path, a function call, a task call (named by `declaresValue`), an effect (`query.refetch`, `query.fetch_more`, `ui.copy`, `task.answer`), or nothing (null). */
export type ComponentPropInput = {
  /** A task call: a callback's one thing. */
  agentCall?: InputMaybe<AgentProbeInput>;
  /** The name a task call writes its record to (`... into move`), or the loop variable of a `foreach` (its `let`). */
  declaresValue?: InputMaybe<Scalars['String']['input']>;
  /** A path the prop reads. */
  dynamicValue?: InputMaybe<DynamicValueInput>;
  /** The prop key name matching the target UI catalog constraint. */
  key: Scalars['String']['input'];
  /** A JSON literal: a string, number, bool, list or object. */
  staticValue?: InputMaybe<Scalars['JSONSerializable']['input']>;
  /** A function the prop's value is, or in a callback the effect it runs (ui.copy, task.answer, query.refetch, query.fetch_more). */
  utilCall?: InputMaybe<UtilCallInput>;
};

export type CpuSelectorInput = {
  /** The CPU architecture the image is built for (docker platform / kubernetes.io/arch values, e.g. 'amd64', 'arm64'). */
  arch?: InputMaybe<Scalars['String']['input']>;
  /** The minimum CPU frequency required, in MHz. */
  frequency?: InputMaybe<Scalars['Float']['input']>;
  kind?: Scalars['String']['input'];
  /** The minimum number of CPU cores required. */
  minCount?: InputMaybe<Scalars['Int']['input']>;
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required?: Scalars['Boolean']['input'];
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight?: Scalars['Int']['input'];
};

/** Input for creating a deployment of a flavour on a backend. */
export type CreateDeploymentInput = {
  /** The release approval this deployment is made under. */
  approval: Scalars['ID']['input'];
  /** The ID of the flavour to deploy. */
  flavour: Scalars['ID']['input'];
  /** When the flavour's image was last pulled, if known. */
  lastPulled?: InputMaybe<Scalars['DateTime']['input']>;
  /** The identifier of the deployment as known to the backend. */
  localId: Scalars['ID']['input'];
  /** Secret parameters passed to the deployment (e.g. credentials). */
  secretParams?: InputMaybe<Scalars['UntypedParams']['input']>;
};

/** Input for tracking a new GitHub repository. */
export type CreateGithubRepoInput = {
  /** Whether to scan the repository immediately after adding it. */
  autoScan?: InputMaybe<Scalars['Boolean']['input']>;
  /** The branch to scan for app manifests. */
  branch?: InputMaybe<Scalars['String']['input']>;
  /** An optional identifier (e.g. 'user/repo') used to derive the other fields. */
  identifier?: InputMaybe<Scalars['String']['input']>;
  /** An optional human-readable name for the repository. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** The repository name on GitHub. */
  repo?: InputMaybe<Scalars['String']['input']>;
  /** The GitHub owner (user or organization) of the repository. */
  user?: InputMaybe<Scalars['String']['input']>;
};

/** Input for registering a running pod for a deployment. */
export type CreatePodInput = {
  /** The OAuth2 client ID this pod authenticates as, if any. */
  clientId?: InputMaybe<Scalars['String']['input']>;
  /** The ID of the deployment this pod is an instance of. */
  deployment: Scalars['ID']['input'];
  /** The identifier of the pod as known to the backend. */
  localId: Scalars['ID']['input'];
  /** The resource this pod is scheduled onto, if any. */
  resource?: InputMaybe<Scalars['ID']['input']>;
};

/** Requires a CUDA-capable (NVIDIA) GPU on the backend. */
export type CudaSelector = Selector & {
  __typename?: 'CudaSelector';
  /** The minimum CUDA compute capability required (e.g. '8.6') — NVIDIA's standard placement key. */
  computeCapability?: Maybe<Scalars['String']['output']>;
  /** The number of GPUs required (a Docker device-reservation count; unset lets the deployer decide). */
  count?: Maybe<Scalars['Int']['output']>;
  /** Deprecated: the minimum number of CUDA cores. Prefer computeCapability and memory. */
  cudaCores?: Maybe<Scalars['Int']['output']>;
  /** The minimum CUDA (driver/runtime) version required. */
  cudaVersion?: Maybe<Scalars['String']['output']>;
  kind: Scalars['String']['output'];
  /** The minimum GPU memory (VRAM) required, in MB. */
  memory?: Maybe<Scalars['Int']['output']>;
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required: Scalars['Boolean']['output'];
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight: Scalars['Int']['output'];
};

export type CudaSelectorInput = {
  /** The minimum CUDA compute capability required (e.g. '8.6') — NVIDIA's standard placement key. */
  computeCapability?: InputMaybe<Scalars['String']['input']>;
  /** The number of GPUs required (a Docker device-reservation count; unset lets the deployer decide). */
  count?: InputMaybe<Scalars['Int']['input']>;
  /** Deprecated: the minimum number of CUDA cores. Prefer computeCapability and memory. */
  cudaCores?: InputMaybe<Scalars['Int']['input']>;
  /** The minimum CUDA (driver/runtime) version required. */
  cudaVersion?: InputMaybe<Scalars['String']['input']>;
  kind?: Scalars['String']['input'];
  /** The minimum GPU memory (VRAM) required, in MB. */
  memory?: InputMaybe<Scalars['Int']['input']>;
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required?: Scalars['Boolean']['input'];
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight?: Scalars['Int']['input'];
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

/** Input for declaring (registering or updating) a backend. */
export type DeclareBackendInput = {
  /** The kind of backend (its runtime type). */
  kind: Scalars['String']['input'];
  /** The human-readable name of the backend. */
  name: Scalars['String']['input'];
};

/** Input for declaring (registering or updating) a resource on a backend. */
export type DeclareResourceInput = {
  /** The ID of the backend to declare the resource on. */
  backend: Scalars['ID']['input'];
  /** The identifier of the resource as known to the backend. */
  localId: Scalars['String']['input'];
  /** An optional human-readable name for the resource. */
  name?: InputMaybe<Scalars['String']['input']>;
  /** Free-form key/value qualifiers describing the resource. */
  qualifiers?: InputMaybe<Array<QualifierInput>>;
};

/** An action definition: the abstract, hashed description of an RPC task that a flavour provides. */
export type Definition = {
  __typename?: 'Definition';
  /** The input ports (arguments) of this action. */
  args: Array<ArgPort>;
  /** The collections this action belongs to. */
  collections: Array<Collection>;
  /** When this action definition was first defined. */
  definedAt: Scalars['DateTime']['output'];
  /** A human-readable description of this action. */
  description?: Maybe<Scalars['String']['output']>;
  /** This object's descriptors, a flat mapping of key to value: the facts about it that a trigger can test (e.g. `@kabinet/status`). The keys are the ones kabinet declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** This definition's stored vector, as `<model id>:<floats>`. Null until it has been indexed. */
  embedding?: Maybe<Scalars['Embedding']['output']>;
  /** The flavours that provide this action. */
  flavours: Array<Flavour>;
  /** The unique hash identifying this action definition. */
  hash: Scalars['ActionHash']['output'];
  id: Scalars['ID']['output'];
  /** The action definitions that this definition is a test for. */
  isTestFor: Array<Definition>;
  /** The kind of action, e.g. a function or a generator. */
  kind: ActionKind;
  /** The ACTION_LOGO blok that draws this action: the one `flavour`'s implementation names, or without `flavour` the one of the newest flavour providing it that names one. Null when none does. */
  logo?: Maybe<FlavourBlok>;
  /** The cleartext name of this action. */
  name: Scalars['String']['output'];
  /** The protocols this action implements. */
  protocols: Array<Protocol>;
  /** The output ports (return values) of this action. */
  returns: Array<ReturnPort>;
  /** The data scope of this action (e.g. local, global or bridge). */
  scope: ActionScope;
  /** Other action definitions closest to this one in meaning, nearest first (cosine distance between their vectors, this definition excluded) -- the same action shipped under two names, or the neighbourhood a definition belongs to. `filters` narrows the candidates like `definitions` does; `maxDistance` (0 identical, 1 unrelated) cuts the tail, otherwise the nearest `limit` come back however far away they are. Empty while this definition has no vector yet or semantic indexing is off. One vector scan per definition resolved, so ask for it on a definition, not on every row of a long list. */
  similarDefinitions: Array<Definition>;
  /** The action definitions that act as tests for this definition. */
  tests: Array<Definition>;
};


/** An action definition: the abstract, hashed description of an RPC task that a flavour provides. */
export type DefinitionCollectionsArgs = {
  filters?: InputMaybe<CollectionFilter>;
  ordering?: Array<CollectionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** An action definition: the abstract, hashed description of an RPC task that a flavour provides. */
export type DefinitionFlavoursArgs = {
  filters?: InputMaybe<FlavourFilter>;
  ordering?: Array<FlavourOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** An action definition: the abstract, hashed description of an RPC task that a flavour provides. */
export type DefinitionIsTestForArgs = {
  filters?: InputMaybe<DefinitionFilter>;
  ordering?: Array<DefinitionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** An action definition: the abstract, hashed description of an RPC task that a flavour provides. */
export type DefinitionLogoArgs = {
  flavour?: InputMaybe<Scalars['ID']['input']>;
};


/** An action definition: the abstract, hashed description of an RPC task that a flavour provides. */
export type DefinitionProtocolsArgs = {
  filters?: InputMaybe<ProtocolFilter>;
  ordering?: Array<ProtocolOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** An action definition: the abstract, hashed description of an RPC task that a flavour provides. */
export type DefinitionSimilarDefinitionsArgs = {
  filters?: InputMaybe<DefinitionFilter>;
  limit?: Scalars['Int']['input'];
  maxDistance?: InputMaybe<Scalars['Float']['input']>;
};


/** An action definition: the abstract, hashed description of an RPC task that a flavour provides. */
export type DefinitionTestsArgs = {
  filters?: InputMaybe<DefinitionFilter>;
  ordering?: Array<DefinitionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Filter for action definitions. */
export type DefinitionFilter = {
  AND?: InputMaybe<DefinitionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DefinitionFilter>;
  OR?: InputMaybe<DefinitionFilter>;
  /** Keep only definitions already deployed in their organization (a deployment of one of the flavours that provide them, on one of its backends), or with false only those never deployed there: what is left to install. */
  alreadyDeployed?: InputMaybe<Scalars['Boolean']['input']>;
  /** Keep only definitions provided by these apps. */
  apps?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Keep only definitions in these collections. */
  collections?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Keep only definitions first defined at or after this moment. */
  definedAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Keep only definitions first defined at or before this moment. */
  definedBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Keep only definitions whose ports satisfy all of the given demands. */
  demands?: InputMaybe<Array<PortDemandInput>>;
  /** Keep only definitions provided by these flavours. */
  flavours?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Keep only definitions that have at least one test, or only those that have none. */
  hasTests?: InputMaybe<Scalars['Boolean']['input']>;
  /** Keep only idempotent definitions, or only non-idempotent ones. */
  idempotent?: InputMaybe<Scalars['Boolean']['input']>;
  /** Keep only definitions whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Keep only definitions that declare all of these interfaces. */
  interfaces?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Keep only definitions that are tests for these definitions. */
  isTestFor?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Keep only definitions of these kinds (function, generator, ...). */
  kinds?: InputMaybe<Array<ActionKind>>;
  /** Keep only definitions implementing these protocols. */
  protocols?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Keep only pure definitions (their result can be cached), or only impure ones. */
  pure?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter to the objects satisfying every one of these descriptor constraints: the `requires` of a port (`RequiresInput`), handed on unchanged, so a picker offers what the port accepts. Answered from the stored descriptors, in one indexed query */
  requires?: InputMaybe<Array<RequiresInput>>;
  /** Keep only definitions with one of these data scopes. */
  scopes?: InputMaybe<Array<ActionScope>>;
  /** Search by text: a case-insensitive substring of the name or the description, or semantic similarity of the query to both. Substring matches rank first, then by similarity; an explicit `ordering` replaces that ranking. */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Order by closeness in meaning to the given definition, nearest first, keeping only definitions that can be compared to it (the same grouping as `Definition.similar`). Nothing is cut off at a fixed neighbourhood size, so this composes with the other filters and with pagination; an explicit `ordering` replaces the ranking. Empty when the given definition cannot be found in this organization, or has not been indexed for similarity yet. Combined with `search` it ranks that search's matches by closeness instead -- the two rankings do not stack. */
  similarTo?: InputMaybe<Scalars['ID']['input']>;
};

/**
 * A definition
 *
 *     Definitions are the building implementation for Actions and provide the
 *     information needed to create a action. They are primarly composed of a name,
 *     a description, and a list of ports.
 *
 *     Definitions provide a protocol of input and output, and do not contain
 *     any information about the actual implementation of the action ( this is handled
 *     by a implementation that implements a action).
 *
 *
 */
export type DefinitionInput = {
  /** Whether the action may be invoked as a probe: zero persistence, redis-held state, no history/replay/recovery. Only actions declaring this are callable via the call mutation. */
  allowProbe?: Scalars['Boolean']['input'];
  /** The args of the definition. This is the input ports of the definition */
  args?: Array<ArgPortInput>;
  /** The action's own bloks, at most one per context: how a client shows a run of it (HTML in a task panel, OVERLAY drawn into the space that hosts the run). They name devices only by the action's dependency keys. Not part of the action's hash. */
  bloks?: Array<ActionBlokInput>;
  /** Names of the UI catalogs that extend the base catalog (`base@1`, always applied) for this definition's effect and validator calls. Unknown names yield an unknown_catalog warning; conflicting operation definitions across catalogs are a registration error. */
  catalogs?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The collections of the definition. This is used to group definitions together in the UI */
  collections?: Array<Scalars['String']['input']>;
  /** The description of the definition. This is the text that is displayed in the UI */
  description?: InputMaybe<Scalars['String']['input']>;
  /** Whether the action is idempotent: safe to run multiple times with the same args without changing the outcome — on ambiguous executor loss it may be freely re-dispatched. */
  idempotent?: Scalars['Boolean']['input'];
  /** Whether the definition is a dev definition or not. If the definition is a dev definition, it can be used to create a dev action. If the definition is not a dev definition, it cannot be used to create a dev action */
  isDev?: Scalars['Boolean']['input'];
  /** The actions this definition is a test for, each identified by hash or by (app, key, version). */
  isTestFor?: Array<TestTargetInput>;
  /** The key of the definition. This is used to uniquely identify the definition */
  key: Scalars['String']['input'];
  /** The kind of the definition. This is the type of the definition. Can be either a function or a generator */
  kind: ActionKind;
  /** The name of the actions. This is used to uniquely identify the definition */
  name: Scalars['String']['input'];
  /** The port groups of the definition. This is used to group ports together in the UI */
  portGroups?: Array<PortGroupInput>;
  /** Where the action means to hook in (`on_scene_annotation`): hints a caller filters on, stored beside the protocols the server infers. Not a contract, and not part of the action's hash. */
  protocols?: Array<Scalars['String']['input']>;
  /** Whether the action is pure: same args always produce the same result and no side effects — its results are replayable/cacheable. Implies idempotent. Incompatible with stateful and with IRREVERSIBLE effects. */
  pure?: Scalars['Boolean']['input'];
  /** The returns of the definition. This is the output ports of the definition */
  returns?: Array<ReturnPortInput>;
  /** Whether the definition is stateful or not. If the definition is stateful, it can be used to create a stateful action. If the definition is not stateful, it cannot be used to create a stateful action */
  stateful?: Scalars['Boolean']['input'];
  /** The version of the definition. This is used to differentiate if the underyling algorithm has changed, i.e we would expect different results for the same input */
  version: Scalars['String']['input'];
};

/** Order for action definitions. */
export type DefinitionOrder =
  { definedAt: Ordering; kind?: never; name?: never; }
  |  { definedAt?: never; kind: Ordering; name?: never; }
  |  { definedAt?: never; kind?: never; name: Ordering; };

/** Input for deleting a pod. */
export type DeletePodInput = {
  /** The ID of the pod to delete. */
  id: Scalars['ID']['input'];
};

export enum DemandKind {
  Args = 'ARGS',
  Returns = 'RETURNS'
}

/** A flavour scheduled to run on a particular backend. */
export type Deployment = {
  __typename?: 'Deployment';
  /** The approval this deployment was made under. */
  approval?: Maybe<ReleaseApproval>;
  /** The backend this deployment runs on. */
  backend: Backend;
  /** This object's descriptors, a flat mapping of key to value: the facts about it that a trigger can test (e.g. `@kabinet/status`). The keys are the ones kabinet declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** The flavour that is deployed. */
  flavour: Flavour;
  id: Scalars['ID']['output'];
  /** The identifier of this deployment as known to the backend. */
  localId: Scalars['ID']['output'];
  /** The display name of this deployment, combining backend and flavour names. */
  name: Scalars['String']['output'];
  /** The current lifecycle status of this deployment. */
  status: PodStatus;
};

/** Filter for deployments. */
export type DeploymentFilter = {
  AND?: InputMaybe<DeploymentFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DeploymentFilter>;
  OR?: InputMaybe<DeploymentFilter>;
  /** Keep only deployments whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter to the objects satisfying every one of these descriptor constraints: the `requires` of a port (`RequiresInput`), handed on unchanged, so a picker offers what the port accepts. Answered from the stored descriptors, in one indexed query */
  requires?: InputMaybe<Array<RequiresInput>>;
  /** Case-insensitive search on the deployment name. */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type DeploymentOrder =
  { createdAt: Ordering; id?: never; localId?: never; }
  |  { createdAt?: never; id: Ordering; localId?: never; }
  |  { createdAt?: never; id?: never; localId: Ordering; };

/** A single runtime descriptor key/value pair carried by a candidate object. */
export type DescriptorInput = {
  /** The descriptor key, e.g. 'axes'. */
  key: Scalars['String']['input'];
  /** The descriptor value. Any JSON-serializable value. */
  value: Scalars['Arg']['input'];
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

/** Represents a device assigned to users within an organization. */
export type Device = {
  __typename?: 'Device';
  /** The device identifier. */
  deviceId: Scalars['ID']['output'];
  /** Unique ID of the device. */
  id: Scalars['ID']['output'];
};

/** A reference to a built Docker image. */
export type DockerImage = {
  __typename?: 'DockerImage';
  /** When this image was built. */
  buildAt: Scalars['DateTime']['output'];
  /** The fully-qualified image reference (registry/name:tag). */
  imageString: Scalars['String']['output'];
};

export type DockerImageInput = {
  buildAt: Scalars['DateTime']['input'];
  imageString: Scalars['String']['input'];
};

/** Input for attaching a log dump to a pod. */
export type DumpLogsInput = {
  /** The captured log output to store. */
  logs: Scalars['String']['input'];
  /** The ID of the pod the logs belong to. */
  pod: Scalars['ID']['input'];
};

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
  /** The path the prop reads: a root (`self`, `deps`, `args`, `task`, `queries`, `subscriptions`, `viewer`, `then`, `event`, `error`), a local, a loop variable or a record, and what follows it. */
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

/** What running an implementation again would do to the world. Purely informational: shown to whoever decides about a lost task. */
export enum Effects {
  Irreversible = 'IRREVERSIBLE',
  None = 'NONE',
  Repeatable = 'REPEATABLE',
  Unknown = 'UNKNOWN'
}

/** How an implementation runs: a WORKFLOW may call other actions and is resumed from its journal when its agent dies; a PLAIN one's task ends LOST. */
export enum Execution {
  Plain = 'PLAIN',
  Workflow = 'WORKFLOW'
}

/** A buildable variant of a release: a specific Docker image together with the selectors and requirements needed to run it. */
export type Flavour = {
  __typename?: 'Flavour';
  /** The files this flavour's app brings, as its inspection declared them (name, kind, ref, size, and the path in the image or an https source). */
  assets: Scalars['UntypedParams']['output'];
  /** The bloks this flavour's app brings, parsed and ready to draw, in the order it declared them; of one context only when `context` is given. */
  blokImplementations: Array<FlavourBlok>;
  /** Blok implementation manifests declared by this flavour's inspection (rekuest_core BlokImplementationInput shape): the app's LOGO, its actions' ACTION_LOGOs, panels and scenes. */
  bloks: Scalars['UntypedParams']['output'];
  /** The action definitions this flavour provides. */
  definitions: Array<Definition>;
  /** The deployments that run this flavour. */
  deployments: Array<Deployment>;
  /** This object's descriptors, a flat mapping of key to value: the facts about it that a trigger can test (e.g. `@kabinet/status`). The keys are the ones kabinet declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** This flavour's stored vector, as `<model id>:<floats>`. Null until it has been indexed. */
  embedding?: Maybe<Scalars['Embedding']['output']>;
  id: Scalars['ID']['output'];
  /** The Docker image this flavour deploys. */
  image: DockerImage;
  /** The stored logo of this flavour, which is its release's. */
  logo?: Maybe<Scalars['String']['output']>;
  /** This flavour's app logo: its default LOGO blok, or its first. */
  logoBlok?: Maybe<FlavourBlok>;
  /** The raw app manifest this flavour was built from. */
  manifest: Scalars['UntypedParams']['output'];
  /** The name of this flavour (e.g. 'vanilla', 'cuda'). */
  name: Scalars['String']['output'];
  /** The original (upstream) logo URL of this flavour, which is its release's. */
  originalLogo?: Maybe<Scalars['String']['output']>;
  /** The release this flavour belongs to. */
  release: Release;
  /** The GitHub repository this flavour was built from, if it came from one. */
  repo?: Maybe<GithubRepo>;
  /** The services this flavour requires in order to run. */
  requirements: Array<Requirement>;
  /** The hardware/capability selectors a backend must satisfy to run this flavour. */
  selectors: Array<Selector>;
  /** The imported OCI repository this flavour was read from, if it came from one. */
  source?: Maybe<OciRepo>;
};


/** A buildable variant of a release: a specific Docker image together with the selectors and requirements needed to run it. */
export type FlavourBlokImplementationsArgs = {
  context?: InputMaybe<ComponentContext>;
};


/** A buildable variant of a release: a specific Docker image together with the selectors and requirements needed to run it. */
export type FlavourDefinitionsArgs = {
  filters?: InputMaybe<DefinitionFilter>;
  ordering?: Array<DefinitionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A buildable variant of a release: a specific Docker image together with the selectors and requirements needed to run it. */
export type FlavourDeploymentsArgs = {
  filters?: InputMaybe<DeploymentFilter>;
  ordering?: Array<DeploymentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A blok a flavour's app brings: its LOGO, an action's ACTION_LOGO, a panel (HTML) or a scene (SCENE). Its source is parsed into `componentTree` when the flavour is imported; nothing of it runs here. */
export type FlavourBlok = {
  __typename?: 'FlavourBlok';
  /** The whole component tree as one JSON value (a list of roots) in the wire spelling (snake_case keys), as rekuest serves `Blok.componentTree`. Null when the source does not parse. */
  componentTree?: Maybe<Scalars['JSON']['output']>;
  /** The renderer its root lives in. */
  context: ComponentContext;
  /** Whether it is its app's default for its context (the app's logo is its default LOGO). */
  default: Scalars['Boolean']['output'];
  /** What a preview renders it with. */
  demo?: Maybe<Scalars['JSON']['output']>;
  /** What the app says the blok shows. */
  description?: Maybe<Scalars['String']['output']>;
  /** The flavour whose app brings this blok. */
  flavourId: Scalars['ID']['output'];
  /** The model ('sha256:...') this blok decorates, if any. */
  forModel?: Maybe<Scalars['String']['output']>;
  /** The node of `forModel` it attaches to; the model's root when null. */
  forNode?: Maybe<Scalars['String']['output']>;
  /** A SHA-256 of what the blok draws: its component tree, context and what it declares beside it. Two bloks with the same hash draw the same thing, so a client may keep what it drew under it. */
  hash: Scalars['String']['output'];
  /** `<flavour id>:<key>`: what `flavourBlok` finds it by. */
  id: Scalars['ID']['output'];
  /** The key the app declared this blok under, unique within it. */
  key: Scalars['String']['output'];
  /** Its locals, as the app declared them (snake_case keys). */
  locals: Scalars['JSON']['output'];
  /** Why the blok's source does not parse, or null. */
  parseError?: Maybe<Scalars['String']['output']>;
  /** Its declared reads (snake_case keys). */
  queries: Scalars['JSON']['output'];
  /** The blok language version it speaks; null for a blok an app brought before blok language v2. */
  vocab?: Maybe<Scalars['Int']['output']>;
};

/** Filter for flavours. */
export type FlavourFilter = {
  AND?: InputMaybe<FlavourFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<FlavourFilter>;
  OR?: InputMaybe<FlavourFilter>;
  /** Keep only flavours that provide one of the given definitions. */
  hasDefinitions?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Keep only flavours whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter to the objects satisfying every one of these descriptor constraints: the `requires` of a port (`RequiresInput`), handed on unchanged, so a picker offers what the port accepts. Answered from the stored descriptors, in one indexed query */
  requires?: InputMaybe<Array<RequiresInput>>;
  /** Search by name: a case-insensitive substring, or semantic similarity of the query to the flavour's name and the app it was built from. Substring matches rank first, then by similarity; an explicit `ordering` replaces that ranking. */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type FlavourOrder =
  { releasedAt: Ordering; };

/** A GitHub repository tracked by Kabinet and scanned for deployable Arkitekt apps. */
export type GithubRepo = {
  __typename?: 'GithubRepo';
  /** When this repository was first added to Kabinet. */
  addedAt: Scalars['DateTime']['output'];
  /** The bloks this repository publishes on its own, in its `.arkitekt/bloks.yaml`. */
  bloks: Array<RepoBlok>;
  /** The branch that is scanned for app manifests. */
  branch: Scalars['String']['output'];
  /** This object's descriptors, a flat mapping of key to value: the facts about it that a trigger can test (e.g. `@kabinet/status`). The keys are the ones kabinet declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** This repository's stored vector, as `<model id>:<floats>`. Null until it has been indexed. */
  embedding?: Maybe<Scalars['Embedding']['output']>;
  /** The flavours discovered by scanning this repository. */
  flavours: Array<Flavour>;
  id: Scalars['ID']['output'];
  /** The URL for opening a new issue against this repository on GitHub. */
  issueUrl: Scalars['String']['output'];
  /** The human-readable name of the repository. */
  name: Scalars['String']['output'];
  /** The organization that owns this repository. */
  organization: Organization;
  /** The repository name on GitHub (the part after the owner). */
  repo: Scalars['String']['output'];
  /** When this repository was last updated. */
  updatedAt: Scalars['DateTime']['output'];
  /** The URL of this repository on GitHub. */
  url: Scalars['String']['output'];
  /** The GitHub owner (user or organization) of the repository. */
  user: Scalars['String']['output'];
};


/** A GitHub repository tracked by Kabinet and scanned for deployable Arkitekt apps. */
export type GithubRepoBloksArgs = {
  filters?: InputMaybe<RepoBlokFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A GitHub repository tracked by Kabinet and scanned for deployable Arkitekt apps. */
export type GithubRepoFlavoursArgs = {
  filters?: InputMaybe<FlavourFilter>;
  ordering?: Array<FlavourOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Numeric/aggregatable fields of GithubRepo */
export enum GithubRepoField {
  CreatedAt = 'CREATED_AT'
}

/** Filter for tracked GitHub repositories. */
export type GithubRepoFilter = {
  AND?: InputMaybe<GithubRepoFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<GithubRepoFilter>;
  OR?: InputMaybe<GithubRepoFilter>;
  /** Case-insensitive match on the branch name. */
  branch?: InputMaybe<Scalars['String']['input']>;
  /** Keep only repositories whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Case-insensitive match on the GitHub repository name. */
  repo?: InputMaybe<Scalars['String']['input']>;
  /** Search by name: a case-insensitive substring, or semantic similarity of the query to the repository's name. Substring matches rank first, then by similarity; an explicit `ordering` replaces that ranking. */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Case-insensitive match on the GitHub owner. */
  user?: InputMaybe<Scalars['String']['input']>;
};

export type GithubRepoOrder =
  { addedAt: Ordering; id?: never; name?: never; updatedAt?: never; }
  |  { addedAt?: never; id: Ordering; name?: never; updatedAt?: never; }
  |  { addedAt?: never; id?: never; name: Ordering; updatedAt?: never; }
  |  { addedAt?: never; id?: never; name?: never; updatedAt: Ordering; };

export type GithubRepoStats = {
  __typename?: 'GithubRepoStats';
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


export type GithubRepoStatsAvgArgs = {
  field: GithubRepoField;
};


export type GithubRepoStatsDistinctCountArgs = {
  field: GithubRepoField;
};


export type GithubRepoStatsMaxArgs = {
  field: GithubRepoField;
};


export type GithubRepoStatsMinArgs = {
  field: GithubRepoField;
};


export type GithubRepoStatsSeriesArgs = {
  by: Granularity;
  field: GithubRepoField;
  timestampField: GithubRepoTimestampField;
};


export type GithubRepoStatsSumArgs = {
  field: GithubRepoField;
};

/** Datetime fields of GithubRepo for bucketing */
export enum GithubRepoTimestampField {
  CreatedAt = 'CREATED_AT'
}

export enum Granularity {
  Day = 'DAY',
  Hour = 'HOUR',
  Month = 'MONTH',
  Quarter = 'QUARTER',
  Week = 'WEEK',
  Year = 'YEAR'
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

/** A implementation is a blueprint for a action. It is composed of a definition, a list of dependencies, and a list of params. */
export type ImplementationInput = {
  /** A hash of the implementation's code. A workflow is only resumed by an implementation with the same hash. */
  codeHash?: InputMaybe<Scalars['String']['input']>;
  /** The definition of the implementation. This is used to uniquely identify the implementation */
  definition: DefinitionInput;
  /** The agent dependencies required by this implementation. */
  dependencies?: Array<AgentDependencyInput>;
  /** What running this implementation again would do to the world. Informational: shown to whoever decides about a lost task. */
  effects?: Effects;
  /** How this implementation runs: a WORKFLOW may call other actions and is resumed from its journal when its agent dies. */
  execution?: Execution;
  /** The instance id of the agent this implementation is bound to. */
  instanceId?: InputMaybe<Scalars['String']['input']>;
  /** The interface of the implementation. This is used to group implementations together in the UI */
  interface?: InputMaybe<Scalars['String']['input']>;
  /** The locks of the implementation. This is used to specify which resources the implementation needs to run */
  locks?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The key of the agent's action logo blok (context ACTION_LOGO) that draws this action. */
  logo?: InputMaybe<Scalars['String']['input']>;
  /** The states that the implementation manipulates. This is used to identify which states are manipulated by the implementation, and can be use to enhance state safety in the system */
  manipulates?: InputMaybe<Array<Scalars['String']['input']>>;
  /** Whether Rekuest should mint a signed provenance token when this implementation is assigned. Default true (provenance-by-default); set false for trivial/internal tasks that never produce external provenance. */
  needsToken?: Scalars['Boolean']['input'];
  /** The optimistics of the definition. This is used to optimistically set state values when the action is assigned, to provide a better user experience. */
  optimistics?: InputMaybe<Array<OptimisticInput>>;
  /** The params of the implementation. This is used to pass parameters to the implementation */
  params?: InputMaybe<Scalars['AnyDefault']['input']>;
  /** The downstream service(s) the provenance token should be scoped to (the token's `aud`). If omitted, Rekuest derives the audience from the structures the assignment acts on. */
  provenanceAudience?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The tracks of the definition. This is used to track values over time during the runtime of an action. This is the state of a dependency */
  tracks?: InputMaybe<Array<TrackInput>>;
};

/** Input for importing an OCI repository, or reading an imported one again. */
export type ImportRepoInput = {
  /** The channels to follow besides the releases, e.g. ['main']. Omit to keep what is followed. */
  channels?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The repository, e.g. 'ghcr.io/org/app'. No tag, no digest. */
  reference: Scalars['String']['input'];
};

/** A file the app brings, as its image holds it. */
export type InspectedAssetInput = {
  /** What the file is. */
  kind: AssetKind;
  /** The name bloks refer to the asset by, as in `@self.assets.<name>`. Unique within the agent. */
  name: Scalars['String']['input'];
  /** Where the file is, relative to the app's directory. Absent for a file the image does not hold: that one names a `source`. */
  path?: InputMaybe<Scalars['String']['input']>;
  /** 'sha256:' and the hex SHA-256 of the file's exact bytes. */
  ref: Scalars['String']['input'];
  /** The size of the file in bytes. Required unless the asset names a `source`: an agent knows the size of a file it holds. */
  size?: InputMaybe<Scalars['Int']['input']>;
  /** The https URL the file can be fetched from. Given instead of holding the file: the agent uploads nothing, an admin's client fetches it. */
  source?: InputMaybe<Scalars['String']['input']>;
};

export type InspectionInput = {
  /** The files the app brings: models and images its bloks call by name. */
  assets?: Array<InspectedAssetInput>;
  bloks?: Array<BlokImplementationInput>;
  implementations: Array<ImplementationInput>;
  locks: Array<LockImplementationInput>;
  requirements: Array<RequirementInput>;
  size?: InputMaybe<Scalars['Int']['input']>;
  states: Array<StateImplementationInput>;
};

/** Requires the backend resource to carry a qualifier (the nodeSelector analog). */
export type LabelSelector = Selector & {
  __typename?: 'LabelSelector';
  /** The qualifier key the backend resource must carry. */
  key: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required: Scalars['Boolean']['output'];
  /** The value the qualifier must have; null means the key merely has to exist. */
  value?: Maybe<Scalars['String']['output']>;
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight: Scalars['Int']['output'];
};

export type LabelSelectorInput = {
  /** The qualifier key the backend resource must carry. */
  key: Scalars['String']['input'];
  kind?: Scalars['String']['input'];
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required?: Scalars['Boolean']['input'];
  /** The value the qualifier must have; null means the key merely has to exist. */
  value?: InputMaybe<Scalars['String']['input']>;
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight?: Scalars['Int']['input'];
};

/** The kind of a blok local: a port kind, or ANY (an untyped value, which skips the bind and argument kind checks). No action port is ever ANY. */
export enum LocalKind {
  /** An untyped value: nothing gave the local a kind. A path below it is taken as written. */
  Any = 'ANY',
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

/** Which locks does the agent provide in general */
export type LockDefinitionInput = {
  /** Describe the lock a bit */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The key of the lock. This is used to uniquely identify the lock */
  key: Scalars['String']['input'];
};

/** Which locks does the agent provide in general */
export type LockImplementationInput = {
  /** The lock definition this implementation fulfills. */
  definition: LockDefinitionInput;
  /** The key of the lock implementation. */
  key: Scalars['String']['input'];
};

/** A captured snapshot of a pod's logs at a point in time. */
export type LogDump = {
  __typename?: 'LogDump';
  /** When these logs were captured. */
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** The captured log output. */
  logs: Scalars['String']['output'];
  /** The pod these logs were captured from. */
  pod: Pod;
};

export type ManifestInput = {
  author?: Scalars['String']['input'];
  entrypoint?: InputMaybe<Scalars['String']['input']>;
  identifier: Scalars['String']['input'];
  logo?: InputMaybe<Scalars['String']['input']>;
  scopes?: Array<Scalars['String']['input']>;
  version: Scalars['String']['input'];
};

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
  /** Record a standing approval of a release (backed by a lok mandate) so deployers may install it. */
  approveRelease: ReleaseApproval;
  /** Register a built app image, creating its release and flavour as needed. */
  createAppImage: Release;
  /** Schedule a flavour onto a backend, creating a new deployment. */
  createDeployment: Deployment;
  /** Start tracking a new GitHub repository so it can be scanned for apps. */
  createGithubRepo: GithubRepo;
  /** Register a running pod for a deployment on a backend. */
  createPod: Pod;
  /** Declare (register or update) a backend for the current client. */
  declareBackend: Backend;
  /** Declare (register or update) a resource on one of your backends. */
  declareResource: Resource;
  /** Delete a backend and return its ID. */
  deleteBackend: Scalars['ID']['output'];
  /** Delete a pod and return its ID. */
  deletePod: Scalars['ID']['output'];
  /** Attach a captured log dump to a pod. */
  dumpLogs: LogDump;
  /** Import an OCI repository that carries an app's releases (e.g. ghcr.io/org/app), or read an imported one again. */
  importRepo: OciRepo;
  /** Rescan every tracked GitHub repository for new or updated app manifests. */
  rescanRepos: Array<GithubRepo>;
  /** Withdraw a release approval. */
  revokeApproval: ReleaseApproval;
  /** Scan a tracked GitHub repository for app manifests and update its flavours. */
  scanRepo: GithubRepo;
  /** Update the status of an existing deployment. */
  updateDeployment: Deployment;
  /** Update the status of an existing pod. */
  updatePod: Pod;
};


export type MutationApproveReleaseArgs = {
  input: ApproveReleaseInput;
};


export type MutationCreateAppImageArgs = {
  input: AppImageInput;
};


export type MutationCreateDeploymentArgs = {
  input: CreateDeploymentInput;
};


export type MutationCreateGithubRepoArgs = {
  input: CreateGithubRepoInput;
};


export type MutationCreatePodArgs = {
  input: CreatePodInput;
};


export type MutationDeclareBackendArgs = {
  input: DeclareBackendInput;
};


export type MutationDeclareResourceArgs = {
  input: DeclareResourceInput;
};


export type MutationDeleteBackendArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePodArgs = {
  input: DeletePodInput;
};


export type MutationDumpLogsArgs = {
  input: DumpLogsInput;
};


export type MutationImportRepoArgs = {
  input: ImportRepoInput;
};


export type MutationRevokeApprovalArgs = {
  input: RevokeApprovalInput;
};


export type MutationScanRepoArgs = {
  input: ScanRepoInput;
};


export type MutationUpdateDeploymentArgs = {
  input: UpdateDeploymentInput;
};


export type MutationUpdatePodArgs = {
  input: UpdatePodInput;
};

/** A repository on an OCI registry that carries an app's releases beside its images. Importing it is how an app is installed. */
export type OciRepo = {
  __typename?: 'OciRepo';
  /** When this repository was imported. */
  addedAt: Scalars['DateTime']['output'];
  /** The channels followed besides the releases. */
  channels: Array<Scalars['String']['output']>;
  /** The flavours read from this repository. */
  flavours: Array<Flavour>;
  id: Scalars['ID']['output'];
  /** The repository, as it was imported. */
  name: Scalars['String']['output'];
  /** The organization that imported this repository. */
  organization: Organization;
  /** The repository as an image reference starts: `registry/repository`. */
  reference: Scalars['String']['output'];
  /** The registry host, e.g. ghcr.io. */
  registry: Scalars['String']['output'];
  /** The repository path on the registry, e.g. org/app. */
  repository: Scalars['String']['output'];
  /** When the registry was last read. */
  scannedAt?: Maybe<Scalars['DateTime']['output']>;
  /** When this repository was last updated. */
  updatedAt: Scalars['DateTime']['output'];
};


/** A repository on an OCI registry that carries an app's releases beside its images. Importing it is how an app is installed. */
export type OciRepoFlavoursArgs = {
  filters?: InputMaybe<FlavourFilter>;
  ordering?: Array<FlavourOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

/** Requires a oneAPI-capable (Intel) accelerator on the backend. */
export type OneApiSelector = Selector & {
  __typename?: 'OneApiSelector';
  kind: Scalars['String']['output'];
  /** The minimum oneAPI version required. */
  oneapiVersion?: Maybe<Scalars['String']['output']>;
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required: Scalars['Boolean']['output'];
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight: Scalars['Int']['output'];
};

export type OneApiSelectorInput = {
  kind?: Scalars['String']['input'];
  /** The minimum oneAPI version required. */
  oneapiVersion?: InputMaybe<Scalars['String']['input']>;
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required?: Scalars['Boolean']['input'];
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight?: Scalars['Int']['input'];
};

/**
 *  An optimistic is used to optimistically set state values when the action is assigned. This is used to provide a better user experience by optimistically setting state values when the action is assigned, instead of waiting for the action to be executed and the state to be updated. This will only ever happen on the frontend.
 *
 *
 */
export type OptimisticInput = {
  /** Static JSON pointer into the assignment args for the value to set; omitted: the whole args. */
  accessor?: InputMaybe<Scalars['String']['input']>;
  /** Static JSON pointer into the state value to set. Mutually exclusive with `path_call`. */
  path?: InputMaybe<Scalars['String']['input']>;
  /** Pure UtilCall returning the pointer dynamically; may reference `args` (the assignment arguments). Mutually exclusive with `path`. */
  pathCall?: InputMaybe<UtilCallInput>;
  /** The state to optimistically set when the action is assigned */
  state: Scalars['String']['input'];
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

/** Represents an organization in the system. */
export type Organization = {
  __typename?: 'Organization';
  /** This service's id of the organization. */
  id: Scalars['ID']['output'];
  /** The organization across issuers and services: `<issuer>#<org>`. */
  identifier: Scalars['String']['output'];
};

/** A running instance of a deployment on a backend. */
export type Pod = {
  __typename?: 'Pod';
  /** The backend this pod runs on. */
  backend: Backend;
  /** The OAuth2 client ID this pod authenticates as, if any. */
  clientId?: Maybe<Scalars['String']['output']>;
  /** The deployment this pod is an instance of. */
  deployment: Deployment;
  /** This object's descriptors, a flat mapping of key to value: the facts about it that a trigger can test (e.g. `@kabinet/status`). The keys are the ones kabinet declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  /** The most recent log dump captured from this pod. */
  latestLogDump?: Maybe<LogDump>;
  /** The display name of this pod, combining backend, flavour and app identifier. */
  name: Scalars['String']['output'];
  /** The identifier of this pod as known to the backend. */
  podId: Scalars['String']['output'];
  /** The resource this pod is scheduled onto, if any. */
  resource?: Maybe<Resource>;
  /** The current lifecycle status of this pod. */
  status: PodStatus;
};

/** Something that happened to a pod: it was created, updated or deleted. */
export type PodEvent = {
  __typename?: 'PodEvent';
  /** The pod that was just created, if this event is a creation. */
  create?: Maybe<Pod>;
  /** The ID of the pod that was deleted, if this event is a deletion. */
  delete?: Maybe<Scalars['ID']['output']>;
  /** The pod that just changed, if this event is an update. */
  update?: Maybe<Pod>;
};

/** Filter for pods. */
export type PodFilter = {
  AND?: InputMaybe<PodFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<PodFilter>;
  OR?: InputMaybe<PodFilter>;
  /** Keep only pods running on the given backend. */
  backend?: InputMaybe<Scalars['ID']['input']>;
  /** Keep only pods whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter to the objects satisfying every one of these descriptor constraints: the `requires` of a port (`RequiresInput`), handed on unchanged, so a picker offers what the port accepts. Answered from the stored descriptors, in one indexed query */
  requires?: InputMaybe<Array<RequiresInput>>;
  /** Match pods by the name of their backend. */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type PodOrder =
  { createdAt: Ordering; id?: never; status?: never; }
  |  { createdAt?: never; id: Ordering; status?: never; }
  |  { createdAt?: never; id?: never; status: Ordering; };

/** The lifecycle status of a pod. */
export enum PodStatus {
  Failed = 'FAILED',
  Pending = 'PENDING',
  Running = 'RUNNING',
  Stopped = 'STOPPED',
  Stopping = 'STOPPING',
  Unkown = 'UNKOWN'
}

/** A demand on the ports (args or returns) of an action. */
export type PortDemandInput = {
  /** Require that the action has a specific number of ports. This is used to identify the demand in the system. */
  forceLength?: InputMaybe<Scalars['Int']['input']>;
  /** Require that the action has a specific number of non-nullable ports. This is used to identify the demand in the system. */
  forceNonNullableLength?: InputMaybe<Scalars['Int']['input']>;
  /** Require that the action has a specific number of structure ports. This is used to identify the demand in the system. */
  forceStructureLength?: InputMaybe<Scalars['Int']['input']>;
  /** The kind of the demand. You can ask for args or returns */
  kind: DemandKind;
  /** The matches of the demand.  */
  matches?: InputMaybe<Array<PortMatchInput>>;
};

/** A Port Group is a group of ports that are related to each other. It is used to group ports together in the UI and provide a better user experience. */
export type PortGroupInput = {
  /** The description of the port group, displayed in the UI */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The effects applied to the port group as a whole */
  effects?: InputMaybe<Array<EffectInput>>;
  /** The key of the port group. This is used to uniquely identify the port group */
  key: Scalars['String']['input'];
  /** The keys of the root arg ports in this group; a port belongs to at most one group */
  ports?: Array<Scalars['String']['input']>;
  /** The title of the port group, displayed in the UI */
  title?: InputMaybe<Scalars['String']['input']>;
};

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

/**
 * A structural (and optionally object-level) match against a port. Purely
 *     structural fields target the port shape; the optional ``descriptors`` carry a concrete
 *     runtime object's key/value pairs, evaluated against the port's compiled requires
 *     micro-constraint to find actions the object can actually be passed to.
 */
export type PortMatchInput = {
  /** The index of the port to match. */
  at?: InputMaybe<Scalars['Int']['input']>;
  /** The matches for the children of the port to match. */
  children?: InputMaybe<Array<PortMatchInput>>;
  /** Runtime descriptors of a candidate object, evaluated against the port's compiled requires micro-constraint. Omit for purely structural matching. */
  descriptors?: InputMaybe<Array<DescriptorInput>>;
  /** The canonical pint dimensionality the port must have (QUANTITY wiring-compatibility key). */
  dimension?: InputMaybe<Scalars['String']['input']>;
  /** The identifier of the port to match. */
  identifier?: InputMaybe<Scalars['String']['input']>;
  /** The key of the port to match. */
  key?: InputMaybe<Scalars['String']['input']>;
  /** The kind of the port to match. */
  kind?: InputMaybe<PortKind>;
  /** Whether the port is nullable. */
  nullable?: InputMaybe<Scalars['Boolean']['input']>;
};

/** An interface that an action definition can implement (e.g. Predicate). */
export type Protocol = {
  __typename?: 'Protocol';
  /** A description of this protocol. */
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** The name of this protocol. */
  name: Scalars['String']['output'];
};

/** Filter for protocols. */
export type ProtocolFilter = {
  AND?: InputMaybe<ProtocolFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ProtocolFilter>;
  OR?: InputMaybe<ProtocolFilter>;
  /** Keep only protocols whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Case-insensitive search on the protocol name. */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ProtocolOrder =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

export type Provides = {
  __typename?: 'Provides';
  key: Scalars['String']['output'];
  operator: DescriptorOperator;
  value?: Maybe<Scalars['Arg']['output']>;
};

export type ProvidesInput = {
  /** The key of the provision: the descriptor name the constraint reads, matched verbatim as one flat key of the candidate object (any non-empty string, e.g. 'axes' or '@mikro/n_space_axes') */
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

/** A qualifier that describes some property of the action */
export type QualifierInput = {
  /** The key of the qualifier. */
  key: Scalars['String']['input'];
  /** The value of the qualifier. */
  value: Scalars['String']['input'];
};

export type Query = {
  __typename?: 'Query';
  /** Return a single app by its ID. */
  app: App;
  /** List all apps visible to the current organization. */
  apps: Array<App>;
  /** Return a single backend by its ID. */
  backend: Backend;
  /** List all backends visible to the current organization. */
  backends: Array<Backend>;
  /** Return a single action definition by its ID. */
  definition: Definition;
  /** List all action definitions visible to the current organization. */
  definitions: Array<Definition>;
  /** Return a single deployment by its ID. */
  deployment: Deployment;
  /** List all deployments visible to the current organization. */
  deployments: Array<Deployment>;
  /** Return a single flavour (a buildable variant of a release) by its ID. */
  flavour: Flavour;
  /** Return a single blok a flavour's app brings by its ID (`<flavour id>:<key>`), or null when there is none. */
  flavourBlok?: Maybe<FlavourBlok>;
  /** List all flavours visible to the current organization. */
  flavours: Array<Flavour>;
  /** Return a single tracked GitHub repository by its ID. */
  githubRepo: GithubRepo;
  /** Stats about github repos */
  githubRepoStats: GithubRepoStats;
  /** List all tracked GitHub repositories visible to the current organization. */
  githubRepos: Array<GithubRepo>;
  /** Return the currently authenticated user. */
  me: User;
  /** Let a backend discover one of its own pods by local identifier. */
  myPodAt?: Maybe<Pod>;
  /** Return a single imported OCI repository by its ID. */
  ociRepo: OciRepo;
  /** List all imported OCI repositories visible to the current organization. */
  ociRepos: Array<OciRepo>;
  /** Return a single pod by its ID. */
  pod: Pod;
  /** Return the pod that a given agent (client) is running for a deployment. */
  podForAgent?: Maybe<Pod>;
  /** List all pods visible to the current organization. */
  pods: Array<Pod>;
  /** Return a single app release by its ID. */
  release: Release;
  /** Return a single release approval by its ID. */
  releaseApproval: ReleaseApproval;
  /** List all release approvals of the current organization. */
  releaseApprovals: Array<ReleaseApproval>;
  /** List all app releases visible to the current organization. */
  releases: Array<Release>;
  /** Return a single blok a repository publishes by its ID. */
  repoBlok: RepoBlok;
  /** List the bloks the tracked GitHub repositories publish on their own, visible to the current organization. */
  repoBloks: Array<RepoBlok>;
  /** Return a single backend resource by its ID. */
  resource: Resource;
  /** List all backend resources visible to the current organization. */
  resources: Array<Resource>;
};


export type QueryAppArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAppsArgs = {
  filters?: InputMaybe<AppFilter>;
  ordering?: Array<AppOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryBackendArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBackendsArgs = {
  filters?: InputMaybe<BackendFilter>;
  ordering?: Array<BackendOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryDefinitionArgs = {
  hash?: InputMaybe<Scalars['ActionHash']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryDefinitionsArgs = {
  filters?: InputMaybe<DefinitionFilter>;
  ordering?: Array<DefinitionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryDeploymentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDeploymentsArgs = {
  filters?: InputMaybe<DeploymentFilter>;
  ordering?: Array<DeploymentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryFlavourArgs = {
  id: Scalars['ID']['input'];
};


export type QueryFlavourBlokArgs = {
  id: Scalars['ID']['input'];
};


export type QueryFlavoursArgs = {
  filters?: InputMaybe<FlavourFilter>;
  ordering?: Array<FlavourOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryGithubRepoArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGithubRepoStatsArgs = {
  filters?: InputMaybe<GithubRepoFilter>;
};


export type QueryGithubReposArgs = {
  filters?: InputMaybe<GithubRepoFilter>;
  ordering?: Array<GithubRepoOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMyPodAtArgs = {
  localId: Scalars['ID']['input'];
};


export type QueryOciRepoArgs = {
  id: Scalars['ID']['input'];
};


export type QueryOciReposArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryPodArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPodForAgentArgs = {
  clientId: Scalars['ID']['input'];
};


export type QueryPodsArgs = {
  filters?: InputMaybe<PodFilter>;
  ordering?: Array<PodOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryReleaseArgs = {
  id: Scalars['ID']['input'];
};


export type QueryReleaseApprovalArgs = {
  id: Scalars['ID']['input'];
};


export type QueryReleaseApprovalsArgs = {
  filters?: InputMaybe<ReleaseApprovalFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryReleasesArgs = {
  filters?: InputMaybe<ReleaseFilter>;
  ordering?: Array<ReleaseOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryRepoBlokArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRepoBloksArgs = {
  filters?: InputMaybe<RepoBlokFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryResourceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryResourcesArgs = {
  filters?: InputMaybe<ResourceFilter>;
  ordering?: Array<ResourceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Requires a minimum amount of system memory on the backend. */
export type RamSelector = Selector & {
  __typename?: 'RAMSelector';
  kind: Scalars['String']['output'];
  /** The minimum amount of system memory required, in MB. */
  min?: Maybe<Scalars['Int']['output']>;
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required: Scalars['Boolean']['output'];
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight: Scalars['Int']['output'];
};

export type RamSelectorInput = {
  kind?: Scalars['String']['input'];
  /** The minimum amount of system memory required, in MB. */
  min?: InputMaybe<Scalars['Int']['input']>;
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required?: Scalars['Boolean']['input'];
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight?: Scalars['Int']['input'];
};

/** A specific version of an app, bundling the flavours that can be deployed for it. */
export type Release = {
  __typename?: 'Release';
  /** The app this release belongs to. */
  app: App;
  /** The digest an approval of this release is pinned to (identity, scopes, requirements, images). Changes whenever the release is re-published differently. */
  approvalDigest: Scalars['String']['output'];
  /** Standing approvals to run this release, newest first. */
  approvals: Array<ReleaseApproval>;
  /** The channel this is the latest build of. Null for a release proper, which never changes. */
  channel?: Maybe<Scalars['String']['output']>;
  /** The deployments that run a flavour of this release. */
  deployments: Array<Deployment>;
  /** This object's descriptors, a flat mapping of key to value: the facts about it that a trigger can test (e.g. `@kabinet/status`). The keys are the ones kabinet declares for this structure, and the values are the ones a signal about the object carries. Empty for a structure that declares none */
  descriptors: Scalars['JSON']['output'];
  /** Whether every flavour image is addressed by content digest. If not, a rebuild pushed under the same tag is not detected by the approval digest. */
  digestPinned: Scalars['Boolean']['output'];
  /** The entrypoint used to start the app. */
  entrypoint: Scalars['String']['output'];
  /** The flavours (buildable variants) available for this release. */
  flavours: Array<Flavour>;
  id: Scalars['ID']['output'];
  /** The stored logo of this release: the path of the ingested media, or null while none has been ingested. */
  logo?: Maybe<Scalars['String']['output']>;
  /** The release's logo: the LOGO blok of the first of its flavours that brings one. */
  logoBlok?: Maybe<FlavourBlok>;
  /** The subject manifest to pre-authorize in lok (createMandate): identifier, version, scopes and the union of flavour requirements. */
  mandateManifest: Scalars['UntypedParams']['output'];
  /** The display name of this release, in the form 'identifier:version'. */
  name: Scalars['String']['output'];
  /** The original (upstream) logo URL of this release. */
  originalLogo?: Maybe<Scalars['String']['output']>;
  /** The source revision this release was built from, when its publisher said. */
  revision?: Maybe<Scalars['String']['output']>;
  /** The OAuth2 scopes this release requires. */
  scopes: Array<Scalars['String']['output']>;
  /** The semantic version of this release. */
  version: Scalars['String']['output'];
};


/** A specific version of an app, bundling the flavours that can be deployed for it. */
export type ReleaseApprovalsArgs = {
  filters?: InputMaybe<ReleaseApprovalFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A specific version of an app, bundling the flavours that can be deployed for it. */
export type ReleaseDeploymentsArgs = {
  filters?: InputMaybe<DeploymentFilter>;
  ordering?: Array<DeploymentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A specific version of an app, bundling the flavours that can be deployed for it. */
export type ReleaseFlavoursArgs = {
  filters?: InputMaybe<FlavourFilter>;
  ordering?: Array<FlavourOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A user's standing approval to run a release, backed by a lok agent mandate that lets a deployer issue mandate keys that run it as them. */
export type ReleaseApproval = {
  __typename?: 'ReleaseApproval';
  /** The deployer app the mandate names. */
  agent: Scalars['String']['output'];
  /** The user the deployed release will act as. */
  approver: User;
  /** Backends allowed to deploy under this approval. Empty means any. */
  backends: Array<Backend>;
  createdAt: Scalars['DateTime']['output'];
  /** The release digest at approval time. */
  digest: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** Not revoked and not stale: deployable. */
  isActive: Scalars['Boolean']['output'];
  /** The release changed since approval; nothing new may be deployed from this approval. */
  isStale: Scalars['Boolean']['output'];
  /** The lok mandate backing this approval. */
  mandateId: Scalars['ID']['output'];
  /** A display name: the approved release and who approved it. */
  name: Scalars['String']['output'];
  /** The approved release. */
  release: Release;
  /** When the approval was withdrawn. */
  revokedAt?: Maybe<Scalars['DateTime']['output']>;
};


/** A user's standing approval to run a release, backed by a lok agent mandate that lets a deployer issue mandate keys that run it as them. */
export type ReleaseApprovalBackendsArgs = {
  filters?: InputMaybe<BackendFilter>;
  ordering?: Array<BackendOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Filter for release approvals. */
export type ReleaseApprovalFilter = {
  AND?: InputMaybe<ReleaseApprovalFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ReleaseApprovalFilter>;
  OR?: InputMaybe<ReleaseApprovalFilter>;
  /** Keep only approvals whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Keep only approvals of this release. */
  release?: InputMaybe<Scalars['ID']['input']>;
  /** Keep only approvals that are not revoked. Staleness depends on the live release and is read from `isStale`. */
  revoked?: InputMaybe<Scalars['Boolean']['input']>;
  /** Case-insensitive search on the approved app identifier or version. */
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Filter for app releases. */
export type ReleaseFilter = {
  AND?: InputMaybe<ReleaseFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ReleaseFilter>;
  OR?: InputMaybe<ReleaseFilter>;
  /** Keep only the releases of this app. */
  app?: InputMaybe<Scalars['ID']['input']>;
  /** Keep only the releases of these apps. */
  apps?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Keep only releases whose app identifier contains this text, case-insensitively. */
  identifier?: InputMaybe<Scalars['String']['input']>;
  /** Keep only releases whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter to the objects satisfying every one of these descriptor constraints: the `requires` of a port (`RequiresInput`), handed on unchanged, so a picker offers what the port accepts. Answered from the stored descriptors, in one indexed query */
  requires?: InputMaybe<Array<RequiresInput>>;
  /** Case-insensitive search on the release version. */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ReleaseOrder =
  { createdAt: Ordering; id?: never; releasedAt?: never; version?: never; }
  |  { createdAt?: never; id: Ordering; releasedAt?: never; version?: never; }
  |  { createdAt?: never; id?: never; releasedAt: Ordering; version?: never; }
  |  { createdAt?: never; id?: never; releasedAt?: never; version: Ordering; };

/** A blok a GitHub repository publishes on its own, in its `.arkitekt/bloks.yaml`. Read when its repository is scanned; nothing of it runs here. It is installed by copying it into rekuest as a custom blok (`installInput`), which keeps its `origin`. */
export type RepoBlok = {
  __typename?: 'RepoBlok';
  /** When a scan first found it. */
  addedAt: Scalars['DateTime']['output'];
  /** The catalogs it needs, as name@version. */
  catalogs: Scalars['JSON']['output'];
  /** The whole component tree as one JSON value (a list of roots, snake_case keys). Null when the source does not parse. */
  componentTree?: Maybe<Scalars['JSON']['output']>;
  /** The renderer its root lives in. */
  context: ComponentContext;
  /** What a preview renders it with, as a rekuest_core BlokDemoInput. */
  demo: Scalars['JSON']['output'];
  /** The agents it draws from, as rekuest_core AgentDependencyInputs (snake_case keys). */
  dependencies: Scalars['JSON']['output'];
  /** What the repository says it shows. */
  description?: Maybe<Scalars['String']['output']>;
  /** The model ('sha256:...') this blok decorates, if any. */
  forModel?: Maybe<Scalars['String']['output']>;
  /** The node of `forModel` it attaches to; the model's root when null. */
  forNode?: Maybe<Scalars['String']['output']>;
  /** A SHA-256 of what the blok draws: its component tree, context and what it declares beside it. A client keeps its preview under it; whether an installed copy is out of date is `installHash`'s to say. */
  hash: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** A SHA-256 of everything installing it writes: its name, description, BSX, declarations (locals, demo, queries, ...), dependencies and target. It is the `originHash` an installed copy keeps, so a copy whose `originHash` differs is out of date, whatever changed. */
  installHash: Scalars['String']['output'];
  /** What installs it: rekuest's `CreateBlokInput`, camelCase, with its `origin` and `originHash` (= `installHash`). Sent to rekuest's `createBlok` as it is; sending it again updates the installed copy in place. */
  installInput: Scalars['JSON']['output'];
  /** Unique in its repository: what a scan finds it again by. */
  key: Scalars['String']['output'];
  /** Its locals, as rekuest_core BlokLocalInputs (arg ports plus persist, snake_case keys). */
  locals: Scalars['JSON']['output'];
  /** The module (an app's own UI extras, registered in rekuest) it renders against besides its catalogs; the Orkestrator's when null. */
  module?: Maybe<Scalars['String']['output']>;
  /** The name it is installed under in rekuest. */
  name: Scalars['String']['output'];
  /** Where it comes from, as rekuest keeps it on an installed copy (`Blok.origin`): `github:<owner>/<repo>:<branch>#<key>`. The same whenever the repository is tracked again. */
  origin: Scalars['String']['output'];
  /** Why its BSX does not parse, or null. */
  parseError?: Maybe<Scalars['String']['output']>;
  /** Its declared reads, as rekuest_core BlokQueryInputs (snake_case keys). */
  queries: Scalars['JSON']['output'];
  /** The repository that publishes it. */
  repo: GithubRepo;
  /** The blok as BSX, as the repository publishes it. */
  source: Scalars['String']['output'];
  /** The file of the repository its BSX was read from; null when it is written inline. */
  sourcePath?: Maybe<Scalars['String']['output']>;
  /** Its declared streams, as rekuest_core BlokSubscriptionInputs (snake_case keys). */
  subscriptions: Scalars['JSON']['output'];
  /** When a scan last wrote it. */
  updatedAt: Scalars['DateTime']['output'];
  /** The blok language version it speaks; 2 is the only one. */
  vocab: Scalars['Int']['output'];
};

/** Filter for the bloks repositories publish. */
export type RepoBlokFilter = {
  AND?: InputMaybe<RepoBlokFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<RepoBlokFilter>;
  OR?: InputMaybe<RepoBlokFilter>;
  /** Keep only bloks of this context (HTML or SCENE). */
  context?: InputMaybe<Scalars['String']['input']>;
  /** Keep only bloks whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Keep only bloks of these repositories. */
  repos?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Case-insensitive substring of the blok's name, key or description. */
  search?: InputMaybe<Scalars['String']['input']>;
};

/** A service that a flavour requires in order to run (e.g. mikro, rekuest). */
export type Requirement = {
  __typename?: 'Requirement';
  /** An optional human-readable description of the requirement. */
  description?: Maybe<Scalars['String']['output']>;
  /** The key identifying this requirement within the flavour. */
  key: Scalars['String']['output'];
  /** Whether the flavour can still run if this service is unavailable. */
  optional: Scalars['Boolean']['output'];
  /** The name of the required service. */
  service: Scalars['String']['output'];
};

export type RequirementInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  key: Scalars['String']['input'];
  optional?: Scalars['Boolean']['input'];
  service: Scalars['String']['input'];
};

export type Requires = {
  __typename?: 'Requires';
  key: Scalars['String']['output'];
  operator: DescriptorOperator;
  value?: Maybe<Scalars['Arg']['output']>;
};

export type RequiresInput = {
  /** The key of the requirement: the descriptor name the constraint reads, matched verbatim as one flat key of the candidate object (any non-empty string, e.g. 'axes' or '@mikro/n_space_axes') */
  key: Scalars['String']['input'];
  /** The operator for the requirement */
  operator: DescriptorOperator;
  /** The value of the requirement. This can be any JSON serializable value; IN/NOT_IN take a list, LTE/GTE a number, EXISTS none */
  value?: InputMaybe<Scalars['Arg']['input']>;
};

/** An allocatable resource on a backend (e.g. a compute slot) that pods can be scheduled onto. */
export type Resource = {
  __typename?: 'Resource';
  /** The backend this resource belongs to. */
  backend: Backend;
  id: Scalars['ID']['output'];
  /** The human-readable name of this resource. */
  name: Scalars['String']['output'];
  /** The pods scheduled onto this resource. */
  pods: Array<Pod>;
  /** Free-form key/value qualifiers describing this resource. */
  qualifiers?: Maybe<Scalars['UntypedParams']['output']>;
  /** The identifier of this resource as known to the backend. */
  resourceId: Scalars['String']['output'];
};


/** An allocatable resource on a backend (e.g. a compute slot) that pods can be scheduled onto. */
export type ResourcePodsArgs = {
  filters?: InputMaybe<PodFilter>;
  ordering?: Array<PodOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Filter for resources. */
export type ResourceFilter = {
  AND?: InputMaybe<ResourceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ResourceFilter>;
  OR?: InputMaybe<ResourceFilter>;
  /** Keep only resources whose ID is in this list. */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Case-insensitive search on the resource name. */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ResourceOrder =
  { createdAt: Ordering; id?: never; name?: never; }
  |  { createdAt?: never; id: Ordering; name?: never; }
  |  { createdAt?: never; id?: never; name: Ordering; };

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
  /** The identifier of the port's type, of the form @package/key. Required for STRUCTURE, MEMORY_STRUCTURE and INTERFACE, where it is the only identity a value has; optional for MODEL and ENUM, where it names the class or enum the port was built from so that agents can map a value back to it. */
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

/** Withdraw a release approval. Revoke the lok mandate as well to stop running pods. */
export type RevokeApprovalInput = {
  id: Scalars['ID']['input'];
};

/** Requires a ROCm-capable (AMD) GPU on the backend. */
export type RocmSelector = Selector & {
  __typename?: 'RocmSelector';
  /** An additional ROCm capability qualifier. */
  apiThing?: Maybe<Scalars['String']['output']>;
  /** The minimum ROCm API version required. */
  apiVersion?: Maybe<Scalars['String']['output']>;
  kind: Scalars['String']['output'];
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required: Scalars['Boolean']['output'];
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight: Scalars['Int']['output'];
};

export type RocmSelectorInput = {
  /** An additional ROCm capability qualifier. */
  apiThing?: InputMaybe<Scalars['String']['input']>;
  /** The minimum ROCm API version required. */
  apiVersion?: InputMaybe<Scalars['String']['input']>;
  kind?: Scalars['String']['input'];
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required?: Scalars['Boolean']['input'];
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight?: Scalars['Int']['input'];
};

/** Input for scanning a tracked GitHub repository for app manifests. */
export type ScanRepoInput = {
  /** The ID of the GitHub repository to scan. */
  id: Scalars['String']['input'];
};

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

/** A selector expresses a hardware (or capability) requirement that a backend must satisfy to run a flavour. */
export type Selector = {
  kind: Scalars['String']['output'];
  /** If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required: Scalars['Boolean']['output'];
  /** Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight: Scalars['Int']['output'];
};

/** A hardware or capability requirement a backend must satisfy to run a flavour, as a discriminated union. required=true is a hard constraint; required=false is a preference scored by weight. Service dependencies are Requirements, never selectors. */
export type SelectorInput = {
  /** (rocm) An additional ROCm capability qualifier. */
  apiThing?: InputMaybe<Scalars['String']['input']>;
  /** (rocm) The minimum ROCm API version required. */
  apiVersion?: InputMaybe<Scalars['String']['input']>;
  /** (cpu) The CPU architecture the image is built for (docker platform / kubernetes.io/arch values, e.g. 'amd64', 'arm64'). */
  arch?: InputMaybe<Scalars['String']['input']>;
  /** (cuda) The minimum CUDA compute capability required (e.g. '8.6') — NVIDIA's standard placement key. */
  computeCapability?: InputMaybe<Scalars['String']['input']>;
  /** (cuda) The number of GPUs required (a Docker device-reservation count; unset lets the deployer decide). */
  count?: InputMaybe<Scalars['Int']['input']>;
  /** (cuda) Deprecated: the minimum number of CUDA cores. Prefer computeCapability and memory. */
  cudaCores?: InputMaybe<Scalars['Int']['input']>;
  /** (cuda) The minimum CUDA (driver/runtime) version required. */
  cudaVersion?: InputMaybe<Scalars['String']['input']>;
  /** (cpu) The minimum CPU frequency required, in MHz. */
  frequency?: InputMaybe<Scalars['Float']['input']>;
  /** (label) The qualifier key the backend resource must carry. */
  key?: InputMaybe<Scalars['String']['input']>;
  /** The discriminator identifying which kind of selector this is ('cpu', 'ram', 'cuda', 'rocm', 'oneapi' or 'label'). */
  kind: Scalars['String']['input'];
  /** (cuda) The minimum GPU memory (VRAM) required, in MB. */
  memory?: InputMaybe<Scalars['Int']['input']>;
  /** (ram) The minimum amount of system memory required, in MB. */
  min?: InputMaybe<Scalars['Int']['input']>;
  /** (cpu) The minimum number of CPU cores required. */
  minCount?: InputMaybe<Scalars['Int']['input']>;
  /** (oneapi) The minimum oneAPI version required. */
  oneapiVersion?: InputMaybe<Scalars['String']['input']>;
  /** (cpu, ram, cuda, rocm, oneapi, label) If true, a backend failing this selector must not run the flavour (hard constraint). If false, the selector is a preference scored by `weight`. */
  required?: InputMaybe<Scalars['Boolean']['input']>;
  /** (label) The value the qualifier must have; null means the key merely has to exist. */
  value?: InputMaybe<Scalars['String']['input']>;
  /** (cpu, ram, cuda, rocm, oneapi, label) Scoring weight of a preferred (non-required) selector; deployers prefer candidates with the highest sum of satisfied weights. */
  weight?: InputMaybe<Scalars['Int']['input']>;
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

/** A state schema is a blueprint for a state. It is composed of a definition, a list of dependencies, and a list of params. */
export type StateDefinitionInput = {
  /** The name of the state schema. This is used to uniquely identify the state schema */
  name: Scalars['String']['input'];
  /** The ports of the state schema. This is used to define the structure of the state */
  ports: Array<ReturnPortInput>;
};

/**
 * Pure matching criteria for a state definition: hash short-circuits, port
 *     matches and protocols. Used directly by query filters and, wrapped in a
 *     StateDependencyInput, by dependency declarations.
 */
export type StateDemandInput = {
  /** The identifier of the app providing the state. */
  app?: InputMaybe<Scalars['String']['input']>;
  /** The exact hash of the state definition. When set, matching short-circuits on the hash. */
  hash?: InputMaybe<Scalars['String']['input']>;
  /** The state's identity key on the agent (defaults to the interface at registration). */
  key?: InputMaybe<Scalars['String']['input']>;
  /** The matches the state definition's ports must satisfy. */
  matches?: InputMaybe<Array<PortMatchInput>>;
  /** Protocols (by name) the state must implement. */
  protocols?: InputMaybe<Array<Scalars['String']['input']>>;
};

/**
 * A named state requirement of a dependency: a slot key plus the demand the
 *     agent's state must satisfy, and resolution-lifecycle filters.
 */
export type StateDependencyInput = {
  /** Allow inactive nodes, defaults to true */
  allowInactive?: InputMaybe<Scalars['Boolean']['input']>;
  /** The matching criteria the agent's state must satisfy (app/key preferred; matches loosen). */
  demand?: InputMaybe<StateDemandInput>;
  /** The description of the dependency, why it is needed and what it is used for. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The local slot key of this state requirement — callers reference it when assigning. */
  key: Scalars['String']['input'];
  /** Whether the dependency is optional or not. If the dependency is optional, the agent doesn't have to provide it to be potentially callable */
  optional?: Scalars['Boolean']['input'];
};

/** A state implementation is a blueprint for a state. It is composed of a definition, a list of dependencies, and a list of params. */
export type StateImplementationInput = {
  /** The identifier of the app providing this state. Defaults to the registering agent's app identifier when omitted. */
  app?: InputMaybe<Scalars['String']['input']>;
  /** The schema of the state implementation. This is used to define the structure of the state */
  definition: StateDefinitionInput;
  /** The key of the state implementation. This is used to uniquely identify the state implementation */
  interface: Scalars['String']['input'];
  /** The stable identity key of the state, matched by state demands. Defaults to the interface when omitted. */
  key?: InputMaybe<Scalars['String']['input']>;
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
  /** Subscribe to lifecycle events for a single pod. */
  pod: PodEvent;
  /** Subscribe to lifecycle events for every pod visible to the current organization. */
  pods: PodEvent;
};


export type SubscriptionPodArgs = {
  podId: Scalars['ID']['input'];
};

/** A test target: the action a test action tests, identified by exact hash or by an (app, key, version) coordinate. app defaults to the registering agent's app; omitting version matches every version. */
export type TestTargetInput = {
  /** The app identifier owning the target action. Defaults to the registering agent's app. */
  app?: InputMaybe<Scalars['String']['input']>;
  /** The exact hash of the target action. */
  hash?: InputMaybe<Scalars['String']['input']>;
  /** The key of the target action. Matches every version unless version is given. */
  key?: InputMaybe<Scalars['String']['input']>;
  /** Restrict a key target to one specific version. */
  version?: InputMaybe<Scalars['String']['input']>;
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

/** A value that is being tracked over time during the runtime of an action. This is the state of a dependency */
export type TrackInput = {
  /** The key of the dependency whose state is being tracked. */
  dependencyKey?: InputMaybe<Scalars['String']['input']>;
  /** An optional description for the track. */
  description?: InputMaybe<Scalars['String']['input']>;
  /** An optional human-readable label for the track. */
  label?: InputMaybe<Scalars['String']['input']>;
  /** The key of the state to track. */
  stateKey: Scalars['String']['input'];
  /** The key of the value within the state to track. */
  valueKey: Scalars['String']['input'];
  /** The windows (aggregations) computed over the tracked value. */
  windows?: InputMaybe<Array<WindowInput>>;
};

/** Input for updating a deployment's status. */
export type UpdateDeploymentInput = {
  /** The ID of the deployment to update. */
  deployment: Scalars['ID']['input'];
  /** The new status of the deployment. */
  status: PodStatus;
};

/** Input for updating a pod's status. */
export type UpdatePodInput = {
  /** The backend-local identifier of the pod to update. */
  localId?: InputMaybe<Scalars['ID']['input']>;
  /** The ID of the pod to update; required unless 'local_id' is given. */
  pod?: InputMaybe<Scalars['ID']['input']>;
  /** The new status of the pod. */
  status: PodStatus;
};

/** Represents an authenticated user. */
export type User = {
  __typename?: 'User';
  /** The subject identifier of the user. */
  sub: Scalars['ID']['output'];
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
  /** The function called (`str.upper`), or in a callback the effect (`ui.copy`, `task.answer`). */
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

/** Aggregation computed over a tracked value within a window. */
export enum WindowFunction {
  Count = 'COUNT',
  First = 'FIRST',
  Last = 'LAST',
  Max = 'MAX',
  Mean = 'MEAN',
  Min = 'MIN',
  Std = 'STD',
  Sum = 'SUM'
}

/** A window that is calculated */
export type WindowInput = {
  /** An optional human-readable label for the window. */
  label?: InputMaybe<Scalars['String']['input']>;
  /** The aggregation to compute over the tracked value within the window. */
  windowFunction: WindowFunction;
};

export type AppFragment = { __typename?: 'App', id: string, identifier: string, embedding?: any | null, releases: Array<(
    { __typename?: 'Release' }
    & StoreReleaseFragment
  )> };

export type ShelfAppFragment = { __typename?: 'App', id: string, identifier: string, embedding?: any | null, releases: Array<(
    { __typename?: 'Release' }
    & StoreReleaseFragment
  )> };

export type ListReleaseApprovalFragment = { __typename?: 'ReleaseApproval', id: string, name: string, agent: string, digest: string, mandateId: string, createdAt: any, revokedAt?: any | null, isStale: boolean, isActive: boolean, approver: { __typename?: 'User', sub: string }, release: { __typename?: 'Release', id: string, name: string, version: string, logo?: string | null, originalLogo?: string | null, logoBlok?: (
      { __typename?: 'FlavourBlok' }
      & KabinetLogoBlokFragment
    ) | null, app: { __typename?: 'App', id: string, identifier: string, embedding?: any | null } } };

export type ReleaseApprovalFragment = (
  { __typename?: 'ReleaseApproval', backends: Array<{ __typename?: 'Backend', id: string, name: string }> }
  & ListReleaseApprovalFragment
);

export type ApprovableReleaseFragment = { __typename?: 'Release', id: string, name: string, version: string, logo?: string | null, originalLogo?: string | null, scopes: Array<string>, approvalDigest: string, digestPinned: boolean, mandateManifest: any, logoBlok?: (
    { __typename?: 'FlavourBlok' }
    & KabinetLogoBlokFragment
  ) | null, app: { __typename?: 'App', id: string, identifier: string, embedding?: any | null }, flavours: Array<{ __typename?: 'Flavour', id: string, name: string, logo?: string | null, originalLogo?: string | null, image: { __typename?: 'DockerImage', imageString: string }, requirements: Array<{ __typename?: 'Requirement', key: string, service: string, optional: boolean, description?: string | null }> }>, approvals: Array<(
    { __typename?: 'ReleaseApproval' }
    & ListReleaseApprovalFragment
  )> };

export type ListBackendFragment = { __typename?: 'Backend', id: string, name: string, kind: string, user: { __typename?: 'User', sub: string }, client: { __typename?: 'Client', clientId: string } };

export type BackendFragment = { __typename?: 'Backend', id: string, clientId: string, name: string, kind: string, user: { __typename?: 'User', sub: string }, client: { __typename?: 'Client', clientId: string }, pods: Array<(
    { __typename?: 'Pod' }
    & ListPodFragment
  )>, resources: Array<(
    { __typename?: 'Resource' }
    & ListResourceFragment
  )> };

export type KabinetLogoBlokFragment = { __typename?: 'FlavourBlok', id: string, hash: string };

export type KabinetBlokFragment = { __typename?: 'FlavourBlok', id: string, flavourId: string, key: string, context: ComponentContext, default: boolean, description?: string | null, hash: string, componentTree?: any | null, vocab?: number | null, locals: any, demo?: any | null, queries: any, forModel?: string | null, forNode?: string | null, parseError?: string | null };

export type DefinitionFragment = { __typename?: 'Definition', id: string, name: string, hash: any, description?: string | null, logo?: (
    { __typename?: 'FlavourBlok' }
    & KabinetLogoBlokFragment
  ) | null, args: Array<(
    { __typename?: 'ArgPort' }
    & ArgPortFragment
  )>, returns: Array<(
    { __typename?: 'ReturnPort' }
    & ReturnPortFragment
  )>, flavours: Array<(
    { __typename?: 'Flavour' }
    & ListFlavourFragment
  )> };

export type ListDefinitionFragment = { __typename?: 'Definition', id: string, name: string, hash: any, description?: string | null, kind: ActionKind, logo?: (
    { __typename?: 'FlavourBlok' }
    & KabinetLogoBlokFragment
  ) | null, flavours: Array<{ __typename?: 'Flavour', id: string, name: string, logo?: string | null, originalLogo?: string | null, release: { __typename?: 'Release', id: string, version: string, logo?: string | null, originalLogo?: string | null, logoBlok?: (
        { __typename?: 'FlavourBlok' }
        & KabinetLogoBlokFragment
      ) | null, app: { __typename?: 'App', id: string, identifier: string, embedding?: any | null } } }> };

export type SmartDefinitionFragment = { __typename?: 'Definition', id: string, name: string, description?: string | null, logo?: (
    { __typename?: 'FlavourBlok' }
    & KabinetLogoBlokFragment
  ) | null };

export type ListDeploymentFragment = { __typename?: 'Deployment', id: string, localId: string, name: string, status: PodStatus, backend: { __typename?: 'Backend', id: string, name: string, kind: string }, flavour: { __typename?: 'Flavour', id: string, name: string, logo?: string | null, originalLogo?: string | null, release: { __typename?: 'Release', id: string, version: string, logo?: string | null, originalLogo?: string | null, logoBlok?: (
        { __typename?: 'FlavourBlok' }
        & KabinetLogoBlokFragment
      ) | null, app: { __typename?: 'App', id: string, identifier: string, embedding?: any | null } } } };

export type DeploymentFragment = (
  { __typename?: 'Deployment', backend: (
    { __typename?: 'Backend' }
    & ListBackendFragment
  ), approval?: (
    { __typename?: 'ReleaseApproval' }
    & ListReleaseApprovalFragment
  ) | null }
  & ListDeploymentFragment
);

export type ListFlavourFragment = { __typename?: 'Flavour', id: string, name: string, logo?: string | null, originalLogo?: string | null, release: { __typename?: 'Release', id: string, version: string, logo?: string | null, originalLogo?: string | null, logoBlok?: (
      { __typename?: 'FlavourBlok' }
      & KabinetLogoBlokFragment
    ) | null, app: { __typename?: 'App', id: string, identifier: string, embedding?: any | null } }, selectors: Array<{ __typename?: 'CPUSelector' } | (
    { __typename?: 'CudaSelector' }
    & CudaSelectorFragment
  ) | { __typename?: 'LabelSelector' } | { __typename?: 'OneApiSelector' } | { __typename?: 'RAMSelector' } | (
    { __typename?: 'RocmSelector' }
    & RocmSelectorFragment
  )> };

export type FlavourFragment = (
  { __typename?: 'Flavour', assets: any, selectors: Array<(
    { __typename?: 'CPUSelector' }
    & StoreSelector_CpuSelector_Fragment
  ) | (
    { __typename?: 'CudaSelector' }
    & StoreSelector_CudaSelector_Fragment
  ) | (
    { __typename?: 'LabelSelector' }
    & StoreSelector_LabelSelector_Fragment
  ) | (
    { __typename?: 'OneApiSelector' }
    & StoreSelector_OneApiSelector_Fragment
  ) | (
    { __typename?: 'RAMSelector' }
    & StoreSelector_RamSelector_Fragment
  ) | (
    { __typename?: 'RocmSelector' }
    & StoreSelector_RocmSelector_Fragment
  )>, image: { __typename?: 'DockerImage', imageString: string, buildAt: any }, requirements: Array<{ __typename?: 'Requirement', key: string, service: string, optional: boolean, description?: string | null }>, repo?: { __typename?: 'GithubRepo', id: string, name: string, user: string, repo: string, url: string } | null, deployments: Array<(
    { __typename?: 'Deployment' }
    & ListDeploymentFragment
  )>, definitions: Array<(
    { __typename?: 'Definition' }
    & ListDefinitionFragment
  )>, blokKeys: Array<{ __typename?: 'FlavourBlok', id: string, context: ComponentContext }>, release: { __typename?: 'Release', scopes: Array<string>, flavours: Array<{ __typename?: 'Flavour', id: string, name: string, selectors: Array<{ __typename?: 'CPUSelector' } | (
        { __typename?: 'CudaSelector' }
        & CudaSelectorFragment
      ) | { __typename?: 'LabelSelector' } | { __typename?: 'OneApiSelector' } | { __typename?: 'RAMSelector' } | (
        { __typename?: 'RocmSelector' }
        & RocmSelectorFragment
      )> }> } }
  & ListFlavourFragment
);

export type ListPodFragment = { __typename?: 'Pod', id: string, podId: string, clientId?: string | null, status: PodStatus, backend: { __typename?: 'Backend', name: string, user: { __typename?: 'User', sub: string }, client: { __typename?: 'Client', clientId: string } }, deployment: { __typename?: 'Deployment', id: string, flavour: { __typename?: 'Flavour', release: { __typename?: 'Release', id: string, version: string, logoBlok?: (
          { __typename?: 'FlavourBlok' }
          & KabinetLogoBlokFragment
        ) | null, app: { __typename?: 'App', identifier: string } } } }, resource?: { __typename?: 'Resource', id: string, name: string } | null };

export type PodFragment = { __typename?: 'Pod', id: string, podId: string, status: PodStatus, clientId?: string | null, backend: (
    { __typename?: 'Backend' }
    & BackendFragment
  ), latestLogDump?: { __typename?: 'LogDump', logs: string, createdAt: any } | null, resource?: (
    { __typename?: 'Resource' }
    & ListResourceFragment
  ) | null, deployment: { __typename?: 'Deployment', id: string, name: string, approval?: (
      { __typename?: 'ReleaseApproval' }
      & ListReleaseApprovalFragment
    ) | null, flavour: { __typename?: 'Flavour', id: string, name: string, release: { __typename?: 'Release', id: string, version: string, logoBlok?: (
          { __typename?: 'FlavourBlok' }
          & KabinetLogoBlokFragment
        ) | null, app: { __typename?: 'App', identifier: string } } } } };

export type StringAssignWidgetFragment = { __typename: 'StringAssignWidget', kind: AssignWidgetKind, placeholder?: string | null, asParagraph?: boolean | null };

export type SliderAssignWidgetFragment = { __typename: 'SliderAssignWidget', kind: AssignWidgetKind, min?: number | null, max?: number | null, step?: number | null };

export type StateChoiceAssignWidgetFragment = { __typename: 'StateChoiceAssignWidget', kind: AssignWidgetKind, followValue?: string | null, statePath?: string | null, dependency?: string | null, dependencies?: Array<string> | null, stateCall?: (
    { __typename?: 'UtilCall' }
    & PortCallFragment
  ) | null, stateAccessors?: Array<{ __typename?: 'StateAccessor', optionKey: OptionKey, path?: string | null, call?: (
      { __typename?: 'UtilCall' }
      & PortCallFragment
    ) | null }> | null };

export type ProxyWidgetFragment = { __typename: 'ProxyWidget', kind: AssignWidgetKind, targetPort: string, targetAction: string, targetDependency?: string | null };

export type FilterPortFragment = { __typename: 'ArgPort', kind: PortKind, key: string, identifier?: any | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'ChoiceAssignWidget' } | { __typename?: 'CustomAssignWidget' } | { __typename?: 'ProxyWidget' } | { __typename?: 'SearchAssignWidget', query: string } | { __typename?: 'SliderAssignWidget' } | { __typename?: 'StateChoiceAssignWidget' } | { __typename?: 'StringAssignWidget' } | null };

export type SearchAssignWidgetFragment = { __typename: 'SearchAssignWidget', kind: AssignWidgetKind, query: string, ward: string, dependencies?: Array<string> | null, filters?: Array<(
    { __typename?: 'ArgPort' }
    & FilterPortFragment
  )> | null };

export type CustomAssignWidgetFragment = { __typename: 'CustomAssignWidget', kind: AssignWidgetKind, followValue?: string | null, component: string, dependencies?: Array<string> | null, props?: Array<(
    { __typename?: 'ComponentProp' }
    & BlokComponentPropFragment
  )> | null, fallback?: (
    { __typename: 'ChoiceAssignWidget', kind: AssignWidgetKind }
    & ChoiceAssignWidgetFragment
  ) | { __typename: 'CustomAssignWidget', kind: AssignWidgetKind } | (
    { __typename: 'ProxyWidget', kind: AssignWidgetKind }
    & ProxyWidgetFragment
  ) | (
    { __typename: 'SearchAssignWidget', kind: AssignWidgetKind }
    & SearchAssignWidgetFragment
  ) | (
    { __typename: 'SliderAssignWidget', kind: AssignWidgetKind }
    & SliderAssignWidgetFragment
  ) | (
    { __typename: 'StateChoiceAssignWidget', kind: AssignWidgetKind }
    & StateChoiceAssignWidgetFragment
  ) | (
    { __typename: 'StringAssignWidget', kind: AssignWidgetKind }
    & StringAssignWidgetFragment
  ) | null };

export type ChoiceAssignWidgetFragment = { __typename: 'ChoiceAssignWidget', kind: AssignWidgetKind, followValue?: string | null, placeholder?: string | null };

export type ArgChildPortDeepFragment = { __typename: 'ArgPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, description?: string | null, nullable: boolean, default?: any | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, widget?: (
    { __typename?: 'ChoiceAssignWidget' }
    & AssignWidget_ChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'CustomAssignWidget' }
    & AssignWidget_CustomAssignWidget_Fragment
  ) | (
    { __typename?: 'ProxyWidget' }
    & AssignWidget_ProxyWidget_Fragment
  ) | (
    { __typename?: 'SearchAssignWidget' }
    & AssignWidget_SearchAssignWidget_Fragment
  ) | (
    { __typename?: 'SliderAssignWidget' }
    & AssignWidget_SliderAssignWidget_Fragment
  ) | (
    { __typename?: 'StateChoiceAssignWidget' }
    & AssignWidget_StateChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'StringAssignWidget' }
    & AssignWidget_StringAssignWidget_Fragment
  ) | null, children?: Array<{ __typename: 'ArgPort', kind: PortKind, key: string, identifier?: any | null, nullable: boolean, widget?: (
      { __typename?: 'ChoiceAssignWidget' }
      & AssignWidget_ChoiceAssignWidget_Fragment
    ) | (
      { __typename?: 'CustomAssignWidget' }
      & AssignWidget_CustomAssignWidget_Fragment
    ) | (
      { __typename?: 'ProxyWidget' }
      & AssignWidget_ProxyWidget_Fragment
    ) | (
      { __typename?: 'SearchAssignWidget' }
      & AssignWidget_SearchAssignWidget_Fragment
    ) | (
      { __typename?: 'SliderAssignWidget' }
      & AssignWidget_SliderAssignWidget_Fragment
    ) | (
      { __typename?: 'StateChoiceAssignWidget' }
      & AssignWidget_StateChoiceAssignWidget_Fragment
    ) | (
      { __typename?: 'StringAssignWidget' }
      & AssignWidget_StringAssignWidget_Fragment
    ) | null }> | null };

export type ArgChildPortNestedFragment = { __typename: 'ArgPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, description?: string | null, nullable: boolean, default?: any | null, children?: Array<(
    { __typename?: 'ArgPort' }
    & ArgChildPortDeepFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, widget?: (
    { __typename?: 'ChoiceAssignWidget' }
    & AssignWidget_ChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'CustomAssignWidget' }
    & AssignWidget_CustomAssignWidget_Fragment
  ) | (
    { __typename?: 'ProxyWidget' }
    & AssignWidget_ProxyWidget_Fragment
  ) | (
    { __typename?: 'SearchAssignWidget' }
    & AssignWidget_SearchAssignWidget_Fragment
  ) | (
    { __typename?: 'SliderAssignWidget' }
    & AssignWidget_SliderAssignWidget_Fragment
  ) | (
    { __typename?: 'StateChoiceAssignWidget' }
    & AssignWidget_StateChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'StringAssignWidget' }
    & AssignWidget_StringAssignWidget_Fragment
  ) | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null, validators?: Array<(
    { __typename?: 'Validator' }
    & ValidatorFragment
  )> | null };

export type ArgChildPortFragment = { __typename: 'ArgPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, nullable: boolean, description?: string | null, default?: any | null, children?: Array<(
    { __typename?: 'ArgPort' }
    & ArgChildPortNestedFragment
  )> | null, widget?: (
    { __typename?: 'ChoiceAssignWidget' }
    & AssignWidget_ChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'CustomAssignWidget' }
    & AssignWidget_CustomAssignWidget_Fragment
  ) | (
    { __typename?: 'ProxyWidget' }
    & AssignWidget_ProxyWidget_Fragment
  ) | (
    { __typename?: 'SearchAssignWidget' }
    & AssignWidget_SearchAssignWidget_Fragment
  ) | (
    { __typename?: 'SliderAssignWidget' }
    & AssignWidget_SliderAssignWidget_Fragment
  ) | (
    { __typename?: 'StateChoiceAssignWidget' }
    & AssignWidget_StateChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'StringAssignWidget' }
    & AssignWidget_StringAssignWidget_Fragment
  ) | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null, validators?: Array<(
    { __typename?: 'Validator' }
    & ValidatorFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null };

export type ReturnChildPortDeepFragment = { __typename: 'ReturnPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, description?: string | null, nullable: boolean, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, widget?: (
    { __typename?: 'ChoiceReturnWidget' }
    & ReturnWidget_ChoiceReturnWidget_Fragment
  ) | (
    { __typename?: 'CustomReturnWidget' }
    & ReturnWidget_CustomReturnWidget_Fragment
  ) | null, children?: Array<{ __typename: 'ReturnPort', kind: PortKind, key: string, identifier?: any | null, nullable: boolean, widget?: (
      { __typename?: 'ChoiceReturnWidget' }
      & ReturnWidget_ChoiceReturnWidget_Fragment
    ) | (
      { __typename?: 'CustomReturnWidget' }
      & ReturnWidget_CustomReturnWidget_Fragment
    ) | null }> | null };

export type ReturnChildPortNestedFragment = { __typename: 'ReturnPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, description?: string | null, nullable: boolean, children?: Array<(
    { __typename?: 'ReturnPort' }
    & ReturnChildPortDeepFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, widget?: (
    { __typename?: 'ChoiceReturnWidget' }
    & ReturnWidget_ChoiceReturnWidget_Fragment
  ) | (
    { __typename?: 'CustomReturnWidget' }
    & ReturnWidget_CustomReturnWidget_Fragment
  ) | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null };

export type ReturnChildPortFragment = { __typename: 'ReturnPort', kind: PortKind, key: string, label?: string | null, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, nullable: boolean, description?: string | null, children?: Array<(
    { __typename?: 'ReturnPort' }
    & ReturnChildPortNestedFragment
  )> | null, widget?: (
    { __typename?: 'ChoiceReturnWidget' }
    & ReturnWidget_ChoiceReturnWidget_Fragment
  ) | (
    { __typename?: 'CustomReturnWidget' }
    & ReturnWidget_CustomReturnWidget_Fragment
  ) | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null };

type BaseEffect_CustomEffect_Fragment = { __typename: 'CustomEffect', kind: EffectKind, dependencies: Array<string>, source?: string | null, call: (
    { __typename?: 'UtilCall' }
    & PortCallFragment
  ) };

type BaseEffect_HideEffect_Fragment = { __typename: 'HideEffect', kind: EffectKind, dependencies: Array<string>, source?: string | null, call: (
    { __typename?: 'UtilCall' }
    & PortCallFragment
  ) };

type BaseEffect_MessageEffect_Fragment = { __typename: 'MessageEffect', kind: EffectKind, dependencies: Array<string>, source?: string | null, call: (
    { __typename?: 'UtilCall' }
    & PortCallFragment
  ) };

export type BaseEffectFragment = BaseEffect_CustomEffect_Fragment | BaseEffect_HideEffect_Fragment | BaseEffect_MessageEffect_Fragment;

export type CustomEffectFragment = (
  { __typename: 'CustomEffect', kind: EffectKind }
  & BaseEffect_CustomEffect_Fragment
);

export type MessageEffectFragment = (
  { __typename: 'MessageEffect', kind: EffectKind, message: string }
  & BaseEffect_MessageEffect_Fragment
);

export type HideEffectFragment = (
  { __typename: 'HideEffect', fade: boolean }
  & BaseEffect_HideEffect_Fragment
);

type PortEffect_CustomEffect_Fragment = (
  { __typename?: 'CustomEffect' }
  & CustomEffectFragment
);

type PortEffect_HideEffect_Fragment = (
  { __typename?: 'HideEffect' }
  & HideEffectFragment
);

type PortEffect_MessageEffect_Fragment = (
  { __typename?: 'MessageEffect' }
  & MessageEffectFragment
);

export type PortEffectFragment = PortEffect_CustomEffect_Fragment | PortEffect_HideEffect_Fragment | PortEffect_MessageEffect_Fragment;

type AssignWidget_ChoiceAssignWidget_Fragment = (
  { __typename: 'ChoiceAssignWidget', kind: AssignWidgetKind }
  & ChoiceAssignWidgetFragment
);

type AssignWidget_CustomAssignWidget_Fragment = (
  { __typename: 'CustomAssignWidget', kind: AssignWidgetKind }
  & CustomAssignWidgetFragment
);

type AssignWidget_ProxyWidget_Fragment = (
  { __typename: 'ProxyWidget', kind: AssignWidgetKind }
  & ProxyWidgetFragment
);

type AssignWidget_SearchAssignWidget_Fragment = (
  { __typename: 'SearchAssignWidget', kind: AssignWidgetKind }
  & SearchAssignWidgetFragment
);

type AssignWidget_SliderAssignWidget_Fragment = (
  { __typename: 'SliderAssignWidget', kind: AssignWidgetKind }
  & SliderAssignWidgetFragment
);

type AssignWidget_StateChoiceAssignWidget_Fragment = (
  { __typename: 'StateChoiceAssignWidget', kind: AssignWidgetKind }
  & StateChoiceAssignWidgetFragment
);

type AssignWidget_StringAssignWidget_Fragment = (
  { __typename: 'StringAssignWidget', kind: AssignWidgetKind }
  & StringAssignWidgetFragment
);

export type AssignWidgetFragment = AssignWidget_ChoiceAssignWidget_Fragment | AssignWidget_CustomAssignWidget_Fragment | AssignWidget_ProxyWidget_Fragment | AssignWidget_SearchAssignWidget_Fragment | AssignWidget_SliderAssignWidget_Fragment | AssignWidget_StateChoiceAssignWidget_Fragment | AssignWidget_StringAssignWidget_Fragment;

export type ValidatorFragment = { __typename?: 'Validator', dependencies?: Array<string> | null, label?: string | null, errorMessage?: string | null, source?: string | null, call: (
    { __typename?: 'UtilCall' }
    & PortCallFragment
  ) };

export type ArgPortFragment = { __typename: 'ArgPort', key: string, label?: string | null, nullable: boolean, description?: string | null, kind: PortKind, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, default?: any | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null, widget?: (
    { __typename?: 'ChoiceAssignWidget' }
    & AssignWidget_ChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'CustomAssignWidget' }
    & AssignWidget_CustomAssignWidget_Fragment
  ) | (
    { __typename?: 'ProxyWidget' }
    & AssignWidget_ProxyWidget_Fragment
  ) | (
    { __typename?: 'SearchAssignWidget' }
    & AssignWidget_SearchAssignWidget_Fragment
  ) | (
    { __typename?: 'SliderAssignWidget' }
    & AssignWidget_SliderAssignWidget_Fragment
  ) | (
    { __typename?: 'StateChoiceAssignWidget' }
    & AssignWidget_StateChoiceAssignWidget_Fragment
  ) | (
    { __typename?: 'StringAssignWidget' }
    & AssignWidget_StringAssignWidget_Fragment
  ) | null, children?: Array<(
    { __typename?: 'ArgPort' }
    & ArgChildPortFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, validators?: Array<(
    { __typename?: 'Validator' }
    & ValidatorFragment
  )> | null, requires?: Array<{ __typename?: 'Requires', key: string, operator: DescriptorOperator, value?: any | null }> | null };

export type ReturnPortFragment = { __typename: 'ReturnPort', key: string, label?: string | null, nullable: boolean, description?: string | null, kind: PortKind, identifier?: any | null, referenceUnit?: string | null, proposedUnits?: Array<string> | null, dimension?: string | null, effects?: Array<(
    { __typename?: 'CustomEffect' }
    & PortEffect_CustomEffect_Fragment
  ) | (
    { __typename?: 'HideEffect' }
    & PortEffect_HideEffect_Fragment
  ) | (
    { __typename?: 'MessageEffect' }
    & PortEffect_MessageEffect_Fragment
  )> | null, widget?: (
    { __typename?: 'ChoiceReturnWidget' }
    & ReturnWidget_ChoiceReturnWidget_Fragment
  ) | (
    { __typename?: 'CustomReturnWidget' }
    & ReturnWidget_CustomReturnWidget_Fragment
  ) | null, children?: Array<(
    { __typename?: 'ReturnPort' }
    & ReturnChildPortFragment
  )> | null, choices?: Array<{ __typename?: 'Choice', value: any, label: string, description?: string | null }> | null, provides?: Array<{ __typename?: 'Provides', key: string, operator: DescriptorOperator, value?: any | null }> | null };

export type CustomReturnWidgetFragment = { __typename: 'CustomReturnWidget', kind: ReturnWidgetKind, component: string, props?: Array<(
    { __typename?: 'ComponentProp' }
    & BlokComponentPropFragment
  )> | null };

export type ChoiceReturnWidgetFragment = { __typename: 'ChoiceReturnWidget', kind: ReturnWidgetKind };

type ReturnWidget_ChoiceReturnWidget_Fragment = (
  { __typename: 'ChoiceReturnWidget', kind: ReturnWidgetKind }
  & ChoiceReturnWidgetFragment
);

type ReturnWidget_CustomReturnWidget_Fragment = (
  { __typename: 'CustomReturnWidget', kind: ReturnWidgetKind }
  & CustomReturnWidgetFragment
);

export type ReturnWidgetFragment = ReturnWidget_ChoiceReturnWidget_Fragment | ReturnWidget_CustomReturnWidget_Fragment;

export type PortCallLeafArgumentFragment = { __typename?: 'ActionArgument', key?: string | null, valueLiteral?: any | null, valuePath?: string | null };

export type PortCallLeafFragment = { __typename?: 'UtilCall', operation: string, arguments?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallLeafArgumentFragment
  )> | null };

export type PortCallInnerArgumentFragment = (
  { __typename?: 'ActionArgument', utilCall?: (
    { __typename?: 'UtilCall' }
    & PortCallLeafFragment
  ) | null, valueList?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallLeafArgumentFragment
  )> | null, valueDict?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallLeafArgumentFragment
  )> | null }
  & PortCallLeafArgumentFragment
);

export type PortCallInnerFragment = { __typename?: 'UtilCall', operation: string, arguments?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallInnerArgumentFragment
  )> | null };

export type PortCallArgumentFragment = (
  { __typename?: 'ActionArgument', utilCall?: (
    { __typename?: 'UtilCall' }
    & PortCallInnerFragment
  ) | null, valueList?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallInnerArgumentFragment
  )> | null, valueDict?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallInnerArgumentFragment
  )> | null }
  & PortCallLeafArgumentFragment
);

export type PortCallFragment = { __typename?: 'UtilCall', operation: string, arguments?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallArgumentFragment
  )> | null };

export type BlokAgentCallLeafFragment = { __typename?: 'AgentCall', dependency: string, operation: string, arguments?: Array<(
    { __typename?: 'ActionArgument' }
    & PortCallLeafArgumentFragment
  )> | null };

export type BlokArgumentInnerFragment = (
  { __typename?: 'ActionArgument', agentCall?: (
    { __typename?: 'AgentCall' }
    & BlokAgentCallLeafFragment
  ) | null }
  & PortCallInnerArgumentFragment
);

export type BlokArgumentFragment = (
  { __typename?: 'ActionArgument', utilCall?: { __typename?: 'UtilCall', operation: string, arguments?: Array<(
      { __typename?: 'ActionArgument' }
      & BlokArgumentInnerFragment
    )> | null } | null, agentCall?: { __typename?: 'AgentCall', dependency: string, operation: string, arguments?: Array<(
      { __typename?: 'ActionArgument' }
      & BlokArgumentInnerFragment
    )> | null } | null, valueList?: Array<(
    { __typename?: 'ActionArgument' }
    & BlokArgumentInnerFragment
  )> | null, valueDict?: Array<(
    { __typename?: 'ActionArgument' }
    & BlokArgumentInnerFragment
  )> | null }
  & PortCallLeafArgumentFragment
);

export type BlokComponentPropFragment = { __typename?: 'ComponentProp', key: string, staticValue?: any | null, declaresValue?: string | null, dynamicValue?: { __typename?: 'DynamicValue', path?: string | null, literal?: string | null } | null, agentCall?: { __typename?: 'AgentCall', dependency: string, operation: string, arguments?: Array<(
      { __typename?: 'ActionArgument' }
      & BlokArgumentFragment
    )> | null } | null, utilCall?: { __typename?: 'UtilCall', operation: string, arguments?: Array<(
      { __typename?: 'ActionArgument' }
      & BlokArgumentFragment
    )> | null } | null };

export type ReleaseFragment = { __typename?: 'Release', id: string, name: string, version: string, logo?: string | null, originalLogo?: string | null, entrypoint: string, scopes: Array<string>, logoBlok?: (
    { __typename?: 'FlavourBlok' }
    & KabinetLogoBlokFragment
  ) | null, app: { __typename?: 'App', id: string, identifier: string, embedding?: any | null, releases: Array<{ __typename?: 'Release', id: string, version: string }> }, flavours: Array<(
    { __typename?: 'Flavour', assets: any, blokKeys: Array<{ __typename?: 'FlavourBlok', id: string, context: ComponentContext }> }
    & ListFlavourFragment
    & StoreFlavourFragment
  )> };

export type ListReleaseFragment = { __typename?: 'Release', id: string, version: string, logo?: string | null, originalLogo?: string | null, scopes: Array<string>, logoBlok?: (
    { __typename?: 'FlavourBlok' }
    & KabinetLogoBlokFragment
  ) | null, app: { __typename?: 'App', id: string, identifier: string, embedding?: any | null }, flavours: Array<(
    { __typename?: 'Flavour' }
    & ListFlavourFragment
  )> };

export type StoreRepoBlokFragment = { __typename?: 'RepoBlok', id: string, key: string, name: string, description?: string | null, context: ComponentContext, hash: string, installHash: string, parseError?: string | null, origin: string, sourcePath?: string | null, repo: { __typename?: 'GithubRepo', id: string, name: string } };

export type ListRepoFragment = { __typename?: 'GithubRepo', id: string, name: string, branch: string, user: string, repo: string };

export type RepoFragment = { __typename?: 'GithubRepo', id: string, name: string, branch: string, user: string, repo: string, url: string, issueUrl: string, addedAt: any, updatedAt: any, organization: { __typename?: 'Organization', id: string, identifier: string }, flavours: Array<(
    { __typename?: 'Flavour', image: { __typename?: 'DockerImage', imageString: string, buildAt: any }, requirements: Array<{ __typename?: 'Requirement', key: string, service: string, optional: boolean, description?: string | null }> }
    & ListFlavourFragment
  )>, bloks: Array<(
    { __typename?: 'RepoBlok' }
    & StoreRepoBlokFragment
  )> };

export type ResourceFragment = { __typename?: 'Resource', id: string, name: string, qualifiers?: any | null, backend: { __typename?: 'Backend', id: string, name: string }, pods: Array<(
    { __typename?: 'Pod' }
    & ListPodFragment
  )> };

export type ListResourceFragment = { __typename?: 'Resource', id: string, name: string, qualifiers?: any | null, backend: { __typename?: 'Backend', id: string, name: string } };

export type CudaSelectorFragment = { __typename?: 'CudaSelector', cudaVersion?: string | null, cudaCores?: number | null };

export type RocmSelectorFragment = { __typename?: 'RocmSelector', apiVersion?: string | null, apiThing?: string | null };

type StoreSelector_CpuSelector_Fragment = { __typename: 'CPUSelector', arch?: string | null, minCount?: number | null, kind: string, required: boolean };

type StoreSelector_CudaSelector_Fragment = { __typename: 'CudaSelector', computeCapability?: string | null, memory?: number | null, count?: number | null, cudaVersion?: string | null, kind: string, required: boolean };

type StoreSelector_LabelSelector_Fragment = { __typename: 'LabelSelector', kind: string, required: boolean };

type StoreSelector_OneApiSelector_Fragment = { __typename: 'OneApiSelector', kind: string, required: boolean };

type StoreSelector_RamSelector_Fragment = { __typename: 'RAMSelector', kind: string, required: boolean };

type StoreSelector_RocmSelector_Fragment = { __typename: 'RocmSelector', apiVersion?: string | null, kind: string, required: boolean };

export type StoreSelectorFragment = StoreSelector_CpuSelector_Fragment | StoreSelector_CudaSelector_Fragment | StoreSelector_LabelSelector_Fragment | StoreSelector_OneApiSelector_Fragment | StoreSelector_RamSelector_Fragment | StoreSelector_RocmSelector_Fragment;

export type StoreBlokFragment = { __typename?: 'FlavourBlok', id: string, flavourId: string, key: string, context: ComponentContext, default: boolean, description?: string | null, hash: string, parseError?: string | null };

export type StoreFlavourFragment = { __typename?: 'Flavour', id: string, name: string, logo?: string | null, originalLogo?: string | null, assets: any, image: { __typename?: 'DockerImage', imageString: string, buildAt: any }, requirements: Array<{ __typename?: 'Requirement', key: string, service: string, optional: boolean, description?: string | null }>, selectors: Array<(
    { __typename?: 'CPUSelector' }
    & StoreSelector_CpuSelector_Fragment
  ) | (
    { __typename?: 'CudaSelector' }
    & StoreSelector_CudaSelector_Fragment
  ) | (
    { __typename?: 'LabelSelector' }
    & StoreSelector_LabelSelector_Fragment
  ) | (
    { __typename?: 'OneApiSelector' }
    & StoreSelector_OneApiSelector_Fragment
  ) | (
    { __typename?: 'RAMSelector' }
    & StoreSelector_RamSelector_Fragment
  ) | (
    { __typename?: 'RocmSelector' }
    & StoreSelector_RocmSelector_Fragment
  )>, repo?: { __typename?: 'GithubRepo', id: string, name: string, user: string, repo: string, url: string } | null, definitions: Array<{ __typename?: 'Definition', id: string, name: string, description?: string | null, kind: ActionKind, logo?: (
      { __typename?: 'FlavourBlok' }
      & KabinetLogoBlokFragment
    ) | null }>, deployments: Array<{ __typename?: 'Deployment', id: string, status: PodStatus }>, blokImplementations: Array<(
    { __typename?: 'FlavourBlok' }
    & StoreBlokFragment
  )> };

export type StoreReleaseFragment = { __typename?: 'Release', id: string, name: string, version: string, logo?: string | null, originalLogo?: string | null, scopes: Array<string>, entrypoint: string, logoBlok?: (
    { __typename?: 'FlavourBlok' }
    & KabinetLogoBlokFragment
  ) | null, app: { __typename?: 'App', id: string, identifier: string, embedding?: any | null }, flavours: Array<(
    { __typename?: 'Flavour' }
    & StoreFlavourFragment
  )> };

export type ApproveReleaseMutationVariables = Exact<{
  input: ApproveReleaseInput;
}>;


export type ApproveReleaseMutation = { __typename?: 'Mutation', approveRelease: (
    { __typename?: 'ReleaseApproval' }
    & ReleaseApprovalFragment
  ) };

export type RevokeApprovalMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RevokeApprovalMutation = { __typename?: 'Mutation', revokeApproval: (
    { __typename?: 'ReleaseApproval' }
    & ReleaseApprovalFragment
  ) };

export type DeleteBackendMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBackendMutation = { __typename?: 'Mutation', deleteBackend: string };

export type DeletePodMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeletePodMutation = { __typename?: 'Mutation', deletePod: string };

export type CreateGithubRepoMutationVariables = Exact<{
  identifier: Scalars['String']['input'];
}>;


export type CreateGithubRepoMutation = { __typename?: 'Mutation', createGithubRepo: { __typename?: 'GithubRepo', id: string } };

export type RescanReposMutationVariables = Exact<{ [key: string]: never; }>;


export type RescanReposMutation = { __typename?: 'Mutation', rescanRepos: Array<{ __typename?: 'GithubRepo', id: string }> };

export type ScanRepoMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type ScanRepoMutation = { __typename?: 'Mutation', scanRepo: (
    { __typename?: 'GithubRepo' }
    & RepoFragment
  ) };

export type ImportRepoMutationVariables = Exact<{
  reference: Scalars['String']['input'];
  channels?: InputMaybe<Array<Scalars['String']['input']> | Scalars['String']['input']>;
}>;


export type ImportRepoMutation = { __typename?: 'Mutation', importRepo: { __typename?: 'OciRepo', id: string, name: string, registry: string, repository: string, scannedAt?: any | null, flavours: Array<{ __typename?: 'Flavour', id: string, name: string, release: { __typename?: 'Release', id: string, version: string, app: { __typename?: 'App', id: string, identifier: string } } }> } };

export type GetAppQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetAppQuery = { __typename?: 'Query', app: (
    { __typename?: 'App' }
    & AppFragment
  ) };

export type ListAppsQueryVariables = Exact<{
  filters?: InputMaybe<AppFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListAppsQuery = { __typename?: 'Query', apps: Array<(
    { __typename?: 'App' }
    & ShelfAppFragment
  )> };

export type AppCatalogQueryVariables = Exact<{
  filters?: InputMaybe<AppFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type AppCatalogQuery = { __typename?: 'Query', apps: Array<(
    { __typename?: 'App' }
    & AppFragment
  )> };

export type ListReleaseApprovalsQueryVariables = Exact<{
  filters?: InputMaybe<ReleaseApprovalFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListReleaseApprovalsQuery = { __typename?: 'Query', releaseApprovals: Array<(
    { __typename?: 'ReleaseApproval' }
    & ListReleaseApprovalFragment
  )> };

export type GetReleaseApprovalQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetReleaseApprovalQuery = { __typename?: 'Query', releaseApproval: (
    { __typename?: 'ReleaseApproval' }
    & ReleaseApprovalFragment
  ) };

export type GetApprovableReleaseQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetApprovableReleaseQuery = { __typename?: 'Query', release: (
    { __typename?: 'Release' }
    & ApprovableReleaseFragment
  ) };

export type ListBackendsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListBackendsQuery = { __typename?: 'Query', backends: Array<(
    { __typename?: 'Backend' }
    & ListBackendFragment
  )> };

export type GetBackendQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetBackendQuery = { __typename?: 'Query', backend: (
    { __typename?: 'Backend' }
    & BackendFragment
  ) };

export type KabinetLogoTreeQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type KabinetLogoTreeQuery = { __typename?: 'Query', flavourBlok?: { __typename?: 'FlavourBlok', id: string, hash: string, componentTree?: any | null, vocab?: number | null, locals: any, demo?: any | null, queries: any } | null };

export type FlavourBloksQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type FlavourBloksQuery = { __typename?: 'Query', flavour: { __typename?: 'Flavour', id: string, assets: any, blokImplementations: Array<(
      { __typename?: 'FlavourBlok' }
      & KabinetBlokFragment
    )>, definitions: Array<{ __typename?: 'Definition', id: string, name: string, logo?: { __typename?: 'FlavourBlok', id: string } | null }> } };

export type GetDefinitionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDefinitionQuery = { __typename?: 'Query', definition: (
    { __typename?: 'Definition' }
    & DefinitionFragment
  ) };

export type ListDefinitionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ListDefinitionsQuery = { __typename?: 'Query', definitions: Array<(
    { __typename?: 'Definition' }
    & ListDefinitionFragment
  )> };

export type PrimaryDefinitionsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  identifier?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  ordering?: InputMaybe<Array<DefinitionOrder> | DefinitionOrder>;
}>;


export type PrimaryDefinitionsQuery = { __typename?: 'Query', definitions: Array<(
    { __typename?: 'Definition' }
    & ListDefinitionFragment
  )> };

export type AllPrimaryDefinitionsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<DefinitionFilter>;
  ordering?: InputMaybe<Array<DefinitionOrder> | DefinitionOrder>;
}>;


export type AllPrimaryDefinitionsQuery = { __typename?: 'Query', definitions: Array<(
    { __typename?: 'Definition' }
    & ListDefinitionFragment
  )> };

export type SmartDefinitionsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<DefinitionFilter>;
  ordering?: InputMaybe<Array<DefinitionOrder> | DefinitionOrder>;
}>;


export type SmartDefinitionsQuery = { __typename?: 'Query', definitions: Array<(
    { __typename?: 'Definition' }
    & SmartDefinitionFragment
  )> };

export type DefinitionReleaseQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DefinitionReleaseQuery = { __typename?: 'Query', definition: { __typename?: 'Definition', id: string, flavours: Array<{ __typename?: 'Flavour', id: string, release: { __typename?: 'Release', id: string, version: string } }> } };

export type ListDeploymentsQueryVariables = Exact<{
  filters?: InputMaybe<DeploymentFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListDeploymentsQuery = { __typename?: 'Query', deployments: Array<(
    { __typename?: 'Deployment' }
    & ListDeploymentFragment
  )> };

export type GetDeploymentQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDeploymentQuery = { __typename?: 'Query', deployment: (
    { __typename?: 'Deployment' }
    & DeploymentFragment
  ) };

export type ListFlavoursQueryVariables = Exact<{ [key: string]: never; }>;


export type ListFlavoursQuery = { __typename?: 'Query', flavours: Array<(
    { __typename?: 'Flavour' }
    & ListFlavourFragment
  )> };

export type GetFlavourQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetFlavourQuery = { __typename?: 'Query', flavour: (
    { __typename?: 'Flavour' }
    & FlavourFragment
  ) };

export type HomePageQueryVariables = Exact<{ [key: string]: never; }>;


export type HomePageQuery = { __typename?: 'Query', repos: Array<(
    { __typename?: 'GithubRepo' }
    & ListRepoFragment
  )> };

export type HomePageStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type HomePageStatsQuery = { __typename?: 'Query', githubRepoStats: { __typename?: 'GithubRepoStats', count: number } };

export type ListPodQueryVariables = Exact<{ [key: string]: never; }>;


export type ListPodQuery = { __typename?: 'Query', pods: Array<(
    { __typename?: 'Pod' }
    & ListPodFragment
  )> };

export type GetPodQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetPodQuery = { __typename?: 'Query', pod: (
    { __typename?: 'Pod' }
    & PodFragment
  ) };

export type GetPodForAgentQueryVariables = Exact<{
  clientId: Scalars['ID']['input'];
}>;


export type GetPodForAgentQuery = { __typename?: 'Query', podForAgent?: (
    { __typename?: 'Pod' }
    & PodFragment
  ) | null };

export type ListReleasesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListReleasesQuery = { __typename?: 'Query', releases: Array<(
    { __typename?: 'Release' }
    & ListReleaseFragment
  )> };

export type GetReleaseQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetReleaseQuery = { __typename?: 'Query', release: (
    { __typename?: 'Release' }
    & ReleaseFragment
  ) };

export type RepoBloksQueryVariables = Exact<{
  filters?: InputMaybe<RepoBlokFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type RepoBloksQuery = { __typename?: 'Query', repoBloks: Array<(
    { __typename?: 'RepoBlok' }
    & StoreRepoBlokFragment
  )> };

export type RepoBlokTreeQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RepoBlokTreeQuery = { __typename?: 'Query', repoBlok: { __typename?: 'RepoBlok', id: string, hash: string, componentTree?: any | null, vocab: number, catalogs: any, module?: string | null, locals: any, demo: any, queries: any, subscriptions: any } };

export type RepoBlokInstallQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type RepoBlokInstallQuery = { __typename?: 'Query', repoBlok: { __typename?: 'RepoBlok', id: string, name: string, hash: string, origin: string, installInput: any } };

export type GetRepoQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetRepoQuery = { __typename?: 'Query', repo: (
    { __typename?: 'GithubRepo' }
    & RepoFragment
  ) };

export type ListReposQueryVariables = Exact<{
  filters?: InputMaybe<GithubRepoFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListReposQuery = { __typename?: 'Query', repos: Array<(
    { __typename?: 'GithubRepo' }
    & ListRepoFragment
  )> };

export type ListResourcesQueryVariables = Exact<{ [key: string]: never; }>;


export type ListResourcesQuery = { __typename?: 'Query', resources: Array<(
    { __typename?: 'Resource' }
    & ListResourceFragment
  )> };

export type GetResourceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetResourceQuery = { __typename?: 'Query', resource: (
    { __typename?: 'Resource' }
    & ResourceFragment
  ) };

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', definitions: Array<(
    { __typename?: 'Definition' }
    & ListDefinitionFragment
  )>, flavours: Array<(
    { __typename?: 'Flavour' }
    & ListFlavourFragment
  )> };

export type AppStoreQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type AppStoreQuery = { __typename?: 'Query', releases: Array<(
    { __typename?: 'Release' }
    & StoreReleaseFragment
  )> };

export const KabinetLogoBlokFragmentDoc = gql`
    fragment KabinetLogoBlok on FlavourBlok {
  id
  hash
}
    `;
export const StoreSelectorFragmentDoc = gql`
    fragment StoreSelector on Selector {
  __typename
  kind
  required
  ... on CudaSelector {
    computeCapability
    memory
    count
    cudaVersion
  }
  ... on RocmSelector {
    apiVersion
  }
  ... on CPUSelector {
    arch
    minCount
  }
}
    `;
export const StoreBlokFragmentDoc = gql`
    fragment StoreBlok on FlavourBlok {
  id
  flavourId
  key
  context
  default
  description
  hash
  parseError
}
    `;
export const StoreFlavourFragmentDoc = gql`
    fragment StoreFlavour on Flavour {
  id
  name
  logo
  originalLogo
  image {
    imageString
    buildAt
  }
  requirements {
    key
    service
    optional
    description
  }
  selectors {
    ...StoreSelector
  }
  repo {
    id
    name
    user
    repo
    url
  }
  definitions {
    id
    name
    description
    kind
    logo {
      ...KabinetLogoBlok
    }
  }
  deployments {
    id
    status
  }
  blokImplementations {
    ...StoreBlok
  }
  assets
}
    ${StoreSelectorFragmentDoc}
${KabinetLogoBlokFragmentDoc}
${StoreBlokFragmentDoc}`;
export const StoreReleaseFragmentDoc = gql`
    fragment StoreRelease on Release {
  id
  name
  version
  logo
  originalLogo
  logoBlok {
    ...KabinetLogoBlok
  }
  scopes
  entrypoint
  app {
    id
    identifier
    embedding
  }
  flavours {
    ...StoreFlavour
  }
}
    ${KabinetLogoBlokFragmentDoc}
${StoreFlavourFragmentDoc}`;
export const AppFragmentDoc = gql`
    fragment App on App {
  id
  identifier
  embedding
  releases(ordering: [{releasedAt: DESC}]) {
    ...StoreRelease
  }
}
    ${StoreReleaseFragmentDoc}`;
export const ShelfAppFragmentDoc = gql`
    fragment ShelfApp on App {
  id
  identifier
  embedding
  releases(ordering: [{releasedAt: DESC}], pagination: {limit: 1}) {
    ...StoreRelease
  }
}
    ${StoreReleaseFragmentDoc}`;
export const ListReleaseApprovalFragmentDoc = gql`
    fragment ListReleaseApproval on ReleaseApproval {
  id
  name
  agent
  digest
  mandateId
  createdAt
  revokedAt
  isStale
  isActive
  approver {
    sub
  }
  release {
    id
    name
    version
    logo
    originalLogo
    logoBlok {
      ...KabinetLogoBlok
    }
    app {
      id
      identifier
      embedding
    }
  }
}
    ${KabinetLogoBlokFragmentDoc}`;
export const ReleaseApprovalFragmentDoc = gql`
    fragment ReleaseApproval on ReleaseApproval {
  ...ListReleaseApproval
  backends {
    id
    name
  }
}
    ${ListReleaseApprovalFragmentDoc}`;
export const ApprovableReleaseFragmentDoc = gql`
    fragment ApprovableRelease on Release {
  id
  name
  version
  logo
  originalLogo
  logoBlok {
    ...KabinetLogoBlok
  }
  scopes
  approvalDigest
  digestPinned
  mandateManifest
  app {
    id
    identifier
    embedding
  }
  flavours {
    id
    name
    logo
    originalLogo
    image {
      imageString
    }
    requirements {
      key
      service
      optional
      description
    }
  }
  approvals(filters: {revoked: false}) {
    ...ListReleaseApproval
  }
}
    ${KabinetLogoBlokFragmentDoc}
${ListReleaseApprovalFragmentDoc}`;
export const KabinetBlokFragmentDoc = gql`
    fragment KabinetBlok on FlavourBlok {
  id
  flavourId
  key
  context
  default
  description
  hash
  componentTree
  vocab
  locals
  demo
  queries
  forModel
  forNode
  parseError
}
    `;
export const PortCallLeafArgumentFragmentDoc = gql`
    fragment PortCallLeafArgument on ActionArgument {
  key
  valueLiteral
  valuePath
}
    `;
export const PortCallLeafFragmentDoc = gql`
    fragment PortCallLeaf on UtilCall {
  operation
  arguments {
    ...PortCallLeafArgument
  }
}
    ${PortCallLeafArgumentFragmentDoc}`;
export const PortCallInnerArgumentFragmentDoc = gql`
    fragment PortCallInnerArgument on ActionArgument {
  ...PortCallLeafArgument
  utilCall {
    ...PortCallLeaf
  }
  valueList {
    ...PortCallLeafArgument
  }
  valueDict {
    ...PortCallLeafArgument
  }
}
    ${PortCallLeafArgumentFragmentDoc}
${PortCallLeafFragmentDoc}`;
export const PortCallInnerFragmentDoc = gql`
    fragment PortCallInner on UtilCall {
  operation
  arguments {
    ...PortCallInnerArgument
  }
}
    ${PortCallInnerArgumentFragmentDoc}`;
export const PortCallArgumentFragmentDoc = gql`
    fragment PortCallArgument on ActionArgument {
  ...PortCallLeafArgument
  utilCall {
    ...PortCallInner
  }
  valueList {
    ...PortCallInnerArgument
  }
  valueDict {
    ...PortCallInnerArgument
  }
}
    ${PortCallLeafArgumentFragmentDoc}
${PortCallInnerFragmentDoc}
${PortCallInnerArgumentFragmentDoc}`;
export const PortCallFragmentDoc = gql`
    fragment PortCall on UtilCall {
  operation
  arguments {
    ...PortCallArgument
  }
}
    ${PortCallArgumentFragmentDoc}`;
export const BaseEffectFragmentDoc = gql`
    fragment BaseEffect on Effect {
  __typename
  kind
  dependencies
  source
  call {
    ...PortCall
  }
}
    ${PortCallFragmentDoc}`;
export const CustomEffectFragmentDoc = gql`
    fragment CustomEffect on CustomEffect {
  ...BaseEffect
  __typename
  kind
}
    ${BaseEffectFragmentDoc}`;
export const MessageEffectFragmentDoc = gql`
    fragment MessageEffect on MessageEffect {
  ...BaseEffect
  __typename
  kind
  message
}
    ${BaseEffectFragmentDoc}`;
export const HideEffectFragmentDoc = gql`
    fragment HideEffect on HideEffect {
  ...BaseEffect
  __typename
  fade
}
    ${BaseEffectFragmentDoc}`;
export const PortEffectFragmentDoc = gql`
    fragment PortEffect on Effect {
  ...CustomEffect
  ...MessageEffect
  ...HideEffect
}
    ${CustomEffectFragmentDoc}
${MessageEffectFragmentDoc}
${HideEffectFragmentDoc}`;
export const StringAssignWidgetFragmentDoc = gql`
    fragment StringAssignWidget on StringAssignWidget {
  __typename
  kind
  placeholder
  asParagraph
}
    `;
export const FilterPortFragmentDoc = gql`
    fragment FilterPort on ArgPort {
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
export const SearchAssignWidgetFragmentDoc = gql`
    fragment SearchAssignWidget on SearchAssignWidget {
  __typename
  kind
  query
  ward
  filters {
    ...FilterPort
  }
  dependencies
}
    ${FilterPortFragmentDoc}`;
export const SliderAssignWidgetFragmentDoc = gql`
    fragment SliderAssignWidget on SliderAssignWidget {
  __typename
  kind
  min
  max
  step
}
    `;
export const ChoiceAssignWidgetFragmentDoc = gql`
    fragment ChoiceAssignWidget on ChoiceAssignWidget {
  __typename
  kind
  followValue
  placeholder
}
    `;
export const ProxyWidgetFragmentDoc = gql`
    fragment ProxyWidget on ProxyWidget {
  __typename
  kind
  targetPort
  targetAction
  targetDependency
}
    `;
export const BlokAgentCallLeafFragmentDoc = gql`
    fragment BlokAgentCallLeaf on AgentCall {
  dependency
  operation
  arguments {
    ...PortCallLeafArgument
  }
}
    ${PortCallLeafArgumentFragmentDoc}`;
export const BlokArgumentInnerFragmentDoc = gql`
    fragment BlokArgumentInner on ActionArgument {
  ...PortCallInnerArgument
  agentCall {
    ...BlokAgentCallLeaf
  }
}
    ${PortCallInnerArgumentFragmentDoc}
${BlokAgentCallLeafFragmentDoc}`;
export const BlokArgumentFragmentDoc = gql`
    fragment BlokArgument on ActionArgument {
  ...PortCallLeafArgument
  utilCall {
    operation
    arguments {
      ...BlokArgumentInner
    }
  }
  agentCall {
    dependency
    operation
    arguments {
      ...BlokArgumentInner
    }
  }
  valueList {
    ...BlokArgumentInner
  }
  valueDict {
    ...BlokArgumentInner
  }
}
    ${PortCallLeafArgumentFragmentDoc}
${BlokArgumentInnerFragmentDoc}`;
export const BlokComponentPropFragmentDoc = gql`
    fragment BlokComponentProp on ComponentProp {
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
      ...BlokArgument
    }
  }
  utilCall {
    operation
    arguments {
      ...BlokArgument
    }
  }
}
    ${BlokArgumentFragmentDoc}`;
export const StateChoiceAssignWidgetFragmentDoc = gql`
    fragment StateChoiceAssignWidget on StateChoiceAssignWidget {
  __typename
  kind
  followValue
  statePath
  stateCall {
    ...PortCall
  }
  stateAccessors {
    optionKey
    path
    call {
      ...PortCall
    }
  }
  dependency
  dependencies
}
    ${PortCallFragmentDoc}`;
export const CustomAssignWidgetFragmentDoc = gql`
    fragment CustomAssignWidget on CustomAssignWidget {
  __typename
  kind
  followValue
  component
  props {
    ...BlokComponentProp
  }
  dependencies
  fallback {
    __typename
    kind
    ...StringAssignWidget
    ...SearchAssignWidget
    ...SliderAssignWidget
    ...ChoiceAssignWidget
    ...ProxyWidget
    ...StateChoiceAssignWidget
  }
}
    ${BlokComponentPropFragmentDoc}
${StringAssignWidgetFragmentDoc}
${SearchAssignWidgetFragmentDoc}
${SliderAssignWidgetFragmentDoc}
${ChoiceAssignWidgetFragmentDoc}
${ProxyWidgetFragmentDoc}
${StateChoiceAssignWidgetFragmentDoc}`;
export const AssignWidgetFragmentDoc = gql`
    fragment AssignWidget on AssignWidget {
  __typename
  kind
  ...StringAssignWidget
  ...SearchAssignWidget
  ...SliderAssignWidget
  ...ChoiceAssignWidget
  ...ProxyWidget
  ...CustomAssignWidget
  ...StateChoiceAssignWidget
}
    ${StringAssignWidgetFragmentDoc}
${SearchAssignWidgetFragmentDoc}
${SliderAssignWidgetFragmentDoc}
${ChoiceAssignWidgetFragmentDoc}
${ProxyWidgetFragmentDoc}
${CustomAssignWidgetFragmentDoc}
${StateChoiceAssignWidgetFragmentDoc}`;
export const ArgChildPortDeepFragmentDoc = gql`
    fragment ArgChildPortDeep on ArgPort {
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
    ...AssignWidget
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
      ...AssignWidget
    }
  }
}
    ${AssignWidgetFragmentDoc}`;
export const ValidatorFragmentDoc = gql`
    fragment Validator on Validator {
  call {
    ...PortCall
  }
  dependencies
  label
  errorMessage
  source
}
    ${PortCallFragmentDoc}`;
export const ArgChildPortNestedFragmentDoc = gql`
    fragment ArgChildPortNested on ArgPort {
  __typename
  kind
  key
  label
  identifier
  referenceUnit
  proposedUnits
  dimension
  children {
    ...ArgChildPortDeep
  }
  choices {
    value
    label
    description
  }
  widget {
    ...AssignWidget
  }
  effects {
    ...PortEffect
  }
  validators {
    ...Validator
  }
  description
  nullable
  default
}
    ${ArgChildPortDeepFragmentDoc}
${AssignWidgetFragmentDoc}
${PortEffectFragmentDoc}
${ValidatorFragmentDoc}`;
export const ArgChildPortFragmentDoc = gql`
    fragment ArgChildPort on ArgPort {
  __typename
  kind
  key
  label
  identifier
  referenceUnit
  proposedUnits
  dimension
  children {
    ...ArgChildPortNested
  }
  widget {
    ...AssignWidget
  }
  effects {
    ...PortEffect
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
    ${ArgChildPortNestedFragmentDoc}
${AssignWidgetFragmentDoc}
${PortEffectFragmentDoc}
${ValidatorFragmentDoc}`;
export const ArgPortFragmentDoc = gql`
    fragment ArgPort on ArgPort {
  __typename
  key
  label
  nullable
  description
  effects {
    ...PortEffect
  }
  widget {
    ...AssignWidget
  }
  kind
  identifier
  referenceUnit
  proposedUnits
  dimension
  children {
    ...ArgChildPort
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
    ${PortEffectFragmentDoc}
${AssignWidgetFragmentDoc}
${ArgChildPortFragmentDoc}
${ValidatorFragmentDoc}`;
export const CustomReturnWidgetFragmentDoc = gql`
    fragment CustomReturnWidget on CustomReturnWidget {
  __typename
  kind
  component
  props {
    ...BlokComponentProp
  }
}
    ${BlokComponentPropFragmentDoc}`;
export const ChoiceReturnWidgetFragmentDoc = gql`
    fragment ChoiceReturnWidget on ChoiceReturnWidget {
  __typename
  kind
}
    `;
export const ReturnWidgetFragmentDoc = gql`
    fragment ReturnWidget on ReturnWidget {
  __typename
  kind
  ...CustomReturnWidget
  ...ChoiceReturnWidget
}
    ${CustomReturnWidgetFragmentDoc}
${ChoiceReturnWidgetFragmentDoc}`;
export const ReturnChildPortDeepFragmentDoc = gql`
    fragment ReturnChildPortDeep on ReturnPort {
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
    ...ReturnWidget
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
      ...ReturnWidget
    }
  }
}
    ${ReturnWidgetFragmentDoc}`;
export const ReturnChildPortNestedFragmentDoc = gql`
    fragment ReturnChildPortNested on ReturnPort {
  __typename
  kind
  key
  label
  identifier
  referenceUnit
  proposedUnits
  dimension
  children {
    ...ReturnChildPortDeep
  }
  choices {
    value
    label
    description
  }
  widget {
    ...ReturnWidget
  }
  effects {
    ...PortEffect
  }
  description
  nullable
}
    ${ReturnChildPortDeepFragmentDoc}
${ReturnWidgetFragmentDoc}
${PortEffectFragmentDoc}`;
export const ReturnChildPortFragmentDoc = gql`
    fragment ReturnChildPort on ReturnPort {
  __typename
  kind
  key
  label
  identifier
  referenceUnit
  proposedUnits
  dimension
  children {
    ...ReturnChildPortNested
  }
  widget {
    ...ReturnWidget
  }
  effects {
    ...PortEffect
  }
  choices {
    value
    label
    description
  }
  nullable
  description
}
    ${ReturnChildPortNestedFragmentDoc}
${ReturnWidgetFragmentDoc}
${PortEffectFragmentDoc}`;
export const ReturnPortFragmentDoc = gql`
    fragment ReturnPort on ReturnPort {
  __typename
  key
  label
  nullable
  description
  effects {
    ...PortEffect
  }
  widget {
    ...ReturnWidget
  }
  kind
  identifier
  referenceUnit
  proposedUnits
  dimension
  children {
    ...ReturnChildPort
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
    ${PortEffectFragmentDoc}
${ReturnWidgetFragmentDoc}
${ReturnChildPortFragmentDoc}`;
export const CudaSelectorFragmentDoc = gql`
    fragment CudaSelector on CudaSelector {
  cudaVersion
  cudaCores
}
    `;
export const RocmSelectorFragmentDoc = gql`
    fragment RocmSelector on RocmSelector {
  apiVersion
  apiThing
}
    `;
export const ListFlavourFragmentDoc = gql`
    fragment ListFlavour on Flavour {
  id
  name
  logo
  originalLogo
  release {
    id
    version
    logo
    originalLogo
    logoBlok {
      ...KabinetLogoBlok
    }
    app {
      id
      identifier
      embedding
    }
  }
  selectors {
    ...CudaSelector
    ...RocmSelector
  }
}
    ${KabinetLogoBlokFragmentDoc}
${CudaSelectorFragmentDoc}
${RocmSelectorFragmentDoc}`;
export const DefinitionFragmentDoc = gql`
    fragment Definition on Definition {
  id
  name
  hash
  description
  logo {
    ...KabinetLogoBlok
  }
  args {
    ...ArgPort
  }
  returns {
    ...ReturnPort
  }
  flavours {
    ...ListFlavour
  }
}
    ${KabinetLogoBlokFragmentDoc}
${ArgPortFragmentDoc}
${ReturnPortFragmentDoc}
${ListFlavourFragmentDoc}`;
export const SmartDefinitionFragmentDoc = gql`
    fragment SmartDefinition on Definition {
  id
  name
  description
  logo {
    ...KabinetLogoBlok
  }
}
    ${KabinetLogoBlokFragmentDoc}`;
export const ListDeploymentFragmentDoc = gql`
    fragment ListDeployment on Deployment {
  id
  localId
  name
  status
  backend {
    id
    name
    kind
  }
  flavour {
    id
    name
    logo
    originalLogo
    release {
      id
      version
      logo
      originalLogo
      logoBlok {
        ...KabinetLogoBlok
      }
      app {
        id
        identifier
        embedding
      }
    }
  }
}
    ${KabinetLogoBlokFragmentDoc}`;
export const ListBackendFragmentDoc = gql`
    fragment ListBackend on Backend {
  id
  user {
    sub
  }
  client {
    clientId
  }
  name
  kind
}
    `;
export const DeploymentFragmentDoc = gql`
    fragment Deployment on Deployment {
  ...ListDeployment
  backend {
    ...ListBackend
  }
  approval {
    ...ListReleaseApproval
  }
}
    ${ListDeploymentFragmentDoc}
${ListBackendFragmentDoc}
${ListReleaseApprovalFragmentDoc}`;
export const ListDefinitionFragmentDoc = gql`
    fragment ListDefinition on Definition {
  id
  name
  hash
  description
  logo {
    ...KabinetLogoBlok
  }
  kind
  flavours {
    id
    name
    logo
    originalLogo
    release {
      id
      version
      logo
      originalLogo
      logoBlok {
        ...KabinetLogoBlok
      }
      app {
        id
        identifier
        embedding
      }
    }
  }
}
    ${KabinetLogoBlokFragmentDoc}`;
export const FlavourFragmentDoc = gql`
    fragment Flavour on Flavour {
  ...ListFlavour
  selectors {
    ...StoreSelector
  }
  image {
    imageString
    buildAt
  }
  requirements {
    key
    service
    optional
    description
  }
  repo {
    id
    name
    user
    repo
    url
  }
  deployments {
    ...ListDeployment
  }
  definitions {
    ...ListDefinition
  }
  blokKeys: blokImplementations {
    id
    context
  }
  assets
  release {
    scopes
    flavours {
      id
      name
      selectors {
        ...CudaSelector
        ...RocmSelector
      }
    }
  }
}
    ${ListFlavourFragmentDoc}
${StoreSelectorFragmentDoc}
${ListDeploymentFragmentDoc}
${ListDefinitionFragmentDoc}
${CudaSelectorFragmentDoc}
${RocmSelectorFragmentDoc}`;
export const ListPodFragmentDoc = gql`
    fragment ListPod on Pod {
  id
  podId
  backend {
    user {
      sub
    }
    client {
      clientId
    }
    name
  }
  deployment {
    id
    flavour {
      release {
        id
        version
        logoBlok {
          ...KabinetLogoBlok
        }
        app {
          identifier
        }
      }
    }
  }
  clientId
  resource {
    id
    name
  }
  status
}
    ${KabinetLogoBlokFragmentDoc}`;
export const ListResourceFragmentDoc = gql`
    fragment ListResource on Resource {
  id
  name
  qualifiers
  backend {
    id
    name
  }
}
    `;
export const BackendFragmentDoc = gql`
    fragment Backend on Backend {
  id
  user {
    sub
  }
  client {
    clientId
  }
  clientId
  name
  kind
  pods {
    ...ListPod
  }
  resources {
    ...ListResource
  }
}
    ${ListPodFragmentDoc}
${ListResourceFragmentDoc}`;
export const PodFragmentDoc = gql`
    fragment Pod on Pod {
  id
  podId
  backend {
    ...Backend
  }
  status
  latestLogDump {
    logs
    createdAt
  }
  clientId
  resource {
    ...ListResource
  }
  deployment {
    id
    name
    approval {
      ...ListReleaseApproval
    }
    flavour {
      id
      name
      release {
        id
        version
        logoBlok {
          ...KabinetLogoBlok
        }
        app {
          identifier
        }
      }
    }
  }
}
    ${BackendFragmentDoc}
${ListResourceFragmentDoc}
${ListReleaseApprovalFragmentDoc}
${KabinetLogoBlokFragmentDoc}`;
export const ReleaseFragmentDoc = gql`
    fragment Release on Release {
  id
  name
  version
  logo
  originalLogo
  logoBlok {
    ...KabinetLogoBlok
  }
  entrypoint
  app {
    id
    identifier
    embedding
    releases(ordering: [{releasedAt: DESC}]) {
      id
      version
    }
  }
  flavours {
    ...ListFlavour
    ...StoreFlavour
    blokKeys: blokImplementations {
      id
      context
    }
    assets
  }
  scopes
}
    ${KabinetLogoBlokFragmentDoc}
${ListFlavourFragmentDoc}
${StoreFlavourFragmentDoc}`;
export const ListReleaseFragmentDoc = gql`
    fragment ListRelease on Release {
  id
  version
  logo
  originalLogo
  logoBlok {
    ...KabinetLogoBlok
  }
  app {
    id
    identifier
    embedding
  }
  scopes
  flavours {
    ...ListFlavour
  }
}
    ${KabinetLogoBlokFragmentDoc}
${ListFlavourFragmentDoc}`;
export const ListRepoFragmentDoc = gql`
    fragment ListRepo on GithubRepo {
  id
  name
  branch
  user
  repo
}
    `;
export const StoreRepoBlokFragmentDoc = gql`
    fragment StoreRepoBlok on RepoBlok {
  id
  key
  name
  description
  context
  hash
  installHash
  parseError
  origin
  sourcePath
  repo {
    id
    name
  }
}
    `;
export const RepoFragmentDoc = gql`
    fragment Repo on GithubRepo {
  id
  name
  branch
  user
  repo
  url
  issueUrl
  addedAt
  updatedAt
  organization {
    id
    identifier
  }
  flavours {
    ...ListFlavour
    image {
      imageString
      buildAt
    }
    requirements {
      key
      service
      optional
      description
    }
  }
  bloks {
    ...StoreRepoBlok
  }
}
    ${ListFlavourFragmentDoc}
${StoreRepoBlokFragmentDoc}`;
export const ResourceFragmentDoc = gql`
    fragment Resource on Resource {
  id
  name
  qualifiers
  backend {
    id
    name
  }
  pods {
    ...ListPod
  }
}
    ${ListPodFragmentDoc}`;
export const ApproveReleaseDocument = gql`
    mutation ApproveRelease($input: ApproveReleaseInput!) {
  approveRelease(input: $input) {
    ...ReleaseApproval
  }
}
    ${ReleaseApprovalFragmentDoc}`;
export type ApproveReleaseMutationFn = Apollo.MutationFunction<ApproveReleaseMutation, ApproveReleaseMutationVariables>;

/**
 * __useApproveReleaseMutation__
 *
 * To run a mutation, you first call `useApproveReleaseMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useApproveReleaseMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [approveReleaseMutation, { data, loading, error }] = useApproveReleaseMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useApproveReleaseMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ApproveReleaseMutation, ApproveReleaseMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ApproveReleaseMutation, ApproveReleaseMutationVariables>(ApproveReleaseDocument, options);
      }
export type ApproveReleaseMutationHookResult = ReturnType<typeof useApproveReleaseMutation>;
export type ApproveReleaseMutationResult = Apollo.MutationResult<ApproveReleaseMutation>;
export type ApproveReleaseMutationOptions = Apollo.BaseMutationOptions<ApproveReleaseMutation, ApproveReleaseMutationVariables>;
export const RevokeApprovalDocument = gql`
    mutation RevokeApproval($id: ID!) {
  revokeApproval(input: {id: $id}) {
    ...ReleaseApproval
  }
}
    ${ReleaseApprovalFragmentDoc}`;
export type RevokeApprovalMutationFn = Apollo.MutationFunction<RevokeApprovalMutation, RevokeApprovalMutationVariables>;

/**
 * __useRevokeApprovalMutation__
 *
 * To run a mutation, you first call `useRevokeApprovalMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevokeApprovalMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revokeApprovalMutation, { data, loading, error }] = useRevokeApprovalMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRevokeApprovalMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevokeApprovalMutation, RevokeApprovalMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevokeApprovalMutation, RevokeApprovalMutationVariables>(RevokeApprovalDocument, options);
      }
export type RevokeApprovalMutationHookResult = ReturnType<typeof useRevokeApprovalMutation>;
export type RevokeApprovalMutationResult = Apollo.MutationResult<RevokeApprovalMutation>;
export type RevokeApprovalMutationOptions = Apollo.BaseMutationOptions<RevokeApprovalMutation, RevokeApprovalMutationVariables>;
export const DeleteBackendDocument = gql`
    mutation DeleteBackend($id: ID!) {
  deleteBackend(id: $id)
}
    `;
export type DeleteBackendMutationFn = Apollo.MutationFunction<DeleteBackendMutation, DeleteBackendMutationVariables>;

/**
 * __useDeleteBackendMutation__
 *
 * To run a mutation, you first call `useDeleteBackendMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteBackendMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteBackendMutation, { data, loading, error }] = useDeleteBackendMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteBackendMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteBackendMutation, DeleteBackendMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteBackendMutation, DeleteBackendMutationVariables>(DeleteBackendDocument, options);
      }
export type DeleteBackendMutationHookResult = ReturnType<typeof useDeleteBackendMutation>;
export type DeleteBackendMutationResult = Apollo.MutationResult<DeleteBackendMutation>;
export type DeleteBackendMutationOptions = Apollo.BaseMutationOptions<DeleteBackendMutation, DeleteBackendMutationVariables>;
export const DeletePodDocument = gql`
    mutation DeletePod($id: ID!) {
  deletePod(input: {id: $id})
}
    `;
export type DeletePodMutationFn = Apollo.MutationFunction<DeletePodMutation, DeletePodMutationVariables>;

/**
 * __useDeletePodMutation__
 *
 * To run a mutation, you first call `useDeletePodMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeletePodMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deletePodMutation, { data, loading, error }] = useDeletePodMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeletePodMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeletePodMutation, DeletePodMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeletePodMutation, DeletePodMutationVariables>(DeletePodDocument, options);
      }
export type DeletePodMutationHookResult = ReturnType<typeof useDeletePodMutation>;
export type DeletePodMutationResult = Apollo.MutationResult<DeletePodMutation>;
export type DeletePodMutationOptions = Apollo.BaseMutationOptions<DeletePodMutation, DeletePodMutationVariables>;
export const CreateGithubRepoDocument = gql`
    mutation CreateGithubRepo($identifier: String!) {
  createGithubRepo(input: {identifier: $identifier}) {
    id
  }
}
    `;
export type CreateGithubRepoMutationFn = Apollo.MutationFunction<CreateGithubRepoMutation, CreateGithubRepoMutationVariables>;

/**
 * __useCreateGithubRepoMutation__
 *
 * To run a mutation, you first call `useCreateGithubRepoMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateGithubRepoMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createGithubRepoMutation, { data, loading, error }] = useCreateGithubRepoMutation({
 *   variables: {
 *      identifier: // value for 'identifier'
 *   },
 * });
 */
export function useCreateGithubRepoMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateGithubRepoMutation, CreateGithubRepoMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateGithubRepoMutation, CreateGithubRepoMutationVariables>(CreateGithubRepoDocument, options);
      }
export type CreateGithubRepoMutationHookResult = ReturnType<typeof useCreateGithubRepoMutation>;
export type CreateGithubRepoMutationResult = Apollo.MutationResult<CreateGithubRepoMutation>;
export type CreateGithubRepoMutationOptions = Apollo.BaseMutationOptions<CreateGithubRepoMutation, CreateGithubRepoMutationVariables>;
export const RescanReposDocument = gql`
    mutation RescanRepos {
  rescanRepos {
    id
  }
}
    `;
export type RescanReposMutationFn = Apollo.MutationFunction<RescanReposMutation, RescanReposMutationVariables>;

/**
 * __useRescanReposMutation__
 *
 * To run a mutation, you first call `useRescanReposMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRescanReposMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [rescanReposMutation, { data, loading, error }] = useRescanReposMutation({
 *   variables: {
 *   },
 * });
 */
export function useRescanReposMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RescanReposMutation, RescanReposMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RescanReposMutation, RescanReposMutationVariables>(RescanReposDocument, options);
      }
export type RescanReposMutationHookResult = ReturnType<typeof useRescanReposMutation>;
export type RescanReposMutationResult = Apollo.MutationResult<RescanReposMutation>;
export type RescanReposMutationOptions = Apollo.BaseMutationOptions<RescanReposMutation, RescanReposMutationVariables>;
export const ScanRepoDocument = gql`
    mutation ScanRepo($id: String!) {
  scanRepo(input: {id: $id}) {
    ...Repo
  }
}
    ${RepoFragmentDoc}`;
export type ScanRepoMutationFn = Apollo.MutationFunction<ScanRepoMutation, ScanRepoMutationVariables>;

/**
 * __useScanRepoMutation__
 *
 * To run a mutation, you first call `useScanRepoMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useScanRepoMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [scanRepoMutation, { data, loading, error }] = useScanRepoMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useScanRepoMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ScanRepoMutation, ScanRepoMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ScanRepoMutation, ScanRepoMutationVariables>(ScanRepoDocument, options);
      }
export type ScanRepoMutationHookResult = ReturnType<typeof useScanRepoMutation>;
export type ScanRepoMutationResult = Apollo.MutationResult<ScanRepoMutation>;
export type ScanRepoMutationOptions = Apollo.BaseMutationOptions<ScanRepoMutation, ScanRepoMutationVariables>;
export const ImportRepoDocument = gql`
    mutation ImportRepo($reference: String!, $channels: [String!]) {
  importRepo(input: {reference: $reference, channels: $channels}) {
    id
    name
    registry
    repository
    scannedAt
    flavours {
      id
      name
      release {
        id
        version
        app {
          id
          identifier
        }
      }
    }
  }
}
    `;
export type ImportRepoMutationFn = Apollo.MutationFunction<ImportRepoMutation, ImportRepoMutationVariables>;

/**
 * __useImportRepoMutation__
 *
 * To run a mutation, you first call `useImportRepoMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useImportRepoMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [importRepoMutation, { data, loading, error }] = useImportRepoMutation({
 *   variables: {
 *      reference: // value for 'reference'
 *      channels: // value for 'channels'
 *   },
 * });
 */
export function useImportRepoMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ImportRepoMutation, ImportRepoMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ImportRepoMutation, ImportRepoMutationVariables>(ImportRepoDocument, options);
      }
export type ImportRepoMutationHookResult = ReturnType<typeof useImportRepoMutation>;
export type ImportRepoMutationResult = Apollo.MutationResult<ImportRepoMutation>;
export type ImportRepoMutationOptions = Apollo.BaseMutationOptions<ImportRepoMutation, ImportRepoMutationVariables>;
export const GetAppDocument = gql`
    query GetApp($id: ID!) {
  app(id: $id) {
    ...App
  }
}
    ${AppFragmentDoc}`;

/**
 * __useGetAppQuery__
 *
 * To run a query within a React component, call `useGetAppQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAppQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAppQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetAppQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetAppQuery, GetAppQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetAppQuery, GetAppQueryVariables>(GetAppDocument, options);
      }
export function useGetAppLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetAppQuery, GetAppQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetAppQuery, GetAppQueryVariables>(GetAppDocument, options);
        }
export type GetAppQueryHookResult = ReturnType<typeof useGetAppQuery>;
export type GetAppLazyQueryHookResult = ReturnType<typeof useGetAppLazyQuery>;
export type GetAppQueryResult = Apollo.QueryResult<GetAppQuery, GetAppQueryVariables>;
export const ListAppsDocument = gql`
    query ListApps($filters: AppFilter, $pagination: OffsetPaginationInput) {
  apps(filters: $filters, pagination: $pagination) {
    ...ShelfApp
  }
}
    ${ShelfAppFragmentDoc}`;

/**
 * __useListAppsQuery__
 *
 * To run a query within a React component, call `useListAppsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListAppsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListAppsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListAppsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListAppsQuery, ListAppsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListAppsQuery, ListAppsQueryVariables>(ListAppsDocument, options);
      }
export function useListAppsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListAppsQuery, ListAppsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListAppsQuery, ListAppsQueryVariables>(ListAppsDocument, options);
        }
export type ListAppsQueryHookResult = ReturnType<typeof useListAppsQuery>;
export type ListAppsLazyQueryHookResult = ReturnType<typeof useListAppsLazyQuery>;
export type ListAppsQueryResult = Apollo.QueryResult<ListAppsQuery, ListAppsQueryVariables>;
export const AppCatalogDocument = gql`
    query AppCatalog($filters: AppFilter, $pagination: OffsetPaginationInput) {
  apps(filters: $filters, pagination: $pagination) {
    ...App
  }
}
    ${AppFragmentDoc}`;

/**
 * __useAppCatalogQuery__
 *
 * To run a query within a React component, call `useAppCatalogQuery` and pass it any options that fit your needs.
 * When your component renders, `useAppCatalogQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAppCatalogQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useAppCatalogQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<AppCatalogQuery, AppCatalogQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AppCatalogQuery, AppCatalogQueryVariables>(AppCatalogDocument, options);
      }
export function useAppCatalogLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AppCatalogQuery, AppCatalogQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AppCatalogQuery, AppCatalogQueryVariables>(AppCatalogDocument, options);
        }
export type AppCatalogQueryHookResult = ReturnType<typeof useAppCatalogQuery>;
export type AppCatalogLazyQueryHookResult = ReturnType<typeof useAppCatalogLazyQuery>;
export type AppCatalogQueryResult = Apollo.QueryResult<AppCatalogQuery, AppCatalogQueryVariables>;
export const ListReleaseApprovalsDocument = gql`
    query ListReleaseApprovals($filters: ReleaseApprovalFilter, $pagination: OffsetPaginationInput) {
  releaseApprovals(filters: $filters, pagination: $pagination) {
    ...ListReleaseApproval
  }
}
    ${ListReleaseApprovalFragmentDoc}`;

/**
 * __useListReleaseApprovalsQuery__
 *
 * To run a query within a React component, call `useListReleaseApprovalsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListReleaseApprovalsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListReleaseApprovalsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListReleaseApprovalsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListReleaseApprovalsQuery, ListReleaseApprovalsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListReleaseApprovalsQuery, ListReleaseApprovalsQueryVariables>(ListReleaseApprovalsDocument, options);
      }
export function useListReleaseApprovalsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListReleaseApprovalsQuery, ListReleaseApprovalsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListReleaseApprovalsQuery, ListReleaseApprovalsQueryVariables>(ListReleaseApprovalsDocument, options);
        }
export type ListReleaseApprovalsQueryHookResult = ReturnType<typeof useListReleaseApprovalsQuery>;
export type ListReleaseApprovalsLazyQueryHookResult = ReturnType<typeof useListReleaseApprovalsLazyQuery>;
export type ListReleaseApprovalsQueryResult = Apollo.QueryResult<ListReleaseApprovalsQuery, ListReleaseApprovalsQueryVariables>;
export const GetReleaseApprovalDocument = gql`
    query GetReleaseApproval($id: ID!) {
  releaseApproval(id: $id) {
    ...ReleaseApproval
  }
}
    ${ReleaseApprovalFragmentDoc}`;

/**
 * __useGetReleaseApprovalQuery__
 *
 * To run a query within a React component, call `useGetReleaseApprovalQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetReleaseApprovalQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetReleaseApprovalQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetReleaseApprovalQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetReleaseApprovalQuery, GetReleaseApprovalQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetReleaseApprovalQuery, GetReleaseApprovalQueryVariables>(GetReleaseApprovalDocument, options);
      }
export function useGetReleaseApprovalLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetReleaseApprovalQuery, GetReleaseApprovalQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetReleaseApprovalQuery, GetReleaseApprovalQueryVariables>(GetReleaseApprovalDocument, options);
        }
export type GetReleaseApprovalQueryHookResult = ReturnType<typeof useGetReleaseApprovalQuery>;
export type GetReleaseApprovalLazyQueryHookResult = ReturnType<typeof useGetReleaseApprovalLazyQuery>;
export type GetReleaseApprovalQueryResult = Apollo.QueryResult<GetReleaseApprovalQuery, GetReleaseApprovalQueryVariables>;
export const GetApprovableReleaseDocument = gql`
    query GetApprovableRelease($id: ID!) {
  release(id: $id) {
    ...ApprovableRelease
  }
}
    ${ApprovableReleaseFragmentDoc}`;

/**
 * __useGetApprovableReleaseQuery__
 *
 * To run a query within a React component, call `useGetApprovableReleaseQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetApprovableReleaseQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetApprovableReleaseQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetApprovableReleaseQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetApprovableReleaseQuery, GetApprovableReleaseQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetApprovableReleaseQuery, GetApprovableReleaseQueryVariables>(GetApprovableReleaseDocument, options);
      }
export function useGetApprovableReleaseLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetApprovableReleaseQuery, GetApprovableReleaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetApprovableReleaseQuery, GetApprovableReleaseQueryVariables>(GetApprovableReleaseDocument, options);
        }
export type GetApprovableReleaseQueryHookResult = ReturnType<typeof useGetApprovableReleaseQuery>;
export type GetApprovableReleaseLazyQueryHookResult = ReturnType<typeof useGetApprovableReleaseLazyQuery>;
export type GetApprovableReleaseQueryResult = Apollo.QueryResult<GetApprovableReleaseQuery, GetApprovableReleaseQueryVariables>;
export const ListBackendsDocument = gql`
    query ListBackends {
  backends {
    ...ListBackend
  }
}
    ${ListBackendFragmentDoc}`;

/**
 * __useListBackendsQuery__
 *
 * To run a query within a React component, call `useListBackendsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListBackendsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListBackendsQuery({
 *   variables: {
 *   },
 * });
 */
export function useListBackendsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListBackendsQuery, ListBackendsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListBackendsQuery, ListBackendsQueryVariables>(ListBackendsDocument, options);
      }
export function useListBackendsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListBackendsQuery, ListBackendsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListBackendsQuery, ListBackendsQueryVariables>(ListBackendsDocument, options);
        }
export type ListBackendsQueryHookResult = ReturnType<typeof useListBackendsQuery>;
export type ListBackendsLazyQueryHookResult = ReturnType<typeof useListBackendsLazyQuery>;
export type ListBackendsQueryResult = Apollo.QueryResult<ListBackendsQuery, ListBackendsQueryVariables>;
export const GetBackendDocument = gql`
    query GetBackend($id: ID!) {
  backend(id: $id) {
    ...Backend
  }
}
    ${BackendFragmentDoc}`;

/**
 * __useGetBackendQuery__
 *
 * To run a query within a React component, call `useGetBackendQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetBackendQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetBackendQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetBackendQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetBackendQuery, GetBackendQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetBackendQuery, GetBackendQueryVariables>(GetBackendDocument, options);
      }
export function useGetBackendLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetBackendQuery, GetBackendQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetBackendQuery, GetBackendQueryVariables>(GetBackendDocument, options);
        }
export type GetBackendQueryHookResult = ReturnType<typeof useGetBackendQuery>;
export type GetBackendLazyQueryHookResult = ReturnType<typeof useGetBackendLazyQuery>;
export type GetBackendQueryResult = Apollo.QueryResult<GetBackendQuery, GetBackendQueryVariables>;
export const KabinetLogoTreeDocument = gql`
    query KabinetLogoTree($id: ID!) {
  flavourBlok(id: $id) {
    id
    hash
    componentTree
    vocab
    locals
    demo
    queries
  }
}
    `;

/**
 * __useKabinetLogoTreeQuery__
 *
 * To run a query within a React component, call `useKabinetLogoTreeQuery` and pass it any options that fit your needs.
 * When your component renders, `useKabinetLogoTreeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useKabinetLogoTreeQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useKabinetLogoTreeQuery(baseOptions: ApolloReactHooks.QueryHookOptions<KabinetLogoTreeQuery, KabinetLogoTreeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<KabinetLogoTreeQuery, KabinetLogoTreeQueryVariables>(KabinetLogoTreeDocument, options);
      }
export function useKabinetLogoTreeLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<KabinetLogoTreeQuery, KabinetLogoTreeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<KabinetLogoTreeQuery, KabinetLogoTreeQueryVariables>(KabinetLogoTreeDocument, options);
        }
export type KabinetLogoTreeQueryHookResult = ReturnType<typeof useKabinetLogoTreeQuery>;
export type KabinetLogoTreeLazyQueryHookResult = ReturnType<typeof useKabinetLogoTreeLazyQuery>;
export type KabinetLogoTreeQueryResult = Apollo.QueryResult<KabinetLogoTreeQuery, KabinetLogoTreeQueryVariables>;
export const FlavourBloksDocument = gql`
    query FlavourBloks($id: ID!) {
  flavour(id: $id) {
    id
    blokImplementations {
      ...KabinetBlok
    }
    assets
    definitions {
      id
      name
      logo(flavour: $id) {
        id
      }
    }
  }
}
    ${KabinetBlokFragmentDoc}`;

/**
 * __useFlavourBloksQuery__
 *
 * To run a query within a React component, call `useFlavourBloksQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlavourBloksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlavourBloksQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useFlavourBloksQuery(baseOptions: ApolloReactHooks.QueryHookOptions<FlavourBloksQuery, FlavourBloksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<FlavourBloksQuery, FlavourBloksQueryVariables>(FlavourBloksDocument, options);
      }
export function useFlavourBloksLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<FlavourBloksQuery, FlavourBloksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<FlavourBloksQuery, FlavourBloksQueryVariables>(FlavourBloksDocument, options);
        }
export type FlavourBloksQueryHookResult = ReturnType<typeof useFlavourBloksQuery>;
export type FlavourBloksLazyQueryHookResult = ReturnType<typeof useFlavourBloksLazyQuery>;
export type FlavourBloksQueryResult = Apollo.QueryResult<FlavourBloksQuery, FlavourBloksQueryVariables>;
export const GetDefinitionDocument = gql`
    query GetDefinition($id: ID!) {
  definition(id: $id) {
    ...Definition
  }
}
    ${DefinitionFragmentDoc}`;

/**
 * __useGetDefinitionQuery__
 *
 * To run a query within a React component, call `useGetDefinitionQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDefinitionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDefinitionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetDefinitionQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetDefinitionQuery, GetDefinitionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetDefinitionQuery, GetDefinitionQueryVariables>(GetDefinitionDocument, options);
      }
export function useGetDefinitionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetDefinitionQuery, GetDefinitionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetDefinitionQuery, GetDefinitionQueryVariables>(GetDefinitionDocument, options);
        }
export type GetDefinitionQueryHookResult = ReturnType<typeof useGetDefinitionQuery>;
export type GetDefinitionLazyQueryHookResult = ReturnType<typeof useGetDefinitionLazyQuery>;
export type GetDefinitionQueryResult = Apollo.QueryResult<GetDefinitionQuery, GetDefinitionQueryVariables>;
export const ListDefinitionsDocument = gql`
    query ListDefinitions {
  definitions {
    ...ListDefinition
  }
}
    ${ListDefinitionFragmentDoc}`;

/**
 * __useListDefinitionsQuery__
 *
 * To run a query within a React component, call `useListDefinitionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListDefinitionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListDefinitionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useListDefinitionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListDefinitionsQuery, ListDefinitionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListDefinitionsQuery, ListDefinitionsQueryVariables>(ListDefinitionsDocument, options);
      }
export function useListDefinitionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListDefinitionsQuery, ListDefinitionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListDefinitionsQuery, ListDefinitionsQueryVariables>(ListDefinitionsDocument, options);
        }
export type ListDefinitionsQueryHookResult = ReturnType<typeof useListDefinitionsQuery>;
export type ListDefinitionsLazyQueryHookResult = ReturnType<typeof useListDefinitionsLazyQuery>;
export type ListDefinitionsQueryResult = Apollo.QueryResult<ListDefinitionsQuery, ListDefinitionsQueryVariables>;
export const PrimaryDefinitionsDocument = gql`
    query PrimaryDefinitions($pagination: OffsetPaginationInput, $identifier: String, $search: String, $ordering: [DefinitionOrder!]) {
  definitions(
    ordering: $ordering
    pagination: $pagination
    filters: {demands: [{kind: ARGS, matches: [{at: 0, kind: STRUCTURE, identifier: $identifier}]}], search: $search}
  ) {
    ...ListDefinition
  }
}
    ${ListDefinitionFragmentDoc}`;

/**
 * __usePrimaryDefinitionsQuery__
 *
 * To run a query within a React component, call `usePrimaryDefinitionsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePrimaryDefinitionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePrimaryDefinitionsQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      identifier: // value for 'identifier'
 *      search: // value for 'search'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function usePrimaryDefinitionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<PrimaryDefinitionsQuery, PrimaryDefinitionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PrimaryDefinitionsQuery, PrimaryDefinitionsQueryVariables>(PrimaryDefinitionsDocument, options);
      }
export function usePrimaryDefinitionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PrimaryDefinitionsQuery, PrimaryDefinitionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PrimaryDefinitionsQuery, PrimaryDefinitionsQueryVariables>(PrimaryDefinitionsDocument, options);
        }
export type PrimaryDefinitionsQueryHookResult = ReturnType<typeof usePrimaryDefinitionsQuery>;
export type PrimaryDefinitionsLazyQueryHookResult = ReturnType<typeof usePrimaryDefinitionsLazyQuery>;
export type PrimaryDefinitionsQueryResult = Apollo.QueryResult<PrimaryDefinitionsQuery, PrimaryDefinitionsQueryVariables>;
export const AllPrimaryDefinitionsDocument = gql`
    query AllPrimaryDefinitions($pagination: OffsetPaginationInput, $filters: DefinitionFilter, $ordering: [DefinitionOrder!]) {
  definitions(ordering: $ordering, pagination: $pagination, filters: $filters) {
    ...ListDefinition
  }
}
    ${ListDefinitionFragmentDoc}`;

/**
 * __useAllPrimaryDefinitionsQuery__
 *
 * To run a query within a React component, call `useAllPrimaryDefinitionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAllPrimaryDefinitionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAllPrimaryDefinitionsQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useAllPrimaryDefinitionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<AllPrimaryDefinitionsQuery, AllPrimaryDefinitionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AllPrimaryDefinitionsQuery, AllPrimaryDefinitionsQueryVariables>(AllPrimaryDefinitionsDocument, options);
      }
export function useAllPrimaryDefinitionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AllPrimaryDefinitionsQuery, AllPrimaryDefinitionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AllPrimaryDefinitionsQuery, AllPrimaryDefinitionsQueryVariables>(AllPrimaryDefinitionsDocument, options);
        }
export type AllPrimaryDefinitionsQueryHookResult = ReturnType<typeof useAllPrimaryDefinitionsQuery>;
export type AllPrimaryDefinitionsLazyQueryHookResult = ReturnType<typeof useAllPrimaryDefinitionsLazyQuery>;
export type AllPrimaryDefinitionsQueryResult = Apollo.QueryResult<AllPrimaryDefinitionsQuery, AllPrimaryDefinitionsQueryVariables>;
export const SmartDefinitionsDocument = gql`
    query SmartDefinitions($pagination: OffsetPaginationInput, $filters: DefinitionFilter, $ordering: [DefinitionOrder!]) {
  definitions(ordering: $ordering, pagination: $pagination, filters: $filters) {
    ...SmartDefinition
  }
}
    ${SmartDefinitionFragmentDoc}`;

/**
 * __useSmartDefinitionsQuery__
 *
 * To run a query within a React component, call `useSmartDefinitionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSmartDefinitionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSmartDefinitionsQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useSmartDefinitionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SmartDefinitionsQuery, SmartDefinitionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SmartDefinitionsQuery, SmartDefinitionsQueryVariables>(SmartDefinitionsDocument, options);
      }
export function useSmartDefinitionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SmartDefinitionsQuery, SmartDefinitionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SmartDefinitionsQuery, SmartDefinitionsQueryVariables>(SmartDefinitionsDocument, options);
        }
export type SmartDefinitionsQueryHookResult = ReturnType<typeof useSmartDefinitionsQuery>;
export type SmartDefinitionsLazyQueryHookResult = ReturnType<typeof useSmartDefinitionsLazyQuery>;
export type SmartDefinitionsQueryResult = Apollo.QueryResult<SmartDefinitionsQuery, SmartDefinitionsQueryVariables>;
export const DefinitionReleaseDocument = gql`
    query DefinitionRelease($id: ID!) {
  definition(id: $id) {
    id
    flavours {
      id
      release {
        id
        version
      }
    }
  }
}
    `;

/**
 * __useDefinitionReleaseQuery__
 *
 * To run a query within a React component, call `useDefinitionReleaseQuery` and pass it any options that fit your needs.
 * When your component renders, `useDefinitionReleaseQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDefinitionReleaseQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDefinitionReleaseQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DefinitionReleaseQuery, DefinitionReleaseQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DefinitionReleaseQuery, DefinitionReleaseQueryVariables>(DefinitionReleaseDocument, options);
      }
export function useDefinitionReleaseLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DefinitionReleaseQuery, DefinitionReleaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DefinitionReleaseQuery, DefinitionReleaseQueryVariables>(DefinitionReleaseDocument, options);
        }
export type DefinitionReleaseQueryHookResult = ReturnType<typeof useDefinitionReleaseQuery>;
export type DefinitionReleaseLazyQueryHookResult = ReturnType<typeof useDefinitionReleaseLazyQuery>;
export type DefinitionReleaseQueryResult = Apollo.QueryResult<DefinitionReleaseQuery, DefinitionReleaseQueryVariables>;
export const ListDeploymentsDocument = gql`
    query ListDeployments($filters: DeploymentFilter, $pagination: OffsetPaginationInput) {
  deployments(filters: $filters, pagination: $pagination) {
    ...ListDeployment
  }
}
    ${ListDeploymentFragmentDoc}`;

/**
 * __useListDeploymentsQuery__
 *
 * To run a query within a React component, call `useListDeploymentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListDeploymentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListDeploymentsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListDeploymentsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListDeploymentsQuery, ListDeploymentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListDeploymentsQuery, ListDeploymentsQueryVariables>(ListDeploymentsDocument, options);
      }
export function useListDeploymentsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListDeploymentsQuery, ListDeploymentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListDeploymentsQuery, ListDeploymentsQueryVariables>(ListDeploymentsDocument, options);
        }
export type ListDeploymentsQueryHookResult = ReturnType<typeof useListDeploymentsQuery>;
export type ListDeploymentsLazyQueryHookResult = ReturnType<typeof useListDeploymentsLazyQuery>;
export type ListDeploymentsQueryResult = Apollo.QueryResult<ListDeploymentsQuery, ListDeploymentsQueryVariables>;
export const GetDeploymentDocument = gql`
    query GetDeployment($id: ID!) {
  deployment(id: $id) {
    ...Deployment
  }
}
    ${DeploymentFragmentDoc}`;

/**
 * __useGetDeploymentQuery__
 *
 * To run a query within a React component, call `useGetDeploymentQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDeploymentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDeploymentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetDeploymentQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetDeploymentQuery, GetDeploymentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetDeploymentQuery, GetDeploymentQueryVariables>(GetDeploymentDocument, options);
      }
export function useGetDeploymentLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetDeploymentQuery, GetDeploymentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetDeploymentQuery, GetDeploymentQueryVariables>(GetDeploymentDocument, options);
        }
export type GetDeploymentQueryHookResult = ReturnType<typeof useGetDeploymentQuery>;
export type GetDeploymentLazyQueryHookResult = ReturnType<typeof useGetDeploymentLazyQuery>;
export type GetDeploymentQueryResult = Apollo.QueryResult<GetDeploymentQuery, GetDeploymentQueryVariables>;
export const ListFlavoursDocument = gql`
    query ListFlavours {
  flavours {
    ...ListFlavour
  }
}
    ${ListFlavourFragmentDoc}`;

/**
 * __useListFlavoursQuery__
 *
 * To run a query within a React component, call `useListFlavoursQuery` and pass it any options that fit your needs.
 * When your component renders, `useListFlavoursQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListFlavoursQuery({
 *   variables: {
 *   },
 * });
 */
export function useListFlavoursQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListFlavoursQuery, ListFlavoursQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListFlavoursQuery, ListFlavoursQueryVariables>(ListFlavoursDocument, options);
      }
export function useListFlavoursLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListFlavoursQuery, ListFlavoursQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListFlavoursQuery, ListFlavoursQueryVariables>(ListFlavoursDocument, options);
        }
export type ListFlavoursQueryHookResult = ReturnType<typeof useListFlavoursQuery>;
export type ListFlavoursLazyQueryHookResult = ReturnType<typeof useListFlavoursLazyQuery>;
export type ListFlavoursQueryResult = Apollo.QueryResult<ListFlavoursQuery, ListFlavoursQueryVariables>;
export const GetFlavourDocument = gql`
    query GetFlavour($id: ID!) {
  flavour(id: $id) {
    ...Flavour
  }
}
    ${FlavourFragmentDoc}`;

/**
 * __useGetFlavourQuery__
 *
 * To run a query within a React component, call `useGetFlavourQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFlavourQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFlavourQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetFlavourQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetFlavourQuery, GetFlavourQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetFlavourQuery, GetFlavourQueryVariables>(GetFlavourDocument, options);
      }
export function useGetFlavourLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetFlavourQuery, GetFlavourQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetFlavourQuery, GetFlavourQueryVariables>(GetFlavourDocument, options);
        }
export type GetFlavourQueryHookResult = ReturnType<typeof useGetFlavourQuery>;
export type GetFlavourLazyQueryHookResult = ReturnType<typeof useGetFlavourLazyQuery>;
export type GetFlavourQueryResult = Apollo.QueryResult<GetFlavourQuery, GetFlavourQueryVariables>;
export const HomePageDocument = gql`
    query HomePage {
  repos: githubRepos {
    ...ListRepo
  }
}
    ${ListRepoFragmentDoc}`;

/**
 * __useHomePageQuery__
 *
 * To run a query within a React component, call `useHomePageQuery` and pass it any options that fit your needs.
 * When your component renders, `useHomePageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHomePageQuery({
 *   variables: {
 *   },
 * });
 */
export function useHomePageQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<HomePageQuery, HomePageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<HomePageQuery, HomePageQueryVariables>(HomePageDocument, options);
      }
export function useHomePageLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<HomePageQuery, HomePageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<HomePageQuery, HomePageQueryVariables>(HomePageDocument, options);
        }
export type HomePageQueryHookResult = ReturnType<typeof useHomePageQuery>;
export type HomePageLazyQueryHookResult = ReturnType<typeof useHomePageLazyQuery>;
export type HomePageQueryResult = Apollo.QueryResult<HomePageQuery, HomePageQueryVariables>;
export const HomePageStatsDocument = gql`
    query HomePageStats {
  githubRepoStats {
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
export const ListPodDocument = gql`
    query ListPod {
  pods {
    ...ListPod
  }
}
    ${ListPodFragmentDoc}`;

/**
 * __useListPodQuery__
 *
 * To run a query within a React component, call `useListPodQuery` and pass it any options that fit your needs.
 * When your component renders, `useListPodQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListPodQuery({
 *   variables: {
 *   },
 * });
 */
export function useListPodQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListPodQuery, ListPodQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListPodQuery, ListPodQueryVariables>(ListPodDocument, options);
      }
export function useListPodLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListPodQuery, ListPodQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListPodQuery, ListPodQueryVariables>(ListPodDocument, options);
        }
export type ListPodQueryHookResult = ReturnType<typeof useListPodQuery>;
export type ListPodLazyQueryHookResult = ReturnType<typeof useListPodLazyQuery>;
export type ListPodQueryResult = Apollo.QueryResult<ListPodQuery, ListPodQueryVariables>;
export const GetPodDocument = gql`
    query GetPod($id: ID!) {
  pod(id: $id) {
    ...Pod
  }
}
    ${PodFragmentDoc}`;

/**
 * __useGetPodQuery__
 *
 * To run a query within a React component, call `useGetPodQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPodQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPodQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetPodQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetPodQuery, GetPodQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetPodQuery, GetPodQueryVariables>(GetPodDocument, options);
      }
export function useGetPodLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetPodQuery, GetPodQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetPodQuery, GetPodQueryVariables>(GetPodDocument, options);
        }
export type GetPodQueryHookResult = ReturnType<typeof useGetPodQuery>;
export type GetPodLazyQueryHookResult = ReturnType<typeof useGetPodLazyQuery>;
export type GetPodQueryResult = Apollo.QueryResult<GetPodQuery, GetPodQueryVariables>;
export const GetPodForAgentDocument = gql`
    query GetPodForAgent($clientId: ID!) {
  podForAgent(clientId: $clientId) {
    ...Pod
  }
}
    ${PodFragmentDoc}`;

/**
 * __useGetPodForAgentQuery__
 *
 * To run a query within a React component, call `useGetPodForAgentQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPodForAgentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPodForAgentQuery({
 *   variables: {
 *      clientId: // value for 'clientId'
 *   },
 * });
 */
export function useGetPodForAgentQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetPodForAgentQuery, GetPodForAgentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetPodForAgentQuery, GetPodForAgentQueryVariables>(GetPodForAgentDocument, options);
      }
export function useGetPodForAgentLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetPodForAgentQuery, GetPodForAgentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetPodForAgentQuery, GetPodForAgentQueryVariables>(GetPodForAgentDocument, options);
        }
export type GetPodForAgentQueryHookResult = ReturnType<typeof useGetPodForAgentQuery>;
export type GetPodForAgentLazyQueryHookResult = ReturnType<typeof useGetPodForAgentLazyQuery>;
export type GetPodForAgentQueryResult = Apollo.QueryResult<GetPodForAgentQuery, GetPodForAgentQueryVariables>;
export const ListReleasesDocument = gql`
    query ListReleases {
  releases {
    ...ListRelease
  }
}
    ${ListReleaseFragmentDoc}`;

/**
 * __useListReleasesQuery__
 *
 * To run a query within a React component, call `useListReleasesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListReleasesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListReleasesQuery({
 *   variables: {
 *   },
 * });
 */
export function useListReleasesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListReleasesQuery, ListReleasesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListReleasesQuery, ListReleasesQueryVariables>(ListReleasesDocument, options);
      }
export function useListReleasesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListReleasesQuery, ListReleasesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListReleasesQuery, ListReleasesQueryVariables>(ListReleasesDocument, options);
        }
export type ListReleasesQueryHookResult = ReturnType<typeof useListReleasesQuery>;
export type ListReleasesLazyQueryHookResult = ReturnType<typeof useListReleasesLazyQuery>;
export type ListReleasesQueryResult = Apollo.QueryResult<ListReleasesQuery, ListReleasesQueryVariables>;
export const GetReleaseDocument = gql`
    query GetRelease($id: ID!) {
  release(id: $id) {
    ...Release
  }
}
    ${ReleaseFragmentDoc}`;

/**
 * __useGetReleaseQuery__
 *
 * To run a query within a React component, call `useGetReleaseQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetReleaseQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetReleaseQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetReleaseQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetReleaseQuery, GetReleaseQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetReleaseQuery, GetReleaseQueryVariables>(GetReleaseDocument, options);
      }
export function useGetReleaseLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetReleaseQuery, GetReleaseQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetReleaseQuery, GetReleaseQueryVariables>(GetReleaseDocument, options);
        }
export type GetReleaseQueryHookResult = ReturnType<typeof useGetReleaseQuery>;
export type GetReleaseLazyQueryHookResult = ReturnType<typeof useGetReleaseLazyQuery>;
export type GetReleaseQueryResult = Apollo.QueryResult<GetReleaseQuery, GetReleaseQueryVariables>;
export const RepoBloksDocument = gql`
    query RepoBloks($filters: RepoBlokFilter, $pagination: OffsetPaginationInput) {
  repoBloks(filters: $filters, pagination: $pagination) {
    ...StoreRepoBlok
  }
}
    ${StoreRepoBlokFragmentDoc}`;

/**
 * __useRepoBloksQuery__
 *
 * To run a query within a React component, call `useRepoBloksQuery` and pass it any options that fit your needs.
 * When your component renders, `useRepoBloksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRepoBloksQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useRepoBloksQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<RepoBloksQuery, RepoBloksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RepoBloksQuery, RepoBloksQueryVariables>(RepoBloksDocument, options);
      }
export function useRepoBloksLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RepoBloksQuery, RepoBloksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RepoBloksQuery, RepoBloksQueryVariables>(RepoBloksDocument, options);
        }
export type RepoBloksQueryHookResult = ReturnType<typeof useRepoBloksQuery>;
export type RepoBloksLazyQueryHookResult = ReturnType<typeof useRepoBloksLazyQuery>;
export type RepoBloksQueryResult = Apollo.QueryResult<RepoBloksQuery, RepoBloksQueryVariables>;
export const RepoBlokTreeDocument = gql`
    query RepoBlokTree($id: ID!) {
  repoBlok(id: $id) {
    id
    hash
    componentTree
    vocab
    catalogs
    module
    locals
    demo
    queries
    subscriptions
  }
}
    `;

/**
 * __useRepoBlokTreeQuery__
 *
 * To run a query within a React component, call `useRepoBlokTreeQuery` and pass it any options that fit your needs.
 * When your component renders, `useRepoBlokTreeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRepoBlokTreeQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRepoBlokTreeQuery(baseOptions: ApolloReactHooks.QueryHookOptions<RepoBlokTreeQuery, RepoBlokTreeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RepoBlokTreeQuery, RepoBlokTreeQueryVariables>(RepoBlokTreeDocument, options);
      }
export function useRepoBlokTreeLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RepoBlokTreeQuery, RepoBlokTreeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RepoBlokTreeQuery, RepoBlokTreeQueryVariables>(RepoBlokTreeDocument, options);
        }
export type RepoBlokTreeQueryHookResult = ReturnType<typeof useRepoBlokTreeQuery>;
export type RepoBlokTreeLazyQueryHookResult = ReturnType<typeof useRepoBlokTreeLazyQuery>;
export type RepoBlokTreeQueryResult = Apollo.QueryResult<RepoBlokTreeQuery, RepoBlokTreeQueryVariables>;
export const RepoBlokInstallDocument = gql`
    query RepoBlokInstall($id: ID!) {
  repoBlok(id: $id) {
    id
    name
    hash
    origin
    installInput
  }
}
    `;

/**
 * __useRepoBlokInstallQuery__
 *
 * To run a query within a React component, call `useRepoBlokInstallQuery` and pass it any options that fit your needs.
 * When your component renders, `useRepoBlokInstallQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRepoBlokInstallQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRepoBlokInstallQuery(baseOptions: ApolloReactHooks.QueryHookOptions<RepoBlokInstallQuery, RepoBlokInstallQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<RepoBlokInstallQuery, RepoBlokInstallQueryVariables>(RepoBlokInstallDocument, options);
      }
export function useRepoBlokInstallLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<RepoBlokInstallQuery, RepoBlokInstallQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<RepoBlokInstallQuery, RepoBlokInstallQueryVariables>(RepoBlokInstallDocument, options);
        }
export type RepoBlokInstallQueryHookResult = ReturnType<typeof useRepoBlokInstallQuery>;
export type RepoBlokInstallLazyQueryHookResult = ReturnType<typeof useRepoBlokInstallLazyQuery>;
export type RepoBlokInstallQueryResult = Apollo.QueryResult<RepoBlokInstallQuery, RepoBlokInstallQueryVariables>;
export const GetRepoDocument = gql`
    query GetRepo($id: ID!) {
  repo: githubRepo(id: $id) {
    ...Repo
  }
}
    ${RepoFragmentDoc}`;

/**
 * __useGetRepoQuery__
 *
 * To run a query within a React component, call `useGetRepoQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRepoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRepoQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetRepoQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetRepoQuery, GetRepoQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetRepoQuery, GetRepoQueryVariables>(GetRepoDocument, options);
      }
export function useGetRepoLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetRepoQuery, GetRepoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetRepoQuery, GetRepoQueryVariables>(GetRepoDocument, options);
        }
export type GetRepoQueryHookResult = ReturnType<typeof useGetRepoQuery>;
export type GetRepoLazyQueryHookResult = ReturnType<typeof useGetRepoLazyQuery>;
export type GetRepoQueryResult = Apollo.QueryResult<GetRepoQuery, GetRepoQueryVariables>;
export const ListReposDocument = gql`
    query ListRepos($filters: GithubRepoFilter, $pagination: OffsetPaginationInput) {
  repos: githubRepos(filters: $filters, pagination: $pagination) {
    ...ListRepo
  }
}
    ${ListRepoFragmentDoc}`;

/**
 * __useListReposQuery__
 *
 * To run a query within a React component, call `useListReposQuery` and pass it any options that fit your needs.
 * When your component renders, `useListReposQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListReposQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListReposQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListReposQuery, ListReposQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListReposQuery, ListReposQueryVariables>(ListReposDocument, options);
      }
export function useListReposLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListReposQuery, ListReposQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListReposQuery, ListReposQueryVariables>(ListReposDocument, options);
        }
export type ListReposQueryHookResult = ReturnType<typeof useListReposQuery>;
export type ListReposLazyQueryHookResult = ReturnType<typeof useListReposLazyQuery>;
export type ListReposQueryResult = Apollo.QueryResult<ListReposQuery, ListReposQueryVariables>;
export const ListResourcesDocument = gql`
    query ListResources {
  resources {
    ...ListResource
  }
}
    ${ListResourceFragmentDoc}`;

/**
 * __useListResourcesQuery__
 *
 * To run a query within a React component, call `useListResourcesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListResourcesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListResourcesQuery({
 *   variables: {
 *   },
 * });
 */
export function useListResourcesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListResourcesQuery, ListResourcesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListResourcesQuery, ListResourcesQueryVariables>(ListResourcesDocument, options);
      }
export function useListResourcesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListResourcesQuery, ListResourcesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListResourcesQuery, ListResourcesQueryVariables>(ListResourcesDocument, options);
        }
export type ListResourcesQueryHookResult = ReturnType<typeof useListResourcesQuery>;
export type ListResourcesLazyQueryHookResult = ReturnType<typeof useListResourcesLazyQuery>;
export type ListResourcesQueryResult = Apollo.QueryResult<ListResourcesQuery, ListResourcesQueryVariables>;
export const GetResourceDocument = gql`
    query GetResource($id: ID!) {
  resource(id: $id) {
    ...Resource
  }
}
    ${ResourceFragmentDoc}`;

/**
 * __useGetResourceQuery__
 *
 * To run a query within a React component, call `useGetResourceQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetResourceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetResourceQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetResourceQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetResourceQuery, GetResourceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetResourceQuery, GetResourceQueryVariables>(GetResourceDocument, options);
      }
export function useGetResourceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetResourceQuery, GetResourceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetResourceQuery, GetResourceQueryVariables>(GetResourceDocument, options);
        }
export type GetResourceQueryHookResult = ReturnType<typeof useGetResourceQuery>;
export type GetResourceLazyQueryHookResult = ReturnType<typeof useGetResourceLazyQuery>;
export type GetResourceQueryResult = Apollo.QueryResult<GetResourceQuery, GetResourceQueryVariables>;
export const GlobalSearchDocument = gql`
    query GlobalSearch($search: String, $pagination: OffsetPaginationInput) {
  definitions: definitions(filters: {search: $search}, pagination: $pagination) {
    ...ListDefinition
  }
  flavours: flavours(filters: {search: $search}, pagination: $pagination) {
    ...ListFlavour
  }
}
    ${ListDefinitionFragmentDoc}
${ListFlavourFragmentDoc}`;

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
export const AppStoreDocument = gql`
    query AppStore($pagination: OffsetPaginationInput) {
  releases(ordering: [{releasedAt: DESC}], pagination: $pagination) {
    ...StoreRelease
  }
}
    ${StoreReleaseFragmentDoc}`;

/**
 * __useAppStoreQuery__
 *
 * To run a query within a React component, call `useAppStoreQuery` and pass it any options that fit your needs.
 * When your component renders, `useAppStoreQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAppStoreQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useAppStoreQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<AppStoreQuery, AppStoreQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<AppStoreQuery, AppStoreQueryVariables>(AppStoreDocument, options);
      }
export function useAppStoreLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<AppStoreQuery, AppStoreQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<AppStoreQuery, AppStoreQueryVariables>(AppStoreDocument, options);
        }
export type AppStoreQueryHookResult = ReturnType<typeof useAppStoreQuery>;
export type AppStoreLazyQueryHookResult = ReturnType<typeof useAppStoreLazyQuery>;
export type AppStoreQueryResult = Apollo.QueryResult<AppStoreQuery, AppStoreQueryVariables>;