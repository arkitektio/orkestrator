import {Identifier} from './scalars'
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
  AnyInput: any;
  DateTime: any;
  GenericScalar: any;
  Identifier: Identifier;
  QString: any;
  SearchQuery: any;
  UUID: any;
};

export type Agent = {
  __typename?: 'Agent';
  /** If this Agent is blocked, it will not be used for provision, nor will it be able to provide */
  blocked: Scalars['Boolean'];
  clientId: Scalars['String'];
  id: Scalars['ID'];
  installedAt: Scalars['DateTime'];
  instanceId: Scalars['String'];
  /** This providers Name */
  name: Scalars['String'];
  /** The Instance this Agent is running on */
  onInstance: Scalars['String'];
  /** Is this Provision bound to a certain Agent? */
  provisions: Array<Provision>;
  /** The provide might be limited to a instance like ImageJ belonging to a specific person. Is nullable for backend users */
  registry?: Maybe<Registry>;
  /** The Status of this Agent */
  status: AgentStatus;
  /** The associated registry for this Template */
  templates: Array<Template>;
  /** The Channel we are listening to */
  unique: Scalars['String'];
};

export type AgentEvent = {
  __typename?: 'AgentEvent';
  created?: Maybe<Agent>;
  deleted?: Maybe<Scalars['ID']>;
  updated?: Maybe<Agent>;
};

/** An enumeration. */
export enum AgentStatus {
  /** Active */
  Active = 'ACTIVE',
  /** Disconnected */
  Disconnected = 'DISCONNECTED',
  /** Just kicked */
  Kicked = 'KICKED',
  /** Complete Vanilla Scenario after a forced restart of */
  Vanilla = 'VANILLA'
}

/** An enumeration. */
export enum AgentStatusInput {
  /** Active */
  Active = 'ACTIVE',
  /** Disconnected */
  Disconnected = 'DISCONNECTED',
  /** Just kicked */
  Kicked = 'KICKED',
  /** Complete Vanilla Scenario after a forced restart of */
  Vanilla = 'VANILLA'
}

export type Annotation = {
  /** The name of the annotation */
  kind?: Maybe<Scalars['String']>;
};

export type AnnotationInput = {
  /** The annotation of this annotation */
  annotations?: InputMaybe<Array<InputMaybe<AnnotationInput>>>;
  /** The value of this annotation */
  args?: InputMaybe<Scalars['String']>;
  /** The attribute to check */
  attribute?: InputMaybe<Scalars['String']>;
  /** A hook for the app to call */
  hook?: InputMaybe<Scalars['String']>;
  /** The kind of annotation */
  kind: AnnotationKind;
  /** The max of this annotation (Value Range) */
  max?: InputMaybe<Scalars['Float']>;
  /** The min of this annotation (Value Range) */
  min?: InputMaybe<Scalars['Float']>;
  /** The name of this annotation */
  name?: InputMaybe<Scalars['String']>;
  /** The predicate of this annotation (IsPredicate) */
  predicate?: InputMaybe<IsPredicateType>;
};

/** The kind of annotation */
export enum AnnotationKind {
  AttributePredicate = 'AttributePredicate',
  CustomAnnotation = 'CustomAnnotation',
  IsPredicate = 'IsPredicate',
  ValueRange = 'ValueRange'
}

export type AppRepository = Repository & {
  __typename?: 'AppRepository';
  /** The Associated App */
  app?: Maybe<LokApp>;
  /** Id of the Repository */
  id: Scalars['ID'];
  installedAt: Scalars['DateTime'];
  /** The Name of the Repository */
  name?: Maybe<Scalars['String']>;
  nodes?: Maybe<Array<Maybe<Node>>>;
  type: RepositoryType;
  /** A world-unique identifier */
  unique: Scalars['String'];
};


export type AppRepositoryNodesArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  package?: InputMaybe<Scalars['String']>;
};

export type Assignation = {
  __typename?: 'Assignation';
  /** The app is this assignation */
  app?: Maybe<LokApp>;
  args?: Maybe<Array<Maybe<Scalars['Any']>>>;
  /** The Assignations parent */
  children: Array<Assignation>;
  context?: Maybe<Scalars['GenericScalar']>;
  createdAt: Scalars['DateTime'];
  /** The creator is this assignation */
  creator?: Maybe<User>;
  id: Scalars['ID'];
  kwargs?: Maybe<Scalars['GenericScalar']>;
  log?: Maybe<Array<Maybe<AssignationLog>>>;
  /** The Assignations parent */
  parent?: Maybe<Assignation>;
  /** The progress of this assignation */
  progress?: Maybe<Scalars['Int']>;
  /** Which Provision did we end up being assigned to */
  provision?: Maybe<Provision>;
  /** The Unique identifier of this Assignation considering its parent */
  reference: Scalars['String'];
  /** Which reservation are we assigning to */
  reservation?: Maybe<Reservation>;
  returns?: Maybe<Array<Maybe<Scalars['Any']>>>;
  /** Current lifecycle of Assignation */
  status: AssignationStatus;
  /** Clear Text status of the Assignation as for now */
  statusmessage: Scalars['String'];
  updatedAt: Scalars['DateTime'];
  /** This Assignation app */
  waiter?: Maybe<Waiter>;
};


export type AssignationLogArgs = {
  createdAt?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  level?: InputMaybe<LogLevelInput>;
  o?: InputMaybe<Scalars['String']>;
};

export type AssignationEvent = {
  __typename?: 'AssignationEvent';
  log?: Maybe<AssignationLogEvent>;
};

export type AssignationLog = {
  __typename?: 'AssignationLog';
  /** The reservation this log item belongs to */
  assignation: Assignation;
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  level: AssignationLogLevel;
  message?: Maybe<Scalars['String']>;
};

export type AssignationLogEvent = {
  __typename?: 'AssignationLogEvent';
  level?: Maybe<Scalars['String']>;
  message?: Maybe<Scalars['String']>;
};

/** An enumeration. */
export enum AssignationLogLevel {
  /** Cancel Level */
  Cancel = 'CANCEL',
  /** CRITICAL Level */
  Critical = 'CRITICAL',
  /** DEBUG Level */
  Debug = 'DEBUG',
  /** Done Level */
  Done = 'DONE',
  /** ERROR Level */
  Error = 'ERROR',
  /** Event Level (only handled by plugins) */
  Event = 'EVENT',
  /** INFO Level */
  Info = 'INFO',
  /** YIELD Level */
  Return = 'RETURN',
  /** WARN Level */
  Warn = 'WARN',
  /** YIELD Level */
  Yield = 'YIELD'
}

/** An enumeration. */
export enum AssignationStatus {
  /** Acknowledged */
  Acknowledged = 'ACKNOWLEDGED',
  /** Was able to assign to a pod */
  Assigned = 'ASSIGNED',
  /** Assinment is beeing cancelled */
  Cancel = 'CANCEL',
  /** Cancelling (Assingment is currently being cancelled) */
  Canceling = 'CANCELING',
  /** Assignment has been cancelled. */
  Cancelled = 'CANCELLED',
  /** Critical Error (No Retries available) */
  Critical = 'CRITICAL',
  /** Denied (Assingment was rejected) */
  Denied = 'DENIED',
  /** Assignment has finished */
  Done = 'DONE',
  /** Error (Retrieable) */
  Error = 'ERROR',
  /** Pending */
  Pending = 'PENDING',
  /** Progress (Assignment has current Progress) */
  Progress = 'PROGRESS',
  /** Received (Assignment was received by an agent) */
  Received = 'RECEIVED',
  /** Assignation Returned (Only for Functions) */
  Returned = 'RETURNED',
  /** Assignment yielded a value (only for Generators) */
  Yield = 'YIELD'
}

/** An enumeration. */
export enum AssignationStatusInput {
  /** Acknowledged */
  Acknowledged = 'ACKNOWLEDGED',
  /** Was able to assign to a pod */
  Assigned = 'ASSIGNED',
  /** Assinment is beeing cancelled */
  Cancel = 'CANCEL',
  /** Cancelling (Assingment is currently being cancelled) */
  Canceling = 'CANCELING',
  /** Assignment has been cancelled. */
  Cancelled = 'CANCELLED',
  /** Critical Error (No Retries available) */
  Critical = 'CRITICAL',
  /** Denied (Assingment was rejected) */
  Denied = 'DENIED',
  /** Assignment has finished */
  Done = 'DONE',
  /** Error (Retrieable) */
  Error = 'ERROR',
  /** Pending */
  Pending = 'PENDING',
  /** Progress (Assignment has current Progress) */
  Progress = 'PROGRESS',
  /** Received (Assignment was received by an agent) */
  Received = 'RECEIVED',
  /** Assignation Returned (Only for Functions) */
  Returned = 'RETURNED',
  /** Assignment yielded a value (only for Generators) */
  Yield = 'YIELD'
}

export type AssignationsEvent = {
  __typename?: 'AssignationsEvent';
  create?: Maybe<Assignation>;
  delete?: Maybe<Scalars['ID']>;
  update?: Maybe<Assignation>;
};

/** A predicate that checks if an atribute fullfills a certain condition  */
export type AttributePredicate = Annotation & {
  __typename?: 'AttributePredicate';
  /** The annotations for this attribute */
  annotations?: Maybe<Array<Maybe<Annotation>>>;
  /** The attribute to check */
  attribute: Scalars['String'];
  /** The name of the annotation */
  kind?: Maybe<Scalars['String']>;
};

export type Binds = {
  __typename?: 'Binds';
  /** The clients of this bind */
  clients?: Maybe<Array<Maybe<LokClient>>>;
  /** The templates of this bind */
  templates?: Maybe<Array<Maybe<Template>>>;
};

export type BoolWidget = Widget & {
  __typename?: 'BoolWidget';
  /** The set-keys this widget depends on, check *query parameters* */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  kind: Scalars['String'];
};

export type ChangePermissionsResult = {
  __typename?: 'ChangePermissionsResult';
  message?: Maybe<Scalars['String']>;
  success?: Maybe<Scalars['Boolean']>;
};

export type ChildPort = {
  __typename?: 'ChildPort';
  /** The annotations of this port */
  annotations?: Maybe<Array<Maybe<Annotation>>>;
  /** Description of the Widget */
  assignWidget?: Maybe<Widget>;
  /** The child */
  child?: Maybe<ChildPort>;
  default?: Maybe<Scalars['Any']>;
  /** The corresponding Model */
  identifier?: Maybe<Scalars['Identifier']>;
  /** the type of input */
  kind: PortKind;
  /** Is this argument nullable */
  nullable: Scalars['Boolean'];
  /** A return widget */
  returnWidget?: Maybe<ReturnWidget>;
  /** The scope of this port */
  scope: Scope;
};

export type ChildPortInput = {
  /** The annotations of this argument */
  annotations?: InputMaybe<Array<InputMaybe<AnnotationInput>>>;
  /** The child of this argument */
  assignWidget?: InputMaybe<WidgetInput>;
  /** The child port */
  child?: InputMaybe<ChildPortInput>;
  /** The identifier */
  identifier?: InputMaybe<Scalars['Identifier']>;
  /** The type of this port */
  kind?: InputMaybe<PortKindInput>;
  /** The name of this port */
  name?: InputMaybe<Scalars['String']>;
  /** Is this argument nullable */
  nullable: Scalars['Boolean'];
  /** The child of this argument */
  returnWidget?: InputMaybe<ReturnWidgetInput>;
  /** The scope of this port */
  scope: Scope;
};

export type Choice = {
  __typename?: 'Choice';
  label: Scalars['String'];
  value: Scalars['GenericScalar'];
};

export type ChoiceInput = {
  label: Scalars['String'];
  value: Scalars['AnyInput'];
};

export type ChoiceReturnWidget = ReturnWidget & {
  __typename?: 'ChoiceReturnWidget';
  /** A list of choices */
  choices?: Maybe<Array<Maybe<Choice>>>;
  kind: Scalars['String'];
};

export type ChoiceWidget = Widget & {
  __typename?: 'ChoiceWidget';
  /** A list of choices */
  choices?: Maybe<Array<Maybe<Choice>>>;
  /** The set-keys this widget depends on, check *query parameters* */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  kind: Scalars['String'];
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
  FacadeAgent = 'FACADE_AGENT',
  FacadeApprepository = 'FACADE_APPREPOSITORY',
  FacadeAssignation = 'FACADE_ASSIGNATION',
  FacadeAssignationlog = 'FACADE_ASSIGNATIONLOG',
  FacadeMirrorrepository = 'FACADE_MIRRORREPOSITORY',
  FacadeNode = 'FACADE_NODE',
  FacadeProvision = 'FACADE_PROVISION',
  FacadeProvisionlog = 'FACADE_PROVISIONLOG',
  FacadeRegistry = 'FACADE_REGISTRY',
  FacadeRepository = 'FACADE_REPOSITORY',
  FacadeReservation = 'FACADE_RESERVATION',
  FacadeReservationlog = 'FACADE_RESERVATIONLOG',
  FacadeStructure = 'FACADE_STRUCTURE',
  FacadeTemplate = 'FACADE_TEMPLATE',
  FacadeTestcase = 'FACADE_TESTCASE',
  FacadeTestresult = 'FACADE_TESTRESULT',
  FacadeWaiter = 'FACADE_WAITER'
}

export type CreateMirrorReturn = {
  __typename?: 'CreateMirrorReturn';
  created?: Maybe<Scalars['Boolean']>;
  repo?: Maybe<MirrorRepository>;
};

export type CustomAnnotation = Annotation & {
  __typename?: 'CustomAnnotation';
  /** The arguments for this annotation */
  args?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** The hook for this annotation */
  hook: Scalars['String'];
  /** The name of the annotation */
  kind?: Maybe<Scalars['String']>;
};

export type CustomReturnWidget = ReturnWidget & {
  __typename?: 'CustomReturnWidget';
  /** A hook for the app to call */
  hook?: Maybe<Scalars['String']>;
  kind: Scalars['String'];
  /** A hook for the app to call */
  ward?: Maybe<Scalars['String']>;
};

export type CustomWidget = Widget & {
  __typename?: 'CustomWidget';
  /** The set-keys this widget depends on, check *query parameters* */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** A hook for the ward to call */
  hook?: Maybe<Scalars['String']>;
  kind: Scalars['String'];
  /** A ward for the app to call */
  ward?: Maybe<Scalars['String']>;
};

/** A definition for a template */
export type DefinitionInput = {
  /** The Args */
  args: Array<InputMaybe<PortInput>>;
  /** A description for the Node */
  description?: InputMaybe<Scalars['String']>;
  idempotent?: InputMaybe<Scalars['Boolean']>;
  /** The Interfaces this node provides makes sense of the metadata */
  interfaces: Array<InputMaybe<Scalars['String']>>;
  /** The nodes this is a test for */
  isTestFor?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  /** The variety */
  kind: NodeKindInput;
  /** The name of this template */
  name: Scalars['String'];
  portGroups: Array<InputMaybe<PortGroupInput>>;
  pure?: InputMaybe<Scalars['Boolean']>;
  /** The Returns */
  returns: Array<InputMaybe<PortInput>>;
};

export type DeleteAgentReturn = {
  __typename?: 'DeleteAgentReturn';
  id?: Maybe<Scalars['String']>;
};

export type DeleteNodeReturn = {
  __typename?: 'DeleteNodeReturn';
  id?: Maybe<Scalars['String']>;
};

export type DeleteRepoReturn = {
  __typename?: 'DeleteRepoReturn';
  id?: Maybe<Scalars['String']>;
};

