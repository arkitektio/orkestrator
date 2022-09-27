import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Any: any;
  DateTime: any;
  EventValue: any;
  GenericScalar: any;
  ImageFile: any;
};

export type ArgNode = FlowNode & FlowNodeCommons & {
  __typename?: 'ArgNode';
  constants?: Maybe<Scalars['GenericScalar']>;
  constream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  documentation?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  instream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  outstream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  position: Position;
  typename: Scalars['String'];
};

export type ArgPort = {
  __typename?: 'ArgPort';
  child?: Maybe<ArgPortChild>;
  default?: Maybe<Scalars['Any']>;
  description?: Maybe<Scalars['String']>;
  identifier?: Maybe<Scalars['String']>;
  key: Scalars['String'];
  kind: StreamKind;
  label?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  /** The key of the arg */
  nullable: Scalars['Boolean'];
  widget?: Maybe<Widget>;
};

export type ArgPortChild = {
  __typename?: 'ArgPortChild';
  child?: Maybe<ArgPortChild>;
  identifier?: Maybe<Scalars['String']>;
  kind: StreamKind;
  nullable?: Maybe<Scalars['Boolean']>;
};

export type ArgPortInput = {
  /** The child of this argument */
  child?: InputMaybe<ChildPortInput>;
  /** The key of the arg */
  default?: InputMaybe<Scalars['Any']>;
  /** The description of this argument */
  description?: InputMaybe<Scalars['String']>;
  /** The identifier */
  identifier?: InputMaybe<Scalars['String']>;
  /** The key of the arg */
  key: Scalars['String'];
  /** The type of this argument */
  kind: StreamKind;
  /** The name of this argument */
  label?: InputMaybe<Scalars['String']>;
  /** The name of this argument */
  name?: InputMaybe<Scalars['String']>;
  /** Is this argument nullable */
  nullable: Scalars['Boolean'];
  /** The child of this argument */
  widget?: InputMaybe<WidgetInput>;
};

export type ArkitektNode = FlowNode & FlowNodeCommons & {
  __typename?: 'ArkitektNode';
  constants?: Maybe<Scalars['GenericScalar']>;
  constream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  defaults?: Maybe<Scalars['GenericScalar']>;
  description?: Maybe<Scalars['String']>;
  documentation?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  instream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  interface?: Maybe<Scalars['String']>;
  kind: Scalars['String'];
  name?: Maybe<Scalars['String']>;
  outstream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  package?: Maybe<Scalars['String']>;
  position: Position;
  typename: Scalars['String'];
};

export type ChildPortInput = {
  child?: InputMaybe<ChildPortInput>;
  /** The identifier */
  identifier?: InputMaybe<Scalars['String']>;
  /** The type of this argument */
  kind: StreamKind;
  nullable?: InputMaybe<Scalars['Boolean']>;
};

export type Choice = {
  __typename?: 'Choice';
  label: Scalars['String'];
  value: Scalars['Any'];
};

export type ChoiceInput = {
  label: Scalars['String'];
  value: Scalars['Any'];
};

export type DeleteFlowReturn = {
  __typename?: 'DeleteFlowReturn';
  id?: Maybe<Scalars['ID']>;
};

export type DeleteRunReturn = {
  __typename?: 'DeleteRunReturn';
  id: Scalars['ID'];
};

export type DeleteSnapshotReturn = {
  __typename?: 'DeleteSnapshotReturn';
  id: Scalars['ID'];
};

export type DeleteWorkspaceReturn = {
  __typename?: 'DeleteWorkspaceReturn';
  id?: Maybe<Scalars['ID']>;
};

export type Diagram = {
  __typename?: 'Diagram';
  creator?: Maybe<User>;
  flows: Array<Flow>;
  id: Scalars['ID'];
  /** The latest flow */
  latestFlow?: Maybe<Flow>;
  name?: Maybe<Scalars['String']>;
};

export type EdgeInput = {
  id: Scalars['String'];
  source: Scalars['String'];
  sourceHandle: Scalars['String'];
  stream?: InputMaybe<Array<InputMaybe<StreamItemInput>>>;
  target: Scalars['String'];
  targetHandle: Scalars['String'];
  typename: Scalars['String'];
};

export type Event = {
  __typename?: 'Event';
  create?: Maybe<RunEvent>;
  deleted?: Maybe<Scalars['ID']>;
  update?: Maybe<RunEvent>;
};

/** Variety expresses the Type of Representation we are dealing with */
export enum EventTypeInput {
  /** COMPLETE (First three channel represent RGB) */
  Complete = 'COMPLETE',
  /** Error (Value represent Intensity) */
  Error = 'ERROR',
  /** NEXT (Value represent Labels) */
  Next = 'NEXT',
  /** UNKNOWN (Value represent Intensity) */
  Unknown = 'UNKNOWN'
}

export type FancyEdge = FlowEdge & FlowEdgeCommons & {
  __typename?: 'FancyEdge';
  id: Scalars['String'];
  source: Scalars['String'];
  sourceHandle: Scalars['String'];
  stream: Array<Maybe<StreamItem>>;
  target: Scalars['String'];
  targetHandle: Scalars['String'];
  typename: Scalars['String'];
};

export type Flow = {
  __typename?: 'Flow';
  /** Is this a brittle flow? aka. should the flow fail on any exception? */
  brittle: Scalars['Boolean'];
  createdAt: Scalars['DateTime'];
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']>;
  diagram?: Maybe<Diagram>;
  edges?: Maybe<Scalars['GenericScalar']>;
  graph: FlowGraph;
  hash: Scalars['String'];
  id: Scalars['ID'];
  name: Scalars['String'];
  nodes?: Maybe<Scalars['GenericScalar']>;
  position?: Maybe<Array<Maybe<Scalars['Int']>>>;
  runs: Array<Run>;
  screenshot?: Maybe<Scalars['String']>;
  version: Scalars['String'];
  zoom?: Maybe<Scalars['Float']>;
};

export type FlowEdge = {
  id: Scalars['String'];
  source: Scalars['String'];
  sourceHandle: Scalars['String'];
  target: Scalars['String'];
  targetHandle: Scalars['String'];
  typename: Scalars['String'];
};

export type FlowEdgeCommons = {
  stream: Array<Maybe<StreamItem>>;
};

export type FlowGraph = {
  __typename?: 'FlowGraph';
  args: Array<Maybe<ArgPort>>;
  edges: Array<Maybe<FlowEdge>>;
  globals: Array<Maybe<Global>>;
  nodes: Array<Maybe<FlowNode>>;
  position?: Maybe<Array<Maybe<Scalars['Int']>>>;
  returns: Array<Maybe<ReturnPort>>;
  zoom?: Maybe<Scalars['Float']>;
};

export type FlowNode = {
  id: Scalars['String'];
  position: Position;
  typename: Scalars['String'];
};

export type FlowNodeCommons = {
  constants?: Maybe<Scalars['GenericScalar']>;
  constream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  documentation?: Maybe<Scalars['String']>;
  instream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  outstream: Array<Maybe<Array<Maybe<StreamItem>>>>;
};

export type Global = {
  __typename?: 'Global';
  identifier?: Maybe<Scalars['String']>;
  key: Scalars['String'];
  locked?: Maybe<Scalars['Boolean']>;
  mapped?: Maybe<Array<Maybe<Scalars['String']>>>;
  typename: Scalars['String'];
  value?: Maybe<Scalars['GenericScalar']>;
  widget?: Maybe<Scalars['GenericScalar']>;
};

export type GlobalInput = {
  key: Scalars['String'];
  value?: InputMaybe<Scalars['GenericScalar']>;
};

export type GraphInput = {
  args: Array<InputMaybe<ArgPortInput>>;
  edges: Array<InputMaybe<EdgeInput>>;
  globals: Array<InputMaybe<GlobalInput>>;
  nodes: Array<InputMaybe<NodeInput>>;
  returns: Array<InputMaybe<ReturnPortInput>>;
  zoom?: InputMaybe<Scalars['Float']>;
};

