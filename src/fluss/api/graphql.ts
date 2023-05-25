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
  constream: Array<Maybe<Array<Maybe<Port>>>>;
  defaults?: Maybe<Scalars['GenericScalar']>;
  documentation?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  instream: Array<Maybe<Array<Maybe<Port>>>>;
  outstream: Array<Maybe<Array<Maybe<Port>>>>;
  parentNode?: Maybe<Scalars['ID']>;
  position: Position;
  typename: Scalars['String'];
};

export type ArkitektNode = FlowNode & FlowNodeCommons & {
  __typename?: 'ArkitektNode';
  allowLocal: Scalars['Boolean'];
  assignTimeout: Scalars['Float'];
  binds?: Maybe<Binds>;
  constants?: Maybe<Scalars['GenericScalar']>;
  constream: Array<Maybe<Array<Maybe<Port>>>>;
  defaults?: Maybe<Scalars['GenericScalar']>;
  description?: Maybe<Scalars['String']>;
  documentation?: Maybe<Scalars['String']>;
  hash: Scalars['String'];
  id: Scalars['String'];
  instream: Array<Maybe<Array<Maybe<Port>>>>;
  kind: Scalars['String'];
  mapStrategy: MapStrategy;
  name?: Maybe<Scalars['String']>;
  outstream: Array<Maybe<Array<Maybe<Port>>>>;
  parentNode?: Maybe<Scalars['ID']>;
  position: Position;
  reserveTimeout: Scalars['Float'];
  typename: Scalars['String'];
  yieldTimeout: Scalars['Float'];
};

export type Binds = {
  __typename?: 'Binds';
  clients?: Maybe<Array<Maybe<Scalars['String']>>>;
  templates?: Maybe<Array<Maybe<Scalars['String']>>>;
};

export type BindsInput = {
  clients?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  templates?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};

export type ChangePermissionsResult = {
  __typename?: 'ChangePermissionsResult';
  message?: Maybe<Scalars['String']>;
  success?: Maybe<Scalars['Boolean']>;
};

export type ChildPortInput = {
  /** Description of the Widget */
  assignWidget?: InputMaybe<WidgetInput>;
  child?: InputMaybe<ChildPortInput>;
  /** The identifier */
  identifier?: InputMaybe<Scalars['String']>;
  /** The type of this argument */
  kind: StreamKind;
  nullable?: InputMaybe<Scalars['Boolean']>;
  /** A return widget */
  returnWidget?: InputMaybe<ReturnWidgetInput>;
  /** The scope of this argument */
  scope: Scope;
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

/**
 * A comment
 *
 * A comment is a user generated comment on a commentable object. A comment can be a reply to another comment or a top level comment.
 * Comments can be nested to any depth. A comment can be edited and deleted by the user that created it.
 */
export type Comment = {
  __typename?: 'Comment';
  /** Comments that are replies to this comment */
  children?: Maybe<Array<Maybe<Comment>>>;
  /** The content type of the commentable object */
  contentType?: Maybe<CommentableModels>;
  createdAt: Scalars['DateTime'];
  /** The descendents of the comment (this referes to the Comment Tree) */
  descendents?: Maybe<Array<Maybe<Descendent>>>;
  id: Scalars['ID'];
  mentions: Array<User>;
  objectId: Scalars['Int'];
  parent?: Maybe<Comment>;
  resolved?: Maybe<Scalars['DateTime']>;
  resolvedBy?: Maybe<User>;
  text: Scalars['String'];
  user: User;
};


/**
 * A comment
 *
 * A comment is a user generated comment on a commentable object. A comment can be a reply to another comment or a top level comment.
 * Comments can be nested to any depth. A comment can be edited and deleted by the user that created it.
 */
export type CommentChildrenArgs = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
};

/** A node in the comment tree */
export type CommentNode = {
  children?: Maybe<Array<Maybe<Descendent>>>;
  untypedChildren?: Maybe<Scalars['GenericScalar']>;
};

export enum CommentableModels {
  FlowCondition = 'FLOW_CONDITION',
  FlowConditionevent = 'FLOW_CONDITIONEVENT',
  FlowConditionsnapshot = 'FLOW_CONDITIONSNAPSHOT',
  FlowFlow = 'FLOW_FLOW',
  FlowReactivetemplate = 'FLOW_REACTIVETEMPLATE',
  FlowRun = 'FLOW_RUN',
  FlowRunevent = 'FLOW_RUNEVENT',
  FlowRunlog = 'FLOW_RUNLOG',
  FlowSnapshot = 'FLOW_SNAPSHOT',
  FlowWorkspace = 'FLOW_WORKSPACE'
}

export type Condition = {
  __typename?: 'Condition';
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdWhile?: Maybe<Scalars['String']>;
  events: Array<ConditionEvent>;
  flow?: Maybe<Flow>;
  id: Scalars['ID'];
  latestSnapshot?: Maybe<ConditionSnapshot>;
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that have pinned the position */
  pinnedBy: Array<User>;
  provision?: Maybe<Scalars['String']>;
  snapshotInterval?: Maybe<Scalars['Int']>;
  snapshots: Array<ConditionSnapshot>;
};

export type ConditionEvent = {
  __typename?: 'ConditionEvent';
  condition?: Maybe<Condition>;
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  snapshot: Array<ConditionSnapshot>;
  source?: Maybe<Scalars['String']>;
  state: ContractStatus;
  value: Scalars['String'];
};

export type ConditionEvents = {
  __typename?: 'ConditionEvents';
  create?: Maybe<ConditionEvent>;
  deleted?: Maybe<Scalars['ID']>;
  update?: Maybe<ConditionEvent>;
};

export type ConditionSnapshot = {
  __typename?: 'ConditionSnapshot';
  condition?: Maybe<Condition>;
  createdAt: Scalars['DateTime'];
  events: Array<ConditionEvent>;
  id: Scalars['ID'];
  status?: Maybe<Scalars['String']>;
};

/** Scope of the Port */
export enum ContractStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE'
}

export type DeleteConditionReturn = {
  __typename?: 'DeleteConditionReturn';
  id: Scalars['ID'];
};