export type DeleteTestCaseResult = {
  __typename?: 'DeleteTestCaseResult';
  id?: Maybe<Scalars['String']>;
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

export type ImageReturnWidget = ReturnWidget & {
  __typename?: 'ImageReturnWidget';
  kind: Scalars['String'];
  /** A query that returns an image path */
  query?: Maybe<Scalars['String']>;
  /** A hook for the app to call */
  ward?: Maybe<Scalars['String']>;
};

export type IntWidget = Widget & {
  __typename?: 'IntWidget';
  /** The set-keys this widget depends on, check *query parameters* */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  kind: Scalars['String'];
  /** A Complex description */
  query?: Maybe<Scalars['String']>;
};

export type IsPredicate = Annotation & {
  __typename?: 'IsPredicate';
  /** The name of the annotation */
  kind?: Maybe<Scalars['String']>;
  /** The arguments for this annotation */
  predicate: IsPredicateType;
};

export enum IsPredicateType {
  Digit = 'DIGIT',
  Higher = 'HIGHER',
  Lower = 'LOWER'
}

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

export type LinkWidget = Widget & {
  __typename?: 'LinkWidget';
  /** The set-keys this widget depends on, check *query parameters* */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  kind: Scalars['String'];
  /** A Complex description */
  linkbuilder?: Maybe<Scalars['String']>;
};

/** An enumeration. */
export enum LogLevelInput {
  /** Cancel Level */
  Cancel = 'CANCEL',
  /** CRITICAL Level */
  Critical = 'CRITICAL',
  /** DEBUG Level */
  Debug = 'DEBUG',
  /** Done Level */
  Done = 'DONE',
  /** ERROR Level */
  Error = 'ERROR',
  /** Event Level (only handled by plugins) */
  Event = 'EVENT',
  /** INFO Level */
  Info = 'INFO',
  /** YIELD Level */
  Return = 'RETURN',
  /** WARN Level */
  Warn = 'WARN',
  /** YIELD Level */
  Yield = 'YIELD'
}

export type LokApp = {
  __typename?: 'LokApp';
  /** The Associated App */
  apprepositorySet: Array<AppRepository>;
  /** The app is this assignation */
  assignationSet: Array<Assignation>;
  id: Scalars['ID'];
  identifier: Scalars['String'];
  lokclientSet: Array<LokClient>;
  /** This provision creator */
  provisionSet: Array<Provision>;
  /** The Associated App */
  registrySet: Array<Registry>;
  /** This Reservations app */
  reservationSet: Array<Reservation>;
  version: Scalars['String'];
};

export type LokClient = {
  __typename?: 'LokClient';
  app: LokApp;
  clientId: Scalars['String'];
  grantType: LokClientGrantType;
  id: Scalars['ID'];
  iss: Scalars['String'];
  name: Scalars['String'];
  registrySet: Array<Registry>;
};

/** An enumeration. */
export enum LokClientGrantType {
  /** Authorization Code */
  AuthorizationCode = 'AUTHORIZATION_CODE',
  /** Backend (Client Credentials) */
  ClientCredentials = 'CLIENT_CREDENTIALS',
  /** Implicit Grant */
  Implicit = 'IMPLICIT',
  /** Password */
  Password = 'PASSWORD',
  /** Django Session */
  Session = 'SESSION'
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

export type MessageInput = {
  data: Scalars['AnyInput'];
  kind: MessageKind;
  reference: Scalars['String'];
  text: Scalars['String'];
};

export enum MessageKind {
  Assign = 'ASSIGN',
  Cancel = 'CANCEL',
  Tell = 'TELL',
  Terminate = 'TERMINATE'
}

export type MirrorRepository = Repository & {
  __typename?: 'MirrorRepository';
  /** Id of the Repository */
  id: Scalars['ID'];
  installedAt: Scalars['DateTime'];
  /** The Name of the Repository */
  name?: Maybe<Scalars['String']>;
  nodes?: Maybe<Array<Maybe<Node>>>;
  type: RepositoryType;
  /** A world-unique identifier */
  unique: Scalars['String'];
  updatedAt: Scalars['DateTime'];
  url?: Maybe<Scalars['String']>;
};


export type MirrorRepositoryNodesArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  package?: InputMaybe<Scalars['String']>;
};

/** The root Mutation */
export type Mutation = {
  __typename?: 'Mutation';
  ack?: Maybe<Assignation>;
  assign?: Maybe<Assignation>;
  /** Kick an agent (only signed in users) */
  blockAgent?: Maybe<Agent>;
  /** Kick an agent (only signed in users) */
  bounceAgent?: Maybe<Agent>;
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
  /** Create Repostiory */
  createMirror?: Maybe<CreateMirrorReturn>;
  createTemplate?: Maybe<Template>;
  /** Create Repostiory */
  createTestCase?: Maybe<TestCase>;
  /** Create Test Result */
  createTestResult?: Maybe<TestResult>;
  /** Deletes an agent (only signed in users) */
  deleteAgent?: Maybe<DeleteAgentReturn>;
  /** Create an experiment (only signed in users) */
  deleteNode?: Maybe<DeleteNodeReturn>;
  /**
   * Delete TestCase
   *
   *     This mutation deletes an TestCase and returns the deleted TestCase.
   */
  deleteTestCase?: Maybe<DeleteTestCaseResult>;
  /** Create an experiment (only signed in users) */
  deleterepo?: Maybe<DeleteRepoReturn>;
  /** Kick an agent (only signed in users) */
  kickAgent?: Maybe<Agent>;
  link?: Maybe<Provision>;
  /** Scan allows you to add Datapoints to your Arnheim Schema, this is only available to Admin users */
  provide?: Maybe<Provision>;
  purgeNodes?: Maybe<PurgeNodesReturn>;
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
  reserve?: Maybe<Reservation>;
  /** Create Repostiory */
  resetAgents?: Maybe<ResetAgentsReturn>;
  /** Create Repostiory */
  resetAssignations?: Maybe<ResetAssignationsReturn>;
  /** Create Repostiory */
  resetNodes?: Maybe<ResetNodesReturn>;
  /** Create Repostiory */
  resetProvisions?: Maybe<ResetProvisionsReturn>;
  /** Create Repostiory */
  resetRepository?: Maybe<ResetRepositoryReturn>;
  /** Create Repostiory */
  resetReservations?: Maybe<ResetReservationsReturn>;
  /**
   * Create an Comment
   *
   *     This mutation resolves a comment. By resolving a comment, it will be marked as resolved,
   *     and the user that resolved it will be set as the resolver.
   *
   *     (only signed in users)
   */
  resolveComment?: Maybe<Comment>;
  slate?: Maybe<Array<Maybe<Scalars['ID']>>>;
  tell?: Maybe<Tell>;
  unassign?: Maybe<Assignation>;
  unlink?: Maybe<Provision>;
  unprovide?: Maybe<UnprovideReturn>;
  unreserve?: Maybe<UnreserveResult>;
  /** Create an experiment (only signed in users) */
  updateMirror?: Maybe<UpdateMirrorReturn>;
};


/** The root Mutation */
export type MutationAckArgs = {
  assignation: Scalars['ID'];
};


/** The root Mutation */
export type MutationAssignArgs = {
  args?: InputMaybe<Array<InputMaybe<Scalars['AnyInput']>>>;
  cached?: InputMaybe<Scalars['Boolean']>;
  log?: InputMaybe<Scalars['Boolean']>;
  parent?: InputMaybe<Scalars['ID']>;
  reference?: InputMaybe<Scalars['String']>;
  reservation: Scalars['ID'];
};


/** The root Mutation */
export type MutationBlockAgentArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationBounceAgentArgs = {
  id: Scalars['ID'];
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
export type MutationCreateMirrorArgs = {
  name: Scalars['String'];
  url: Scalars['String'];
};


/** The root Mutation */
export type MutationCreateTemplateArgs = {
  definition: DefinitionInput;
  extensions?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  imitate?: InputMaybe<Scalars['ID']>;
  instanceId: Scalars['ID'];
  interface: Scalars['String'];
  params?: InputMaybe<Scalars['GenericScalar']>;
  policy?: InputMaybe<Scalars['GenericScalar']>;
};


/** The root Mutation */
export type MutationCreateTestCaseArgs = {
  description?: InputMaybe<Scalars['String']>;
  isBenchmark?: InputMaybe<Scalars['Boolean']>;
  key: Scalars['String'];
  name: Scalars['String'];
  node: Scalars['ID'];
};


/** The root Mutation */
export type MutationCreateTestResultArgs = {
  case: Scalars['ID'];
  passed: Scalars['Boolean'];
  result?: InputMaybe<Scalars['String']>;
  template: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteAgentArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteNodeArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleteTestCaseArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationDeleterepoArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationKickAgentArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationLinkArgs = {
  provision: Scalars['ID'];
  reservation: Scalars['ID'];
};


/** The root Mutation */
export type MutationProvideArgs = {
  params?: InputMaybe<Scalars['GenericScalar']>;
  template: Scalars['ID'];
};


/** The root Mutation */
export type MutationPurgeNodesArgs = {
  app?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationReplyToArgs = {
  descendents: Array<InputMaybe<DescendendInput>>;
  parent: Scalars['ID'];
};


/** The root Mutation */
export type MutationReserveArgs = {
  allowAutoRequest?: InputMaybe<Scalars['Boolean']>;
  appGroup?: InputMaybe<Scalars['ID']>;
  binds?: InputMaybe<ReserveBindsInput>;
  hash?: InputMaybe<Scalars['String']>;
  imitate?: InputMaybe<Scalars['ID']>;
  node?: InputMaybe<Scalars['ID']>;
  params?: InputMaybe<ReserveParamsInput>;
  persist?: InputMaybe<Scalars['Boolean']>;
  provision?: InputMaybe<Scalars['ID']>;
  reference?: InputMaybe<Scalars['String']>;
  title?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationResetAssignationsArgs = {
  exclude?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
};


/** The root Mutation */
export type MutationResetNodesArgs = {
  exclude?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};


/** The root Mutation */
export type MutationResetProvisionsArgs = {
  exclude?: InputMaybe<Array<InputMaybe<ProvisionStatusInput>>>;
};


/** The root Mutation */
export type MutationResetReservationsArgs = {
  exclude?: InputMaybe<Array<InputMaybe<ReservationStatusInput>>>;
};


/** The root Mutation */
export type MutationResolveCommentArgs = {
  id: Scalars['ID'];
  imitate?: InputMaybe<Scalars['ID']>;
};


/** The root Mutation */
export type MutationSlateArgs = {
  identifier: Scalars['String'];
};


/** The root Mutation */
export type MutationTellArgs = {
  message: MessageInput;
  reservation: Scalars['ID'];
};


/** The root Mutation */
export type MutationUnassignArgs = {
  assignation?: InputMaybe<Scalars['ID']>;
  reference?: InputMaybe<Scalars['String']>;
};


/** The root Mutation */
export type MutationUnlinkArgs = {
  provision: Scalars['ID'];
  reservation: Scalars['ID'];
  safe?: InputMaybe<Scalars['Boolean']>;
};


/** The root Mutation */
export type MutationUnprovideArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Mutation */
export type MutationUnreserveArgs = {
  id: Scalars['ID'];
};


/** The root Mutation */
export type MutationUpdateMirrorArgs = {
  id: Scalars['ID'];
};

export type Node = {
  __typename?: 'Node';
  args?: Maybe<Array<Maybe<Port>>>;
  /** A description for the Node */
  description: Scalars['String'];
  /** The hash of the Node (completely unique) */
  hash: Scalars['String'];
  id: Scalars['ID'];
  /** Is this function pure. e.g can we cache the result? */
  idempotent: Scalars['Boolean'];
  /** Beautiful images for beautiful Nodes */
  image?: Maybe<Scalars['String']>;
  interfaces?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** The nodes this node tests */
  isTestFor?: Maybe<Array<Maybe<Node>>>;
  /** Function, generator? Check async Programming Textbook */
  kind: NodeKind;
  meta?: Maybe<Scalars['GenericScalar']>;
  /** The cleartext name of this Node */
  name: Scalars['String'];
  /** The port groups */
  portGroups?: Maybe<Array<Maybe<PortGroup>>>;
  /** Is this function pure. e.g can we cache the result? */
  pure: Scalars['Boolean'];
  /** The node this reservation connects */
  reservations: Array<Reservation>;
  returns?: Maybe<Array<Maybe<Port>>>;
  /** The scope of this port */
  scope: NodeScope;
  templates?: Maybe<Array<Maybe<Template>>>;
  /** The node this test belongs to */
  testcases: Array<TestCase>;
  /** The nodes this node tests */
  tests?: Maybe<Array<Maybe<Node>>>;
};


export type NodeTemplatesArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  interface?: InputMaybe<Scalars['String']>;
  name?: InputMaybe<Scalars['String']>;
  node?: InputMaybe<Scalars['ID']>;
  nodeDescription?: InputMaybe<Scalars['String']>;
  nodeName?: InputMaybe<Scalars['String']>;
  package?: InputMaybe<Scalars['String']>;
  providable?: InputMaybe<Scalars['Boolean']>;
  scopes?: InputMaybe<Array<InputMaybe<NodeScope>>>;
  search?: InputMaybe<Scalars['String']>;
};

export type NodeEvent = {
  __typename?: 'NodeEvent';
  created?: Maybe<Node>;
  deleted?: Maybe<Scalars['ID']>;
  updated?: Maybe<Node>;
};

/** An enumeration. */
export enum NodeKind {
  /** Function */
  Function = 'FUNCTION',
  /** Generator */
  Generator = 'GENERATOR'
}

/** An enumeration. */
export enum NodeKindInput {
  /** Function */
  Function = 'FUNCTION',
  /** Generator */
  Generator = 'GENERATOR'
}

export enum NodeScope {
  BridgeGlobalToLocal = 'BRIDGE_GLOBAL_TO_LOCAL',
  BridgeLocalToGlobal = 'BRIDGE_LOCAL_TO_GLOBAL',
  Global = 'GLOBAL',
  Local = 'LOCAL'
}

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

/** A Port */
export type Port = {
  __typename?: 'Port';
  /** The annotations of this port */
  annotations?: Maybe<Array<Maybe<Annotation>>>;
  /** Description of the Widget */
  assignWidget?: Maybe<Widget>;
  /** The child */
  child?: Maybe<ChildPort>;
  default?: Maybe<Scalars['Any']>;
  /** A description for this Port */
  description?: Maybe<Scalars['String']>;
  /** The port groups */
  groups?: Maybe<Array<Maybe<Scalars['String']>>>;
  /** The corresponding Model */
  identifier?: Maybe<Scalars['Identifier']>;
  key: Scalars['String'];
  /** the type of input */
  kind: PortKind;
  label?: Maybe<Scalars['String']>;
  nullable: Scalars['Boolean'];
  /** A return widget */
  returnWidget?: Maybe<ReturnWidget>;
  /** The scope of this port */
  scope: Scope;
};

export type PortGroup = {
  __typename?: 'PortGroup';
  hidden?: Maybe<Scalars['Boolean']>;
  key: Scalars['String'];
};

export type PortGroupInput = {
  /** Is this port group hidden */
  hidden?: InputMaybe<Scalars['Boolean']>;
  /** The key of the port group */
  key: Scalars['String'];
};

export type PortInput = {
  /** The annotations of this argument */
  annotations?: InputMaybe<Array<InputMaybe<AnnotationInput>>>;
  /** The child of this argument */
  assignWidget?: InputMaybe<WidgetInput>;
  /** The child of this argument */
  child?: InputMaybe<ChildPortInput>;
  /** The key of the arg */
  default?: InputMaybe<Scalars['Any']>;
  /** The description of this argument */
  description?: InputMaybe<Scalars['String']>;
  /** The port group of this argument */
  groups?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  /** The identifier */
  identifier?: InputMaybe<Scalars['Identifier']>;
  /** The key of the arg */
  key: Scalars['String'];
  /** The type of this argument */
  kind: PortKindInput;
  /** The name of this argument */
  label?: InputMaybe<Scalars['String']>;
  /** The name of this argument */
  name?: InputMaybe<Scalars['String']>;
  /** Is this argument nullable */
  nullable: Scalars['Boolean'];
  /** The child of this argument */
  returnWidget?: InputMaybe<ReturnWidgetInput>;
  /** The scope of this port */
  scope: Scope;
};

export enum PortKind {
  Bool = 'BOOL',
  Dict = 'DICT',
  Float = 'FLOAT',
  Int = 'INT',
  List = 'LIST',
  String = 'STRING',
  Structure = 'STRUCTURE'
}

export enum PortKindInput {
  Bool = 'BOOL',
  Dict = 'DICT',
  Float = 'FLOAT',
  Int = 'INT',
  List = 'LIST',
  String = 'STRING',
  Structure = 'STRUCTURE'
}

export type Provision = {
  __typename?: 'Provision';
  /** Access Strategy for this Provision */
  access: ProvisionAccess;
  /** Is this Provision bound to a certain Agent? */
  agent?: Maybe<Agent>;
  /** This provision creator */
  app?: Maybe<LokApp>;
  assignations?: Maybe<Array<Maybe<Assignation>>>;
  /** Was this Reservation caused by a Provision? */
  causedReservations: Array<Reservation>;
  context?: Maybe<Scalars['GenericScalar']>;
  createdAt: Scalars['DateTime'];
  /** This provision creator */
  creator?: Maybe<User>;
  /** Is the connection to this Provision lost? */
  dropped: Scalars['Boolean'];
  extensions?: Maybe<Scalars['GenericScalar']>;
  id: Scalars['ID'];
  log?: Maybe<Array<Maybe<ProvisionLog>>>;
  /** The Deployment Mode for this Provisions */
  mode: ProvisionMode;
  params?: Maybe<ProvisionParams>;
  /** The Unique identifier of this Provision */
  reference: Scalars['String'];
  /** Reservation that created this provision (if we were auto created) */
  reservation?: Maybe<Reservation>;
  /** The Provisions this reservation connects */
  reservations: Array<Reservation>;
  /** Current lifecycle of Provision */
  status: ProvisionStatus;
  /** Clear Text status of the Provision as for now */
  statusmessage: Scalars['String'];
  template: Template;
  /** A Short Hand Way to identify this reservation for you */
  title?: Maybe<Scalars['String']>;
  /** A Unique identifier for this Topic */
  unique: Scalars['UUID'];
  updatedAt: Scalars['DateTime'];
};


export type ProvisionAssignationsArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  o?: InputMaybe<Scalars['String']>;
  parent?: InputMaybe<Scalars['ID']>;
  reference?: InputMaybe<Scalars['String']>;
  reservation?: InputMaybe<Scalars['ID']>;
  reservationReference?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
};


export type ProvisionLogArgs = {
  createdAt?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  level?: InputMaybe<LogLevelInput>;
  o?: InputMaybe<Scalars['String']>;
};

/** An enumeration. */
export enum ProvisionAccess {
  /** Everyone can link to this Topic */
  Everyone = 'EVERYONE',
  /** This Topic is Only Accessible linkable for its creating User */
  Exclusive = 'EXCLUSIVE'
}

export type ProvisionEvent = {
  __typename?: 'ProvisionEvent';
  log?: Maybe<ProvisionLogEvent>;
};

export type ProvisionLog = {
  __typename?: 'ProvisionLog';
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  level: ProvisionLogLevel;
  message?: Maybe<Scalars['String']>;
  /** The provision this log item belongs to */
  provision: Provision;
};

export type ProvisionLogEvent = {
  __typename?: 'ProvisionLogEvent';
  level?: Maybe<Scalars['String']>;
  message?: Maybe<Scalars['String']>;
};

/** An enumeration. */
export enum ProvisionLogLevel {
  /** Cancel Level */
  Cancel = 'CANCEL',
  /** CRITICAL Level */
  Critical = 'CRITICAL',
  /** DEBUG Level */
  Debug = 'DEBUG',
  /** Done Level */
  Done = 'DONE',
  /** ERROR Level */
  Error = 'ERROR',
  /** Event Level (only handled by plugins) */
  Event = 'EVENT',
  /** INFO Level */
  Info = 'INFO',
  /** YIELD Level */
  Return = 'RETURN',
  /** WARN Level */
  Warn = 'WARN',
  /** YIELD Level */
  Yield = 'YIELD'
}

/** An enumeration. */
export enum ProvisionMode {
  /** Debug Mode (Node might be constantly evolving) */
  Debug = 'DEBUG',
  /** Production Mode (Node might be constantly evolving) */
  Production = 'PRODUCTION'
}

export type ProvisionParams = {
  __typename?: 'ProvisionParams';
  autoUnprovide?: Maybe<Scalars['Boolean']>;
};

/** An enumeration. */
export enum ProvisionStatus {
  /** Active (Provision is currently active) */
  Active = 'ACTIVE',
  /** Bound (Provision was bound to an Agent) */
  Bound = 'BOUND',
  /** Cancelling (Provisions is currently being cancelled) */
  Canceling = 'CANCELING',
  /** Cancelled (Provision was cancelled by the User and will no longer create Topics) */
  Cancelled = 'CANCELLED',
  /** Critical (Provision resulted in an critical system error) */
  Critical = 'CRITICAL',
  /** Denied (Provision was rejected for this User) */
  Denied = 'DENIED',
  /** Ended (Provision was cancelled by the Platform and will no longer create Topics) */
  Ended = 'ENDED',
  /** Error (Reservation was not able to be performed (See StatusMessage) */
  Error = 'ERROR',
  /** Inactive (Provision is currently not active) */
  Inactive = 'INACTIVE',
  /** Lost (Subscribers to this Topic have lost their connection) */
  Lost = 'LOST',
  /** Pending (Request has been created and waits for its initial creation) */
  Pending = 'PENDING',
  /** Providing (Request has been send to its Agent and waits for Result */
  Providing = 'PROVIDING',
  /** Reconnecting (We are trying to Reconnect to this Topic) */
  Reconnecting = 'RECONNECTING'
}

/** An enumeration. */
export enum ProvisionStatusInput {
  /** Active (Provision is currently active) */
  Active = 'ACTIVE',
  /** Bound (Provision was bound to an Agent) */
  Bound = 'BOUND',
  /** Cancelling (Provisions is currently being cancelled) */
  Canceling = 'CANCELING',
  /** Cancelled (Provision was cancelled by the User and will no longer create Topics) */
  Cancelled = 'CANCELLED',
  /** Critical (Provision resulted in an critical system error) */
  Critical = 'CRITICAL',
  /** Denied (Provision was rejected for this User) */
  Denied = 'DENIED',
  /** Lost (Subscribers to this Topic have lost their connection) */
  Disconnected = 'DISCONNECTED',
  /** Ended (Provision was cancelled by the Platform and will no longer create Topics) */
  Ended = 'ENDED',
  /** Error (Reservation was not able to be performed (See StatusMessage) */
  Error = 'ERROR',
  /** Inactive (Provision is currently not active) */
  Inactive = 'INACTIVE',
  /** Pending (Request has been created and waits for its initial creation) */
  Pending = 'PENDING',
  /** Providing (Request has been send to its Agent and waits for Result */
  Providing = 'PROVIDING',
  /** Reconnecting (We are trying to Reconnect to this Topic) */
  Reconnecting = 'RECONNECTING'
}

export type ProvisionsEvent = {
  __typename?: 'ProvisionsEvent';
  create?: Maybe<Provision>;
  delete?: Maybe<Scalars['ID']>;
  update?: Maybe<Provision>;
};

export type PurgeNodesReturn = {
  __typename?: 'PurgeNodesReturn';
  ids?: Maybe<Array<Maybe<Scalars['String']>>>;
};

/** The root Query */
export type Query = {
  __typename?: 'Query';
  agent?: Maybe<Agent>;
  agents?: Maybe<Array<Maybe<Agent>>>;
  allnodes?: Maybe<Array<Maybe<Node>>>;
  allprovisions?: Maybe<Array<Maybe<Provision>>>;
  allrepositories?: Maybe<Array<Maybe<Repository>>>;
  allreservations?: Maybe<Array<Maybe<Reservation>>>;
  assignation?: Maybe<Assignation>;
  assignations?: Maybe<Array<Maybe<Assignation>>>;
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
  hello?: Maybe<Scalars['String']>;
  linkableprovisions?: Maybe<Array<Maybe<Provision>>>;
  me?: Maybe<User>;
  myagents?: Maybe<Array<Maybe<Agent>>>;
  mymentions?: Maybe<Array<Maybe<Comment>>>;
  myprovisions?: Maybe<Array<Maybe<Provision>>>;
  myrepositories?: Maybe<Array<Maybe<Repository>>>;
  myrequests?: Maybe<Array<Maybe<Assignation>>>;
  myreservations?: Maybe<Array<Maybe<Reservation>>>;
  mytodos?: Maybe<Array<Maybe<Assignation>>>;
  /**
   * Asss
   *
   *     Is A query for all of these specials in the world
   *
   */
  node?: Maybe<Node>;
  permissionsFor?: Maybe<Array<Maybe<Permission>>>;
  permissionsOf?: Maybe<PermissionsOfReturn>;
  provision?: Maybe<Provision>;
  provisions?: Maybe<Array<Maybe<Provision>>>;
  registries?: Maybe<Array<Maybe<Registry>>>;
  registry?: Maybe<Registry>;
  repository?: Maybe<Repository>;
  requests?: Maybe<Array<Maybe<Assignation>>>;
  reservableTemplates?: Maybe<Array<Maybe<Template>>>;
  reservation?: Maybe<Reservation>;
  reservations?: Maybe<Array<Maybe<Reservation>>>;
  structure?: Maybe<Structure>;
  structures?: Maybe<Array<Maybe<Structure>>>;
  template?: Maybe<Template>;
  templates?: Maybe<Array<Maybe<Template>>>;
  testcase?: Maybe<TestCase>;
  testcases?: Maybe<Array<Maybe<TestCase>>>;
  testresult?: Maybe<TestResult>;
  testresults?: Maybe<Array<Maybe<TestResult>>>;
  todos?: Maybe<Array<Maybe<Assignation>>>;
  user?: Maybe<User>;
  /** Get a list of users */
  users?: Maybe<Array<Maybe<User>>>;
  void?: Maybe<Scalars['String']>;
};


/** The root Query */
export type QueryAgentArgs = {
  client?: InputMaybe<Scalars['ID']>;
  id?: InputMaybe<Scalars['ID']>;
  instance?: InputMaybe<Scalars['ID']>;
  sub?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryAgentsArgs = {
  app?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  registry?: InputMaybe<Scalars['ID']>;
  search?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<Array<InputMaybe<AgentStatusInput>>>;
};


/** The root Query */
export type QueryAllnodesArgs = {
  argTypes?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  interfaces?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  repository?: InputMaybe<Scalars['ID']>;
  restrict?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  scopes?: InputMaybe<Array<InputMaybe<NodeScope>>>;
  search?: InputMaybe<Scalars['String']>;
  templated?: InputMaybe<Scalars['Boolean']>;
  type?: InputMaybe<NodeKindInput>;
};


/** The root Query */
export type QueryAllprovisionsArgs = {
  agent?: InputMaybe<Scalars['ID']>;
  client?: InputMaybe<Scalars['ID']>;
  clientId?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  status?: InputMaybe<Array<InputMaybe<ProvisionStatusInput>>>;
};


/** The root Query */
export type QueryAssignationArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryAssignationsArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  limit?: InputMaybe<Scalars['Int']>;
  o?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  parent?: InputMaybe<Scalars['ID']>;
  reference?: InputMaybe<Scalars['String']>;
  reservation?: InputMaybe<Scalars['ID']>;
  reservationReference?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
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
export type QueryLinkableprovisionsArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryMyagentsArgs = {
  app?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  registry?: InputMaybe<Scalars['ID']>;
  search?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<Array<InputMaybe<AgentStatusInput>>>;
};


/** The root Query */
export type QueryMyprovisionsArgs = {
  exclude?: InputMaybe<Array<InputMaybe<ProvisionStatusInput>>>;
  filter?: InputMaybe<Array<InputMaybe<ProvisionStatusInput>>>;
};


/** The root Query */
export type QueryMyrequestsArgs = {
  exclude?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
  filter?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
  limit?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryMyreservationsArgs = {
  exclude?: InputMaybe<Array<InputMaybe<ReservationStatusInput>>>;
  filter?: InputMaybe<Array<InputMaybe<ReservationStatusInput>>>;
};


/** The root Query */
export type QueryMytodosArgs = {
  exclude?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
  filter?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
  limit?: InputMaybe<Scalars['Int']>;
};


/** The root Query */
export type QueryNodeArgs = {
  hash?: InputMaybe<Scalars['String']>;
  id?: InputMaybe<Scalars['ID']>;
  q?: InputMaybe<Scalars['QString']>;
  template?: InputMaybe<Scalars['ID']>;
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
export type QueryProvisionArgs = {
  id: Scalars['ID'];
};


/** The root Query */
export type QueryProvisionsArgs = {
  exclude?: InputMaybe<Array<InputMaybe<ProvisionStatusInput>>>;
  filter?: InputMaybe<Array<InputMaybe<ProvisionStatusInput>>>;
  instanceId?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryRegistriesArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  unique?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryRegistryArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryRepositoryArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryRequestsArgs = {
  exclude?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
  filter?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
  identifier?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryReservableTemplatesArgs = {
  hash?: InputMaybe<Scalars['String']>;
  node?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryReservationArgs = {
  id?: InputMaybe<Scalars['ID']>;
  provision?: InputMaybe<Scalars['ID']>;
  reference?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryReservationsArgs = {
  exclude?: InputMaybe<Array<InputMaybe<ReservationStatusInput>>>;
  filter?: InputMaybe<Array<InputMaybe<ReservationStatusInput>>>;
  identifier?: InputMaybe<Scalars['String']>;
  nodeInterfaces?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
};


/** The root Query */
export type QueryStructureArgs = {
  id?: InputMaybe<Scalars['ID']>;
  identifier?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryTemplateArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryTemplatesArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  interface?: InputMaybe<Scalars['String']>;
  limit?: InputMaybe<Scalars['Int']>;
  name?: InputMaybe<Scalars['String']>;
  node?: InputMaybe<Scalars['ID']>;
  nodeDescription?: InputMaybe<Scalars['String']>;
  nodeName?: InputMaybe<Scalars['String']>;
  offset?: InputMaybe<Scalars['Int']>;
  package?: InputMaybe<Scalars['String']>;
  providable?: InputMaybe<Scalars['Boolean']>;
  scopes?: InputMaybe<Array<InputMaybe<NodeScope>>>;
  search?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryTestcaseArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryTestcasesArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  key?: InputMaybe<Scalars['String']>;
  limit?: InputMaybe<Scalars['Int']>;
  node?: InputMaybe<Scalars['ID']>;
  offset?: InputMaybe<Scalars['Int']>;
  search?: InputMaybe<Scalars['String']>;
};


/** The root Query */
export type QueryTestresultArgs = {
  id?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryTestresultsArgs = {
  case?: InputMaybe<Scalars['ID']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  key?: InputMaybe<Scalars['String']>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  search?: InputMaybe<Scalars['String']>;
  template?: InputMaybe<Scalars['ID']>;
};


/** The root Query */
export type QueryTodosArgs = {
  exclude?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
  filter?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
  identifier?: InputMaybe<Scalars['String']>;
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

export type QueryWidget = Widget & {
  __typename?: 'QueryWidget';
  /** The set-keys this widget depends on, check *query parameters* */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  kind: Scalars['String'];
  /** A Complex description */
  query?: Maybe<Scalars['String']>;
};

export type Registry = {
  __typename?: 'Registry';
  /** The provide might be limited to a instance like ImageJ belonging to a specific person. Is nullable for backend users */
  agents: Array<Agent>;
  /** The Associated App */
  app?: Maybe<LokApp>;
  client: LokClient;
  id: Scalars['ID'];
  /** @deprecated Will be replaced in the future */
  name?: Maybe<Scalars['String']>;
  /** The Associatsed App */
  user?: Maybe<User>;
  /** The provide might be limited to a instance like ImageJ belonging to a specific person. Is nullable for backend users */
  waiters: Array<Waiter>;
};

export type Repository = {
  /** Id of the Repository */
  id: Scalars['ID'];
  /** The Name of the Repository */
  name?: Maybe<Scalars['String']>;
  nodes?: Maybe<Array<Maybe<Node>>>;
};


export type RepositoryNodesArgs = {
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  package?: InputMaybe<Scalars['String']>;
};

/** An enumeration. */
export enum RepositoryType {
  /** Repository that is hosted by an App */
  App = 'APP',
  /** Repository mirrors online Repository */
  Mirror = 'MIRROR'
}

export type Reservation = {
  __typename?: 'Reservation';
  /** Allow automatic requests for this reservation */
  allowAutoRequest: Scalars['Boolean'];
  /** This Reservations app */
  app?: Maybe<LokApp>;
  /** Which reservation are we assigning to */
  assignations: Array<Assignation>;
  binds?: Maybe<Binds>;
  /** Callback */
  callback?: Maybe<Scalars['String']>;
  /** The channel of this Reservation */
  channel: Scalars['String'];
  createdAt: Scalars['DateTime'];
  /** Reservation that created this provision (if we were auto created) */
  createdProvisions: Array<Provision>;
  /** This Reservations creator */
  creator?: Maybe<User>;
  /** Is this reservation happy? (aka: does it have as many linked provisions as desired */
  happy: Scalars['Boolean'];
  /** The hash of the Reservation */
  hash: Scalars['String'];
  id: Scalars['ID'];
  log?: Maybe<Array<Maybe<ReservationLog>>>;
  /** The node this reservation connects */
  node: Node;
  params?: Maybe<ReserveParams>;
  /** Provider */
  progress?: Maybe<Scalars['String']>;
  /** Was this Reservation caused by a Provision? */
  provision?: Maybe<Provision>;
  /** The Provisions this reservation connects */
  provisions: Array<Provision>;
  /** The Unique identifier of this Assignation */
  reference: Scalars['String'];
  /** Current lifecycle of Reservation */
  status: ReservationStatus;
  /** Clear Text status of the Provision as for now */
  statusmessage: Scalars['String'];
  /** The template this reservation connects */
  template?: Maybe<Template>;
  /** A Short Hand Way to identify this reservation for you */
  title?: Maybe<Scalars['String']>;
  updatedAt: Scalars['DateTime'];
  /** Is this reservation viable? (aka: does it have as many linked provisions as minimal */
  viable: Scalars['Boolean'];
  /** This Reservations app */
  waiter: Waiter;
};


export type ReservationLogArgs = {
  createdAt?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  level?: InputMaybe<LogLevelInput>;
  o?: InputMaybe<Scalars['String']>;
};

export type ReservationEvent = {
  __typename?: 'ReservationEvent';
  log?: Maybe<ReservationLogEvent>;
};

export type ReservationLog = {
  __typename?: 'ReservationLog';
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  level: ReservationLogLevel;
  message?: Maybe<Scalars['String']>;
  /** The reservation this log item belongs to */
  reservation: Reservation;
};

export type ReservationLogEvent = {
  __typename?: 'ReservationLogEvent';
  level?: Maybe<Scalars['String']>;
  message?: Maybe<Scalars['String']>;
};

/** An enumeration. */
export enum ReservationLogLevel {
  /** Cancel Level */
  Cancel = 'CANCEL',
  /** CRITICAL Level */
  Critical = 'CRITICAL',
  /** DEBUG Level */
  Debug = 'DEBUG',
  /** Done Level */
  Done = 'DONE',
  /** ERROR Level */
  Error = 'ERROR',
  /** Event Level (only handled by plugins) */
  Event = 'EVENT',
  /** INFO Level */
  Info = 'INFO',
  /** YIELD Level */
  Return = 'RETURN',
  /** WARN Level */
  Warn = 'WARN',
  /** YIELD Level */
  Yield = 'YIELD'
}

/** An enumeration. */
export enum ReservationStatus {
  /** Active (Reservation is active and accepts assignments */
  Active = 'ACTIVE',
  /** Cancelling (Reervation is currently being cancelled) */
  Canceling = 'CANCELING',
  /** Cancelled (Reservation was cancelled by user and is no longer active) */
  Cancelled = 'CANCELLED',
  /** Critical (Reservation failed with an Critical Error) */
  Critical = 'CRITICAL',
  /** Disconnect (State of provisions this reservation connects to have changed and require Retouring) */
  Disconnect = 'DISCONNECT',
  /** Disconnect (State of provisions this reservation connects to have changed and require Retouring) */
  Disconnected = 'DISCONNECTED',
  /** Ended (Reservation was ended by the the Platform and is no longer active) */
  Ended = 'ENDED',
  /** Error (Reservation was not able to be performed (See StatusMessage) */
  Error = 'ERROR',
  /** SHould signal that this reservation is non viable (has less linked provisions than minimalInstances) */
  NonViable = 'NON_VIABLE',
  /** Providing (Reservation required the provision of a new worker) */
  Providing = 'PROVIDING',
  /** Rerouting (State of provisions this reservation connects to have changed and require Retouring) */
  Rerouting = 'REROUTING',
  /** Routing (Reservation has been requested but no Topic found yet) */
  Routing = 'ROUTING',
  /** Waiting (We are waiting for any assignable Topic to come online) */
  Waiting = 'WAITING'
}

/** An enumeration. */
export enum ReservationStatusInput {
  /** Active (Reservation is active and accepts assignments */
  Active = 'ACTIVE',
  /** Cancelling (Reervation is currently being cancelled) */
  Canceling = 'CANCELING',
  /** Cancelled (Reservation was cancelled by user and is no longer active) */
  Cancelled = 'CANCELLED',
  /** Critical (Reservation failed with an Critical Error) */
  Critical = 'CRITICAL',
  /** Disconnect (State of provisions this reservation connects to have changed and require Retouring) */
  Disconnect = 'DISCONNECT',
  /** Disconnect (State of provisions this reservation connects to have changed and require Retouring) */
  Disconnected = 'DISCONNECTED',
  /** Ended (Reservation was ended by the the Platform and is no longer active) */
  Ended = 'ENDED',
  /** Error (Reservation was not able to be performed (See StatusMessage) */
  Error = 'ERROR',
  /** SHould signal that this reservation is non viable (has less linked provisions than minimalInstances) */
  NonViable = 'NON_VIABLE',
  /** Providing (Reservation required the provision of a new worker) */
  Providing = 'PROVIDING',
  /** Rerouting (State of provisions this reservation connects to have changed and require Retouring) */
  Rerouting = 'REROUTING',
  /** Routing (Reservation has been requested but no Topic found yet) */
  Routing = 'ROUTING',
  /** Waiting (We are waiting for any assignable Topic to come online) */
  Waiting = 'WAITING'
}

export type ReservationsEvent = {
  __typename?: 'ReservationsEvent';
  create?: Maybe<Reservation>;
  delete?: Maybe<Scalars['ID']>;
  update?: Maybe<Reservation>;
};

export type ReserveBindsInput = {
  /** The clients that we are allowed to use */
  clients: Array<InputMaybe<Scalars['ID']>>;
  /** The templates that we are allowed to use */
  templates: Array<InputMaybe<Scalars['ID']>>;
};

export type ReserveParams = {
  __typename?: 'ReserveParams';
  /** Autoproviding */
  autoProvide?: Maybe<Scalars['Boolean']>;
  /** Autounproviding */
  autoUnprovide?: Maybe<Scalars['Boolean']>;
  /** The desired amount of Instances */
  desiredInstances?: Maybe<Scalars['Int']>;
  /** The minimal amount of Instances */
  minimalInstances?: Maybe<Scalars['Int']>;
  /** Registry thar are allowed */
  registries?: Maybe<Array<Maybe<Scalars['ID']>>>;
  /** Templates that can be selected */
  templates?: Maybe<Array<Maybe<Scalars['ID']>>>;
};

export type ReserveParamsInput = {
  /** Agents that are allowed */
  agents?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  /** Do you want to autoprovide */
  autoProvide?: InputMaybe<Scalars['Boolean']>;
  /** Do you want to auto_unprovide */
  autoUnprovide?: InputMaybe<Scalars['Boolean']>;
  /** The desired amount of Instances */
  desiredInstances: Scalars['Int'];
  /** The minimal amount of Instances */
  minimalInstances: Scalars['Int'];
  /** Registry thar are allowed */
  registries?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  /** Templates that can be selected */
  templates?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
};

export type ResetAgentsReturn = {
  __typename?: 'ResetAgentsReturn';
  ok?: Maybe<Scalars['Boolean']>;
};

export type ResetAssignationsReturn = {
  __typename?: 'ResetAssignationsReturn';
  ok?: Maybe<Scalars['Boolean']>;
};

export type ResetNodesReturn = {
  __typename?: 'ResetNodesReturn';
  ok?: Maybe<Scalars['Boolean']>;
};

export type ResetProvisionsReturn = {
  __typename?: 'ResetProvisionsReturn';
  ok?: Maybe<Scalars['Boolean']>;
};

export type ResetRepositoryReturn = {
  __typename?: 'ResetRepositoryReturn';
  ok?: Maybe<Scalars['Boolean']>;
};

export type ResetReservationsReturn = {
  __typename?: 'ResetReservationsReturn';
  ok?: Maybe<Scalars['Boolean']>;
};

export type ReturnWidget = {
  kind: Scalars['String'];
};

export type ReturnWidgetInput = {
  /** The dependencies of this port */
  choices?: InputMaybe<Array<InputMaybe<ChoiceInput>>>;
  /** A hook for the app to call */
  hook?: InputMaybe<Scalars['String']>;
  /** type */
  kind: ReturnWidgetKind;
  /** Do we have a possible */
  query?: InputMaybe<Scalars['String']>;
  /** A hook for the app to call */
  ward?: InputMaybe<Scalars['String']>;
};

/** The kind of return widget */
export enum ReturnWidgetKind {
  ChoiceReturnWidget = 'ChoiceReturnWidget',
  CustomReturnWidget = 'CustomReturnWidget',
  ImageReturnWidget = 'ImageReturnWidget'
}

export enum Scope {
  Global = 'GLOBAL',
  Local = 'LOCAL'
}

export type SearchWidget = Widget & {
  __typename?: 'SearchWidget';
  /** The set-keys this widget depends on, check *query parameters* */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  kind: Scalars['String'];
  /** A Complex description */
  query: Scalars['String'];
  /** A ward for the app to call */
  ward: Scalars['String'];
};

/** Sharable Models are models that can be shared amongst users and groups. They representent the models of the DB */
export enum SharableModels {
  FacadeAgent = 'FACADE_AGENT',
  FacadeApprepository = 'FACADE_APPREPOSITORY',
  FacadeAssignation = 'FACADE_ASSIGNATION',
  FacadeAssignationlog = 'FACADE_ASSIGNATIONLOG',
  FacadeMirrorrepository = 'FACADE_MIRRORREPOSITORY',
  FacadeNode = 'FACADE_NODE',
  FacadeProvision = 'FACADE_PROVISION',
  FacadeProvisionlog = 'FACADE_PROVISIONLOG',
  FacadeRegistry = 'FACADE_REGISTRY',
  FacadeRepository = 'FACADE_REPOSITORY',
  FacadeReservation = 'FACADE_RESERVATION',
  FacadeReservationlog = 'FACADE_RESERVATIONLOG',
  FacadeStructure = 'FACADE_STRUCTURE',
  FacadeTemplate = 'FACADE_TEMPLATE',
  FacadeTestcase = 'FACADE_TESTCASE',
  FacadeTestresult = 'FACADE_TESTRESULT',
  FacadeWaiter = 'FACADE_WAITER',
  LokLokapp = 'LOK_LOKAPP',
  LokLokclient = 'LOK_LOKCLIENT',
  LokLokuser = 'LOK_LOKUSER'
}

export type SliderWidget = Widget & {
  __typename?: 'SliderWidget';
  /** The set-keys this widget depends on, check *query parameters* */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  kind: Scalars['String'];
  /** A Complex description */
  max?: Maybe<Scalars['Int']>;
  /** A Complex description */
  min?: Maybe<Scalars['Int']>;
};

export type StringWidget = Widget & {
  __typename?: 'StringWidget';
  /** Whether to display as paragraph */
  asParagraph?: Maybe<Scalars['Boolean']>;
  /** The set-keys this widget depends on, check *query parameters* */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  kind: Scalars['String'];
  /** A placeholder to display */
  placeholder?: Maybe<Scalars['String']>;
};

export type Structure = {
  __typename?: 'Structure';
  extenders?: Maybe<Scalars['GenericScalar']>;
  id: Scalars['ID'];
  /** A unique identifier for this Model accross the Platform */
  identifier: Scalars['String'];
  repository?: Maybe<Repository>;
};

/** The root Subscriptions */
export type Subscription = {
  __typename?: 'Subscription';
  agentsEvent?: Maybe<AgentEvent>;
  assignation?: Maybe<AssignationEvent>;
  /**
   * My Mentions
   *
   *     Returns an event of a new mention for the user if the user
   *     was mentioned in a comment.
   *
   */
  mymentions?: Maybe<MentionEvent>;
  myprovisions?: Maybe<ProvisionsEvent>;
  myrequests?: Maybe<AssignationsEvent>;
  myreservations?: Maybe<ReservationsEvent>;
  mytodos?: Maybe<TodoEvent>;
  nodeEvent?: Maybe<Node>;
  nodes?: Maybe<NodeEvent>;
  provision?: Maybe<ProvisionEvent>;
  provisions?: Maybe<ProvisionsEvent>;
  requests?: Maybe<AssignationsEvent>;
  reservation?: Maybe<ReservationEvent>;
  reservations?: Maybe<ReservationsEvent>;
  todos?: Maybe<TodoEvent>;
  waiter?: Maybe<WaiterEvent>;
};


/** The root Subscriptions */
export type SubscriptionAgentsEventArgs = {
  level?: InputMaybe<Scalars['String']>;
};


/** The root Subscriptions */
export type SubscriptionAssignationArgs = {
  id: Scalars['ID'];
  level?: InputMaybe<Scalars['String']>;
};


/** The root Subscriptions */
export type SubscriptionMyrequestsArgs = {
  level?: InputMaybe<Scalars['String']>;
};


/** The root Subscriptions */
export type SubscriptionMyreservationsArgs = {
  level?: InputMaybe<Scalars['String']>;
};


/** The root Subscriptions */
export type SubscriptionNodeEventArgs = {
  id: Scalars['ID'];
};


/** The root Subscriptions */
export type SubscriptionNodesArgs = {
  interface?: InputMaybe<Scalars['String']>;
  level?: InputMaybe<Scalars['String']>;
};


/** The root Subscriptions */
export type SubscriptionProvisionArgs = {
  id: Scalars['ID'];
  level?: InputMaybe<Scalars['String']>;
};


/** The root Subscriptions */
export type SubscriptionProvisionsArgs = {
  identifier: Scalars['String'];
};


/** The root Subscriptions */
export type SubscriptionRequestsArgs = {
  identifier: Scalars['String'];
};


/** The root Subscriptions */
export type SubscriptionReservationArgs = {
  id: Scalars['ID'];
  level?: InputMaybe<Scalars['String']>;
};


/** The root Subscriptions */
export type SubscriptionReservationsArgs = {
  identifier: Scalars['String'];
  provision?: InputMaybe<Scalars['String']>;
};


/** The root Subscriptions */
export type SubscriptionTodosArgs = {
  identifier: Scalars['String'];
};


/** The root Subscriptions */
export type SubscriptionWaiterArgs = {
  level?: InputMaybe<Scalars['String']>;
};

export type Tell = {
  __typename?: 'Tell';
  reference?: Maybe<Scalars['String']>;
};

export type Template = {
  __typename?: 'Template';
  /** The associated registry for this Template */
  agent: Agent;
  createdAt: Scalars['DateTime'];
  /** Who created this template on this instance */
  creator?: Maybe<User>;
  /** The extentions of this template */
  extensions?: Maybe<Array<Maybe<Scalars['String']>>>;
  id: Scalars['ID'];
  /** Interface (think Function) */
  interface: Scalars['String'];
  /** A name for this Template */
  name: Scalars['String'];
  /** The node this template is implementatig */
  node: Node;
  params?: Maybe<Scalars['GenericScalar']>;
  policy?: Maybe<Scalars['GenericScalar']>;
  provisions?: Maybe<Array<Maybe<Provision>>>;
  /** The template this reservation connects */
  reservations: Array<Reservation>;
  testresults: Array<TestResult>;
  updatedAt: Scalars['DateTime'];
};


export type TemplateProvisionsArgs = {
  agent?: InputMaybe<Scalars['ID']>;
  client?: InputMaybe<Scalars['ID']>;
  clientId?: InputMaybe<Scalars['String']>;
  ids?: InputMaybe<Array<InputMaybe<Scalars['ID']>>>;
  status?: InputMaybe<Array<InputMaybe<ProvisionStatusInput>>>;
};

export type TemplateField = {
  __typename?: 'TemplateField';
  /** A short description of the field */
  description: Scalars['String'];
  /** The key of the field */
  key: Scalars['String'];
  /** The parent key (if nested) */
  parent?: Maybe<Scalars['String']>;
  /** The type of the field */
  type: Scalars['String'];
};

export type TemplateFieldInput = {
  /** A short description of the field */
  description?: InputMaybe<Scalars['String']>;
  /** The key of the field */
  key: Scalars['String'];
  /** The parent key (if nested) */
  parent?: InputMaybe<Scalars['String']>;
  /** The key of the field */
  type: Scalars['String'];
};

export type TemplateWidget = Widget & {
  __typename?: 'TemplateWidget';
  /** The set-keys this widget depends on, check *query parameters* */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  fields: Array<Maybe<TemplateField>>;
  kind: Scalars['String'];
};

export type TestCase = {
  __typename?: 'TestCase';
  createdAt: Scalars['DateTime'];
  description?: Maybe<Scalars['String']>;
  id: Scalars['ID'];
  isBenchmark: Scalars['Boolean'];
  key?: Maybe<Scalars['String']>;
  name?: Maybe<Scalars['String']>;
  /** The node this test belongs to */
  node: Node;
  results: Array<TestResult>;
};

export type TestResult = {
  __typename?: 'TestResult';
  case: TestCase;
  createdAt: Scalars['DateTime'];
  id: Scalars['ID'];
  passed: Scalars['Boolean'];
  result?: Maybe<Scalars['GenericScalar']>;
  template: Template;
};

export type TodoEvent = {
  __typename?: 'TodoEvent';
  create?: Maybe<Assignation>;
  delete?: Maybe<Scalars['ID']>;
  update?: Maybe<Assignation>;
};

export type UnprovideReturn = {
  __typename?: 'UnprovideReturn';
  id?: Maybe<Scalars['ID']>;
};

export type UnreserveResult = {
  __typename?: 'UnreserveResult';
  id?: Maybe<Scalars['ID']>;
};

export type UpdateMirrorReturn = {
  __typename?: 'UpdateMirrorReturn';
  id?: Maybe<Scalars['String']>;
};

/** A reflection on the real User */
export type User = {
  __typename?: 'User';
  /** The creator is this assignation */
  assignationSet: Array<Assignation>;
  /** The associated color for this user */
  color?: Maybe<Scalars['String']>;
  comments: Array<Comment>;
  dateJoined: Scalars['DateTime'];
  email: Scalars['String'];
  firstName: Scalars['String'];
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
  /** This provision creator */
  provisionSet: Array<Provision>;
  /** The Associatsed App */
  registrySet: Array<Registry>;
  /** This Reservations creator */
  reservationSet: Array<Reservation>;
  resolvedComments: Array<Comment>;
  /** The sub of the user */
  sub?: Maybe<Scalars['String']>;
  /** Who created this template on this instance */
  templateSet: Array<Template>;
  /** Specific permissions for this user. */
  userPermissions: Array<Permission>;
  /** Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only. */
  username: Scalars['String'];
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

export type ValueRange = Annotation & {
  __typename?: 'ValueRange';
  /** The name of the annotation */
  kind?: Maybe<Scalars['String']>;
  /** The maximum value */
  max: Scalars['Float'];
  /** The minimum value */
  min: Scalars['Float'];
};

export type Waiter = {
  __typename?: 'Waiter';
  /** This Assignation app */
  assignations: Array<Assignation>;
  clientId: Scalars['String'];
  id: Scalars['ID'];
  identifier: Scalars['String'];
  installedAt: Scalars['DateTime'];
  /** This waiters Name */
  name: Scalars['String'];
  /** The provide might be limited to a instance like ImageJ belonging to a specific person. Is nullable for backend users */
  registry?: Maybe<Registry>;
  /** This Reservations app */
  reservations: Array<Reservation>;
  /** The Status of this Waiter */
  status: WaiterStatus;
  /** The Channel we are listening to */
  unique: Scalars['String'];
};

export type WaiterEvent = {
  __typename?: 'WaiterEvent';
  created?: Maybe<Waiter>;
  deleted?: Maybe<Scalars['ID']>;
  updated?: Maybe<Waiter>;
};

/** An enumeration. */
export enum WaiterStatus {
  /** Active */
  Active = 'ACTIVE',
  /** Disconnected */
  Disconnected = 'DISCONNECTED',
  /** Complete Vanilla Scenario after a forced restart of */
  Vanilla = 'VANILLA'
}

export type Widget = {
  /** The set-keys this widget depends on, check *query parameters* */
  dependencies?: Maybe<Array<Maybe<Scalars['String']>>>;
  kind: Scalars['String'];
};

export type WidgetInput = {
  /** Is this a paragraph */
  asParagraph?: InputMaybe<Scalars['Boolean']>;
  /** The dependencies of this port */
  choices?: InputMaybe<Array<InputMaybe<ChoiceInput>>>;
  /** The dependencies of this port */
  dependencies?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  /** The fields of this widget (onbly on TemplateWidget) */
  fields?: InputMaybe<Array<InputMaybe<TemplateFieldInput>>>;
  /** A hook for the app to call */
  hook?: InputMaybe<Scalars['String']>;
  /** type */
  kind: WidgetKind;
  /** Max value for int widget */
  max?: InputMaybe<Scalars['Int']>;
  /** Max value for int widget */
  min?: InputMaybe<Scalars['Int']>;
  /** Placeholder for any widget */
  placeholder?: InputMaybe<Scalars['String']>;
  /** Do we have a possible */
  query?: InputMaybe<Scalars['SearchQuery']>;
  /** A ward for the app to call */
  ward?: InputMaybe<Scalars['String']>;
};

/** The kind of widget */
export enum WidgetKind {
  BoolWidget = 'BoolWidget',
  ChoiceWidget = 'ChoiceWidget',
  CustomWidget = 'CustomWidget',
  IntWidget = 'IntWidget',
  LinkWidget = 'LinkWidget',
  QueryWidget = 'QueryWidget',
  SearchWidget = 'SearchWidget',
  SliderWidget = 'SliderWidget',
  StringWidget = 'StringWidget',
  TemplateWidget = 'TemplateWidget'
}

/** One possible value for a given Enum. Enum values are unique values, not a placeholder for a string or numeric value. However an Enum value is returned in a JSON response as a string. */
export type __EnumValue = {
  __typename?: '__EnumValue';
  name: Scalars['String'];
  description?: Maybe<Scalars['String']>;
  isDeprecated: Scalars['Boolean'];
  deprecationReason?: Maybe<Scalars['String']>;
};

/** Object and Interface types are described by a list of Fields, each of which has a name, potentially a list of arguments, and a return type. */
export type __Field = {
  __typename?: '__Field';
  name: Scalars['String'];
  description?: Maybe<Scalars['String']>;
  args: Array<__InputValue>;
  type: __Type;
  isDeprecated: Scalars['Boolean'];
  deprecationReason?: Maybe<Scalars['String']>;
};


/** Object and Interface types are described by a list of Fields, each of which has a name, potentially a list of arguments, and a return type. */
export type __FieldArgsArgs = {
  includeDeprecated?: InputMaybe<Scalars['Boolean']>;
};

/** Arguments provided to Fields or Directives and the input fields of an InputObject are represented as Input Values which describe their type and optionally a default value. */
export type __InputValue = {
  __typename?: '__InputValue';
  name: Scalars['String'];
  description?: Maybe<Scalars['String']>;
  type: __Type;
  /** A GraphQL-formatted string representing the default value for this input value. */
  defaultValue?: Maybe<Scalars['String']>;
  isDeprecated: Scalars['Boolean'];
  deprecationReason?: Maybe<Scalars['String']>;
};

/**
 * The fundamental unit of any GraphQL Schema is the type. There are many kinds of types in GraphQL as represented by the `__TypeKind` enum.
 *
 * Depending on the kind of a type, certain fields describe information about that type. Scalar types provide no information beyond a name, description and optional `specifiedByUrl`, while Enum types provide their values. Object and Interface types provide the fields they describe. Abstract types, Union and Interface, provide the Object types possible at runtime. List and NonNull types compose other types.
 */
export type __Type = {
  __typename?: '__Type';
  kind: __TypeKind;
  name?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
  specifiedByUrl?: Maybe<Scalars['String']>;
  fields?: Maybe<Array<__Field>>;
  interfaces?: Maybe<Array<__Type>>;
  possibleTypes?: Maybe<Array<__Type>>;
  enumValues?: Maybe<Array<__EnumValue>>;
  inputFields?: Maybe<Array<__InputValue>>;
  ofType?: Maybe<__Type>;
};


/**
 * The fundamental unit of any GraphQL Schema is the type. There are many kinds of types in GraphQL as represented by the `__TypeKind` enum.
 *
 * Depending on the kind of a type, certain fields describe information about that type. Scalar types provide no information beyond a name, description and optional `specifiedByUrl`, while Enum types provide their values. Object and Interface types provide the fields they describe. Abstract types, Union and Interface, provide the Object types possible at runtime. List and NonNull types compose other types.
 */
export type __TypeFieldsArgs = {
  includeDeprecated?: InputMaybe<Scalars['Boolean']>;
};


/**
 * The fundamental unit of any GraphQL Schema is the type. There are many kinds of types in GraphQL as represented by the `__TypeKind` enum.
 *
 * Depending on the kind of a type, certain fields describe information about that type. Scalar types provide no information beyond a name, description and optional `specifiedByUrl`, while Enum types provide their values. Object and Interface types provide the fields they describe. Abstract types, Union and Interface, provide the Object types possible at runtime. List and NonNull types compose other types.
 */
export type __TypeEnumValuesArgs = {
  includeDeprecated?: InputMaybe<Scalars['Boolean']>;
};


/**
 * The fundamental unit of any GraphQL Schema is the type. There are many kinds of types in GraphQL as represented by the `__TypeKind` enum.
 *
 * Depending on the kind of a type, certain fields describe information about that type. Scalar types provide no information beyond a name, description and optional `specifiedByUrl`, while Enum types provide their values. Object and Interface types provide the fields they describe. Abstract types, Union and Interface, provide the Object types possible at runtime. List and NonNull types compose other types.
 */
export type __TypeInputFieldsArgs = {
  includeDeprecated?: InputMaybe<Scalars['Boolean']>;
};

/** An enum describing what kind of type a given `__Type` is. */
export enum __TypeKind {
  /** Indicates this type is a scalar. */
  Scalar = 'SCALAR',
  /** Indicates this type is an object. `fields` and `interfaces` are valid fields. */
  Object = 'OBJECT',
  /** Indicates this type is an interface. `fields`, `interfaces`, and `possibleTypes` are valid fields. */
  Interface = 'INTERFACE',
  /** Indicates this type is a union. `possibleTypes` is a valid field. */
  Union = 'UNION',
  /** Indicates this type is an enum. `enumValues` is a valid field. */
  Enum = 'ENUM',
  /** Indicates this type is an input object. `inputFields` is a valid field. */
  InputObject = 'INPUT_OBJECT',
  /** Indicates this type is a list. `ofType` is a valid field. */
  List = 'LIST',
  /** Indicates this type is a non-null. `ofType` is a valid field. */
  NonNull = 'NON_NULL'
}

export type ListAgentFragment = { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null };

export type DetailAgentFragment = { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, name: string, templates: Array<{ __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }>, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null, provisions: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> }> };

export type DetailAssignationFragment = { __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, progress?: number | null, statusmessage: string, returns?: Array<any | null> | null, parent?: { __typename?: 'Assignation', id: string, reservation?: { __typename?: 'Reservation', id: string, node: { __typename?: 'Node', id: string, name: string } } | null } | null, provision?: { __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, createdAt: any, params?: { __typename?: 'ProvisionParams', autoUnprovide?: boolean | null } | null, agent?: { __typename?: 'Agent', name: string } | null, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }, creator?: { __typename?: 'User', email: string, sub?: string | null } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null } | null, reservation?: { __typename?: 'Reservation', id: string, reference: string, status: ReservationStatus, node: { __typename?: 'Node', scope: NodeScope, id: string, name: string, interfaces?: Array<string | null> | null, meta?: any | null, kind: NodeKind, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, creator?: { __typename?: 'User', email: string } | null } | null, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null, creator?: { __typename?: 'User', email: string, sub?: string | null } | null, log?: Array<{ __typename?: 'AssignationLog', message?: string | null, level: AssignationLogLevel } | null> | null };

export type ListAssignationFragment = { __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null };

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

export type DetailNodeFragment = { __typename?: 'Node', name: string, description: string, kind: NodeKind, hash: string, id: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope, templates?: Array<{ __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null> | null, isTestFor?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, tests?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null };

export type NodeListItemFragment = { __typename?: 'Node', id: string, name: string, kind: NodeKind, hash: string, description: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope };

export type MiniNodeFragment = { __typename?: 'Node', name: string, description: string, kind: NodeKind, id: string, meta?: any | null, hash: string, scope: NodeScope };

export type CompleteNodeFragment = { __typename?: 'Node', name: string, hash: string, description: string, scope: NodeScope, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null, isTestFor?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, tests?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null };

export type UserAssignmentFragment = { __typename?: 'UserAssignment', permissions: Array<string | null>, user: { __typename?: 'User', id: string, sub?: string | null, username: string, email: string } };

export type GroupAssignmentFragment = { __typename?: 'GroupAssignment', permissions: Array<string | null>, group: { __typename?: 'Group', name: string } };

export type IntWidgetFragment = { __typename?: 'IntWidget', kind: string, dependencies?: Array<string | null> | null };

export type StringWidgetFragment = { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null };

export type BoolWidgetFragment = { __typename?: 'BoolWidget', kind: string, dependencies?: Array<string | null> | null };

export type SliderWidgetFragment = { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null };

export type SearchWidgetFragment = { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null };

export type CustomWidgetFragment = { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null };

export type ChoiceWidgetFragment = { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null };

export type LinkWidgetFragment = { __typename?: 'LinkWidget', kind: string, linkbuilder?: string | null };

export type ChildPortNestedFragment = { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null };

export type ChildPortFragment = { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null };

type InputWidget_BoolWidget_Fragment = { __typename: 'BoolWidget', kind: string };

type InputWidget_ChoiceWidget_Fragment = { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null };

type InputWidget_CustomWidget_Fragment = { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null };

type InputWidget_IntWidget_Fragment = { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null };

type InputWidget_LinkWidget_Fragment = { __typename: 'LinkWidget', kind: string };

type InputWidget_QueryWidget_Fragment = { __typename: 'QueryWidget', kind: string };

type InputWidget_SearchWidget_Fragment = { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null };

type InputWidget_SliderWidget_Fragment = { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null };

type InputWidget_StringWidget_Fragment = { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null };

type InputWidget_TemplateWidget_Fragment = { __typename: 'TemplateWidget', kind: string };

export type InputWidgetFragment = InputWidget_BoolWidget_Fragment | InputWidget_ChoiceWidget_Fragment | InputWidget_CustomWidget_Fragment | InputWidget_IntWidget_Fragment | InputWidget_LinkWidget_Fragment | InputWidget_QueryWidget_Fragment | InputWidget_SearchWidget_Fragment | InputWidget_SliderWidget_Fragment | InputWidget_StringWidget_Fragment | InputWidget_TemplateWidget_Fragment;

export type PortFragment = { __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null };

export type ImageReturnWidgetFragment = { __typename: 'ImageReturnWidget', query?: string | null, kind: string, ward?: string | null };

export type CustomReturnWidgetFragment = { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null };

export type ChoiceReturnWidgetFragment = { __typename: 'ChoiceReturnWidget', choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null };

type ReturnWidget_ChoiceReturnWidget_Fragment = { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null };

type ReturnWidget_CustomReturnWidget_Fragment = { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null };

type ReturnWidget_ImageReturnWidget_Fragment = { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null };

export type ReturnWidgetFragment = ReturnWidget_ChoiceReturnWidget_Fragment | ReturnWidget_CustomReturnWidget_Fragment | ReturnWidget_ImageReturnWidget_Fragment;

export type PortsFragment = { __typename?: 'Node', args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null };

export type DetailProvisionFragment = { __typename?: 'Provision', statusmessage: string, status: ProvisionStatus, id: string, reference: string, mode: ProvisionMode, createdAt: any, params?: { __typename?: 'ProvisionParams', autoUnprovide?: boolean | null } | null, agent?: { __typename?: 'Agent', name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, template: { __typename?: 'Template', id: string, extensions?: Array<string | null> | null, params?: any | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null, meta?: any | null }, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }, creator?: { __typename?: 'User', email: string } | null, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null, causedReservations: Array<{ __typename?: 'Reservation', title?: string | null, status: ReservationStatus, statusmessage: string, id: string, reference: string, allowAutoRequest: boolean, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }>, assignations?: Array<{ __typename?: 'Assignation', id: string, reference: string, status: AssignationStatus, creator?: { __typename?: 'User', email: string } | null, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null } | null> | null, reservations: Array<{ __typename?: 'Reservation', title?: string | null, id: string, reference: string, status: ReservationStatus, node: { __typename?: 'Node', name: string }, waiter: { __typename?: 'Waiter', registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }>, log?: Array<{ __typename?: 'ProvisionLog', message?: string | null, level: ProvisionLogLevel, createdAt: any } | null> | null };

export type ListProvisionFragment = { __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> };

export type ProvisionLogFragment = { __typename?: 'ProvisionLog', message?: string | null, level: ProvisionLogLevel, createdAt: any };

export type RegistryFragment = { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null };

type ListRepository_AppRepository_Fragment = { __typename: 'AppRepository', id: string, name?: string | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, nodes?: Array<{ __typename?: 'Node', scope: NodeScope, id: string, name: string } | null> | null };

type ListRepository_MirrorRepository_Fragment = { __typename: 'MirrorRepository', id: string, url?: string | null, name?: string | null, nodes?: Array<{ __typename?: 'Node', scope: NodeScope, id: string, name: string } | null> | null };

export type ListRepositoryFragment = ListRepository_AppRepository_Fragment | ListRepository_MirrorRepository_Fragment;

export type AppRepositoryFragment = { __typename?: 'AppRepository', id: string, name?: string | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, nodes?: Array<{ __typename?: 'Node', scope: NodeScope, id: string, name: string } | null> | null };

export type MirrorRepositoryFragment = { __typename?: 'MirrorRepository', id: string, url?: string | null, name?: string | null, nodes?: Array<{ __typename?: 'Node', scope: NodeScope, id: string, name: string } | null> | null };

export type DetailAppRepositoryFragment = { __typename?: 'AppRepository', installedAt: any, app?: { __typename?: 'LokApp', version: string, identifier: string } | null };

export type DetailMirrorRepositoryFragment = { __typename?: 'MirrorRepository', url?: string | null };

type DetailRepository_AppRepository_Fragment = { __typename?: 'AppRepository', name?: string | null, installedAt: any, nodes?: Array<{ __typename?: 'Node', id: string, name: string, kind: NodeKind, hash: string, description: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope } | null> | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null };

type DetailRepository_MirrorRepository_Fragment = { __typename?: 'MirrorRepository', name?: string | null, url?: string | null, nodes?: Array<{ __typename?: 'Node', id: string, name: string, kind: NodeKind, hash: string, description: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope } | null> | null };

export type DetailRepositoryFragment = DetailRepository_AppRepository_Fragment | DetailRepository_MirrorRepository_Fragment;

export type DetailReservationFragment = { __typename?: 'Reservation', title?: string | null, status: ReservationStatus, id: string, reference: string, statusmessage: string, allowAutoRequest: boolean, channel: string, params?: { __typename?: 'ReserveParams', autoProvide?: boolean | null, autoUnprovide?: boolean | null, minimalInstances?: number | null, desiredInstances?: number | null } | null, binds?: { __typename?: 'Binds', clients?: Array<{ __typename?: 'LokClient', id: string, name: string, clientId: string } | null> | null, templates?: Array<{ __typename?: 'Template', id: string, name: string, interface: string } | null> | null } | null, provision?: { __typename?: 'Provision', reference: string, id: string, access: ProvisionAccess, status: ProvisionStatus, creator?: { __typename?: 'User', id: string, username: string } | null, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null } | null, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null }, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, scope: NodeScope, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, template?: { __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null, provisions: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> }>, log?: Array<{ __typename?: 'ReservationLog', message?: string | null, level: ReservationLogLevel } | null> | null, creator?: { __typename?: 'User', email: string } | null };

export type NodeReservationFragment = { __typename?: 'Reservation', title?: string | null, status: ReservationStatus, id: string, reference: string, statusmessage: string, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, scope: NodeScope, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null }, template?: { __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null, provisions: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> }> };

export type ListReservationFragment = { __typename?: 'Reservation', title?: string | null, status: ReservationStatus, statusmessage: string, id: string, reference: string, allowAutoRequest: boolean, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } };

export type DetailStructureFragment = { __typename?: 'Structure', id: string, identifier: string };

export type ListStructureFragment = { __typename?: 'Structure', id: string, identifier: string };

export type ListTemplateFragment = { __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } };

export type DetailTemplateFragment = { __typename?: 'Template', id: string, extensions?: Array<string | null> | null, params?: any | null, interface: string, creator?: { __typename?: 'User', email: string } | null, node: { __typename?: 'Node', name: string, description: string, kind: NodeKind, hash: string, id: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope, templates?: Array<{ __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null> | null, isTestFor?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, tests?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null }, testresults: Array<{ __typename?: 'TestResult', id: string, result?: any | null, passed: boolean, case: { __typename?: 'TestCase', id: string, description?: string | null, key?: string | null, name?: string | null, node: { __typename?: 'Node', name: string } } }>, agent: { __typename?: 'Agent', id: string, instanceId: string, registry?: { __typename?: 'Registry', id: string } | null }, provisions?: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> } | null> | null };

export type ReservableTemplateFragment = { __typename?: 'Template', id: string, name: string, node: { __typename?: 'Node', scope: NodeScope, id: string, name: string }, agent: { __typename?: 'Agent', status: AgentStatus, id: string, instanceId: string, registry?: { __typename?: 'Registry', id: string, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null, user?: { __typename?: 'User', username: string, sub?: string | null } | null } | null }, provisions?: Array<{ __typename?: 'Provision', id: string, status: ProvisionStatus } | null> | null };

export type DisplayTemplateFragment = { __typename?: 'Template', id: string, name: string, interface: string, node: { __typename?: 'Node', scope: NodeScope, id: string, name: string, description: string } };

export type ListTestResultFragment = { __typename?: 'TestResult', id: string, result?: any | null, passed: boolean, case: { __typename?: 'TestCase', id: string, description?: string | null, key?: string | null, name?: string | null, node: { __typename?: 'Node', name: string } } };

export type ResetAgentsMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetAgentsMutation = { __typename?: 'Mutation', resetAgents?: { __typename?: 'ResetAgentsReturn', ok?: boolean | null } | null };

export type ResetProvisionsMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetProvisionsMutation = { __typename?: 'Mutation', resetProvisions?: { __typename?: 'ResetProvisionsReturn', ok?: boolean | null } | null };

export type ResetReservationsMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetReservationsMutation = { __typename?: 'Mutation', resetReservations?: { __typename?: 'ResetReservationsReturn', ok?: boolean | null } | null };

export type ResetAssignationsMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetAssignationsMutation = { __typename?: 'Mutation', resetAssignations?: { __typename?: 'ResetAssignationsReturn', ok?: boolean | null } | null };

export type ResetNodesMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetNodesMutation = { __typename?: 'Mutation', resetNodes?: { __typename?: 'ResetNodesReturn', ok?: boolean | null } | null };

export type DeleteAgentMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteAgentMutation = { __typename?: 'Mutation', deleteAgent?: { __typename?: 'DeleteAgentReturn', id?: string | null } | null };

export type KickAgentMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type KickAgentMutation = { __typename?: 'Mutation', kickAgent?: { __typename?: 'Agent', id: string } | null };

export type BounceAgentMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type BounceAgentMutation = { __typename?: 'Mutation', bounceAgent?: { __typename?: 'Agent', id: string } | null };

export type TemplateMutationVariables = Exact<{
  interface: Scalars['String'];
  definition: DefinitionInput;
  instanceId: Scalars['ID'];
}>;


export type TemplateMutation = { __typename?: 'Mutation', createTemplate?: { __typename?: 'Template', id: string } | null };

export type CreateCommentMutationVariables = Exact<{
  id: Scalars['ID'];
  model: CommentableModels;
  descendents: Array<InputMaybe<DescendendInput>>;
  parent?: InputMaybe<Scalars['ID']>;
}>;


export type CreateCommentMutation = { __typename?: 'Mutation', createComment?: { __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null };

export type ReplyToMutationVariables = Exact<{
  descendents: Array<InputMaybe<DescendendInput>>;
  parent: Scalars['ID'];
}>;


export type ReplyToMutation = { __typename?: 'Mutation', replyTo?: { __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null };

export type ResolveCommentMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type ResolveCommentMutation = { __typename?: 'Mutation', resolveComment?: { __typename?: 'Comment', resolved?: any | null, id: string, createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null, resolvedBy?: { __typename?: 'User', sub?: string | null } | null, children?: Array<{ __typename?: 'Comment', createdAt: any, user: { __typename?: 'User', sub?: string | null }, parent?: { __typename?: 'Comment', id: string } | null, descendents?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null }, children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | { __typename?: 'ParagraphDescendent', size?: string | null, typename: 'ParagraphDescendent', children?: Array<{ __typename?: 'Leaf', bold?: boolean | null, italic?: boolean | null, code?: boolean | null, text?: string | null, typename: 'Leaf' } | { __typename?: 'MentionDescendent', typename: 'MentionDescendent', user: { __typename?: 'User', sub?: string | null } } | { __typename?: 'ParagraphDescendent', size?: string | null, untypedChildren?: any | null, typename: 'ParagraphDescendent' } | null> | null } | null> | null } | null> | null } | null };

export type DeleteNodeMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteNodeMutation = { __typename?: 'Mutation', deleteNode?: { __typename?: 'DeleteNodeReturn', id?: string | null } | null };

export type PurgeNodesMutationVariables = Exact<{ [key: string]: never; }>;


export type PurgeNodesMutation = { __typename?: 'Mutation', purgeNodes?: { __typename?: 'PurgeNodesReturn', ids?: Array<string | null> | null } | null };

export type ChangePermissionsMutationVariables = Exact<{
  type: SharableModels;
  object: Scalars['ID'];
  userAssignments?: InputMaybe<Array<InputMaybe<UserAssignmentInput>>>;
  groupAssignments?: InputMaybe<Array<InputMaybe<GroupAssignmentInput>>>;
}>;


export type ChangePermissionsMutation = { __typename?: 'Mutation', changePermissions?: { __typename?: 'ChangePermissionsResult', success?: boolean | null } | null };

export type AcknowledgeMutationVariables = Exact<{
  assignation: Scalars['ID'];
}>;


export type AcknowledgeMutation = { __typename?: 'Mutation', ack?: { __typename?: 'Assignation', reference: string } | null };

export type AssignMutationVariables = Exact<{
  reservation: Scalars['ID'];
  args: Array<InputMaybe<Scalars['AnyInput']>>;
}>;


export type AssignMutation = { __typename?: 'Mutation', assign?: { __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, progress?: number | null, statusmessage: string, returns?: Array<any | null> | null, parent?: { __typename?: 'Assignation', id: string, reservation?: { __typename?: 'Reservation', id: string, node: { __typename?: 'Node', id: string, name: string } } | null } | null, provision?: { __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, createdAt: any, params?: { __typename?: 'ProvisionParams', autoUnprovide?: boolean | null } | null, agent?: { __typename?: 'Agent', name: string } | null, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }, creator?: { __typename?: 'User', email: string, sub?: string | null } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null } | null, reservation?: { __typename?: 'Reservation', id: string, reference: string, status: ReservationStatus, node: { __typename?: 'Node', scope: NodeScope, id: string, name: string, interfaces?: Array<string | null> | null, meta?: any | null, kind: NodeKind, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, creator?: { __typename?: 'User', email: string } | null } | null, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null, creator?: { __typename?: 'User', email: string, sub?: string | null } | null, log?: Array<{ __typename?: 'AssignationLog', message?: string | null, level: AssignationLogLevel } | null> | null } | null };

export type LinkMutationVariables = Exact<{
  reservation: Scalars['ID'];
  provision: Scalars['ID'];
}>;


export type LinkMutation = { __typename?: 'Mutation', link?: { __typename?: 'Provision', reference: string } | null };

export type UnlinkMutationVariables = Exact<{
  reservation: Scalars['ID'];
  provision: Scalars['ID'];
  safe?: InputMaybe<Scalars['Boolean']>;
}>;


export type UnlinkMutation = { __typename?: 'Mutation', unlink?: { __typename?: 'Provision', reference: string } | null };

export type ProvideMutationVariables = Exact<{
  template: Scalars['ID'];
}>;


export type ProvideMutation = { __typename?: 'Mutation', provide?: { __typename?: 'Provision', id: string, status: ProvisionStatus } | null };

export type ReserveMutationVariables = Exact<{
  node?: InputMaybe<Scalars['ID']>;
  hash?: InputMaybe<Scalars['String']>;
  params?: InputMaybe<ReserveParamsInput>;
  binds?: InputMaybe<ReserveBindsInput>;
  title?: InputMaybe<Scalars['String']>;
  imitate?: InputMaybe<Scalars['ID']>;
  allowAutoRequest?: InputMaybe<Scalars['Boolean']>;
}>;


export type ReserveMutation = { __typename?: 'Mutation', reserve?: { __typename?: 'Reservation', id: string, reference: string } | null };

export type UnassignMutationVariables = Exact<{
  assignation: Scalars['ID'];
}>;


export type UnassignMutation = { __typename?: 'Mutation', unassign?: { __typename?: 'Assignation', reference: string } | null };

export type UnprovideMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type UnprovideMutation = { __typename?: 'Mutation', unprovide?: { __typename?: 'UnprovideReturn', id?: string | null } | null };

export type UnreserveMutationVariables = Exact<{
  reservation: Scalars['ID'];
}>;


export type UnreserveMutation = { __typename?: 'Mutation', unreserve?: { __typename?: 'UnreserveResult', id?: string | null } | null };

export type UpdateMirrorMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type UpdateMirrorMutation = { __typename?: 'Mutation', updateMirror?: { __typename?: 'UpdateMirrorReturn', id?: string | null } | null };

export type DeleteRepoMutationVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DeleteRepoMutation = { __typename?: 'Mutation', deleterepo?: { __typename?: 'DeleteRepoReturn', id?: string | null } | null };

export type CreateMirrorMutationVariables = Exact<{
  url: Scalars['String'];
  name: Scalars['String'];
}>;


export type CreateMirrorMutation = { __typename?: 'Mutation', createMirror?: { __typename?: 'CreateMirrorReturn', created?: boolean | null, repo?: { __typename: 'MirrorRepository', id: string, url?: string | null, name?: string | null, nodes?: Array<{ __typename?: 'Node', scope: NodeScope, id: string, name: string } | null> | null } | null } | null };

export type AgentsQueryVariables = Exact<{
  app?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<Array<InputMaybe<AgentStatusInput>>>;
}>;


export type AgentsQuery = { __typename?: 'Query', agents?: Array<{ __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null> | null };

export type MyAgentsQueryVariables = Exact<{
  app?: InputMaybe<Scalars['String']>;
  status?: InputMaybe<Array<InputMaybe<AgentStatusInput>>>;
}>;


export type MyAgentsQuery = { __typename?: 'Query', myagents?: Array<{ __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null> | null };

export type DetailAgentQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailAgentQuery = { __typename?: 'Query', agent?: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, name: string, templates: Array<{ __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }>, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null, provisions: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> }> } | null };

export type PortAgentQueryVariables = Exact<{
  clientId: Scalars['ID'];
  instanceId: Scalars['ID'];
}>;


export type PortAgentQuery = { __typename?: 'Query', agent?: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, name: string, templates: Array<{ __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }>, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null, provisions: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> }> } | null };

export type AgentOptionsQueryVariables = Exact<{
  registry?: InputMaybe<Scalars['ID']>;
  search?: InputMaybe<Scalars['String']>;
}>;


export type AgentOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Agent', value: string, label: string } | null> | null };

export type DetailAssignationQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailAssignationQuery = { __typename?: 'Query', assignation?: { __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, progress?: number | null, statusmessage: string, returns?: Array<any | null> | null, parent?: { __typename?: 'Assignation', id: string, reservation?: { __typename?: 'Reservation', id: string, node: { __typename?: 'Node', id: string, name: string } } | null } | null, provision?: { __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, createdAt: any, params?: { __typename?: 'ProvisionParams', autoUnprovide?: boolean | null } | null, agent?: { __typename?: 'Agent', name: string } | null, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }, creator?: { __typename?: 'User', email: string, sub?: string | null } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null } | null, reservation?: { __typename?: 'Reservation', id: string, reference: string, status: ReservationStatus, node: { __typename?: 'Node', scope: NodeScope, id: string, name: string, interfaces?: Array<string | null> | null, meta?: any | null, kind: NodeKind, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, creator?: { __typename?: 'User', email: string } | null } | null, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null, creator?: { __typename?: 'User', email: string, sub?: string | null } | null, log?: Array<{ __typename?: 'AssignationLog', message?: string | null, level: AssignationLogLevel } | null> | null } | null };

export type ReferencedAssignationsQueryVariables = Exact<{
  reference: Scalars['String'];
  parent?: InputMaybe<Scalars['ID']>;
}>;


export type ReferencedAssignationsQuery = { __typename?: 'Query', assignations?: Array<{ __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, progress?: number | null, statusmessage: string, returns?: Array<any | null> | null, parent?: { __typename?: 'Assignation', id: string, reservation?: { __typename?: 'Reservation', id: string, node: { __typename?: 'Node', id: string, name: string } } | null } | null, provision?: { __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, createdAt: any, params?: { __typename?: 'ProvisionParams', autoUnprovide?: boolean | null } | null, agent?: { __typename?: 'Agent', name: string } | null, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }, creator?: { __typename?: 'User', email: string, sub?: string | null } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null } | null, reservation?: { __typename?: 'Reservation', id: string, reference: string, status: ReservationStatus, node: { __typename?: 'Node', scope: NodeScope, id: string, name: string, interfaces?: Array<string | null> | null, meta?: any | null, kind: NodeKind, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, creator?: { __typename?: 'User', email: string } | null } | null, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null, creator?: { __typename?: 'User', email: string, sub?: string | null } | null, log?: Array<{ __typename?: 'AssignationLog', message?: string | null, level: AssignationLogLevel } | null> | null } | null> | null };

export type NodeAssignationsQueryVariables = Exact<{
  reference: Scalars['String'];
  parent: Scalars['ID'];
  filter?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
  order?: InputMaybe<Scalars['String']>;
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
}>;


export type NodeAssignationsQuery = { __typename?: 'Query', assignations?: Array<{ __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null> | null };

export type RequestsQueryVariables = Exact<{ [key: string]: never; }>;


export type RequestsQuery = { __typename?: 'Query', requests?: Array<{ __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null> | null };

export type MyRequestsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyRequestsQuery = { __typename?: 'Query', myrequests?: Array<{ __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null> | null };

export type RequestsHistoryQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']>;
  filter?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
}>;


export type RequestsHistoryQuery = { __typename?: 'Query', myrequests?: Array<{ __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null> | null };

export type FilteredAssignationsQueryVariables = Exact<{
  exclude?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
  filter?: InputMaybe<Array<InputMaybe<AssignationStatusInput>>>;
  limit?: InputMaybe<Scalars['Int']>;
}>;


export type FilteredAssignationsQuery = { __typename?: 'Query', myrequests?: Array<{ __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null> | null };

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

export type ArgPortTypesQueryVariables = Exact<{ [key: string]: never; }>;


export type ArgPortTypesQuery = { __typename?: 'Query', args?: { __typename?: '__Type', possibleTypes?: Array<{ __typename?: '__Type', value?: string | null, label?: string | null }> | null } | null };

export type KwargPortTypesQueryVariables = Exact<{ [key: string]: never; }>;


export type KwargPortTypesQuery = { __typename?: 'Query', kwargs?: { __typename?: '__Type', possibleTypes?: Array<{ __typename?: '__Type', value?: string | null, label?: string | null }> | null } | null };

export type ReturnPortTypesQueryVariables = Exact<{ [key: string]: never; }>;


export type ReturnPortTypesQuery = { __typename?: 'Query', returns?: { __typename?: '__Type', possibleTypes?: Array<{ __typename?: '__Type', value?: string | null, label?: string | null }> | null } | null };

export type StructureOptionsQueryVariables = Exact<{ [key: string]: never; }>;


export type StructureOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Structure', value: string, label: string } | null> | null };

export type DetailNodeQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
  hash?: InputMaybe<Scalars['String']>;
}>;


export type DetailNodeQuery = { __typename?: 'Query', node?: { __typename?: 'Node', name: string, description: string, kind: NodeKind, hash: string, id: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope, templates?: Array<{ __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null> | null, isTestFor?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, tests?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null } | null };

export type MiniNodeByIdQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type MiniNodeByIdQuery = { __typename?: 'Query', node?: { __typename?: 'Node', name: string, description: string, kind: NodeKind, id: string, meta?: any | null, hash: string, scope: NodeScope } | null };

export type NodesQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  interfaces?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  restrict?: InputMaybe<Array<InputMaybe<Scalars['String']>>>;
  templated?: InputMaybe<Scalars['Boolean']>;
  scopes?: InputMaybe<Array<InputMaybe<NodeScope>>>;
}>;


export type NodesQuery = { __typename?: 'Query', allnodes?: Array<{ __typename?: 'Node', id: string, name: string, kind: NodeKind, hash: string, description: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope } | null> | null };

export type RespositoryNodesQueryVariables = Exact<{
  repository?: InputMaybe<Scalars['ID']>;
}>;


export type RespositoryNodesQuery = { __typename?: 'Query', allnodes?: Array<{ __typename?: 'Node', id: string, name: string, kind: NodeKind, hash: string, description: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope } | null> | null };

export type AssignNodeQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
}>;


export type AssignNodeQuery = { __typename?: 'Query', node?: { __typename?: 'Node', name: string, hash: string, description: string, scope: NodeScope, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null, isTestFor?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, tests?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null } | null };

export type PermissionOptionsQueryVariables = Exact<{
  model: SharableModels;
  search?: InputMaybe<Scalars['String']>;
}>;


export type PermissionOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Permission', label: string, value: string } | null> | null };

export type PermissionsOfQueryVariables = Exact<{
  model: SharableModels;
  id: Scalars['ID'];
}>;


export type PermissionsOfQuery = { __typename?: 'Query', permissionsOf?: { __typename?: 'PermissionsOfReturn', available?: Array<{ __typename?: 'Permission', name: string } | null> | null, options?: Array<{ __typename?: 'Permission', label: string, value: string } | null> | null, groupAssignments?: Array<{ __typename?: 'GroupAssignment', permissions: Array<string | null>, group: { __typename?: 'Group', name: string } } | null> | null, userAssignments?: Array<{ __typename?: 'UserAssignment', permissions: Array<string | null>, user: { __typename?: 'User', id: string, sub?: string | null, username: string, email: string } } | null> | null } | null };

export type UnfoldProvenanceQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type UnfoldProvenanceQuery = { __typename?: 'Query', assignation?: { __typename?: 'Assignation', id: string, createdAt: any, children: Array<{ __typename?: 'Assignation', id: string, createdAt: any }> } | null };

export type DetailProvisionQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailProvisionQuery = { __typename?: 'Query', provision?: { __typename?: 'Provision', statusmessage: string, status: ProvisionStatus, id: string, reference: string, mode: ProvisionMode, createdAt: any, params?: { __typename?: 'ProvisionParams', autoUnprovide?: boolean | null } | null, agent?: { __typename?: 'Agent', name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, template: { __typename?: 'Template', id: string, extensions?: Array<string | null> | null, params?: any | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null, meta?: any | null }, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }, creator?: { __typename?: 'User', email: string } | null, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null, causedReservations: Array<{ __typename?: 'Reservation', title?: string | null, status: ReservationStatus, statusmessage: string, id: string, reference: string, allowAutoRequest: boolean, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }>, assignations?: Array<{ __typename?: 'Assignation', id: string, reference: string, status: AssignationStatus, creator?: { __typename?: 'User', email: string } | null, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null } | null> | null, reservations: Array<{ __typename?: 'Reservation', title?: string | null, id: string, reference: string, status: ReservationStatus, node: { __typename?: 'Node', name: string }, waiter: { __typename?: 'Waiter', registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } }>, log?: Array<{ __typename?: 'ProvisionLog', message?: string | null, level: ProvisionLogLevel, createdAt: any } | null> | null } | null };

export type MyProvisionsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyProvisionsQuery = { __typename?: 'Query', myprovisions?: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> } | null> | null };

export type ProvisionsQueryVariables = Exact<{ [key: string]: never; }>;


export type ProvisionsQuery = { __typename?: 'Query', provisions?: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> } | null> | null };

export type FilteredProvisionsQueryVariables = Exact<{
  exclude?: InputMaybe<Array<InputMaybe<ProvisionStatusInput>>>;
  filter?: InputMaybe<Array<InputMaybe<ProvisionStatusInput>>>;
}>;


export type FilteredProvisionsQuery = { __typename?: 'Query', myprovisions?: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> } | null> | null };

export type AgentProvisionsQueryVariables = Exact<{
  agent: Scalars['ID'];
}>;


export type AgentProvisionsQuery = { __typename?: 'Query', allprovisions?: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> } | null> | null };

export type LinkableProvisionsQueryVariables = Exact<{
  reservation: Scalars['ID'];
}>;


export type LinkableProvisionsQuery = { __typename?: 'Query', linkableprovisions?: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> } | null> | null };

export type LinkableProvisionsOptionsQueryVariables = Exact<{
  reservation: Scalars['ID'];
}>;


export type LinkableProvisionsOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Provision', value: string, label: string } | null> | null };

export type ClientProvisionsQueryVariables = Exact<{
  clientId: Scalars['String'];
}>;


export type ClientProvisionsQuery = { __typename?: 'Query', allprovisions?: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> } | null> | null };

export type RegistryOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type RegistryOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Registry', label: string, value: string } | null> | null };

export type RepositoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type RepositoriesQuery = { __typename?: 'Query', allrepositories?: Array<{ __typename: 'AppRepository', id: string, name?: string | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, nodes?: Array<{ __typename?: 'Node', scope: NodeScope, id: string, name: string } | null> | null } | { __typename: 'MirrorRepository', id: string, url?: string | null, name?: string | null, nodes?: Array<{ __typename?: 'Node', scope: NodeScope, id: string, name: string } | null> | null } | null> | null };

export type DetailRepositoryQueryVariables = Exact<{
  id?: InputMaybe<Scalars['ID']>;
}>;


export type DetailRepositoryQuery = { __typename?: 'Query', repository?: { __typename?: 'AppRepository', name?: string | null, installedAt: any, nodes?: Array<{ __typename?: 'Node', id: string, name: string, kind: NodeKind, hash: string, description: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope } | null> | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null } | { __typename?: 'MirrorRepository', name?: string | null, url?: string | null, nodes?: Array<{ __typename?: 'Node', id: string, name: string, kind: NodeKind, hash: string, description: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope } | null> | null } | null };

export type DetailReservationQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailReservationQuery = { __typename?: 'Query', reservation?: { __typename?: 'Reservation', title?: string | null, status: ReservationStatus, id: string, reference: string, statusmessage: string, allowAutoRequest: boolean, channel: string, params?: { __typename?: 'ReserveParams', autoProvide?: boolean | null, autoUnprovide?: boolean | null, minimalInstances?: number | null, desiredInstances?: number | null } | null, binds?: { __typename?: 'Binds', clients?: Array<{ __typename?: 'LokClient', id: string, name: string, clientId: string } | null> | null, templates?: Array<{ __typename?: 'Template', id: string, name: string, interface: string } | null> | null } | null, provision?: { __typename?: 'Provision', reference: string, id: string, access: ProvisionAccess, status: ProvisionStatus, creator?: { __typename?: 'User', id: string, username: string } | null, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null } | null, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null }, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, scope: NodeScope, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, template?: { __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null, provisions: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> }>, log?: Array<{ __typename?: 'ReservationLog', message?: string | null, level: ReservationLogLevel } | null> | null, creator?: { __typename?: 'User', email: string } | null } | null, linkableprovisions?: Array<{ __typename?: 'Provision', id: string, template: { __typename?: 'Template', agent: { __typename?: 'Agent', registry?: { __typename?: 'Registry', app?: { __typename?: 'LokApp', identifier: string, version: string } | null, user?: { __typename?: 'User', id: string, email: string } | null } | null } } } | null> | null };

export type ProvisionReferenceReservationQueryVariables = Exact<{
  provision: Scalars['ID'];
  reference: Scalars['String'];
}>;


export type ProvisionReferenceReservationQuery = { __typename?: 'Query', reservation?: { __typename?: 'Reservation', title?: string | null, status: ReservationStatus, id: string, reference: string, statusmessage: string, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, scope: NodeScope, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null }, template?: { __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null, provisions: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> }> } | null };

export type MyReservationsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyReservationsQuery = { __typename?: 'Query', myreservations?: Array<{ __typename?: 'Reservation', title?: string | null, status: ReservationStatus, statusmessage: string, id: string, reference: string, allowAutoRequest: boolean, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null> | null };

export type ReservationsQueryVariables = Exact<{ [key: string]: never; }>;


export type ReservationsQuery = { __typename?: 'Query', reservations?: Array<{ __typename?: 'Reservation', title?: string | null, status: ReservationStatus, statusmessage: string, id: string, reference: string, allowAutoRequest: boolean, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null> | null };

export type DeployReservationsQueryVariables = Exact<{ [key: string]: never; }>;


export type DeployReservationsQuery = { __typename?: 'Query', reservations?: Array<{ __typename?: 'Reservation', id: string, status: ReservationStatus, title?: string | null, waiter: { __typename?: 'Waiter', clientId: string }, node: { __typename?: 'Node', id: string, name: string, description: string }, provisions: Array<{ __typename?: 'Provision', agent?: { __typename?: 'Agent', clientId: string } | null }> } | null> | null };

export type FilteredReservationsQueryVariables = Exact<{
  exclude?: InputMaybe<Array<InputMaybe<ReservationStatusInput>>>;
  filter?: InputMaybe<Array<InputMaybe<ReservationStatusInput>>>;
}>;


export type FilteredReservationsQuery = { __typename?: 'Query', myreservations?: Array<{ __typename?: 'Reservation', title?: string | null, status: ReservationStatus, statusmessage: string, id: string, reference: string, allowAutoRequest: boolean, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null> | null };

export type DetailStructureQueryVariables = Exact<{
  identifier?: InputMaybe<Scalars['String']>;
}>;


export type DetailStructureQuery = { __typename?: 'Query', structure?: { __typename?: 'Structure', id: string, identifier: string } | null };

export type StructuresQueryVariables = Exact<{ [key: string]: never; }>;


export type StructuresQuery = { __typename?: 'Query', structures?: Array<{ __typename?: 'Structure', id: string, identifier: string } | null> | null };

export type TemplatesQueryVariables = Exact<{
  active?: InputMaybe<Scalars['Boolean']>;
  package?: InputMaybe<Scalars['String']>;
  interface?: InputMaybe<Scalars['String']>;
  node?: InputMaybe<Scalars['ID']>;
}>;


export type TemplatesQuery = { __typename?: 'Query', templates?: Array<{ __typename?: 'Template', id: string, name: string, node: { __typename?: 'Node', id: string, name: string } } | null> | null };

export type AssignableTemplatesQueryVariables = Exact<{
  node?: InputMaybe<Scalars['ID']>;
}>;


export type AssignableTemplatesQuery = { __typename?: 'Query', templates?: Array<{ __typename?: 'Template', id: string, name: string, node: { __typename?: 'Node', id: string, name: string }, agent: { __typename?: 'Agent', registry?: { __typename?: 'Registry', app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null, user?: { __typename?: 'User', username: string } | null } | null } } | null> | null };

export type ReservableTemplatesQueryVariables = Exact<{
  node: Scalars['ID'];
}>;


export type ReservableTemplatesQuery = { __typename?: 'Query', reservableTemplates?: Array<{ __typename?: 'Template', id: string, name: string, node: { __typename?: 'Node', scope: NodeScope, id: string, name: string }, agent: { __typename?: 'Agent', status: AgentStatus, id: string, instanceId: string, registry?: { __typename?: 'Registry', id: string, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null, user?: { __typename?: 'User', username: string, sub?: string | null } | null } | null }, provisions?: Array<{ __typename?: 'Provision', id: string, status: ProvisionStatus } | null> | null } | null> | null };

export type HashReservableTemplatesQueryVariables = Exact<{
  hash: Scalars['String'];
}>;


export type HashReservableTemplatesQuery = { __typename?: 'Query', reservableTemplates?: Array<{ __typename?: 'Template', id: string, name: string, node: { __typename?: 'Node', scope: NodeScope, id: string, name: string }, agent: { __typename?: 'Agent', status: AgentStatus, id: string, instanceId: string, registry?: { __typename?: 'Registry', id: string, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', id: string, version: string, identifier: string } | null, user?: { __typename?: 'User', username: string, sub?: string | null } | null } | null }, provisions?: Array<{ __typename?: 'Provision', id: string, status: ProvisionStatus } | null> | null } | null> | null };

export type DetailTemplateQueryVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailTemplateQuery = { __typename?: 'Query', template?: { __typename?: 'Template', id: string, extensions?: Array<string | null> | null, params?: any | null, interface: string, creator?: { __typename?: 'User', email: string } | null, node: { __typename?: 'Node', name: string, description: string, kind: NodeKind, hash: string, id: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope, templates?: Array<{ __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null> | null, isTestFor?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, tests?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null }, testresults: Array<{ __typename?: 'TestResult', id: string, result?: any | null, passed: boolean, case: { __typename?: 'TestCase', id: string, description?: string | null, key?: string | null, name?: string | null, node: { __typename?: 'Node', name: string } } }>, agent: { __typename?: 'Agent', id: string, instanceId: string, registry?: { __typename?: 'Registry', id: string } | null }, provisions?: Array<{ __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> } | null> | null } | null };

export type TemplateOptionsQueryVariables = Exact<{
  node: Scalars['ID'];
}>;


export type TemplateOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Template', value: string, label: string, node: { __typename?: 'Node', id: string, name: string } } | null> | null };

export type SearchTemplateOptionsQueryVariables = Exact<{
  node: Scalars['ID'];
  search?: InputMaybe<Scalars['String']>;
}>;


export type SearchTemplateOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'Template', value: string, label: string, node: { __typename?: 'Node', id: string, name: string } } | null> | null };

export type NodeTemplatesQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
  scopes?: InputMaybe<Array<InputMaybe<NodeScope>>>;
}>;


export type NodeTemplatesQuery = { __typename?: 'Query', templates?: Array<{ __typename?: 'Template', id: string, name: string, interface: string, node: { __typename?: 'Node', scope: NodeScope, id: string, name: string, description: string } } | null> | null };

export type UserOptionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']>;
}>;


export type UserOptionsQuery = { __typename?: 'Query', options?: Array<{ __typename?: 'User', value: string, label: string } | null> | null };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me?: { __typename?: 'User', id: string, email: string } | null };

export type UserQueryVariables = Exact<{
  email?: InputMaybe<Scalars['String']>;
}>;


export type UserQuery = { __typename?: 'Query', user?: { __typename?: 'User', id: string, username: string, email: string } | null };

export type AgentsEventSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type AgentsEventSubscription = { __typename?: 'Subscription', agentsEvent?: { __typename?: 'AgentEvent', deleted?: string | null, created?: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, updated?: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null } | null };

export type WatchAssignationSubscriptionVariables = Exact<{
  id: Scalars['ID'];
}>;


export type WatchAssignationSubscription = { __typename?: 'Subscription', assignation?: { __typename?: 'AssignationEvent', log?: { __typename?: 'AssignationLogEvent', message?: string | null, level?: string | null } | null } | null };

export type WatchMyRequestsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchMyRequestsSubscription = { __typename?: 'Subscription', myrequests?: { __typename?: 'AssignationsEvent', delete?: string | null, create?: { __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null, update?: { __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null } | null };

export type WatchRequestsSubscriptionVariables = Exact<{
  identifier: Scalars['String'];
}>;


export type WatchRequestsSubscription = { __typename?: 'Subscription', requests?: { __typename?: 'AssignationsEvent', delete?: string | null, create?: { __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null, update?: { __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null } | null };

export type WatchMyTodosSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchMyTodosSubscription = { __typename?: 'Subscription', mytodos?: { __typename?: 'TodoEvent', delete?: string | null, create?: { __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null, update?: { __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null } | null };

export type WatchTodosSubscriptionVariables = Exact<{
  identifier: Scalars['String'];
}>;


export type WatchTodosSubscription = { __typename?: 'Subscription', todos?: { __typename?: 'TodoEvent', delete?: string | null, create?: { __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null, update?: { __typename?: 'Assignation', status: AssignationStatus, id: string, args?: Array<any | null> | null, kwargs?: any | null, reference: string, createdAt: any, progress?: number | null, returns?: Array<any | null> | null, statusmessage: string, reservation?: { __typename?: 'Reservation', id: string, title?: string | null, node: { __typename?: 'Node', id: string, name: string, interfaces?: Array<string | null> | null }, template?: { __typename?: 'Template', interface: string, agent: { __typename?: 'Agent', id: string, instanceId: string, status: AgentStatus, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null } | null } | null };

export type NodesEventSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type NodesEventSubscription = { __typename?: 'Subscription', nodes?: { __typename?: 'NodeEvent', deleted?: string | null, updated?: { __typename?: 'Node', id: string, name: string, kind: NodeKind, hash: string, description: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope } | null, created?: { __typename?: 'Node', id: string, name: string, kind: NodeKind, hash: string, description: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope } | null } | null };

export type AssignNodeEventSubscriptionVariables = Exact<{
  id: Scalars['ID'];
}>;


export type AssignNodeEventSubscription = { __typename?: 'Subscription', nodeEvent?: { __typename?: 'Node', name: string, hash: string, description: string, scope: NodeScope, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null, isTestFor?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, tests?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null } | null };

export type DetailNodeEventSubscriptionVariables = Exact<{
  id: Scalars['ID'];
}>;


export type DetailNodeEventSubscription = { __typename?: 'Subscription', nodeEvent?: { __typename?: 'Node', name: string, description: string, kind: NodeKind, hash: string, id: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope, templates?: Array<{ __typename?: 'Template', id: string, interface: string, agent: { __typename?: 'Agent', registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null> | null, isTestFor?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, tests?: Array<{ __typename?: 'Node', id: string, name: string } | null> | null, args?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, label?: string | null, nullable: boolean, description?: string | null, scope: Scope, kind: PortKind, identifier?: Identifier | null, default?: any | null, groups?: Array<string | null> | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, annotations?: Array<{ __typename?: 'AttributePredicate' } | { __typename?: 'CustomAnnotation' } | { __typename?: 'IsPredicate' } | { __typename?: 'ValueRange', min: number, max: number } | null> | null } | null> | null, portGroups?: Array<{ __typename?: 'PortGroup', key: string, hidden?: boolean | null } | null> | null } | null };

export type WatchInterfaceSubscriptionVariables = Exact<{
  interface?: InputMaybe<Scalars['String']>;
}>;


export type WatchInterfaceSubscription = { __typename?: 'Subscription', nodes?: { __typename?: 'NodeEvent', deleted?: string | null, updated?: { __typename?: 'Node', id: string, name: string, kind: NodeKind, hash: string, description: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope } | null, created?: { __typename?: 'Node', id: string, name: string, kind: NodeKind, hash: string, description: string, interfaces?: Array<string | null> | null, meta?: any | null, scope: NodeScope } | null } | null };

export type WatchProvisionSubscriptionVariables = Exact<{
  id: Scalars['ID'];
}>;


export type WatchProvisionSubscription = { __typename?: 'Subscription', provision?: { __typename?: 'ProvisionEvent', log?: { __typename?: 'ProvisionLogEvent', message?: string | null, level?: string | null } | null } | null };

export type WatchProvisionsSubscriptionVariables = Exact<{
  identifier: Scalars['String'];
}>;


export type WatchProvisionsSubscription = { __typename?: 'Subscription', provisions?: { __typename?: 'ProvisionsEvent', delete?: string | null, create?: { __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> } | null, update?: { __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> } | null } | null };

export type WatchMyProvisionsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchMyProvisionsSubscription = { __typename?: 'Subscription', myprovisions?: { __typename?: 'ProvisionsEvent', delete?: string | null, create?: { __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> } | null, update?: { __typename?: 'Provision', status: ProvisionStatus, id: string, reference: string, template: { __typename?: 'Template', id: string, interface: string, extensions?: Array<string | null> | null }, agent?: { __typename?: 'Agent', id: string, name: string, instanceId: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } | null, reservations: Array<{ __typename?: 'Reservation', id: string, reference: string, creator?: { __typename?: 'User', username: string } | null, app?: { __typename?: 'LokApp', version: string, identifier: string } | null }> } | null } | null };

export type WatchReservationSubscriptionVariables = Exact<{
  id: Scalars['ID'];
}>;


export type WatchReservationSubscription = { __typename?: 'Subscription', reservation?: { __typename?: 'ReservationEvent', log?: { __typename?: 'ReservationLogEvent', message?: string | null, level?: string | null } | null } | null };

export type WatchReservationsSubscriptionVariables = Exact<{
  identifier: Scalars['String'];
}>;


export type WatchReservationsSubscription = { __typename?: 'Subscription', reservations?: { __typename?: 'ReservationsEvent', delete?: string | null, create?: { __typename?: 'Reservation', title?: string | null, status: ReservationStatus, statusmessage: string, id: string, reference: string, allowAutoRequest: boolean, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null, update?: { __typename?: 'Reservation', title?: string | null, status: ReservationStatus, statusmessage: string, id: string, reference: string, allowAutoRequest: boolean, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null };

export type WatchMyReservationsSubscriptionVariables = Exact<{ [key: string]: never; }>;


export type WatchMyReservationsSubscription = { __typename?: 'Subscription', myreservations?: { __typename?: 'ReservationsEvent', delete?: string | null, create?: { __typename?: 'Reservation', title?: string | null, status: ReservationStatus, statusmessage: string, id: string, reference: string, allowAutoRequest: boolean, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null, update?: { __typename?: 'Reservation', title?: string | null, status: ReservationStatus, statusmessage: string, id: string, reference: string, allowAutoRequest: boolean, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null };

export type WatchReservationsOnProvisionSubscriptionVariables = Exact<{
  identifier: Scalars['String'];
  provision: Scalars['String'];
}>;


export type WatchReservationsOnProvisionSubscription = { __typename?: 'Subscription', reservations?: { __typename?: 'ReservationsEvent', delete?: string | null, create?: { __typename?: 'Reservation', title?: string | null, status: ReservationStatus, statusmessage: string, id: string, reference: string, allowAutoRequest: boolean, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null, update?: { __typename?: 'Reservation', title?: string | null, status: ReservationStatus, statusmessage: string, id: string, reference: string, allowAutoRequest: boolean, node: { __typename?: 'Node', id: string, kind: NodeKind, name: string, description: string, interfaces?: Array<string | null> | null, args?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null, returns?: Array<{ __typename: 'Port', key: string, kind: PortKind, identifier?: Identifier | null, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, nullable: boolean, child?: { __typename?: 'ChildPort', kind: PortKind, scope: Scope, child?: { __typename?: 'ChildPort', kind: PortKind, identifier?: Identifier | null, scope: Scope, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null, assignWidget?: { __typename: 'BoolWidget', kind: string } | { __typename: 'ChoiceWidget', kind: string, choices?: Array<{ __typename?: 'Choice', value: any, label: string } | null> | null } | { __typename: 'CustomWidget', kind: string, hook?: string | null, dependencies?: Array<string | null> | null } | { __typename: 'IntWidget', kind: string, dependencies?: Array<string | null> | null } | { __typename: 'LinkWidget', kind: string } | { __typename: 'QueryWidget', kind: string } | { __typename: 'SearchWidget', kind: string, query: string, ward: string, dependencies?: Array<string | null> | null } | { __typename: 'SliderWidget', kind: string, dependencies?: Array<string | null> | null, min?: number | null, max?: number | null } | { __typename: 'StringWidget', kind: string, dependencies?: Array<string | null> | null, placeholder?: string | null, asParagraph?: boolean | null } | { __typename: 'TemplateWidget', kind: string } | null, returnWidget?: { __typename: 'ChoiceReturnWidget', kind: string, choices?: Array<{ __typename?: 'Choice', label: string, value: any } | null> | null } | { __typename: 'CustomReturnWidget', kind: string, hook?: string | null, ward?: string | null } | { __typename: 'ImageReturnWidget', kind: string, query?: string | null, ward?: string | null } | null } | null } | null> | null }, waiter: { __typename?: 'Waiter', id: string, registry?: { __typename?: 'Registry', name?: string | null, client: { __typename?: 'LokClient', clientId: string }, app?: { __typename?: 'LokApp', version: string, identifier: string } | null, user?: { __typename?: 'User', sub?: string | null, username: string } | null } | null } } | null } | null };

export const RegistryFragmentDoc = gql`
    fragment Registry on Registry {
  name
  client {
    clientId
  }
  app {
    version
    identifier
  }
  user {
    sub
    username
  }
}
    `;
export const ListTemplateFragmentDoc = gql`
    fragment ListTemplate on Template {
  id
  interface
  agent {
    registry {
      ...Registry
    }
  }
}
    ${RegistryFragmentDoc}`;
export const ListProvisionFragmentDoc = gql`
    fragment ListProvision on Provision {
  status
  id
  reference
  template {
    id
    interface
    extensions
  }
  agent {
    id
    registry {
      ...Registry
    }
    name
    instanceId
  }
  reservations {
    id
    reference
    creator {
      username
    }
    app {
      version
      identifier
    }
  }
}
    ${RegistryFragmentDoc}`;
export const DetailAgentFragmentDoc = gql`
    fragment DetailAgent on Agent {
  id
  templates {
    ...ListTemplate
  }
  registry {
    ...Registry
  }
  instanceId
  provisions {
    ...ListProvision
  }
  status
  name
}
    ${ListTemplateFragmentDoc}
${RegistryFragmentDoc}
${ListProvisionFragmentDoc}`;
export const ListAgentFragmentDoc = gql`
    fragment ListAgent on Agent {
  id
  registry {
    ...Registry
  }
  instanceId
  status
}
    ${RegistryFragmentDoc}`;
export const IntWidgetFragmentDoc = gql`
    fragment IntWidget on IntWidget {
  kind
  dependencies
}
    `;
export const StringWidgetFragmentDoc = gql`
    fragment StringWidget on StringWidget {
  __typename
  kind
  dependencies
  placeholder
  asParagraph
}
    `;
export const SearchWidgetFragmentDoc = gql`
    fragment SearchWidget on SearchWidget {
  __typename
  kind
  query
  ward
  dependencies
}
    `;
export const SliderWidgetFragmentDoc = gql`
    fragment SliderWidget on SliderWidget {
  __typename
  kind
  dependencies
  min
  max
}
    `;
export const ChoiceWidgetFragmentDoc = gql`
    fragment ChoiceWidget on ChoiceWidget {
  __typename
  kind
  choices {
    value
    label
  }
}
    `;
export const CustomWidgetFragmentDoc = gql`
    fragment CustomWidget on CustomWidget {
  __typename
  kind
  hook
  dependencies
}
    `;
export const InputWidgetFragmentDoc = gql`
    fragment InputWidget on Widget {
  __typename
  kind
  ...IntWidget
  ...StringWidget
  ...SearchWidget
  ...SliderWidget
  ...ChoiceWidget
  ...CustomWidget
}
    ${IntWidgetFragmentDoc}
${StringWidgetFragmentDoc}
${SearchWidgetFragmentDoc}
${SliderWidgetFragmentDoc}
${ChoiceWidgetFragmentDoc}
${CustomWidgetFragmentDoc}`;
export const ImageReturnWidgetFragmentDoc = gql`
    fragment ImageReturnWidget on ImageReturnWidget {
  __typename
  query
  kind
  ward
}
    `;
export const CustomReturnWidgetFragmentDoc = gql`
    fragment CustomReturnWidget on CustomReturnWidget {
  __typename
  kind
  hook
  ward
}
    `;
export const ChoiceReturnWidgetFragmentDoc = gql`
    fragment ChoiceReturnWidget on ChoiceReturnWidget {
  __typename
  choices {
    label
    value
  }
}
    `;
export const ReturnWidgetFragmentDoc = gql`
    fragment ReturnWidget on ReturnWidget {
  __typename
  kind
  ...ImageReturnWidget
  ...CustomReturnWidget
  ...ChoiceReturnWidget
}
    ${ImageReturnWidgetFragmentDoc}
${CustomReturnWidgetFragmentDoc}
${ChoiceReturnWidgetFragmentDoc}`;
export const ChildPortNestedFragmentDoc = gql`
    fragment ChildPortNested on ChildPort {
  kind
  child {
    kind
    identifier
    scope
    assignWidget {
      ...InputWidget
    }
    returnWidget {
      ...ReturnWidget
    }
  }
  scope
  assignWidget {
    ...InputWidget
  }
  returnWidget {
    ...ReturnWidget
  }
}
    ${InputWidgetFragmentDoc}
${ReturnWidgetFragmentDoc}`;
export const ChildPortFragmentDoc = gql`
    fragment ChildPort on ChildPort {
  kind
  identifier
  scope
  child {
    ...ChildPortNested
  }
  assignWidget {
    ...InputWidget
  }
  returnWidget {
    ...ReturnWidget
  }
  nullable
}
    ${ChildPortNestedFragmentDoc}
${InputWidgetFragmentDoc}
${ReturnWidgetFragmentDoc}`;
export const PortFragmentDoc = gql`
    fragment Port on Port {
  __typename
  key
  label
  nullable
  description
  scope
  assignWidget {
    ...InputWidget
  }
  returnWidget {
    ...ReturnWidget
  }
  kind
  identifier
  child {
    ...ChildPort
  }
  default
  nullable
  annotations {
    ... on ValueRange {
      min
      max
    }
  }
  groups
}
    ${InputWidgetFragmentDoc}
${ReturnWidgetFragmentDoc}
${ChildPortFragmentDoc}`;
export const PortsFragmentDoc = gql`
    fragment Ports on Node {
  args {
    ...Port
  }
  returns {
    ...Port
  }
  portGroups {
    key
    hidden
  }
}
    ${PortFragmentDoc}`;
export const DetailAssignationFragmentDoc = gql`
    fragment DetailAssignation on Assignation {
  status
  id
  args
  kwargs
  reference
  progress
  parent {
    id
    reservation {
      id
      node {
        id
        name
      }
    }
  }
  statusmessage
  provision {
    status
    id
    reference
    params {
      autoUnprovide
    }
    agent {
      name
    }
    createdAt
    template {
      id
      interface
      node {
        id
        name
        interfaces
      }
      agent {
        ...ListAgent
      }
      extensions
    }
    creator {
      email
      sub
    }
    app {
      version
      identifier
    }
  }
  reservation {
    id
    reference
    status
    node {
      scope
      id
      name
      interfaces
      meta
      ...Ports
      kind
    }
    app {
      version
      identifier
    }
    creator {
      email
    }
  }
  app {
    id
    version
    identifier
  }
  creator {
    email
    sub
  }
  log(o: "time") {
    message
    level
  }
  returns
}
    ${ListAgentFragmentDoc}
${PortsFragmentDoc}`;
export const ListAssignationFragmentDoc = gql`
    fragment ListAssignation on Assignation {
  status
  id
  args
  kwargs
  reference
  createdAt
  progress
  reservation {
    id
    title
    node {
      id
      name
      interfaces
    }
    template {
      interface
      agent {
        ...ListAgent
      }
    }
  }
  returns
  statusmessage
}
    ${ListAgentFragmentDoc}`;
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
export const MiniNodeFragmentDoc = gql`
    fragment MiniNode on Node {
  name
  description
  kind
  id
  meta
  hash
  scope
}
    `;
export const CompleteNodeFragmentDoc = gql`
    fragment CompleteNode on Node {
  name
  hash
  description
  args {
    ...Port
  }
  portGroups {
    key
    hidden
  }
  scope
  isTestFor {
    id
    name
  }
  tests {
    id
    name
  }
}
    ${PortFragmentDoc}`;
export const UserAssignmentFragmentDoc = gql`
    fragment UserAssignment on UserAssignment {
  user {
    id
    sub
    username
    email
  }
  permissions
}
    `;
export const GroupAssignmentFragmentDoc = gql`
    fragment GroupAssignment on GroupAssignment {
  group {
    name
  }
  permissions
}
    `;
export const BoolWidgetFragmentDoc = gql`
    fragment BoolWidget on BoolWidget {
  kind
  dependencies
}
    `;
export const LinkWidgetFragmentDoc = gql`
    fragment LinkWidget on LinkWidget {
  kind
  linkbuilder
}
    `;
export const ListReservationFragmentDoc = gql`
    fragment ListReservation on Reservation {
  title
  status
  statusmessage
  id
  reference
  allowAutoRequest
  node {
    id
    kind
    name
    description
    args {
      __typename
      key
      kind
      child {
        ...ChildPort
      }
      identifier
      nullable
    }
    returns {
      __typename
      key
      kind
      child {
        ...ChildPort
      }
      identifier
      nullable
    }
    interfaces
  }
  waiter {
    id
    registry {
      ...Registry
    }
  }
}
    ${ChildPortFragmentDoc}
${RegistryFragmentDoc}`;
export const ProvisionLogFragmentDoc = gql`
    fragment ProvisionLog on ProvisionLog {
  message
  level
  createdAt
}
    `;
export const DetailProvisionFragmentDoc = gql`
    fragment DetailProvision on Provision {
  statusmessage
  status
  id
  reference
  params {
    autoUnprovide
  }
  agent {
    registry {
      ...Registry
    }
    name
    instanceId
  }
  mode
  createdAt
  template {
    id
    node {
      id
      name
      interfaces
      meta
    }
    agent {
      ...ListAgent
    }
    extensions
    params
  }
  creator {
    email
  }
  app {
    id
    version
    identifier
  }
  causedReservations {
    ...ListReservation
  }
  assignations {
    id
    reference
    status
    creator {
      email
    }
    app {
      id
      version
      identifier
    }
  }
  reservations {
    title
    node {
      name
    }
    id
    reference
    status
    waiter {
      registry {
        ...Registry
      }
    }
  }
  log(o: "time", level: INFO) {
    ...ProvisionLog
  }
}
    ${RegistryFragmentDoc}
${ListAgentFragmentDoc}
${ListReservationFragmentDoc}
${ProvisionLogFragmentDoc}`;
export const AppRepositoryFragmentDoc = gql`
    fragment AppRepository on AppRepository {
  id
  app {
    version
    identifier
  }
  name
  nodes {
    scope
    id
    name
  }
}
    `;
export const MirrorRepositoryFragmentDoc = gql`
    fragment MirrorRepository on MirrorRepository {
  id
  url
  name
  nodes {
    scope
    id
    name
  }
}
    `;
export const ListRepositoryFragmentDoc = gql`
    fragment ListRepository on Repository {
  __typename
  ...AppRepository
  ...MirrorRepository
}
    ${AppRepositoryFragmentDoc}
${MirrorRepositoryFragmentDoc}`;
export const DetailAppRepositoryFragmentDoc = gql`
    fragment DetailAppRepository on AppRepository {
  installedAt
  app {
    version
    identifier
  }
}
    `;
export const DetailMirrorRepositoryFragmentDoc = gql`
    fragment DetailMirrorRepository on MirrorRepository {
  url
}
    `;
export const NodeListItemFragmentDoc = gql`
    fragment NodeListItem on Node {
  id
  name
  kind
  hash
  description
  interfaces
  meta
  scope
}
    `;
export const DetailRepositoryFragmentDoc = gql`
    fragment DetailRepository on Repository {
  name
  ...DetailAppRepository
  ...DetailMirrorRepository
  nodes {
    ...NodeListItem
  }
}
    ${DetailAppRepositoryFragmentDoc}
${DetailMirrorRepositoryFragmentDoc}
${NodeListItemFragmentDoc}`;
export const DetailReservationFragmentDoc = gql`
    fragment DetailReservation on Reservation {
  title
  status
  id
  reference
  statusmessage
  params {
    autoProvide
    autoUnprovide
    minimalInstances
    desiredInstances
  }
  binds {
    clients {
      id
      name
      clientId
    }
    templates {
      id
      name
      interface
    }
  }
  allowAutoRequest
  provision {
    reference
    id
    access
    status
    creator {
      id
      username
    }
    app {
      id
      version
      identifier
    }
  }
  waiter {
    id
    registry {
      ...Registry
    }
  }
  channel
  node {
    id
    kind
    name
    scope
    description
    args {
      __typename
      key
      kind
      child {
        ...ChildPort
      }
      identifier
      nullable
    }
    returns {
      __typename
      key
      kind
      child {
        ...ChildPort
      }
      identifier
      nullable
    }
    interfaces
  }
  template {
    id
    interface
    agent {
      ...ListAgent
    }
  }
  provisions {
    ...ListProvision
  }
  log(o: "time") {
    message
    level
  }
  creator {
    email
  }
}
    ${RegistryFragmentDoc}
${ChildPortFragmentDoc}
${ListAgentFragmentDoc}
${ListProvisionFragmentDoc}`;
export const NodeReservationFragmentDoc = gql`
    fragment NodeReservation on Reservation {
  title
  status
  id
  reference
  statusmessage
  node {
    id
    kind
    name
    scope
    description
    args {
      ...Port
    }
    returns {
      ...Port
    }
    interfaces
  }
  template {
    id
    interface
    agent {
      ...ListAgent
    }
  }
  provisions {
    ...ListProvision
  }
}
    ${PortFragmentDoc}
${ListAgentFragmentDoc}
${ListProvisionFragmentDoc}`;
export const DetailStructureFragmentDoc = gql`
    fragment DetailStructure on Structure {
  id
  identifier
}
    `;
export const ListStructureFragmentDoc = gql`
    fragment ListStructure on Structure {
  id
  identifier
}
    `;
export const DetailNodeFragmentDoc = gql`
    fragment DetailNode on Node {
  name
  description
  kind
  hash
  id
  interfaces
  meta
  ...Ports
  templates {
    ...ListTemplate
  }
  scope
  isTestFor {
    id
    name
  }
  tests {
    id
    name
  }
}
    ${PortsFragmentDoc}
${ListTemplateFragmentDoc}`;
export const ListTestResultFragmentDoc = gql`
    fragment ListTestResult on TestResult {
  id
  case {
    id
    node {
      name
    }
    description
    key
    name
  }
  result
  passed
}
    `;
export const DetailTemplateFragmentDoc = gql`
    fragment DetailTemplate on Template {
  id
  extensions
  creator {
    email
  }
  params
  interface
  node {
    ...DetailNode
  }
  testresults {
    ...ListTestResult
  }
  agent {
    id
    instanceId
    registry {
      id
    }
  }
  provisions(status: [ACTIVE, PENDING, CRITICAL, PENDING, DISCONNECTED]) {
    ...ListProvision
  }
}
    ${DetailNodeFragmentDoc}
${ListTestResultFragmentDoc}
${ListProvisionFragmentDoc}`;
export const ReservableTemplateFragmentDoc = gql`
    fragment ReservableTemplate on Template {
  id
  name
  node {
    scope
    id
    name
  }
  agent {
    status
    id
    instanceId
    registry {
      id
      client {
        clientId
      }
      app {
        id
        version
        identifier
      }
      user {
        username
        sub
      }
    }
  }
  provisions {
    id
    status
  }
}
    `;
export const DisplayTemplateFragmentDoc = gql`
    fragment DisplayTemplate on Template {
  id
  name
  interface
  node {
    scope
    id
    name
    description
  }
}
    `;
export const ResetAgentsDocument = gql`
    mutation ResetAgents {
  resetAgents {
    ok
  }
}
    `;
export type ResetAgentsMutationFn = Apollo.MutationFunction<ResetAgentsMutation, ResetAgentsMutationVariables>;

/**
 * __useResetAgentsMutation__
 *
 * To run a mutation, you first call `useResetAgentsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetAgentsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetAgentsMutation, { data, loading, error }] = useResetAgentsMutation({
 *   variables: {
 *   },
 * });
 */
export function useResetAgentsMutation(baseOptions?: Apollo.MutationHookOptions<ResetAgentsMutation, ResetAgentsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetAgentsMutation, ResetAgentsMutationVariables>(ResetAgentsDocument, options);
      }
export type ResetAgentsMutationHookResult = ReturnType<typeof useResetAgentsMutation>;
export type ResetAgentsMutationResult = Apollo.MutationResult<ResetAgentsMutation>;
export type ResetAgentsMutationOptions = Apollo.BaseMutationOptions<ResetAgentsMutation, ResetAgentsMutationVariables>;
export const ResetProvisionsDocument = gql`
    mutation ResetProvisions {
  resetProvisions {
    ok
  }
}
    `;
export type ResetProvisionsMutationFn = Apollo.MutationFunction<ResetProvisionsMutation, ResetProvisionsMutationVariables>;

/**
 * __useResetProvisionsMutation__
 *
 * To run a mutation, you first call `useResetProvisionsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetProvisionsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetProvisionsMutation, { data, loading, error }] = useResetProvisionsMutation({
 *   variables: {
 *   },
 * });
 */
export function useResetProvisionsMutation(baseOptions?: Apollo.MutationHookOptions<ResetProvisionsMutation, ResetProvisionsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetProvisionsMutation, ResetProvisionsMutationVariables>(ResetProvisionsDocument, options);
      }
export type ResetProvisionsMutationHookResult = ReturnType<typeof useResetProvisionsMutation>;
export type ResetProvisionsMutationResult = Apollo.MutationResult<ResetProvisionsMutation>;
export type ResetProvisionsMutationOptions = Apollo.BaseMutationOptions<ResetProvisionsMutation, ResetProvisionsMutationVariables>;
export const ResetReservationsDocument = gql`
    mutation ResetReservations {
  resetReservations {
    ok
  }
}
    `;
export type ResetReservationsMutationFn = Apollo.MutationFunction<ResetReservationsMutation, ResetReservationsMutationVariables>;

/**
 * __useResetReservationsMutation__
 *
 * To run a mutation, you first call `useResetReservationsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetReservationsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetReservationsMutation, { data, loading, error }] = useResetReservationsMutation({
 *   variables: {
 *   },
 * });
 */
export function useResetReservationsMutation(baseOptions?: Apollo.MutationHookOptions<ResetReservationsMutation, ResetReservationsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetReservationsMutation, ResetReservationsMutationVariables>(ResetReservationsDocument, options);
      }
export type ResetReservationsMutationHookResult = ReturnType<typeof useResetReservationsMutation>;
export type ResetReservationsMutationResult = Apollo.MutationResult<ResetReservationsMutation>;
export type ResetReservationsMutationOptions = Apollo.BaseMutationOptions<ResetReservationsMutation, ResetReservationsMutationVariables>;
export const ResetAssignationsDocument = gql`
    mutation ResetAssignations {
  resetAssignations {
    ok
  }
}
    `;
export type ResetAssignationsMutationFn = Apollo.MutationFunction<ResetAssignationsMutation, ResetAssignationsMutationVariables>;

/**
 * __useResetAssignationsMutation__
 *
 * To run a mutation, you first call `useResetAssignationsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetAssignationsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetAssignationsMutation, { data, loading, error }] = useResetAssignationsMutation({
 *   variables: {
 *   },
 * });
 */
export function useResetAssignationsMutation(baseOptions?: Apollo.MutationHookOptions<ResetAssignationsMutation, ResetAssignationsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetAssignationsMutation, ResetAssignationsMutationVariables>(ResetAssignationsDocument, options);
      }
export type ResetAssignationsMutationHookResult = ReturnType<typeof useResetAssignationsMutation>;
export type ResetAssignationsMutationResult = Apollo.MutationResult<ResetAssignationsMutation>;
export type ResetAssignationsMutationOptions = Apollo.BaseMutationOptions<ResetAssignationsMutation, ResetAssignationsMutationVariables>;
export const ResetNodesDocument = gql`
    mutation ResetNodes {
  resetNodes {
    ok
  }
}
    `;
export type ResetNodesMutationFn = Apollo.MutationFunction<ResetNodesMutation, ResetNodesMutationVariables>;

/**
 * __useResetNodesMutation__
 *
 * To run a mutation, you first call `useResetNodesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetNodesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetNodesMutation, { data, loading, error }] = useResetNodesMutation({
 *   variables: {
 *   },
 * });
 */
export function useResetNodesMutation(baseOptions?: Apollo.MutationHookOptions<ResetNodesMutation, ResetNodesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetNodesMutation, ResetNodesMutationVariables>(ResetNodesDocument, options);
      }
export type ResetNodesMutationHookResult = ReturnType<typeof useResetNodesMutation>;
export type ResetNodesMutationResult = Apollo.MutationResult<ResetNodesMutation>;
export type ResetNodesMutationOptions = Apollo.BaseMutationOptions<ResetNodesMutation, ResetNodesMutationVariables>;
export const DeleteAgentDocument = gql`
    mutation DeleteAgent($id: ID!) {
  deleteAgent(id: $id) {
    id
  }
}
    `;
export type DeleteAgentMutationFn = Apollo.MutationFunction<DeleteAgentMutation, DeleteAgentMutationVariables>;

/**
 * __useDeleteAgentMutation__
 *
 * To run a mutation, you first call `useDeleteAgentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteAgentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteAgentMutation, { data, loading, error }] = useDeleteAgentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteAgentMutation(baseOptions?: Apollo.MutationHookOptions<DeleteAgentMutation, DeleteAgentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteAgentMutation, DeleteAgentMutationVariables>(DeleteAgentDocument, options);
      }
export type DeleteAgentMutationHookResult = ReturnType<typeof useDeleteAgentMutation>;
export type DeleteAgentMutationResult = Apollo.MutationResult<DeleteAgentMutation>;
export type DeleteAgentMutationOptions = Apollo.BaseMutationOptions<DeleteAgentMutation, DeleteAgentMutationVariables>;
export const KickAgentDocument = gql`
    mutation KickAgent($id: ID!) {
  kickAgent(id: $id) {
    id
  }
}
    `;
export type KickAgentMutationFn = Apollo.MutationFunction<KickAgentMutation, KickAgentMutationVariables>;

/**
 * __useKickAgentMutation__
 *
 * To run a mutation, you first call `useKickAgentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useKickAgentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [kickAgentMutation, { data, loading, error }] = useKickAgentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useKickAgentMutation(baseOptions?: Apollo.MutationHookOptions<KickAgentMutation, KickAgentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<KickAgentMutation, KickAgentMutationVariables>(KickAgentDocument, options);
      }
export type KickAgentMutationHookResult = ReturnType<typeof useKickAgentMutation>;
export type KickAgentMutationResult = Apollo.MutationResult<KickAgentMutation>;
export type KickAgentMutationOptions = Apollo.BaseMutationOptions<KickAgentMutation, KickAgentMutationVariables>;
export const BounceAgentDocument = gql`
    mutation BounceAgent($id: ID!) {
  bounceAgent(id: $id) {
    id
  }
}
    `;
export type BounceAgentMutationFn = Apollo.MutationFunction<BounceAgentMutation, BounceAgentMutationVariables>;

/**
 * __useBounceAgentMutation__
 *
 * To run a mutation, you first call `useBounceAgentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useBounceAgentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [bounceAgentMutation, { data, loading, error }] = useBounceAgentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useBounceAgentMutation(baseOptions?: Apollo.MutationHookOptions<BounceAgentMutation, BounceAgentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<BounceAgentMutation, BounceAgentMutationVariables>(BounceAgentDocument, options);
      }
export type BounceAgentMutationHookResult = ReturnType<typeof useBounceAgentMutation>;
export type BounceAgentMutationResult = Apollo.MutationResult<BounceAgentMutation>;
export type BounceAgentMutationOptions = Apollo.BaseMutationOptions<BounceAgentMutation, BounceAgentMutationVariables>;
export const TemplateDocument = gql`
    mutation template($interface: String!, $definition: DefinitionInput!, $instanceId: ID!) {
  createTemplate(
    interface: $interface
    definition: $definition
    instanceId: $instanceId
  ) {
    id
  }
}
    `;
export type TemplateMutationFn = Apollo.MutationFunction<TemplateMutation, TemplateMutationVariables>;

/**
 * __useTemplateMutation__
 *
 * To run a mutation, you first call `useTemplateMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useTemplateMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [templateMutation, { data, loading, error }] = useTemplateMutation({
 *   variables: {
 *      interface: // value for 'interface'
 *      definition: // value for 'definition'
 *      instanceId: // value for 'instanceId'
 *   },
 * });
 */
export function useTemplateMutation(baseOptions?: Apollo.MutationHookOptions<TemplateMutation, TemplateMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<TemplateMutation, TemplateMutationVariables>(TemplateDocument, options);
      }
export type TemplateMutationHookResult = ReturnType<typeof useTemplateMutation>;
export type TemplateMutationResult = Apollo.MutationResult<TemplateMutation>;
export type TemplateMutationOptions = Apollo.BaseMutationOptions<TemplateMutation, TemplateMutationVariables>;
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
export const DeleteNodeDocument = gql`
    mutation DeleteNode($id: ID!) {
  deleteNode(id: $id) {
    id
  }
}
    `;
export type DeleteNodeMutationFn = Apollo.MutationFunction<DeleteNodeMutation, DeleteNodeMutationVariables>;

/**
 * __useDeleteNodeMutation__
 *
 * To run a mutation, you first call `useDeleteNodeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteNodeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteNodeMutation, { data, loading, error }] = useDeleteNodeMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteNodeMutation(baseOptions?: Apollo.MutationHookOptions<DeleteNodeMutation, DeleteNodeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteNodeMutation, DeleteNodeMutationVariables>(DeleteNodeDocument, options);
      }
export type DeleteNodeMutationHookResult = ReturnType<typeof useDeleteNodeMutation>;
export type DeleteNodeMutationResult = Apollo.MutationResult<DeleteNodeMutation>;
export type DeleteNodeMutationOptions = Apollo.BaseMutationOptions<DeleteNodeMutation, DeleteNodeMutationVariables>;
export const PurgeNodesDocument = gql`
    mutation PurgeNodes {
  purgeNodes {
    ids
  }
}
    `;
export type PurgeNodesMutationFn = Apollo.MutationFunction<PurgeNodesMutation, PurgeNodesMutationVariables>;

/**
 * __usePurgeNodesMutation__
 *
 * To run a mutation, you first call `usePurgeNodesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePurgeNodesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [purgeNodesMutation, { data, loading, error }] = usePurgeNodesMutation({
 *   variables: {
 *   },
 * });
 */
export function usePurgeNodesMutation(baseOptions?: Apollo.MutationHookOptions<PurgeNodesMutation, PurgeNodesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PurgeNodesMutation, PurgeNodesMutationVariables>(PurgeNodesDocument, options);
      }
export type PurgeNodesMutationHookResult = ReturnType<typeof usePurgeNodesMutation>;
export type PurgeNodesMutationResult = Apollo.MutationResult<PurgeNodesMutation>;
export type PurgeNodesMutationOptions = Apollo.BaseMutationOptions<PurgeNodesMutation, PurgeNodesMutationVariables>;
export const ChangePermissionsDocument = gql`
    mutation ChangePermissions($type: SharableModels!, $object: ID!, $userAssignments: [UserAssignmentInput], $groupAssignments: [GroupAssignmentInput]) {
  changePermissions(
    type: $type
    object: $object
    userAssignments: $userAssignments
    groupAssignments: $groupAssignments
  ) {
    success
  }
}
    `;
export type ChangePermissionsMutationFn = Apollo.MutationFunction<ChangePermissionsMutation, ChangePermissionsMutationVariables>;

/**
 * __useChangePermissionsMutation__
 *
 * To run a mutation, you first call `useChangePermissionsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useChangePermissionsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [changePermissionsMutation, { data, loading, error }] = useChangePermissionsMutation({
 *   variables: {
 *      type: // value for 'type'
 *      object: // value for 'object'
 *      userAssignments: // value for 'userAssignments'
 *      groupAssignments: // value for 'groupAssignments'
 *   },
 * });
 */
export function useChangePermissionsMutation(baseOptions?: Apollo.MutationHookOptions<ChangePermissionsMutation, ChangePermissionsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ChangePermissionsMutation, ChangePermissionsMutationVariables>(ChangePermissionsDocument, options);
      }
export type ChangePermissionsMutationHookResult = ReturnType<typeof useChangePermissionsMutation>;
export type ChangePermissionsMutationResult = Apollo.MutationResult<ChangePermissionsMutation>;
export type ChangePermissionsMutationOptions = Apollo.BaseMutationOptions<ChangePermissionsMutation, ChangePermissionsMutationVariables>;
export const AcknowledgeDocument = gql`
    mutation Acknowledge($assignation: ID!) {
  ack(assignation: $assignation) {
    reference
  }
}
    `;
export type AcknowledgeMutationFn = Apollo.MutationFunction<AcknowledgeMutation, AcknowledgeMutationVariables>;

/**
 * __useAcknowledgeMutation__
 *
 * To run a mutation, you first call `useAcknowledgeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAcknowledgeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [acknowledgeMutation, { data, loading, error }] = useAcknowledgeMutation({
 *   variables: {
 *      assignation: // value for 'assignation'
 *   },
 * });
 */
export function useAcknowledgeMutation(baseOptions?: Apollo.MutationHookOptions<AcknowledgeMutation, AcknowledgeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AcknowledgeMutation, AcknowledgeMutationVariables>(AcknowledgeDocument, options);
      }
export type AcknowledgeMutationHookResult = ReturnType<typeof useAcknowledgeMutation>;
export type AcknowledgeMutationResult = Apollo.MutationResult<AcknowledgeMutation>;
export type AcknowledgeMutationOptions = Apollo.BaseMutationOptions<AcknowledgeMutation, AcknowledgeMutationVariables>;
export const AssignDocument = gql`
    mutation Assign($reservation: ID!, $args: [AnyInput]!) {
  assign(reservation: $reservation, args: $args) {
    ...DetailAssignation
  }
}
    ${DetailAssignationFragmentDoc}`;
export type AssignMutationFn = Apollo.MutationFunction<AssignMutation, AssignMutationVariables>;

/**
 * __useAssignMutation__
 *
 * To run a mutation, you first call `useAssignMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAssignMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [assignMutation, { data, loading, error }] = useAssignMutation({
 *   variables: {
 *      reservation: // value for 'reservation'
 *      args: // value for 'args'
 *   },
 * });
 */
export function useAssignMutation(baseOptions?: Apollo.MutationHookOptions<AssignMutation, AssignMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AssignMutation, AssignMutationVariables>(AssignDocument, options);
      }
export type AssignMutationHookResult = ReturnType<typeof useAssignMutation>;
export type AssignMutationResult = Apollo.MutationResult<AssignMutation>;
export type AssignMutationOptions = Apollo.BaseMutationOptions<AssignMutation, AssignMutationVariables>;
export const LinkDocument = gql`
    mutation Link($reservation: ID!, $provision: ID!) {
  link(reservation: $reservation, provision: $provision) {
    reference
  }
}
    `;
export type LinkMutationFn = Apollo.MutationFunction<LinkMutation, LinkMutationVariables>;

/**
 * __useLinkMutation__
 *
 * To run a mutation, you first call `useLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [linkMutation, { data, loading, error }] = useLinkMutation({
 *   variables: {
 *      reservation: // value for 'reservation'
 *      provision: // value for 'provision'
 *   },
 * });
 */
export function useLinkMutation(baseOptions?: Apollo.MutationHookOptions<LinkMutation, LinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LinkMutation, LinkMutationVariables>(LinkDocument, options);
      }
export type LinkMutationHookResult = ReturnType<typeof useLinkMutation>;
export type LinkMutationResult = Apollo.MutationResult<LinkMutation>;
export type LinkMutationOptions = Apollo.BaseMutationOptions<LinkMutation, LinkMutationVariables>;
export const UnlinkDocument = gql`
    mutation Unlink($reservation: ID!, $provision: ID!, $safe: Boolean) {
  unlink(reservation: $reservation, provision: $provision, safe: $safe) {
    reference
  }
}
    `;
export type UnlinkMutationFn = Apollo.MutationFunction<UnlinkMutation, UnlinkMutationVariables>;

/**
 * __useUnlinkMutation__
 *
 * To run a mutation, you first call `useUnlinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnlinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unlinkMutation, { data, loading, error }] = useUnlinkMutation({
 *   variables: {
 *      reservation: // value for 'reservation'
 *      provision: // value for 'provision'
 *      safe: // value for 'safe'
 *   },
 * });
 */
export function useUnlinkMutation(baseOptions?: Apollo.MutationHookOptions<UnlinkMutation, UnlinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnlinkMutation, UnlinkMutationVariables>(UnlinkDocument, options);
      }
export type UnlinkMutationHookResult = ReturnType<typeof useUnlinkMutation>;
export type UnlinkMutationResult = Apollo.MutationResult<UnlinkMutation>;
export type UnlinkMutationOptions = Apollo.BaseMutationOptions<UnlinkMutation, UnlinkMutationVariables>;
export const ProvideDocument = gql`
    mutation Provide($template: ID!) {
  provide(template: $template) {
    id
    status
  }
}
    `;
export type ProvideMutationFn = Apollo.MutationFunction<ProvideMutation, ProvideMutationVariables>;

/**
 * __useProvideMutation__
 *
 * To run a mutation, you first call `useProvideMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useProvideMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [provideMutation, { data, loading, error }] = useProvideMutation({
 *   variables: {
 *      template: // value for 'template'
 *   },
 * });
 */
export function useProvideMutation(baseOptions?: Apollo.MutationHookOptions<ProvideMutation, ProvideMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ProvideMutation, ProvideMutationVariables>(ProvideDocument, options);
      }
export type ProvideMutationHookResult = ReturnType<typeof useProvideMutation>;
export type ProvideMutationResult = Apollo.MutationResult<ProvideMutation>;
export type ProvideMutationOptions = Apollo.BaseMutationOptions<ProvideMutation, ProvideMutationVariables>;
export const ReserveDocument = gql`
    mutation Reserve($node: ID, $hash: String, $params: ReserveParamsInput, $binds: ReserveBindsInput, $title: String, $imitate: ID, $allowAutoRequest: Boolean) {
  reserve(
    node: $node
    hash: $hash
    params: $params
    binds: $binds
    title: $title
    allowAutoRequest: $allowAutoRequest
    imitate: $imitate
  ) {
    id
    reference
  }
}
    `;
export type ReserveMutationFn = Apollo.MutationFunction<ReserveMutation, ReserveMutationVariables>;

/**
 * __useReserveMutation__
 *
 * To run a mutation, you first call `useReserveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReserveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reserveMutation, { data, loading, error }] = useReserveMutation({
 *   variables: {
 *      node: // value for 'node'
 *      hash: // value for 'hash'
 *      params: // value for 'params'
 *      binds: // value for 'binds'
 *      title: // value for 'title'
 *      imitate: // value for 'imitate'
 *      allowAutoRequest: // value for 'allowAutoRequest'
 *   },
 * });
 */
export function useReserveMutation(baseOptions?: Apollo.MutationHookOptions<ReserveMutation, ReserveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReserveMutation, ReserveMutationVariables>(ReserveDocument, options);
      }
export type ReserveMutationHookResult = ReturnType<typeof useReserveMutation>;
export type ReserveMutationResult = Apollo.MutationResult<ReserveMutation>;
export type ReserveMutationOptions = Apollo.BaseMutationOptions<ReserveMutation, ReserveMutationVariables>;
export const UnassignDocument = gql`
    mutation Unassign($assignation: ID!) {
  unassign(assignation: $assignation) {
    reference
  }
}
    `;
export type UnassignMutationFn = Apollo.MutationFunction<UnassignMutation, UnassignMutationVariables>;

/**
 * __useUnassignMutation__
 *
 * To run a mutation, you first call `useUnassignMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnassignMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unassignMutation, { data, loading, error }] = useUnassignMutation({
 *   variables: {
 *      assignation: // value for 'assignation'
 *   },
 * });
 */
export function useUnassignMutation(baseOptions?: Apollo.MutationHookOptions<UnassignMutation, UnassignMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnassignMutation, UnassignMutationVariables>(UnassignDocument, options);
      }
export type UnassignMutationHookResult = ReturnType<typeof useUnassignMutation>;
export type UnassignMutationResult = Apollo.MutationResult<UnassignMutation>;
export type UnassignMutationOptions = Apollo.BaseMutationOptions<UnassignMutation, UnassignMutationVariables>;
export const UnprovideDocument = gql`
    mutation Unprovide($id: ID!) {
  unprovide(id: $id) {
    id
  }
}
    `;
export type UnprovideMutationFn = Apollo.MutationFunction<UnprovideMutation, UnprovideMutationVariables>;

/**
 * __useUnprovideMutation__
 *
 * To run a mutation, you first call `useUnprovideMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnprovideMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unprovideMutation, { data, loading, error }] = useUnprovideMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUnprovideMutation(baseOptions?: Apollo.MutationHookOptions<UnprovideMutation, UnprovideMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnprovideMutation, UnprovideMutationVariables>(UnprovideDocument, options);
      }
export type UnprovideMutationHookResult = ReturnType<typeof useUnprovideMutation>;
export type UnprovideMutationResult = Apollo.MutationResult<UnprovideMutation>;
export type UnprovideMutationOptions = Apollo.BaseMutationOptions<UnprovideMutation, UnprovideMutationVariables>;
export const UnreserveDocument = gql`
    mutation Unreserve($reservation: ID!) {
  unreserve(id: $reservation) {
    id
  }
}
    `;
export type UnreserveMutationFn = Apollo.MutationFunction<UnreserveMutation, UnreserveMutationVariables>;

/**
 * __useUnreserveMutation__
 *
 * To run a mutation, you first call `useUnreserveMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnreserveMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unreserveMutation, { data, loading, error }] = useUnreserveMutation({
 *   variables: {
 *      reservation: // value for 'reservation'
 *   },
 * });
 */
export function useUnreserveMutation(baseOptions?: Apollo.MutationHookOptions<UnreserveMutation, UnreserveMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnreserveMutation, UnreserveMutationVariables>(UnreserveDocument, options);
      }
export type UnreserveMutationHookResult = ReturnType<typeof useUnreserveMutation>;
export type UnreserveMutationResult = Apollo.MutationResult<UnreserveMutation>;
export type UnreserveMutationOptions = Apollo.BaseMutationOptions<UnreserveMutation, UnreserveMutationVariables>;
export const UpdateMirrorDocument = gql`
    mutation UpdateMirror($id: ID!) {
  updateMirror(id: $id) {
    id
  }
}
    `;
export type UpdateMirrorMutationFn = Apollo.MutationFunction<UpdateMirrorMutation, UpdateMirrorMutationVariables>;

/**
 * __useUpdateMirrorMutation__
 *
 * To run a mutation, you first call `useUpdateMirrorMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMirrorMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMirrorMutation, { data, loading, error }] = useUpdateMirrorMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUpdateMirrorMutation(baseOptions?: Apollo.MutationHookOptions<UpdateMirrorMutation, UpdateMirrorMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateMirrorMutation, UpdateMirrorMutationVariables>(UpdateMirrorDocument, options);
      }
export type UpdateMirrorMutationHookResult = ReturnType<typeof useUpdateMirrorMutation>;
export type UpdateMirrorMutationResult = Apollo.MutationResult<UpdateMirrorMutation>;
export type UpdateMirrorMutationOptions = Apollo.BaseMutationOptions<UpdateMirrorMutation, UpdateMirrorMutationVariables>;
export const DeleteRepoDocument = gql`
    mutation DeleteRepo($id: ID!) {
  deleterepo(id: $id) {
    id
  }
}
    `;
export type DeleteRepoMutationFn = Apollo.MutationFunction<DeleteRepoMutation, DeleteRepoMutationVariables>;

/**
 * __useDeleteRepoMutation__
 *
 * To run a mutation, you first call `useDeleteRepoMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteRepoMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteRepoMutation, { data, loading, error }] = useDeleteRepoMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteRepoMutation(baseOptions?: Apollo.MutationHookOptions<DeleteRepoMutation, DeleteRepoMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteRepoMutation, DeleteRepoMutationVariables>(DeleteRepoDocument, options);
      }
export type DeleteRepoMutationHookResult = ReturnType<typeof useDeleteRepoMutation>;
export type DeleteRepoMutationResult = Apollo.MutationResult<DeleteRepoMutation>;
export type DeleteRepoMutationOptions = Apollo.BaseMutationOptions<DeleteRepoMutation, DeleteRepoMutationVariables>;
export const CreateMirrorDocument = gql`
    mutation CreateMirror($url: String!, $name: String!) {
  createMirror(url: $url, name: $name) {
    created
    repo {
      ...ListRepository
    }
  }
}
    ${ListRepositoryFragmentDoc}`;
export type CreateMirrorMutationFn = Apollo.MutationFunction<CreateMirrorMutation, CreateMirrorMutationVariables>;

/**
 * __useCreateMirrorMutation__
 *
 * To run a mutation, you first call `useCreateMirrorMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMirrorMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMirrorMutation, { data, loading, error }] = useCreateMirrorMutation({
 *   variables: {
 *      url: // value for 'url'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useCreateMirrorMutation(baseOptions?: Apollo.MutationHookOptions<CreateMirrorMutation, CreateMirrorMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateMirrorMutation, CreateMirrorMutationVariables>(CreateMirrorDocument, options);
      }
export type CreateMirrorMutationHookResult = ReturnType<typeof useCreateMirrorMutation>;
export type CreateMirrorMutationResult = Apollo.MutationResult<CreateMirrorMutation>;
export type CreateMirrorMutationOptions = Apollo.BaseMutationOptions<CreateMirrorMutation, CreateMirrorMutationVariables>;
export const AgentsDocument = gql`
    query Agents($app: String, $status: [AgentStatusInput]) {
  agents(app: $app, status: $status) {
    ...ListAgent
  }
}
    ${ListAgentFragmentDoc}`;

/**
 * __useAgentsQuery__
 *
 * To run a query within a React component, call `useAgentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAgentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAgentsQuery({
 *   variables: {
 *      app: // value for 'app'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useAgentsQuery(baseOptions?: Apollo.QueryHookOptions<AgentsQuery, AgentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AgentsQuery, AgentsQueryVariables>(AgentsDocument, options);
      }
export function useAgentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AgentsQuery, AgentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AgentsQuery, AgentsQueryVariables>(AgentsDocument, options);
        }
export type AgentsQueryHookResult = ReturnType<typeof useAgentsQuery>;
export type AgentsLazyQueryHookResult = ReturnType<typeof useAgentsLazyQuery>;
export type AgentsQueryResult = Apollo.QueryResult<AgentsQuery, AgentsQueryVariables>;
export const MyAgentsDocument = gql`
    query MyAgents($app: String, $status: [AgentStatusInput]) {
  myagents(app: $app, status: $status) {
    ...ListAgent
  }
}
    ${ListAgentFragmentDoc}`;

/**
 * __useMyAgentsQuery__
 *
 * To run a query within a React component, call `useMyAgentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyAgentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyAgentsQuery({
 *   variables: {
 *      app: // value for 'app'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useMyAgentsQuery(baseOptions?: Apollo.QueryHookOptions<MyAgentsQuery, MyAgentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyAgentsQuery, MyAgentsQueryVariables>(MyAgentsDocument, options);
      }
export function useMyAgentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyAgentsQuery, MyAgentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyAgentsQuery, MyAgentsQueryVariables>(MyAgentsDocument, options);
        }
export type MyAgentsQueryHookResult = ReturnType<typeof useMyAgentsQuery>;
export type MyAgentsLazyQueryHookResult = ReturnType<typeof useMyAgentsLazyQuery>;
export type MyAgentsQueryResult = Apollo.QueryResult<MyAgentsQuery, MyAgentsQueryVariables>;
export const DetailAgentDocument = gql`
    query DetailAgent($id: ID!) {
  agent(id: $id) {
    ...DetailAgent
  }
}
    ${DetailAgentFragmentDoc}`;

/**
 * __useDetailAgentQuery__
 *
 * To run a query within a React component, call `useDetailAgentQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailAgentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailAgentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailAgentQuery(baseOptions: Apollo.QueryHookOptions<DetailAgentQuery, DetailAgentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailAgentQuery, DetailAgentQueryVariables>(DetailAgentDocument, options);
      }
export function useDetailAgentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailAgentQuery, DetailAgentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailAgentQuery, DetailAgentQueryVariables>(DetailAgentDocument, options);
        }
export type DetailAgentQueryHookResult = ReturnType<typeof useDetailAgentQuery>;
export type DetailAgentLazyQueryHookResult = ReturnType<typeof useDetailAgentLazyQuery>;
export type DetailAgentQueryResult = Apollo.QueryResult<DetailAgentQuery, DetailAgentQueryVariables>;
export const PortAgentDocument = gql`
    query PortAgent($clientId: ID!, $instanceId: ID!) {
  agent(client: $clientId, instance: $instanceId) {
    ...DetailAgent
  }
}
    ${DetailAgentFragmentDoc}`;

/**
 * __usePortAgentQuery__
 *
 * To run a query within a React component, call `usePortAgentQuery` and pass it any options that fit your needs.
 * When your component renders, `usePortAgentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePortAgentQuery({
 *   variables: {
 *      clientId: // value for 'clientId'
 *      instanceId: // value for 'instanceId'
 *   },
 * });
 */
export function usePortAgentQuery(baseOptions: Apollo.QueryHookOptions<PortAgentQuery, PortAgentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PortAgentQuery, PortAgentQueryVariables>(PortAgentDocument, options);
      }
export function usePortAgentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PortAgentQuery, PortAgentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PortAgentQuery, PortAgentQueryVariables>(PortAgentDocument, options);
        }
export type PortAgentQueryHookResult = ReturnType<typeof usePortAgentQuery>;
export type PortAgentLazyQueryHookResult = ReturnType<typeof usePortAgentLazyQuery>;
export type PortAgentQueryResult = Apollo.QueryResult<PortAgentQuery, PortAgentQueryVariables>;
export const AgentOptionsDocument = gql`
    query AgentOptions($registry: ID, $search: String) {
  options: agents(registry: $registry, search: $search) {
    value: id
    label: instanceId
  }
}
    `;

/**
 * __useAgentOptionsQuery__
 *
 * To run a query within a React component, call `useAgentOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAgentOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAgentOptionsQuery({
 *   variables: {
 *      registry: // value for 'registry'
 *      search: // value for 'search'
 *   },
 * });
 */
export function useAgentOptionsQuery(baseOptions?: Apollo.QueryHookOptions<AgentOptionsQuery, AgentOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AgentOptionsQuery, AgentOptionsQueryVariables>(AgentOptionsDocument, options);
      }
export function useAgentOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AgentOptionsQuery, AgentOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AgentOptionsQuery, AgentOptionsQueryVariables>(AgentOptionsDocument, options);
        }
export type AgentOptionsQueryHookResult = ReturnType<typeof useAgentOptionsQuery>;
export type AgentOptionsLazyQueryHookResult = ReturnType<typeof useAgentOptionsLazyQuery>;
export type AgentOptionsQueryResult = Apollo.QueryResult<AgentOptionsQuery, AgentOptionsQueryVariables>;
export const DetailAssignationDocument = gql`
    query DetailAssignation($id: ID!) {
  assignation(id: $id) {
    ...DetailAssignation
  }
}
    ${DetailAssignationFragmentDoc}`;

/**
 * __useDetailAssignationQuery__
 *
 * To run a query within a React component, call `useDetailAssignationQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailAssignationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailAssignationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailAssignationQuery(baseOptions: Apollo.QueryHookOptions<DetailAssignationQuery, DetailAssignationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailAssignationQuery, DetailAssignationQueryVariables>(DetailAssignationDocument, options);
      }
export function useDetailAssignationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailAssignationQuery, DetailAssignationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailAssignationQuery, DetailAssignationQueryVariables>(DetailAssignationDocument, options);
        }
export type DetailAssignationQueryHookResult = ReturnType<typeof useDetailAssignationQuery>;
export type DetailAssignationLazyQueryHookResult = ReturnType<typeof useDetailAssignationLazyQuery>;
export type DetailAssignationQueryResult = Apollo.QueryResult<DetailAssignationQuery, DetailAssignationQueryVariables>;
export const ReferencedAssignationsDocument = gql`
    query ReferencedAssignations($reference: String!, $parent: ID) {
  assignations(reference: $reference, parent: $parent) {
    ...DetailAssignation
  }
}
    ${DetailAssignationFragmentDoc}`;

/**
 * __useReferencedAssignationsQuery__
 *
 * To run a query within a React component, call `useReferencedAssignationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useReferencedAssignationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReferencedAssignationsQuery({
 *   variables: {
 *      reference: // value for 'reference'
 *      parent: // value for 'parent'
 *   },
 * });
 */
export function useReferencedAssignationsQuery(baseOptions: Apollo.QueryHookOptions<ReferencedAssignationsQuery, ReferencedAssignationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReferencedAssignationsQuery, ReferencedAssignationsQueryVariables>(ReferencedAssignationsDocument, options);
      }
export function useReferencedAssignationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReferencedAssignationsQuery, ReferencedAssignationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReferencedAssignationsQuery, ReferencedAssignationsQueryVariables>(ReferencedAssignationsDocument, options);
        }
export type ReferencedAssignationsQueryHookResult = ReturnType<typeof useReferencedAssignationsQuery>;
export type ReferencedAssignationsLazyQueryHookResult = ReturnType<typeof useReferencedAssignationsLazyQuery>;
export type ReferencedAssignationsQueryResult = Apollo.QueryResult<ReferencedAssignationsQuery, ReferencedAssignationsQueryVariables>;
export const NodeAssignationsDocument = gql`
    query NodeAssignations($reference: String!, $parent: ID!, $filter: [AssignationStatusInput], $order: String, $limit: Int, $offset: Int) {
  assignations(
    reservationReference: $reference
    parent: $parent
    status: $filter
    o: $order
    limit: $limit
    offset: $offset
  ) {
    ...ListAssignation
  }
}
    ${ListAssignationFragmentDoc}`;

/**
 * __useNodeAssignationsQuery__
 *
 * To run a query within a React component, call `useNodeAssignationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useNodeAssignationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNodeAssignationsQuery({
 *   variables: {
 *      reference: // value for 'reference'
 *      parent: // value for 'parent'
 *      filter: // value for 'filter'
 *      order: // value for 'order'
 *      limit: // value for 'limit'
 *      offset: // value for 'offset'
 *   },
 * });
 */
export function useNodeAssignationsQuery(baseOptions: Apollo.QueryHookOptions<NodeAssignationsQuery, NodeAssignationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NodeAssignationsQuery, NodeAssignationsQueryVariables>(NodeAssignationsDocument, options);
      }
export function useNodeAssignationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NodeAssignationsQuery, NodeAssignationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NodeAssignationsQuery, NodeAssignationsQueryVariables>(NodeAssignationsDocument, options);
        }
export type NodeAssignationsQueryHookResult = ReturnType<typeof useNodeAssignationsQuery>;
export type NodeAssignationsLazyQueryHookResult = ReturnType<typeof useNodeAssignationsLazyQuery>;
export type NodeAssignationsQueryResult = Apollo.QueryResult<NodeAssignationsQuery, NodeAssignationsQueryVariables>;
export const RequestsDocument = gql`
    query Requests {
  requests(exclude: [DONE, CRITICAL]) {
    ...ListAssignation
  }
}
    ${ListAssignationFragmentDoc}`;

/**
 * __useRequestsQuery__
 *
 * To run a query within a React component, call `useRequestsQuery` and pass it any options that fit your needs.
 * When your component renders, `useRequestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRequestsQuery({
 *   variables: {
 *   },
 * });
 */
export function useRequestsQuery(baseOptions?: Apollo.QueryHookOptions<RequestsQuery, RequestsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RequestsQuery, RequestsQueryVariables>(RequestsDocument, options);
      }
export function useRequestsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RequestsQuery, RequestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RequestsQuery, RequestsQueryVariables>(RequestsDocument, options);
        }
export type RequestsQueryHookResult = ReturnType<typeof useRequestsQuery>;
export type RequestsLazyQueryHookResult = ReturnType<typeof useRequestsLazyQuery>;
export type RequestsQueryResult = Apollo.QueryResult<RequestsQuery, RequestsQueryVariables>;
export const MyRequestsDocument = gql`
    query MyRequests {
  myrequests(exclude: [DONE, CRITICAL]) {
    ...ListAssignation
  }
}
    ${ListAssignationFragmentDoc}`;

/**
 * __useMyRequestsQuery__
 *
 * To run a query within a React component, call `useMyRequestsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyRequestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyRequestsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyRequestsQuery(baseOptions?: Apollo.QueryHookOptions<MyRequestsQuery, MyRequestsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyRequestsQuery, MyRequestsQueryVariables>(MyRequestsDocument, options);
      }
export function useMyRequestsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyRequestsQuery, MyRequestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyRequestsQuery, MyRequestsQueryVariables>(MyRequestsDocument, options);
        }
export type MyRequestsQueryHookResult = ReturnType<typeof useMyRequestsQuery>;
export type MyRequestsLazyQueryHookResult = ReturnType<typeof useMyRequestsLazyQuery>;
export type MyRequestsQueryResult = Apollo.QueryResult<MyRequestsQuery, MyRequestsQueryVariables>;
export const RequestsHistoryDocument = gql`
    query RequestsHistory($limit: Int = 20, $filter: [AssignationStatusInput]) {
  myrequests(limit: $limit, filter: $filter) {
    ...ListAssignation
  }
}
    ${ListAssignationFragmentDoc}`;

/**
 * __useRequestsHistoryQuery__
 *
 * To run a query within a React component, call `useRequestsHistoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useRequestsHistoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRequestsHistoryQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useRequestsHistoryQuery(baseOptions?: Apollo.QueryHookOptions<RequestsHistoryQuery, RequestsHistoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RequestsHistoryQuery, RequestsHistoryQueryVariables>(RequestsHistoryDocument, options);
      }
export function useRequestsHistoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RequestsHistoryQuery, RequestsHistoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RequestsHistoryQuery, RequestsHistoryQueryVariables>(RequestsHistoryDocument, options);
        }
export type RequestsHistoryQueryHookResult = ReturnType<typeof useRequestsHistoryQuery>;
export type RequestsHistoryLazyQueryHookResult = ReturnType<typeof useRequestsHistoryLazyQuery>;
export type RequestsHistoryQueryResult = Apollo.QueryResult<RequestsHistoryQuery, RequestsHistoryQueryVariables>;
export const FilteredAssignationsDocument = gql`
    query FilteredAssignations($exclude: [AssignationStatusInput], $filter: [AssignationStatusInput], $limit: Int) {
  myrequests(exclude: $exclude, filter: $filter, limit: $limit) {
    ...ListAssignation
  }
}
    ${ListAssignationFragmentDoc}`;

/**
 * __useFilteredAssignationsQuery__
 *
 * To run a query within a React component, call `useFilteredAssignationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useFilteredAssignationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFilteredAssignationsQuery({
 *   variables: {
 *      exclude: // value for 'exclude'
 *      filter: // value for 'filter'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useFilteredAssignationsQuery(baseOptions?: Apollo.QueryHookOptions<FilteredAssignationsQuery, FilteredAssignationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FilteredAssignationsQuery, FilteredAssignationsQueryVariables>(FilteredAssignationsDocument, options);
      }
export function useFilteredAssignationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FilteredAssignationsQuery, FilteredAssignationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FilteredAssignationsQuery, FilteredAssignationsQueryVariables>(FilteredAssignationsDocument, options);
        }
export type FilteredAssignationsQueryHookResult = ReturnType<typeof useFilteredAssignationsQuery>;
export type FilteredAssignationsLazyQueryHookResult = ReturnType<typeof useFilteredAssignationsLazyQuery>;
export type FilteredAssignationsQueryResult = Apollo.QueryResult<FilteredAssignationsQuery, FilteredAssignationsQueryVariables>;
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
export const ArgPortTypesDocument = gql`
    query ArgPortTypes {
  args: __type(name: "ArgPort") {
    possibleTypes {
      value: name
      label: description
    }
  }
}
    `;

/**
 * __useArgPortTypesQuery__
 *
 * To run a query within a React component, call `useArgPortTypesQuery` and pass it any options that fit your needs.
 * When your component renders, `useArgPortTypesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useArgPortTypesQuery({
 *   variables: {
 *   },
 * });
 */
export function useArgPortTypesQuery(baseOptions?: Apollo.QueryHookOptions<ArgPortTypesQuery, ArgPortTypesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ArgPortTypesQuery, ArgPortTypesQueryVariables>(ArgPortTypesDocument, options);
      }
export function useArgPortTypesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ArgPortTypesQuery, ArgPortTypesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ArgPortTypesQuery, ArgPortTypesQueryVariables>(ArgPortTypesDocument, options);
        }
export type ArgPortTypesQueryHookResult = ReturnType<typeof useArgPortTypesQuery>;
export type ArgPortTypesLazyQueryHookResult = ReturnType<typeof useArgPortTypesLazyQuery>;
export type ArgPortTypesQueryResult = Apollo.QueryResult<ArgPortTypesQuery, ArgPortTypesQueryVariables>;
export const KwargPortTypesDocument = gql`
    query KwargPortTypes {
  kwargs: __type(name: "KwargPort") {
    possibleTypes {
      value: name
      label: description
    }
  }
}
    `;

/**
 * __useKwargPortTypesQuery__
 *
 * To run a query within a React component, call `useKwargPortTypesQuery` and pass it any options that fit your needs.
 * When your component renders, `useKwargPortTypesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useKwargPortTypesQuery({
 *   variables: {
 *   },
 * });
 */
export function useKwargPortTypesQuery(baseOptions?: Apollo.QueryHookOptions<KwargPortTypesQuery, KwargPortTypesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<KwargPortTypesQuery, KwargPortTypesQueryVariables>(KwargPortTypesDocument, options);
      }
export function useKwargPortTypesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<KwargPortTypesQuery, KwargPortTypesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<KwargPortTypesQuery, KwargPortTypesQueryVariables>(KwargPortTypesDocument, options);
        }
export type KwargPortTypesQueryHookResult = ReturnType<typeof useKwargPortTypesQuery>;
export type KwargPortTypesLazyQueryHookResult = ReturnType<typeof useKwargPortTypesLazyQuery>;
export type KwargPortTypesQueryResult = Apollo.QueryResult<KwargPortTypesQuery, KwargPortTypesQueryVariables>;
export const ReturnPortTypesDocument = gql`
    query ReturnPortTypes {
  returns: __type(name: "ReturnPort") {
    possibleTypes {
      value: name
      label: description
    }
  }
}
    `;

/**
 * __useReturnPortTypesQuery__
 *
 * To run a query within a React component, call `useReturnPortTypesQuery` and pass it any options that fit your needs.
 * When your component renders, `useReturnPortTypesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReturnPortTypesQuery({
 *   variables: {
 *   },
 * });
 */
export function useReturnPortTypesQuery(baseOptions?: Apollo.QueryHookOptions<ReturnPortTypesQuery, ReturnPortTypesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReturnPortTypesQuery, ReturnPortTypesQueryVariables>(ReturnPortTypesDocument, options);
      }
export function useReturnPortTypesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReturnPortTypesQuery, ReturnPortTypesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReturnPortTypesQuery, ReturnPortTypesQueryVariables>(ReturnPortTypesDocument, options);
        }
export type ReturnPortTypesQueryHookResult = ReturnType<typeof useReturnPortTypesQuery>;
export type ReturnPortTypesLazyQueryHookResult = ReturnType<typeof useReturnPortTypesLazyQuery>;
export type ReturnPortTypesQueryResult = Apollo.QueryResult<ReturnPortTypesQuery, ReturnPortTypesQueryVariables>;
export const StructureOptionsDocument = gql`
    query StructureOptions {
  options: structures {
    value: identifier
    label: identifier
  }
}
    `;

/**
 * __useStructureOptionsQuery__
 *
 * To run a query within a React component, call `useStructureOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useStructureOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStructureOptionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useStructureOptionsQuery(baseOptions?: Apollo.QueryHookOptions<StructureOptionsQuery, StructureOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StructureOptionsQuery, StructureOptionsQueryVariables>(StructureOptionsDocument, options);
      }
export function useStructureOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StructureOptionsQuery, StructureOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StructureOptionsQuery, StructureOptionsQueryVariables>(StructureOptionsDocument, options);
        }
export type StructureOptionsQueryHookResult = ReturnType<typeof useStructureOptionsQuery>;
export type StructureOptionsLazyQueryHookResult = ReturnType<typeof useStructureOptionsLazyQuery>;
export type StructureOptionsQueryResult = Apollo.QueryResult<StructureOptionsQuery, StructureOptionsQueryVariables>;
export const DetailNodeDocument = gql`
    query DetailNode($id: ID, $hash: String) {
  node(id: $id, hash: $hash) {
    ...DetailNode
  }
}
    ${DetailNodeFragmentDoc}`;

/**
 * __useDetailNodeQuery__
 *
 * To run a query within a React component, call `useDetailNodeQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailNodeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailNodeQuery({
 *   variables: {
 *      id: // value for 'id'
 *      hash: // value for 'hash'
 *   },
 * });
 */
export function useDetailNodeQuery(baseOptions?: Apollo.QueryHookOptions<DetailNodeQuery, DetailNodeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailNodeQuery, DetailNodeQueryVariables>(DetailNodeDocument, options);
      }
export function useDetailNodeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailNodeQuery, DetailNodeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailNodeQuery, DetailNodeQueryVariables>(DetailNodeDocument, options);
        }
export type DetailNodeQueryHookResult = ReturnType<typeof useDetailNodeQuery>;
export type DetailNodeLazyQueryHookResult = ReturnType<typeof useDetailNodeLazyQuery>;
export type DetailNodeQueryResult = Apollo.QueryResult<DetailNodeQuery, DetailNodeQueryVariables>;
export const MiniNodeByIdDocument = gql`
    query MiniNodeByID($id: ID!) {
  node(id: $id) {
    ...MiniNode
  }
}
    ${MiniNodeFragmentDoc}`;

/**
 * __useMiniNodeByIdQuery__
 *
 * To run a query within a React component, call `useMiniNodeByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useMiniNodeByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMiniNodeByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useMiniNodeByIdQuery(baseOptions: Apollo.QueryHookOptions<MiniNodeByIdQuery, MiniNodeByIdQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MiniNodeByIdQuery, MiniNodeByIdQueryVariables>(MiniNodeByIdDocument, options);
      }
export function useMiniNodeByIdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MiniNodeByIdQuery, MiniNodeByIdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MiniNodeByIdQuery, MiniNodeByIdQueryVariables>(MiniNodeByIdDocument, options);
        }
export type MiniNodeByIdQueryHookResult = ReturnType<typeof useMiniNodeByIdQuery>;
export type MiniNodeByIdLazyQueryHookResult = ReturnType<typeof useMiniNodeByIdLazyQuery>;
export type MiniNodeByIdQueryResult = Apollo.QueryResult<MiniNodeByIdQuery, MiniNodeByIdQueryVariables>;
export const NodesDocument = gql`
    query Nodes($search: String, $interfaces: [String], $restrict: [String], $templated: Boolean, $scopes: [NodeScope]) {
  allnodes(
    search: $search
    interfaces: $interfaces
    restrict: $restrict
    templated: $templated
    scopes: $scopes
  ) {
    ...NodeListItem
  }
}
    ${NodeListItemFragmentDoc}`;

/**
 * __useNodesQuery__
 *
 * To run a query within a React component, call `useNodesQuery` and pass it any options that fit your needs.
 * When your component renders, `useNodesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNodesQuery({
 *   variables: {
 *      search: // value for 'search'
 *      interfaces: // value for 'interfaces'
 *      restrict: // value for 'restrict'
 *      templated: // value for 'templated'
 *      scopes: // value for 'scopes'
 *   },
 * });
 */
export function useNodesQuery(baseOptions?: Apollo.QueryHookOptions<NodesQuery, NodesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NodesQuery, NodesQueryVariables>(NodesDocument, options);
      }
export function useNodesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NodesQuery, NodesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NodesQuery, NodesQueryVariables>(NodesDocument, options);
        }
export type NodesQueryHookResult = ReturnType<typeof useNodesQuery>;
export type NodesLazyQueryHookResult = ReturnType<typeof useNodesLazyQuery>;
export type NodesQueryResult = Apollo.QueryResult<NodesQuery, NodesQueryVariables>;
export const RespositoryNodesDocument = gql`
    query RespositoryNodes($repository: ID) {
  allnodes(repository: $repository) {
    ...NodeListItem
  }
}
    ${NodeListItemFragmentDoc}`;

/**
 * __useRespositoryNodesQuery__
 *
 * To run a query within a React component, call `useRespositoryNodesQuery` and pass it any options that fit your needs.
 * When your component renders, `useRespositoryNodesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRespositoryNodesQuery({
 *   variables: {
 *      repository: // value for 'repository'
 *   },
 * });
 */
export function useRespositoryNodesQuery(baseOptions?: Apollo.QueryHookOptions<RespositoryNodesQuery, RespositoryNodesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RespositoryNodesQuery, RespositoryNodesQueryVariables>(RespositoryNodesDocument, options);
      }
export function useRespositoryNodesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RespositoryNodesQuery, RespositoryNodesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RespositoryNodesQuery, RespositoryNodesQueryVariables>(RespositoryNodesDocument, options);
        }
export type RespositoryNodesQueryHookResult = ReturnType<typeof useRespositoryNodesQuery>;
export type RespositoryNodesLazyQueryHookResult = ReturnType<typeof useRespositoryNodesLazyQuery>;
export type RespositoryNodesQueryResult = Apollo.QueryResult<RespositoryNodesQuery, RespositoryNodesQueryVariables>;
export const AssignNodeDocument = gql`
    query AssignNode($id: ID) {
  node(id: $id) {
    ...CompleteNode
  }
}
    ${CompleteNodeFragmentDoc}`;

/**
 * __useAssignNodeQuery__
 *
 * To run a query within a React component, call `useAssignNodeQuery` and pass it any options that fit your needs.
 * When your component renders, `useAssignNodeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAssignNodeQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useAssignNodeQuery(baseOptions?: Apollo.QueryHookOptions<AssignNodeQuery, AssignNodeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AssignNodeQuery, AssignNodeQueryVariables>(AssignNodeDocument, options);
      }
export function useAssignNodeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AssignNodeQuery, AssignNodeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AssignNodeQuery, AssignNodeQueryVariables>(AssignNodeDocument, options);
        }
export type AssignNodeQueryHookResult = ReturnType<typeof useAssignNodeQuery>;
export type AssignNodeLazyQueryHookResult = ReturnType<typeof useAssignNodeLazyQuery>;
export type AssignNodeQueryResult = Apollo.QueryResult<AssignNodeQuery, AssignNodeQueryVariables>;
export const PermissionOptionsDocument = gql`
    query PermissionOptions($model: SharableModels!, $search: String) {
  options: permissionsFor(model: $model, name: $search) {
    label: name
    value: unique
  }
}
    `;

/**
 * __usePermissionOptionsQuery__
 *
 * To run a query within a React component, call `usePermissionOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePermissionOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePermissionOptionsQuery({
 *   variables: {
 *      model: // value for 'model'
 *      search: // value for 'search'
 *   },
 * });
 */
export function usePermissionOptionsQuery(baseOptions: Apollo.QueryHookOptions<PermissionOptionsQuery, PermissionOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PermissionOptionsQuery, PermissionOptionsQueryVariables>(PermissionOptionsDocument, options);
      }
export function usePermissionOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PermissionOptionsQuery, PermissionOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PermissionOptionsQuery, PermissionOptionsQueryVariables>(PermissionOptionsDocument, options);
        }
export type PermissionOptionsQueryHookResult = ReturnType<typeof usePermissionOptionsQuery>;
export type PermissionOptionsLazyQueryHookResult = ReturnType<typeof usePermissionOptionsLazyQuery>;
export type PermissionOptionsQueryResult = Apollo.QueryResult<PermissionOptionsQuery, PermissionOptionsQueryVariables>;
export const PermissionsOfDocument = gql`
    query PermissionsOf($model: SharableModels!, $id: ID!) {
  permissionsOf(model: $model, id: $id) {
    available {
      name
    }
    options: available {
      label: name
      value: codename
    }
    groupAssignments {
      ...GroupAssignment
    }
    userAssignments {
      ...UserAssignment
    }
  }
}
    ${GroupAssignmentFragmentDoc}
${UserAssignmentFragmentDoc}`;

/**
 * __usePermissionsOfQuery__
 *
 * To run a query within a React component, call `usePermissionsOfQuery` and pass it any options that fit your needs.
 * When your component renders, `usePermissionsOfQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePermissionsOfQuery({
 *   variables: {
 *      model: // value for 'model'
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePermissionsOfQuery(baseOptions: Apollo.QueryHookOptions<PermissionsOfQuery, PermissionsOfQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PermissionsOfQuery, PermissionsOfQueryVariables>(PermissionsOfDocument, options);
      }
export function usePermissionsOfLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PermissionsOfQuery, PermissionsOfQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PermissionsOfQuery, PermissionsOfQueryVariables>(PermissionsOfDocument, options);
        }
export type PermissionsOfQueryHookResult = ReturnType<typeof usePermissionsOfQuery>;
export type PermissionsOfLazyQueryHookResult = ReturnType<typeof usePermissionsOfLazyQuery>;
export type PermissionsOfQueryResult = Apollo.QueryResult<PermissionsOfQuery, PermissionsOfQueryVariables>;
export const UnfoldProvenanceDocument = gql`
    query UnfoldProvenance($id: ID!) {
  assignation(id: $id) {
    id
    createdAt
    children {
      id
      createdAt
    }
  }
}
    `;

/**
 * __useUnfoldProvenanceQuery__
 *
 * To run a query within a React component, call `useUnfoldProvenanceQuery` and pass it any options that fit your needs.
 * When your component renders, `useUnfoldProvenanceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUnfoldProvenanceQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUnfoldProvenanceQuery(baseOptions: Apollo.QueryHookOptions<UnfoldProvenanceQuery, UnfoldProvenanceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UnfoldProvenanceQuery, UnfoldProvenanceQueryVariables>(UnfoldProvenanceDocument, options);
      }
export function useUnfoldProvenanceLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UnfoldProvenanceQuery, UnfoldProvenanceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UnfoldProvenanceQuery, UnfoldProvenanceQueryVariables>(UnfoldProvenanceDocument, options);
        }
export type UnfoldProvenanceQueryHookResult = ReturnType<typeof useUnfoldProvenanceQuery>;
export type UnfoldProvenanceLazyQueryHookResult = ReturnType<typeof useUnfoldProvenanceLazyQuery>;
export type UnfoldProvenanceQueryResult = Apollo.QueryResult<UnfoldProvenanceQuery, UnfoldProvenanceQueryVariables>;
export const DetailProvisionDocument = gql`
    query DetailProvision($id: ID!) {
  provision(id: $id) {
    ...DetailProvision
  }
}
    ${DetailProvisionFragmentDoc}`;

/**
 * __useDetailProvisionQuery__
 *
 * To run a query within a React component, call `useDetailProvisionQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailProvisionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailProvisionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailProvisionQuery(baseOptions: Apollo.QueryHookOptions<DetailProvisionQuery, DetailProvisionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailProvisionQuery, DetailProvisionQueryVariables>(DetailProvisionDocument, options);
      }
export function useDetailProvisionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailProvisionQuery, DetailProvisionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailProvisionQuery, DetailProvisionQueryVariables>(DetailProvisionDocument, options);
        }
export type DetailProvisionQueryHookResult = ReturnType<typeof useDetailProvisionQuery>;
export type DetailProvisionLazyQueryHookResult = ReturnType<typeof useDetailProvisionLazyQuery>;
export type DetailProvisionQueryResult = Apollo.QueryResult<DetailProvisionQuery, DetailProvisionQueryVariables>;
export const MyProvisionsDocument = gql`
    query MyProvisions {
  myprovisions(exclude: [ENDED, CRITICAL, CANCELLED]) {
    ...ListProvision
  }
}
    ${ListProvisionFragmentDoc}`;

/**
 * __useMyProvisionsQuery__
 *
 * To run a query within a React component, call `useMyProvisionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyProvisionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyProvisionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyProvisionsQuery(baseOptions?: Apollo.QueryHookOptions<MyProvisionsQuery, MyProvisionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyProvisionsQuery, MyProvisionsQueryVariables>(MyProvisionsDocument, options);
      }
export function useMyProvisionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyProvisionsQuery, MyProvisionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyProvisionsQuery, MyProvisionsQueryVariables>(MyProvisionsDocument, options);
        }
export type MyProvisionsQueryHookResult = ReturnType<typeof useMyProvisionsQuery>;
export type MyProvisionsLazyQueryHookResult = ReturnType<typeof useMyProvisionsLazyQuery>;
export type MyProvisionsQueryResult = Apollo.QueryResult<MyProvisionsQuery, MyProvisionsQueryVariables>;
export const ProvisionsDocument = gql`
    query Provisions {
  provisions(exclude: [ENDED, CRITICAL, CANCELLED]) {
    ...ListProvision
  }
}
    ${ListProvisionFragmentDoc}`;

/**
 * __useProvisionsQuery__
 *
 * To run a query within a React component, call `useProvisionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useProvisionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProvisionsQuery({
 *   variables: {
 *   },
 * });
 */
export function useProvisionsQuery(baseOptions?: Apollo.QueryHookOptions<ProvisionsQuery, ProvisionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProvisionsQuery, ProvisionsQueryVariables>(ProvisionsDocument, options);
      }
export function useProvisionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProvisionsQuery, ProvisionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProvisionsQuery, ProvisionsQueryVariables>(ProvisionsDocument, options);
        }
export type ProvisionsQueryHookResult = ReturnType<typeof useProvisionsQuery>;
export type ProvisionsLazyQueryHookResult = ReturnType<typeof useProvisionsLazyQuery>;
export type ProvisionsQueryResult = Apollo.QueryResult<ProvisionsQuery, ProvisionsQueryVariables>;
export const FilteredProvisionsDocument = gql`
    query FilteredProvisions($exclude: [ProvisionStatusInput], $filter: [ProvisionStatusInput]) {
  myprovisions(exclude: $exclude, filter: $filter) {
    ...ListProvision
  }
}
    ${ListProvisionFragmentDoc}`;

/**
 * __useFilteredProvisionsQuery__
 *
 * To run a query within a React component, call `useFilteredProvisionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useFilteredProvisionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFilteredProvisionsQuery({
 *   variables: {
 *      exclude: // value for 'exclude'
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useFilteredProvisionsQuery(baseOptions?: Apollo.QueryHookOptions<FilteredProvisionsQuery, FilteredProvisionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FilteredProvisionsQuery, FilteredProvisionsQueryVariables>(FilteredProvisionsDocument, options);
      }
export function useFilteredProvisionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FilteredProvisionsQuery, FilteredProvisionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FilteredProvisionsQuery, FilteredProvisionsQueryVariables>(FilteredProvisionsDocument, options);
        }
export type FilteredProvisionsQueryHookResult = ReturnType<typeof useFilteredProvisionsQuery>;
export type FilteredProvisionsLazyQueryHookResult = ReturnType<typeof useFilteredProvisionsLazyQuery>;
export type FilteredProvisionsQueryResult = Apollo.QueryResult<FilteredProvisionsQuery, FilteredProvisionsQueryVariables>;
export const AgentProvisionsDocument = gql`
    query AgentProvisions($agent: ID!) {
  allprovisions(agent: $agent) {
    ...ListProvision
  }
}
    ${ListProvisionFragmentDoc}`;

/**
 * __useAgentProvisionsQuery__
 *
 * To run a query within a React component, call `useAgentProvisionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useAgentProvisionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAgentProvisionsQuery({
 *   variables: {
 *      agent: // value for 'agent'
 *   },
 * });
 */
export function useAgentProvisionsQuery(baseOptions: Apollo.QueryHookOptions<AgentProvisionsQuery, AgentProvisionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AgentProvisionsQuery, AgentProvisionsQueryVariables>(AgentProvisionsDocument, options);
      }
export function useAgentProvisionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AgentProvisionsQuery, AgentProvisionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AgentProvisionsQuery, AgentProvisionsQueryVariables>(AgentProvisionsDocument, options);
        }
export type AgentProvisionsQueryHookResult = ReturnType<typeof useAgentProvisionsQuery>;
export type AgentProvisionsLazyQueryHookResult = ReturnType<typeof useAgentProvisionsLazyQuery>;
export type AgentProvisionsQueryResult = Apollo.QueryResult<AgentProvisionsQuery, AgentProvisionsQueryVariables>;
export const LinkableProvisionsDocument = gql`
    query LinkableProvisions($reservation: ID!) {
  linkableprovisions(id: $reservation) {
    ...ListProvision
  }
}
    ${ListProvisionFragmentDoc}`;

/**
 * __useLinkableProvisionsQuery__
 *
 * To run a query within a React component, call `useLinkableProvisionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useLinkableProvisionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLinkableProvisionsQuery({
 *   variables: {
 *      reservation: // value for 'reservation'
 *   },
 * });
 */
export function useLinkableProvisionsQuery(baseOptions: Apollo.QueryHookOptions<LinkableProvisionsQuery, LinkableProvisionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LinkableProvisionsQuery, LinkableProvisionsQueryVariables>(LinkableProvisionsDocument, options);
      }
export function useLinkableProvisionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LinkableProvisionsQuery, LinkableProvisionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LinkableProvisionsQuery, LinkableProvisionsQueryVariables>(LinkableProvisionsDocument, options);
        }
export type LinkableProvisionsQueryHookResult = ReturnType<typeof useLinkableProvisionsQuery>;
export type LinkableProvisionsLazyQueryHookResult = ReturnType<typeof useLinkableProvisionsLazyQuery>;
export type LinkableProvisionsQueryResult = Apollo.QueryResult<LinkableProvisionsQuery, LinkableProvisionsQueryVariables>;
export const LinkableProvisionsOptionsDocument = gql`
    query LinkableProvisionsOptions($reservation: ID!) {
  options: linkableprovisions(id: $reservation) {
    value: id
    label: id
  }
}
    `;

/**
 * __useLinkableProvisionsOptionsQuery__
 *
 * To run a query within a React component, call `useLinkableProvisionsOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useLinkableProvisionsOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLinkableProvisionsOptionsQuery({
 *   variables: {
 *      reservation: // value for 'reservation'
 *   },
 * });
 */
export function useLinkableProvisionsOptionsQuery(baseOptions: Apollo.QueryHookOptions<LinkableProvisionsOptionsQuery, LinkableProvisionsOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<LinkableProvisionsOptionsQuery, LinkableProvisionsOptionsQueryVariables>(LinkableProvisionsOptionsDocument, options);
      }
export function useLinkableProvisionsOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<LinkableProvisionsOptionsQuery, LinkableProvisionsOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<LinkableProvisionsOptionsQuery, LinkableProvisionsOptionsQueryVariables>(LinkableProvisionsOptionsDocument, options);
        }
export type LinkableProvisionsOptionsQueryHookResult = ReturnType<typeof useLinkableProvisionsOptionsQuery>;
export type LinkableProvisionsOptionsLazyQueryHookResult = ReturnType<typeof useLinkableProvisionsOptionsLazyQuery>;
export type LinkableProvisionsOptionsQueryResult = Apollo.QueryResult<LinkableProvisionsOptionsQuery, LinkableProvisionsOptionsQueryVariables>;
export const ClientProvisionsDocument = gql`
    query ClientProvisions($clientId: String!) {
  allprovisions(clientId: $clientId) {
    ...ListProvision
  }
}
    ${ListProvisionFragmentDoc}`;

/**
 * __useClientProvisionsQuery__
 *
 * To run a query within a React component, call `useClientProvisionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useClientProvisionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClientProvisionsQuery({
 *   variables: {
 *      clientId: // value for 'clientId'
 *   },
 * });
 */
export function useClientProvisionsQuery(baseOptions: Apollo.QueryHookOptions<ClientProvisionsQuery, ClientProvisionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ClientProvisionsQuery, ClientProvisionsQueryVariables>(ClientProvisionsDocument, options);
      }
export function useClientProvisionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ClientProvisionsQuery, ClientProvisionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ClientProvisionsQuery, ClientProvisionsQueryVariables>(ClientProvisionsDocument, options);
        }
export type ClientProvisionsQueryHookResult = ReturnType<typeof useClientProvisionsQuery>;
export type ClientProvisionsLazyQueryHookResult = ReturnType<typeof useClientProvisionsLazyQuery>;
export type ClientProvisionsQueryResult = Apollo.QueryResult<ClientProvisionsQuery, ClientProvisionsQueryVariables>;
export const RegistryOptionsDocument = gql`
    query RegistryOptions($search: String) {
  options: registries(unique: $search) {
    label: id
    value: id
  }
}
    `;

/**
 * __useRegistryOptionsQuery__
 *
 * To run a query within a React component, call `useRegistryOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useRegistryOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRegistryOptionsQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useRegistryOptionsQuery(baseOptions?: Apollo.QueryHookOptions<RegistryOptionsQuery, RegistryOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RegistryOptionsQuery, RegistryOptionsQueryVariables>(RegistryOptionsDocument, options);
      }
export function useRegistryOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RegistryOptionsQuery, RegistryOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RegistryOptionsQuery, RegistryOptionsQueryVariables>(RegistryOptionsDocument, options);
        }
export type RegistryOptionsQueryHookResult = ReturnType<typeof useRegistryOptionsQuery>;
export type RegistryOptionsLazyQueryHookResult = ReturnType<typeof useRegistryOptionsLazyQuery>;
export type RegistryOptionsQueryResult = Apollo.QueryResult<RegistryOptionsQuery, RegistryOptionsQueryVariables>;
export const RepositoriesDocument = gql`
    query Repositories {
  allrepositories {
    ...ListRepository
  }
}
    ${ListRepositoryFragmentDoc}`;

/**
 * __useRepositoriesQuery__
 *
 * To run a query within a React component, call `useRepositoriesQuery` and pass it any options that fit your needs.
 * When your component renders, `useRepositoriesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useRepositoriesQuery({
 *   variables: {
 *   },
 * });
 */
export function useRepositoriesQuery(baseOptions?: Apollo.QueryHookOptions<RepositoriesQuery, RepositoriesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<RepositoriesQuery, RepositoriesQueryVariables>(RepositoriesDocument, options);
      }
export function useRepositoriesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<RepositoriesQuery, RepositoriesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<RepositoriesQuery, RepositoriesQueryVariables>(RepositoriesDocument, options);
        }
export type RepositoriesQueryHookResult = ReturnType<typeof useRepositoriesQuery>;
export type RepositoriesLazyQueryHookResult = ReturnType<typeof useRepositoriesLazyQuery>;
export type RepositoriesQueryResult = Apollo.QueryResult<RepositoriesQuery, RepositoriesQueryVariables>;
export const DetailRepositoryDocument = gql`
    query DetailRepository($id: ID) {
  repository(id: $id) {
    ...DetailRepository
  }
}
    ${DetailRepositoryFragmentDoc}`;

/**
 * __useDetailRepositoryQuery__
 *
 * To run a query within a React component, call `useDetailRepositoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailRepositoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailRepositoryQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailRepositoryQuery(baseOptions?: Apollo.QueryHookOptions<DetailRepositoryQuery, DetailRepositoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailRepositoryQuery, DetailRepositoryQueryVariables>(DetailRepositoryDocument, options);
      }
export function useDetailRepositoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailRepositoryQuery, DetailRepositoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailRepositoryQuery, DetailRepositoryQueryVariables>(DetailRepositoryDocument, options);
        }
export type DetailRepositoryQueryHookResult = ReturnType<typeof useDetailRepositoryQuery>;
export type DetailRepositoryLazyQueryHookResult = ReturnType<typeof useDetailRepositoryLazyQuery>;
export type DetailRepositoryQueryResult = Apollo.QueryResult<DetailRepositoryQuery, DetailRepositoryQueryVariables>;
export const DetailReservationDocument = gql`
    query DetailReservation($id: ID!) {
  reservation(id: $id) {
    ...DetailReservation
  }
  linkableprovisions(id: $id) {
    id
    template {
      agent {
        registry {
          app {
            identifier
            version
          }
          user {
            id
            email
          }
        }
      }
    }
  }
}
    ${DetailReservationFragmentDoc}`;

/**
 * __useDetailReservationQuery__
 *
 * To run a query within a React component, call `useDetailReservationQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailReservationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailReservationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailReservationQuery(baseOptions: Apollo.QueryHookOptions<DetailReservationQuery, DetailReservationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailReservationQuery, DetailReservationQueryVariables>(DetailReservationDocument, options);
      }
export function useDetailReservationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailReservationQuery, DetailReservationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailReservationQuery, DetailReservationQueryVariables>(DetailReservationDocument, options);
        }
export type DetailReservationQueryHookResult = ReturnType<typeof useDetailReservationQuery>;
export type DetailReservationLazyQueryHookResult = ReturnType<typeof useDetailReservationLazyQuery>;
export type DetailReservationQueryResult = Apollo.QueryResult<DetailReservationQuery, DetailReservationQueryVariables>;
export const ProvisionReferenceReservationDocument = gql`
    query ProvisionReferenceReservation($provision: ID!, $reference: String!) {
  reservation(provision: $provision, reference: $reference) {
    ...NodeReservation
  }
}
    ${NodeReservationFragmentDoc}`;

/**
 * __useProvisionReferenceReservationQuery__
 *
 * To run a query within a React component, call `useProvisionReferenceReservationQuery` and pass it any options that fit your needs.
 * When your component renders, `useProvisionReferenceReservationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProvisionReferenceReservationQuery({
 *   variables: {
 *      provision: // value for 'provision'
 *      reference: // value for 'reference'
 *   },
 * });
 */
export function useProvisionReferenceReservationQuery(baseOptions: Apollo.QueryHookOptions<ProvisionReferenceReservationQuery, ProvisionReferenceReservationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProvisionReferenceReservationQuery, ProvisionReferenceReservationQueryVariables>(ProvisionReferenceReservationDocument, options);
      }
export function useProvisionReferenceReservationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProvisionReferenceReservationQuery, ProvisionReferenceReservationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProvisionReferenceReservationQuery, ProvisionReferenceReservationQueryVariables>(ProvisionReferenceReservationDocument, options);
        }
export type ProvisionReferenceReservationQueryHookResult = ReturnType<typeof useProvisionReferenceReservationQuery>;
export type ProvisionReferenceReservationLazyQueryHookResult = ReturnType<typeof useProvisionReferenceReservationLazyQuery>;
export type ProvisionReferenceReservationQueryResult = Apollo.QueryResult<ProvisionReferenceReservationQuery, ProvisionReferenceReservationQueryVariables>;
export const MyReservationsDocument = gql`
    query MyReservations {
  myreservations(exclude: [ENDED, CRITICAL, CANCELLED]) {
    ...ListReservation
  }
}
    ${ListReservationFragmentDoc}`;

/**
 * __useMyReservationsQuery__
 *
 * To run a query within a React component, call `useMyReservationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyReservationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyReservationsQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyReservationsQuery(baseOptions?: Apollo.QueryHookOptions<MyReservationsQuery, MyReservationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyReservationsQuery, MyReservationsQueryVariables>(MyReservationsDocument, options);
      }
export function useMyReservationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyReservationsQuery, MyReservationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyReservationsQuery, MyReservationsQueryVariables>(MyReservationsDocument, options);
        }
export type MyReservationsQueryHookResult = ReturnType<typeof useMyReservationsQuery>;
export type MyReservationsLazyQueryHookResult = ReturnType<typeof useMyReservationsLazyQuery>;
export type MyReservationsQueryResult = Apollo.QueryResult<MyReservationsQuery, MyReservationsQueryVariables>;
export const ReservationsDocument = gql`
    query Reservations {
  reservations(exclude: [ENDED, CRITICAL, CANCELLED]) {
    ...ListReservation
  }
}
    ${ListReservationFragmentDoc}`;

/**
 * __useReservationsQuery__
 *
 * To run a query within a React component, call `useReservationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useReservationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReservationsQuery({
 *   variables: {
 *   },
 * });
 */
export function useReservationsQuery(baseOptions?: Apollo.QueryHookOptions<ReservationsQuery, ReservationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReservationsQuery, ReservationsQueryVariables>(ReservationsDocument, options);
      }
export function useReservationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReservationsQuery, ReservationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReservationsQuery, ReservationsQueryVariables>(ReservationsDocument, options);
        }
export type ReservationsQueryHookResult = ReturnType<typeof useReservationsQuery>;
export type ReservationsLazyQueryHookResult = ReturnType<typeof useReservationsLazyQuery>;
export type ReservationsQueryResult = Apollo.QueryResult<ReservationsQuery, ReservationsQueryVariables>;
export const DeployReservationsDocument = gql`
    query DeployReservations {
  reservations(nodeInterfaces: ["fluss:deploy"]) {
    id
    waiter {
      clientId
    }
    status
    node {
      id
      name
      description
    }
    title
    provisions {
      agent {
        clientId
      }
    }
  }
}
    `;

/**
 * __useDeployReservationsQuery__
 *
 * To run a query within a React component, call `useDeployReservationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useDeployReservationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDeployReservationsQuery({
 *   variables: {
 *   },
 * });
 */
export function useDeployReservationsQuery(baseOptions?: Apollo.QueryHookOptions<DeployReservationsQuery, DeployReservationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DeployReservationsQuery, DeployReservationsQueryVariables>(DeployReservationsDocument, options);
      }
export function useDeployReservationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DeployReservationsQuery, DeployReservationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DeployReservationsQuery, DeployReservationsQueryVariables>(DeployReservationsDocument, options);
        }
export type DeployReservationsQueryHookResult = ReturnType<typeof useDeployReservationsQuery>;
export type DeployReservationsLazyQueryHookResult = ReturnType<typeof useDeployReservationsLazyQuery>;
export type DeployReservationsQueryResult = Apollo.QueryResult<DeployReservationsQuery, DeployReservationsQueryVariables>;
export const FilteredReservationsDocument = gql`
    query FilteredReservations($exclude: [ReservationStatusInput], $filter: [ReservationStatusInput]) {
  myreservations(exclude: $exclude, filter: $filter) {
    ...ListReservation
  }
}
    ${ListReservationFragmentDoc}`;

/**
 * __useFilteredReservationsQuery__
 *
 * To run a query within a React component, call `useFilteredReservationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useFilteredReservationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFilteredReservationsQuery({
 *   variables: {
 *      exclude: // value for 'exclude'
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useFilteredReservationsQuery(baseOptions?: Apollo.QueryHookOptions<FilteredReservationsQuery, FilteredReservationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FilteredReservationsQuery, FilteredReservationsQueryVariables>(FilteredReservationsDocument, options);
      }
export function useFilteredReservationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FilteredReservationsQuery, FilteredReservationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FilteredReservationsQuery, FilteredReservationsQueryVariables>(FilteredReservationsDocument, options);
        }
export type FilteredReservationsQueryHookResult = ReturnType<typeof useFilteredReservationsQuery>;
export type FilteredReservationsLazyQueryHookResult = ReturnType<typeof useFilteredReservationsLazyQuery>;
export type FilteredReservationsQueryResult = Apollo.QueryResult<FilteredReservationsQuery, FilteredReservationsQueryVariables>;
export const DetailStructureDocument = gql`
    query DetailStructure($identifier: String) {
  structure(identifier: $identifier) {
    ...DetailStructure
  }
}
    ${DetailStructureFragmentDoc}`;

/**
 * __useDetailStructureQuery__
 *
 * To run a query within a React component, call `useDetailStructureQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailStructureQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailStructureQuery({
 *   variables: {
 *      identifier: // value for 'identifier'
 *   },
 * });
 */
export function useDetailStructureQuery(baseOptions?: Apollo.QueryHookOptions<DetailStructureQuery, DetailStructureQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailStructureQuery, DetailStructureQueryVariables>(DetailStructureDocument, options);
      }
export function useDetailStructureLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailStructureQuery, DetailStructureQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailStructureQuery, DetailStructureQueryVariables>(DetailStructureDocument, options);
        }
export type DetailStructureQueryHookResult = ReturnType<typeof useDetailStructureQuery>;
export type DetailStructureLazyQueryHookResult = ReturnType<typeof useDetailStructureLazyQuery>;
export type DetailStructureQueryResult = Apollo.QueryResult<DetailStructureQuery, DetailStructureQueryVariables>;
export const StructuresDocument = gql`
    query Structures {
  structures {
    ...ListStructure
  }
}
    ${ListStructureFragmentDoc}`;

/**
 * __useStructuresQuery__
 *
 * To run a query within a React component, call `useStructuresQuery` and pass it any options that fit your needs.
 * When your component renders, `useStructuresQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStructuresQuery({
 *   variables: {
 *   },
 * });
 */
export function useStructuresQuery(baseOptions?: Apollo.QueryHookOptions<StructuresQuery, StructuresQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StructuresQuery, StructuresQueryVariables>(StructuresDocument, options);
      }
export function useStructuresLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StructuresQuery, StructuresQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StructuresQuery, StructuresQueryVariables>(StructuresDocument, options);
        }
export type StructuresQueryHookResult = ReturnType<typeof useStructuresQuery>;
export type StructuresLazyQueryHookResult = ReturnType<typeof useStructuresLazyQuery>;
export type StructuresQueryResult = Apollo.QueryResult<StructuresQuery, StructuresQueryVariables>;
export const TemplatesDocument = gql`
    query Templates($active: Boolean, $package: String, $interface: String, $node: ID) {
  templates(
    providable: $active
    package: $package
    interface: $interface
    node: $node
  ) {
    id
    name
    node {
      id
      name
    }
  }
}
    `;

/**
 * __useTemplatesQuery__
 *
 * To run a query within a React component, call `useTemplatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useTemplatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTemplatesQuery({
 *   variables: {
 *      active: // value for 'active'
 *      package: // value for 'package'
 *      interface: // value for 'interface'
 *      node: // value for 'node'
 *   },
 * });
 */
export function useTemplatesQuery(baseOptions?: Apollo.QueryHookOptions<TemplatesQuery, TemplatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TemplatesQuery, TemplatesQueryVariables>(TemplatesDocument, options);
      }
export function useTemplatesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TemplatesQuery, TemplatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TemplatesQuery, TemplatesQueryVariables>(TemplatesDocument, options);
        }
export type TemplatesQueryHookResult = ReturnType<typeof useTemplatesQuery>;
export type TemplatesLazyQueryHookResult = ReturnType<typeof useTemplatesLazyQuery>;
export type TemplatesQueryResult = Apollo.QueryResult<TemplatesQuery, TemplatesQueryVariables>;
export const AssignableTemplatesDocument = gql`
    query AssignableTemplates($node: ID) {
  templates(node: $node) {
    id
    name
    node {
      id
      name
    }
    agent {
      registry {
        app {
          id
          version
          identifier
        }
        user {
          username
        }
      }
    }
  }
}
    `;

/**
 * __useAssignableTemplatesQuery__
 *
 * To run a query within a React component, call `useAssignableTemplatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useAssignableTemplatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAssignableTemplatesQuery({
 *   variables: {
 *      node: // value for 'node'
 *   },
 * });
 */
export function useAssignableTemplatesQuery(baseOptions?: Apollo.QueryHookOptions<AssignableTemplatesQuery, AssignableTemplatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AssignableTemplatesQuery, AssignableTemplatesQueryVariables>(AssignableTemplatesDocument, options);
      }
export function useAssignableTemplatesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AssignableTemplatesQuery, AssignableTemplatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AssignableTemplatesQuery, AssignableTemplatesQueryVariables>(AssignableTemplatesDocument, options);
        }