export type KwargNode = FlowNode & FlowNodeCommons & {
  __typename?: 'KwargNode';
  constants?: Maybe<Scalars['GenericScalar']>;
  constream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  documentation?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  instream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  outstream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  position: Position;
  typename: Scalars['String'];
};

export type LabeledEdge = FlowEdge & FlowEdgeCommons & {
  __typename?: 'LabeledEdge';
  id: Scalars['String'];
  source: Scalars['String'];
  sourceHandle: Scalars['String'];
  stream: Array<Maybe<StreamItem>>;
  target: Scalars['String'];
  targetHandle: Scalars['String'];
  typename: Scalars['String'];
};

/** The root Mutation */
export type Mutation = {
  __typename?: 'Mutation';
  alog?: Maybe<RunLog>;
  deleteFlow?: Maybe<DeleteFlowReturn>;
  deleteRun?: Maybe<DeleteRunReturn>;
  deleteSnapshot?: Maybe<DeleteSnapshotReturn>;
  deleteWorkspace?: Maybe<DeleteWorkspaceReturn>;
  drawvanilla?: Maybe<Diagram>;
  snapshot?: Maybe<Snapshot>;
  start?: Maybe<Run>;
  track?: Maybe<RunEvent>;
  updatediagram?: Maybe<Diagram>;
};