export type DeleteConditionSnapshotReturn = {
  __typename?: 'DeleteConditionSnapshotReturn';
  id: Scalars['ID'];
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

export type DescendendInput = {
  /** Is this a bold leaf? */
  bold?: InputMaybe<Scalars['Boolean']>;
  children?: InputMaybe<Array<InputMaybe<DescendendInput>>>;
  /** Is this a code leaf? */
  code?: InputMaybe<Scalars['Boolean']>;
  /** Is this a italic leaf? */
  italic?: InputMaybe<Scalars['Boolean']>;
  /** The text of the leaf */
  text?: InputMaybe<Scalars['String']>;
  /** The type of the descendent */
  typename?: InputMaybe<Scalars['String']>;
  /** The user that is mentioned */
  user?: InputMaybe<Scalars['String']>;
};

/** A descendent of a node in the comment tree */
export type Descendent = {
  typename?: Maybe<Scalars['String']>;
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

/** Event Type for the Event Operator */
export enum EventTypeInput {
  /** COMPLETE (Value is none) */
  Complete = 'COMPLETE',
  /** Error (Value represent Exception) */
  Error = 'ERROR',
  /** NEXT (Value represent Item) */
  Next = 'NEXT',
  /** UNKNOWN (Should never be used) */
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
  conditions: Array<Condition>;
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdWhile?: Maybe<Scalars['String']>;
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']>;
  edges?: Maybe<Scalars['GenericScalar']>;
  graph: FlowGraph;
  hash: Scalars['String'];
  id: Scalars['ID'];
  name: Scalars['String'];
  nodes?: Maybe<Scalars['GenericScalar']>;
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that have pinned the position */
  pinnedBy: Array<User>;
  position?: Maybe<Array<Maybe<Scalars['Int']>>>;
  restrict?: Maybe<Scalars['GenericScalar']>;
  runs: Array<Run>;
  screenshot?: Maybe<Scalars['String']>;
  version: Scalars['String'];
  workspace?: Maybe<Workspace>;
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
  args: Array<Maybe<Port>>;
  edges: Array<Maybe<FlowEdge>>;
  globals: Array<Maybe<Global>>;
  nodes: Array<Maybe<FlowNode>>;
  position?: Maybe<Array<Maybe<Scalars['Int']>>>;
  returns: Array<Maybe<Port>>;
  zoom?: Maybe<Scalars['Float']>;
};

export type FlowNode = {
  id: Scalars['String'];
  parentNode?: Maybe<Scalars['ID']>;
  position: Position;
  typename: Scalars['String'];
};

export type FlowNodeCommons = {
  constants?: Maybe<Scalars['GenericScalar']>;
  constream: Array<Maybe<Array<Maybe<Port>>>>;
  defaults?: Maybe<Scalars['GenericScalar']>;
  documentation?: Maybe<Scalars['String']>;
  instream: Array<Maybe<Array<Maybe<Port>>>>;
  outstream: Array<Maybe<Array<Maybe<Port>>>>;
};

export type Global = {
  __typename?: 'Global';
  port: Port;
  toKeys: Array<Maybe<Scalars['String']>>;
};

export type GlobalInput = {
  port: PortInput;
  toKeys: Array<InputMaybe<Scalars['String']>>;
};

export type GraphInput = {
  args: Array<InputMaybe<PortInput>>;
  edges: Array<InputMaybe<EdgeInput>>;
  globals: Array<InputMaybe<GlobalInput>>;
  nodes: Array<InputMaybe<NodeInput>>;
  returns: Array<InputMaybe<PortInput>>;
  zoom?: InputMaybe<Scalars['Float']>;
};

export type GraphNode = FlowNode & FlowNodeCommons & {
  __typename?: 'GraphNode';
  constants?: Maybe<Scalars['GenericScalar']>;
  constream: Array<Maybe<Array<Maybe<Port>>>>;
  defaults?: Maybe<Scalars['GenericScalar']>;
  documentation?: Maybe<Scalars['String']>;
  hash: Scalars['String'];
  id: Scalars['String'];
  instream: Array<Maybe<Array<Maybe<Port>>>>;
  name?: Maybe<Scalars['String']>;
  outstream: Array<Maybe<Array<Maybe<Port>>>>;
  parentNode?: Maybe<Scalars['ID']>;
  position: Position;
  typename: Scalars['String'];
};

export type Group = {
  __typename?: 'Group';
  id: Scalars['ID'];
  name: Scalars['String'];
  permissions: Array<Permission>;
  /** The groups this user belongs to. A user will get all permissions granted to each of their groups. */
  userSet: Array<User>;
};

export type GroupAssignment = {
  __typename?: 'GroupAssignment';
  /** A query that returns an image path */
  group: Group;
  permissions: Array<Maybe<Scalars['String']>>;
};

export type GroupAssignmentInput = {
  group: Scalars['ID'];
  permissions: Array<InputMaybe<Scalars['String']>>;
};

export type KwargNode = FlowNode & FlowNodeCommons & {
  __typename?: 'KwargNode';
  constants?: Maybe<Scalars['GenericScalar']>;
  constream: Array<Maybe<Array<Maybe<Port>>>>;
  defaults?: Maybe<Scalars['GenericScalar']>;
  documentation?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  instream: Array<Maybe<Array<Maybe<Port>>>>;
  outstream: Array<Maybe<Array<Maybe<Port>>>>;
  parentNode?: Maybe<Scalars['ID']>;
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

/** A leaf in the comment tree. Representations some sort of text */
export type Leaf = Descendent & {
  __typename?: 'Leaf';
  /** Is this a bold leaf? */
  bold?: Maybe<Scalars['Boolean']>;
  /** Is this a code leaf? */
  code?: Maybe<Scalars['Boolean']>;
  /** Is this a italic leaf? */
  italic?: Maybe<Scalars['Boolean']>;
  /** The text of the leaf */
  text?: Maybe<Scalars['String']>;
  typename?: Maybe<Scalars['String']>;
};

export type LocalNode = FlowNode & FlowNodeCommons & {
  __typename?: 'LocalNode';
  allowLocal: Scalars['Boolean'];
  assignTimeout: Scalars['Float'];
  constants?: Maybe<Scalars['GenericScalar']>;
  constream: Array<Maybe<Array<Maybe<Port>>>>;
  defaults?: Maybe<Scalars['GenericScalar']>;
  description?: Maybe<Scalars['String']>;
  documentation?: Maybe<Scalars['String']>;
  hash: Scalars['String'];
  id: Scalars['String'];
  instream: Array<Maybe<Array<Maybe<Port>>>>;
  interface: Scalars['String'];
  kind: Scalars['String'];
  mapStrategy: MapStrategy;
  name?: Maybe<Scalars['String']>;
  outstream: Array<Maybe<Array<Maybe<Port>>>>;
  parentNode?: Maybe<Scalars['ID']>;
  position: Position;
  typename: Scalars['String'];
  yieldTimeout: Scalars['Float'];
};

/** Maping Strategy for the Map Operator */
export enum MapStrategy {
  AsCompleted = 'AS_COMPLETED',
  Map = 'MAP',
  Ordered = 'ORDERED'
}

/** A mention in the comment tree. This  is a reference to another user on the platform */
export type MentionDescendent = CommentNode & Descendent & {
  __typename?: 'MentionDescendent';
  children?: Maybe<Array<Maybe<Descendent>>>;
  typename?: Maybe<Scalars['String']>;
  untypedChildren?: Maybe<Scalars['GenericScalar']>;
  /** The user that is mentioned */
  user: User;
};

export type MentionEvent = {
  __typename?: 'MentionEvent';
  create?: Maybe<Comment>;
  deleted?: Maybe<Scalars['ID']>;
  update?: Maybe<Comment>;
};

/** The root Mutation */
export type Mutation = {
  __typename?: 'Mutation';
  alog?: Maybe<RunLog>;
  /** Creates a Sample */
  changePermissions?: Maybe<ChangePermissionsResult>;
  /**
   * Create an Comment
   *
   *     This mutation creates a comment. It takes a commentable_id and a commentable_type.
   *     If this is the first comment on the commentable, it will create a new comment thread.
   *     If there is already a comment thread, it will add the comment to the thread (by setting
   *     it's parent to the last parent comment in the thread).
   *
   *     CreateComment takes a list of Descendents, which are the comment tree. The Descendents
   *     are a recursive structure, where each Descendent can have a list of Descendents as children.
   *     The Descendents are either a Leaf, which is a text node, or a MentionDescendent, which is a
   *     reference to another user on the platform.
   *
   *     Please convert your comment tree to a list of Descendents before sending it to the server.
   *     TODO: Add a converter from a comment tree to a list of Descendents.
   *
   *
   *     (only signed in users)
   */
  createComment?: Maybe<Comment>;
  createCondition?: Maybe<Condition>;
  createConditionSnapshot?: Maybe<ConditionSnapshot>;
  deleteCondition?: Maybe<DeleteConditionReturn>;
  deleteConditionSnapshot?: Maybe<DeleteConditionSnapshotReturn>;
  deleteFlow?: Maybe<DeleteFlowReturn>;
  deleteRun?: Maybe<DeleteRunReturn>;
  deleteSnapshot?: Maybe<DeleteSnapshotReturn>;
  deleteWorkspace?: Maybe<DeleteWorkspaceReturn>;
  drawvanilla?: Maybe<Workspace>;
  importflow?: Maybe<Workspace>;
  /**
   * Pin Condition
   *
   *     This mutation pins an Runs and returns the pinned Run.
   */
  pinCondition?: Maybe<Condition>;
  /**
   * Pin Run
   *
   *     This mutation pins an Runs and returns the pinned Run.
   */
  pinFlow?: Maybe<Flow>;
  /**
   * Pin Run
   *
   *     This mutation pins an Runs and returns the pinned Run.
   */
  pinRun?: Maybe<Run>;
  /**
   * Pin Run
   *
   *     This mutation pins an Runs and returns the pinned Run.
   */
  pinWorkspace?: Maybe<Workspace>;
  /**
   * Reply to an Comment
   *
   *     This mutation creates a comment. It takes a commentable_id and a commentable_type.
   *     If this is the first comment on the commentable, it will create a new comment thread.
   *     If there is already a comment thread, it will add the comment to the thread (by setting
   *     it's parent to the last parent comment in the thread).
   *
   *     CreateComment takes a list of Descendents, which are the comment tree. The Descendents
   *     are a recursive structure, where each Descendent can have a list of Descendents as children.
   *     The Descendents are either a Leaf, which is a text node, or a MentionDescendent, which is a
   *     reference to another user on the platform.
   *
   *     Please convert your comment tree to a list of Descendents before sending it to the server.
   *     TODO: Add a converter from a comment tree to a list of Descendents.
   *
   *
   *     (only signed in users)
   */
  replyTo?: Maybe<Comment>;
  /**
   * Create an Comment
   *
   *     This mutation resolves a comment. By resolving a comment, it will be marked as resolved,
   *     and the user that resolved it will be set as the resolver.
   *
   *     (only signed in users)
   */
  resolveComment?: Maybe<Comment>;
  snapshot?: Maybe<Snapshot>;
  start?: Maybe<Run>;
  trace?: Maybe<ConditionEvent>;
  track?: Maybe<RunEvent>;
  updateworkspace?: Maybe<Workspace>;
};


/** The root Mutation */
export type MutationAlogArgs = {
  message: Scalars['String'];
  run: Scalars['ID'];
};


/** The root Mutation */
export type MutationChangePermissionsArgs = {
  groupAssignments?: InputMaybe<Array<InputMaybe<GroupAssignmentInput>>>;
  object: Scalars['ID'];
  type: SharableModels;
  userAssignments?: InputMaybe<Array<InputMaybe<UserAssignmentInput>>>;
};


/** The root Mutation */
export type MutationCreateCommentArgs = {
  descendents: Array<InputMaybe<DescendendInput>>;
  object: Scalars['ID'];
  parent?: InputMaybe<Scalars['ID']>;
  type: CommentableModels;
};


/** The root Mutation */
export type MutationCreateConditionArgs = {
  flow: Scalars['ID'];
  provision: Scalars['ID'];
  snapshotInterval?: InputMaybe<Scalars['Int']>;
};


/** The root Mutation */
export type MutationCreateConditionSnapshotArgs = {
  condition: Scalars['ID'];
  events: Array<InputMaybe<Scalars['ID']>>;
};


/** The root Mutation */
export type MutationDeleteConditionArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteConditionSnapshotArgs = {
  id: Scalars['ID'];
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
  restrict?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Mutation */
export type MutationImportflowArgs = {
  graph?: InputMaybe<GraphInput>;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationPinConditionArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationPinFlowArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationPinRunArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationPinWorkspaceArgs = {
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
};


/** The root Mutation */
export type MutationReplyToArgs = {
  descendents: Array<InputMaybe<DescendendInput>>;
  parent: Scalars['ID'];
};


/** The root Mutation */
export type MutationResolveCommentArgs = {
  id: Scalars['ID'];
  imitate?: InputMaybe<Scalars['ID']>;
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
  snapshotInterval?: InputMaybe<Scalars['Int']>;
};


/** The root Mutation */
export type MutationTraceArgs = {
  condition: Scalars['ID'];
  source: Scalars['String'];
  state: ContractStatus;
  value?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationTrackArgs = {
  causedBy: Array<InputMaybe<Scalars['Int']>>;
  handle: Scalars['String'];
  run: Scalars['ID'];
  source: Scalars['String'];
  t: Scalars['Int'];
  type: EventTypeInput;
  value?: InputMaybe<Scalars['EventValue']>;
};


/** The root Mutation */
export type MutationUpdateworkspaceArgs = {
  brittle?: InputMaybe<Scalars['Boolean']>;
  graph?: InputMaybe<GraphInput>;
  id: Scalars['ID'];
  screenshot?: InputMaybe<Scalars['ImageFile']>;
};

export type NodeInput = {
  allowLocal?: InputMaybe<Scalars['Boolean']>;
  assignTimeout?: InputMaybe<Scalars['Float']>;
  binds?: InputMaybe<BindsInput>;
  constream: Array<InputMaybe<Array<InputMaybe<PortInput>>>>;
  defaults?: InputMaybe<Scalars['GenericScalar']>;
  description?: InputMaybe<Scalars['String']>;
  documentation?: InputMaybe<Scalars['String']>;
  extra?: InputMaybe<Scalars['GenericScalar']>;
  hash?: InputMaybe<Scalars['String']>;
  id: Scalars['String'];
  implementation?: InputMaybe<ReactiveImplementationModelInput>;
  instream: Array<InputMaybe<Array<InputMaybe<PortInput>>>>;
  interface?: InputMaybe<Scalars['String']>;
  kind?: InputMaybe<Scalars['String']>;
  mapStrategy?: InputMaybe<MapStrategy>;
  name?: InputMaybe<Scalars['String']>;
  outstream: Array<InputMaybe<Array<InputMaybe<PortInput>>>>;
  parentNode?: InputMaybe<Scalars['ID']>;
  position: PositionInput;
  reserveTimeout?: InputMaybe<Scalars['Float']>;
  typename: Scalars['String'];
  yieldTimeout?: InputMaybe<Scalars['Float']>;
};

/** A paragraph in the comment tree. This paragraph contains other nodes (list nodes) */
export type ParagraphDescendent = CommentNode & Descendent & {
  __typename?: 'ParagraphDescendent';
  children?: Maybe<Array<Maybe<Descendent>>>;
  /** The size of the paragraph */
  size?: Maybe<Scalars['String']>;
  typename?: Maybe<Scalars['String']>;
  untypedChildren?: Maybe<Scalars['GenericScalar']>;
};

/**
 * A Permission object
 *
 * This object represents a permission in the system. Permissions are
 * used to control access to different parts of the system. Permissions
 * are assigned to groups and users. A user has access to a part of the
 * system if the user is a member of a group that has the permission
 * assigned to it.
 */
export type Permission = {
  __typename?: 'Permission';
  codename: Scalars['String'];
  groupSet: Array<Group>;
  id: Scalars['ID'];
  name: Scalars['String'];
  /** Unique ID for this permission */
  unique: Scalars['String'];
  /** Specific permissions for this user. */
  userSet: Array<User>;
};

export type PermissionsOfReturn = {
  __typename?: 'PermissionsOfReturn';
  available?: Maybe<Array<Maybe<Permission>>>;
  groupAssignments?: Maybe<Array<Maybe<GroupAssignment>>>;
  userAssignments?: Maybe<Array<Maybe<UserAssignment>>>;
};

export type Port = {
  __typename?: 'Port';
  assignWidget?: Maybe<Widget>;
  child?: Maybe<PortChild>;
  default?: Maybe<Scalars['Any']>;
  description?: Maybe<Scalars['String']>;
  identifier?: Maybe<Scalars['String']>;
  key: Scalars['String'];
  kind: StreamKind;
  label?: Maybe<Scalars['String']>;
  /** The key of the arg */
  nullable: Scalars['Boolean'];
  returnWidget?: Maybe<ReturnWidget>;
  scope: Scope;
};

export type PortChild = {
  __typename?: 'PortChild';
  /** Description of the Widget */
  assignWidget?: Maybe<Widget>;
  child?: Maybe<PortChild>;
  identifier?: Maybe<Scalars['String']>;
  kind: StreamKind;
  nullable: Scalars['Boolean'];
  /** A return widget */
  returnWidget?: Maybe<ReturnWidget>;
  scope: Scope;
};

export type PortInput = {
  /** The child of this argument */
  assignWidget?: InputMaybe<WidgetInput>;
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
  returnWidget?: InputMaybe<ReturnWidgetInput>;
  /** The scope of this argument */
  scope: Scope;
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
  comment?: Maybe<Comment>;
  /**
   * Comments for a specific object
   *
   *     This query returns all comments for a specific object. The object is
   *     specified by the `model` and `id` arguments. The `model` argument is
   *     a string that is the name of the model. The `id` argument is the id of
   *     the object.
   *
   *     You can only query for comments for objects that you have access to.
   *
   *
   */
  commentsfor?: Maybe<Array<Maybe<Comment>>>;
  condition?: Maybe<Condition>;
  conditionEventsBetween?: Maybe<Array<Maybe<ConditionEvent>>>;
  conditionSnapshot?: Maybe<ConditionSnapshot>;
  conditionSnapshots?: Maybe<Array<Maybe<ConditionSnapshot>>>;
  conditions?: Maybe<Array<Maybe<Condition>>>;
  eventsBetween?: Maybe<Array<Maybe<RunEvent>>>;
  flow?: Maybe<Flow>;
  flows?: Maybe<Array<Maybe<Flow>>>;
  hello?: Maybe<Scalars['String']>;
  me?: Maybe<User>;
  myconditions?: Maybe<Array<Maybe<Condition>>>;
  myflows?: Maybe<Array<Maybe<Flow>>>;
  mymentions?: Maybe<Array<Maybe<Comment>>>;
  myruns?: Maybe<Array<Maybe<Run>>>;
  myworkspaces?: Maybe<Array<Maybe<Workspace>>>;
  permissionsFor?: Maybe<Array<Maybe<Permission>>>;
  permissionsOf?: Maybe<PermissionsOfReturn>;
  reactivetemplate?: Maybe<ReactiveTemplate>;
  reactivetemplates?: Maybe<Array<Maybe<ReactiveTemplate>>>;
  run?: Maybe<Run>;
  runLogs?: Maybe<Array<Maybe<RunLog>>>;
  runs?: Maybe<Array<Maybe<Run>>>;
  snapshot?: Maybe<Snapshot>;
  snapshots?: Maybe<Array<Maybe<Snapshot>>>;
  user?: Maybe<User>;
  /** Get a list of users */
  users?: Maybe<Array<Maybe<User>>>;
  void?: Maybe<Scalars['String']>;
  workspace?: Maybe<Workspace>;
  workspaces?: Maybe<Array<Maybe<Workspace>>>;
};


/** The root Query */
export type QueryCommentArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryCommentsforArgs = {
  deep?: InputMaybe<Scalars['Boolean']>;
  id?: InputMaybe<Scalars['ID']>;
  model: CommentableModels;
};


/** The root Query */
export type QueryConditionArgs = {
  id?: InputMaybe<Scalars['ID']>;
  provision?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryConditionEventsBetweenArgs = {
  condition: Scalars['ID'];
  max?: InputMaybe<Scalars['DateTime']>;
  min?: InputMaybe<Scalars['DateTime']>;
};


/** The root Query */
export type QueryConditionSnapshotArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryConditionSnapshotsArgs = {
  condition?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};


/** The root Query */
export type QueryConditionsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
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
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  workspace?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryMyconditionsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
};


/** The root Query */
export type QueryMyflowsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  workspace?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryMyrunsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
};


/** The root Query */
export type QueryMyworkspacesArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  search?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryPermissionsForArgs = {
  model: SharableModels;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryPermissionsOfArgs = {
  id: Scalars['ID'];
  model: SharableModels;
};


/** The root Query */
export type QueryReactivetemplateArgs = {
  id?: InputMaybe<Scalars['ID']>;
  implementation?: InputMaybe<ReactiveImplementationModelInput>;
};


/** The root Query */
export type QueryReactivetemplatesArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  name?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryRunArgs = {
  assignation?: InputMaybe<Scalars['ID']>;
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryRunLogsArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  run?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryRunsArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
};


/** The root Query */
export type QuerySnapshotArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QuerySnapshotsArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  run?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryUserArgs = {
  email?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryUsersArgs = {
  email?: InputMaybe<Scalars['String']>;
  search?: InputMaybe<Scalars['String']>;
  username?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryWorkspaceArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryWorkspacesArgs = {
  createdAfter?: InputMaybe<Scalars['DateTime']>;
  createdAt?: InputMaybe<Scalars['DateTime']>;
  createdBefore?: InputMaybe<Scalars['DateTime']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
  createdWhile?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  pinned?: InputMaybe<Scalars['Boolean']>;
  search?: InputMaybe<Scalars['String']>;
};

/** An enumeration. */
export enum ReactiveImplementationModelInput {
  /** ALL (establish if all values are Trueish) */
  All = 'ALL',
  /** AND (AND condition) */
  And = 'AND',
  /** BUFFER_COMPLETE (Buffer values until complete is retrieved) */
  BufferComplete = 'BUFFER_COMPLETE',
  /** BUFFER_UNTIL (Buffer values until signal is send) */
  BufferUntil = 'BUFFER_UNTIL',
  /** CHUNK (Chunk the data) */
  Chunk = 'CHUNK',
  /** COMBINELATEST (Combine values with latest value from each stream) */
  Combinelatest = 'COMBINELATEST',
  /** ENSURE (Ensure the data (discards None in the stream)) */
  Ensure = 'ENSURE',
  /** FOREACH (Foreach element in list) */
  Foreach = 'FOREACH',
  /** GATE (Gate the data, first value is gated, second is gate) */
  Gate = 'GATE',
  /** IF (If condition is met) */
  If = 'IF',
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
  constream: Array<Maybe<Array<Maybe<Port>>>>;
  defaults?: Maybe<Scalars['GenericScalar']>;
  documentation?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  implementation: ReactiveImplementationModelInput;
  instream: Array<Maybe<Array<Maybe<Port>>>>;
  outstream: Array<Maybe<Array<Maybe<Port>>>>;
  parentNode?: Maybe<Scalars['ID']>;
  position: Position;
  typename: Scalars['String'];
};

export type ReactiveTemplate = {
  __typename?: 'ReactiveTemplate';
  constants?: Maybe<Array<Maybe<Port>>>;
  constream: Array<Maybe<Array<Maybe<Port>>>>;
  defaults?: Maybe<Scalars['GenericScalar']>;
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  implementation: ReactiveImplementationModelInput;
  instream: Array<Maybe<Array<Maybe<Port>>>>;
  name: Scalars['String'];
  outstream: Array<Maybe<Array<Maybe<Port>>>>;
};

export type ReturnNode = FlowNode & FlowNodeCommons & {
  __typename?: 'ReturnNode';
  constants?: Maybe<Scalars['GenericScalar']>;
  constream: Array<Maybe<Array<Maybe<Port>>>>;
  defaults?: Maybe<Scalars['GenericScalar']>;
  documentation?: Maybe<Scalars['String']>;
  id: Scalars['String'];
  instream: Array<Maybe<Array<Maybe<Port>>>>;
  outstream: Array<Maybe<Array<Maybe<Port>>>>;
  parentNode?: Maybe<Scalars['ID']>;
  position: Position;
  typename: Scalars['String'];
};

export type ReturnWidget = {
  __typename?: 'ReturnWidget';
  /** The dependencies of this port */
  choices?: Maybe<Array<Maybe<Choice>>>;
  /** The dependencies of this port */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** type */
  kind: Scalars['String'];
  /** Do we have a possible */
  query?: Maybe<Scalars['String']>;
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
  createdBy?: Maybe<User>;
  createdWhile?: Maybe<Scalars['String']>;
  events: Array<RunEvent>;
  flow?: Maybe<Flow>;
  id: Scalars['ID'];
  latestSnapshot?: Maybe<Snapshot>;
  logs: Array<RunLog>;
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that have pinned the position */
  pinnedBy: Array<User>;
  snapshotInterval?: Maybe<Scalars['Int']>;
  snapshots: Array<Snapshot>;
  status?: Maybe<Scalars['String']>;
};

export type RunEvent = {
  __typename?: 'RunEvent';
  causedBy?: Maybe<Array<Maybe<Scalars['Int']>>>;
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
  /** COMPLETE (Value is none) */
  Complete = 'COMPLETE',
  /** Error (Value represent Exception) */
  Error = 'ERROR',
  /** NEXT (Value represent Item) */
  Next = 'NEXT',
  /** UNKNOWN (Should never be used) */
  Unknown = 'UNKNOWN'
}

export type RunLog = {
  __typename?: 'RunLog';
  id: Scalars['ID'];
  log?: Maybe<Scalars['String']>;
  node: Scalars['String'];
  run?: Maybe<Run>;
};

/** Scope of the Port */
export enum Scope {
  Global = 'GLOBAL',
  Local = 'LOCAL'
}

/** Sharable Models are models that can be shared amongst users and groups. They representent the models of the DB */
export enum SharableModels {
  FlowCondition = 'FLOW_CONDITION',
  FlowConditionevent = 'FLOW_CONDITIONEVENT',
  FlowConditionsnapshot = 'FLOW_CONDITIONSNAPSHOT',
  FlowFlow = 'FLOW_FLOW',
  FlowReactivetemplate = 'FLOW_REACTIVETEMPLATE',
  FlowRun = 'FLOW_RUN',
  FlowRunevent = 'FLOW_RUNEVENT',
  FlowRunlog = 'FLOW_RUNLOG',
  FlowSnapshot = 'FLOW_SNAPSHOT',
  FlowWorkspace = 'FLOW_WORKSPACE'
}

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
  scope: Scope;
};

export type StreamItemChild = {
  __typename?: 'StreamItemChild';
  child?: Maybe<StreamItemChild>;
  identifier?: Maybe<Scalars['String']>;
  kind: StreamKind;
  nullable: Scalars['Boolean'];
  scope: Scope;
};

export type StreamItemChildInput = {
  child?: InputMaybe<StreamItemChildInput>;
  identifier?: InputMaybe<Scalars['String']>;
  kind: StreamKind;
  nullable: Scalars['Boolean'];
  /** The scope of this argument */
  scope: Scope;
};

export type StreamItemInput = {
  child?: InputMaybe<StreamItemChildInput>;
  identifier?: InputMaybe<Scalars['String']>;
  key: Scalars['String'];
  kind: StreamKind;
  nullable: Scalars['Boolean'];
  /** The scope of this argument */
  scope: Scope;
};

export enum StreamKind {
  Bool = 'BOOL',
  Dict = 'DICT',
  Enum = 'ENUM',
  Float = 'FLOAT',
  Int = 'INT',
  List = 'LIST',
  String = 'STRING',
  Structure = 'STRUCTURE',
  Unset = 'UNSET'
}

/** The root Subscriptions */
export type Subscription = {
  __typename?: 'Subscription';
  conditionevents?: Maybe<ConditionEvents>;
  events?: Maybe<Event>;
  /**
   * My Mentions
   *
   *     Returns an event of a new mention for the user if the user
   *     was mentioned in a comment.
   *
   */
  mymentions?: Maybe<MentionEvent>;
};


/** The root Subscriptions */
export type SubscriptionConditioneventsArgs = {
  id: Scalars['ID'];
};


/** The root Subscriptions */
export type SubscriptionEventsArgs = {
  id: Scalars['ID'];
};

/** A reflection on the real User */
export type User = {
  __typename?: 'User';
  /** The associated color for this user */
  color?: Maybe<Scalars['String']>;
  comments: Array<Comment>;
  conditionCreatedBy: Array<Condition>;
  dateJoined: Scalars['DateTime'];
  email: Scalars['String'];
  firstName: Scalars['String'];
  flowCreatedBy: Array<Flow>;
  flowSet: Array<Flow>;
  /** The groups this user belongs to. A user will get all permissions granted to each of their groups. */
  groups: Array<Group>;
  id: Scalars['ID'];
  /** Designates whether this user should be treated as active. Unselect this instead of deleting accounts. */
  isActive: Scalars['Boolean'];
  /** Designates whether the user can log into this admin site. */
  isStaff: Scalars['Boolean'];
  /** Designates that this user has all permissions without explicitly assigning them. */
  isSuperuser: Scalars['Boolean'];
  iss?: Maybe<Scalars['String']>;
  lastLogin?: Maybe<Scalars['DateTime']>;
  lastName: Scalars['String'];
  mentionedIn: Array<Comment>;
  /** The name of the user */
  name?: Maybe<Scalars['String']>;
  password: Scalars['String'];
  /** The users that have pinned the position */
  pinnedConditions: Array<Condition>;
  /** The users that have pinned the position */
  pinnedFlows: Array<Flow>;
  /** The users that have pinned the position */
  pinnedRuns: Array<Run>;
  /** The users that have pinned the position */
  pinnedWorkspaces: Array<Workspace>;
  resolvedComments: Array<Comment>;
  runCreatedBy: Array<Run>;
  /** The sub of the user */
  sub?: Maybe<Scalars['String']>;
  /** Specific permissions for this user. */
  userPermissions: Array<Permission>;
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username: Scalars['String'];
  workspaceCreatedBy: Array<Workspace>;
  workspaceSet: Array<Workspace>;
};

export type UserAssignment = {
  __typename?: 'UserAssignment';
  permissions: Array<Maybe<Scalars['String']>>;
  /** A query that returns an image path */
  user: User;
};

export type UserAssignmentInput = {
  permissions: Array<InputMaybe<Scalars['String']>>;
  /** The user id */
  user: Scalars['String'];
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

export type Workspace = {
  __typename?: 'Workspace';
  createdAt: Scalars['DateTime'];
  createdBy?: Maybe<User>;
  createdWhile?: Maybe<Scalars['String']>;
  creator?: Maybe<User>;
  flows: Array<Flow>;
  id: Scalars['ID'];
  /** The latest flow */
  latestFlow?: Maybe<Flow>;
  name?: Maybe<Scalars['String']>;
  pinned?: Maybe<Scalars['Boolean']>;
  /** The users that have pinned the position */
  pinnedBy: Array<User>;
  restrict: Array<Maybe<Scalars['String']>>;
};

export type LeafFragment = { __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' };

type Node_MentionDescendent_Fragment = { __typename?: 'MentionDescendent', typename: 'MentionDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

type Node_ParagraphDescendent_Fragment = { __typename?: 'ParagraphDescendent', typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

export type NodeFragment = Node_MentionDescendent_Fragment | Node_ParagraphDescendent_Fragment;

export type LevelDownParagraphFragment = { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null };

export type LevelDownMentionFragment = { __typename?: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } };

type LevelDownDescendent_Leaf_Fragment = { __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' };

type LevelDownDescendent_MentionDescendent_Fragment = { __typename?: 'MentionDescendent', typename: 'MentionDescendent' };

type LevelDownDescendent_ParagraphDescendent_Fragment = { __typename?: 'ParagraphDescendent', typename: 'ParagraphDescendent' };

export type LevelDownDescendentFragment = LevelDownDescendent_Leaf_Fragment | LevelDownDescendent_MentionDescendent_Fragment | LevelDownDescendent_ParagraphDescendent_Fragment;

export type MentionFragment = { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

export type ParagraphFragment = { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

type Descendent_Leaf_Fragment = { __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' };

type Descendent_MentionDescendent_Fragment = { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

type Descendent_ParagraphDescendent_Fragment = { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null };

export type DescendentFragment = Descendent_Leaf_Fragment | Descendent_MentionDescendent_Fragment | Descendent_ParagraphDescendent_Fragment;

export type SubthreadCommentFragment = { __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null };

export type ListCommentFragment = { __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null };

export type MentionCommentFragment = { __typename?: 'Comment', id: string, createdAt: any, resolved?: any | null, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', id: string, sub?: string | null }>, resolvedBy?: { __typename?: 'User', sub?: string | null } | null };

export type DetailCommentFragment = { __typename?: 'Comment', id: string, resolved?: any | null, createdAt: any, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', sub?: string | null }> };

export type ConditionSnapshotFragment = { __typename?: 'ConditionSnapshot', id: string, status?: string | null, condition?: { __typename?: 'Condition', id: string, provision?: string | null } | null, events: Array<{ __typename?: 'ConditionEvent', id: string, source?: string | null, createdAt: any, value: string, state: ContractStatus }> };

export type ListConditionSnapshotFragment = { __typename?: 'ConditionSnapshot', id: string, condition?: { __typename?: 'Condition', id: string, provision?: string | null } | null };

export type ConditionFragment = { __typename?: 'Condition', id: string, provision?: string | null, createdAt: any, snapshots: Array<{ __typename?: 'ConditionSnapshot', id: string, status?: string | null, createdAt: any }>, latestSnapshot?: { __typename?: 'ConditionSnapshot', createdAt: any, events: Array<{ __typename?: 'ConditionEvent', id: string, source?: string | null, createdAt: any, value: string, state: ContractStatus }> } | null, flow?: { __typename: 'Flow', id: string, restrict?: any | null, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'GraphNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'LocalNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, parentNode?: string | null, implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', toKeys: Array<string | null>, port: { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } } | null>, args: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null>, returns: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> }, workspace?: { __typename?: 'Workspace', id: string } | null } | null };

export type ListConditionFragment = { __typename?: 'Condition', id: string, provision?: string | null, createdAt: any, flow?: { __typename?: 'Flow', id: string, name: string, workspace?: { __typename?: 'Workspace', name?: string | null } | null } | null };

export type ConditionEventFragment = { __typename?: 'ConditionEvent', id: string, source?: string | null, createdAt: any, value: string, state: ContractStatus };

type FlowNodeCommons_ArgNode_Fragment = { __typename?: 'ArgNode', constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNodeCommons_ArkitektNode_Fragment = { __typename?: 'ArkitektNode', constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNodeCommons_GraphNode_Fragment = { __typename?: 'GraphNode', constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNodeCommons_KwargNode_Fragment = { __typename?: 'KwargNode', constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNodeCommons_LocalNode_Fragment = { __typename?: 'LocalNode', constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNodeCommons_ReactiveNode_Fragment = { __typename?: 'ReactiveNode', constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNodeCommons_ReturnNode_Fragment = { __typename?: 'ReturnNode', constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

export type FlowNodeCommonsFragment = FlowNodeCommons_ArgNode_Fragment | FlowNodeCommons_ArkitektNode_Fragment | FlowNodeCommons_GraphNode_Fragment | FlowNodeCommons_KwargNode_Fragment | FlowNodeCommons_LocalNode_Fragment | FlowNodeCommons_ReactiveNode_Fragment | FlowNodeCommons_ReturnNode_Fragment;

export type ArkitektNodeFragment = { __typename: 'ArkitektNode', name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

export type LocalNodeFragment = { __typename: 'LocalNode', name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

export type ReactiveNodeFragment = { __typename: 'ReactiveNode', implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

export type WidgetFragment = { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null };

export type ReturnWidgetFragment = { __typename?: 'ReturnWidget', kind: string, query?: string | null };

export type PortChildFragment = { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null };

export type PortFragment = { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null };

export type ArgNodeFragment = { __typename: 'ArgNode', constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

export type KwargNodeFragment = { __typename: 'KwargNode', constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

export type ReturnNodeFragment = { __typename: 'ReturnNode', constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

export type GraphNodeFragment = { __typename: 'GraphNode', constants?: any | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNode_ArgNode_Fragment = { __typename: 'ArgNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNode_ArkitektNode_Fragment = { __typename: 'ArkitektNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNode_GraphNode_Fragment = { __typename: 'GraphNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNode_KwargNode_Fragment = { __typename: 'KwargNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNode_LocalNode_Fragment = { __typename: 'LocalNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNode_ReactiveNode_Fragment = { __typename: 'ReactiveNode', id: string, typename: string, parentNode?: string | null, implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

type FlowNode_ReturnNode_Fragment = { __typename: 'ReturnNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> };

export type FlowNodeFragment = FlowNode_ArgNode_Fragment | FlowNode_ArkitektNode_Fragment | FlowNode_GraphNode_Fragment | FlowNode_KwargNode_Fragment | FlowNode_LocalNode_Fragment | FlowNode_ReactiveNode_Fragment | FlowNode_ReturnNode_Fragment;

type FlowEdgeCommons_FancyEdge_Fragment = { __typename?: 'FancyEdge', stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> };

type FlowEdgeCommons_LabeledEdge_Fragment = { __typename?: 'LabeledEdge', stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> };

export type FlowEdgeCommonsFragment = FlowEdgeCommons_FancyEdge_Fragment | FlowEdgeCommons_LabeledEdge_Fragment;

export type LabeledEdgeFragment = { __typename: 'LabeledEdge', stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> };

export type FancyEdgeFragment = { __typename: 'FancyEdge', stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> };

type FlowEdge_FancyEdge_Fragment = { __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> };

type FlowEdge_LabeledEdge_Fragment = { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> };

export type FlowEdgeFragment = FlowEdge_FancyEdge_Fragment | FlowEdge_LabeledEdge_Fragment;

export type GlobalFragment = { __typename?: 'Global', toKeys: Array<string | null>, port: { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } };

export type StreamItemChildFragment = { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null };

export type StreamItemFragment = { __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null };

export type FlowFragment = { __typename: 'Flow', id: string, restrict?: any | null, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'GraphNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'LocalNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, parentNode?: string | null, implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', toKeys: Array<string | null>, port: { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } } | null>, args: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null>, returns: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> }, workspace?: { __typename?: 'Workspace', id: string } | null };

export type ListFlowFragment = { __typename?: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, workspace?: { __typename?: 'Workspace', id: string } | null };

export type ListWorkspaceFragment = { __typename?: 'Workspace', id: string, name?: string | null, latestFlow?: { __typename?: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, workspace?: { __typename?: 'Workspace', id: string } | null } | null };

export type WorkspaceFragment = { __typename?: 'Workspace', id: string, name?: string | null, latestFlow?: { __typename: 'Flow', id: string, restrict?: any | null, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'GraphNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'LocalNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, parentNode?: string | null, implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', toKeys: Array<string | null>, port: { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } } | null>, args: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null>, returns: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> }, workspace?: { __typename?: 'Workspace', id: string } | null } | null };

export type RunLogFragment = { __typename?: 'RunLog', id: string, node: string, log?: string | null };

export type RunEventFragment = { __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number, causedBy?: Array<number | null> | null };

export type ReactiveTemplateFragment = { __typename?: 'ReactiveTemplate', name: string, implementation: ReactiveImplementationModelInput, description?: string | null, id: string, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constants?: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null };

export type SnapshotFragment = { __typename?: 'Snapshot', id: string, status?: string | null, t: number, run?: { __typename?: 'Run', id: string, assignation?: string | null } | null, events: Array<{ __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number, causedBy?: Array<number | null> | null }> };

export type ListSnapshotFragment = { __typename?: 'Snapshot', id: string, t: number, run?: { __typename?: 'Run', id: string, assignation?: string | null } | null };

export type RunFragment = { __typename?: 'Run', id: string, status?: string | null, assignation?: string | null, createdAt: any, snapshots: Array<{ __typename?: 'Snapshot', id: string, status?: string | null, t: number, createdAt: any }>, latestSnapshot?: { __typename?: 'Snapshot', createdAt: any, t: number, events: Array<{ __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number, causedBy?: Array<number | null> | null }> } | null, flow?: { __typename: 'Flow', id: string, restrict?: any | null, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'GraphNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'LocalNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, parentNode?: string | null, implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', toKeys: Array<string | null>, port: { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } } | null>, args: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null>, returns: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> }, workspace?: { __typename?: 'Workspace', id: string } | null } | null };

export type ListRunFragment = { __typename?: 'Run', id: string, status?: string | null, assignation?: string | null, createdAt: any, flow?: { __typename?: 'Flow', id: string, name: string, workspace?: { __typename?: 'Workspace', name?: string | null } | null } | null };

export type CreateCommentMutationVariables = Exact<{
  id: Scalars['ID'];
  model: CommentableModels;
  descendents: Array<InputMaybe<DescendendInput>> | InputMaybe<DescendendInput>;
  parent?: InputMaybe<Scalars['ID']>;
}>;


export type CreateCommentMutation = { __typename?: 'Mutation', createComment?: { __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null };

export type ReplyToMutationVariables = Exact<{
  descendents: Array<InputMaybe<DescendendInput>> | InputMaybe<DescendendInput>;
  parent: Scalars['ID'];
}>;


export type ReplyToMutation = { __typename?: 'Mutation', replyTo?: { __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null };

export type ResolveCommentMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type ResolveCommentMutation = { __typename?: 'Mutation', resolveComment?: { __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null };

export type DeleteConditionMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteConditionMutation = { __typename?: 'Mutation', deleteCondition?: { __typename?: 'DeleteConditionReturn', id: string } | null };

export type PinConditionMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinConditionMutation = { __typename?: 'Mutation', pinCondition?: { __typename?: 'Condition', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type UpdateFlowMutationVariables = Exact<{
  id: Scalars['ID'];
  graph: GraphInput;
  screenshot?: InputMaybe<Scalars['ImageFile']>;
}>;


export type UpdateFlowMutation = { __typename?: 'Mutation', updateworkspace?: { __typename?: 'Workspace', id: string, name?: string | null, latestFlow?: { __typename: 'Flow', id: string, restrict?: any | null, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'GraphNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'LocalNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, parentNode?: string | null, implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', toKeys: Array<string | null>, port: { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } } | null>, args: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null>, returns: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> }, workspace?: { __typename?: 'Workspace', id: string } | null } | null } | null };

export type DeleteFlowMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteFlowMutation = { __typename?: 'Mutation', deleteFlow?: { __typename?: 'DeleteFlowReturn', id?: string | null } | null };

export type CreateVanillaDiagramMutationVariables = Exact<{
  name?: InputMaybe<Scalars['String']>;
  restrict?: InputMaybe<Array<InputMaybe<Scalars['String']>> | InputMaybe<Scalars['String']>>;
}>;


export type CreateVanillaDiagramMutation = { __typename?: 'Mutation', drawvanilla?: { __typename?: 'Workspace', id: string, name?: string | null, latestFlow?: { __typename: 'Flow', id: string, restrict?: any | null, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'GraphNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'LocalNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, parentNode?: string | null, implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', toKeys: Array<string | null>, port: { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } } | null>, args: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null>, returns: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> }, workspace?: { __typename?: 'Workspace', id: string } | null } | null } | null };

export type ImportFlowMutationVariables = Exact<{
  name?: InputMaybe<Scalars['String']>;
  graph: GraphInput;
}>;


export type ImportFlowMutation = { __typename?: 'Mutation', importflow?: { __typename?: 'Workspace', id: string, name?: string | null, latestFlow?: { __typename: 'Flow', id: string, restrict?: any | null, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'GraphNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'LocalNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, parentNode?: string | null, implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', toKeys: Array<string | null>, port: { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } } | null>, args: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null>, returns: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> }, workspace?: { __typename?: 'Workspace', id: string } | null } | null } | null };

export type PinFlowMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinFlowMutation = { __typename?: 'Mutation', pinFlow?: { __typename?: 'Flow', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type DeleteSnapshotMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteSnapshotMutation = { __typename?: 'Mutation', deleteSnapshot?: { __typename?: 'DeleteSnapshotReturn', id: string } | null };

export type DeleteRunMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteRunMutation = { __typename?: 'Mutation', deleteRun?: { __typename?: 'DeleteRunReturn', id: string } | null };

export type PinRunMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinRunMutation = { __typename?: 'Mutation', pinRun?: { __typename?: 'Run', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type DeleteWorkspaceMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteWorkspaceMutation = { __typename?: 'Mutation', deleteWorkspace?: { __typename?: 'DeleteWorkspaceReturn', id?: string | null } | null };

export type PinWorkspaceMutationVariables = Exact<{
  id: Scalars['ID'];
  pin: Scalars['Boolean'];
}>;


export type PinWorkspaceMutation = { __typename?: 'Mutation', pinWorkspace?: { __typename?: 'Workspace', id: string, pinned?: boolean | null, pinnedBy: Array<{ __typename?: 'User', id: string, email: string }> } | null };

export type CommentsForQueryVariables = Exact<{
  id: Scalars['ID'];
  model: CommentableModels;
}>;


export type CommentsForQuery = { __typename?: 'Query', commentsfor?: Array<{ __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null> | null };

export type MyMentionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyMentionsQuery = { __typename?: 'Query', mymentions?: Array<{ __typename?: 'Comment', id: string, createdAt: any, resolved?: any | null, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', id: string, sub?: string | null }>, resolvedBy?: { __typename?: 'User', sub?: string | null } | null } | null> | null };

export type DetailCommentQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailCommentQuery = { __typename?: 'Query', comment?: { __typename?: 'Comment', id: string, resolved?: any | null, createdAt: any, objectId: number, contentType?: CommentableModels | null, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null, mentions: Array<{ __typename?: 'User', sub?: string | null }> } | null };

export type ConditionSnapshotsQueryVariables = Exact<{ [key: string]: never; }>;


export type ConditionSnapshotsQuery = { __typename?: 'Query', conditionSnapshots?: Array<{ __typename?: 'ConditionSnapshot', id: string, condition?: { __typename?: 'Condition', id: string, provision?: string | null } | null } | null> | null };

export type DetailConditionSnapshotQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailConditionSnapshotQuery = { __typename?: 'Query', conditionSnapshot?: { __typename?: 'ConditionSnapshot', id: string, status?: string | null, condition?: { __typename?: 'Condition', id: string, provision?: string | null } | null, events: Array<{ __typename?: 'ConditionEvent', id: string, source?: string | null, createdAt: any, value: string, state: ContractStatus }> } | null };

export type ConditionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ConditionsQuery = { __typename?: 'Query', conditions?: Array<{ __typename?: 'Condition', id: string, provision?: string | null, createdAt: any, flow?: { __typename?: 'Flow', id: string, name: string, workspace?: { __typename?: 'Workspace', name?: string | null } | null } | null } | null> | null };

export type MyConditionsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyConditionsQuery = { __typename?: 'Query', myconditions?: Array<{ __typename?: 'Condition', id: string, provision?: string | null, createdAt: any, flow?: { __typename?: 'Flow', id: string, name: string, workspace?: { __typename?: 'Workspace', name?: string | null } | null } | null } | null> | null };

export type DetailConditionQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
  provision?: InputMaybe<Scalars['ID']>;
}>;


export type DetailConditionQuery = { __typename?: 'Query', condition?: { __typename?: 'Condition', id: string, provision?: string | null, createdAt: any, snapshots: Array<{ __typename?: 'ConditionSnapshot', id: string, status?: string | null, createdAt: any }>, latestSnapshot?: { __typename?: 'ConditionSnapshot', createdAt: any, events: Array<{ __typename?: 'ConditionEvent', id: string, source?: string | null, createdAt: any, value: string, state: ContractStatus }> } | null, flow?: { __typename: 'Flow', id: string, restrict?: any | null, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'GraphNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'LocalNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, parentNode?: string | null, implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', toKeys: Array<string | null>, port: { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } } | null>, args: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null>, returns: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> }, workspace?: { __typename?: 'Workspace', id: string } | null } | null } | null };

export type ConditionEventsBetweenQueryVariables = Exact<{
  id: Scalars['ID'];
  min?: InputMaybe<Scalars['DateTime']>;
  max?: InputMaybe<Scalars['DateTime']>;
}>;


export type ConditionEventsBetweenQuery = { __typename?: 'Query', conditionEventsBetween?: Array<{ __typename?: 'ConditionEvent', id: string, source?: string | null, createdAt: any, value: string, state: ContractStatus } | null> | null };

export type FlowQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
}>;


export type FlowQuery = { __typename?: 'Query', flow?: { __typename: 'Flow', id: string, restrict?: any | null, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'GraphNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'LocalNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, parentNode?: string | null, implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', toKeys: Array<string | null>, port: { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } } | null>, args: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null>, returns: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> }, workspace?: { __typename?: 'Workspace', id: string } | null } | null };

export type WorkspaceQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type WorkspaceQuery = { __typename?: 'Query', workspace?: { __typename?: 'Workspace', id: string, name?: string | null, latestFlow?: { __typename: 'Flow', id: string, restrict?: any | null, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'GraphNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'LocalNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, parentNode?: string | null, implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', toKeys: Array<string | null>, port: { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } } | null>, args: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null>, returns: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> }, workspace?: { __typename?: 'Workspace', id: string } | null } | null } | null };

export type MyWorkspacesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyWorkspacesQuery = { __typename?: 'Query', myworkspaces?: Array<{ __typename?: 'Workspace', id: string, name?: string | null, latestFlow?: { __typename?: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, workspace?: { __typename?: 'Workspace', id: string } | null } | null } | null> | null };

export type PinnedWorkspacesQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type PinnedWorkspacesQuery = { __typename?: 'Query', workspaces?: Array<{ __typename?: 'Workspace', id: string, name?: string | null, latestFlow?: { __typename?: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, workspace?: { __typename?: 'Workspace', id: string } | null } | null } | null> | null };

export type SearchWorkspacesQueryVariables = Exact<{
  name?: InputMaybe<Scalars['String']>;
}>;


export type SearchWorkspacesQuery = { __typename?: 'Query', workspaces?: Array<{ __typename?: 'Workspace', id: string, name?: string | null, latestFlow?: { __typename?: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, workspace?: { __typename?: 'Workspace', id: string } | null } | null } | null> | null };

export type SearchFlowsQueryVariables = Exact<{
  name?: InputMaybe<Scalars['String']>;
  workspace?: InputMaybe<Scalars['ID']>;
}>;


export type SearchFlowsQuery = { __typename?: 'Query', flows?: Array<{ __typename?: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, workspace?: { __typename?: 'Workspace', id: string } | null } | null> | null };

export type SnapshotsQueryVariables = Exact<{ [key: string]: never; }>;


export type SnapshotsQuery = { __typename?: 'Query', snapshots?: Array<{ __typename?: 'Snapshot', id: string, t: number, run?: { __typename?: 'Run', id: string, assignation?: string | null } | null } | null> | null };

export type DetailSnapshotQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailSnapshotQuery = { __typename?: 'Query', snapshot?: { __typename?: 'Snapshot', id: string, status?: string | null, t: number, run?: { __typename?: 'Run', id: string, assignation?: string | null } | null, events: Array<{ __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number, causedBy?: Array<number | null> | null }> } | null };

export type RunsQueryVariables = Exact<{ [key: string]: never; }>;


export type RunsQuery = { __typename?: 'Query', runs?: Array<{ __typename?: 'Run', id: string, status?: string | null, assignation?: string | null, createdAt: any, flow?: { __typename?: 'Flow', id: string, name: string, workspace?: { __typename?: 'Workspace', name?: string | null } | null } | null } | null> | null };

export type MyRunsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type MyRunsQuery = { __typename?: 'Query', myruns?: Array<{ __typename?: 'Run', id: string, status?: string | null, assignation?: string | null, createdAt: any, flow?: { __typename?: 'Flow', id: string, name: string, workspace?: { __typename?: 'Workspace', name?: string | null } | null } | null } | null> | null };

export type PinnedRunsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<Scalars['String']>;
  createdDay?: InputMaybe<Scalars['DateTime']>;
}>;


export type PinnedRunsQuery = { __typename?: 'Query', runs?: Array<{ __typename?: 'Run', id: string, status?: string | null, assignation?: string | null, createdAt: any, flow?: { __typename?: 'Flow', id: string, name: string, workspace?: { __typename?: 'Workspace', name?: string | null } | null } | null } | null> | null };

export type DetailRunQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
  assignation?: InputMaybe<Scalars['ID']>;
}>;


export type DetailRunQuery = { __typename?: 'Query', run?: { __typename?: 'Run', id: string, status?: string | null, assignation?: string | null, createdAt: any, snapshots: Array<{ __typename?: 'Snapshot', id: string, status?: string | null, t: number, createdAt: any }>, latestSnapshot?: { __typename?: 'Snapshot', createdAt: any, t: number, events: Array<{ __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number, causedBy?: Array<number | null> | null }> } | null, flow?: { __typename: 'Flow', id: string, restrict?: any | null, name: string, screenshot?: string | null, createdAt: any, graph: { __typename?: 'FlowGraph', nodes: Array<{ __typename: 'ArgNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ArkitektNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, reserveTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, binds?: { __typename?: 'Binds', clients?: Array<string | null> | null, templates?: Array<string | null> | null } | null, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'GraphNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'KwargNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'LocalNode', id: string, typename: string, parentNode?: string | null, name?: string | null, description?: string | null, interface: string, hash: string, kind: string, defaults?: any | null, mapStrategy: MapStrategy, allowLocal: boolean, assignTimeout: number, yieldTimeout: number, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReactiveNode', id: string, typename: string, parentNode?: string | null, implementation: ReactiveImplementationModelInput, defaults?: any | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | { __typename: 'ReturnNode', id: string, typename: string, parentNode?: string | null, constants?: any | null, position: { __typename?: 'Position', x: number, y: number }, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null> } | null>, edges: Array<{ __typename: 'FancyEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | { __typename: 'LabeledEdge', id: string, source: string, sourceHandle: string, target: string, targetHandle: string, typename: string, stream: Array<{ __typename?: 'StreamItem', key: string, kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', kind: StreamKind, identifier?: string | null, scope: Scope, nullable: boolean, child?: { __typename?: 'StreamItemChild', scope: Scope, kind: StreamKind, nullable: boolean, identifier?: string | null } | null } | null } | null> } | null>, globals: Array<{ __typename?: 'Global', toKeys: Array<string | null>, port: { __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } } | null>, args: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null>, returns: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> }, workspace?: { __typename?: 'Workspace', id: string } | null } | null } | null };

export type EventsBetweenQueryVariables = Exact<{
  id: Scalars['ID'];
  min?: InputMaybe<Scalars['Int']>;
  max?: InputMaybe<Scalars['Int']>;
}>;


export type EventsBetweenQuery = { __typename?: 'Query', eventsBetween?: Array<{ __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number, causedBy?: Array<number | null> | null } | null> | null };

export type FlussGlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type FlussGlobalSearchQuery = { __typename?: 'Query', workspaces?: Array<{ __typename?: 'Workspace', id: string, name?: string | null, latestFlow?: { __typename?: 'Flow', id: string, name: string, screenshot?: string | null, createdAt: any, workspace?: { __typename?: 'Workspace', id: string } | null } | null } | null> | null };

export type ReactiveTemplateQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
  implementation?: InputMaybe<ReactiveImplementationModelInput>;
}>;


export type ReactiveTemplateQuery = { __typename?: 'Query', reactivetemplate?: { __typename?: 'ReactiveTemplate', name: string, implementation: ReactiveImplementationModelInput, description?: string | null, id: string, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constants?: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null } | null };

export type DetailReactiveTemplateQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
  implementation?: InputMaybe<ReactiveImplementationModelInput>;
}>;


export type DetailReactiveTemplateQuery = { __typename?: 'Query', reactivetemplate?: { __typename?: 'ReactiveTemplate', name: string, implementation: ReactiveImplementationModelInput, description?: string | null, id: string, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constants?: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null } | null };

export type ReactiveTemplatesQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type ReactiveTemplatesQuery = { __typename?: 'Query', reactivetemplates?: Array<{ __typename?: 'ReactiveTemplate', name: string, implementation: ReactiveImplementationModelInput, description?: string | null, id: string, constream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, instream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, outstream: Array<Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null>, constants?: Array<{ __typename?: 'Port', key: string, label?: string | null, identifier?: string | null, scope: Scope, kind: StreamKind, description?: string | null, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, kind: StreamKind, scope: Scope, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', scope: Scope, identifier?: string | null, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null, child?: { __typename?: 'PortChild', identifier?: string | null, scope: Scope, kind: StreamKind, nullable: boolean, assignWidget?: { __typename?: 'Widget', kind: string, query?: string | null, hook?: string | null, ward?: string | null } | null, returnWidget?: { __typename?: 'ReturnWidget', kind: string, query?: string | null } | null } | null } | null } | null } | null> | null } | null> | null };

export type ConditionEventsSubscriptionVariables = Exact<{
  id: Scalars['ID'];
}>;


export type ConditionEventsSubscription = { __typename?: 'Subscription', conditionevents?: { __typename?: 'ConditionEvents', deleted?: string | null, create?: { __typename?: 'ConditionEvent', id: string, source?: string | null, createdAt: any, value: string, state: ContractStatus } | null, update?: { __typename?: 'ConditionEvent', id: string, source?: string | null, createdAt: any, value: string, state: ContractStatus } | null } | null };

export type EventsSubscriptionVariables = Exact<{
  id: Scalars['ID'];
}>;


export type EventsSubscription = { __typename?: 'Subscription', events?: { __typename?: 'Event', deleted?: string | null, create?: { __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number, causedBy?: Array<number | null> | null } | null, update?: { __typename?: 'RunEvent', id: string, source: string, handle: string, type: RunEventType, createdAt: any, value?: any | null, t: number, causedBy?: Array<number | null> | null } | null } | null };

export const LeafFragmentDoc = gql`
    fragment Leaf on Leaf {
  typename: __typename
  bold
  italic
  code
  text
}
    `;
export const LevelDownDescendentFragmentDoc = gql`
    fragment LevelDownDescendent on Descendent {
  typename: __typename
  ...Leaf
}
    ${LeafFragmentDoc}`;
export const LevelDownParagraphFragmentDoc = gql`
    fragment LevelDownParagraph on ParagraphDescendent {
  size
  untypedChildren
}
    `;
export const LevelDownMentionFragmentDoc = gql`
    fragment LevelDownMention on MentionDescendent {
  user {
    sub
  }
}
    `;
export const NodeFragmentDoc = gql`
    fragment Node on CommentNode {
  typename: __typename
  children {
    typename: __typename
    ...Leaf
    ...LevelDownParagraph
    ...LevelDownMention
  }
}
    ${LeafFragmentDoc}
${LevelDownParagraphFragmentDoc}
${LevelDownMentionFragmentDoc}`;
export const MentionFragmentDoc = gql`
    fragment Mention on MentionDescendent {
  user {
    sub
  }
  ...Node
}
    ${NodeFragmentDoc}`;
export const ParagraphFragmentDoc = gql`
    fragment Paragraph on ParagraphDescendent {
  size
  ...Node
}
    ${NodeFragmentDoc}`;
export const DescendentFragmentDoc = gql`
    fragment Descendent on Descendent {
  typename: __typename
  ...Mention
  ...Paragraph
  ...Leaf
}
    ${MentionFragmentDoc}
${ParagraphFragmentDoc}
${LeafFragmentDoc}`;
export const SubthreadCommentFragmentDoc = gql`
    fragment SubthreadComment on Comment {
  user {
    sub
  }
  parent {
    id
  }
  createdAt
  descendents {
    ...Descendent
  }
}
    ${DescendentFragmentDoc}`;
export const ListCommentFragmentDoc = gql`
    fragment ListComment on Comment {
  user {
    sub
  }
  parent {
    id
  }
  descendents {
    ...Descendent
  }
  resolved
  resolvedBy {
    sub
  }
  id
  createdAt
  children {
    ...SubthreadComment
  }
}
    ${DescendentFragmentDoc}
${SubthreadCommentFragmentDoc}`;
export const MentionCommentFragmentDoc = gql`
    fragment MentionComment on Comment {
  user {
    sub
  }
  parent {
    id
  }
  descendents {
    ...Descendent
  }
  id
  createdAt
  children {
    ...SubthreadComment
  }
  mentions {
    id
    sub
  }
  resolved
  resolvedBy {
    sub
  }
  objectId
  contentType
}
    ${DescendentFragmentDoc}
${SubthreadCommentFragmentDoc}`;
export const DetailCommentFragmentDoc = gql`
    fragment DetailComment on Comment {
  user {
    sub
  }
  parent {
    id
  }
  descendents {
    ...Descendent
  }
  id
  resolved
  resolvedBy {
    sub
  }
  createdAt
  children {
    ...SubthreadComment
  }
  mentions {
    sub
  }
  objectId
  contentType
}
    ${DescendentFragmentDoc}
${SubthreadCommentFragmentDoc}`;
export const ConditionEventFragmentDoc = gql`
    fragment ConditionEvent on ConditionEvent {
  id
  source
  createdAt
  value
  state
}
    `;
export const ConditionSnapshotFragmentDoc = gql`
    fragment ConditionSnapshot on ConditionSnapshot {
  id
  condition {
    id
    provision
  }
  status
  events {
    ...ConditionEvent
  }
}
    ${ConditionEventFragmentDoc}`;
export const ListConditionSnapshotFragmentDoc = gql`
    fragment ListConditionSnapshot on ConditionSnapshot {
  id
  condition {
    id
    provision
  }
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
export const ReturnWidgetFragmentDoc = gql`
    fragment ReturnWidget on ReturnWidget {
  kind
  query
}
    `;
export const PortChildFragmentDoc = gql`
    fragment PortChild on PortChild {
  identifier
  kind
  scope
  nullable
  assignWidget {
    ...Widget
  }
  returnWidget {
    ...ReturnWidget
  }
  child {
    scope
    identifier
    kind
    nullable
    assignWidget {
      ...Widget
    }
    returnWidget {
      ...ReturnWidget
    }
    child {
      identifier
      scope
      kind
      nullable
      assignWidget {
        ...Widget
      }
      returnWidget {
        ...ReturnWidget
      }
    }
  }
}
    ${WidgetFragmentDoc}
${ReturnWidgetFragmentDoc}`;
export const PortFragmentDoc = gql`
    fragment Port on Port {
  key
  label
  identifier
  scope
  kind
  description
  assignWidget {
    ...Widget
  }
  returnWidget {
    ...ReturnWidget
  }
  child {
    ...PortChild
  }
  nullable
}
    ${WidgetFragmentDoc}
${ReturnWidgetFragmentDoc}
${PortChildFragmentDoc}`;
export const FlowNodeCommonsFragmentDoc = gql`
    fragment FlowNodeCommons on FlowNodeCommons {
  instream {
    ...Port
  }
  outstream {
    ...Port
  }
  constream {
    ...Port
  }
  constants
}
    ${PortFragmentDoc}`;
export const ArkitektNodeFragmentDoc = gql`
    fragment ArkitektNode on ArkitektNode {
  ...FlowNodeCommons
  __typename
  name
  description
  hash
  kind
  defaults
  mapStrategy
  allowLocal
  binds {
    clients
    templates
  }
  assignTimeout
  yieldTimeout
  reserveTimeout
}
    ${FlowNodeCommonsFragmentDoc}`;
export const ReactiveNodeFragmentDoc = gql`
    fragment ReactiveNode on ReactiveNode {
  ...FlowNodeCommons
  __typename
  implementation
  defaults
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
export const LocalNodeFragmentDoc = gql`
    fragment LocalNode on LocalNode {
  ...FlowNodeCommons
  __typename
  name
  description
  interface
  hash
  kind
  defaults
  mapStrategy
  allowLocal
  assignTimeout
  yieldTimeout
}
    ${FlowNodeCommonsFragmentDoc}`;
export const GraphNodeFragmentDoc = gql`
    fragment GraphNode on GraphNode {
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
  parentNode
  ...ArkitektNode
  ...ReactiveNode
  ...ArgNode
  ...KwargNode
  ...ReturnNode
  ...LocalNode
  ...GraphNode
}
    ${ArkitektNodeFragmentDoc}
${ReactiveNodeFragmentDoc}
${ArgNodeFragmentDoc}
${KwargNodeFragmentDoc}
${ReturnNodeFragmentDoc}
${LocalNodeFragmentDoc}
${GraphNodeFragmentDoc}`;
export const StreamItemChildFragmentDoc = gql`
    fragment StreamItemChild on StreamItemChild {
  kind
  identifier
  scope
  nullable
  child {
    scope
    kind
    nullable
    identifier
  }
}
    `;
export const StreamItemFragmentDoc = gql`
    fragment StreamItem on StreamItem {
  key
  kind
  identifier
  scope
  nullable
  child {
    ...StreamItemChild
  }
}
    ${StreamItemChildFragmentDoc}`;
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
  toKeys
  port {
    ...Port
  }
}
    ${PortFragmentDoc}`;
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
      ...Port
    }
    returns {
      ...Port
    }
  }
  restrict
  name
  screenshot
  createdAt
  workspace {
    id
  }
}
    ${FlowNodeFragmentDoc}
${FlowEdgeFragmentDoc}
${GlobalFragmentDoc}
${PortFragmentDoc}`;
export const ConditionFragmentDoc = gql`
    fragment Condition on Condition {
  id
  snapshots {
    id
    status
    createdAt
  }
  provision
  createdAt
  latestSnapshot {
    createdAt
    events {
      ...ConditionEvent
    }
  }
  flow {
    ...Flow
  }
}
    ${ConditionEventFragmentDoc}
${FlowFragmentDoc}`;
export const ListConditionFragmentDoc = gql`
    fragment ListCondition on Condition {
  id
  provision
  createdAt
  flow {
    id
    name
    workspace {
      name
    }
  }
}
    `;
export const ListFlowFragmentDoc = gql`
    fragment ListFlow on Flow {
  id
  name
  screenshot
  createdAt
  workspace {
    id
  }
}
    `;
export const ListWorkspaceFragmentDoc = gql`
    fragment ListWorkspace on Workspace {
  id
  name
  latestFlow {
    ...ListFlow
  }
}
    ${ListFlowFragmentDoc}`;
export const WorkspaceFragmentDoc = gql`
    fragment Workspace on Workspace {
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
    ...Port
  }
  instream {
    ...Port
  }
  outstream {
    ...Port
  }
  name
  implementation
  description
  id
  constants {
    ...Port
  }
}
    ${PortFragmentDoc}`;
export const RunEventFragmentDoc = gql`
    fragment RunEvent on RunEvent {
  id
  source
  handle
  type
  createdAt
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
  assignation
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
    workspace {
      name
    }
  }
}
    `;
export const CreateCommentDocument = gql`
    mutation CreateComment($id: ID!, $model: CommentableModels!, $descendents: [DescendendInput]!, $parent: ID) {
  createComment(
    object: $id
    type: $model
    descendents: $descendents
    parent: $parent
  ) {
    ...ListComment
  }
}
    ${ListCommentFragmentDoc}`;
export type CreateCommentMutationFn = Apollo.MutationFunction<CreateCommentMutation, CreateCommentMutationVariables>;

/**
 * __useCreateCommentMutation__
 *
 * To run a mutation, you first call `useCreateCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createCommentMutation, { data, loading, error }] = useCreateCommentMutation({
 *   variables: {
 *      id: // value for 'id'
 *      model: // value for 'model'
 *      descendents: // value for 'descendents'
 *      parent: // value for 'parent'
 *   },
 * });
 */
export function useCreateCommentMutation(baseOptions?: Apollo.MutationHookOptions<CreateCommentMutation, CreateCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateCommentMutation, CreateCommentMutationVariables>(CreateCommentDocument, options);
      }
export type CreateCommentMutationHookResult = ReturnType<typeof useCreateCommentMutation>;
export type CreateCommentMutationResult = Apollo.MutationResult<CreateCommentMutation>;
export type CreateCommentMutationOptions = Apollo.BaseMutationOptions<CreateCommentMutation, CreateCommentMutationVariables>;
export const ReplyToDocument = gql`
    mutation ReplyTo($descendents: [DescendendInput]!, $parent: ID!) {
  replyTo(descendents: $descendents, parent: $parent) {
    ...ListComment
  }
}
    ${ListCommentFragmentDoc}`;
export type ReplyToMutationFn = Apollo.MutationFunction<ReplyToMutation, ReplyToMutationVariables>;

/**
 * __useReplyToMutation__
 *
 * To run a mutation, you first call `useReplyToMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReplyToMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [replyToMutation, { data, loading, error }] = useReplyToMutation({
 *   variables: {
 *      descendents: // value for 'descendents'
 *      parent: // value for 'parent'
 *   },
 * });
 */
export function useReplyToMutation(baseOptions?: Apollo.MutationHookOptions<ReplyToMutation, ReplyToMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReplyToMutation, ReplyToMutationVariables>(ReplyToDocument, options);
      }
export type ReplyToMutationHookResult = ReturnType<typeof useReplyToMutation>;
export type ReplyToMutationResult = Apollo.MutationResult<ReplyToMutation>;
export type ReplyToMutationOptions = Apollo.BaseMutationOptions<ReplyToMutation, ReplyToMutationVariables>;
export const ResolveCommentDocument = gql`
    mutation ResolveComment($id: ID!) {
  resolveComment(id: $id) {
    ...ListComment
  }
}
    ${ListCommentFragmentDoc}`;
export type ResolveCommentMutationFn = Apollo.MutationFunction<ResolveCommentMutation, ResolveCommentMutationVariables>;

/**
 * __useResolveCommentMutation__
 *
 * To run a mutation, you first call `useResolveCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResolveCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resolveCommentMutation, { data, loading, error }] = useResolveCommentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useResolveCommentMutation(baseOptions?: Apollo.MutationHookOptions<ResolveCommentMutation, ResolveCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResolveCommentMutation, ResolveCommentMutationVariables>(ResolveCommentDocument, options);
      }
export type ResolveCommentMutationHookResult = ReturnType<typeof useResolveCommentMutation>;
export type ResolveCommentMutationResult = Apollo.MutationResult<ResolveCommentMutation>;
export type ResolveCommentMutationOptions = Apollo.BaseMutationOptions<ResolveCommentMutation, ResolveCommentMutationVariables>;
export const DeleteConditionDocument = gql`
    mutation DeleteCondition($id: ID!) {
  deleteCondition(id: $id) {
    id
  }
}
    `;
export type DeleteConditionMutationFn = Apollo.MutationFunction<DeleteConditionMutation, DeleteConditionMutationVariables>;

/**
 * __useDeleteConditionMutation__
 *
 * To run a mutation, you first call `useDeleteConditionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteConditionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteConditionMutation, { data, loading, error }] = useDeleteConditionMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteConditionMutation(baseOptions?: Apollo.MutationHookOptions<DeleteConditionMutation, DeleteConditionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteConditionMutation, DeleteConditionMutationVariables>(DeleteConditionDocument, options);
      }
export type DeleteConditionMutationHookResult = ReturnType<typeof useDeleteConditionMutation>;
export type DeleteConditionMutationResult = Apollo.MutationResult<DeleteConditionMutation>;
export type DeleteConditionMutationOptions = Apollo.BaseMutationOptions<DeleteConditionMutation, DeleteConditionMutationVariables>;
export const PinConditionDocument = gql`
    mutation pinCondition($id: ID!, $pin: Boolean!) {
  pinCondition(id: $id, pin: $pin) {
    id
    pinnedBy {
      id
      email
    }
    pinned
  }
}
    `;
export type PinConditionMutationFn = Apollo.MutationFunction<PinConditionMutation, PinConditionMutationVariables>;

/**
 * __usePinConditionMutation__
 *
 * To run a mutation, you first call `usePinConditionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinConditionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinConditionMutation, { data, loading, error }] = usePinConditionMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinConditionMutation(baseOptions?: Apollo.MutationHookOptions<PinConditionMutation, PinConditionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinConditionMutation, PinConditionMutationVariables>(PinConditionDocument, options);
      }
export type PinConditionMutationHookResult = ReturnType<typeof usePinConditionMutation>;
export type PinConditionMutationResult = Apollo.MutationResult<PinConditionMutation>;
export type PinConditionMutationOptions = Apollo.BaseMutationOptions<PinConditionMutation, PinConditionMutationVariables>;
export const UpdateFlowDocument = gql`
    mutation UpdateFlow($id: ID!, $graph: GraphInput!, $screenshot: ImageFile) {
  updateworkspace(id: $id, graph: $graph, screenshot: $screenshot) {
    ...Workspace
  }
}
    ${WorkspaceFragmentDoc}`;
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
    mutation CreateVanillaDiagram($name: String, $restrict: [String]) {
  drawvanilla(name: $name, restrict: $restrict) {
    ...Workspace
  }
}
    ${WorkspaceFragmentDoc}`;
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
 *      restrict: // value for 'restrict'
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
export const ImportFlowDocument = gql`
    mutation ImportFlow($name: String, $graph: GraphInput!) {
  importflow(name: $name, graph: $graph) {
    ...Workspace
  }
}
    ${WorkspaceFragmentDoc}`;
export type ImportFlowMutationFn = Apollo.MutationFunction<ImportFlowMutation, ImportFlowMutationVariables>;

/**
 * __useImportFlowMutation__
 *
 * To run a mutation, you first call `useImportFlowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useImportFlowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [importFlowMutation, { data, loading, error }] = useImportFlowMutation({
 *   variables: {
 *      name: // value for 'name'
 *      graph: // value for 'graph'
 *   },
 * });
 */
export function useImportFlowMutation(baseOptions?: Apollo.MutationHookOptions<ImportFlowMutation, ImportFlowMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ImportFlowMutation, ImportFlowMutationVariables>(ImportFlowDocument, options);
      }
export type ImportFlowMutationHookResult = ReturnType<typeof useImportFlowMutation>;
export type ImportFlowMutationResult = Apollo.MutationResult<ImportFlowMutation>;
export type ImportFlowMutationOptions = Apollo.BaseMutationOptions<ImportFlowMutation, ImportFlowMutationVariables>;
export const PinFlowDocument = gql`
    mutation pinFlow($id: ID!, $pin: Boolean!) {
  pinFlow(id: $id, pin: $pin) {
    id
    pinnedBy {
      id
      email
    }
    pinned
  }
}
    `;
export type PinFlowMutationFn = Apollo.MutationFunction<PinFlowMutation, PinFlowMutationVariables>;

/**
 * __usePinFlowMutation__
 *
 * To run a mutation, you first call `usePinFlowMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinFlowMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinFlowMutation, { data, loading, error }] = usePinFlowMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinFlowMutation(baseOptions?: Apollo.MutationHookOptions<PinFlowMutation, PinFlowMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinFlowMutation, PinFlowMutationVariables>(PinFlowDocument, options);
      }
export type PinFlowMutationHookResult = ReturnType<typeof usePinFlowMutation>;
export type PinFlowMutationResult = Apollo.MutationResult<PinFlowMutation>;
export type PinFlowMutationOptions = Apollo.BaseMutationOptions<PinFlowMutation, PinFlowMutationVariables>;
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
export const PinRunDocument = gql`
    mutation PinRun($id: ID!, $pin: Boolean!) {
  pinRun(id: $id, pin: $pin) {
    id
    pinnedBy {
      id
      email
    }
    pinned
  }
}
    `;
export type PinRunMutationFn = Apollo.MutationFunction<PinRunMutation, PinRunMutationVariables>;

/**
 * __usePinRunMutation__
 *
 * To run a mutation, you first call `usePinRunMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinRunMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinRunMutation, { data, loading, error }] = usePinRunMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinRunMutation(baseOptions?: Apollo.MutationHookOptions<PinRunMutation, PinRunMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinRunMutation, PinRunMutationVariables>(PinRunDocument, options);
      }
export type PinRunMutationHookResult = ReturnType<typeof usePinRunMutation>;
export type PinRunMutationResult = Apollo.MutationResult<PinRunMutation>;
export type PinRunMutationOptions = Apollo.BaseMutationOptions<PinRunMutation, PinRunMutationVariables>;
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
export const PinWorkspaceDocument = gql`
    mutation PinWorkspace($id: ID!, $pin: Boolean!) {
  pinWorkspace(id: $id, pin: $pin) {
    id
    pinnedBy {
      id
      email
    }
    pinned
  }
}
    `;
export type PinWorkspaceMutationFn = Apollo.MutationFunction<PinWorkspaceMutation, PinWorkspaceMutationVariables>;

/**
 * __usePinWorkspaceMutation__
 *
 * To run a mutation, you first call `usePinWorkspaceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinWorkspaceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinWorkspaceMutation, { data, loading, error }] = usePinWorkspaceMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinWorkspaceMutation(baseOptions?: Apollo.MutationHookOptions<PinWorkspaceMutation, PinWorkspaceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinWorkspaceMutation, PinWorkspaceMutationVariables>(PinWorkspaceDocument, options);
      }
export type PinWorkspaceMutationHookResult = ReturnType<typeof usePinWorkspaceMutation>;
export type PinWorkspaceMutationResult = Apollo.MutationResult<PinWorkspaceMutation>;
export type PinWorkspaceMutationOptions = Apollo.BaseMutationOptions<PinWorkspaceMutation, PinWorkspaceMutationVariables>;
export const CommentsForDocument = gql`
    query CommentsFor($id: ID!, $model: CommentableModels!) {
  commentsfor(model: $model, id: $id) {
    ...ListComment
  }
}
    ${ListCommentFragmentDoc}`;

/**
 * __useCommentsForQuery__
 *
 * To run a query within a React component, call `useCommentsForQuery` and pass it any options that fit your needs.
 * When your component renders, `useCommentsForQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCommentsForQuery({
 *   variables: {
 *      id: // value for 'id'
 *      model: // value for 'model'
 *   },
 * });
 */
export function useCommentsForQuery(baseOptions: Apollo.QueryHookOptions<CommentsForQuery, CommentsForQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CommentsForQuery, CommentsForQueryVariables>(CommentsForDocument, options);
      }
export function useCommentsForLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CommentsForQuery, CommentsForQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CommentsForQuery, CommentsForQueryVariables>(CommentsForDocument, options);
        }
export type CommentsForQueryHookResult = ReturnType<typeof useCommentsForQuery>;
export type CommentsForLazyQueryHookResult = ReturnType<typeof useCommentsForLazyQuery>;
export type CommentsForQueryResult = Apollo.QueryResult<CommentsForQuery, CommentsForQueryVariables>;
export const MyMentionsDocument = gql`
    query MyMentions {
  mymentions {
    ...MentionComment
  }
}
    ${MentionCommentFragmentDoc}`;

/**
 * __useMyMentionsQuery__
 *
 * To run a query within a React component, call `useMyMentionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyMentionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyMentionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyMentionsQuery(baseOptions?: Apollo.QueryHookOptions<MyMentionsQuery, MyMentionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyMentionsQuery, MyMentionsQueryVariables>(MyMentionsDocument, options);
      }
export function useMyMentionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyMentionsQuery, MyMentionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyMentionsQuery, MyMentionsQueryVariables>(MyMentionsDocument, options);
        }
export type MyMentionsQueryHookResult = ReturnType<typeof useMyMentionsQuery>;
export type MyMentionsLazyQueryHookResult = ReturnType<typeof useMyMentionsLazyQuery>;
export type MyMentionsQueryResult = Apollo.QueryResult<MyMentionsQuery, MyMentionsQueryVariables>;
export const DetailCommentDocument = gql`
    query DetailComment($id: ID!) {
  comment(id: $id) {
    ...DetailComment
  }
}
    ${DetailCommentFragmentDoc}`;

/**
 * __useDetailCommentQuery__
 *
 * To run a query within a React component, call `useDetailCommentQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailCommentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailCommentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailCommentQuery(baseOptions: Apollo.QueryHookOptions<DetailCommentQuery, DetailCommentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailCommentQuery, DetailCommentQueryVariables>(DetailCommentDocument, options);
      }
export function useDetailCommentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailCommentQuery, DetailCommentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailCommentQuery, DetailCommentQueryVariables>(DetailCommentDocument, options);
        }
export type DetailCommentQueryHookResult = ReturnType<typeof useDetailCommentQuery>;
export type DetailCommentLazyQueryHookResult = ReturnType<typeof useDetailCommentLazyQuery>;
export type DetailCommentQueryResult = Apollo.QueryResult<DetailCommentQuery, DetailCommentQueryVariables>;
export const ConditionSnapshotsDocument = gql`
    query ConditionSnapshots {
  conditionSnapshots {
    ...ListConditionSnapshot
  }
}
    ${ListConditionSnapshotFragmentDoc}`;

/**
 * __useConditionSnapshotsQuery__
 *
 * To run a query within a React component, call `useConditionSnapshotsQuery` and pass it any options that fit your needs.
 * When your component renders, `useConditionSnapshotsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useConditionSnapshotsQuery({
 *   variables: {
 *   },
 * });
 */
export function useConditionSnapshotsQuery(baseOptions?: Apollo.QueryHookOptions<ConditionSnapshotsQuery, ConditionSnapshotsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ConditionSnapshotsQuery, ConditionSnapshotsQueryVariables>(ConditionSnapshotsDocument, options);
      }
export function useConditionSnapshotsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ConditionSnapshotsQuery, ConditionSnapshotsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ConditionSnapshotsQuery, ConditionSnapshotsQueryVariables>(ConditionSnapshotsDocument, options);
        }
export type ConditionSnapshotsQueryHookResult = ReturnType<typeof useConditionSnapshotsQuery>;
export type ConditionSnapshotsLazyQueryHookResult = ReturnType<typeof useConditionSnapshotsLazyQuery>;
export type ConditionSnapshotsQueryResult = Apollo.QueryResult<ConditionSnapshotsQuery, ConditionSnapshotsQueryVariables>;
export const DetailConditionSnapshotDocument = gql`
    query DetailConditionSnapshot($id: ID!) {
  conditionSnapshot(id: $id) {
    ...ConditionSnapshot
  }
}
    ${ConditionSnapshotFragmentDoc}`;

/**
 * __useDetailConditionSnapshotQuery__
 *
 * To run a query within a React component, call `useDetailConditionSnapshotQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailConditionSnapshotQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailConditionSnapshotQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailConditionSnapshotQuery(baseOptions: Apollo.QueryHookOptions<DetailConditionSnapshotQuery, DetailConditionSnapshotQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailConditionSnapshotQuery, DetailConditionSnapshotQueryVariables>(DetailConditionSnapshotDocument, options);
      }
export function useDetailConditionSnapshotLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailConditionSnapshotQuery, DetailConditionSnapshotQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailConditionSnapshotQuery, DetailConditionSnapshotQueryVariables>(DetailConditionSnapshotDocument, options);
        }
export type DetailConditionSnapshotQueryHookResult = ReturnType<typeof useDetailConditionSnapshotQuery>;
export type DetailConditionSnapshotLazyQueryHookResult = ReturnType<typeof useDetailConditionSnapshotLazyQuery>;
export type DetailConditionSnapshotQueryResult = Apollo.QueryResult<DetailConditionSnapshotQuery, DetailConditionSnapshotQueryVariables>;
export const ConditionsDocument = gql`
    query Conditions {
  conditions {
    ...ListCondition
  }
}
    ${ListConditionFragmentDoc}`;

/**
 * __useConditionsQuery__
 *
 * To run a query within a React component, call `useConditionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useConditionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useConditionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useConditionsQuery(baseOptions?: Apollo.QueryHookOptions<ConditionsQuery, ConditionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ConditionsQuery, ConditionsQueryVariables>(ConditionsDocument, options);
      }
export function useConditionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ConditionsQuery, ConditionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ConditionsQuery, ConditionsQueryVariables>(ConditionsDocument, options);
        }
export type ConditionsQueryHookResult = ReturnType<typeof useConditionsQuery>;
export type ConditionsLazyQueryHookResult = ReturnType<typeof useConditionsLazyQuery>;
export type ConditionsQueryResult = Apollo.QueryResult<ConditionsQuery, ConditionsQueryVariables>;
export const MyConditionsDocument = gql`
    query MyConditions($limit: Int, $offset: Int, $order: String, $createdDay: DateTime) {
  myconditions(
    limit: $limit
    offset: $offset
    order: $order
    createdDay: $createdDay
  ) {
    ...ListCondition
  }
}
    ${ListConditionFragmentDoc}`;

/**
 * __useMyConditionsQuery__
 *
 * To run a query within a React component, call `useMyConditionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyConditionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyConditionsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      order: // value for 'order'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyConditionsQuery(baseOptions?: Apollo.QueryHookOptions<MyConditionsQuery, MyConditionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyConditionsQuery, MyConditionsQueryVariables>(MyConditionsDocument, options);
      }
export function useMyConditionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyConditionsQuery, MyConditionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyConditionsQuery, MyConditionsQueryVariables>(MyConditionsDocument, options);
        }
export type MyConditionsQueryHookResult = ReturnType<typeof useMyConditionsQuery>;
export type MyConditionsLazyQueryHookResult = ReturnType<typeof useMyConditionsLazyQuery>;
export type MyConditionsQueryResult = Apollo.QueryResult<MyConditionsQuery, MyConditionsQueryVariables>;
export const DetailConditionDocument = gql`
    query DetailCondition($id: ID, $provision: ID) {
  condition(id: $id, provision: $provision) {
    ...Condition
  }
}
    ${ConditionFragmentDoc}`;

/**
 * __useDetailConditionQuery__
 *
 * To run a query within a React component, call `useDetailConditionQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailConditionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailConditionQuery({
 *   variables: {
 *      id: // value for 'id'
 *      provision: // value for 'provision'
 *   },
 * });
 */
export function useDetailConditionQuery(baseOptions?: Apollo.QueryHookOptions<DetailConditionQuery, DetailConditionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailConditionQuery, DetailConditionQueryVariables>(DetailConditionDocument, options);
      }
export function useDetailConditionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailConditionQuery, DetailConditionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailConditionQuery, DetailConditionQueryVariables>(DetailConditionDocument, options);
        }
export type DetailConditionQueryHookResult = ReturnType<typeof useDetailConditionQuery>;
export type DetailConditionLazyQueryHookResult = ReturnType<typeof useDetailConditionLazyQuery>;
export type DetailConditionQueryResult = Apollo.QueryResult<DetailConditionQuery, DetailConditionQueryVariables>;
export const ConditionEventsBetweenDocument = gql`
    query ConditionEventsBetween($id: ID!, $min: DateTime, $max: DateTime) {
  conditionEventsBetween(condition: $id, min: $min, max: $max) {
    ...ConditionEvent
  }
}
    ${ConditionEventFragmentDoc}`;

/**
 * __useConditionEventsBetweenQuery__
 *
 * To run a query within a React component, call `useConditionEventsBetweenQuery` and pass it any options that fit your needs.
 * When your component renders, `useConditionEventsBetweenQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useConditionEventsBetweenQuery({
 *   variables: {
 *      id: // value for 'id'
 *      min: // value for 'min'
 *      max: // value for 'max'
 *   },
 * });
 */
export function useConditionEventsBetweenQuery(baseOptions: Apollo.QueryHookOptions<ConditionEventsBetweenQuery, ConditionEventsBetweenQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ConditionEventsBetweenQuery, ConditionEventsBetweenQueryVariables>(ConditionEventsBetweenDocument, options);
      }
export function useConditionEventsBetweenLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ConditionEventsBetweenQuery, ConditionEventsBetweenQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ConditionEventsBetweenQuery, ConditionEventsBetweenQueryVariables>(ConditionEventsBetweenDocument, options);
        }
export type ConditionEventsBetweenQueryHookResult = ReturnType<typeof useConditionEventsBetweenQuery>;
export type ConditionEventsBetweenLazyQueryHookResult = ReturnType<typeof useConditionEventsBetweenLazyQuery>;
export type ConditionEventsBetweenQueryResult = Apollo.QueryResult<ConditionEventsBetweenQuery, ConditionEventsBetweenQueryVariables>;
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
export function useWorkspaceQuery(baseOptions: Apollo.QueryHookOptions<WorkspaceQuery, WorkspaceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<WorkspaceQuery, WorkspaceQueryVariables>(WorkspaceDocument, options);
      }
export function useWorkspaceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<WorkspaceQuery, WorkspaceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<WorkspaceQuery, WorkspaceQueryVariables>(WorkspaceDocument, options);
        }
export type WorkspaceQueryHookResult = ReturnType<typeof useWorkspaceQuery>;
export type WorkspaceLazyQueryHookResult = ReturnType<typeof useWorkspaceLazyQuery>;
export type WorkspaceQueryResult = Apollo.QueryResult<WorkspaceQuery, WorkspaceQueryVariables>;
export const MyWorkspacesDocument = gql`
    query MyWorkspaces($limit: Int, $offset: Int, $order: String, $createdDay: DateTime) {
  myworkspaces(
    limit: $limit
    offset: $offset
    order: $order
    createdDay: $createdDay
  ) {
    ...ListWorkspace
  }
}
    ${ListWorkspaceFragmentDoc}`;

/**
 * __useMyWorkspacesQuery__
 *
 * To run a query within a React component, call `useMyWorkspacesQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyWorkspacesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyWorkspacesQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      order: // value for 'order'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyWorkspacesQuery(baseOptions?: Apollo.QueryHookOptions<MyWorkspacesQuery, MyWorkspacesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyWorkspacesQuery, MyWorkspacesQueryVariables>(MyWorkspacesDocument, options);
      }
export function useMyWorkspacesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyWorkspacesQuery, MyWorkspacesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyWorkspacesQuery, MyWorkspacesQueryVariables>(MyWorkspacesDocument, options);
        }
export type MyWorkspacesQueryHookResult = ReturnType<typeof useMyWorkspacesQuery>;
export type MyWorkspacesLazyQueryHookResult = ReturnType<typeof useMyWorkspacesLazyQuery>;
export type MyWorkspacesQueryResult = Apollo.QueryResult<MyWorkspacesQuery, MyWorkspacesQueryVariables>;
export const PinnedWorkspacesDocument = gql`
    query PinnedWorkspaces($limit: Int, $offset: Int, $order: String, $createdDay: DateTime) {
  workspaces(
    limit: $limit
    offset: $offset
    order: $order
    pinned: true
    createdDay: $createdDay
  ) {
    ...ListWorkspace
  }
}
    ${ListWorkspaceFragmentDoc}`;

/**
 * __usePinnedWorkspacesQuery__
 *
 * To run a query within a React component, call `usePinnedWorkspacesQuery` and pass it any options that fit your needs.
 * When your component renders, `usePinnedWorkspacesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePinnedWorkspacesQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      order: // value for 'order'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function usePinnedWorkspacesQuery(baseOptions?: Apollo.QueryHookOptions<PinnedWorkspacesQuery, PinnedWorkspacesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PinnedWorkspacesQuery, PinnedWorkspacesQueryVariables>(PinnedWorkspacesDocument, options);
      }
export function usePinnedWorkspacesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PinnedWorkspacesQuery, PinnedWorkspacesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PinnedWorkspacesQuery, PinnedWorkspacesQueryVariables>(PinnedWorkspacesDocument, options);
        }
export type PinnedWorkspacesQueryHookResult = ReturnType<typeof usePinnedWorkspacesQuery>;
export type PinnedWorkspacesLazyQueryHookResult = ReturnType<typeof usePinnedWorkspacesLazyQuery>;
export type PinnedWorkspacesQueryResult = Apollo.QueryResult<PinnedWorkspacesQuery, PinnedWorkspacesQueryVariables>;
export const SearchWorkspacesDocument = gql`
    query SearchWorkspaces($name: String) {
  workspaces(name: $name) {
    ...ListWorkspace
  }
}
    ${ListWorkspaceFragmentDoc}`;

/**
 * __useSearchWorkspacesQuery__
 *
 * To run a query within a React component, call `useSearchWorkspacesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchWorkspacesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchWorkspacesQuery({
 *   variables: {
 *      name: // value for 'name'
 *   },
 * });
 */
export function useSearchWorkspacesQuery(baseOptions?: Apollo.QueryHookOptions<SearchWorkspacesQuery, SearchWorkspacesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchWorkspacesQuery, SearchWorkspacesQueryVariables>(SearchWorkspacesDocument, options);
      }
export function useSearchWorkspacesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchWorkspacesQuery, SearchWorkspacesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchWorkspacesQuery, SearchWorkspacesQueryVariables>(SearchWorkspacesDocument, options);
        }
export type SearchWorkspacesQueryHookResult = ReturnType<typeof useSearchWorkspacesQuery>;
export type SearchWorkspacesLazyQueryHookResult = ReturnType<typeof useSearchWorkspacesLazyQuery>;
export type SearchWorkspacesQueryResult = Apollo.QueryResult<SearchWorkspacesQuery, SearchWorkspacesQueryVariables>;
export const SearchFlowsDocument = gql`
    query SearchFlows($name: String, $workspace: ID) {
  flows(name: $name, workspace: $workspace) {
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
 *      workspace: // value for 'workspace'
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
export const MyRunsDocument = gql`
    query MyRuns($limit: Int, $offset: Int, $order: String, $createdDay: DateTime) {
  myruns(limit: $limit, offset: $offset, order: $order, createdDay: $createdDay) {
    ...ListRun
  }
}
    ${ListRunFragmentDoc}`;

/**
 * __useMyRunsQuery__
 *
 * To run a query within a React component, call `useMyRunsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyRunsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyRunsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      order: // value for 'order'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function useMyRunsQuery(baseOptions?: Apollo.QueryHookOptions<MyRunsQuery, MyRunsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyRunsQuery, MyRunsQueryVariables>(MyRunsDocument, options);
      }
export function useMyRunsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyRunsQuery, MyRunsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyRunsQuery, MyRunsQueryVariables>(MyRunsDocument, options);
        }
export type MyRunsQueryHookResult = ReturnType<typeof useMyRunsQuery>;
export type MyRunsLazyQueryHookResult = ReturnType<typeof useMyRunsLazyQuery>;
export type MyRunsQueryResult = Apollo.QueryResult<MyRunsQuery, MyRunsQueryVariables>;
export const PinnedRunsDocument = gql`
    query PinnedRuns($limit: Int, $offset: Int, $order: String, $createdDay: DateTime) {
  runs(
    limit: $limit
    offset: $offset
    order: $order
    pinned: true
    createdDay: $createdDay
  ) {
    ...ListRun
  }
}
    ${ListRunFragmentDoc}`;

/**
 * __usePinnedRunsQuery__
 *
 * To run a query within a React component, call `usePinnedRunsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePinnedRunsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePinnedRunsQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *      order: // value for 'order'
 *      createdDay: // value for 'createdDay'
 *   },
 * });
 */
export function usePinnedRunsQuery(baseOptions?: Apollo.QueryHookOptions<PinnedRunsQuery, PinnedRunsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PinnedRunsQuery, PinnedRunsQueryVariables>(PinnedRunsDocument, options);
      }
export function usePinnedRunsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PinnedRunsQuery, PinnedRunsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PinnedRunsQuery, PinnedRunsQueryVariables>(PinnedRunsDocument, options);
        }
export type PinnedRunsQueryHookResult = ReturnType<typeof usePinnedRunsQuery>;
export type PinnedRunsLazyQueryHookResult = ReturnType<typeof usePinnedRunsLazyQuery>;
export type PinnedRunsQueryResult = Apollo.QueryResult<PinnedRunsQuery, PinnedRunsQueryVariables>;
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
export const FlussGlobalSearchDocument = gql`
    query FlussGlobalSearch($search: String) {
  workspaces(search: $search) {
    ...ListWorkspace
  }
}
    ${ListWorkspaceFragmentDoc}`;

/**
 * __useFlussGlobalSearchQuery__
 *
 * To run a query within a React component, call `useFlussGlobalSearchQuery` and pass it any options that fit your needs.
 * When your component renders, `useFlussGlobalSearchQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFlussGlobalSearchQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useFlussGlobalSearchQuery(baseOptions?: Apollo.QueryHookOptions<FlussGlobalSearchQuery, FlussGlobalSearchQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FlussGlobalSearchQuery, FlussGlobalSearchQueryVariables>(FlussGlobalSearchDocument, options);
      }
export function useFlussGlobalSearchLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FlussGlobalSearchQuery, FlussGlobalSearchQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FlussGlobalSearchQuery, FlussGlobalSearchQueryVariables>(FlussGlobalSearchDocument, options);
        }
export type FlussGlobalSearchQueryHookResult = ReturnType<typeof useFlussGlobalSearchQuery>;
export type FlussGlobalSearchLazyQueryHookResult = ReturnType<typeof useFlussGlobalSearchLazyQuery>;
export type FlussGlobalSearchQueryResult = Apollo.QueryResult<FlussGlobalSearchQuery, FlussGlobalSearchQueryVariables>;
export const ReactiveTemplateDocument = gql`
    query ReactiveTemplate($id: ID, $implementation: ReactiveImplementationModelInput) {
  reactivetemplate(id: $id, implementation: $implementation) {
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
 *      implementation: // value for 'implementation'
 *   },
 * });
 */
export function useReactiveTemplateQuery(baseOptions?: Apollo.QueryHookOptions<ReactiveTemplateQuery, ReactiveTemplateQueryVariables>) {
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
export const DetailReactiveTemplateDocument = gql`
    query DetailReactiveTemplate($id: ID, $implementation: ReactiveImplementationModelInput) {
  reactivetemplate(id: $id, implementation: $implementation) {
    ...ReactiveTemplate
  }
}
    ${ReactiveTemplateFragmentDoc}`;

/**
 * __useDetailReactiveTemplateQuery__
 *
 * To run a query within a React component, call `useDetailReactiveTemplateQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailReactiveTemplateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailReactiveTemplateQuery({
 *   variables: {
 *      id: // value for 'id'
 *      implementation: // value for 'implementation'
 *   },
 * });
 */
export function useDetailReactiveTemplateQuery(baseOptions?: Apollo.QueryHookOptions<DetailReactiveTemplateQuery, DetailReactiveTemplateQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailReactiveTemplateQuery, DetailReactiveTemplateQueryVariables>(DetailReactiveTemplateDocument, options);
      }
export function useDetailReactiveTemplateLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailReactiveTemplateQuery, DetailReactiveTemplateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailReactiveTemplateQuery, DetailReactiveTemplateQueryVariables>(DetailReactiveTemplateDocument, options);
        }
export type DetailReactiveTemplateQueryHookResult = ReturnType<typeof useDetailReactiveTemplateQuery>;
export type DetailReactiveTemplateLazyQueryHookResult = ReturnType<typeof useDetailReactiveTemplateLazyQuery>;
export type DetailReactiveTemplateQueryResult = Apollo.QueryResult<DetailReactiveTemplateQuery, DetailReactiveTemplateQueryVariables>;
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
export const ConditionEventsDocument = gql`
    subscription ConditionEvents($id: ID!) {
  conditionevents(id: $id) {
    deleted
    create {
      ...ConditionEvent
    }
    update {
      ...ConditionEvent
    }
  }
}
    ${ConditionEventFragmentDoc}`;

/**
 * __useConditionEventsSubscription__
 *
 * To run a query within a React component, call `useConditionEventsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useConditionEventsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useConditionEventsSubscription({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useConditionEventsSubscription(baseOptions: Apollo.SubscriptionHookOptions<ConditionEventsSubscription, ConditionEventsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<ConditionEventsSubscription, ConditionEventsSubscriptionVariables>(ConditionEventsDocument, options);
      }
export type ConditionEventsSubscriptionHookResult = ReturnType<typeof useConditionEventsSubscription>;
export type ConditionEventsSubscriptionResult = Apollo.SubscriptionResult<ConditionEventsSubscription>;
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