export type AssignableTemplatesQueryHookResult = ReturnType<typeof useAssignableTemplatesQuery>;
export type AssignableTemplatesLazyQueryHookResult = ReturnType<typeof useAssignableTemplatesLazyQuery>;
export type AssignableTemplatesQueryResult = Apollo.QueryResult<AssignableTemplatesQuery, AssignableTemplatesQueryVariables>;
export const ReservableTemplatesDocument = gql`
    query ReservableTemplates($node: ID!) {
  reservableTemplates(node: $node) {
    ...ReservableTemplate
  }
}
    ${ReservableTemplateFragmentDoc}`;

/**
 * __useReservableTemplatesQuery__
 *
 * To run a query within a React component, call `useReservableTemplatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useReservableTemplatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReservableTemplatesQuery({
 *   variables: {
 *      node: // value for 'node'
 *   },
 * });
 */
export function useReservableTemplatesQuery(baseOptions: Apollo.QueryHookOptions<ReservableTemplatesQuery, ReservableTemplatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReservableTemplatesQuery, ReservableTemplatesQueryVariables>(ReservableTemplatesDocument, options);
      }
export function useReservableTemplatesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReservableTemplatesQuery, ReservableTemplatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReservableTemplatesQuery, ReservableTemplatesQueryVariables>(ReservableTemplatesDocument, options);
        }