/** The root Mutation */
export type MutationAlogArgs = {
  message: Scalars['String'];
  run: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteFlowArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteRunArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteSnapshotArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteWorkspaceArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDrawvanillaArgs = {
  brittle?: InputMaybe<Scalars['Boolean']>;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationSnapshotArgs = {
  events: Array<InputMaybe<Scalars['ID']>>;
  run: Scalars['ID'];
  t: Scalars['Int'];
};


/** The root Mutation */
export type MutationStartArgs = {
  assignation: Scalars['ID'];
  flow: Scalars['ID'];
};


/** The root Mutation */
export type MutationTrackArgs = {
  handle: Scalars['String'];
  run: Scalars['ID'];
  source: Scalars['String'];
  t: Scalars['Int'];
  type: EventTypeInput;
  value?: InputMaybe<Scalars['EventValue']>;
};


/** The root Mutation */
export type MutationUpdatediagramArgs = {
  brittle?: InputMaybe<Scalars['Boolean']>;
  graph?: InputMaybe<GraphInput>;
  id: Scalars['ID'];
  screenshot?: InputMaybe<Scalars['ImageFile']>;
};

export type NodeInput = {
  constream: Array<InputMaybe<Array<InputMaybe<StreamItemInput>>>>;
  defaults?: InputMaybe<Scalars['GenericScalar']>;
  description?: InputMaybe<Scalars['String']>;
  documentation?: InputMaybe<Scalars['String']>;
  extra?: InputMaybe<Scalars['GenericScalar']>;
  id: Scalars['String'];
  implementation?: InputMaybe<ReactiveImplementationModelInput>;
  instream: Array<InputMaybe<Array<InputMaybe<StreamItemInput>>>>;
  interface?: InputMaybe<Scalars['String']>;
  kind?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  outstream: Array<InputMaybe<Array<InputMaybe<StreamItemInput>>>>;
  package?: InputMaybe<Scalars['String']>;
  position: PositionInput;
  typename: Scalars['String'];
};

export type Position = {
  __typename?: 'Position';
  x: Scalars['Int'];
  y: Scalars['Int'];
};

export type PositionInput = {
  x: Scalars['Float'];
  y: Scalars['Float'];
};

/** The root Query */
export type Query = {
  __typename?: 'Query';
  diagram?: Maybe<Diagram>;
  diagrams?: Maybe<Array<Maybe<Diagram>>>;
  eventsBetween?: Maybe<Array<Maybe<RunEvent>>>;
  flow?: Maybe<Flow>;
  flows?: Maybe<Array<Maybe<Flow>>>;
  hello?: Maybe<Scalars['String']>;
  mydiagrams?: Maybe<Array<Maybe<Diagram>>>;
  reactivetemplate?: Maybe<ReactiveTemplate>;
  reactivetemplates?: Maybe<Array<Maybe<ReactiveTemplate>>>;
  run?: Maybe<Run>;
  runLogs?: Maybe<Array<Maybe<RunLog>>>;
  runs?: Maybe<Array<Maybe<Run>>>;
  snapshot?: Maybe<Snapshot>;
  snapshots?: Maybe<Array<Maybe<Snapshot>>>;
  void?: Maybe<Scalars['String']>;
};


/** The root Query */
export type QueryDiagramArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryDiagramsArgs = {
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryEventsBetweenArgs = {
  max?: InputMaybe<Scalars['Int']>;
  min?: InputMaybe<Scalars['Int']>;
  run: Scalars['ID'];
};


/** The root Query */
export type QueryFlowArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryFlowsArgs = {
  diagram?: InputMaybe<Scalars['ID']>;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryReactivetemplateArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryReactivetemplatesArgs = {
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryRunArgs = {
  assignation?: InputMaybe<Scalars['ID']>;
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryRunLogsArgs = {
  run?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryRunsArgs = {
  flow?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QuerySnapshotArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QuerySnapshotsArgs = {
  run?: InputMaybe<Scalars['ID']>;
};

/** An enumeration. */
export enum ReactiveImplementationModelInput {
  /** BUFFER_COMPLETE (Buffer values until complete is retrieved) */
  BufferComplete = 'BUFFER_COMPLETE',
  /** BUFFER_UNTIL (Buffer values until signal is send) */
  BufferUntil = 'BUFFER_UNTIL',
  /** CHUNK (Chunk the data) */
  Chunk = 'CHUNK',
  /** COMBINELATEST (Combine values with latest value from each stream) */
  Combinelatest = 'COMBINELATEST',
  /** OMIT (Omit the data) */
  Omit = 'OMIT',
  /** SPLIT (Split the data) */
  Split = 'SPLIT',
  /** TO_LIST (Convert to list) */
  ToList = 'TO_LIST',
  /** WITHLATEST (Combine a leading value with the latest value) */
  Withlatest = 'WITHLATEST',
  /** ZIP (Zip the data) */
  Zip = 'ZIP'
}

export type ReactiveNode = FlowNode & FlowNodeCommons & {
  __typename?: 'ReactiveNode';
  constants?: Maybe<Scalars['GenericScalar']>;
  constream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  documentation?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  implementation: ReactiveImplementationModelInput;
  instream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  outstream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  position: Position;
  typename: Scalars['String'];
};

export type ReactiveTemplate = {
  __typename?: 'ReactiveTemplate';
  constream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  defaults?: Maybe<Scalars['GenericScalar']>;
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  implementation: ReactiveImplementationModelInput;
  instream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  name: Scalars['String'];
  outstream: Array<Maybe<Array<Maybe<StreamItem>>>>;
};

export type ReturnNode = FlowNode & FlowNodeCommons & {
  __typename?: 'ReturnNode';
  constants?: Maybe<Scalars['GenericScalar']>;
  constream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  documentation?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  instream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  outstream: Array<Maybe<Array<Maybe<StreamItem>>>>;
  position: Position;
  typename: Scalars['String'];
};

export type ReturnPort = {
  __typename?: 'ReturnPort';
  child?: Maybe<ReturnPortChild>;
  description?: Maybe<Scalars['String']>;
  identifier?: Maybe<Scalars['String']>;
  key: Scalars['String'];
  kind: StreamKind;
  label?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  /** The key of the arg */
  nullable: Scalars['Boolean'];
  widget?: Maybe<ReturnWidget>;
};

export type ReturnPortChild = {
  __typename?: 'ReturnPortChild';
  child?: Maybe<ArgPortChild>;
  identifier?: Maybe<Scalars['String']>;
  kind: StreamKind;
  nullable?: Maybe<Scalars['Boolean']>;
};

export type ReturnPortInput = {
  /** The child of this argument */
  child?: InputMaybe<ChildPortInput>;
  /** The description of this argument */
  description?: InputMaybe<Scalars['String']>;
  /** The identifier */
  identifier?: InputMaybe<Scalars['String']>;
  /** The key of the arg */
  key: Scalars['String'];
  /** The type of this argument */
  kind: StreamKind;
  /** The name of this argument */
  label?: InputMaybe<Scalars['String']>;
  /** The name of this argument */
  name?: InputMaybe<Scalars['String']>;
  /** Is this argument nullable */
  nullable: Scalars['Boolean'];
  /** The child of this argument */
  widget?: InputMaybe<ReturnWidgetInput>;
};

export type ReturnWidget = {
  __typename?: 'ReturnWidget';
  /** Is this a paragraph */
  asParagraph?: Maybe<Scalars['Boolean']>;
  /** The dependencies of this port */
  choices?: Maybe<Array<Maybe<Choice>>>;
  /** The dependencies of this port */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** A hook for the app to call */
  hook?: Maybe<Scalars['String']>;
  /** type */
  kind: Scalars['String'];
  /** Max value for int widget */
  max?: Maybe<Scalars['Int']>;
  /** Max value for int widget */
  min?: Maybe<Scalars['Int']>;
  /** Placeholder for any widget */
  placeholder?: Maybe<Scalars['String']>;
  /** Do we have a possible */
  query?: Maybe<Scalars['String']>;
  /** A hook for the app to call */
  ward?: Maybe<Scalars['String']>;
};

export type ReturnWidgetInput = {
  /** A hook for the app to call */
  hook?: InputMaybe<Scalars['String']>;
  /** type */
  kind: Scalars['String'];
  /** Do we have a possible */
  query?: InputMaybe<Scalars['String']>;
  /** A ward for the app to call */
  ward?: InputMaybe<Scalars['String']>;
};

export type Run = {
  __typename?: 'Run';
  assignation?: Maybe<Scalars['String']>;
  createdAt: Scalars['DateTime'];
  events: Array<RunEvent>;
  flow?: Maybe<Flow>;
  id: Scalars['ID'];
  latestSnapshot?: Maybe<Snapshot>;
  logs: Array<RunLog>;
  snapshots: Array<Snapshot>;
  status?: Maybe<Scalars['String']>;
};

export type RunEvent = {
  __typename?: 'RunEvent';
  createdAt: Scalars['DateTime'];
  handle: Scalars['String'];
  id: Scalars['ID'];
  run?: Maybe<Run>;
  snapshot: Array<Snapshot>;
  source: Scalars['String'];
  t: Scalars['Int'];
  type: RunEventType;
  value?: Maybe<Scalars['EventValue']>;
};

/** An enumeration. */
export enum RunEventType {
  /** COMPLETE (First three channel represent RGB) */
  Complete = 'COMPLETE',
  /** Error (Value represent Intensity) */
  Error = 'ERROR',
  /** NEXT (Value represent Labels) */
  Next = 'NEXT',
  /** UNKNOWN (Value represent Intensity) */
  Unknown = 'UNKNOWN'
}

export type RunLog = {
  __typename?: 'RunLog';
  id: Scalars['ID'];
  log?: Maybe<Scalars['String']>;
  node: Scalars['String'];
  run?: Maybe<Run>;
};

export type Snapshot = {
  __typename?: 'Snapshot';
  createdAt: Scalars['DateTime'];
  events: Array<RunEvent>;
  id: Scalars['ID'];
  run?: Maybe<Run>;
  status?: Maybe<Scalars['String']>;
  t: Scalars['Int'];
};

export type StreamItem = {
  __typename?: 'StreamItem';
  child?: Maybe<StreamItemChild>;
  identifier?: Maybe<Scalars['String']>;
  key: Scalars['String'];
  kind: StreamKind;
  nullable: Scalars['Boolean'];
};

export type StreamItemChild = {
  __typename?: 'StreamItemChild';
  child?: Maybe<StreamItemChild>;
  identifier?: Maybe<Scalars['String']>;
  kind: StreamKind;
};

export type StreamItemChildInput = {
  child?: InputMaybe<StreamItemChildInput>;
  identifier?: InputMaybe<Scalars['String']>;
  kind: StreamKind;
};

export type StreamItemInput = {
  child?: InputMaybe<StreamItemChildInput>;
  identifier?: InputMaybe<Scalars['String']>;
  key: Scalars['String'];
  kind: StreamKind;
  nullable: Scalars['Boolean'];
};

export enum StreamKind {
  Bool = 'BOOL',
  Dict = 'DICT',
  Enum = 'ENUM',
  Int = 'INT',
  List = 'LIST',
  String = 'STRING',
  Structure = 'STRUCTURE',
  Unset = 'UNSET'
}

/** The root Subscriptions */
export type Subscription = {
  __typename?: 'Subscription';
  events?: Maybe<Event>;
};


/** The root Subscriptions */
export type SubscriptionEventsArgs = {
  id: Scalars['ID'];
};

export type User = {
  __typename?: 'User';
  dateJoined: Scalars['DateTime'];
  diagramSet: Array<Diagram>;
  email: Scalars['String'];
  firstName: Scalars['String'];
  flowSet: Array<Flow>;
  id: Scalars['ID'];
  /** Designates whether this user should be treated as active. Unselect this instead of deleting accounts. */
  isActive: Scalars['Boolean'];
  /** Designates whether the user can log into this admin site. */
  isStaff: Scalars['Boolean'];
  /** Designates that this user has all permissions without explicitly assigning them. */
  isSuperuser: Scalars['Boolean'];
  lastLogin?: Maybe<Scalars['DateTime']>;
  lastName: Scalars['String'];
  password: Scalars['String'];
  roles?: Maybe<Scalars['GenericScalar']>;
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username: Scalars['String'];
};

export type Widget = {
  __typename?: 'Widget';
  /** Is this a paragraph */
  asParagraph?: Maybe<Scalars['Boolean']>;
  /** The dependencies of this port */
  choices?: Maybe<Array<Maybe<Choice>>>;
  /** The dependencies of this port */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** A hook for the app to call */
  hook?: Maybe<Scalars['String']>;
  /** type */
  kind: Scalars['String'];
  /** Max value for int widget */
  max?: Maybe<Scalars['Int']>;
  /** Max value for int widget */
  min?: Maybe<Scalars['Int']>;
  /** Placeholder for any widget */
  placeholder?: Maybe<Scalars['String']>;
  /** Do we have a possible */
  query?: Maybe<Scalars['String']>;
  /** A hook for the app to call */
  ward?: Maybe<Scalars['String']>;
};

export type WidgetInput = {
  /** Is this a paragraph */
  asParagraph?: InputMaybe<Scalars['Boolean']>;
  /** The dependencies of this port */
  choices?: InputMaybe<Array<InputMaybe<ChoiceInput>>>;
  /** The dependencies of this port */
  dependencies?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  /** A hook for the app to call */
  hook?: InputMaybe<Scalars['String']>;
  /** type */
  kind: Scalars['String'];
  /** Max value for int widget */
  max?: InputMaybe<Scalars['Int']>;
  /** Max value for int widget */
  min?: InputMaybe<Scalars['Int']>;
  /** Placeholder for any widget */
  placeholder?: InputMaybe<Scalars['String']>;
  /** Do we have a possible */
  query?: InputMaybe<Scalars['String']>;
  /** A ward for the app to call */
  ward?: InputMaybe<Scalars['String']>;
};

type FlowNodeCommons_ArgNode_Fragment = { __typename?: 'ArgNode', constants?: any | null, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

type FlowNodeCommons_ArkitektNode_Fragment = { __typename?: 'ArkitektNode', constants?: any | null, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

type FlowNodeCommons_KwargNode_Fragment = { __typename?: 'KwargNode', constants?: any | null, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

type FlowNodeCommons_ReactiveNode_Fragment = { __typename?: 'ReactiveNode', constants?: any | null, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

type FlowNodeCommons_ReturnNode_Fragment = { __typename?: 'ReturnNode', constants?: any | null, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

export type FlowNodeCommonsFragment = FlowNodeCommons_ArgNode_Fragment | FlowNodeCommons_ArkitektNode_Fragment | FlowNodeCommons_KwargNode_Fragment | FlowNodeCommons_ReactiveNode_Fragment | FlowNodeCommons_ReturnNode_Fragment;

export type ArkitektNodeFragment = { __typename: 'ArkitektNode', name?: string | null, description?: string | null, package?: string | null, interface?: string | null, kind: string, defaults?: any | null, constants?: any | null, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

export type ReactiveNodeFragment = { __typename: 'ReactiveNode', implementation: ReactiveImplementationModelInput, constants?: any | null, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

export type WidgetFragment = { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null };

export type ReturnWidgetFragment = { __typename?: 'ReturnWidget', kind: string, query?: string | null, hook?: string | null, ward?: string | null };

export type ArgPortChildFragment = { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null };

export type ReturnPortChildFragment = { __typename?: 'ReturnPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null };

export type ArgPortFragment = { __typename?: 'ArgPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null };

export type ReturnPortFragment = { __typename?: 'ReturnPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ReturnPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null };

export type ArgNodeFragment = { __typename: 'ArgNode', constants?: any | null, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

export type KwargNodeFragment = { __typename: 'KwargNode', constants?: any | null, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

export type ReturnNodeFragment = { __typename: 'ReturnNode', constants?: any | null, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

type FlowNode_ArgNode_Fragment = { __typename: 'ArgNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

type FlowNode_ArkitektNode_Fragment = { __typename: 'ArkitektNode', id: string, typename: string, name?: string | null, description?: string | null, package?: string | null, interface?: string | null, kind: string, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

type FlowNode_KwargNode_Fragment = { __typename: 'KwargNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

type FlowNode_ReactiveNode_Fragment = { __typename: 'ReactiveNode', id: string, typename: string, implementation: ReactiveImplementationModelInput, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

type FlowNode_ReturnNode_Fragment = { __typename: 'ReturnNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

export type FlowNodeFragment = FlowNode_ArgNode_Fragment | FlowNode_ArkitektNode_Fragment | FlowNode_KwargNode_Fragment | FlowNode_ReactiveNode_Fragment | FlowNode_ReturnNode_Fragment;

type FlowEdgeCommons_FancyEdge_Fragment = { __typename?: 'FancyEdge', stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> };

type FlowEdgeCommons_LabeledEdge_Fragment = { __typename?: 'LabeledEdge', stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> };

export type FlowEdgeCommonsFragment = FlowEdgeCommons_FancyEdge_Fragment | FlowEdgeCommons_LabeledEdge_Fragment;

export type LabeledEdgeFragment = { __typename: 'LabeledEdge', stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> };

export type FancyEdgeFragment = { __typename: 'FancyEdge', stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> };

type FlowEdge_FancyEdge_Fragment = { __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> };

type FlowEdge_LabeledEdge_Fragment = { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> };

export type FlowEdgeFragment = FlowEdge_FancyEdge_Fragment | FlowEdge_LabeledEdge_Fragment;

export type GlobalFragment = { __typename?: 'Global', locked?: boolean | null, key: string, value?: any | null, mapped?: Array<string | null> | null, identifier?: string | null, typename: string, widget?: any | null };

export type StreamItemChildFragment = { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null };

export type StreamItemFragment = { __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null };

export type FlowFragment = { __typename: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, name?: string | null, description?: string | null, package?: string | null, interface?: string | null, kind: string, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, implementation: ReactiveImplementationModelInput, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', locked?: boolean | null, key: string, value?: any | null, mapped?: Array<string | null> | null, identifier?: string | null, typename: string, widget?: any | null } | null>, args: Array<{ __typename?: 'ArgPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null>, returns: Array<{ __typename?: 'ReturnPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ReturnPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null> } };

export type ListFlowFragment = { __typename?: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any };

export type ListDiagramFragment = { __typename?: 'Diagram', id: string, name?: string | null, latestFlow?: { __typename?: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any } | null };

export type DiagramFragment = { __typename?: 'Diagram', id: string, name?: string | null, latestFlow?: { __typename: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, name?: string | null, description?: string | null, package?: string | null, interface?: string | null, kind: string, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, implementation: ReactiveImplementationModelInput, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', locked?: boolean | null, key: string, value?: any | null, mapped?: Array<string | null> | null, identifier?: string | null, typename: string, widget?: any | null } | null>, args: Array<{ __typename?: 'ArgPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null>, returns: Array<{ __typename?: 'ReturnPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ReturnPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null> } } | null };

export type RunLogFragment = { __typename?: 'RunLog', id: string, node: string, log?: string | null };

export type RunEventFragment = { __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number };

export type ReactiveTemplateFragment = { __typename?: 'ReactiveTemplate', name: string, implementation: ReactiveImplementationModelInput, description?: string | null, id: string, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> };

export type SnapshotFragment = { __typename?: 'Snapshot', id: string, status?: string | null, t: number, run?: { __typename?: 'Run', id: string, assignation?: string | null } | null, events: Array<{ __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number }> };

export type ListSnapshotFragment = { __typename?: 'Snapshot', id: string, t: number, run?: { __typename?: 'Run', id: string, assignation?: string | null } | null };

export type RunFragment = { __typename?: 'Run', id: string, status?: string | null, createdAt: any, snapshots: Array<{ __typename?: 'Snapshot', id: string, status?: string | null, t: number }>, latestSnapshot?: { __typename?: 'Snapshot', createdAt: any, t: number, events: Array<{ __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number }> } | null, flow?: { __typename: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, name?: string | null, description?: string | null, package?: string | null, interface?: string | null, kind: string, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, implementation: ReactiveImplementationModelInput, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', locked?: boolean | null, key: string, value?: any | null, mapped?: Array<string | null> | null, identifier?: string | null, typename: string, widget?: any | null } | null>, args: Array<{ __typename?: 'ArgPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null>, returns: Array<{ __typename?: 'ReturnPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ReturnPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null> } } | null };

export type ListRunFragment = { __typename?: 'Run', id: string, status?: string | null, assignation?: string | null, createdAt: any, flow?: { __typename?: 'Flow', id: string, name: string, diagram?: { __typename?: 'Diagram', name?: string | null } | null } | null };

export type UpdateFlowMutationVariables = Exact<{
  id: Scalars['ID'];
  graph: GraphInput;
  screenshot?: InputMaybe<Scalars['ImageFile']>;
}>;


export type UpdateFlowMutation = { __typename?: 'Mutation', updatediagram?: { __typename?: 'Diagram', id: string, name?: string | null, latestFlow?: { __typename: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, name?: string | null, description?: string | null, package?: string | null, interface?: string | null, kind: string, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, implementation: ReactiveImplementationModelInput, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', locked?: boolean | null, key: string, value?: any | null, mapped?: Array<string | null> | null, identifier?: string | null, typename: string, widget?: any | null } | null>, args: Array<{ __typename?: 'ArgPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null>, returns: Array<{ __typename?: 'ReturnPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ReturnPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null> } } | null } | null };

export type DeleteFlowMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteFlowMutation = { __typename?: 'Mutation', deleteFlow?: { __typename?: 'DeleteFlowReturn', id?: string | null } | null };

export type CreateVanillaDiagramMutationVariables = Exact<{
  name?: InputMaybe<Scalars['String']>;
}>;


export type CreateVanillaDiagramMutation = { __typename?: 'Mutation', drawvanilla?: { __typename?: 'Diagram', id: string, name?: string | null, latestFlow?: { __typename: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, name?: string | null, description?: string | null, package?: string | null, interface?: string | null, kind: string, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, implementation: ReactiveImplementationModelInput, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', locked?: boolean | null, key: string, value?: any | null, mapped?: Array<string | null> | null, identifier?: string | null, typename: string, widget?: any | null } | null>, args: Array<{ __typename?: 'ArgPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null>, returns: Array<{ __typename?: 'ReturnPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ReturnPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null> } } | null } | null };

export type DeleteSnapshotMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteSnapshotMutation = { __typename?: 'Mutation', deleteSnapshot?: { __typename?: 'DeleteSnapshotReturn', id: string } | null };

export type DeleteRunMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteRunMutation = { __typename?: 'Mutation', deleteRun?: { __typename?: 'DeleteRunReturn', id: string } | null };

export type DeleteWorkspaceMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteWorkspaceMutation = { __typename?: 'Mutation', deleteWorkspace?: { __typename?: 'DeleteWorkspaceReturn', id?: string | null } | null };

export type FlowQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
}>;


export type FlowQuery = { __typename?: 'Query', flow?: { __typename: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, name?: string | null, description?: string | null, package?: string | null, interface?: string | null, kind: string, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, implementation: ReactiveImplementationModelInput, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', locked?: boolean | null, key: string, value?: any | null, mapped?: Array<string | null> | null, identifier?: string | null, typename: string, widget?: any | null } | null>, args: Array<{ __typename?: 'ArgPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null>, returns: Array<{ __typename?: 'ReturnPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ReturnPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null> } } | null };

export type DiagramQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DiagramQuery = { __typename?: 'Query', diagram?: { __typename?: 'Diagram', id: string, name?: string | null, latestFlow?: { __typename: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, name?: string | null, description?: string | null, package?: string | null, interface?: string | null, kind: string, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, implementation: ReactiveImplementationModelInput, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', locked?: boolean | null, key: string, value?: any | null, mapped?: Array<string | null> | null, identifier?: string | null, typename: string, widget?: any | null } | null>, args: Array<{ __typename?: 'ArgPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null>, returns: Array<{ __typename?: 'ReturnPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ReturnPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null> } } | null } | null };

export type MyDiagramsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyDiagramsQuery = { __typename?: 'Query', mydiagrams?: Array<{ __typename?: 'Diagram', id: string, name?: string | null, latestFlow?: { __typename?: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any } | null } | null> | null };

export type SearchDiagramsQueryVariables = Exact<{
  name?: InputMaybe<Scalars['String']>;
}>;


export type SearchDiagramsQuery = { __typename?: 'Query', diagrams?: Array<{ __typename?: 'Diagram', id: string, name?: string | null, latestFlow?: { __typename?: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any } | null } | null> | null };

export type SearchFlowsQueryVariables = Exact<{
  name?: InputMaybe<Scalars['String']>;
  diagram?: InputMaybe<Scalars['ID']>;
}>;


export type SearchFlowsQuery = { __typename?: 'Query', flows?: Array<{ __typename?: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any } | null> | null };

export type SnapshotsQueryVariables = Exact<{ [key: string]: never; }>;


export type SnapshotsQuery = { __typename?: 'Query', snapshots?: Array<{ __typename?: 'Snapshot', id: string, t: number, run?: { __typename?: 'Run', id: string, assignation?: string | null } | null } | null> | null };

export type DetailSnapshotQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailSnapshotQuery = { __typename?: 'Query', snapshot?: { __typename?: 'Snapshot', id: string, status?: string | null, t: number, run?: { __typename?: 'Run', id: string, assignation?: string | null } | null, events: Array<{ __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number }> } | null };

export type RunsQueryVariables = Exact<{ [key: string]: never; }>;


export type RunsQuery = { __typename?: 'Query', runs?: Array<{ __typename?: 'Run', id: string, status?: string | null, assignation?: string | null, createdAt: any, flow?: { __typename?: 'Flow', id: string, name: string, diagram?: { __typename?: 'Diagram', name?: string | null } | null } | null } | null> | null };

export type DetailRunQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
  assignation?: InputMaybe<Scalars['ID']>;
}>;


export type DetailRunQuery = { __typename?: 'Query', run?: { __typename?: 'Run', id: string, status?: string | null, createdAt: any, snapshots: Array<{ __typename?: 'Snapshot', id: string, status?: string | null, t: number }>, latestSnapshot?: { __typename?: 'Snapshot', createdAt: any, t: number, events: Array<{ __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number }> } | null, flow?: { __typename: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, name?: string | null, description?: string | null, package?: string | null, interface?: string | null, kind: string, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, implementation: ReactiveImplementationModelInput, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', locked?: boolean | null, key: string, value?: any | null, mapped?: Array<string | null> | null, identifier?: string | null, typename: string, widget?: any | null } | null>, args: Array<{ __typename?: 'ArgPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null>, returns: Array<{ __typename?: 'ReturnPort', key: string, label?: string | null, identifier?: string | null, kind: StreamKind, name?: string | null, description?: string | null, nullable: boolean, widget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, child?: { __typename?: 'ReturnPortChild', identifier?: string | null, kind: StreamKind, nullable?: boolean | null, child?: { __typename?: 'ArgPortChild', identifier?: string | null, kind: StreamKind } | null } | null } | null> } } | null } | null };

export type EventsBetweenQueryVariables = Exact<{
  id: Scalars['ID'];
  min?: InputMaybe<Scalars['Int']>;
  max?: InputMaybe<Scalars['Int']>;
}>;


export type EventsBetweenQuery = { __typename?: 'Query', eventsBetween?: Array<{ __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number } | null> | null };

export type ReactiveTemplateQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type ReactiveTemplateQuery = { __typename?: 'Query', reactivetemplate?: { __typename?: 'ReactiveTemplate', name: string, implementation: ReactiveImplementationModelInput, description?: string | null, id: string, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | null };

export type ReactiveTemplatesQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type ReactiveTemplatesQuery = { __typename?: 'Query', reactivetemplates?: Array<{ __typename?: 'ReactiveTemplate', name: string, implementation: ReactiveImplementationModelInput, description?: string | null, id: string, constream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, instream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null } | null } | null } | null> | null> } | null> | null };

export type EventsSubscriptionVariables = Exact<{
  id: Scalars['ID'];
}>;


export type EventsSubscription = { __typename?: 'Subscription', events?: { __typename?: 'Event', deleted?: string | null, create?: { __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number } | null, update?: { __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number } | null } | null };

export const ListFlowFragmentDoc = gql`
    fragment ListFlow on Flow {
  id
  name
  screenshot
  createdAt
}
    `;
export const ListDiagramFragmentDoc = gql`
    fragment ListDiagram on Diagram {
  id
  name
  latestFlow {
    ...ListFlow
  }
}
    ${ListFlowFragmentDoc}`;
export const StreamItemChildFragmentDoc = gql`
    fragment StreamItemChild on StreamItemChild {
  kind
  identifier
  child {
    kind
    identifier
  }
}
    `;
export const StreamItemFragmentDoc = gql`
    fragment StreamItem on StreamItem {
  key
  kind
  identifier
  nullable
  child {
    ...StreamItemChild
  }
}
    ${StreamItemChildFragmentDoc}`;
export const FlowNodeCommonsFragmentDoc = gql`
    fragment FlowNodeCommons on FlowNodeCommons {
  instream {
    ...StreamItem
  }
  outstream {
    ...StreamItem
  }
  constream {
    ...StreamItem
  }
  constants
}
    ${StreamItemFragmentDoc}`;
export const ArkitektNodeFragmentDoc = gql`
    fragment ArkitektNode on ArkitektNode {
  ...FlowNodeCommons
  __typename
  name
  description
  package
  interface
  kind
  defaults
}
    ${FlowNodeCommonsFragmentDoc}`;
export const ReactiveNodeFragmentDoc = gql`
    fragment ReactiveNode on ReactiveNode {
  ...FlowNodeCommons
  __typename
  implementation
}
    ${FlowNodeCommonsFragmentDoc}`;
export const ArgNodeFragmentDoc = gql`
    fragment ArgNode on ArgNode {
  ...FlowNodeCommons
  __typename
}
    ${FlowNodeCommonsFragmentDoc}`;
export const KwargNodeFragmentDoc = gql`
    fragment KwargNode on KwargNode {
  ...FlowNodeCommons
  __typename
}
    ${FlowNodeCommonsFragmentDoc}`;
export const ReturnNodeFragmentDoc = gql`
    fragment ReturnNode on ReturnNode {
  ...FlowNodeCommons
  __typename
}
    ${FlowNodeCommonsFragmentDoc}`;
export const FlowNodeFragmentDoc = gql`
    fragment FlowNode on FlowNode {
  id
  position {
    x
    y
  }
  typename
  ...ArkitektNode
  ...ReactiveNode
  ...ArgNode
  ...KwargNode
  ...ReturnNode
}
    ${ArkitektNodeFragmentDoc}
${ReactiveNodeFragmentDoc}
${ArgNodeFragmentDoc}
${KwargNodeFragmentDoc}
${ReturnNodeFragmentDoc}`;
export const FlowEdgeCommonsFragmentDoc = gql`
    fragment FlowEdgeCommons on FlowEdgeCommons {
  stream {
    ...StreamItem
  }
}
    ${StreamItemFragmentDoc}`;
export const LabeledEdgeFragmentDoc = gql`
    fragment LabeledEdge on LabeledEdge {
  ...FlowEdgeCommons
  __typename
}
    ${FlowEdgeCommonsFragmentDoc}`;
export const FancyEdgeFragmentDoc = gql`
    fragment FancyEdge on FancyEdge {
  ...FlowEdgeCommons
  __typename
}
    ${FlowEdgeCommonsFragmentDoc}`;
export const FlowEdgeFragmentDoc = gql`
    fragment FlowEdge on FlowEdge {
  id
  source
  sourceHandle
  target
  targetHandle
  typename
  ...LabeledEdge
  ...FancyEdge
}
    ${LabeledEdgeFragmentDoc}
${FancyEdgeFragmentDoc}`;
export const GlobalFragmentDoc = gql`
    fragment Global on Global {
  locked
  key
  value
  mapped
  identifier
  typename
  widget
}
    `;
export const WidgetFragmentDoc = gql`
    fragment Widget on Widget {
  kind
  query
  hook
  ward
}
    `;
export const ArgPortChildFragmentDoc = gql`
    fragment ArgPortChild on ArgPortChild {
  identifier
  kind
  nullable
  child {
    identifier
    kind
  }
}
    `;
export const ArgPortFragmentDoc = gql`
    fragment ArgPort on ArgPort {
  key
  label
  identifier
  kind
  name
  description
  widget {
    ...Widget
  }
  child {
    ...ArgPortChild
  }
  nullable
}
    ${WidgetFragmentDoc}
${ArgPortChildFragmentDoc}`;
export const ReturnWidgetFragmentDoc = gql`
    fragment ReturnWidget on ReturnWidget {
  kind
  query
  hook
  ward
}
    `;
export const ReturnPortChildFragmentDoc = gql`
    fragment ReturnPortChild on ReturnPortChild {
  identifier
  kind
  nullable
  child {
    identifier
    kind
  }
}
    `;
export const ReturnPortFragmentDoc = gql`
    fragment ReturnPort on ReturnPort {
  key
  label
  identifier
  kind
  name
  description
  widget {
    ...ReturnWidget
  }
  child {
    ...ReturnPortChild
  }
  nullable
}
    ${ReturnWidgetFragmentDoc}
${ReturnPortChildFragmentDoc}`;
export const FlowFragmentDoc = gql`
    fragment Flow on Flow {
  __typename
  id
  graph {
    nodes {
      ...FlowNode
    }
    edges {
      ...FlowEdge
    }
    globals {
      ...Global
    }
    args {
      ...ArgPort
    }
    returns {
      ...ReturnPort
    }
  }
  name
  screenshot
  createdAt
}
    ${FlowNodeFragmentDoc}
${FlowEdgeFragmentDoc}
${GlobalFragmentDoc}
${ArgPortFragmentDoc}
${ReturnPortFragmentDoc}`;
export const DiagramFragmentDoc = gql`
    fragment Diagram on Diagram {
  id
  name
  latestFlow {
    ...Flow
  }
}
    ${FlowFragmentDoc}`;
export const RunLogFragmentDoc = gql`
    fragment RunLog on RunLog {
  id
  node
  log
}
    `;
export const ReactiveTemplateFragmentDoc = gql`
    fragment ReactiveTemplate on ReactiveTemplate {
  constream {
    ...StreamItem
  }
  instream {
    ...StreamItem
  }
  outstream {
    ...StreamItem
  }
  name
  implementation
  description
  id
}
    ${StreamItemFragmentDoc}`;
export const RunEventFragmentDoc = gql`
    fragment RunEvent on RunEvent {
  id
  source
  handle
  type
  createdAt
  value
  t
}
    `;
export const SnapshotFragmentDoc = gql`
    fragment Snapshot on Snapshot {
  id
  run {
    id
    assignation
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
    assignation
  }
  t
}
    `;
export const RunFragmentDoc = gql`
    fragment Run on Run {
  id
  status
  snapshots {
    id
    status
    t
  }
  createdAt
  latestSnapshot {
    createdAt
    events {
      ...RunEvent
    }
    t
  }
  flow {
    ...Flow
  }
}
    ${RunEventFragmentDoc}
${FlowFragmentDoc}`;
export const ListRunFragmentDoc = gql`
    fragment ListRun on Run {
  id
  status
  assignation
  createdAt
  flow {
    id
    name
    diagram {
      name
    }
  }
}
    `;
export const UpdateFlowDocument = gql`
    mutation UpdateFlow($id: ID!, $graph: GraphInput!, $screenshot: ImageFile) {
  updatediagram(id: $id, graph: $graph, screenshot: $screenshot) {
    ...Diagram
  }
}
    ${DiagramFragmentDoc}`;
export type UpdateFlowMutationFn = Apollo.MutationFunction<UpdateFlowMutation, UpdateFlowMutationVariables>;

/**
 * __useUpdateFlowMutation__
 *
 * To run a mutation, you first call `useUpdateFlowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateFlowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateFlowMutation, { data, loading, error }] = useUpdateFlowMutation({
 *   variables: {
 *      id: // value for 'id'
 *      graph: // value for 'graph'
 *      screenshot: // value for 'screenshot'
 *   },
 * });
 */
export function useUpdateFlowMutation(baseOptions?: Apollo.MutationHookOptions<UpdateFlowMutation, UpdateFlowMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateFlowMutation, UpdateFlowMutationVariables>(UpdateFlowDocument, options);
      }
export type UpdateFlowMutationHookResult = ReturnType<typeof useUpdateFlowMutation>;
export type UpdateFlowMutationResult = Apollo.MutationResult<UpdateFlowMutation>;
export type UpdateFlowMutationOptions = Apollo.BaseMutationOptions<UpdateFlowMutation, UpdateFlowMutationVariables>;
export const DeleteFlowDocument = gql`
    mutation DeleteFlow($id: ID!) {
  deleteFlow(id: $id) {
    id
  }
}
    `;
export type DeleteFlowMutationFn = Apollo.MutationFunction<DeleteFlowMutation, DeleteFlowMutationVariables>;

/**
 * __useDeleteFlowMutation__
 *
 * To run a mutation, you first call `useDeleteFlowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteFlowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteFlowMutation, { data, loading, error }] = useDeleteFlowMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteFlowMutation(baseOptions?: Apollo.MutationHookOptions<DeleteFlowMutation, DeleteFlowMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteFlowMutation, DeleteFlowMutationVariables>(DeleteFlowDocument, options);
      }
export type DeleteFlowMutationHookResult = ReturnType<typeof useDeleteFlowMutation>;
export type DeleteFlowMutationResult = Apollo.MutationResult<DeleteFlowMutation>;
export type DeleteFlowMutationOptions = Apollo.BaseMutationOptions<DeleteFlowMutation, DeleteFlowMutationVariables>;
export const CreateVanillaDiagramDocument = gql`
    mutation CreateVanillaDiagram($name: String) {
  drawvanilla(name: $name) {
    ...Diagram
  }
}
    ${DiagramFragmentDoc}`;
export type CreateVanillaDiagramMutationFn = Apollo.MutationFunction<CreateVanillaDiagramMutation, CreateVanillaDiagramMutationVariables>;

/**
 * __useCreateVanillaDiagramMutation__
 *
 * To run a mutation, you first call `useCreateVanillaDiagramMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateVanillaDiagramMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createVanillaDiagramMutation, { data, loading, error }] = useCreateVanillaDiagramMutation({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCreateVanillaDiagramMutation(baseOptions?: Apollo.MutationHookOptions<CreateVanillaDiagramMutation, CreateVanillaDiagramMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateVanillaDiagramMutation, CreateVanillaDiagramMutationVariables>(CreateVanillaDiagramDocument, options);
      }
export type CreateVanillaDiagramMutationHookResult = ReturnType<typeof useCreateVanillaDiagramMutation>;
export type CreateVanillaDiagramMutationResult = Apollo.MutationResult<CreateVanillaDiagramMutation>;
export type CreateVanillaDiagramMutationOptions = Apollo.BaseMutationOptions<CreateVanillaDiagramMutation, CreateVanillaDiagramMutationVariables>;
export const DeleteSnapshotDocument = gql`
    mutation DeleteSnapshot($id: ID!) {
  deleteSnapshot(id: $id) {
    id
  }
}
    `;
export type DeleteSnapshotMutationFn = Apollo.MutationFunction<DeleteSnapshotMutation, DeleteSnapshotMutationVariables>;

/**
 * __useDeleteSnapshotMutation__
 *
 * To run a mutation, you first call `useDeleteSnapshotMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteSnapshotMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteSnapshotMutation, { data, loading, error }] = useDeleteSnapshotMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteSnapshotMutation(baseOptions?: Apollo.MutationHookOptions<DeleteSnapshotMutation, DeleteSnapshotMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteSnapshotMutation, DeleteSnapshotMutationVariables>(DeleteSnapshotDocument, options);
      }
export type DeleteSnapshotMutationHookResult = ReturnType<typeof useDeleteSnapshotMutation>;
export type DeleteSnapshotMutationResult = Apollo.MutationResult<DeleteSnapshotMutation>;
export type DeleteSnapshotMutationOptions = Apollo.BaseMutationOptions<DeleteSnapshotMutation, DeleteSnapshotMutationVariables>;
export const DeleteRunDocument = gql`
    mutation DeleteRun($id: ID!) {
  deleteRun(id: $id) {
    id
  }
}
    `;
export type DeleteRunMutationFn = Apollo.MutationFunction<DeleteRunMutation, DeleteRunMutationVariables>;

/**
 * __useDeleteRunMutation__
 *
 * To run a mutation, you first call `useDeleteRunMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteRunMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteRunMutation, { data, loading, error }] = useDeleteRunMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteRunMutation(baseOptions?: Apollo.MutationHookOptions<DeleteRunMutation, DeleteRunMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteRunMutation, DeleteRunMutationVariables>(DeleteRunDocument, options);
      }
export type DeleteRunMutationHookResult = ReturnType<typeof useDeleteRunMutation>;
export type DeleteRunMutationResult = Apollo.MutationResult<DeleteRunMutation>;
export type DeleteRunMutationOptions = Apollo.BaseMutationOptions<DeleteRunMutation, DeleteRunMutationVariables>;
export const DeleteWorkspaceDocument = gql`
    mutation DeleteWorkspace($id: ID!) {
  deleteWorkspace(id: $id) {
    id
  }
}
    `;
export type DeleteWorkspaceMutationFn = Apollo.MutationFunction<DeleteWorkspaceMutation, DeleteWorkspaceMutationVariables>;

/**
 * __useDeleteWorkspaceMutation__
 *
 * To run a mutation, you first call `useDeleteWorkspaceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteWorkspaceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteWorkspaceMutation, { data, loading, error }] = useDeleteWorkspaceMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteWorkspaceMutation(baseOptions?: Apollo.MutationHookOptions<DeleteWorkspaceMutation, DeleteWorkspaceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteWorkspaceMutation, DeleteWorkspaceMutationVariables>(DeleteWorkspaceDocument, options);
      }
export type DeleteWorkspaceMutationHookResult = ReturnType<typeof useDeleteWorkspaceMutation>;
export type DeleteWorkspaceMutationResult = Apollo.MutationResult<DeleteWorkspaceMutation>;
export type DeleteWorkspaceMutationOptions = Apollo.BaseMutationOptions<DeleteWorkspaceMutation, DeleteWorkspaceMutationVariables>;
export const FlowDocument = gql`
    query Flow($id: ID) {
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
export function useFlowQuery(baseOptions?: Apollo.QueryHookOptions<FlowQuery, FlowQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FlowQuery, FlowQueryVariables>(FlowDocument, options);
      }
export function useFlowLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FlowQuery, FlowQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FlowQuery, FlowQueryVariables>(FlowDocument, options);
        }
export type FlowQueryHookResult = ReturnType<typeof useFlowQuery>;
export type FlowLazyQueryHookResult = ReturnType<typeof useFlowLazyQuery>;
export type FlowQueryResult = Apollo.QueryResult<FlowQuery, FlowQueryVariables>;
export const DiagramDocument = gql`
    query Diagram($id: ID!) {
  diagram(id: $id) {
    ...Diagram
  }
}
    ${DiagramFragmentDoc}`;

/**
 * __useDiagramQuery__
 *
 * To run a query within a React component, call `useDiagramQuery` and pass it any options that fit your needs.
 * When your component renders, `useDiagramQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDiagramQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDiagramQuery(baseOptions: Apollo.QueryHookOptions<DiagramQuery, DiagramQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DiagramQuery, DiagramQueryVariables>(DiagramDocument, options);
      }
export function useDiagramLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DiagramQuery, DiagramQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DiagramQuery, DiagramQueryVariables>(DiagramDocument, options);
        }
export type DiagramQueryHookResult = ReturnType<typeof useDiagramQuery>;
export type DiagramLazyQueryHookResult = ReturnType<typeof useDiagramLazyQuery>;
export type DiagramQueryResult = Apollo.QueryResult<DiagramQuery, DiagramQueryVariables>;
export const MyDiagramsDocument = gql`
    query MyDiagrams {
  mydiagrams {
    ...ListDiagram
  }
}
    ${ListDiagramFragmentDoc}`;

/**
 * __useMyDiagramsQuery__
 *
 * To run a query within a React component, call `useMyDiagramsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyDiagramsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyDiagramsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyDiagramsQuery(baseOptions?: Apollo.QueryHookOptions<MyDiagramsQuery, MyDiagramsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyDiagramsQuery, MyDiagramsQueryVariables>(MyDiagramsDocument, options);
      }
export function useMyDiagramsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyDiagramsQuery, MyDiagramsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyDiagramsQuery, MyDiagramsQueryVariables>(MyDiagramsDocument, options);
        }
export type MyDiagramsQueryHookResult = ReturnType<typeof useMyDiagramsQuery>;
export type MyDiagramsLazyQueryHookResult = ReturnType<typeof useMyDiagramsLazyQuery>;
export type MyDiagramsQueryResult = Apollo.QueryResult<MyDiagramsQuery, MyDiagramsQueryVariables>;
export const SearchDiagramsDocument = gql`
    query SearchDiagrams($name: String) {
  diagrams(name: $name) {
    ...ListDiagram
  }
}
    ${ListDiagramFragmentDoc}`;

/**
 * __useSearchDiagramsQuery__
 *
 * To run a query within a React component, call `useSearchDiagramsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchDiagramsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchDiagramsQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useSearchDiagramsQuery(baseOptions?: Apollo.QueryHookOptions<SearchDiagramsQuery, SearchDiagramsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchDiagramsQuery, SearchDiagramsQueryVariables>(SearchDiagramsDocument, options);
      }
export function useSearchDiagramsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchDiagramsQuery, SearchDiagramsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchDiagramsQuery, SearchDiagramsQueryVariables>(SearchDiagramsDocument, options);
        }
export type SearchDiagramsQueryHookResult = ReturnType<typeof useSearchDiagramsQuery>;
export type SearchDiagramsLazyQueryHookResult = ReturnType<typeof useSearchDiagramsLazyQuery>;
export type SearchDiagramsQueryResult = Apollo.QueryResult<SearchDiagramsQuery, SearchDiagramsQueryVariables>;
export const SearchFlowsDocument = gql`
    query SearchFlows($name: String, $diagram: ID) {
  flows(name: $name, diagram: $diagram) {
    ...ListFlow
  }
}
    ${ListFlowFragmentDoc}`;

/**
 * __useSearchFlowsQuery__
 *
 * To run a query within a React component, call `useSearchFlowsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchFlowsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchFlowsQuery({
 *   variables: {
 *      name: // value for 'name'
 *      diagram: // value for 'diagram'
 *   },
 * });
 */
export function useSearchFlowsQuery(baseOptions?: Apollo.QueryHookOptions<SearchFlowsQuery, SearchFlowsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchFlowsQuery, SearchFlowsQueryVariables>(SearchFlowsDocument, options);
      }
export function useSearchFlowsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchFlowsQuery, SearchFlowsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchFlowsQuery, SearchFlowsQueryVariables>(SearchFlowsDocument, options);
        }
export type SearchFlowsQueryHookResult = ReturnType<typeof useSearchFlowsQuery>;
export type SearchFlowsLazyQueryHookResult = ReturnType<typeof useSearchFlowsLazyQuery>;
export type SearchFlowsQueryResult = Apollo.QueryResult<SearchFlowsQuery, SearchFlowsQueryVariables>;
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
export function useSnapshotsQuery(baseOptions?: Apollo.QueryHookOptions<SnapshotsQuery, SnapshotsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SnapshotsQuery, SnapshotsQueryVariables>(SnapshotsDocument, options);
      }
export function useSnapshotsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SnapshotsQuery, SnapshotsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SnapshotsQuery, SnapshotsQueryVariables>(SnapshotsDocument, options);
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
export function useDetailSnapshotQuery(baseOptions: Apollo.QueryHookOptions<DetailSnapshotQuery, DetailSnapshotQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailSnapshotQuery, DetailSnapshotQueryVariables>(DetailSnapshotDocument, options);
      }
export function useDetailSnapshotLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailSnapshotQuery, DetailSnapshotQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailSnapshotQuery, DetailSnapshotQueryVariables>(DetailSnapshotDocument, options);
        }
export type DetailSnapshotQueryHookResult = ReturnType<typeof useDetailSnapshotQuery>;
export type DetailSnapshotLazyQueryHookResult = ReturnType<typeof useDetailSnapshotLazyQuery>;
export type DetailSnapshotQueryResult = Apollo.QueryResult<DetailSnapshotQuery, DetailSnapshotQueryVariables>;
export const RunsDocument = gql`
    query Runs {
  runs {
    ...ListRun
  }
}
    ${ListRunFragmentDoc}`;

/**
 * __useRunsQuery__
 *
 * To run a query within a React component, call `useRunsQuery` and pass it any options that fit your needs.
 * When your component renders, `useRunsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRunsQuery({
 *   variables: {
 *   },
 * });
 */
export function useRunsQuery(baseOptions?: Apollo.QueryHookOptions<RunsQuery, RunsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RunsQuery, RunsQueryVariables>(RunsDocument, options);
      }
export function useRunsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RunsQuery, RunsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RunsQuery, RunsQueryVariables>(RunsDocument, options);
        }
export type RunsQueryHookResult = ReturnType<typeof useRunsQuery>;
export type RunsLazyQueryHookResult = ReturnType<typeof useRunsLazyQuery>;
export type RunsQueryResult = Apollo.QueryResult<RunsQuery, RunsQueryVariables>;
export const DetailRunDocument = gql`
    query DetailRun($id: ID, $assignation: ID) {
  run(id: $id, assignation: $assignation) {
    ...Run
  }
}
    ${RunFragmentDoc}`;

/**
 * __useDetailRunQuery__
 *
 * To run a query within a React component, call `useDetailRunQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailRunQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailRunQuery({
 *   variables: {
 *      id: // value for 'id'
 *      assignation: // value for 'assignation'
 *   },
 * });
 */
export function useDetailRunQuery(baseOptions?: Apollo.QueryHookOptions<DetailRunQuery, DetailRunQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailRunQuery, DetailRunQueryVariables>(DetailRunDocument, options);
      }
export function useDetailRunLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailRunQuery, DetailRunQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailRunQuery, DetailRunQueryVariables>(DetailRunDocument, options);
        }
export type DetailRunQueryHookResult = ReturnType<typeof useDetailRunQuery>;
export type DetailRunLazyQueryHookResult = ReturnType<typeof useDetailRunLazyQuery>;
export type DetailRunQueryResult = Apollo.QueryResult<DetailRunQuery, DetailRunQueryVariables>;
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
export function useEventsBetweenQuery(baseOptions: Apollo.QueryHookOptions<EventsBetweenQuery, EventsBetweenQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<EventsBetweenQuery, EventsBetweenQueryVariables>(EventsBetweenDocument, options);
      }
export function useEventsBetweenLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<EventsBetweenQuery, EventsBetweenQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<EventsBetweenQuery, EventsBetweenQueryVariables>(EventsBetweenDocument, options);
        }
export type EventsBetweenQueryHookResult = ReturnType<typeof useEventsBetweenQuery>;
export type EventsBetweenLazyQueryHookResult = ReturnType<typeof useEventsBetweenLazyQuery>;
export type EventsBetweenQueryResult = Apollo.QueryResult<EventsBetweenQuery, EventsBetweenQueryVariables>;
export const ReactiveTemplateDocument = gql`
    query ReactiveTemplate($id: ID!) {
  reactivetemplate(id: $id) {
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
export function useReactiveTemplateQuery(baseOptions: Apollo.QueryHookOptions<ReactiveTemplateQuery, ReactiveTemplateQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReactiveTemplateQuery, ReactiveTemplateQueryVariables>(ReactiveTemplateDocument, options);
      }
export function useReactiveTemplateLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReactiveTemplateQuery, ReactiveTemplateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReactiveTemplateQuery, ReactiveTemplateQueryVariables>(ReactiveTemplateDocument, options);
        }
export type ReactiveTemplateQueryHookResult = ReturnType<typeof useReactiveTemplateQuery>;
export type ReactiveTemplateLazyQueryHookResult = ReturnType<typeof useReactiveTemplateLazyQuery>;
export type ReactiveTemplateQueryResult = Apollo.QueryResult<ReactiveTemplateQuery, ReactiveTemplateQueryVariables>;
export const ReactiveTemplatesDocument = gql`
    query ReactiveTemplates($search: String) {
  reactivetemplates(name: $search) {
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
 *      search: // value for 'search'
 *   },
 * });
 */
export function useReactiveTemplatesQuery(baseOptions?: Apollo.QueryHookOptions<ReactiveTemplatesQuery, ReactiveTemplatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReactiveTemplatesQuery, ReactiveTemplatesQueryVariables>(ReactiveTemplatesDocument, options);
      }
export function useReactiveTemplatesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReactiveTemplatesQuery, ReactiveTemplatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReactiveTemplatesQuery, ReactiveTemplatesQueryVariables>(ReactiveTemplatesDocument, options);
        }
export type ReactiveTemplatesQueryHookResult = ReturnType<typeof useReactiveTemplatesQuery>;
export type ReactiveTemplatesLazyQueryHookResult = ReturnType<typeof useReactiveTemplatesLazyQuery>;
export type ReactiveTemplatesQueryResult = Apollo.QueryResult<ReactiveTemplatesQuery, ReactiveTemplatesQueryVariables>;
export const EventsDocument = gql`
    subscription Events($id: ID!) {
  events(id: $id) {
    deleted
    create {
      ...RunEvent
    }
    update {
      ...RunEvent
    }
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
export function useEventsSubscription(baseOptions: Apollo.SubscriptionHookOptions<EventsSubscription, EventsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<EventsSubscription, EventsSubscriptionVariables>(EventsDocument, options);
      }
export type EventsSubscriptionHookResult = ReturnType<typeof useEventsSubscription>;
export type EventsSubscriptionResult = Apollo.SubscriptionResult<EventsSubscription>;