export type ReservableTemplatesQueryHookResult = ReturnType<typeof useReservableTemplatesQuery>;
export type ReservableTemplatesLazyQueryHookResult = ReturnType<typeof useReservableTemplatesLazyQuery>;
export type ReservableTemplatesQueryResult = Apollo.QueryResult<ReservableTemplatesQuery, ReservableTemplatesQueryVariables>;
export const HashReservableTemplatesDocument = gql`
    query HashReservableTemplates($hash: String!) {
  reservableTemplates(hash: $hash) {
    ...ReservableTemplate
  }
}
    ${ReservableTemplateFragmentDoc}`;

/**
 * __useHashReservableTemplatesQuery__
 *
 * To run a query within a React component, call `useHashReservableTemplatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useHashReservableTemplatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHashReservableTemplatesQuery({
 *   variables: {
 *      hash: // value for 'hash'
 *   },
 * });
 */
export function useHashReservableTemplatesQuery(baseOptions: Apollo.QueryHookOptions<HashReservableTemplatesQuery, HashReservableTemplatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HashReservableTemplatesQuery, HashReservableTemplatesQueryVariables>(HashReservableTemplatesDocument, options);
      }
export function useHashReservableTemplatesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HashReservableTemplatesQuery, HashReservableTemplatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HashReservableTemplatesQuery, HashReservableTemplatesQueryVariables>(HashReservableTemplatesDocument, options);
        }
export type HashReservableTemplatesQueryHookResult = ReturnType<typeof useHashReservableTemplatesQuery>;
export type HashReservableTemplatesLazyQueryHookResult = ReturnType<typeof useHashReservableTemplatesLazyQuery>;
export type HashReservableTemplatesQueryResult = Apollo.QueryResult<HashReservableTemplatesQuery, HashReservableTemplatesQueryVariables>;
export const DetailTemplateDocument = gql`
    query DetailTemplate($id: ID!) {
  template(id: $id) {
    ...DetailTemplate
  }
}
    ${DetailTemplateFragmentDoc}`;

/**
 * __useDetailTemplateQuery__
 *
 * To run a query within a React component, call `useDetailTemplateQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailTemplateQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailTemplateQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailTemplateQuery(baseOptions: Apollo.QueryHookOptions<DetailTemplateQuery, DetailTemplateQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<DetailTemplateQuery, DetailTemplateQueryVariables>(DetailTemplateDocument, options);
      }
export function useDetailTemplateLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<DetailTemplateQuery, DetailTemplateQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<DetailTemplateQuery, DetailTemplateQueryVariables>(DetailTemplateDocument, options);
        }
export type DetailTemplateQueryHookResult = ReturnType<typeof useDetailTemplateQuery>;
export type DetailTemplateLazyQueryHookResult = ReturnType<typeof useDetailTemplateLazyQuery>;
export type DetailTemplateQueryResult = Apollo.QueryResult<DetailTemplateQuery, DetailTemplateQueryVariables>;
export const TemplateOptionsDocument = gql`
    query TemplateOptions($node: ID!) {
  options: templates(node: $node) {
    value: id
    label: name
    node {
      id
      name
    }
  }
}
    `;

/**
 * __useTemplateOptionsQuery__
 *
 * To run a query within a React component, call `useTemplateOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useTemplateOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTemplateOptionsQuery({
 *   variables: {
 *      node: // value for 'node'
 *   },
 * });
 */
export function useTemplateOptionsQuery(baseOptions: Apollo.QueryHookOptions<TemplateOptionsQuery, TemplateOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TemplateOptionsQuery, TemplateOptionsQueryVariables>(TemplateOptionsDocument, options);
      }
export function useTemplateOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TemplateOptionsQuery, TemplateOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TemplateOptionsQuery, TemplateOptionsQueryVariables>(TemplateOptionsDocument, options);
        }
export type TemplateOptionsQueryHookResult = ReturnType<typeof useTemplateOptionsQuery>;
export type TemplateOptionsLazyQueryHookResult = ReturnType<typeof useTemplateOptionsLazyQuery>;
export type TemplateOptionsQueryResult = Apollo.QueryResult<TemplateOptionsQuery, TemplateOptionsQueryVariables>;
export const SearchTemplateOptionsDocument = gql`
    query SearchTemplateOptions($node: ID!, $search: String) {
  options: templates(node: $node, name: $search) {
    value: id
    label: name
    node {
      id
      name
    }
  }
}
    `;

/**
 * __useSearchTemplateOptionsQuery__
 *
 * To run a query within a React component, call `useSearchTemplateOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchTemplateOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchTemplateOptionsQuery({
 *   variables: {
 *      node: // value for 'node'
 *      search: // value for 'search'
 *   },
 * });
 */
export function useSearchTemplateOptionsQuery(baseOptions: Apollo.QueryHookOptions<SearchTemplateOptionsQuery, SearchTemplateOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchTemplateOptionsQuery, SearchTemplateOptionsQueryVariables>(SearchTemplateOptionsDocument, options);
      }
export function useSearchTemplateOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchTemplateOptionsQuery, SearchTemplateOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchTemplateOptionsQuery, SearchTemplateOptionsQueryVariables>(SearchTemplateOptionsDocument, options);
        }
export type SearchTemplateOptionsQueryHookResult = ReturnType<typeof useSearchTemplateOptionsQuery>;
export type SearchTemplateOptionsLazyQueryHookResult = ReturnType<typeof useSearchTemplateOptionsLazyQuery>;
export type SearchTemplateOptionsQueryResult = Apollo.QueryResult<SearchTemplateOptionsQuery, SearchTemplateOptionsQueryVariables>;
export const NodeTemplatesDocument = gql`
    query NodeTemplates($search: String, $scopes: [NodeScope]) {
  templates(search: $search, scopes: $scopes) {
    ...DisplayTemplate
  }
}
    ${DisplayTemplateFragmentDoc}`;

/**
 * __useNodeTemplatesQuery__
 *
 * To run a query within a React component, call `useNodeTemplatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useNodeTemplatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNodeTemplatesQuery({
 *   variables: {
 *      search: // value for 'search'
 *      scopes: // value for 'scopes'
 *   },
 * });
 */
export function useNodeTemplatesQuery(baseOptions?: Apollo.QueryHookOptions<NodeTemplatesQuery, NodeTemplatesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NodeTemplatesQuery, NodeTemplatesQueryVariables>(NodeTemplatesDocument, options);
      }
export function useNodeTemplatesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NodeTemplatesQuery, NodeTemplatesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NodeTemplatesQuery, NodeTemplatesQueryVariables>(NodeTemplatesDocument, options);
        }
export type NodeTemplatesQueryHookResult = ReturnType<typeof useNodeTemplatesQuery>;
export type NodeTemplatesLazyQueryHookResult = ReturnType<typeof useNodeTemplatesLazyQuery>;
export type NodeTemplatesQueryResult = Apollo.QueryResult<NodeTemplatesQuery, NodeTemplatesQueryVariables>;
export const UserOptionsDocument = gql`
    query UserOptions($search: String) {
  options: users(username: $search) {
    value: id
    label: username
  }
}
    `;

/**
 * __useUserOptionsQuery__
 *
 * To run a query within a React component, call `useUserOptionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserOptionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserOptionsQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useUserOptionsQuery(baseOptions?: Apollo.QueryHookOptions<UserOptionsQuery, UserOptionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UserOptionsQuery, UserOptionsQueryVariables>(UserOptionsDocument, options);
      }
export function useUserOptionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UserOptionsQuery, UserOptionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UserOptionsQuery, UserOptionsQueryVariables>(UserOptionsDocument, options);
        }
export type UserOptionsQueryHookResult = ReturnType<typeof useUserOptionsQuery>;
export type UserOptionsLazyQueryHookResult = ReturnType<typeof useUserOptionsLazyQuery>;
export type UserOptionsQueryResult = Apollo.QueryResult<UserOptionsQuery, UserOptionsQueryVariables>;
export const MeDocument = gql`
    query Me {
  me {
    id
    email
  }
}
    `;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const UserDocument = gql`
    query User($email: String) {
  user(email: $email) {
    id
    username
    email
  }
}
    `;

/**
 * __useUserQuery__
 *
 * To run a query within a React component, call `useUserQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserQuery({
 *   variables: {
 *      email: // value for 'email'
 *   },
 * });
 */
export function useUserQuery(baseOptions?: Apollo.QueryHookOptions<UserQuery, UserQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UserQuery, UserQueryVariables>(UserDocument, options);
      }
export function useUserLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UserQuery, UserQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UserQuery, UserQueryVariables>(UserDocument, options);
        }
export type UserQueryHookResult = ReturnType<typeof useUserQuery>;
export type UserLazyQueryHookResult = ReturnType<typeof useUserLazyQuery>;
export type UserQueryResult = Apollo.QueryResult<UserQuery, UserQueryVariables>;
export const AgentsEventDocument = gql`
    subscription AgentsEvent {
  agentsEvent {
    created {
      ...ListAgent
    }
    deleted
    updated {
      ...ListAgent
    }
  }
}
    ${ListAgentFragmentDoc}`;

/**
 * __useAgentsEventSubscription__
 *
 * To run a query within a React component, call `useAgentsEventSubscription` and pass it any options that fit your needs.
 * When your component renders, `useAgentsEventSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAgentsEventSubscription({
 *   variables: {
 *   },
 * });
 */
export function useAgentsEventSubscription(baseOptions?: Apollo.SubscriptionHookOptions<AgentsEventSubscription, AgentsEventSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<AgentsEventSubscription, AgentsEventSubscriptionVariables>(AgentsEventDocument, options);
      }
export type AgentsEventSubscriptionHookResult = ReturnType<typeof useAgentsEventSubscription>;
export type AgentsEventSubscriptionResult = Apollo.SubscriptionResult<AgentsEventSubscription>;
export const WatchAssignationDocument = gql`
    subscription WatchAssignation($id: ID!) {
  assignation(id: $id) {
    log {
      message
      level
    }
  }
}
    `;

/**
 * __useWatchAssignationSubscription__
 *
 * To run a query within a React component, call `useWatchAssignationSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchAssignationSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchAssignationSubscription({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useWatchAssignationSubscription(baseOptions: Apollo.SubscriptionHookOptions<WatchAssignationSubscription, WatchAssignationSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchAssignationSubscription, WatchAssignationSubscriptionVariables>(WatchAssignationDocument, options);
      }
export type WatchAssignationSubscriptionHookResult = ReturnType<typeof useWatchAssignationSubscription>;
export type WatchAssignationSubscriptionResult = Apollo.SubscriptionResult<WatchAssignationSubscription>;
export const WatchMyRequestsDocument = gql`
    subscription WatchMyRequests {
  myrequests {
    create {
      ...ListAssignation
    }
    delete
    update {
      ...ListAssignation
    }
  }
}
    ${ListAssignationFragmentDoc}`;

/**
 * __useWatchMyRequestsSubscription__
 *
 * To run a query within a React component, call `useWatchMyRequestsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchMyRequestsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchMyRequestsSubscription({
 *   variables: {
 *   },
 * });
 */
export function useWatchMyRequestsSubscription(baseOptions?: Apollo.SubscriptionHookOptions<WatchMyRequestsSubscription, WatchMyRequestsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchMyRequestsSubscription, WatchMyRequestsSubscriptionVariables>(WatchMyRequestsDocument, options);
      }
export type WatchMyRequestsSubscriptionHookResult = ReturnType<typeof useWatchMyRequestsSubscription>;
export type WatchMyRequestsSubscriptionResult = Apollo.SubscriptionResult<WatchMyRequestsSubscription>;
export const WatchRequestsDocument = gql`
    subscription WatchRequests($identifier: String!) {
  requests(identifier: $identifier) {
    create {
      ...ListAssignation
    }
    delete
    update {
      ...ListAssignation
    }
  }
}
    ${ListAssignationFragmentDoc}`;

/**
 * __useWatchRequestsSubscription__
 *
 * To run a query within a React component, call `useWatchRequestsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchRequestsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchRequestsSubscription({
 *   variables: {
 *      identifier: // value for 'identifier'
 *   },
 * });
 */
export function useWatchRequestsSubscription(baseOptions: Apollo.SubscriptionHookOptions<WatchRequestsSubscription, WatchRequestsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchRequestsSubscription, WatchRequestsSubscriptionVariables>(WatchRequestsDocument, options);
      }
export type WatchRequestsSubscriptionHookResult = ReturnType<typeof useWatchRequestsSubscription>;
export type WatchRequestsSubscriptionResult = Apollo.SubscriptionResult<WatchRequestsSubscription>;
export const WatchMyTodosDocument = gql`
    subscription WatchMyTodos {
  mytodos {
    create {
      ...ListAssignation
    }
    update {
      ...ListAssignation
    }
    delete
  }
}
    ${ListAssignationFragmentDoc}`;

/**
 * __useWatchMyTodosSubscription__
 *
 * To run a query within a React component, call `useWatchMyTodosSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchMyTodosSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchMyTodosSubscription({
 *   variables: {
 *   },
 * });
 */
export function useWatchMyTodosSubscription(baseOptions?: Apollo.SubscriptionHookOptions<WatchMyTodosSubscription, WatchMyTodosSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchMyTodosSubscription, WatchMyTodosSubscriptionVariables>(WatchMyTodosDocument, options);
      }
export type WatchMyTodosSubscriptionHookResult = ReturnType<typeof useWatchMyTodosSubscription>;
export type WatchMyTodosSubscriptionResult = Apollo.SubscriptionResult<WatchMyTodosSubscription>;
export const WatchTodosDocument = gql`
    subscription WatchTodos($identifier: String!) {
  todos(identifier: $identifier) {
    create {
      ...ListAssignation
    }
    update {
      ...ListAssignation
    }
    delete
  }
}
    ${ListAssignationFragmentDoc}`;

/**
 * __useWatchTodosSubscription__
 *
 * To run a query within a React component, call `useWatchTodosSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchTodosSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchTodosSubscription({
 *   variables: {
 *      identifier: // value for 'identifier'
 *   },
 * });
 */
export function useWatchTodosSubscription(baseOptions: Apollo.SubscriptionHookOptions<WatchTodosSubscription, WatchTodosSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchTodosSubscription, WatchTodosSubscriptionVariables>(WatchTodosDocument, options);
      }
export type WatchTodosSubscriptionHookResult = ReturnType<typeof useWatchTodosSubscription>;
export type WatchTodosSubscriptionResult = Apollo.SubscriptionResult<WatchTodosSubscription>;
export const NodesEventDocument = gql`
    subscription NodesEvent {
  nodes {
    updated {
      ...NodeListItem
    }
    created {
      ...NodeListItem
    }
    deleted
  }
}
    ${NodeListItemFragmentDoc}`;

/**
 * __useNodesEventSubscription__
 *
 * To run a query within a React component, call `useNodesEventSubscription` and pass it any options that fit your needs.
 * When your component renders, `useNodesEventSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNodesEventSubscription({
 *   variables: {
 *   },
 * });
 */
export function useNodesEventSubscription(baseOptions?: Apollo.SubscriptionHookOptions<NodesEventSubscription, NodesEventSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<NodesEventSubscription, NodesEventSubscriptionVariables>(NodesEventDocument, options);
      }
export type NodesEventSubscriptionHookResult = ReturnType<typeof useNodesEventSubscription>;
export type NodesEventSubscriptionResult = Apollo.SubscriptionResult<NodesEventSubscription>;
export const AssignNodeEventDocument = gql`
    subscription AssignNodeEvent($id: ID!) {
  nodeEvent(id: $id) {
    ...CompleteNode
  }
}
    ${CompleteNodeFragmentDoc}`;

/**
 * __useAssignNodeEventSubscription__
 *
 * To run a query within a React component, call `useAssignNodeEventSubscription` and pass it any options that fit your needs.
 * When your component renders, `useAssignNodeEventSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAssignNodeEventSubscription({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useAssignNodeEventSubscription(baseOptions: Apollo.SubscriptionHookOptions<AssignNodeEventSubscription, AssignNodeEventSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<AssignNodeEventSubscription, AssignNodeEventSubscriptionVariables>(AssignNodeEventDocument, options);
      }
export type AssignNodeEventSubscriptionHookResult = ReturnType<typeof useAssignNodeEventSubscription>;
export type AssignNodeEventSubscriptionResult = Apollo.SubscriptionResult<AssignNodeEventSubscription>;
export const DetailNodeEventDocument = gql`
    subscription DetailNodeEvent($id: ID!) {
  nodeEvent(id: $id) {
    ...DetailNode
  }
}
    ${DetailNodeFragmentDoc}`;

/**
 * __useDetailNodeEventSubscription__
 *
 * To run a query within a React component, call `useDetailNodeEventSubscription` and pass it any options that fit your needs.
 * When your component renders, `useDetailNodeEventSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailNodeEventSubscription({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailNodeEventSubscription(baseOptions: Apollo.SubscriptionHookOptions<DetailNodeEventSubscription, DetailNodeEventSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<DetailNodeEventSubscription, DetailNodeEventSubscriptionVariables>(DetailNodeEventDocument, options);
      }
export type DetailNodeEventSubscriptionHookResult = ReturnType<typeof useDetailNodeEventSubscription>;
export type DetailNodeEventSubscriptionResult = Apollo.SubscriptionResult<DetailNodeEventSubscription>;
export const WatchInterfaceDocument = gql`
    subscription WatchInterface($interface: String) {
  nodes(interface: $interface) {
    updated {
      ...NodeListItem
    }
    created {
      ...NodeListItem
    }
    deleted
  }
}
    ${NodeListItemFragmentDoc}`;

/**
 * __useWatchInterfaceSubscription__
 *
 * To run a query within a React component, call `useWatchInterfaceSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchInterfaceSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchInterfaceSubscription({
 *   variables: {
 *      interface: // value for 'interface'
 *   },
 * });
 */
export function useWatchInterfaceSubscription(baseOptions?: Apollo.SubscriptionHookOptions<WatchInterfaceSubscription, WatchInterfaceSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchInterfaceSubscription, WatchInterfaceSubscriptionVariables>(WatchInterfaceDocument, options);
      }
export type WatchInterfaceSubscriptionHookResult = ReturnType<typeof useWatchInterfaceSubscription>;
export type WatchInterfaceSubscriptionResult = Apollo.SubscriptionResult<WatchInterfaceSubscription>;
export const WatchProvisionDocument = gql`
    subscription WatchProvision($id: ID!) {
  provision(id: $id) {
    log {
      message
      level
    }
  }
}
    `;

/**
 * __useWatchProvisionSubscription__
 *
 * To run a query within a React component, call `useWatchProvisionSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchProvisionSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchProvisionSubscription({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useWatchProvisionSubscription(baseOptions: Apollo.SubscriptionHookOptions<WatchProvisionSubscription, WatchProvisionSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchProvisionSubscription, WatchProvisionSubscriptionVariables>(WatchProvisionDocument, options);
      }
export type WatchProvisionSubscriptionHookResult = ReturnType<typeof useWatchProvisionSubscription>;
export type WatchProvisionSubscriptionResult = Apollo.SubscriptionResult<WatchProvisionSubscription>;
export const WatchProvisionsDocument = gql`
    subscription WatchProvisions($identifier: String!) {
  provisions(identifier: $identifier) {
    create {
      ...ListProvision
    }
    delete
    update {
      ...ListProvision
    }
  }
}
    ${ListProvisionFragmentDoc}`;

/**
 * __useWatchProvisionsSubscription__
 *
 * To run a query within a React component, call `useWatchProvisionsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchProvisionsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchProvisionsSubscription({
 *   variables: {
 *      identifier: // value for 'identifier'
 *   },
 * });
 */
export function useWatchProvisionsSubscription(baseOptions: Apollo.SubscriptionHookOptions<WatchProvisionsSubscription, WatchProvisionsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchProvisionsSubscription, WatchProvisionsSubscriptionVariables>(WatchProvisionsDocument, options);
      }
export type WatchProvisionsSubscriptionHookResult = ReturnType<typeof useWatchProvisionsSubscription>;
export type WatchProvisionsSubscriptionResult = Apollo.SubscriptionResult<WatchProvisionsSubscription>;
export const WatchMyProvisionsDocument = gql`
    subscription WatchMyProvisions {
  myprovisions {
    create {
      ...ListProvision
    }
    delete
    update {
      ...ListProvision
    }
  }
}
    ${ListProvisionFragmentDoc}`;

/**
 * __useWatchMyProvisionsSubscription__
 *
 * To run a query within a React component, call `useWatchMyProvisionsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchMyProvisionsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchMyProvisionsSubscription({
 *   variables: {
 *   },
 * });
 */
export function useWatchMyProvisionsSubscription(baseOptions?: Apollo.SubscriptionHookOptions<WatchMyProvisionsSubscription, WatchMyProvisionsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchMyProvisionsSubscription, WatchMyProvisionsSubscriptionVariables>(WatchMyProvisionsDocument, options);
      }
export type WatchMyProvisionsSubscriptionHookResult = ReturnType<typeof useWatchMyProvisionsSubscription>;
export type WatchMyProvisionsSubscriptionResult = Apollo.SubscriptionResult<WatchMyProvisionsSubscription>;
export const WatchReservationDocument = gql`
    subscription WatchReservation($id: ID!) {
  reservation(id: $id) {
    log {
      message
      level
    }
  }
}
    `;

/**
 * __useWatchReservationSubscription__
 *
 * To run a query within a React component, call `useWatchReservationSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchReservationSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchReservationSubscription({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useWatchReservationSubscription(baseOptions: Apollo.SubscriptionHookOptions<WatchReservationSubscription, WatchReservationSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchReservationSubscription, WatchReservationSubscriptionVariables>(WatchReservationDocument, options);
      }
export type WatchReservationSubscriptionHookResult = ReturnType<typeof useWatchReservationSubscription>;
export type WatchReservationSubscriptionResult = Apollo.SubscriptionResult<WatchReservationSubscription>;
export const WatchReservationsDocument = gql`
    subscription WatchReservations($identifier: String!) {
  reservations(identifier: $identifier) {
    create {
      ...ListReservation
    }
    delete
    update {
      ...ListReservation
    }
  }
}
    ${ListReservationFragmentDoc}`;

/**
 * __useWatchReservationsSubscription__
 *
 * To run a query within a React component, call `useWatchReservationsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchReservationsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchReservationsSubscription({
 *   variables: {
 *      identifier: // value for 'identifier'
 *   },
 * });
 */
export function useWatchReservationsSubscription(baseOptions: Apollo.SubscriptionHookOptions<WatchReservationsSubscription, WatchReservationsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchReservationsSubscription, WatchReservationsSubscriptionVariables>(WatchReservationsDocument, options);
      }
export type WatchReservationsSubscriptionHookResult = ReturnType<typeof useWatchReservationsSubscription>;
export type WatchReservationsSubscriptionResult = Apollo.SubscriptionResult<WatchReservationsSubscription>;
export const WatchMyReservationsDocument = gql`
    subscription WatchMyReservations {
  myreservations {
    create {
      ...ListReservation
    }
    delete
    update {
      ...ListReservation
    }
  }
}
    ${ListReservationFragmentDoc}`;

/**
 * __useWatchMyReservationsSubscription__
 *
 * To run a query within a React component, call `useWatchMyReservationsSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchMyReservationsSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchMyReservationsSubscription({
 *   variables: {
 *   },
 * });
 */
export function useWatchMyReservationsSubscription(baseOptions?: Apollo.SubscriptionHookOptions<WatchMyReservationsSubscription, WatchMyReservationsSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchMyReservationsSubscription, WatchMyReservationsSubscriptionVariables>(WatchMyReservationsDocument, options);
      }
export type WatchMyReservationsSubscriptionHookResult = ReturnType<typeof useWatchMyReservationsSubscription>;
export type WatchMyReservationsSubscriptionResult = Apollo.SubscriptionResult<WatchMyReservationsSubscription>;
export const WatchReservationsOnProvisionDocument = gql`
    subscription WatchReservationsOnProvision($identifier: String!, $provision: String!) {
  reservations(identifier: $identifier, provision: $provision) {
    create {
      ...ListReservation
    }
    delete
    update {
      ...ListReservation
    }
  }
}
    ${ListReservationFragmentDoc}`;

/**
 * __useWatchReservationsOnProvisionSubscription__
 *
 * To run a query within a React component, call `useWatchReservationsOnProvisionSubscription` and pass it any options that fit your needs.
 * When your component renders, `useWatchReservationsOnProvisionSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWatchReservationsOnProvisionSubscription({
 *   variables: {
 *      identifier: // value for 'identifier'
 *      provision: // value for 'provision'
 *   },
 * });
 */
export function useWatchReservationsOnProvisionSubscription(baseOptions: Apollo.SubscriptionHookOptions<WatchReservationsOnProvisionSubscription, WatchReservationsOnProvisionSubscriptionVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useSubscription<WatchReservationsOnProvisionSubscription, WatchReservationsOnProvisionSubscriptionVariables>(WatchReservationsOnProvisionDocument, options);
      }
export type WatchReservationsOnProvisionSubscriptionHookResult = ReturnType<typeof useWatchReservationsOnProvisionSubscription>;
export type WatchReservationsOnProvisionSubscriptionResult = Apollo.SubscriptionResult<WatchReservationsOnProvisionSubscription>;