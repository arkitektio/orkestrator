import { Concentration } from '@/elektro/api/scalars';
import { Dimension } from '@/elektro/api/scalars';
import { Duration } from '@/elektro/api/scalars';
import { ElectricPotential } from '@/elektro/api/scalars';
import { ElectricalConductance } from '@/elektro/api/scalars';
import { Frequency } from '@/elektro/api/scalars';
import { GenericQuantity } from '@/elektro/api/scalars';
import { Length } from '@/elektro/api/scalars';
import { RGBAColor } from '@/elektro/api/scalars';
import { Resistivity } from '@/elektro/api/scalars';
import { SpecificCapacitance } from '@/elektro/api/scalars';
import { Temperature } from '@/elektro/api/scalars';
import { Unit } from '@/elektro/api/scalars';
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/lib/elektro/funcs';
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
  /** The `Any` scalar any type */
  Any: { input: any; output: any; }
  /** A type representing an array-like structure, which can be a list or any iterable. */
  ArrayLike: { input: any; output: any; }
  /** A type representing a big file store reference, which can be either a string ID or a more complex object. */
  BigFileLike: { input: any; output: any; }
  /** A molar concentration (``"5 nM"``, ``"2 µM"``, ``"1 mM"``). */
  Concentration: { input: Concentration; output: Concentration; }
  /** Date with time (isoformat) */
  DateTime: { input: any; output: any; }
  /**
   * A physical dimension (``"[length]"``, ``"[current] / [length] ** 2"``, ``"dimensionless"``).
   *
   * A string scalar validating that the value is a parseable pint dimensionality and
   * serializing it to a canonical, order-stable string (the quantity-compatibility
   * key). A unit expression is accepted and reduced to its dimensionality.
   */
  Dimension: { input: Dimension; output: Dimension; }
  /** A quantity of time (``"5 ms"``, ``"2 s"``, ``"1 hour"``). */
  Duration: { input: Duration; output: Duration; }
  /** An electric potential / voltage (``"-70 mV"``, ``"5 V"``). */
  ElectricPotential: { input: ElectricPotential; output: ElectricPotential; }
  /** An electrical conductance (``"5 nS"``, ``"2 µS"``). */
  ElectricalConductance: { input: ElectricalConductance; output: ElectricalConductance; }
  /** The `FileLike` scalar type represents a reference to a big file storage previously created by the user n a datalayer */
  FileLike: { input: any; output: any; }
  /** The `Vector` scalar type represents a matrix values as specified by */
  FiveDVector: { input: any; output: any; }
  /** A quantity of frequency (``"50 Hz"``, ``"1 kHz"``). */
  Frequency: { input: Frequency; output: Frequency; }
  /**
   * A physical quantity of any dimension (``"0.12 S/cm2"``, ``"-54.3 mV"``, ``"2 mM"``).
   *
   * Unlike the dimension-locked scalars, this keeps whatever unit the value
   * carries and does not normalize to a canonical integer — its dimension is
   * whatever the value has. A bare number without a unit is rejected. On the wire
   * it is a string; validating it against an expected dimension (e.g. a declared
   * mechanism parameter) is the caller's job.
   */
  GenericQuantity: { input: GenericQuantity; output: GenericQuantity; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](https://ecma-international.org/wp-content/uploads/ECMA-404_2nd_edition_december_2017.pdf). */
  JSON: { input: any; output: any; }
  /** A spatial length (``"2.5 µm"``, ``"1 mm"``, ``"3 m"``). */
  Length: { input: Length; output: Length; }
  /** The Color scalar type represents a color as a list of 4 values RGBA */
  RGBAColor: { input: RGBAColor; output: RGBAColor; }
  /** An axial resistivity (NEURON ``Ra``; ``"35.4 ohm*cm"``, ``"100 ohm*cm"``). */
  Resistivity: { input: Resistivity; output: Resistivity; }
  /** A specific membrane capacitance (NEURON ``cm``; ``"1 uF/cm^2"``). */
  SpecificCapacitance: { input: SpecificCapacitance; output: SpecificCapacitance; }
  /** A temperature (``"310 K"``, ``"37 degC"``). */
  Temperature: { input: Temperature; output: Temperature; }
  /** The `ArrayLike` scalar type represents a reference to a store previously created by the user n a datalayer */
  TraceLike: { input: any; output: any; }
  /** The `Vector` scalar type represents a matrix values as specified by */
  TwoDVector: { input: any; output: any; }
  /**
   * A physical unit of measurement (``"mV"``, ``"S/cm2"``, ``"second"``).
   *
   * A string scalar validating that the value parses as a pint unit — a bad unit,
   * a bare quantity (``"5 mV"``), or a dimension is rejected. Compact exponent
   * spelling (``"cm2"``) is accepted and the given spelling is preserved.
   */
  Unit: { input: Unit; output: Unit; }
  _Any: { input: any; output: any; }
};

export type AddModelsToWorkspaceInput = {
  models: Array<Scalars['ID']['input']>;
  workspace: Scalars['ID']['input'];
  workspaceGroup?: Scalars['String']['input'];
};

export type AnalogSignal = Signal & {
  __typename?: 'AnalogSignal';
  channels: Array<AnalogSignalChannel>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  samplingRate: Scalars['Frequency']['output'];
  segment: BlockSegment;
  timeTrace: Trace;
  unit?: Maybe<Scalars['String']['output']>;
};


export type AnalogSignalChannelsArgs = {
  filters?: InputMaybe<AnalogSignalChannelFilter>;
  ordering?: Array<AnalogSignalChannelOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type AnalogSignalProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type AnalogSignalChannel = {
  __typename?: 'AnalogSignalChannel';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  index: Scalars['Int']['output'];
  label?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  signal: AnalogSignal;
  trace: Trace;
  unit?: Maybe<Scalars['String']['output']>;
};

export type AnalogSignalChannelFilter = {
  AND?: InputMaybe<AnalogSignalChannelFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AnalogSignalChannelFilter>;
  OR?: InputMaybe<AnalogSignalChannelFilter>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  label?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
  session?: InputMaybe<Scalars['ID']['input']>;
};

export type AnalogSignalChannelInput = {
  color?: InputMaybe<Array<Scalars['Int']['input']>>;
  description?: InputMaybe<Scalars['String']['input']>;
  index: Scalars['Int']['input'];
  name: Scalars['String']['input'];
  trace: Scalars['TraceLike']['input'];
  unit?: InputMaybe<Scalars['String']['input']>;
};

export type AnalogSignalChannelOrder =
  { id: Ordering; };

export type AnalogSignalFilter = {
  AND?: InputMaybe<AnalogSignalFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AnalogSignalFilter>;
  OR?: InputMaybe<AnalogSignalFilter>;
  createdByAgent?: InputMaybe<Scalars['Boolean']['input']>;
  createdWith?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  label?: InputMaybe<StrFilterLookup>;
  provenanceRootTask?: InputMaybe<Scalars['String']['input']>;
  provenanceTask?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  session?: InputMaybe<Scalars['ID']['input']>;
};

export type AnalogSignalInput = {
  channels: Array<AnalogSignalChannelInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  samplingRate: Scalars['Frequency']['input'];
  tStart: Scalars['Duration']['input'];
  timeTrace: Scalars['TraceLike']['input'];
  unit?: InputMaybe<Scalars['String']['input']>;
};

export type AnalogSignalOrder =
  { id: Ordering; };

export type App = {
  __typename?: 'App';
  id: Scalars['ID']['output'];
  identifier: Scalars['String']['output'];
};

export type AssociateInput = {
  other: Scalars['ID']['input'];
  selfs: Array<Scalars['ID']['input']>;
};

/** Temporary S3 credentials for reading a big file. */
export type BigFileAccessGrant = {
  __typename?: 'BigFileAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store?: Maybe<Scalars['String']['output']>;
};

/** A BigFileStore represents a large object stored behind the S3 datalayer. */
export type BigFileStore = {
  __typename?: 'BigFileStore';
  /** Get temporary S3 read credentials for the object. */
  accessGrant: BigFileAccessGrant;
  bucket: Scalars['String']['output'];
  contentType?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  presignedUrl: Scalars['String']['output'];
};


/** A BigFileStore represents a large object stored behind the S3 datalayer. */
export type BigFileStoreAccessGrantArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};

/** Temporary S3 credentials for uploading a big file. */
export type BigFileUploadGrant = {
  __typename?: 'BigFileUploadGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  maxBytes: Scalars['Int']['output'];
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store: Scalars['String']['output'];
  uploadContentType?: Maybe<Scalars['String']['output']>;
  uploadFileName: Scalars['String']['output'];
  uploadFormField: Scalars['String']['output'];
};

/** Represents a biophysics model, which consists of compartments, each with their own mechanisms and parameters. */
export type Biophysics = {
  __typename?: 'Biophysics';
  compartments: Array<Compartment>;
};

/** Input for a biophysics model, which consists of compartments, each with their own mechanisms and parameters. */
export type BiophysicsInput = {
  compartments?: Array<CompartmentInput>;
};

export type Block = {
  __typename?: 'Block';
  acquiredAt?: Maybe<Scalars['DateTime']['output']>;
  /** Who created this recording session */
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  /** The groups in this recording session */
  groups: Array<BlockGroup>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  /** The segments in this recording session */
  segments: Array<BlockSegment>;
  trace: Trace;
};


export type BlockGroupsArgs = {
  filters?: InputMaybe<BlockGroupFilter>;
  ordering?: Array<BlockGroupOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type BlockProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type BlockSegmentsArgs = {
  filters?: InputMaybe<BlockSegmentFilter>;
  ordering?: Array<BlockSegmentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Numeric/aggregatable fields of Block */
export enum BlockField {
  CreatedAt = 'CREATED_AT'
}

export type BlockFilter = {
  AND?: InputMaybe<BlockFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BlockFilter>;
  OR?: InputMaybe<BlockFilter>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<Scalars['ID']['input']>;
  createdByAgent?: InputMaybe<Scalars['Boolean']['input']>;
  createdWith?: InputMaybe<Scalars['String']['input']>;
  groups?: InputMaybe<Array<Scalars['ID']['input']>>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  label?: InputMaybe<StrFilterLookup>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
  provenanceRootTask?: InputMaybe<Scalars['String']['input']>;
  provenanceTask?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  trace?: InputMaybe<Scalars['ID']['input']>;
};

export type BlockGroup = {
  __typename?: 'BlockGroup';
  /** The analog signals in this group */
  analogSignals: Array<AnalogSignal>;
  block: Block;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** The irregularly sampled signals in this group */
  irregularlySampledSignals: Array<IrregularlySampledSignal>;
  name: Scalars['String']['output'];
  /** The spike trains in this group */
  spikeTrains: Array<SpikeTrain>;
};


export type BlockGroupAnalogSignalsArgs = {
  filters?: InputMaybe<AnalogSignalFilter>;
  ordering?: Array<AnalogSignalOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type BlockGroupIrregularlySampledSignalsArgs = {
  filters?: InputMaybe<IrregularlySampledSignalFilter>;
  ordering?: Array<IrregularlySampledSignalOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type BlockGroupSpikeTrainsArgs = {
  filters?: InputMaybe<SpikeTrainFilter>;
  ordering?: Array<SpikeTrainOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type BlockGroupFilter = {
  AND?: InputMaybe<BlockGroupFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BlockGroupFilter>;
  OR?: InputMaybe<BlockGroupFilter>;
  description?: InputMaybe<StrFilterLookup>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type BlockGroupOrder =
  { id: Ordering; };

export type BlockOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

export type BlockSegment = {
  __typename?: 'BlockSegment';
  /** The analog signals in this group */
  analogSignals: Array<AnalogSignal>;
  block: Block;
  /** Who created this segment */
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  endTime?: Maybe<Scalars['Duration']['output']>;
  /** The groups that this segment belongs to */
  groups: Array<BlockGroup>;
  id: Scalars['ID']['output'];
  /** The irregularly sampled signals in this group */
  irregularlySampledSignals: Array<IrregularlySampledSignal>;
  label: Scalars['String']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  /** The spike trains in this group */
  spikeTrains: Array<SpikeTrain>;
  startTime?: Maybe<Scalars['Duration']['output']>;
};


export type BlockSegmentAnalogSignalsArgs = {
  filters?: InputMaybe<AnalogSignalFilter>;
  ordering?: Array<AnalogSignalOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type BlockSegmentGroupsArgs = {
  filters?: InputMaybe<BlockGroupFilter>;
  ordering?: Array<BlockGroupOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type BlockSegmentIrregularlySampledSignalsArgs = {
  filters?: InputMaybe<IrregularlySampledSignalFilter>;
  ordering?: Array<IrregularlySampledSignalOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type BlockSegmentProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type BlockSegmentSpikeTrainsArgs = {
  filters?: InputMaybe<SpikeTrainFilter>;
  ordering?: Array<SpikeTrainOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type BlockSegmentFilter = {
  AND?: InputMaybe<BlockSegmentFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<BlockSegmentFilter>;
  OR?: InputMaybe<BlockSegmentFilter>;
  createdByAgent?: InputMaybe<Scalars['Boolean']['input']>;
  createdWith?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<StrFilterLookup>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  provenanceRootTask?: InputMaybe<Scalars['String']['input']>;
  provenanceTask?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type BlockSegmentInput = {
  analogSignals?: Array<AnalogSignalInput>;
  description?: InputMaybe<Scalars['String']['input']>;
  irregularlySampledSignals?: Array<IrregularlySampledSignalInput>;
  name?: InputMaybe<Scalars['String']['input']>;
  spikeTrains?: Array<SpikeTrainInput>;
};

export type BlockSegmentOrder =
  { id: Ordering; };

export type BlockStats = {
  __typename?: 'BlockStats';
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


export type BlockStatsAvgArgs = {
  field: BlockField;
};


export type BlockStatsDistinctCountArgs = {
  field: BlockField;
};


export type BlockStatsMaxArgs = {
  field: BlockField;
};


export type BlockStatsMinArgs = {
  field: BlockField;
};


export type BlockStatsSeriesArgs = {
  by: Granularity;
  field: BlockField;
  timestampField: BlockTimestampField;
};


export type BlockStatsSumArgs = {
  field: BlockField;
};

/** Datetime fields of Block for bucketing */
export enum BlockTimestampField {
  CreatedAt = 'CREATED_AT'
}

/** Represents a cell model, which consists of a biophysics model and a topology. You can think of the biophysics model as the 'properties' of the cell, and the topology as the 'structure' of the cell. */
export type Cell = {
  __typename?: 'Cell';
  /** The biophysics model of the cell, which defines the properties of the cell such as its compartments, mechanisms, and parameters. */
  biophysics: Biophysics;
  /** The unique identifier of the cell within the model. */
  id: Scalars['String']['output'];
  /** The topology of the cell, which defines the structure of the cell such as its morphology and connectivity. */
  topology: Topology;
};

/** Input for a cell model, which consists of a biophysics model and a topology. You can think of the biophysics model as the 'properties' of the cell, and the topology as the 'structure' of the cell. */
export type CellInput = {
  /** The biophysics model of the cell, which defines the properties of the cell such as its compartments, mechanisms, and parameters. */
  biophysics: BiophysicsInput;
  /** The unique identifier of the cell within the model. */
  id: Scalars['String']['input'];
  /** The topology of the cell, which defines the structure of the cell such as its morphology and connectivity. */
  topology: TopologyInput;
};

export type Change = {
  __typename?: 'Change';
  path: Array<Scalars['String']['output']>;
  type: ChangeType;
  valueA?: Maybe<Scalars['Any']['output']>;
  valueB?: Maybe<Scalars['Any']['output']>;
};

export type ChangeDatasetInput = {
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
};

export enum ChangeType {
  Added = 'ADDED',
  Changed = 'CHANGED',
  Removed = 'REMOVED'
}

export type Client = {
  __typename?: 'Client';
  clientId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  release?: Maybe<Release>;
};

export type Comparison = {
  __typename?: 'Comparison';
  changes: Array<Change>;
  collection: ModelCollection;
};

/** Represents a compartment in a biophysics model. */
export type Compartment = {
  __typename?: 'Compartment';
  /** An optional RGBA color (list of 4 values) used to render this compartment in the UI. */
  color?: Maybe<Scalars['RGBAColor']['output']>;
  /** The unique identifier of the compartment within the model. */
  id: Scalars['String']['output'];
  /** Ion species settings (reversal potentials and concentrations) applied to this compartment. */
  ions: Array<Ion>;
  /** The set of mechanisms active in this compartment. */
  mechanisms: Array<Scalars['String']['output']>;
  /** The mechanism-specific parameters applied to the sections of this compartment. */
  sectionParams: Array<SectionParamMap>;
};

/** Input for a compartment in a biophysics model. */
export type CompartmentInput = {
  /** An optional RGBA color (list of 4 values) used to render this compartment in the UI. */
  color?: InputMaybe<Scalars['RGBAColor']['input']>;
  /** The unique identifier of the compartment within the model. */
  id: Scalars['String']['input'];
  /** Ion species settings (reversal potentials and concentrations) applied to this compartment. */
  ions?: InputMaybe<Array<IonInput>>;
  /** The set of mechanisms active in this compartment. */
  mechanisms?: Array<Scalars['String']['input']>;
  /** The mechanism-specific parameters applied to the sections of this compartment. */
  sectionParams?: InputMaybe<Array<SectionParamMapInput>>;
};

/** Represents a connection of a section to its (single) parent section, defining the morphology tree. */
export type Connection = {
  __typename?: 'Connection';
  /** Which end of this section attaches to the parent: 0 (default) or 1. */
  childEnd: Scalars['Float']['output'];
  /** The ID of the parent section this section connects to. */
  parent: Scalars['String']['output'];
  /** The position along the parent section where this section attaches, between 0 and 1. */
  parentLocation: Scalars['Float']['output'];
};

/** Input for a connection of a section to its (single) parent section, defining the morphology tree. */
export type ConnectionInput = {
  /** Which end of this section attaches to the parent: 0 (default) or 1. */
  childEnd?: Scalars['Float']['input'];
  /** The ID of the parent section this section connects to. */
  parent: Scalars['String']['input'];
  /** The position along the parent section where this section attaches, between 0 and 1. */
  parentLocation?: Scalars['Float']['input'];
};

export enum ConnectionKind {
  Synapse = 'SYNAPSE'
}

/** Represents a 3D coordinate (in space) of a point along a section. */
export type Coord = {
  __typename?: 'Coord';
  /** The diameter of the section at this point (NEURON pt3d). Falls back to the section diameter when omitted. */
  diam?: Maybe<Scalars['Length']['output']>;
  /** The x coordinate of the point. */
  x: Scalars['Length']['output'];
  /** The y coordinate of the point. */
  y: Scalars['Length']['output'];
  /** The z coordinate of the point. */
  z: Scalars['Length']['output'];
};

/** Input for a 3D coordinate (in space) of a point along a section. */
export type CoordInput = {
  /** The diameter of the section at this point (NEURON pt3d). Falls back to the section diameter when omitted. */
  diam?: InputMaybe<Scalars['Length']['input']>;
  /** The x coordinate of the point. */
  x: Scalars['Length']['input'];
  /** The y coordinate of the point. */
  y: Scalars['Length']['input'];
  /** The z coordinate of the point. */
  z: Scalars['Length']['input'];
};

export type CreateBlockInput = {
  file?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  recordingTime?: InputMaybe<Scalars['DateTime']['input']>;
  segments?: Array<BlockSegmentInput>;
};

export type CreateDatasetInput = {
  name: Scalars['String']['input'];
};

export type CreateExperimentInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  recordingViews: Array<RecordingViewInput>;
  stimulusViews: Array<StimulusViewInput>;
  timeTrace?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateFileViewInput = {
  aMax?: InputMaybe<Scalars['Int']['input']>;
  aMin?: InputMaybe<Scalars['Int']['input']>;
  cMax?: InputMaybe<Scalars['Int']['input']>;
  cMin?: InputMaybe<Scalars['Int']['input']>;
  file: Scalars['ID']['input'];
  isGlobal?: Scalars['Boolean']['input'];
  seriesIdentifier?: InputMaybe<Scalars['String']['input']>;
  tMax?: InputMaybe<Scalars['Int']['input']>;
  tMin?: InputMaybe<Scalars['Int']['input']>;
  trace: Scalars['ID']['input'];
};

/** Input for creating a mod environment */
export type CreateModEnvironmentInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  mechanisms: Array<MechanismInput>;
  name: Scalars['String']['input'];
  zipFile: Scalars['BigFileLike']['input'];
};

export type CreateModelCollectionInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  models: Array<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
};

export type CreateModelWorkspaceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

export type CreateNeuronModelInput = {
  config: ModelConfigInput;
  description?: InputMaybe<Scalars['String']['input']>;
  environment?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  parent?: InputMaybe<Scalars['ID']['input']>;
};

export type CreateSimulationInput = {
  dt?: InputMaybe<Scalars['Duration']['input']>;
  duration: Scalars['Duration']['input'];
  model: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  recordings: Array<RecordingInput>;
  stimuli: Array<StimulusInput>;
  timeTrace?: InputMaybe<Scalars['ArrayLike']['input']>;
};

export type Dataset = {
  __typename?: 'Dataset';
  children: Array<Dataset>;
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  files: Array<File>;
  id: Scalars['ID']['output'];
  isDefault: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  /** The parent dataset of this dataset */
  parent?: Maybe<Dataset>;
  pinned: Scalars['Boolean']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  tags: Array<Scalars['String']['output']>;
  traces: Array<Trace>;
};


export type DatasetChildrenArgs = {
  filters?: InputMaybe<DatasetFilter>;
  ordering?: Array<DatasetOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type DatasetFilesArgs = {
  filters?: InputMaybe<FileFilter>;
  ordering?: Array<FileOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type DatasetProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type DatasetTracesArgs = {
  filters?: InputMaybe<TraceFilter>;
  ordering?: Array<TraceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type DatasetFilter = {
  AND?: InputMaybe<DatasetFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DatasetFilter>;
  OR?: InputMaybe<DatasetFilter>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<Scalars['ID']['input']>;
  createdByAgent?: InputMaybe<Scalars['Boolean']['input']>;
  createdWith?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StrFilterLookup>;
  parent?: InputMaybe<Scalars['ID']['input']>;
  parentless?: InputMaybe<Scalars['Boolean']['input']>;
  provenanceRootTask?: InputMaybe<Scalars['String']['input']>;
  provenanceTask?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type DatasetOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

export type DeleteBlockInput = {
  id: Scalars['ID']['input'];
};

export type DeleteDatasetInput = {
  id: Scalars['ID']['input'];
};

export type DeleteFileInput = {
  id: Scalars['ID']['input'];
};

/** Input for deleting an object by its id */
export type DeleteInput = {
  id: Scalars['ID']['input'];
};

export type DeleteMechanismInput = {
  id: Scalars['ID']['input'];
};

export type DeleteRoiInput = {
  id: Scalars['ID']['input'];
};

export type DeleteTraceInput = {
  id: Scalars['ID']['input'];
};

export type DesociateInput = {
  other: Scalars['ID']['input'];
  selfs: Array<Scalars['ID']['input']>;
};

/** Represents how a section parameter is distributed along a section (NEURON range variable). */
export type Distribution = {
  __typename?: 'Distribution';
  /** The value at the most distal segment (required for 'linear'). A unit-bearing quantity. */
  distalValue?: Maybe<Scalars['GenericQuantity']['output']>;
  /** An expression in `x` (normalized position) and `d` (path distance) (required for 'expression'). */
  expression?: Maybe<Scalars['String']['output']>;
  /** The kind of spatial distribution. */
  kind: DistributionKind;
  /** The value at path distance 0 (required for 'linear'). A unit-bearing quantity. */
  proximalValue?: Maybe<Scalars['GenericQuantity']['output']>;
  /** The uniform value applied to every segment (required for 'uniform'). A unit-bearing quantity, e.g. '0.12 S/cm2'. */
  value?: Maybe<Scalars['GenericQuantity']['output']>;
};

/** Input for how a section parameter is distributed along a section (NEURON range variable). Supply the fields matching the chosen kind: 'uniform' -> value; 'linear' -> proximal_value & distal_value; 'expression' -> expression. */
export type DistributionInput = {
  /** The value at the most distal segment (required for 'linear'). A unit-bearing quantity. */
  distalValue?: InputMaybe<Scalars['GenericQuantity']['input']>;
  /** An expression in `x` (normalized position) and `d` (path distance) (required for 'expression'). */
  expression?: InputMaybe<Scalars['String']['input']>;
  /** The kind of spatial distribution. */
  kind?: DistributionKind;
  /** The value at path distance 0 (required for 'linear'). A unit-bearing quantity. */
  proximalValue?: InputMaybe<Scalars['GenericQuantity']['input']>;
  /** The uniform value applied to every segment (required for 'uniform'). A unit-bearing quantity, e.g. '0.12 S/cm2'. */
  value?: InputMaybe<Scalars['GenericQuantity']['input']>;
};

export enum DistributionKind {
  Expression = 'EXPRESSION',
  Linear = 'LINEAR',
  Uniform = 'UNIFORM'
}

/** Represents an exponential synapse model, which is a type of synaptic stimulus that has an exponential rise and decay. This will be used to specify the parameters of synapses in the model. */
export type Exp2Synapse = NetSynapse & {
  __typename?: 'Exp2Synapse';
  /** The ID of the cell this synapse is located on. */
  cell: Scalars['String']['output'];
  /** Delay before the synapse activates. */
  delay?: Maybe<Scalars['Duration']['output']>;
  /** Reversal potential. */
  e: Scalars['ElectricPotential']['output'];
  /** The unique identifier of the synapse within the model. */
  id: Scalars['ID']['output'];
  /** The location on the cell where the synapse is located. This can be a section name, a segment number, or a more complex specification depending on the model. */
  location: Scalars['String']['output'];
  /** The position along the section where the synapse is located, specified as a value between 0 and 1. This is only relevant if the location is specified as a section name. */
  position: Scalars['Float']['output'];
  /** Rise time constant. */
  tau1: Scalars['Duration']['output'];
  /** Decay time constant. */
  tau2: Scalars['Duration']['output'];
};

export type Experiment = {
  __typename?: 'Experiment';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  recordingViews: Array<ExperimentRecordingView>;
  stimulusViews: Array<ExperimentStimulusView>;
  timeTrace: Trace;
};


export type ExperimentProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ExperimentRecordingViewsArgs = {
  filters?: InputMaybe<ExperimentRecordingViewFilter>;
  ordering?: Array<ExperimentRecordingViewOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type ExperimentStimulusViewsArgs = {
  filters?: InputMaybe<ExperimentStimulusViewFilter>;
  ordering?: Array<ExperimentStimulusViewOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ExperimentFilter = {
  AND?: InputMaybe<ExperimentFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ExperimentFilter>;
  OR?: InputMaybe<ExperimentFilter>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<Scalars['ID']['input']>;
  createdByAgent?: InputMaybe<Scalars['Boolean']['input']>;
  createdWith?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StrFilterLookup>;
  provenanceRootTask?: InputMaybe<Scalars['String']['input']>;
  provenanceTask?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ExperimentOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

export type ExperimentRecordingView = {
  __typename?: 'ExperimentRecordingView';
  duration?: Maybe<Scalars['Duration']['output']>;
  experiment: Experiment;
  id: Scalars['ID']['output'];
  label?: Maybe<Scalars['String']['output']>;
  offset?: Maybe<Scalars['Duration']['output']>;
  recording: Recording;
};

export type ExperimentRecordingViewFilter = {
  AND?: InputMaybe<ExperimentRecordingViewFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ExperimentRecordingViewFilter>;
  OR?: InputMaybe<ExperimentRecordingViewFilter>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  label?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ExperimentRecordingViewOrder =
  { id: Ordering; };

export type ExperimentStimulusView = {
  __typename?: 'ExperimentStimulusView';
  duration?: Maybe<Scalars['Duration']['output']>;
  experiment: Experiment;
  id: Scalars['ID']['output'];
  label?: Maybe<Scalars['String']['output']>;
  offset?: Maybe<Scalars['Duration']['output']>;
  stimulus: Stimulus;
};

export type ExperimentStimulusViewFilter = {
  AND?: InputMaybe<ExperimentStimulusViewFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ExperimentStimulusViewFilter>;
  OR?: InputMaybe<ExperimentStimulusViewFilter>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  label?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ExperimentStimulusViewOrder =
  { id: Ordering; };

export type File = {
  __typename?: 'File';
  /** The content type of the file */
  contentType?: Maybe<Scalars['String']['output']>;
  /** Who created this file */
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  origins: Array<Trace>;
  provenanceEntries: Array<ProvenanceEntry>;
  /** The size of the file in bytes */
  size?: Maybe<Scalars['Float']['output']>;
  store: BigFileStore;
  /** The file views of this file */
  views: Array<FileView>;
};


export type FileOriginsArgs = {
  filters?: InputMaybe<TraceFilter>;
  ordering?: Array<TraceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type FileProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type FileEvent = {
  __typename?: 'FileEvent';
  create?: Maybe<File>;
  delete?: Maybe<Scalars['ID']['output']>;
  moved?: Maybe<File>;
  update?: Maybe<File>;
};

export type FileFilter = {
  AND?: InputMaybe<FileFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<FileFilter>;
  OR?: InputMaybe<FileFilter>;
  contentType?: InputMaybe<StrFilterLookup>;
  createdBy?: InputMaybe<Scalars['ID']['input']>;
  createdByAgent?: InputMaybe<Scalars['Boolean']['input']>;
  createdWith?: InputMaybe<Scalars['String']['input']>;
  dataset?: InputMaybe<DatasetFilter>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StrFilterLookup>;
  provenanceRootTask?: InputMaybe<Scalars['String']['input']>;
  provenanceTask?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  size?: InputMaybe<IntFilterLookup>;
};

export type FileOrder =
  { createdAt: Ordering; id?: never; size?: never; }
  |  { createdAt?: never; id: Ordering; size?: never; }
  |  { createdAt?: never; id?: never; size: Ordering; };

export type FileView = View & {
  __typename?: 'FileView';
  /** The accessor */
  accessor: Array<Scalars['String']['output']>;
  cMax?: Maybe<Scalars['Int']['output']>;
  cMin?: Maybe<Scalars['Int']['output']>;
  file: File;
  id: Scalars['ID']['output'];
  image: Trace;
  isGlobal: Scalars['Boolean']['output'];
  seriesIdentifier?: Maybe<Scalars['String']['output']>;
  tMax?: Maybe<Scalars['Int']['output']>;
  tMin?: Maybe<Scalars['Int']['output']>;
  trace: Trace;
  xMax?: Maybe<Scalars['Int']['output']>;
  xMin?: Maybe<Scalars['Int']['output']>;
  yMax?: Maybe<Scalars['Int']['output']>;
  yMin?: Maybe<Scalars['Int']['output']>;
  zMax?: Maybe<Scalars['Int']['output']>;
  zMin?: Maybe<Scalars['Int']['output']>;
};

export type FinishBigFileUploadInput = {
  storeId: Scalars['String']['input'];
  valid?: Scalars['Boolean']['input'];
};

export type FinishMediaUploadInput = {
  storeId: Scalars['String']['input'];
  valid?: Scalars['Boolean']['input'];
};

export type FinishParquetUploadInput = {
  storeId: Scalars['String']['input'];
  valid?: Scalars['Boolean']['input'];
};

export type FinishZarrUploadInput = {
  storeId: Scalars['String']['input'];
  valid?: Scalars['Boolean']['input'];
};

export type FromFileLike = {
  dataset?: InputMaybe<Scalars['ID']['input']>;
  file: Scalars['FileLike']['input'];
  name: Scalars['String']['input'];
  origins?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Input type for creating an image from an array-like object */
export type FromTraceLikeInput = {
  /** The array-like object to create the image from */
  array: Scalars['ArrayLike']['input'];
  /** Optional dataset ID to associate the image with */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  /** The name of the image */
  name: Scalars['String']['input'];
  /** Optional list of tags to associate with the image */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

/** Temporary S3 credentials for reading a media object. */
export type GeneralMediaAccessGrant = {
  __typename?: 'GeneralMediaAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store?: Maybe<Scalars['String']['output']>;
};

/** Temporary S3 credentials for reading a parquet object. */
export type GeneralParquetAccessGrant = {
  __typename?: 'GeneralParquetAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store?: Maybe<Scalars['String']['output']>;
};

/** Temporary S3 credentials for reading a Zarr store. */
export type GeneralZarrAccessGrant = {
  __typename?: 'GeneralZarrAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store?: Maybe<Scalars['String']['output']>;
};

export enum Granularity {
  Day = 'DAY',
  Hour = 'HOUR',
  Month = 'MONTH',
  Quarter = 'QUARTER',
  Week = 'WEEK',
  Year = 'YEAR'
}

/** The type of change that was made. */
export enum HistoryKind {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

export type IntFilterLookup = {
  contains?: InputMaybe<Scalars['Int']['input']>;
  endsWith?: InputMaybe<Scalars['Int']['input']>;
  exact?: InputMaybe<Scalars['Int']['input']>;
  gt?: InputMaybe<Scalars['Int']['input']>;
  gte?: InputMaybe<Scalars['Int']['input']>;
  iContains?: InputMaybe<Scalars['Int']['input']>;
  iEndsWith?: InputMaybe<Scalars['Int']['input']>;
  iExact?: InputMaybe<Scalars['Int']['input']>;
  iRegex?: InputMaybe<Scalars['String']['input']>;
  iStartsWith?: InputMaybe<Scalars['Int']['input']>;
  inList?: InputMaybe<Array<Scalars['Int']['input']>>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['Int']['input']>;
  lte?: InputMaybe<Scalars['Int']['input']>;
  range?: InputMaybe<Array<Scalars['Int']['input']>>;
  regex?: InputMaybe<Scalars['String']['input']>;
  startsWith?: InputMaybe<Scalars['Int']['input']>;
};

/** Represents an ion species' intrinsic properties on a compartment (NEURON per-section ion settings, e.g. ena/nai/nao). */
export type Ion = {
  __typename?: 'Ion';
  /** The extracellular concentration for this ion (NEURON <ion>o, e.g. nao). */
  externalConcentration?: Maybe<Scalars['Concentration']['output']>;
  /** The intracellular concentration for this ion (NEURON <ion>i, e.g. nai). */
  internalConcentration?: Maybe<Scalars['Concentration']['output']>;
  /** The ion species name as NEURON knows it (e.g. 'na', 'k', 'ca'). Custom ions declared by mechanisms are allowed. */
  ion: Scalars['String']['output'];
  /** The reversal potential for this ion (NEURON e<ion>, e.g. ena). Unset leaves NEURON's default. */
  reversalPotential?: Maybe<Scalars['ElectricPotential']['output']>;
  /** How the reversal potential and concentrations are treated (NEURON ion_style): a fixed reversal parameter, computed from fixed concentrations via Nernst, or with concentrations as states advanced by an accumulation mechanism. */
  style: IonStyle;
};

/** Input for an ion species' intrinsic properties on a compartment (NEURON per-section ion settings, e.g. ena/nai/nao). */
export type IonInput = {
  /** The extracellular concentration for this ion (NEURON <ion>o, e.g. nao). */
  externalConcentration?: InputMaybe<Scalars['Concentration']['input']>;
  /** The intracellular concentration for this ion (NEURON <ion>i, e.g. nai). */
  internalConcentration?: InputMaybe<Scalars['Concentration']['input']>;
  /** The ion species name as NEURON knows it (e.g. 'na', 'k', 'ca'). Custom ions declared by mechanisms are allowed. */
  ion: Scalars['String']['input'];
  /** The reversal potential for this ion (NEURON e<ion>, e.g. ena). Unset leaves NEURON's default. */
  reversalPotential?: InputMaybe<Scalars['ElectricPotential']['input']>;
  /** How the reversal potential and concentrations are treated (NEURON ion_style): a fixed reversal parameter, computed from fixed concentrations via Nernst, or with concentrations as states advanced by an accumulation mechanism. */
  style?: IonStyle;
};

export enum IonStyle {
  Accumulated = 'ACCUMULATED',
  FixedReversal = 'FIXED_REVERSAL',
  Nernst = 'NERNST'
}

export type IrregularlySampledSignal = Signal & {
  __typename?: 'IrregularlySampledSignal';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  segment: BlockSegment;
  trace: Trace;
  unit?: Maybe<Scalars['String']['output']>;
};


export type IrregularlySampledSignalProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type IrregularlySampledSignalFilter = {
  AND?: InputMaybe<IrregularlySampledSignalFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<IrregularlySampledSignalFilter>;
  OR?: InputMaybe<IrregularlySampledSignalFilter>;
  createdByAgent?: InputMaybe<Scalars['Boolean']['input']>;
  createdWith?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  label?: InputMaybe<StrFilterLookup>;
  provenanceRootTask?: InputMaybe<Scalars['String']['input']>;
  provenanceTask?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  session?: InputMaybe<Scalars['ID']['input']>;
};

export type IrregularlySampledSignalInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  times: Scalars['TraceLike']['input'];
  trace: Scalars['TraceLike']['input'];
  unit?: InputMaybe<Scalars['String']['input']>;
};

export type IrregularlySampledSignalOrder =
  { id: Ordering; };

export type Mechanism = {
  __typename?: 'Mechanism';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** The parameter ports of the mechanism */
  parameters: Array<Parameter>;
};

export type MechanismFilter = {
  AND?: InputMaybe<MechanismFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<MechanismFilter>;
  OR?: InputMaybe<MechanismFilter>;
  description?: InputMaybe<StrFilterLookup>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

/** Represents a GLOBAL mechanism parameter (NEURON GLOBAL variable, e.g. q10_hh) — shared across every instance of the mechanism, set once at the model level. */
export type MechanismGlobalParam = {
  __typename?: 'MechanismGlobalParam';
  /** Description of the parameter */
  description?: Maybe<Scalars['String']['output']>;
  /** The mechanism that owns this GLOBAL parameter (e.g. 'hh'). */
  mechanism: Scalars['String']['output'];
  /** The name of the GLOBAL parameter to set (e.g. 'q10'). */
  param: Scalars['String']['output'];
  /** The value of the parameter, as a unit-bearing quantity (e.g. '2 dimensionless', '10 mV'). */
  value: Scalars['GenericQuantity']['output'];
};

/** Input for a GLOBAL mechanism parameter (NEURON GLOBAL variable, e.g. q10_hh) — shared across every instance of the mechanism, set once at the model level. */
export type MechanismGlobalParamInput = {
  /** Description of the parameter */
  description?: InputMaybe<Scalars['String']['input']>;
  /** The mechanism that owns this GLOBAL parameter (e.g. 'hh'). */
  mechanism: Scalars['String']['input'];
  /** The name of the GLOBAL parameter to set (e.g. 'q10'). */
  param: Scalars['String']['input'];
  /** The value of the parameter, as a unit-bearing quantity (e.g. '2 dimensionless', '10 mV'). */
  value: Scalars['GenericQuantity']['input'];
};

/** Input for creating a mechanism */
export type MechanismInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  parameters: Array<ParameterInput>;
};

export type MechanismOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

/** Temporary S3 credentials for reading a media object. */
export type MediaAccessGrant = {
  __typename?: 'MediaAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store?: Maybe<Scalars['String']['output']>;
};

export type MediaStore = {
  __typename?: 'MediaStore';
  /** Get temporary S3 read credentials for the media object. */
  accessGrant: MediaAccessGrant;
  bucket: Scalars['String']['output'];
  contentType?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  /** Compatibility field returning the canonical S3 object path. */
  presignedUrl: Scalars['String']['output'];
};


export type MediaStoreAccessGrantArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};


export type MediaStorePresignedUrlArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};

/** A presigned PUT grant for uploading a media object. */
export type MediaUploadGrant = {
  __typename?: 'MediaUploadGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  maxBytes: Scalars['Int']['output'];
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store: Scalars['String']['output'];
  uploadContentType?: Maybe<Scalars['String']['output']>;
  uploadFileName: Scalars['String']['output'];
  uploadFormField: Scalars['String']['output'];
};

export type ModEnvironment = {
  __typename?: 'ModEnvironment';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  mechanisms: Array<Mechanism>;
  name: Scalars['String']['output'];
  store: BigFileStore;
};


export type ModEnvironmentMechanismsArgs = {
  filters?: InputMaybe<MechanismFilter>;
  ordering?: Array<MechanismOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ModEnvironmentFilter = {
  AND?: InputMaybe<ModEnvironmentFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ModEnvironmentFilter>;
  OR?: InputMaybe<ModEnvironmentFilter>;
  description?: InputMaybe<StrFilterLookup>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ModEnvironmentOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

/** A change made to a model. */
export type ModelChange = {
  __typename?: 'ModelChange';
  /** The field that was changed. */
  field: Scalars['String']['output'];
  /** The new value of the field. */
  newValue?: Maybe<Scalars['String']['output']>;
  /** The old value of the field. */
  oldValue?: Maybe<Scalars['String']['output']>;
};

export type ModelCollection = {
  __typename?: 'ModelCollection';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  models: Array<NeuronModel>;
  name: Scalars['String']['output'];
};


export type ModelCollectionModelsArgs = {
  filters?: InputMaybe<NeuronModelFilter>;
  ordering?: Array<NeuronModelOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ModelCollectionFilter = {
  AND?: InputMaybe<ModelCollectionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ModelCollectionFilter>;
  OR?: InputMaybe<ModelCollectionFilter>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ModelCollectionOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

/** Represents the configuration for the model. */
export type ModelConfig = {
  __typename?: 'ModelConfig';
  /** The list of cells in the model. */
  cells: Array<Cell>;
  /** Model-wide default specific membrane capacitance (NEURON cm). A section's own cm overrides this; unset falls back to NEURON's built-in 1 µF/cm². */
  cm?: Maybe<Scalars['SpecificCapacitance']['output']>;
  /** Model-wide default ion settings (reversal potentials / concentrations). A compartment's own ions override these by ion name. */
  ions: Array<Ion>;
  /** An optional label for the model configuration. */
  label?: Maybe<Scalars['String']['output']>;
  /** GLOBAL mechanism parameters (NEURON GLOBAL variables, e.g. q10_hh), shared across every instance of the mechanism. */
  mechanismGlobals: Array<MechanismGlobalParam>;
  /** The list of net connections in the model. */
  netConnections?: Maybe<Array<NetConnection>>;
  /** The list of net stimulators in the model. */
  netStimulators?: Maybe<Array<NetStimulator>>;
  /** The list of net synapses in the model. */
  netSynapses?: Maybe<Array<NetSynapse>>;
  /** Model-wide default axial resistivity (NEURON Ra). A section's own ra overrides this; unset falls back to NEURON's built-in 35.4 Ω·cm. */
  ra?: Maybe<Scalars['Resistivity']['output']>;
  /** Simulation bath temperature. */
  temperature: Scalars['Temperature']['output'];
  /** Initial membrane potential. */
  vInit: Scalars['ElectricPotential']['output'];
};

/** Input for the configuration of a model. */
export type ModelConfigInput = {
  /** The list of cells in the model. */
  cells?: Array<CellInput>;
  /** Model-wide default specific membrane capacitance (NEURON cm). A section's own cm overrides this; unset falls back to NEURON's built-in 1 µF/cm². */
  cm?: InputMaybe<Scalars['SpecificCapacitance']['input']>;
  /** Model-wide default ion settings (reversal potentials / concentrations). A compartment's own ions override these by ion name. */
  ions?: InputMaybe<Array<IonInput>>;
  /** An optional label for the model configuration. */
  label?: InputMaybe<Scalars['String']['input']>;
  /** GLOBAL mechanism parameters (NEURON GLOBAL variables, e.g. q10_hh), shared across every instance of the mechanism. */
  mechanismGlobals?: InputMaybe<Array<MechanismGlobalParamInput>>;
  /** The list of net connections in the model. */
  netConnections?: InputMaybe<Array<NetConnectionInput>>;
  /** The list of net stimulators in the model. */
  netStimulators?: InputMaybe<Array<NetStimulatorInput>>;
  /** The list of net synapses in the model. */
  netSynapses?: InputMaybe<Array<NetSynapseInput>>;
  /** Model-wide default axial resistivity (NEURON Ra). A section's own ra overrides this; unset falls back to NEURON's built-in 35.4 Ω·cm. */
  ra?: InputMaybe<Scalars['Resistivity']['input']>;
  /** Simulation bath temperature. */
  temperature?: Scalars['Temperature']['input'];
  /** Initial membrane potential. */
  vInit?: Scalars['ElectricPotential']['input'];
};

export type ModelWorkspace = {
  __typename?: 'ModelWorkspace';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  mappings: Array<WorkspaceMapping>;
  name: Scalars['String']['output'];
  /** Whether the current user has pinned this workspace */
  pinned: Scalars['Boolean']['output'];
};


export type ModelWorkspaceMappingsArgs = {
  filters?: InputMaybe<WorkspaceMappingFilter>;
  ordering?: Array<WorkspaceMappingOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type ModelWorkspaceFilter = {
  AND?: InputMaybe<ModelWorkspaceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ModelWorkspaceFilter>;
  OR?: InputMaybe<ModelWorkspaceFilter>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type ModelWorkspaceOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

export type Mutation = {
  __typename?: 'Mutation';
  /** Add neuron models to a workspace (optionally into a group) */
  addModelsToWorkspace: ModelWorkspace;
  /** Create a new block */
  createBlock: Block;
  /** Create a new dataset to organize data */
  createDataset: Dataset;
  /** Create a new experiment */
  createExperiment: Experiment;
  /** Create a file view linking a file to a trace */
  createFileView: FileView;
  /** Create a mechanism from a mod file */
  createModEnvironment: ModEnvironment;
  /** Create a new model collection */
  createModelCollection: ModelCollection;
  /** Create a new model workspace */
  createModelWorkspace: ModelWorkspace;
  /** Create a new neuron model */
  createNeuronModel: NeuronModel;
  /** Create a new region of interest */
  createRoi: Roi;
  /** Create a new simulsation */
  createSimulation: Simulation;
  /** Delete an existing analog signal */
  deleteAnalogSignal: Scalars['ID']['output'];
  /** Delete an existing analog signal channel */
  deleteAnalogSignalChannel: Scalars['ID']['output'];
  /** Delete an existing block */
  deleteBlock: Scalars['ID']['output'];
  /** Delete an existing block group */
  deleteBlockGroup: Scalars['ID']['output'];
  /** Delete an existing block segment */
  deleteBlockSegment: Scalars['ID']['output'];
  /** Delete an existing dataset */
  deleteDataset: Scalars['ID']['output'];
  /** Delete an existing experiment */
  deleteExperiment: Scalars['ID']['output'];
  /** Delete an existing experiment recording view */
  deleteExperimentRecordingView: Scalars['ID']['output'];
  /** Delete an existing experiment stimulus view */
  deleteExperimentStimulusView: Scalars['ID']['output'];
  /** Delete an existing file */
  deleteFile: Scalars['ID']['output'];
  /** Delete an existing file view */
  deleteFileView: Scalars['ID']['output'];
  /** Delete an existing image */
  deleteImage: Scalars['ID']['output'];
  /** Delete an existing instrument */
  deleteInstrument: Scalars['ID']['output'];
  /** Delete an existing irregularly sampled signal */
  deleteIrregularlySampledSignal: Scalars['ID']['output'];
  /** Delete an existing mechanism */
  deleteMechanism: Scalars['ID']['output'];
  /** Delete an existing mod environment */
  deleteModEnvironment: Scalars['ID']['output'];
  /** Delete an existing model collection */
  deleteModelCollection: Scalars['ID']['output'];
  /** Delete an existing model workspace */
  deleteModelWorkspace: Scalars['ID']['output'];
  /** Delete an existing neuron model */
  deleteNeuronModel: Scalars['ID']['output'];
  /** Delete an existing recording */
  deleteRecording: Scalars['ID']['output'];
  /** Delete an existing region of interest */
  deleteRoi: Scalars['ID']['output'];
  /** Delete an existing simulation */
  deleteSimulation: Scalars['ID']['output'];
  /** Delete an existing spike train */
  deleteSpikeTrain: Scalars['ID']['output'];
  /** Delete an existing stimulus */
  deleteStimulus: Scalars['ID']['output'];
  /** Delete an existing timeline view */
  deleteTimelineView: Scalars['ID']['output'];
  /** Delete an existing view collection */
  deleteViewCollection: Scalars['ID']['output'];
  /** Delete an existing workspace mapping */
  deleteWorkspaceMapping: Scalars['ID']['output'];
  /** Finalize a big file upload after the client has written the object */
  finishBigfileUpload: BigFileStore;
  /** Finalize a media upload after the client has written the object */
  finishMediaUpload: MediaStore;
  /** Finalize a Parquet upload after the client has written the object */
  finishParquetUpload: ParquetStore;
  /** Finalize a Zarr upload after the client has written the object */
  finishZarrUpload: ZarrStore;
  /** Create a file from file-like data */
  fromFileLike: File;
  /** Create an image from array-like data */
  fromTraceLike: Trace;
  /** Pin a dataset for quick access */
  pinDataset: Dataset;
  /** Pin an image for quick access */
  pinImage: Trace;
  /** Pin or unpin a model workspace for the current user */
  pinModelWorkspace: ModelWorkspace;
  /** Pin a region of interest for quick access */
  pinRoi: Roi;
  /** Add datasets as children of another dataset */
  putDatasetsInDataset: Dataset;
  /** Add files to a dataset */
  putFilesInDataset: Dataset;
  /** Add images to a dataset */
  putImagesInDataset: Dataset;
  /** Remove datasets from being children of another dataset */
  releaseDatasetsFromDataset: Dataset;
  /** Remove files from a dataset */
  releaseFilesFromDataset: Dataset;
  /** Remove images from a dataset */
  releaseImagesFromDataset: Dataset;
  /** Remove neuron models from a workspace */
  removeModelsFromWorkspace: ModelWorkspace;
  /** Request temporary S3 read credentials for a big file */
  requestBigfileAccess: BigFileAccessGrant;
  /** Request an upload grant for a big file store */
  requestBigfileUpload: BigFileUploadGrant;
  /** Request temporary S3 read credentials for media files in the organization */
  requestGeneralMediaAccess: GeneralMediaAccessGrant;
  /** Request temporary S3 read credentials for Parquet files in the organization */
  requestGeneralParquetAccess: GeneralParquetAccessGrant;
  /** Request temporary S3 read credentials for Zarr stores in the organization */
  requestGeneralZarrAccess: GeneralZarrAccessGrant;
  /** Request temporary S3 read credentials for a media file */
  requestMediaAccess: MediaAccessGrant;
  /** Upload media and return a URL for access */
  requestMediaUpload: MediaUploadGrant;
  /** Request temporary S3 read credentials for a Parquet file */
  requestParquetAccess: ParquetAccessGrant;
  /** Request an upload grant for a Parquet store */
  requestParquetUpload: ParquetUploadGrant;
  /** Request temporary S3 read credentials for a Zarr store */
  requestZarrAccess: ZarrAccessGrant;
  /** Request an upload grant for a Zarr store */
  requestZarrUpload: ZarrUploadGrant;
  /** Revert dataset to a previous version */
  revertDataset: Dataset;
  /** Update dataset metadata */
  updateDataset: Dataset;
  /** Update an existing image's metadata */
  updateImage: Trace;
  /** Update an existing model workspace */
  updateModelWorkspace: ModelWorkspace;
  /** Update an existing region of interest */
  updateRoi: Roi;
  /** Update a workspace mapping (e.g. change its group) */
  updateWorkspaceMapping: WorkspaceMapping;
};


export type MutationAddModelsToWorkspaceArgs = {
  input: AddModelsToWorkspaceInput;
};


export type MutationCreateBlockArgs = {
  input: CreateBlockInput;
};


export type MutationCreateDatasetArgs = {
  input: CreateDatasetInput;
};


export type MutationCreateExperimentArgs = {
  input: CreateExperimentInput;
};


export type MutationCreateFileViewArgs = {
  input: CreateFileViewInput;
};


export type MutationCreateModEnvironmentArgs = {
  input: CreateModEnvironmentInput;
};


export type MutationCreateModelCollectionArgs = {
  input: CreateModelCollectionInput;
};


export type MutationCreateModelWorkspaceArgs = {
  input: CreateModelWorkspaceInput;
};


export type MutationCreateNeuronModelArgs = {
  input: CreateNeuronModelInput;
};


export type MutationCreateRoiArgs = {
  input: RoiInput;
};


export type MutationCreateSimulationArgs = {
  input: CreateSimulationInput;
};


export type MutationDeleteAnalogSignalArgs = {
  input: DeleteInput;
};


export type MutationDeleteAnalogSignalChannelArgs = {
  input: DeleteInput;
};


export type MutationDeleteBlockArgs = {
  input: DeleteBlockInput;
};


export type MutationDeleteBlockGroupArgs = {
  input: DeleteInput;
};


export type MutationDeleteBlockSegmentArgs = {
  input: DeleteInput;
};


export type MutationDeleteDatasetArgs = {
  input: DeleteDatasetInput;
};


export type MutationDeleteExperimentArgs = {
  input: DeleteInput;
};


export type MutationDeleteExperimentRecordingViewArgs = {
  input: DeleteInput;
};


export type MutationDeleteExperimentStimulusViewArgs = {
  input: DeleteInput;
};


export type MutationDeleteFileArgs = {
  input: DeleteFileInput;
};


export type MutationDeleteFileViewArgs = {
  input: DeleteInput;
};


export type MutationDeleteImageArgs = {
  input: DeleteTraceInput;
};


export type MutationDeleteInstrumentArgs = {
  input: DeleteInput;
};


export type MutationDeleteIrregularlySampledSignalArgs = {
  input: DeleteInput;
};


export type MutationDeleteMechanismArgs = {
  input: DeleteMechanismInput;
};


export type MutationDeleteModEnvironmentArgs = {
  input: DeleteInput;
};


export type MutationDeleteModelCollectionArgs = {
  input: DeleteInput;
};


export type MutationDeleteModelWorkspaceArgs = {
  input: DeleteInput;
};


export type MutationDeleteNeuronModelArgs = {
  input: DeleteInput;
};


export type MutationDeleteRecordingArgs = {
  input: DeleteInput;
};


export type MutationDeleteRoiArgs = {
  input: DeleteRoiInput;
};


export type MutationDeleteSimulationArgs = {
  input: DeleteInput;
};


export type MutationDeleteSpikeTrainArgs = {
  input: DeleteInput;
};


export type MutationDeleteStimulusArgs = {
  input: DeleteInput;
};


export type MutationDeleteTimelineViewArgs = {
  input: DeleteInput;
};


export type MutationDeleteViewCollectionArgs = {
  input: DeleteInput;
};


export type MutationDeleteWorkspaceMappingArgs = {
  input: DeleteInput;
};


export type MutationFinishBigfileUploadArgs = {
  input: FinishBigFileUploadInput;
};


export type MutationFinishMediaUploadArgs = {
  input: FinishMediaUploadInput;
};


export type MutationFinishParquetUploadArgs = {
  input: FinishParquetUploadInput;
};


export type MutationFinishZarrUploadArgs = {
  input: FinishZarrUploadInput;
};


export type MutationFromFileLikeArgs = {
  input: FromFileLike;
};


export type MutationFromTraceLikeArgs = {
  input: FromTraceLikeInput;
};


export type MutationPinDatasetArgs = {
  input: PinDatasetInput;
};


export type MutationPinImageArgs = {
  input: PinImageInput;
};


export type MutationPinModelWorkspaceArgs = {
  input: PinModelWorkspaceInput;
};


export type MutationPinRoiArgs = {
  input: PinRoiInput;
};


export type MutationPutDatasetsInDatasetArgs = {
  input: AssociateInput;
};


export type MutationPutFilesInDatasetArgs = {
  input: AssociateInput;
};


export type MutationPutImagesInDatasetArgs = {
  input: AssociateInput;
};


export type MutationReleaseDatasetsFromDatasetArgs = {
  input: DesociateInput;
};


export type MutationReleaseFilesFromDatasetArgs = {
  input: DesociateInput;
};


export type MutationReleaseImagesFromDatasetArgs = {
  input: DesociateInput;
};


export type MutationRemoveModelsFromWorkspaceArgs = {
  input: DesociateInput;
};


export type MutationRequestBigfileAccessArgs = {
  input: RequestBigFileAccessInput;
};


export type MutationRequestBigfileUploadArgs = {
  input: RequestBigFileUploadInput;
};


export type MutationRequestGeneralMediaAccessArgs = {
  input: RequestGeneralMediaAccessInput;
};


export type MutationRequestGeneralParquetAccessArgs = {
  input: RequestGeneralParquetAccessInput;
};


export type MutationRequestGeneralZarrAccessArgs = {
  input: RequestGeneralZarrAccessInput;
};


export type MutationRequestMediaAccessArgs = {
  input: RequestMediaAccessInput;
};


export type MutationRequestMediaUploadArgs = {
  input: RequestMediaUploadInput;
};


export type MutationRequestParquetAccessArgs = {
  input: RequestParquetAccessInput;
};


export type MutationRequestParquetUploadArgs = {
  input: RequestParquetUploadInput;
};


export type MutationRequestZarrAccessArgs = {
  input: RequestZarrAccessInput;
};


export type MutationRequestZarrUploadArgs = {
  input: RequestZarrUploadInput;
};


export type MutationRevertDatasetArgs = {
  input: RevertInput;
};


export type MutationUpdateDatasetArgs = {
  input: ChangeDatasetInput;
};


export type MutationUpdateImageArgs = {
  input: UpdateTraceInput;
};


export type MutationUpdateModelWorkspaceArgs = {
  input: UpdateModelWorkspaceInput;
};


export type MutationUpdateRoiArgs = {
  input: UpdateRoiInput;
};


export type MutationUpdateWorkspaceMappingArgs = {
  input: UpdateWorkspaceMappingInput;
};

/** Base class for net connection parameters. */
export type NetConnection = {
  /** The delay for the connection. */
  delay?: Maybe<Scalars['Duration']['output']>;
  /** The unique identifier of the connection within the model. */
  id: Scalars['ID']['output'];
  /** The threshold for the connection. */
  threshold?: Maybe<Scalars['ElectricPotential']['output']>;
  /** The weight (conductance) of the connection. */
  weight?: Maybe<Scalars['ElectricalConductance']['output']>;
};

/** Input for a synaptic connection between two cells in the model. Each connection has a pre-synaptic cell (the net stimulator) and a post-synaptic cell (the synapse). */
export type NetConnectionInput = {
  /** The delay for the connection. */
  delay?: InputMaybe<Scalars['Duration']['input']>;
  /** The unique identifier of the connection within the model. */
  id: Scalars['ID']['input'];
  /** The kind of connection to create. */
  kind?: ConnectionKind;
  /** The ID of the net stimulator that is the pre-synaptic cell in this connection. */
  netStimulator: Scalars['ID']['input'];
  /** The ID of the synapse that is the post-synaptic cell in this connection. */
  synapse: Scalars['ID']['input'];
  /** The threshold for the connection. */
  threshold?: InputMaybe<Scalars['ElectricPotential']['input']>;
  /** The weight (conductance) of the connection. */
  weight?: InputMaybe<Scalars['ElectricalConductance']['input']>;
};

/** Represents a net stimulator in the model. This will be used to specify the parameters of stimulators in the model. */
export type NetStimulator = {
  __typename?: 'NetStimulator';
  /** The unique identifier of the stimulator within the model. */
  id: Scalars['ID']['output'];
  /** Interval between spikes. */
  interval?: Maybe<Scalars['Duration']['output']>;
  /** Number of spikes to emit. */
  number: Scalars['Int']['output'];
  /** Start time of the first spike. */
  start: Scalars['Duration']['output'];
};

/** Input for a net stimulator in the model. This specifies the parameters of stimulators that drive synaptic connections. */
export type NetStimulatorInput = {
  /** The unique identifier of the stimulator within the model. */
  id: Scalars['ID']['input'];
  /** Interval between spikes. */
  interval?: InputMaybe<Scalars['Duration']['input']>;
  /** Number of spikes to emit. */
  number?: Scalars['Int']['input'];
  /** Start time of the first spike. */
  start?: Scalars['Duration']['input'];
};

/** Base class for synaptic stimulus parameters. */
export type NetSynapse = {
  /** The ID of the cell this synapse is located on. */
  cell: Scalars['String']['output'];
  /** The unique identifier of the synapse within the model. */
  id: Scalars['ID']['output'];
  /** The location on the cell where the synapse is located. This can be a section name, a segment number, or a more complex specification depending on the model. */
  location: Scalars['String']['output'];
  /** The position along the section where the synapse is located, specified as a value between 0 and 1. This is only relevant if the location is specified as a section name. */
  position: Scalars['Float']['output'];
};

/** Input for an exponential synapse, a synaptic stimulus with an exponential rise and decay. This specifies the parameters of synapses in the model. */
export type NetSynapseInput = {
  /** The ID of the cell this synapse is located on. */
  cell: Scalars['ID']['input'];
  /** Reversal potential. */
  e: Scalars['ElectricPotential']['input'];
  /** The unique identifier of the synapse within the model. */
  id: Scalars['ID']['input'];
  /** The kind of synapse model to use. */
  kind?: SynapseKind;
  /** The location on the cell where the synapse is located. This can be a section name, a segment number, or a more complex specification depending on the model. */
  location: Scalars['ID']['input'];
  /** The position along the section where the synapse is located, specified as a value between 0 and 1. This is only relevant if the location is specified as a section name. */
  position?: Scalars['Float']['input'];
  /** Rise time constant. */
  tau1: Scalars['Duration']['input'];
  /** Decay time constant. */
  tau2: Scalars['Duration']['input'];
};

export type NeuronModel = {
  __typename?: 'NeuronModel';
  changes: Array<Change>;
  comparisons: Array<Comparison>;
  config: ModelConfig;
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  environment: ModEnvironment;
  id: Scalars['ID']['output'];
  mappings: Array<WorkspaceMapping>;
  modelCollections?: Maybe<Array<ModelCollection>>;
  name: Scalars['String']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  sectionDominance: Array<SectionDominance>;
  simulations: Array<Simulation>;
};


export type NeuronModelChangesArgs = {
  to?: InputMaybe<Scalars['ID']['input']>;
};


export type NeuronModelMappingsArgs = {
  filters?: InputMaybe<WorkspaceMappingFilter>;
  ordering?: Array<WorkspaceMappingOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type NeuronModelModelCollectionsArgs = {
  filters?: InputMaybe<ModelCollectionFilter>;
  ordering?: Array<ModelCollectionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type NeuronModelProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type NeuronModelSectionDominanceArgs = {
  referenceCell?: InputMaybe<Scalars['ID']['input']>;
  referenceSection?: InputMaybe<Scalars['ID']['input']>;
  weightAxial?: InputMaybe<Scalars['Float']['input']>;
  weightCapacitance?: InputMaybe<Scalars['Float']['input']>;
  weightConductance?: InputMaybe<Scalars['Float']['input']>;
};


export type NeuronModelSimulationsArgs = {
  filters?: InputMaybe<SimulationFilter>;
  ordering?: Array<SimulationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type NeuronModelFilter = {
  AND?: InputMaybe<NeuronModelFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<NeuronModelFilter>;
  OR?: InputMaybe<NeuronModelFilter>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<Scalars['ID']['input']>;
  createdByAgent?: InputMaybe<Scalars['Boolean']['input']>;
  createdWith?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StrFilterLookup>;
  provenanceRootTask?: InputMaybe<Scalars['String']['input']>;
  provenanceTask?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type NeuronModelOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

export type OffsetPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: Scalars['Int']['input'];
};

export enum Ordering {
  Asc = 'ASC',
  AscNullsFirst = 'ASC_NULLS_FIRST',
  AscNullsLast = 'ASC_NULLS_LAST',
  Desc = 'DESC',
  DescNullsFirst = 'DESC_NULLS_FIRST',
  DescNullsLast = 'DESC_NULLS_LAST'
}

export type Organization = {
  __typename?: 'Organization';
  id: Scalars['ID']['output'];
  slug: Scalars['String']['output'];
};

/** A parameter port of a mechanism */
export type Parameter = {
  __typename?: 'Parameter';
  default?: Maybe<Scalars['Any']['output']>;
  description?: Maybe<Scalars['String']['output']>;
  dimension?: Maybe<Scalars['Dimension']['output']>;
  key: Scalars['String']['output'];
  kind: ParameterKind;
  label?: Maybe<Scalars['String']['output']>;
  nullable: Scalars['Boolean']['output'];
  proposedUnits?: Maybe<Array<Scalars['Unit']['output']>>;
  referenceUnit?: Maybe<Scalars['Unit']['output']>;
};

/** A parameter port of a mechanism */
export type ParameterInput = {
  default?: InputMaybe<Scalars['Any']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  dimension?: InputMaybe<Scalars['Dimension']['input']>;
  key: Scalars['String']['input'];
  kind?: ParameterKind;
  label?: InputMaybe<Scalars['String']['input']>;
  nullable?: Scalars['Boolean']['input'];
  proposedUnits?: InputMaybe<Array<Scalars['Unit']['input']>>;
  referenceUnit?: InputMaybe<Scalars['Unit']['input']>;
};

/** The kind of a mechanism parameter. */
export enum ParameterKind {
  Bool = 'BOOL',
  Float = 'FLOAT',
  Int = 'INT',
  String = 'STRING'
}

/** Temporary S3 credentials for reading a parquet object. */
export type ParquetAccessGrant = {
  __typename?: 'ParquetAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store?: Maybe<Scalars['String']['output']>;
};

export type ParquetStore = {
  __typename?: 'ParquetStore';
  /** Get temporary S3 read credentials for the parquet object. */
  accessGrant: ParquetAccessGrant;
  bucket: Scalars['String']['output'];
  contentType?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  /** Compatibility field returning the canonical S3 object path. */
  presignedUrl: Scalars['String']['output'];
};


export type ParquetStoreAccessGrantArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};


export type ParquetStorePresignedUrlArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};

/** Temporary S3 credentials for uploading a parquet store. */
export type ParquetUploadGrant = {
  __typename?: 'ParquetUploadGrant';
  accessKey: Scalars['String']['output'];
  action: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  maxBytes: Scalars['Int']['output'];
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store: Scalars['String']['output'];
  uploadContentType?: Maybe<Scalars['String']['output']>;
  uploadFileName: Scalars['String']['output'];
  uploadFormField: Scalars['String']['output'];
};

export type PinDatasetInput = {
  id: Scalars['ID']['input'];
  pin: Scalars['Boolean']['input'];
};

export type PinImageInput = {
  id: Scalars['ID']['input'];
  pin: Scalars['Boolean']['input'];
};

export type PinModelWorkspaceInput = {
  id: Scalars['ID']['input'];
  pin: Scalars['Boolean']['input'];
};

export type PinRoiInput = {
  id: Scalars['ID']['input'];
  pin: Scalars['Boolean']['input'];
};

/** A provenance event for a model. */
export type ProvenanceEntry = {
  __typename?: 'ProvenanceEntry';
  client?: Maybe<Client>;
  /** The date of the change. */
  date: Scalars['DateTime']['output'];
  /** The effective changes made to the model. */
  effectiveChanges: Array<ModelChange>;
  /** The ID of the history entry. */
  id: Scalars['ID']['output'];
  /** The type of change that was made. */
  kind: HistoryKind;
  /** The task during which the change occurred, if any. */
  task?: Maybe<Task>;
  /** User who made the change. */
  user?: Maybe<User>;
};

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Returns a list of images */
  analogSignal: AnalogSignal;
  /** Returns a list of images */
  analogSignalChannel: AnalogSignalChannel;
  analogSignalChannels: Array<AnalogSignalChannel>;
  analogSignals: Array<AnalogSignal>;
  block: Block;
  blockStats: BlockStats;
  blocks: Array<Block>;
  /** Returns a list of cells in a model */
  cells: Array<Cell>;
  dataset: Dataset;
  datasets: Array<Dataset>;
  experiment: Experiment;
  experiments: Array<Experiment>;
  file: File;
  files: Array<File>;
  mechanism: Mechanism;
  mechanisms: Array<Mechanism>;
  modEnvironment: ModEnvironment;
  modEnvironments: Array<ModEnvironment>;
  modelCollection: ModelCollection;
  modelCollections: Array<ModelCollection>;
  modelWorkspace: ModelWorkspace;
  modelWorkspaces: Array<ModelWorkspace>;
  mydatasets: Array<Dataset>;
  myfiles: Array<File>;
  /** Returns a single neuron model by ID */
  neuronModel: NeuronModel;
  neuronModels: Array<NeuronModel>;
  randomTrace: Trace;
  /** Returns a list of images */
  recording: Recording;
  recordings: Array<Recording>;
  roi: Roi;
  rois: Array<Roi>;
  /** Returns a list of images */
  sections: Array<Section>;
  simulation: Simulation;
  simulations: Array<Simulation>;
  stimuli: Array<Stimulus>;
  /** Returns a list of images */
  stimulus: Stimulus;
  /** Returns a single image by ID */
  trace: Trace;
  traces: Array<Trace>;
  workspaceMapping: WorkspaceMapping;
  workspaceMappings: Array<WorkspaceMapping>;
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryAnalogSignalArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAnalogSignalChannelArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAnalogSignalChannelsArgs = {
  filters?: InputMaybe<AnalogSignalChannelFilter>;
  ordering?: Array<AnalogSignalChannelOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryAnalogSignalsArgs = {
  filters?: InputMaybe<AnalogSignalFilter>;
  ordering?: Array<AnalogSignalOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryBlockArgs = {
  id: Scalars['ID']['input'];
};


export type QueryBlockStatsArgs = {
  filters?: InputMaybe<BlockFilter>;
};


export type QueryBlocksArgs = {
  filters?: InputMaybe<BlockFilter>;
  ordering?: Array<BlockOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryCellsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  modelId: Scalars['ID']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryDatasetArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDatasetsArgs = {
  filters?: InputMaybe<DatasetFilter>;
  ordering?: Array<DatasetOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryExperimentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryExperimentsArgs = {
  filters?: InputMaybe<ExperimentFilter>;
  ordering?: Array<ExperimentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryFileArgs = {
  id: Scalars['ID']['input'];
};


export type QueryFilesArgs = {
  filters?: InputMaybe<FileFilter>;
  ordering?: Array<FileOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMechanismArgs = {
  id: Scalars['ID']['input'];
};


export type QueryMechanismsArgs = {
  filters?: InputMaybe<MechanismFilter>;
  ordering?: Array<MechanismOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryModEnvironmentArgs = {
  id: Scalars['ID']['input'];
};


export type QueryModEnvironmentsArgs = {
  filters?: InputMaybe<ModEnvironmentFilter>;
  ordering?: Array<ModEnvironmentOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryModelCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryModelCollectionsArgs = {
  filters?: InputMaybe<ModelCollectionFilter>;
  ordering?: Array<ModelCollectionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryModelWorkspaceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryModelWorkspacesArgs = {
  filters?: InputMaybe<ModelWorkspaceFilter>;
  ordering?: Array<ModelWorkspaceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMydatasetsArgs = {
  filters?: InputMaybe<DatasetFilter>;
  ordering?: Array<DatasetOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMyfilesArgs = {
  filters?: InputMaybe<FileFilter>;
  ordering?: Array<FileOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryNeuronModelArgs = {
  id: Scalars['ID']['input'];
};


export type QueryNeuronModelsArgs = {
  filters?: InputMaybe<NeuronModelFilter>;
  ordering?: Array<NeuronModelOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryRecordingArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRecordingsArgs = {
  filters?: InputMaybe<RecordingFilter>;
  ordering?: Array<RecordingOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryRoiArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRoisArgs = {
  filters?: InputMaybe<RoiFilter>;
  ordering?: Array<RoiOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QuerySectionsArgs = {
  cellId: Scalars['ID']['input'];
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  modelId: Scalars['ID']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QuerySimulationArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySimulationsArgs = {
  filters?: InputMaybe<SimulationFilter>;
  ordering?: Array<SimulationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryStimuliArgs = {
  filters?: InputMaybe<StimulusFilter>;
  ordering?: Array<StimulusOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryStimulusArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTraceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTracesArgs = {
  filters?: InputMaybe<TraceFilter>;
  ordering?: Array<TraceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryWorkspaceMappingArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWorkspaceMappingsArgs = {
  filters?: InputMaybe<WorkspaceMappingFilter>;
  ordering?: Array<WorkspaceMappingOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type Roi = {
  __typename?: 'ROI';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  kind: RoiKind;
  label?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  pinned: Scalars['Boolean']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  trace: Trace;
  vectors: Array<Scalars['FiveDVector']['output']>;
};


export type RoiProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type RoiFilter = {
  AND?: InputMaybe<RoiFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<RoiFilter>;
  OR?: InputMaybe<RoiFilter>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<Scalars['ID']['input']>;
  createdByAgent?: InputMaybe<Scalars['Boolean']['input']>;
  createdWith?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  kind?: InputMaybe<RoiKindChoices>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
  provenanceRootTask?: InputMaybe<Scalars['String']['input']>;
  provenanceTask?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  trace?: InputMaybe<Scalars['ID']['input']>;
};

export type RoiOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

export type Recording = {
  __typename?: 'Recording';
  cell: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind: RecordingKind;
  label: Scalars['String']['output'];
  location: Scalars['String']['output'];
  position: Scalars['Float']['output'];
  simulation: Simulation;
  trace: Trace;
};

export type RecordingFilter = {
  AND?: InputMaybe<RecordingFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<RecordingFilter>;
  OR?: InputMaybe<RecordingFilter>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type RecordingInput = {
  cell?: InputMaybe<Scalars['ID']['input']>;
  kind: RecordingKind;
  location?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<Scalars['Float']['input']>;
  trace: Scalars['ArrayLike']['input'];
};

export enum RecordingKind {
  Current = 'CURRENT',
  Ina = 'INA',
  Time = 'TIME',
  Unknown = 'UNKNOWN',
  Voltage = 'VOLTAGE'
}

export type RecordingOrder =
  { id: Ordering; };

export type RecordingViewInput = {
  duration?: InputMaybe<Scalars['Duration']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  offset?: InputMaybe<Scalars['Duration']['input']>;
  recording: Scalars['ID']['input'];
};

export type Release = {
  __typename?: 'Release';
  app: App;
  id: Scalars['ID']['output'];
  version: Scalars['String']['output'];
};

export type RequestBigFileAccessInput = {
  storeId: Scalars['String']['input'];
};

export type RequestBigFileUploadInput = {
  contentType?: InputMaybe<Scalars['String']['input']>;
  fileSize?: InputMaybe<Scalars['Int']['input']>;
  host?: InputMaybe<Scalars['String']['input']>;
  originalFileName: Scalars['String']['input'];
  port?: InputMaybe<Scalars['Int']['input']>;
};

export type RequestGeneralMediaAccessInput = {
  expiresIn?: InputMaybe<Scalars['Int']['input']>;
};

export type RequestGeneralParquetAccessInput = {
  expiresIn?: InputMaybe<Scalars['Int']['input']>;
};

export type RequestGeneralZarrAccessInput = {
  expiresIn?: InputMaybe<Scalars['Int']['input']>;
};

export type RequestMediaAccessInput = {
  storeId: Scalars['String']['input'];
};

export type RequestMediaUploadInput = {
  contentType?: InputMaybe<Scalars['String']['input']>;
  fileSize?: InputMaybe<Scalars['Int']['input']>;
  originalFileName: Scalars['String']['input'];
};

export type RequestParquetAccessInput = {
  storeId: Scalars['String']['input'];
};

export type RequestParquetUploadInput = {
  contentType?: InputMaybe<Scalars['String']['input']>;
  host?: InputMaybe<Scalars['String']['input']>;
  port?: InputMaybe<Scalars['Int']['input']>;
};

export type RequestZarrAccessInput = {
  storeId: Scalars['String']['input'];
};

export type RequestZarrUploadInput = {
  chunks?: InputMaybe<Array<Scalars['Int']['input']>>;
  host?: InputMaybe<Scalars['String']['input']>;
  port?: InputMaybe<Scalars['Int']['input']>;
  shape?: InputMaybe<Array<Scalars['Int']['input']>>;
  version?: InputMaybe<Scalars['String']['input']>;
};

export type RevertInput = {
  historyId: Scalars['ID']['input'];
  id: Scalars['ID']['input'];
};

export type RoiEvent = {
  __typename?: 'RoiEvent';
  create?: Maybe<Roi>;
  delete?: Maybe<Scalars['ID']['output']>;
  update?: Maybe<Roi>;
};

export type RoiInput = {
  /** The type/kind of ROI */
  kind: RoiKind;
  /** The label of the ROI */
  label?: InputMaybe<Scalars['String']['input']>;
  /** The image this ROI belongs to */
  trace: Scalars['ID']['input'];
  /** The vector coordinates defining the as XY */
  vectors: Array<Scalars['TwoDVector']['input']>;
};

export enum RoiKind {
  Line = 'LINE',
  Point = 'POINT',
  Slice = 'SLICE',
  Spike = 'SPIKE'
}

export enum RoiKindChoices {
  Line = 'LINE',
  Point = 'POINT',
  Slice = 'SLICE',
  Spike = 'SPIKE'
}

/** Represents a section of a cell's morphology, the basic structural unit of the topology. */
export type Section = {
  __typename?: 'Section';
  /** An optional category for the section (e.g. 'soma', 'axon', 'dend'). Biophysics compartments are matched to sections by this category. */
  category?: Maybe<Scalars['String']['output']>;
  /** Specific membrane capacitance (NEURON cm). Unset inherits the model-wide default, then NEURON's built-in 1 µF/cm². */
  cm?: Maybe<Scalars['SpecificCapacitance']['output']>;
  /** The 3D coordinates (NEURON pt3d) describing the section's geometry. Required if length is not provided; when supplied they take precedence over length/diam. At least two points are needed to define a cable. */
  coords?: Maybe<Array<Coord>>;
  /** If set, nseg is computed from NEURON's d_lambda rule (target fraction of the AC length constant at 100 Hz per segment; 0.1 is typical) and overrides the fixed nseg. */
  dLambda?: Maybe<Scalars['Float']['output']>;
  /** The diameter of the section (stylized geometry). Overridden by per-point coord diameters when coords are supplied. */
  diam: Scalars['Length']['output'];
  /** The unique identifier of the section within the cell. */
  id: Scalars['String']['output'];
  /** Length of the section (stylized geometry). Required if coords is not provided; ignored when coords are supplied. */
  length?: Maybe<Scalars['Length']['output']>;
  /** The number of segments the section is discretized into (used when d_lambda is not set). NEURON convention prefers an odd count so the section has a true midpoint node. */
  nseg: Scalars['Int']['output'];
  /** The connection to this section's parent section. None for the root section of the cell. */
  parent?: Maybe<Connection>;
  /** Axial resistivity (NEURON Ra). Unset inherits the model-wide default, then NEURON's built-in 35.4 Ω·cm. */
  ra?: Maybe<Scalars['Resistivity']['output']>;
};

export type SectionDominance = {
  __typename?: 'SectionDominance';
  area: Scalars['Float']['output'];
  axialConductance: Scalars['Float']['output'];
  capacitance: Scalars['Float']['output'];
  category?: Maybe<Scalars['String']['output']>;
  cellId: Scalars['String']['output'];
  conductanceLoad: Scalars['Float']['output'];
  electrotonicDistance: Scalars['Float']['output'];
  globalScore: Scalars['Float']['output'];
  isReference: Scalars['Boolean']['output'];
  rawGlobal: Scalars['Float']['output'];
  rawReference: Scalars['Float']['output'];
  referenceScore: Scalars['Float']['output'];
  sectionId: Scalars['String']['output'];
  transferWeight: Scalars['Float']['output'];
};

/** Input for a section of a cell's morphology, the basic structural unit of the topology. */
export type SectionInput = {
  /** An optional category for the section (e.g. 'soma', 'axon', 'dend'). Biophysics compartments are matched to sections by this category. */
  category?: InputMaybe<Scalars['String']['input']>;
  /** Specific membrane capacitance (NEURON cm). Unset inherits the model-wide default, then NEURON's built-in 1 µF/cm². */
  cm?: InputMaybe<Scalars['SpecificCapacitance']['input']>;
  /** The 3D coordinates (NEURON pt3d) describing the section's geometry. Required if length is not provided; when supplied they take precedence over length/diam. At least two points are needed to define a cable. */
  coords?: InputMaybe<Array<CoordInput>>;
  /** If set, nseg is computed from NEURON's d_lambda rule (target fraction of the AC length constant at 100 Hz per segment; 0.1 is typical) and overrides the fixed nseg. */
  dLambda?: InputMaybe<Scalars['Float']['input']>;
  /** The diameter of the section (stylized geometry). Overridden by per-point coord diameters when coords are supplied. */
  diam?: Scalars['Length']['input'];
  /** The unique identifier of the section within the cell. */
  id: Scalars['String']['input'];
  /** Length of the section (stylized geometry). Required if coords is not provided; ignored when coords are supplied. */
  length?: InputMaybe<Scalars['Length']['input']>;
  /** The number of segments the section is discretized into (used when d_lambda is not set). NEURON convention prefers an odd count so the section has a true midpoint node. */
  nseg?: Scalars['Int']['input'];
  /** The connection to this section's parent section. None for the root section of the cell. */
  parent?: InputMaybe<ConnectionInput>;
  /** Axial resistivity (NEURON Ra). Unset inherits the model-wide default, then NEURON's built-in 35.4 Ω·cm. */
  ra?: InputMaybe<Scalars['Resistivity']['input']>;
};

/** Represents a section parameter mapping for a biophysics model. (this will be set on the mechanisms of the compartments of the model) */
export type SectionParamMap = {
  __typename?: 'SectionParamMap';
  /** Description of the parameter */
  description?: Maybe<Scalars['String']['output']>;
  /** How the parameter is distributed along the section (uniform by default). */
  distribution: Distribution;
  /** The governing mechanism */
  mechanism: Scalars['String']['output'];
  /** The name of the parameter to set. */
  param: Scalars['String']['output'];
};

/** Input for a section parameter mapping of a biophysics model. (this will be set on the mechanisms of the compartments of the model) */
export type SectionParamMapInput = {
  /** Description of the parameter */
  description?: InputMaybe<Scalars['String']['input']>;
  /** How the parameter is distributed along the section (uniform by default). */
  distribution: DistributionInput;
  /** The governing mechanism */
  mechanism: Scalars['String']['input'];
  /** The name of the parameter to set. */
  param: Scalars['String']['input'];
};

/** A signal recorded during a recording session */
export type Signal = {
  name: Scalars['String']['output'];
  segment: BlockSegment;
};

export type Simulation = {
  __typename?: 'Simulation';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  dt: Scalars['Duration']['output'];
  duration: Scalars['Duration']['output'];
  id: Scalars['ID']['output'];
  kind: StimulusKind;
  model: NeuronModel;
  name: Scalars['String']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  recordingViews: Array<ExperimentRecordingView>;
  recordings: Array<Recording>;
  stimuli: Array<Stimulus>;
  stimulusViews: Array<ExperimentStimulusView>;
  timeTrace: Trace;
};


export type SimulationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type SimulationRecordingViewsArgs = {
  filters?: InputMaybe<ExperimentRecordingViewFilter>;
  ordering?: Array<ExperimentRecordingViewOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type SimulationRecordingsArgs = {
  filters?: InputMaybe<RecordingFilter>;
  ordering?: Array<RecordingOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type SimulationStimuliArgs = {
  filters?: InputMaybe<StimulusFilter>;
  ordering?: Array<StimulusOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type SimulationStimulusViewsArgs = {
  filters?: InputMaybe<ExperimentStimulusViewFilter>;
  ordering?: Array<ExperimentStimulusViewOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type SimulationFilter = {
  AND?: InputMaybe<SimulationFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<SimulationFilter>;
  OR?: InputMaybe<SimulationFilter>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  createdBy?: InputMaybe<Scalars['ID']['input']>;
  createdByAgent?: InputMaybe<Scalars['Boolean']['input']>;
  createdWith?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StrFilterLookup>;
  provenanceRootTask?: InputMaybe<Scalars['String']['input']>;
  provenanceTask?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type SimulationOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

export type SpikeTrain = Signal & {
  __typename?: 'SpikeTrain';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  segment: BlockSegment;
  trace: Trace;
};


export type SpikeTrainProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type SpikeTrainFilter = {
  AND?: InputMaybe<SpikeTrainFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<SpikeTrainFilter>;
  OR?: InputMaybe<SpikeTrainFilter>;
  createdByAgent?: InputMaybe<Scalars['Boolean']['input']>;
  createdWith?: InputMaybe<Scalars['String']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  label?: InputMaybe<StrFilterLookup>;
  provenanceRootTask?: InputMaybe<Scalars['String']['input']>;
  provenanceTask?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  session?: InputMaybe<Scalars['ID']['input']>;
};

export type SpikeTrainInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  leftSweep?: InputMaybe<Scalars['Duration']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  tStart: Scalars['Duration']['input'];
  tStop: Scalars['Duration']['input'];
  times: Scalars['TraceLike']['input'];
  waveforms?: InputMaybe<Scalars['TraceLike']['input']>;
};

export type SpikeTrainOrder =
  { id: Ordering; };

export type Stimulus = {
  __typename?: 'Stimulus';
  cell: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  kind: StimulusKind;
  label: Scalars['String']['output'];
  location: Scalars['String']['output'];
  position: Scalars['Float']['output'];
  simulation: Simulation;
  trace: Trace;
};

export type StimulusFilter = {
  AND?: InputMaybe<StimulusFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<StimulusFilter>;
  OR?: InputMaybe<StimulusFilter>;
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type StimulusInput = {
  cell?: InputMaybe<Scalars['ID']['input']>;
  kind: StimulusKind;
  location?: InputMaybe<Scalars['ID']['input']>;
  position?: InputMaybe<Scalars['Float']['input']>;
  trace: Scalars['ArrayLike']['input'];
};

export enum StimulusKind {
  Current = 'CURRENT',
  Unknown = 'UNKNOWN',
  Voltage = 'VOLTAGE'
}

export type StimulusOrder =
  { id: Ordering; };

export type StimulusViewInput = {
  duration?: InputMaybe<Scalars['Duration']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  offset?: InputMaybe<Scalars['Duration']['input']>;
  stimulus: Scalars['ID']['input'];
};

export type StrFilterLookup = {
  contains?: InputMaybe<Scalars['String']['input']>;
  endsWith?: InputMaybe<Scalars['String']['input']>;
  exact?: InputMaybe<Scalars['String']['input']>;
  gt?: InputMaybe<Scalars['String']['input']>;
  gte?: InputMaybe<Scalars['String']['input']>;
  iContains?: InputMaybe<Scalars['String']['input']>;
  iEndsWith?: InputMaybe<Scalars['String']['input']>;
  iExact?: InputMaybe<Scalars['String']['input']>;
  iRegex?: InputMaybe<Scalars['String']['input']>;
  iStartsWith?: InputMaybe<Scalars['String']['input']>;
  inList?: InputMaybe<Array<Scalars['String']['input']>>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['String']['input']>;
  lte?: InputMaybe<Scalars['String']['input']>;
  range?: InputMaybe<Array<Scalars['String']['input']>>;
  regex?: InputMaybe<Scalars['String']['input']>;
  startsWith?: InputMaybe<Scalars['String']['input']>;
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Subscribe to real-time file updates */
  files: FileEvent;
  /** Subscribe to real-time ROI updates */
  rois: RoiEvent;
  /** Subscribe to real-time image updates */
  traces: TraceEvent;
};


export type SubscriptionFilesArgs = {
  dataset?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionRoisArgs = {
  trace: Scalars['ID']['input'];
};


export type SubscriptionTracesArgs = {
  dataset?: InputMaybe<Scalars['ID']['input']>;
};

export enum SynapseKind {
  Exp2Syn = 'EXP2SYN',
  Gabaa = 'GABAA'
}

/** Represents a synaptic connection between two cells in the model. This will be used to specify the connections between cells in the model, where each connection has a pre-synaptic cell (the net stimulator) and a post-synaptic cell (the synapse). */
export type SynapticConnection = NetConnection & {
  __typename?: 'SynapticConnection';
  /** The delay for the connection. */
  delay?: Maybe<Scalars['Duration']['output']>;
  /** The unique identifier of the connection within the model. */
  id: Scalars['ID']['output'];
  /** The ID of the net stimulator that is the pre-synaptic cell in this connection. */
  netStimulator: Scalars['ID']['output'];
  /** The ID of the synapse that is the post-synaptic cell in this connection. */
  synapse: Scalars['ID']['output'];
  /** The threshold for the connection. */
  threshold?: Maybe<Scalars['ElectricPotential']['output']>;
  /** The weight (conductance) of the connection. */
  weight?: Maybe<Scalars['ElectricalConductance']['output']>;
};

/** A verified provenance task under which changes were made. */
export type Task = {
  __typename?: 'Task';
  /** The executing agent client id. */
  agentClientId: Scalars['String']['output'];
  /** The executing agent user sub. */
  agentSub: Scalars['String']['output'];
  /** The SHA-256 of the canonicalized args. */
  argsHash: Scalars['String']['output'];
  /** The args canonicalization algorithm/version. */
  argsHashAlgorithm: Scalars['String']['output'];
  /** The root human causer. */
  assigner?: Maybe<User>;
  /** The raw root human causer sub. */
  assignerSub: Scalars['String']['output'];
  /** The immediate causer of this hop. */
  callerSub: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** The provenance issuer id. */
  issuer: Scalars['String']['output'];
  /** The organization the task ran in. */
  organization: Organization;
  /** The immediate parent task id, if any. */
  parentTaskId?: Maybe<Scalars['String']['output']>;
  /** The root task id of the whole causal tree. */
  rootTaskId: Scalars['String']['output'];
  /** This task id. */
  taskId: Scalars['String']['output'];
  /** The unique single-use token id. */
  tokenId: Scalars['String']['output'];
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

export type TimelineView = View & {
  __typename?: 'TimelineView';
  /** The accessor */
  accessor: Array<Scalars['String']['output']>;
  cMax?: Maybe<Scalars['Int']['output']>;
  cMin?: Maybe<Scalars['Int']['output']>;
  id: Scalars['ID']['output'];
  image: Trace;
  isGlobal: Scalars['Boolean']['output'];
  label: Scalars['String']['output'];
  tMax?: Maybe<Scalars['Int']['output']>;
  tMin?: Maybe<Scalars['Int']['output']>;
  trace: Trace;
  xMax?: Maybe<Scalars['Int']['output']>;
  xMin?: Maybe<Scalars['Int']['output']>;
  yMax?: Maybe<Scalars['Int']['output']>;
  yMin?: Maybe<Scalars['Int']['output']>;
  zMax?: Maybe<Scalars['Int']['output']>;
  zMin?: Maybe<Scalars['Int']['output']>;
};

/** Represents the topology of a cell, which defines its structure as a set of connected sections. */
export type Topology = {
  __typename?: 'Topology';
  /** The list of sections that make up the cell's morphology. */
  sections: Array<Section>;
};

/** Input for the topology of a cell, which defines its structure as a set of connected sections. */
export type TopologyInput = {
  /** The list of sections that make up the cell's morphology. */
  sections: Array<SectionInput>;
};

export type Trace = {
  __typename?: 'Trace';
  /** Who created this image */
  creator?: Maybe<User>;
  /** The dataset this image belongs to */
  dataset?: Maybe<Dataset>;
  events: Array<Roi>;
  id: Scalars['ID']['output'];
  /** The name of the image */
  name: Scalars['String']['output'];
  /** Is this image pinned by the current user */
  pinned: Scalars['Boolean']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  /** The rois of this image */
  rois: Array<Roi>;
  /** The store where the image data is stored. */
  store: ZarrStore;
  /** The tags of this image */
  tags: Array<Scalars['String']['output']>;
};


export type TraceEventsArgs = {
  filters?: InputMaybe<RoiFilter>;
};


export type TraceProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type TraceRoisArgs = {
  filters?: InputMaybe<RoiFilter>;
  ordering?: Array<RoiOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export type TraceEvent = {
  __typename?: 'TraceEvent';
  create?: Maybe<Trace>;
  delete?: Maybe<Scalars['ID']['output']>;
  update?: Maybe<Trace>;
};

export type TraceFilter = {
  AND?: InputMaybe<TraceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<TraceFilter>;
  OR?: InputMaybe<TraceFilter>;
  createdBy?: InputMaybe<Scalars['ID']['input']>;
  createdByAgent?: InputMaybe<Scalars['Boolean']['input']>;
  createdWith?: InputMaybe<Scalars['String']['input']>;
  dataset?: InputMaybe<DatasetFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  mine?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StrFilterLookup>;
  notDerived?: InputMaybe<Scalars['Boolean']['input']>;
  provenanceRootTask?: InputMaybe<Scalars['String']['input']>;
  provenanceTask?: InputMaybe<Scalars['String']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type TraceOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

export type UpdateModelWorkspaceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateRoiInput = {
  kind?: InputMaybe<RoiKind>;
  label?: InputMaybe<Scalars['String']['input']>;
  roi: Scalars['ID']['input'];
  vectors?: InputMaybe<Array<Scalars['TwoDVector']['input']>>;
};

export type UpdateTraceInput = {
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type UpdateWorkspaceMappingInput = {
  id: Scalars['ID']['input'];
  workspaceGroup: Scalars['String']['input'];
};

export type User = {
  __typename?: 'User';
  activeOrganization?: Maybe<Organization>;
  id: Scalars['ID']['output'];
  preferredUsername: Scalars['String']['output'];
  sub: Scalars['String']['output'];
};

export type View = {
  /** The accessor */
  accessor: Array<Scalars['String']['output']>;
  cMax?: Maybe<Scalars['Int']['output']>;
  cMin?: Maybe<Scalars['Int']['output']>;
  image: Trace;
  isGlobal: Scalars['Boolean']['output'];
  tMax?: Maybe<Scalars['Int']['output']>;
  tMin?: Maybe<Scalars['Int']['output']>;
  xMax?: Maybe<Scalars['Int']['output']>;
  xMin?: Maybe<Scalars['Int']['output']>;
  yMax?: Maybe<Scalars['Int']['output']>;
  yMin?: Maybe<Scalars['Int']['output']>;
  zMax?: Maybe<Scalars['Int']['output']>;
  zMin?: Maybe<Scalars['Int']['output']>;
};

export type WorkspaceMapping = {
  __typename?: 'WorkspaceMapping';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  model: NeuronModel;
  workspace: ModelWorkspace;
  workspaceGroup: Scalars['String']['output'];
};

export type WorkspaceMappingFilter = {
  AND?: InputMaybe<WorkspaceMappingFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<WorkspaceMappingFilter>;
  OR?: InputMaybe<WorkspaceMappingFilter>;
  id?: InputMaybe<Scalars['ID']['input']>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type WorkspaceMappingOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

/** Temporary S3 credentials for reading a Zarr store. */
export type ZarrAccessGrant = {
  __typename?: 'ZarrAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  path: Scalars['String']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store?: Maybe<Scalars['String']['output']>;
};

export type ZarrStore = {
  __typename?: 'ZarrStore';
  /** Get temporary S3 read credentials for the Zarr object. */
  accessGrant: ZarrAccessGrant;
  attributes?: Maybe<Scalars['JSON']['output']>;
  bucket: Scalars['String']['output'];
  chunkKeyEncoding?: Maybe<Scalars['JSON']['output']>;
  chunks: Array<Scalars['Int']['output']>;
  codecs?: Maybe<Scalars['JSON']['output']>;
  dimensionNames?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  dtype?: Maybe<Scalars['String']['output']>;
  fillValue: Scalars['JSON']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  path: Scalars['String']['output'];
  shape: Array<Scalars['Int']['output']>;
  storageTransformers?: Maybe<Scalars['JSON']['output']>;
  version?: Maybe<Scalars['String']['output']>;
};


export type ZarrStoreAccessGrantArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};

/** Temporary S3 credentials for uploading a Zarr store. */
export type ZarrUploadGrant = {
  __typename?: 'ZarrUploadGrant';
  accessKey: Scalars['String']['output'];
  action: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  key: Scalars['String']['output'];
  maxBytes: Scalars['Int']['output'];
  originalFileName?: Maybe<Scalars['String']['output']>;
  path: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
  store: Scalars['String']['output'];
  uploadContentType?: Maybe<Scalars['String']['output']>;
  uploadFileName: Scalars['String']['output'];
  uploadFormField: Scalars['String']['output'];
};

export type _Entity = App | BigFileStore | Client | MediaStore | ModEnvironment | Organization | ParquetStore | Release | User | ZarrStore;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type StimulusFragment = { __typename?: 'Stimulus', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } };

export type DetailStimulusFragment = { __typename?: 'Stimulus', id: string, label: string, simulation: { __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, model: { __typename?: 'NeuronModel', id: string, name: string, description?: string | null, config: { __typename?: 'ModelConfig', temperature: Temperature, vInit: ElectricPotential, label?: string | null, ra?: Resistivity | null, cm?: SpecificCapacitance | null, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, mechanismGlobals: Array<{ __typename?: 'MechanismGlobalParam', mechanism: string, param: string, value: GenericQuantity, description?: string | null }>, cells: Array<{ __typename?: 'Cell', id: string, biophysics: { __typename?: 'Biophysics', compartments: Array<{ __typename?: 'Compartment', id: string, color?: RGBAColor | null, mechanisms: Array<string>, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, sectionParams: Array<{ __typename?: 'SectionParamMap', mechanism: string, param: string, description?: string | null, distribution: { __typename?: 'Distribution', value?: GenericQuantity | null } }> }> }, topology: { __typename?: 'Topology', sections: Array<{ __typename?: 'Section', id: string, diam: Length, length?: Length | null, category?: string | null, nseg: number, ra?: Resistivity | null, cm?: SpecificCapacitance | null, dLambda?: number | null, coords?: Array<{ __typename?: 'Coord', x: Length, y: Length, z: Length }> | null, parent?: { __typename?: 'Connection', parent: string, parentLocation: number, childEnd: number } | null }> } }>, netSynapses?: Array<{ __typename?: 'Exp2Synapse', tau1: Duration, tau2: Duration, e: ElectricPotential, delay?: Duration | null, id: string, cell: string, location: string, position: number }> | null, netStimulators?: Array<{ __typename?: 'NetStimulator', id: string, interval?: Duration | null, number: number, start: Duration }> | null, netConnections?: Array<{ __typename?: 'SynapticConnection', netStimulator: string, synapse: string, id: string, delay?: Duration | null, weight?: ElectricalConductance | null, threshold?: ElectricPotential | null }> | null }, sectionDominance: Array<{ __typename?: 'SectionDominance', cellId: string, sectionId: string, category?: string | null, globalScore: number, conductanceLoad: number, electrotonicDistance: number }>, comparisons: Array<{ __typename?: 'Comparison', collection: { __typename?: 'ModelCollection', id: string, name: string }, changes: Array<{ __typename?: 'Change', type: ChangeType, path: Array<string>, valueA?: any | null, valueB?: any | null }> }>, simulations: Array<{ __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, creator?: { __typename?: 'User', sub: string } | null, model: { __typename?: 'NeuronModel', id: string, name: string } }>, environment: { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> }, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }> }, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } }, recordings: Array<{ __typename?: 'Recording', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null }, rois: Array<{ __typename?: 'ROI', id: string, vectors: Array<any>, label?: string | null, kind: RoiKind }> } }>, stimuli: Array<{ __typename?: 'Stimulus', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, creator?: { __typename?: 'User', sub: string } | null } };

export type ListStimulusFragment = { __typename?: 'Stimulus', id: string, label: string, cell: string, simulation: { __typename?: 'Simulation', id: string } };

export type BlockGroupFragment = { __typename?: 'BlockGroup', id: string, name: string };

export type AnalogSignalChannelFragment = { __typename?: 'AnalogSignalChannel', id: string, name?: string | null, index: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } };

export type DetailAnalogSignalChannelFragment = { __typename?: 'AnalogSignalChannel', id: string, name?: string | null, index: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } }, signal: { __typename?: 'AnalogSignal', id: string, name: string, unit?: string | null, channels: Array<{ __typename?: 'AnalogSignalChannel', id: string, name?: string | null, index: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } } };

export type AnalogSignalFragment = { __typename?: 'AnalogSignal', id: string, name: string, unit?: string | null, channels: Array<{ __typename?: 'AnalogSignalChannel', id: string, name?: string | null, index: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } };

export type ListAnalogSignalFragment = { __typename?: 'AnalogSignal', id: string, name: string, segment: { __typename?: 'BlockSegment', id: string } };

export type ListAnalogSignalChannelFragment = { __typename?: 'AnalogSignalChannel', id: string, name?: string | null, signal: { __typename?: 'AnalogSignal', id: string } };

export type BlockSegmentFragment = { __typename?: 'BlockSegment', id: string, analogSignals: Array<{ __typename?: 'AnalogSignal', id: string, name: string, unit?: string | null, channels: Array<{ __typename?: 'AnalogSignalChannel', id: string, name?: string | null, index: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }> };

export type BlockFragment = { __typename?: 'Block', id: string, name: string, description?: string | null, segments: Array<{ __typename?: 'BlockSegment', id: string, analogSignals: Array<{ __typename?: 'AnalogSignal', id: string, name: string, unit?: string | null, channels: Array<{ __typename?: 'AnalogSignalChannel', id: string, name?: string | null, index: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }> }>, groups: Array<{ __typename?: 'BlockGroup', id: string, name: string }> };

export type ListBlockFragment = { __typename?: 'Block', id: string, name: string };

export type BigFileAccessGrantFragment = { __typename?: 'BigFileAccessGrant', accessKey: string, secretKey: string, sessionToken: string, expiresIn: number, path: string, key: string, bucket: string };

export type DatasetFragment = { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }>, traces: Array<{ __typename?: 'Trace', id: string, name: string }>, files: Array<{ __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, creator?: { __typename?: 'User', sub: string } | null }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null };

export type ListDatasetFragment = { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean };

export type ModEnvironmentFragment = { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> };

export type ListModEnvironmentFragment = { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> };

export type ExperimentFragment = { __typename?: 'Experiment', id: string, name: string, description?: string | null, createdAt: any, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } }, stimulusViews: Array<{ __typename?: 'ExperimentStimulusView', id: string, label?: string | null, stimulus: { __typename?: 'Stimulus', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } } }>, recordingViews: Array<{ __typename?: 'ExperimentRecordingView', id: string, label?: string | null, recording: { __typename?: 'Recording', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null }, rois: Array<{ __typename?: 'ROI', id: string, vectors: Array<any>, label?: string | null, kind: RoiKind }> } } }> };

export type ListExperimentFragment = { __typename?: 'Experiment', id: string, name: string };

export type FileFragment = { __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, origins: Array<{ __typename?: 'Trace', id: string, name: string }>, store: { __typename?: 'BigFileStore', id: string, key: string, bucket: string, path: string }, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }> };

export type ListFileFragment = { __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, creator?: { __typename?: 'User', sub: string } | null };

export type ParameterFragment = { __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null };

export type MechanismFragment = { __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> };

export type ListMechanismFragment = { __typename?: 'Mechanism', id: string, name: string, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> };

export type ModelCollectionFragment = { __typename?: 'ModelCollection', id: string, name: string, models: Array<{ __typename?: 'NeuronModel', id: string, name: string }> };

export type ListModelCollectionFragment = { __typename?: 'ModelCollection', id: string, name: string };

export type ListModelWorkspaceFragment = { __typename?: 'ModelWorkspace', id: string, name: string, pinned: boolean };

export type WorkspaceMappingFragment = { __typename?: 'WorkspaceMapping', id: string, workspaceGroup: string, model: { __typename?: 'NeuronModel', id: string, name: string } };

export type DetailModelWorkspaceFragment = { __typename?: 'ModelWorkspace', id: string, name: string, description?: string | null, pinned: boolean, mappings: Array<{ __typename?: 'WorkspaceMapping', id: string, workspaceGroup: string, model: { __typename?: 'NeuronModel', id: string, name: string } }> };

export type CoordFragment = { __typename?: 'Coord', x: Length, y: Length, z: Length };

export type SectionFragment = { __typename?: 'Section', id: string, diam: Length, length?: Length | null, category?: string | null, nseg: number, ra?: Resistivity | null, cm?: SpecificCapacitance | null, dLambda?: number | null, coords?: Array<{ __typename?: 'Coord', x: Length, y: Length, z: Length }> | null, parent?: { __typename?: 'Connection', parent: string, parentLocation: number, childEnd: number } | null };

export type ConnectionFragment = { __typename?: 'Connection', parent: string, parentLocation: number, childEnd: number };

export type SectionDominanceFragment = { __typename?: 'SectionDominance', cellId: string, sectionId: string, category?: string | null, globalScore: number, conductanceLoad: number, electrotonicDistance: number };

export type IonFragment = { __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null };

export type MechanismGlobalParamFragment = { __typename?: 'MechanismGlobalParam', mechanism: string, param: string, value: GenericQuantity, description?: string | null };

export type CompartmentFragment = { __typename?: 'Compartment', id: string, color?: RGBAColor | null, mechanisms: Array<string>, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, sectionParams: Array<{ __typename?: 'SectionParamMap', mechanism: string, param: string, description?: string | null, distribution: { __typename?: 'Distribution', value?: GenericQuantity | null } }> };

export type ProvenanceEntryFragment = { __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> };

export type DetailNeuronModelFragment = { __typename?: 'NeuronModel', id: string, name: string, description?: string | null, config: { __typename?: 'ModelConfig', temperature: Temperature, vInit: ElectricPotential, label?: string | null, ra?: Resistivity | null, cm?: SpecificCapacitance | null, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, mechanismGlobals: Array<{ __typename?: 'MechanismGlobalParam', mechanism: string, param: string, value: GenericQuantity, description?: string | null }>, cells: Array<{ __typename?: 'Cell', id: string, biophysics: { __typename?: 'Biophysics', compartments: Array<{ __typename?: 'Compartment', id: string, color?: RGBAColor | null, mechanisms: Array<string>, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, sectionParams: Array<{ __typename?: 'SectionParamMap', mechanism: string, param: string, description?: string | null, distribution: { __typename?: 'Distribution', value?: GenericQuantity | null } }> }> }, topology: { __typename?: 'Topology', sections: Array<{ __typename?: 'Section', id: string, diam: Length, length?: Length | null, category?: string | null, nseg: number, ra?: Resistivity | null, cm?: SpecificCapacitance | null, dLambda?: number | null, coords?: Array<{ __typename?: 'Coord', x: Length, y: Length, z: Length }> | null, parent?: { __typename?: 'Connection', parent: string, parentLocation: number, childEnd: number } | null }> } }>, netSynapses?: Array<{ __typename?: 'Exp2Synapse', tau1: Duration, tau2: Duration, e: ElectricPotential, delay?: Duration | null, id: string, cell: string, location: string, position: number }> | null, netStimulators?: Array<{ __typename?: 'NetStimulator', id: string, interval?: Duration | null, number: number, start: Duration }> | null, netConnections?: Array<{ __typename?: 'SynapticConnection', netStimulator: string, synapse: string, id: string, delay?: Duration | null, weight?: ElectricalConductance | null, threshold?: ElectricPotential | null }> | null }, sectionDominance: Array<{ __typename?: 'SectionDominance', cellId: string, sectionId: string, category?: string | null, globalScore: number, conductanceLoad: number, electrotonicDistance: number }>, comparisons: Array<{ __typename?: 'Comparison', collection: { __typename?: 'ModelCollection', id: string, name: string }, changes: Array<{ __typename?: 'Change', type: ChangeType, path: Array<string>, valueA?: any | null, valueB?: any | null }> }>, simulations: Array<{ __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, creator?: { __typename?: 'User', sub: string } | null, model: { __typename?: 'NeuronModel', id: string, name: string } }>, environment: { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> }, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }> };

export type ListNeuronModelFragment = { __typename?: 'NeuronModel', id: string, name: string };

export type RecordingFragment = { __typename?: 'Recording', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null }, rois: Array<{ __typename?: 'ROI', id: string, vectors: Array<any>, label?: string | null, kind: RoiKind }> } };

export type DetailRecordingFragment = { __typename?: 'Recording', id: string, label: string, simulation: { __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, model: { __typename?: 'NeuronModel', id: string, name: string, description?: string | null, config: { __typename?: 'ModelConfig', temperature: Temperature, vInit: ElectricPotential, label?: string | null, ra?: Resistivity | null, cm?: SpecificCapacitance | null, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, mechanismGlobals: Array<{ __typename?: 'MechanismGlobalParam', mechanism: string, param: string, value: GenericQuantity, description?: string | null }>, cells: Array<{ __typename?: 'Cell', id: string, biophysics: { __typename?: 'Biophysics', compartments: Array<{ __typename?: 'Compartment', id: string, color?: RGBAColor | null, mechanisms: Array<string>, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, sectionParams: Array<{ __typename?: 'SectionParamMap', mechanism: string, param: string, description?: string | null, distribution: { __typename?: 'Distribution', value?: GenericQuantity | null } }> }> }, topology: { __typename?: 'Topology', sections: Array<{ __typename?: 'Section', id: string, diam: Length, length?: Length | null, category?: string | null, nseg: number, ra?: Resistivity | null, cm?: SpecificCapacitance | null, dLambda?: number | null, coords?: Array<{ __typename?: 'Coord', x: Length, y: Length, z: Length }> | null, parent?: { __typename?: 'Connection', parent: string, parentLocation: number, childEnd: number } | null }> } }>, netSynapses?: Array<{ __typename?: 'Exp2Synapse', tau1: Duration, tau2: Duration, e: ElectricPotential, delay?: Duration | null, id: string, cell: string, location: string, position: number }> | null, netStimulators?: Array<{ __typename?: 'NetStimulator', id: string, interval?: Duration | null, number: number, start: Duration }> | null, netConnections?: Array<{ __typename?: 'SynapticConnection', netStimulator: string, synapse: string, id: string, delay?: Duration | null, weight?: ElectricalConductance | null, threshold?: ElectricPotential | null }> | null }, sectionDominance: Array<{ __typename?: 'SectionDominance', cellId: string, sectionId: string, category?: string | null, globalScore: number, conductanceLoad: number, electrotonicDistance: number }>, comparisons: Array<{ __typename?: 'Comparison', collection: { __typename?: 'ModelCollection', id: string, name: string }, changes: Array<{ __typename?: 'Change', type: ChangeType, path: Array<string>, valueA?: any | null, valueB?: any | null }> }>, simulations: Array<{ __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, creator?: { __typename?: 'User', sub: string } | null, model: { __typename?: 'NeuronModel', id: string, name: string } }>, environment: { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> }, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }> }, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } }, recordings: Array<{ __typename?: 'Recording', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null }, rois: Array<{ __typename?: 'ROI', id: string, vectors: Array<any>, label?: string | null, kind: RoiKind }> } }>, stimuli: Array<{ __typename?: 'Stimulus', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, creator?: { __typename?: 'User', sub: string } | null } };

export type ListRecordingFragment = { __typename?: 'Recording', id: string, label: string, cell: string, simulation: { __typename?: 'Simulation', id: string } };

export type DetailSimulationFragment = { __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, model: { __typename?: 'NeuronModel', id: string, name: string, description?: string | null, config: { __typename?: 'ModelConfig', temperature: Temperature, vInit: ElectricPotential, label?: string | null, ra?: Resistivity | null, cm?: SpecificCapacitance | null, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, mechanismGlobals: Array<{ __typename?: 'MechanismGlobalParam', mechanism: string, param: string, value: GenericQuantity, description?: string | null }>, cells: Array<{ __typename?: 'Cell', id: string, biophysics: { __typename?: 'Biophysics', compartments: Array<{ __typename?: 'Compartment', id: string, color?: RGBAColor | null, mechanisms: Array<string>, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, sectionParams: Array<{ __typename?: 'SectionParamMap', mechanism: string, param: string, description?: string | null, distribution: { __typename?: 'Distribution', value?: GenericQuantity | null } }> }> }, topology: { __typename?: 'Topology', sections: Array<{ __typename?: 'Section', id: string, diam: Length, length?: Length | null, category?: string | null, nseg: number, ra?: Resistivity | null, cm?: SpecificCapacitance | null, dLambda?: number | null, coords?: Array<{ __typename?: 'Coord', x: Length, y: Length, z: Length }> | null, parent?: { __typename?: 'Connection', parent: string, parentLocation: number, childEnd: number } | null }> } }>, netSynapses?: Array<{ __typename?: 'Exp2Synapse', tau1: Duration, tau2: Duration, e: ElectricPotential, delay?: Duration | null, id: string, cell: string, location: string, position: number }> | null, netStimulators?: Array<{ __typename?: 'NetStimulator', id: string, interval?: Duration | null, number: number, start: Duration }> | null, netConnections?: Array<{ __typename?: 'SynapticConnection', netStimulator: string, synapse: string, id: string, delay?: Duration | null, weight?: ElectricalConductance | null, threshold?: ElectricPotential | null }> | null }, sectionDominance: Array<{ __typename?: 'SectionDominance', cellId: string, sectionId: string, category?: string | null, globalScore: number, conductanceLoad: number, electrotonicDistance: number }>, comparisons: Array<{ __typename?: 'Comparison', collection: { __typename?: 'ModelCollection', id: string, name: string }, changes: Array<{ __typename?: 'Change', type: ChangeType, path: Array<string>, valueA?: any | null, valueB?: any | null }> }>, simulations: Array<{ __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, creator?: { __typename?: 'User', sub: string } | null, model: { __typename?: 'NeuronModel', id: string, name: string } }>, environment: { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> }, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }> }, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } }, recordings: Array<{ __typename?: 'Recording', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null }, rois: Array<{ __typename?: 'ROI', id: string, vectors: Array<any>, label?: string | null, kind: RoiKind }> } }>, stimuli: Array<{ __typename?: 'Stimulus', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, creator?: { __typename?: 'User', sub: string } | null };

export type ListSimulationFragment = { __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, creator?: { __typename?: 'User', sub: string } | null, model: { __typename?: 'NeuronModel', id: string, name: string } };

export type ZarrStoreFragment = { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null };

export type BigFileStoreFragment = { __typename?: 'BigFileStore', id: string, key: string, bucket: string, path: string };

export type DetailTraceFragment = { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } };

export type ListTraceFragment = { __typename?: 'Trace', id: string, name: string };

export type DeleteBlockMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteBlockMutation = { __typename?: 'Mutation', deleteBlock: string };

export type FinishBigfileUploadMutationVariables = Exact<{
  input: FinishBigFileUploadInput;
}>;


export type FinishBigfileUploadMutation = { __typename?: 'Mutation', finishBigfileUpload: { __typename?: 'BigFileStore', id: string, key: string, bucket: string, path: string } };

export type RequestBigfileAccessMutationVariables = Exact<{
  input: RequestBigFileAccessInput;
}>;


export type RequestBigfileAccessMutation = { __typename?: 'Mutation', requestBigfileAccess: { __typename?: 'BigFileAccessGrant', accessKey: string, secretKey: string, sessionToken: string, expiresIn: number, path: string, key: string, bucket: string } };

export type CreateDatasetMutationVariables = Exact<{
  input: CreateDatasetInput;
}>;


export type CreateDatasetMutation = { __typename?: 'Mutation', createDataset: { __typename?: 'Dataset', id: string, name: string } };

export type UpdateDatasetMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
}>;


export type UpdateDatasetMutation = { __typename?: 'Mutation', updateDataset: { __typename?: 'Dataset', id: string, name: string } };

export type PinDatasetMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  pin: Scalars['Boolean']['input'];
}>;


export type PinDatasetMutation = { __typename?: 'Mutation', pinDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }>, traces: Array<{ __typename?: 'Trace', id: string, name: string }>, files: Array<{ __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, creator?: { __typename?: 'User', sub: string } | null }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type PutDatasetsInDatasetMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type PutDatasetsInDatasetMutation = { __typename?: 'Mutation', putDatasetsInDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }>, traces: Array<{ __typename?: 'Trace', id: string, name: string }>, files: Array<{ __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, creator?: { __typename?: 'User', sub: string } | null }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type ReleaseDatasetsFromDatasetMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type ReleaseDatasetsFromDatasetMutation = { __typename?: 'Mutation', releaseDatasetsFromDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }>, traces: Array<{ __typename?: 'Trace', id: string, name: string }>, files: Array<{ __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, creator?: { __typename?: 'User', sub: string } | null }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type PutImagesInDatasetMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type PutImagesInDatasetMutation = { __typename?: 'Mutation', putImagesInDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }>, traces: Array<{ __typename?: 'Trace', id: string, name: string }>, files: Array<{ __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, creator?: { __typename?: 'User', sub: string } | null }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type ReleaseImagesFromDatasetMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type ReleaseImagesFromDatasetMutation = { __typename?: 'Mutation', releaseImagesFromDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }>, traces: Array<{ __typename?: 'Trace', id: string, name: string }>, files: Array<{ __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, creator?: { __typename?: 'User', sub: string } | null }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type PutFilesInDatasetMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type PutFilesInDatasetMutation = { __typename?: 'Mutation', putFilesInDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }>, traces: Array<{ __typename?: 'Trace', id: string, name: string }>, files: Array<{ __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, creator?: { __typename?: 'User', sub: string } | null }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type ReleaseFilesFromDatasetMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type ReleaseFilesFromDatasetMutation = { __typename?: 'Mutation', releaseFilesFromDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }>, traces: Array<{ __typename?: 'Trace', id: string, name: string }>, files: Array<{ __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, creator?: { __typename?: 'User', sub: string } | null }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type RevertDatasetMutationVariables = Exact<{
  dataset: Scalars['ID']['input'];
  history: Scalars['ID']['input'];
}>;


export type RevertDatasetMutation = { __typename?: 'Mutation', revertDataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null } };

export type DeleteDatasetMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteDatasetMutation = { __typename?: 'Mutation', deleteDataset: string };

export type From_File_LikeMutationVariables = Exact<{
  file: Scalars['FileLike']['input'];
  name: Scalars['String']['input'];
  origins?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  dataset?: InputMaybe<Scalars['ID']['input']>;
}>;


export type From_File_LikeMutation = { __typename?: 'Mutation', fromFileLike: { __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, origins: Array<{ __typename?: 'Trace', id: string, name: string }>, store: { __typename?: 'BigFileStore', id: string, key: string, bucket: string, path: string }, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }> } };

export type DeleteFileMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteFileMutation = { __typename?: 'Mutation', deleteFile: string };

export type CreateModelWorkspaceMutationVariables = Exact<{
  input: CreateModelWorkspaceInput;
}>;


export type CreateModelWorkspaceMutation = { __typename?: 'Mutation', createModelWorkspace: { __typename?: 'ModelWorkspace', id: string, name: string, description?: string | null, pinned: boolean, mappings: Array<{ __typename?: 'WorkspaceMapping', id: string, workspaceGroup: string, model: { __typename?: 'NeuronModel', id: string, name: string } }> } };

export type AddModelsToWorkspaceMutationVariables = Exact<{
  input: AddModelsToWorkspaceInput;
}>;


export type AddModelsToWorkspaceMutation = { __typename?: 'Mutation', addModelsToWorkspace: { __typename?: 'ModelWorkspace', id: string, name: string, description?: string | null, pinned: boolean, mappings: Array<{ __typename?: 'WorkspaceMapping', id: string, workspaceGroup: string, model: { __typename?: 'NeuronModel', id: string, name: string } }> } };

export type RemoveModelsFromWorkspaceMutationVariables = Exact<{
  input: DesociateInput;
}>;


export type RemoveModelsFromWorkspaceMutation = { __typename?: 'Mutation', removeModelsFromWorkspace: { __typename?: 'ModelWorkspace', id: string, name: string, description?: string | null, pinned: boolean, mappings: Array<{ __typename?: 'WorkspaceMapping', id: string, workspaceGroup: string, model: { __typename?: 'NeuronModel', id: string, name: string } }> } };

export type DeleteModelWorkspaceMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteModelWorkspaceMutation = { __typename?: 'Mutation', deleteModelWorkspace: string };

export type CreateNeuronModelMutationVariables = Exact<{
  input: CreateNeuronModelInput;
}>;


export type CreateNeuronModelMutation = { __typename?: 'Mutation', createNeuronModel: { __typename?: 'NeuronModel', id: string, name: string, config: { __typename?: 'ModelConfig', cells: Array<{ __typename?: 'Cell', id: string }> } } };

export type DeleteNeuronModelMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteNeuronModelMutation = { __typename?: 'Mutation', deleteNeuronModel: string };

export type GeneralZarrAccessGrantFragment = { __typename?: 'GeneralZarrAccessGrant', accessKey: string, secretKey: string, sessionToken: string, expiresIn: number, region: string, bucket: string };

export type RequestGeneralZarrAccessMutationVariables = Exact<{
  input: RequestGeneralZarrAccessInput;
}>;


export type RequestGeneralZarrAccessMutation = { __typename?: 'Mutation', requestGeneralZarrAccess: { __typename?: 'GeneralZarrAccessGrant', accessKey: string, secretKey: string, sessionToken: string, expiresIn: number, region: string, bucket: string } };

export type DetailBlockQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailBlockQuery = { __typename?: 'Query', block: { __typename?: 'Block', id: string, name: string, description?: string | null, segments: Array<{ __typename?: 'BlockSegment', id: string, analogSignals: Array<{ __typename?: 'AnalogSignal', id: string, name: string, unit?: string | null, channels: Array<{ __typename?: 'AnalogSignalChannel', id: string, name?: string | null, index: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }> }>, groups: Array<{ __typename?: 'BlockGroup', id: string, name: string }> } };

export type ListBlocksQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<BlockFilter>;
  ordering?: InputMaybe<Array<BlockOrder> | BlockOrder>;
}>;


export type ListBlocksQuery = { __typename?: 'Query', blocks: Array<{ __typename?: 'Block', id: string, name: string }> };

export type GetDatasetQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDatasetQuery = { __typename?: 'Query', dataset: { __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }>, traces: Array<{ __typename?: 'Trace', id: string, name: string }>, files: Array<{ __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, creator?: { __typename?: 'User', sub: string } | null }>, children: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }>, creator?: { __typename?: 'User', sub: string } | null } };

export type GetDatasetsQueryVariables = Exact<{
  filters?: InputMaybe<DatasetFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
  ordering?: InputMaybe<Array<DatasetOrder> | DatasetOrder>;
}>;


export type GetDatasetsQuery = { __typename?: 'Query', datasets: Array<{ __typename?: 'Dataset', id: string, name: string, description?: string | null, isDefault: boolean }> };

export type DetailModEnvironmentQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailModEnvironmentQuery = { __typename?: 'Query', modEnvironment: { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> } };

export type ListModEnvironmentsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ModEnvironmentFilter>;
  ordering?: InputMaybe<Array<ModEnvironmentOrder> | ModEnvironmentOrder>;
}>;


export type ListModEnvironmentsQuery = { __typename?: 'Query', modEnvironments: Array<{ __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> }> };

export type DetailExperimentQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailExperimentQuery = { __typename?: 'Query', experiment: { __typename?: 'Experiment', id: string, name: string, description?: string | null, createdAt: any, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } }, stimulusViews: Array<{ __typename?: 'ExperimentStimulusView', id: string, label?: string | null, stimulus: { __typename?: 'Stimulus', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } } }>, recordingViews: Array<{ __typename?: 'ExperimentRecordingView', id: string, label?: string | null, recording: { __typename?: 'Recording', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null }, rois: Array<{ __typename?: 'ROI', id: string, vectors: Array<any>, label?: string | null, kind: RoiKind }> } } }> } };

export type ListExperimentsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ExperimentFilter>;
  ordering?: InputMaybe<Array<ExperimentOrder> | ExperimentOrder>;
}>;


export type ListExperimentsQuery = { __typename?: 'Query', experiments: Array<{ __typename?: 'Experiment', id: string, name: string }> };

export type GetFileQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetFileQuery = { __typename?: 'Query', file: { __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, origins: Array<{ __typename?: 'Trace', id: string, name: string }>, store: { __typename?: 'BigFileStore', id: string, key: string, bucket: string, path: string }, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }> } };

export type GetFilesQueryVariables = Exact<{
  filters?: InputMaybe<FileFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
  ordering?: InputMaybe<Array<FileOrder> | FileOrder>;
}>;


export type GetFilesQuery = { __typename?: 'Query', files: Array<{ __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, creator?: { __typename?: 'User', sub: string } | null }> };

export type HomePageQueryVariables = Exact<{ [key: string]: never; }>;


export type HomePageQuery = { __typename?: 'Query', blocks: Array<{ __typename?: 'Block', id: string, name: string }>, models: Array<{ __typename?: 'NeuronModel', id: string, name: string }> };

export type HomePageStatsQueryVariables = Exact<{ [key: string]: never; }>;


export type HomePageStatsQuery = { __typename?: 'Query', blockStats: { __typename?: 'BlockStats', count: number } };

export type DetailMechanismQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailMechanismQuery = { __typename?: 'Query', mechanism: { __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> } };

export type ListMechanismsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<MechanismFilter>;
  ordering?: InputMaybe<Array<MechanismOrder> | MechanismOrder>;
}>;


export type ListMechanismsQuery = { __typename?: 'Query', mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> };

export type DetailModelCollectionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailModelCollectionQuery = { __typename?: 'Query', modelCollection: { __typename?: 'ModelCollection', id: string, name: string, models: Array<{ __typename?: 'NeuronModel', id: string, name: string }> } };

export type ListModelCollectionsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ModelCollectionFilter>;
  ordering?: InputMaybe<Array<ModelCollectionOrder> | ModelCollectionOrder>;
}>;


export type ListModelCollectionsQuery = { __typename?: 'Query', modelCollections: Array<{ __typename?: 'ModelCollection', id: string, name: string }> };

export type DetailModelWorkspaceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailModelWorkspaceQuery = { __typename?: 'Query', modelWorkspace: { __typename?: 'ModelWorkspace', id: string, name: string, description?: string | null, pinned: boolean, mappings: Array<{ __typename?: 'WorkspaceMapping', id: string, workspaceGroup: string, model: { __typename?: 'NeuronModel', id: string, name: string } }> } };

export type ListModelWorkspacesQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ModelWorkspaceFilter>;
  ordering?: InputMaybe<Array<ModelWorkspaceOrder> | ModelWorkspaceOrder>;
}>;


export type ListModelWorkspacesQuery = { __typename?: 'Query', modelWorkspaces: Array<{ __typename?: 'ModelWorkspace', id: string, name: string, pinned: boolean }> };

export type DetailNeuronModelQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailNeuronModelQuery = { __typename?: 'Query', neuronModel: { __typename?: 'NeuronModel', id: string, name: string, description?: string | null, config: { __typename?: 'ModelConfig', temperature: Temperature, vInit: ElectricPotential, label?: string | null, ra?: Resistivity | null, cm?: SpecificCapacitance | null, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, mechanismGlobals: Array<{ __typename?: 'MechanismGlobalParam', mechanism: string, param: string, value: GenericQuantity, description?: string | null }>, cells: Array<{ __typename?: 'Cell', id: string, biophysics: { __typename?: 'Biophysics', compartments: Array<{ __typename?: 'Compartment', id: string, color?: RGBAColor | null, mechanisms: Array<string>, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, sectionParams: Array<{ __typename?: 'SectionParamMap', mechanism: string, param: string, description?: string | null, distribution: { __typename?: 'Distribution', value?: GenericQuantity | null } }> }> }, topology: { __typename?: 'Topology', sections: Array<{ __typename?: 'Section', id: string, diam: Length, length?: Length | null, category?: string | null, nseg: number, ra?: Resistivity | null, cm?: SpecificCapacitance | null, dLambda?: number | null, coords?: Array<{ __typename?: 'Coord', x: Length, y: Length, z: Length }> | null, parent?: { __typename?: 'Connection', parent: string, parentLocation: number, childEnd: number } | null }> } }>, netSynapses?: Array<{ __typename?: 'Exp2Synapse', tau1: Duration, tau2: Duration, e: ElectricPotential, delay?: Duration | null, id: string, cell: string, location: string, position: number }> | null, netStimulators?: Array<{ __typename?: 'NetStimulator', id: string, interval?: Duration | null, number: number, start: Duration }> | null, netConnections?: Array<{ __typename?: 'SynapticConnection', netStimulator: string, synapse: string, id: string, delay?: Duration | null, weight?: ElectricalConductance | null, threshold?: ElectricPotential | null }> | null }, sectionDominance: Array<{ __typename?: 'SectionDominance', cellId: string, sectionId: string, category?: string | null, globalScore: number, conductanceLoad: number, electrotonicDistance: number }>, comparisons: Array<{ __typename?: 'Comparison', collection: { __typename?: 'ModelCollection', id: string, name: string }, changes: Array<{ __typename?: 'Change', type: ChangeType, path: Array<string>, valueA?: any | null, valueB?: any | null }> }>, simulations: Array<{ __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, creator?: { __typename?: 'User', sub: string } | null, model: { __typename?: 'NeuronModel', id: string, name: string } }>, environment: { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> }, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }> } };

export type SectionDominanceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  weightAxial?: InputMaybe<Scalars['Float']['input']>;
  weightCapacitance?: InputMaybe<Scalars['Float']['input']>;
  weightConductance?: InputMaybe<Scalars['Float']['input']>;
}>;


export type SectionDominanceQuery = { __typename?: 'Query', neuronModel: { __typename?: 'NeuronModel', id: string, sectionDominance: Array<{ __typename?: 'SectionDominance', cellId: string, sectionId: string, category?: string | null, globalScore: number, conductanceLoad: number, electrotonicDistance: number }> } };

export type ListNeuronModelsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<NeuronModelFilter>;
  ordering?: InputMaybe<Array<NeuronModelOrder> | NeuronModelOrder>;
}>;


export type ListNeuronModelsQuery = { __typename?: 'Query', neuronModels: Array<{ __typename?: 'NeuronModel', id: string, name: string }> };

export type DetailRecordingQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailRecordingQuery = { __typename?: 'Query', recording: { __typename?: 'Recording', id: string, label: string, simulation: { __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, model: { __typename?: 'NeuronModel', id: string, name: string, description?: string | null, config: { __typename?: 'ModelConfig', temperature: Temperature, vInit: ElectricPotential, label?: string | null, ra?: Resistivity | null, cm?: SpecificCapacitance | null, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, mechanismGlobals: Array<{ __typename?: 'MechanismGlobalParam', mechanism: string, param: string, value: GenericQuantity, description?: string | null }>, cells: Array<{ __typename?: 'Cell', id: string, biophysics: { __typename?: 'Biophysics', compartments: Array<{ __typename?: 'Compartment', id: string, color?: RGBAColor | null, mechanisms: Array<string>, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, sectionParams: Array<{ __typename?: 'SectionParamMap', mechanism: string, param: string, description?: string | null, distribution: { __typename?: 'Distribution', value?: GenericQuantity | null } }> }> }, topology: { __typename?: 'Topology', sections: Array<{ __typename?: 'Section', id: string, diam: Length, length?: Length | null, category?: string | null, nseg: number, ra?: Resistivity | null, cm?: SpecificCapacitance | null, dLambda?: number | null, coords?: Array<{ __typename?: 'Coord', x: Length, y: Length, z: Length }> | null, parent?: { __typename?: 'Connection', parent: string, parentLocation: number, childEnd: number } | null }> } }>, netSynapses?: Array<{ __typename?: 'Exp2Synapse', tau1: Duration, tau2: Duration, e: ElectricPotential, delay?: Duration | null, id: string, cell: string, location: string, position: number }> | null, netStimulators?: Array<{ __typename?: 'NetStimulator', id: string, interval?: Duration | null, number: number, start: Duration }> | null, netConnections?: Array<{ __typename?: 'SynapticConnection', netStimulator: string, synapse: string, id: string, delay?: Duration | null, weight?: ElectricalConductance | null, threshold?: ElectricPotential | null }> | null }, sectionDominance: Array<{ __typename?: 'SectionDominance', cellId: string, sectionId: string, category?: string | null, globalScore: number, conductanceLoad: number, electrotonicDistance: number }>, comparisons: Array<{ __typename?: 'Comparison', collection: { __typename?: 'ModelCollection', id: string, name: string }, changes: Array<{ __typename?: 'Change', type: ChangeType, path: Array<string>, valueA?: any | null, valueB?: any | null }> }>, simulations: Array<{ __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, creator?: { __typename?: 'User', sub: string } | null, model: { __typename?: 'NeuronModel', id: string, name: string } }>, environment: { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> }, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }> }, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } }, recordings: Array<{ __typename?: 'Recording', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null }, rois: Array<{ __typename?: 'ROI', id: string, vectors: Array<any>, label?: string | null, kind: RoiKind }> } }>, stimuli: Array<{ __typename?: 'Stimulus', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, creator?: { __typename?: 'User', sub: string } | null } } };

export type ListRecordingsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<RecordingFilter>;
  ordering?: InputMaybe<Array<RecordingOrder> | RecordingOrder>;
}>;


export type ListRecordingsQuery = { __typename?: 'Query', recordings: Array<{ __typename?: 'Recording', id: string, label: string, cell: string, simulation: { __typename?: 'Simulation', id: string } }> };

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', traces: Array<{ __typename?: 'Trace', id: string, name: string }> };

export type DetailAnalogSignalQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailAnalogSignalQuery = { __typename?: 'Query', analogSignal: { __typename?: 'AnalogSignal', id: string, name: string, unit?: string | null, channels: Array<{ __typename?: 'AnalogSignalChannel', id: string, name?: string | null, index: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } } };

export type ListAnalogSignalQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<AnalogSignalFilter>;
  ordering?: InputMaybe<Array<AnalogSignalOrder> | AnalogSignalOrder>;
}>;


export type ListAnalogSignalQuery = { __typename?: 'Query', analogSignals: Array<{ __typename?: 'AnalogSignal', id: string, name: string, segment: { __typename?: 'BlockSegment', id: string } }> };

export type DetailAnalogSignalChannelQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailAnalogSignalChannelQuery = { __typename?: 'Query', analogSignalChannel: { __typename?: 'AnalogSignalChannel', id: string, name?: string | null, index: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } }, signal: { __typename?: 'AnalogSignal', id: string, name: string, unit?: string | null, channels: Array<{ __typename?: 'AnalogSignalChannel', id: string, name?: string | null, index: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } } } };

export type ListAnalogSignalChannelQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<AnalogSignalChannelFilter>;
  ordering?: InputMaybe<Array<AnalogSignalChannelOrder> | AnalogSignalChannelOrder>;
}>;


export type ListAnalogSignalChannelQuery = { __typename?: 'Query', analogSignalChannels: Array<{ __typename?: 'AnalogSignalChannel', id: string, name?: string | null, signal: { __typename?: 'AnalogSignal', id: string } }> };

export type DetailSimulationQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailSimulationQuery = { __typename?: 'Query', simulation: { __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, model: { __typename?: 'NeuronModel', id: string, name: string, description?: string | null, config: { __typename?: 'ModelConfig', temperature: Temperature, vInit: ElectricPotential, label?: string | null, ra?: Resistivity | null, cm?: SpecificCapacitance | null, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, mechanismGlobals: Array<{ __typename?: 'MechanismGlobalParam', mechanism: string, param: string, value: GenericQuantity, description?: string | null }>, cells: Array<{ __typename?: 'Cell', id: string, biophysics: { __typename?: 'Biophysics', compartments: Array<{ __typename?: 'Compartment', id: string, color?: RGBAColor | null, mechanisms: Array<string>, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, sectionParams: Array<{ __typename?: 'SectionParamMap', mechanism: string, param: string, description?: string | null, distribution: { __typename?: 'Distribution', value?: GenericQuantity | null } }> }> }, topology: { __typename?: 'Topology', sections: Array<{ __typename?: 'Section', id: string, diam: Length, length?: Length | null, category?: string | null, nseg: number, ra?: Resistivity | null, cm?: SpecificCapacitance | null, dLambda?: number | null, coords?: Array<{ __typename?: 'Coord', x: Length, y: Length, z: Length }> | null, parent?: { __typename?: 'Connection', parent: string, parentLocation: number, childEnd: number } | null }> } }>, netSynapses?: Array<{ __typename?: 'Exp2Synapse', tau1: Duration, tau2: Duration, e: ElectricPotential, delay?: Duration | null, id: string, cell: string, location: string, position: number }> | null, netStimulators?: Array<{ __typename?: 'NetStimulator', id: string, interval?: Duration | null, number: number, start: Duration }> | null, netConnections?: Array<{ __typename?: 'SynapticConnection', netStimulator: string, synapse: string, id: string, delay?: Duration | null, weight?: ElectricalConductance | null, threshold?: ElectricPotential | null }> | null }, sectionDominance: Array<{ __typename?: 'SectionDominance', cellId: string, sectionId: string, category?: string | null, globalScore: number, conductanceLoad: number, electrotonicDistance: number }>, comparisons: Array<{ __typename?: 'Comparison', collection: { __typename?: 'ModelCollection', id: string, name: string }, changes: Array<{ __typename?: 'Change', type: ChangeType, path: Array<string>, valueA?: any | null, valueB?: any | null }> }>, simulations: Array<{ __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, creator?: { __typename?: 'User', sub: string } | null, model: { __typename?: 'NeuronModel', id: string, name: string } }>, environment: { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> }, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }> }, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } }, recordings: Array<{ __typename?: 'Recording', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null }, rois: Array<{ __typename?: 'ROI', id: string, vectors: Array<any>, label?: string | null, kind: RoiKind }> } }>, stimuli: Array<{ __typename?: 'Stimulus', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, creator?: { __typename?: 'User', sub: string } | null } };

export type ListSimulationsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<SimulationFilter>;
  ordering?: InputMaybe<Array<SimulationOrder> | SimulationOrder>;
}>;


export type ListSimulationsQuery = { __typename?: 'Query', simulations: Array<{ __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, creator?: { __typename?: 'User', sub: string } | null, model: { __typename?: 'NeuronModel', id: string, name: string } }> };

export type DetailStimulusQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailStimulusQuery = { __typename?: 'Query', stimulus: { __typename?: 'Stimulus', id: string, label: string, simulation: { __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, model: { __typename?: 'NeuronModel', id: string, name: string, description?: string | null, config: { __typename?: 'ModelConfig', temperature: Temperature, vInit: ElectricPotential, label?: string | null, ra?: Resistivity | null, cm?: SpecificCapacitance | null, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, mechanismGlobals: Array<{ __typename?: 'MechanismGlobalParam', mechanism: string, param: string, value: GenericQuantity, description?: string | null }>, cells: Array<{ __typename?: 'Cell', id: string, biophysics: { __typename?: 'Biophysics', compartments: Array<{ __typename?: 'Compartment', id: string, color?: RGBAColor | null, mechanisms: Array<string>, ions: Array<{ __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null }>, sectionParams: Array<{ __typename?: 'SectionParamMap', mechanism: string, param: string, description?: string | null, distribution: { __typename?: 'Distribution', value?: GenericQuantity | null } }> }> }, topology: { __typename?: 'Topology', sections: Array<{ __typename?: 'Section', id: string, diam: Length, length?: Length | null, category?: string | null, nseg: number, ra?: Resistivity | null, cm?: SpecificCapacitance | null, dLambda?: number | null, coords?: Array<{ __typename?: 'Coord', x: Length, y: Length, z: Length }> | null, parent?: { __typename?: 'Connection', parent: string, parentLocation: number, childEnd: number } | null }> } }>, netSynapses?: Array<{ __typename?: 'Exp2Synapse', tau1: Duration, tau2: Duration, e: ElectricPotential, delay?: Duration | null, id: string, cell: string, location: string, position: number }> | null, netStimulators?: Array<{ __typename?: 'NetStimulator', id: string, interval?: Duration | null, number: number, start: Duration }> | null, netConnections?: Array<{ __typename?: 'SynapticConnection', netStimulator: string, synapse: string, id: string, delay?: Duration | null, weight?: ElectricalConductance | null, threshold?: ElectricPotential | null }> | null }, sectionDominance: Array<{ __typename?: 'SectionDominance', cellId: string, sectionId: string, category?: string | null, globalScore: number, conductanceLoad: number, electrotonicDistance: number }>, comparisons: Array<{ __typename?: 'Comparison', collection: { __typename?: 'ModelCollection', id: string, name: string }, changes: Array<{ __typename?: 'Change', type: ChangeType, path: Array<string>, valueA?: any | null, valueB?: any | null }> }>, simulations: Array<{ __typename?: 'Simulation', id: string, name: string, duration: Duration, dt: Duration, createdAt: any, creator?: { __typename?: 'User', sub: string } | null, model: { __typename?: 'NeuronModel', id: string, name: string } }>, environment: { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<{ __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<{ __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null }> }> }, provenanceEntries: Array<{ __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> }> }, timeTrace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } }, recordings: Array<{ __typename?: 'Recording', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null }, rois: Array<{ __typename?: 'ROI', id: string, vectors: Array<any>, label?: string | null, kind: RoiKind }> } }>, stimuli: Array<{ __typename?: 'Stimulus', id: string, label: string, cell: string, location: string, position: number, trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } }>, creator?: { __typename?: 'User', sub: string } | null } } };

export type ListStimuliQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<StimulusFilter>;
  ordering?: InputMaybe<Array<StimulusOrder> | StimulusOrder>;
}>;


export type ListStimuliQuery = { __typename?: 'Query', stimuli: Array<{ __typename?: 'Stimulus', id: string, label: string, cell: string, simulation: { __typename?: 'Simulation', id: string } }> };

export type DetailTraceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailTraceQuery = { __typename?: 'Query', trace: { __typename?: 'Trace', id: string, name: string, store: { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null } } };

export type TracesQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<TraceFilter>;
  ordering?: InputMaybe<Array<TraceOrder> | TraceOrder>;
}>;


export type TracesQuery = { __typename?: 'Query', traces: Array<{ __typename?: 'Trace', id: string, name: string }> };

export const IonFragmentDoc = gql`
    fragment Ion on Ion {
  ion
  style
  reversalPotential
  internalConcentration
  externalConcentration
}
    `;
export const MechanismGlobalParamFragmentDoc = gql`
    fragment MechanismGlobalParam on MechanismGlobalParam {
  mechanism
  param
  value
  description
}
    `;
export const CompartmentFragmentDoc = gql`
    fragment Compartment on Compartment {
  id
  color
  mechanisms
  ions {
    ...Ion
  }
  sectionParams {
    mechanism
    param
    distribution {
      value
    }
    description
  }
}
    ${IonFragmentDoc}`;
export const CoordFragmentDoc = gql`
    fragment Coord on Coord {
  x
  y
  z
}
    `;
export const ConnectionFragmentDoc = gql`
    fragment Connection on Connection {
  parent
  parentLocation
  childEnd
}
    `;
export const SectionFragmentDoc = gql`
    fragment Section on Section {
  id
  diam
  length
  category
  nseg
  ra
  cm
  dLambda
  coords {
    ...Coord
  }
  parent {
    ...Connection
  }
}
    ${CoordFragmentDoc}
${ConnectionFragmentDoc}`;
export const SectionDominanceFragmentDoc = gql`
    fragment SectionDominance on SectionDominance {
  cellId
  sectionId
  category
  globalScore
  conductanceLoad
  electrotonicDistance
}
    `;
export const ListSimulationFragmentDoc = gql`
    fragment ListSimulation on Simulation {
  id
  name
  duration
  dt
  createdAt
  creator {
    sub
  }
  model {
    id
    name
  }
}
    `;
export const ParameterFragmentDoc = gql`
    fragment Parameter on Parameter {
  key
  label
  kind
  description
  default
  nullable
  referenceUnit
  proposedUnits
  dimension
}
    `;
export const MechanismFragmentDoc = gql`
    fragment Mechanism on Mechanism {
  id
  name
  description
  parameters {
    ...Parameter
  }
}
    ${ParameterFragmentDoc}`;
export const ModEnvironmentFragmentDoc = gql`
    fragment ModEnvironment on ModEnvironment {
  id
  name
  description
  mechanisms {
    ...Mechanism
  }
}
    ${MechanismFragmentDoc}`;
export const ProvenanceEntryFragmentDoc = gql`
    fragment ProvenanceEntry on ProvenanceEntry {
  id
  task {
    id
    taskId
    assigner {
      sub
    }
  }
  kind
  user {
    sub
  }
  client {
    clientId
  }
  date
  effectiveChanges {
    field
  }
}
    `;
export const DetailNeuronModelFragmentDoc = gql`
    fragment DetailNeuronModel on NeuronModel {
  id
  name
  config {
    temperature
    vInit
    label
    ra
    cm
    ions {
      ...Ion
    }
    mechanismGlobals {
      ...MechanismGlobalParam
    }
    cells {
      id
      biophysics {
        compartments {
          ...Compartment
        }
      }
      topology {
        sections {
          ...Section
        }
      }
    }
    netSynapses {
      id
      cell
      location
      position
      ... on Exp2Synapse {
        tau1
        tau2
        e
        delay
      }
    }
    netStimulators {
      id
      interval
      number
      start
    }
    netConnections {
      id
      delay
      weight
      threshold
      ... on SynapticConnection {
        netStimulator
        synapse
      }
    }
  }
  sectionDominance {
    ...SectionDominance
  }
  description
  comparisons {
    collection {
      id
      name
    }
    changes {
      type
      path
      valueA
      valueB
    }
  }
  simulations {
    ...ListSimulation
  }
  environment {
    ...ModEnvironment
  }
  provenanceEntries {
    ...ProvenanceEntry
  }
}
    ${IonFragmentDoc}
${MechanismGlobalParamFragmentDoc}
${CompartmentFragmentDoc}
${SectionFragmentDoc}
${SectionDominanceFragmentDoc}
${ListSimulationFragmentDoc}
${ModEnvironmentFragmentDoc}
${ProvenanceEntryFragmentDoc}`;
export const ZarrStoreFragmentDoc = gql`
    fragment ZarrStore on ZarrStore {
  id
  key
  bucket
  path
  shape
  dtype
}
    `;
export const RecordingFragmentDoc = gql`
    fragment Recording on Recording {
  id
  label
  cell
  location
  position
  trace {
    id
    name
    store {
      ...ZarrStore
    }
    rois {
      id
      vectors
      label
      kind
    }
  }
}
    ${ZarrStoreFragmentDoc}`;
export const StimulusFragmentDoc = gql`
    fragment Stimulus on Stimulus {
  id
  label
  cell
  location
  position
  trace {
    id
    name
    store {
      ...ZarrStore
    }
  }
}
    ${ZarrStoreFragmentDoc}`;
export const DetailSimulationFragmentDoc = gql`
    fragment DetailSimulation on Simulation {
  id
  name
  model {
    ...DetailNeuronModel
  }
  timeTrace {
    id
    name
    store {
      ...ZarrStore
    }
  }
  duration
  recordings {
    ...Recording
  }
  stimuli {
    ...Stimulus
  }
  dt
  createdAt
  creator {
    sub
  }
}
    ${DetailNeuronModelFragmentDoc}
${ZarrStoreFragmentDoc}
${RecordingFragmentDoc}
${StimulusFragmentDoc}`;
export const DetailStimulusFragmentDoc = gql`
    fragment DetailStimulus on Stimulus {
  id
  label
  simulation {
    ...DetailSimulation
  }
}
    ${DetailSimulationFragmentDoc}`;
export const ListStimulusFragmentDoc = gql`
    fragment ListStimulus on Stimulus {
  id
  label
  cell
  simulation {
    id
  }
}
    `;
export const DetailTraceFragmentDoc = gql`
    fragment DetailTrace on Trace {
  id
  name
  store {
    ...ZarrStore
  }
}
    ${ZarrStoreFragmentDoc}`;
export const AnalogSignalChannelFragmentDoc = gql`
    fragment AnalogSignalChannel on AnalogSignalChannel {
  id
  name
  index
  trace {
    ...DetailTrace
  }
}
    ${DetailTraceFragmentDoc}`;
export const AnalogSignalFragmentDoc = gql`
    fragment AnalogSignal on AnalogSignal {
  id
  name
  unit
  channels {
    ...AnalogSignalChannel
  }
  timeTrace {
    ...DetailTrace
  }
}
    ${AnalogSignalChannelFragmentDoc}
${DetailTraceFragmentDoc}`;
export const DetailAnalogSignalChannelFragmentDoc = gql`
    fragment DetailAnalogSignalChannel on AnalogSignalChannel {
  id
  name
  index
  trace {
    ...DetailTrace
  }
  signal {
    ...AnalogSignal
  }
}
    ${DetailTraceFragmentDoc}
${AnalogSignalFragmentDoc}`;
export const ListAnalogSignalFragmentDoc = gql`
    fragment ListAnalogSignal on AnalogSignal {
  id
  name
  segment {
    id
  }
}
    `;
export const ListAnalogSignalChannelFragmentDoc = gql`
    fragment ListAnalogSignalChannel on AnalogSignalChannel {
  id
  name
  signal {
    id
  }
}
    `;
export const BlockSegmentFragmentDoc = gql`
    fragment BlockSegment on BlockSegment {
  id
  analogSignals {
    ...AnalogSignal
  }
}
    ${AnalogSignalFragmentDoc}`;
export const BlockGroupFragmentDoc = gql`
    fragment BlockGroup on BlockGroup {
  id
  name
}
    `;
export const BlockFragmentDoc = gql`
    fragment Block on Block {
  id
  name
  description
  segments {
    ...BlockSegment
  }
  groups {
    ...BlockGroup
  }
}
    ${BlockSegmentFragmentDoc}
${BlockGroupFragmentDoc}`;
export const ListBlockFragmentDoc = gql`
    fragment ListBlock on Block {
  id
  name
}
    `;
export const BigFileAccessGrantFragmentDoc = gql`
    fragment BigFileAccessGrant on BigFileAccessGrant {
  accessKey
  secretKey
  sessionToken
  expiresIn
  path
  key
  bucket
}
    `;
export const ListTraceFragmentDoc = gql`
    fragment ListTrace on Trace {
  id
  name
}
    `;
export const ListFileFragmentDoc = gql`
    fragment ListFile on File {
  id
  name
  size
  contentType
  creator {
    sub
  }
}
    `;
export const ListDatasetFragmentDoc = gql`
    fragment ListDataset on Dataset {
  id
  name
  description
  isDefault
}
    `;
export const DatasetFragmentDoc = gql`
    fragment Dataset on Dataset {
  id
  name
  description
  provenanceEntries {
    ...ProvenanceEntry
  }
  traces {
    ...ListTrace
  }
  files {
    ...ListFile
  }
  children {
    ...ListDataset
  }
  isDefault
  pinned
  createdAt
  creator {
    sub
  }
  tags
}
    ${ProvenanceEntryFragmentDoc}
${ListTraceFragmentDoc}
${ListFileFragmentDoc}
${ListDatasetFragmentDoc}`;
export const ListModEnvironmentFragmentDoc = gql`
    fragment ListModEnvironment on ModEnvironment {
  id
  name
  description
  mechanisms {
    ...Mechanism
  }
}
    ${MechanismFragmentDoc}`;
export const ExperimentFragmentDoc = gql`
    fragment Experiment on Experiment {
  id
  name
  description
  createdAt
  timeTrace {
    id
    name
    store {
      ...ZarrStore
    }
  }
  stimulusViews {
    id
    label
    stimulus {
      ...Stimulus
    }
  }
  recordingViews {
    id
    label
    recording {
      ...Recording
    }
  }
}
    ${ZarrStoreFragmentDoc}
${StimulusFragmentDoc}
${RecordingFragmentDoc}`;
export const ListExperimentFragmentDoc = gql`
    fragment ListExperiment on Experiment {
  id
  name
}
    `;
export const BigFileStoreFragmentDoc = gql`
    fragment BigFileStore on BigFileStore {
  id
  key
  bucket
  path
}
    `;
export const FileFragmentDoc = gql`
    fragment File on File {
  id
  name
  size
  contentType
  origins {
    ...ListTrace
  }
  store {
    ...BigFileStore
  }
  provenanceEntries {
    ...ProvenanceEntry
  }
}
    ${ListTraceFragmentDoc}
${BigFileStoreFragmentDoc}
${ProvenanceEntryFragmentDoc}`;
export const ListMechanismFragmentDoc = gql`
    fragment ListMechanism on Mechanism {
  id
  name
  parameters {
    ...Parameter
  }
}
    ${ParameterFragmentDoc}`;
export const ListNeuronModelFragmentDoc = gql`
    fragment ListNeuronModel on NeuronModel {
  id
  name
}
    `;
export const ModelCollectionFragmentDoc = gql`
    fragment ModelCollection on ModelCollection {
  id
  name
  models {
    ...ListNeuronModel
  }
}
    ${ListNeuronModelFragmentDoc}`;
export const ListModelCollectionFragmentDoc = gql`
    fragment ListModelCollection on ModelCollection {
  id
  name
}
    `;
export const ListModelWorkspaceFragmentDoc = gql`
    fragment ListModelWorkspace on ModelWorkspace {
  id
  name
  pinned
}
    `;
export const WorkspaceMappingFragmentDoc = gql`
    fragment WorkspaceMapping on WorkspaceMapping {
  id
  workspaceGroup
  model {
    ...ListNeuronModel
  }
}
    ${ListNeuronModelFragmentDoc}`;
export const DetailModelWorkspaceFragmentDoc = gql`
    fragment DetailModelWorkspace on ModelWorkspace {
  id
  name
  description
  pinned
  mappings {
    ...WorkspaceMapping
  }
}
    ${WorkspaceMappingFragmentDoc}`;
export const DetailRecordingFragmentDoc = gql`
    fragment DetailRecording on Recording {
  id
  label
  simulation {
    ...DetailSimulation
  }
}
    ${DetailSimulationFragmentDoc}`;
export const ListRecordingFragmentDoc = gql`
    fragment ListRecording on Recording {
  id
  label
  cell
  simulation {
    id
  }
}
    `;
export const GeneralZarrAccessGrantFragmentDoc = gql`
    fragment GeneralZarrAccessGrant on GeneralZarrAccessGrant {
  accessKey
  secretKey
  sessionToken
  expiresIn
  region
  bucket
}
    `;
export const DeleteBlockDocument = gql`
    mutation DeleteBlock($id: ID!) {
  deleteBlock(input: {id: $id})
}
    `;
export type DeleteBlockMutationFn = Apollo.MutationFunction<DeleteBlockMutation, DeleteBlockMutationVariables>;

/**
 * __useDeleteBlockMutation__
 *
 * To run a mutation, you first call `useDeleteBlockMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteBlockMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteBlockMutation, { data, loading, error }] = useDeleteBlockMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteBlockMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteBlockMutation, DeleteBlockMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteBlockMutation, DeleteBlockMutationVariables>(DeleteBlockDocument, options);
      }
export type DeleteBlockMutationHookResult = ReturnType<typeof useDeleteBlockMutation>;
export type DeleteBlockMutationResult = Apollo.MutationResult<DeleteBlockMutation>;
export type DeleteBlockMutationOptions = Apollo.BaseMutationOptions<DeleteBlockMutation, DeleteBlockMutationVariables>;
export const FinishBigfileUploadDocument = gql`
    mutation FinishBigfileUpload($input: FinishBigFileUploadInput!) {
  finishBigfileUpload(input: $input) {
    ...BigFileStore
  }
}
    ${BigFileStoreFragmentDoc}`;
export type FinishBigfileUploadMutationFn = Apollo.MutationFunction<FinishBigfileUploadMutation, FinishBigfileUploadMutationVariables>;

/**
 * __useFinishBigfileUploadMutation__
 *
 * To run a mutation, you first call `useFinishBigfileUploadMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFinishBigfileUploadMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [finishBigfileUploadMutation, { data, loading, error }] = useFinishBigfileUploadMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useFinishBigfileUploadMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<FinishBigfileUploadMutation, FinishBigfileUploadMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<FinishBigfileUploadMutation, FinishBigfileUploadMutationVariables>(FinishBigfileUploadDocument, options);
      }
export type FinishBigfileUploadMutationHookResult = ReturnType<typeof useFinishBigfileUploadMutation>;
export type FinishBigfileUploadMutationResult = Apollo.MutationResult<FinishBigfileUploadMutation>;
export type FinishBigfileUploadMutationOptions = Apollo.BaseMutationOptions<FinishBigfileUploadMutation, FinishBigfileUploadMutationVariables>;
export const RequestBigfileAccessDocument = gql`
    mutation RequestBigfileAccess($input: RequestBigFileAccessInput!) {
  requestBigfileAccess(input: $input) {
    ...BigFileAccessGrant
  }
}
    ${BigFileAccessGrantFragmentDoc}`;
export type RequestBigfileAccessMutationFn = Apollo.MutationFunction<RequestBigfileAccessMutation, RequestBigfileAccessMutationVariables>;

/**
 * __useRequestBigfileAccessMutation__
 *
 * To run a mutation, you first call `useRequestBigfileAccessMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestBigfileAccessMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestBigfileAccessMutation, { data, loading, error }] = useRequestBigfileAccessMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestBigfileAccessMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestBigfileAccessMutation, RequestBigfileAccessMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestBigfileAccessMutation, RequestBigfileAccessMutationVariables>(RequestBigfileAccessDocument, options);
      }
export type RequestBigfileAccessMutationHookResult = ReturnType<typeof useRequestBigfileAccessMutation>;
export type RequestBigfileAccessMutationResult = Apollo.MutationResult<RequestBigfileAccessMutation>;
export type RequestBigfileAccessMutationOptions = Apollo.BaseMutationOptions<RequestBigfileAccessMutation, RequestBigfileAccessMutationVariables>;
export const CreateDatasetDocument = gql`
    mutation CreateDataset($input: CreateDatasetInput!) {
  createDataset(input: $input) {
    id
    name
  }
}
    `;
export type CreateDatasetMutationFn = Apollo.MutationFunction<CreateDatasetMutation, CreateDatasetMutationVariables>;

/**
 * __useCreateDatasetMutation__
 *
 * To run a mutation, you first call `useCreateDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createDatasetMutation, { data, loading, error }] = useCreateDatasetMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateDatasetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateDatasetMutation, CreateDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateDatasetMutation, CreateDatasetMutationVariables>(CreateDatasetDocument, options);
      }
export type CreateDatasetMutationHookResult = ReturnType<typeof useCreateDatasetMutation>;
export type CreateDatasetMutationResult = Apollo.MutationResult<CreateDatasetMutation>;
export type CreateDatasetMutationOptions = Apollo.BaseMutationOptions<CreateDatasetMutation, CreateDatasetMutationVariables>;
export const UpdateDatasetDocument = gql`
    mutation UpdateDataset($id: ID!, $name: String!) {
  updateDataset(input: {id: $id, name: $name}) {
    id
    name
  }
}
    `;
export type UpdateDatasetMutationFn = Apollo.MutationFunction<UpdateDatasetMutation, UpdateDatasetMutationVariables>;

/**
 * __useUpdateDatasetMutation__
 *
 * To run a mutation, you first call `useUpdateDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateDatasetMutation, { data, loading, error }] = useUpdateDatasetMutation({
 *   variables: {
 *      id: // value for 'id'
 *      name: // value for 'name'
 *   },
 * });
 */
export function useUpdateDatasetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateDatasetMutation, UpdateDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateDatasetMutation, UpdateDatasetMutationVariables>(UpdateDatasetDocument, options);
      }
export type UpdateDatasetMutationHookResult = ReturnType<typeof useUpdateDatasetMutation>;
export type UpdateDatasetMutationResult = Apollo.MutationResult<UpdateDatasetMutation>;
export type UpdateDatasetMutationOptions = Apollo.BaseMutationOptions<UpdateDatasetMutation, UpdateDatasetMutationVariables>;
export const PinDatasetDocument = gql`
    mutation PinDataset($id: ID!, $pin: Boolean!) {
  pinDataset(input: {id: $id, pin: $pin}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type PinDatasetMutationFn = Apollo.MutationFunction<PinDatasetMutation, PinDatasetMutationVariables>;

/**
 * __usePinDatasetMutation__
 *
 * To run a mutation, you first call `usePinDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinDatasetMutation, { data, loading, error }] = usePinDatasetMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinDatasetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PinDatasetMutation, PinDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PinDatasetMutation, PinDatasetMutationVariables>(PinDatasetDocument, options);
      }
export type PinDatasetMutationHookResult = ReturnType<typeof usePinDatasetMutation>;
export type PinDatasetMutationResult = Apollo.MutationResult<PinDatasetMutation>;
export type PinDatasetMutationOptions = Apollo.BaseMutationOptions<PinDatasetMutation, PinDatasetMutationVariables>;
export const PutDatasetsInDatasetDocument = gql`
    mutation PutDatasetsInDataset($selfs: [ID!]!, $other: ID!) {
  putDatasetsInDataset(input: {selfs: $selfs, other: $other}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type PutDatasetsInDatasetMutationFn = Apollo.MutationFunction<PutDatasetsInDatasetMutation, PutDatasetsInDatasetMutationVariables>;

/**
 * __usePutDatasetsInDatasetMutation__
 *
 * To run a mutation, you first call `usePutDatasetsInDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutDatasetsInDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putDatasetsInDatasetMutation, { data, loading, error }] = usePutDatasetsInDatasetMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function usePutDatasetsInDatasetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PutDatasetsInDatasetMutation, PutDatasetsInDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PutDatasetsInDatasetMutation, PutDatasetsInDatasetMutationVariables>(PutDatasetsInDatasetDocument, options);
      }
export type PutDatasetsInDatasetMutationHookResult = ReturnType<typeof usePutDatasetsInDatasetMutation>;
export type PutDatasetsInDatasetMutationResult = Apollo.MutationResult<PutDatasetsInDatasetMutation>;
export type PutDatasetsInDatasetMutationOptions = Apollo.BaseMutationOptions<PutDatasetsInDatasetMutation, PutDatasetsInDatasetMutationVariables>;
export const ReleaseDatasetsFromDatasetDocument = gql`
    mutation ReleaseDatasetsFromDataset($selfs: [ID!]!, $other: ID!) {
  releaseDatasetsFromDataset(input: {selfs: $selfs, other: $other}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type ReleaseDatasetsFromDatasetMutationFn = Apollo.MutationFunction<ReleaseDatasetsFromDatasetMutation, ReleaseDatasetsFromDatasetMutationVariables>;

/**
 * __useReleaseDatasetsFromDatasetMutation__
 *
 * To run a mutation, you first call `useReleaseDatasetsFromDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseDatasetsFromDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseDatasetsFromDatasetMutation, { data, loading, error }] = useReleaseDatasetsFromDatasetMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function useReleaseDatasetsFromDatasetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ReleaseDatasetsFromDatasetMutation, ReleaseDatasetsFromDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ReleaseDatasetsFromDatasetMutation, ReleaseDatasetsFromDatasetMutationVariables>(ReleaseDatasetsFromDatasetDocument, options);
      }
export type ReleaseDatasetsFromDatasetMutationHookResult = ReturnType<typeof useReleaseDatasetsFromDatasetMutation>;
export type ReleaseDatasetsFromDatasetMutationResult = Apollo.MutationResult<ReleaseDatasetsFromDatasetMutation>;
export type ReleaseDatasetsFromDatasetMutationOptions = Apollo.BaseMutationOptions<ReleaseDatasetsFromDatasetMutation, ReleaseDatasetsFromDatasetMutationVariables>;
export const PutImagesInDatasetDocument = gql`
    mutation PutImagesInDataset($selfs: [ID!]!, $other: ID!) {
  putImagesInDataset(input: {selfs: $selfs, other: $other}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type PutImagesInDatasetMutationFn = Apollo.MutationFunction<PutImagesInDatasetMutation, PutImagesInDatasetMutationVariables>;

/**
 * __usePutImagesInDatasetMutation__
 *
 * To run a mutation, you first call `usePutImagesInDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutImagesInDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putImagesInDatasetMutation, { data, loading, error }] = usePutImagesInDatasetMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function usePutImagesInDatasetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PutImagesInDatasetMutation, PutImagesInDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PutImagesInDatasetMutation, PutImagesInDatasetMutationVariables>(PutImagesInDatasetDocument, options);
      }
export type PutImagesInDatasetMutationHookResult = ReturnType<typeof usePutImagesInDatasetMutation>;
export type PutImagesInDatasetMutationResult = Apollo.MutationResult<PutImagesInDatasetMutation>;
export type PutImagesInDatasetMutationOptions = Apollo.BaseMutationOptions<PutImagesInDatasetMutation, PutImagesInDatasetMutationVariables>;
export const ReleaseImagesFromDatasetDocument = gql`
    mutation ReleaseImagesFromDataset($selfs: [ID!]!, $other: ID!) {
  releaseImagesFromDataset(input: {selfs: $selfs, other: $other}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type ReleaseImagesFromDatasetMutationFn = Apollo.MutationFunction<ReleaseImagesFromDatasetMutation, ReleaseImagesFromDatasetMutationVariables>;

/**
 * __useReleaseImagesFromDatasetMutation__
 *
 * To run a mutation, you first call `useReleaseImagesFromDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseImagesFromDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseImagesFromDatasetMutation, { data, loading, error }] = useReleaseImagesFromDatasetMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function useReleaseImagesFromDatasetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ReleaseImagesFromDatasetMutation, ReleaseImagesFromDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ReleaseImagesFromDatasetMutation, ReleaseImagesFromDatasetMutationVariables>(ReleaseImagesFromDatasetDocument, options);
      }
export type ReleaseImagesFromDatasetMutationHookResult = ReturnType<typeof useReleaseImagesFromDatasetMutation>;
export type ReleaseImagesFromDatasetMutationResult = Apollo.MutationResult<ReleaseImagesFromDatasetMutation>;
export type ReleaseImagesFromDatasetMutationOptions = Apollo.BaseMutationOptions<ReleaseImagesFromDatasetMutation, ReleaseImagesFromDatasetMutationVariables>;
export const PutFilesInDatasetDocument = gql`
    mutation PutFilesInDataset($selfs: [ID!]!, $other: ID!) {
  putFilesInDataset(input: {selfs: $selfs, other: $other}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type PutFilesInDatasetMutationFn = Apollo.MutationFunction<PutFilesInDatasetMutation, PutFilesInDatasetMutationVariables>;

/**
 * __usePutFilesInDatasetMutation__
 *
 * To run a mutation, you first call `usePutFilesInDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutFilesInDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putFilesInDatasetMutation, { data, loading, error }] = usePutFilesInDatasetMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function usePutFilesInDatasetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PutFilesInDatasetMutation, PutFilesInDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PutFilesInDatasetMutation, PutFilesInDatasetMutationVariables>(PutFilesInDatasetDocument, options);
      }
export type PutFilesInDatasetMutationHookResult = ReturnType<typeof usePutFilesInDatasetMutation>;
export type PutFilesInDatasetMutationResult = Apollo.MutationResult<PutFilesInDatasetMutation>;
export type PutFilesInDatasetMutationOptions = Apollo.BaseMutationOptions<PutFilesInDatasetMutation, PutFilesInDatasetMutationVariables>;
export const ReleaseFilesFromDatasetDocument = gql`
    mutation ReleaseFilesFromDataset($selfs: [ID!]!, $other: ID!) {
  releaseFilesFromDataset(input: {selfs: $selfs, other: $other}) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;
export type ReleaseFilesFromDatasetMutationFn = Apollo.MutationFunction<ReleaseFilesFromDatasetMutation, ReleaseFilesFromDatasetMutationVariables>;

/**
 * __useReleaseFilesFromDatasetMutation__
 *
 * To run a mutation, you first call `useReleaseFilesFromDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseFilesFromDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseFilesFromDatasetMutation, { data, loading, error }] = useReleaseFilesFromDatasetMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function useReleaseFilesFromDatasetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ReleaseFilesFromDatasetMutation, ReleaseFilesFromDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ReleaseFilesFromDatasetMutation, ReleaseFilesFromDatasetMutationVariables>(ReleaseFilesFromDatasetDocument, options);
      }
export type ReleaseFilesFromDatasetMutationHookResult = ReturnType<typeof useReleaseFilesFromDatasetMutation>;
export type ReleaseFilesFromDatasetMutationResult = Apollo.MutationResult<ReleaseFilesFromDatasetMutation>;
export type ReleaseFilesFromDatasetMutationOptions = Apollo.BaseMutationOptions<ReleaseFilesFromDatasetMutation, ReleaseFilesFromDatasetMutationVariables>;
export const RevertDatasetDocument = gql`
    mutation RevertDataset($dataset: ID!, $history: ID!) {
  revertDataset(input: {id: $dataset, historyId: $history}) {
    id
    name
    description
  }
}
    `;
export type RevertDatasetMutationFn = Apollo.MutationFunction<RevertDatasetMutation, RevertDatasetMutationVariables>;

/**
 * __useRevertDatasetMutation__
 *
 * To run a mutation, you first call `useRevertDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevertDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revertDatasetMutation, { data, loading, error }] = useRevertDatasetMutation({
 *   variables: {
 *      dataset: // value for 'dataset'
 *      history: // value for 'history'
 *   },
 * });
 */
export function useRevertDatasetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevertDatasetMutation, RevertDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevertDatasetMutation, RevertDatasetMutationVariables>(RevertDatasetDocument, options);
      }
export type RevertDatasetMutationHookResult = ReturnType<typeof useRevertDatasetMutation>;
export type RevertDatasetMutationResult = Apollo.MutationResult<RevertDatasetMutation>;
export type RevertDatasetMutationOptions = Apollo.BaseMutationOptions<RevertDatasetMutation, RevertDatasetMutationVariables>;
export const DeleteDatasetDocument = gql`
    mutation DeleteDataset($id: ID!) {
  deleteDataset(input: {id: $id})
}
    `;
export type DeleteDatasetMutationFn = Apollo.MutationFunction<DeleteDatasetMutation, DeleteDatasetMutationVariables>;

/**
 * __useDeleteDatasetMutation__
 *
 * To run a mutation, you first call `useDeleteDatasetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteDatasetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteDatasetMutation, { data, loading, error }] = useDeleteDatasetMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteDatasetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteDatasetMutation, DeleteDatasetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteDatasetMutation, DeleteDatasetMutationVariables>(DeleteDatasetDocument, options);
      }
export type DeleteDatasetMutationHookResult = ReturnType<typeof useDeleteDatasetMutation>;
export type DeleteDatasetMutationResult = Apollo.MutationResult<DeleteDatasetMutation>;
export type DeleteDatasetMutationOptions = Apollo.BaseMutationOptions<DeleteDatasetMutation, DeleteDatasetMutationVariables>;
export const From_File_LikeDocument = gql`
    mutation from_file_like($file: FileLike!, $name: String!, $origins: [ID!], $dataset: ID) {
  fromFileLike(
    input: {file: $file, name: $name, origins: $origins, dataset: $dataset}
  ) {
    ...File
  }
}
    ${FileFragmentDoc}`;
export type From_File_LikeMutationFn = Apollo.MutationFunction<From_File_LikeMutation, From_File_LikeMutationVariables>;

/**
 * __useFrom_File_LikeMutation__
 *
 * To run a mutation, you first call `useFrom_File_LikeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFrom_File_LikeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [fromFileLikeMutation, { data, loading, error }] = useFrom_File_LikeMutation({
 *   variables: {
 *      file: // value for 'file'
 *      name: // value for 'name'
 *      origins: // value for 'origins'
 *      dataset: // value for 'dataset'
 *   },
 * });
 */
export function useFrom_File_LikeMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<From_File_LikeMutation, From_File_LikeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<From_File_LikeMutation, From_File_LikeMutationVariables>(From_File_LikeDocument, options);
      }
export type From_File_LikeMutationHookResult = ReturnType<typeof useFrom_File_LikeMutation>;
export type From_File_LikeMutationResult = Apollo.MutationResult<From_File_LikeMutation>;
export type From_File_LikeMutationOptions = Apollo.BaseMutationOptions<From_File_LikeMutation, From_File_LikeMutationVariables>;
export const DeleteFileDocument = gql`
    mutation DeleteFile($id: ID!) {
  deleteFile(input: {id: $id})
}
    `;
export type DeleteFileMutationFn = Apollo.MutationFunction<DeleteFileMutation, DeleteFileMutationVariables>;

/**
 * __useDeleteFileMutation__
 *
 * To run a mutation, you first call `useDeleteFileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteFileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteFileMutation, { data, loading, error }] = useDeleteFileMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteFileMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteFileMutation, DeleteFileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteFileMutation, DeleteFileMutationVariables>(DeleteFileDocument, options);
      }
export type DeleteFileMutationHookResult = ReturnType<typeof useDeleteFileMutation>;
export type DeleteFileMutationResult = Apollo.MutationResult<DeleteFileMutation>;
export type DeleteFileMutationOptions = Apollo.BaseMutationOptions<DeleteFileMutation, DeleteFileMutationVariables>;
export const CreateModelWorkspaceDocument = gql`
    mutation CreateModelWorkspace($input: CreateModelWorkspaceInput!) {
  createModelWorkspace(input: $input) {
    ...DetailModelWorkspace
  }
}
    ${DetailModelWorkspaceFragmentDoc}`;
export type CreateModelWorkspaceMutationFn = Apollo.MutationFunction<CreateModelWorkspaceMutation, CreateModelWorkspaceMutationVariables>;

/**
 * __useCreateModelWorkspaceMutation__
 *
 * To run a mutation, you first call `useCreateModelWorkspaceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateModelWorkspaceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createModelWorkspaceMutation, { data, loading, error }] = useCreateModelWorkspaceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateModelWorkspaceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateModelWorkspaceMutation, CreateModelWorkspaceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateModelWorkspaceMutation, CreateModelWorkspaceMutationVariables>(CreateModelWorkspaceDocument, options);
      }
export type CreateModelWorkspaceMutationHookResult = ReturnType<typeof useCreateModelWorkspaceMutation>;
export type CreateModelWorkspaceMutationResult = Apollo.MutationResult<CreateModelWorkspaceMutation>;
export type CreateModelWorkspaceMutationOptions = Apollo.BaseMutationOptions<CreateModelWorkspaceMutation, CreateModelWorkspaceMutationVariables>;
export const AddModelsToWorkspaceDocument = gql`
    mutation AddModelsToWorkspace($input: AddModelsToWorkspaceInput!) {
  addModelsToWorkspace(input: $input) {
    ...DetailModelWorkspace
  }
}
    ${DetailModelWorkspaceFragmentDoc}`;
export type AddModelsToWorkspaceMutationFn = Apollo.MutationFunction<AddModelsToWorkspaceMutation, AddModelsToWorkspaceMutationVariables>;

/**
 * __useAddModelsToWorkspaceMutation__
 *
 * To run a mutation, you first call `useAddModelsToWorkspaceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddModelsToWorkspaceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addModelsToWorkspaceMutation, { data, loading, error }] = useAddModelsToWorkspaceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddModelsToWorkspaceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<AddModelsToWorkspaceMutation, AddModelsToWorkspaceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<AddModelsToWorkspaceMutation, AddModelsToWorkspaceMutationVariables>(AddModelsToWorkspaceDocument, options);
      }
export type AddModelsToWorkspaceMutationHookResult = ReturnType<typeof useAddModelsToWorkspaceMutation>;
export type AddModelsToWorkspaceMutationResult = Apollo.MutationResult<AddModelsToWorkspaceMutation>;
export type AddModelsToWorkspaceMutationOptions = Apollo.BaseMutationOptions<AddModelsToWorkspaceMutation, AddModelsToWorkspaceMutationVariables>;
export const RemoveModelsFromWorkspaceDocument = gql`
    mutation RemoveModelsFromWorkspace($input: DesociateInput!) {
  removeModelsFromWorkspace(input: $input) {
    ...DetailModelWorkspace
  }
}
    ${DetailModelWorkspaceFragmentDoc}`;
export type RemoveModelsFromWorkspaceMutationFn = Apollo.MutationFunction<RemoveModelsFromWorkspaceMutation, RemoveModelsFromWorkspaceMutationVariables>;

/**
 * __useRemoveModelsFromWorkspaceMutation__
 *
 * To run a mutation, you first call `useRemoveModelsFromWorkspaceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveModelsFromWorkspaceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeModelsFromWorkspaceMutation, { data, loading, error }] = useRemoveModelsFromWorkspaceMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRemoveModelsFromWorkspaceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RemoveModelsFromWorkspaceMutation, RemoveModelsFromWorkspaceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RemoveModelsFromWorkspaceMutation, RemoveModelsFromWorkspaceMutationVariables>(RemoveModelsFromWorkspaceDocument, options);
      }
export type RemoveModelsFromWorkspaceMutationHookResult = ReturnType<typeof useRemoveModelsFromWorkspaceMutation>;
export type RemoveModelsFromWorkspaceMutationResult = Apollo.MutationResult<RemoveModelsFromWorkspaceMutation>;
export type RemoveModelsFromWorkspaceMutationOptions = Apollo.BaseMutationOptions<RemoveModelsFromWorkspaceMutation, RemoveModelsFromWorkspaceMutationVariables>;
export const DeleteModelWorkspaceDocument = gql`
    mutation DeleteModelWorkspace($id: ID!) {
  deleteModelWorkspace(input: {id: $id})
}
    `;
export type DeleteModelWorkspaceMutationFn = Apollo.MutationFunction<DeleteModelWorkspaceMutation, DeleteModelWorkspaceMutationVariables>;

/**
 * __useDeleteModelWorkspaceMutation__
 *
 * To run a mutation, you first call `useDeleteModelWorkspaceMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteModelWorkspaceMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteModelWorkspaceMutation, { data, loading, error }] = useDeleteModelWorkspaceMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteModelWorkspaceMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteModelWorkspaceMutation, DeleteModelWorkspaceMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteModelWorkspaceMutation, DeleteModelWorkspaceMutationVariables>(DeleteModelWorkspaceDocument, options);
      }
export type DeleteModelWorkspaceMutationHookResult = ReturnType<typeof useDeleteModelWorkspaceMutation>;
export type DeleteModelWorkspaceMutationResult = Apollo.MutationResult<DeleteModelWorkspaceMutation>;
export type DeleteModelWorkspaceMutationOptions = Apollo.BaseMutationOptions<DeleteModelWorkspaceMutation, DeleteModelWorkspaceMutationVariables>;
export const CreateNeuronModelDocument = gql`
    mutation CreateNeuronModel($input: CreateNeuronModelInput!) {
  createNeuronModel(input: $input) {
    id
    name
    config {
      cells {
        id
      }
    }
  }
}
    `;
export type CreateNeuronModelMutationFn = Apollo.MutationFunction<CreateNeuronModelMutation, CreateNeuronModelMutationVariables>;

/**
 * __useCreateNeuronModelMutation__
 *
 * To run a mutation, you first call `useCreateNeuronModelMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateNeuronModelMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createNeuronModelMutation, { data, loading, error }] = useCreateNeuronModelMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateNeuronModelMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateNeuronModelMutation, CreateNeuronModelMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateNeuronModelMutation, CreateNeuronModelMutationVariables>(CreateNeuronModelDocument, options);
      }
export type CreateNeuronModelMutationHookResult = ReturnType<typeof useCreateNeuronModelMutation>;
export type CreateNeuronModelMutationResult = Apollo.MutationResult<CreateNeuronModelMutation>;
export type CreateNeuronModelMutationOptions = Apollo.BaseMutationOptions<CreateNeuronModelMutation, CreateNeuronModelMutationVariables>;
export const DeleteNeuronModelDocument = gql`
    mutation DeleteNeuronModel($id: ID!) {
  deleteNeuronModel(input: {id: $id})
}
    `;
export type DeleteNeuronModelMutationFn = Apollo.MutationFunction<DeleteNeuronModelMutation, DeleteNeuronModelMutationVariables>;

/**
 * __useDeleteNeuronModelMutation__
 *
 * To run a mutation, you first call `useDeleteNeuronModelMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteNeuronModelMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteNeuronModelMutation, { data, loading, error }] = useDeleteNeuronModelMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteNeuronModelMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteNeuronModelMutation, DeleteNeuronModelMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteNeuronModelMutation, DeleteNeuronModelMutationVariables>(DeleteNeuronModelDocument, options);
      }
export type DeleteNeuronModelMutationHookResult = ReturnType<typeof useDeleteNeuronModelMutation>;
export type DeleteNeuronModelMutationResult = Apollo.MutationResult<DeleteNeuronModelMutation>;
export type DeleteNeuronModelMutationOptions = Apollo.BaseMutationOptions<DeleteNeuronModelMutation, DeleteNeuronModelMutationVariables>;
export const RequestGeneralZarrAccessDocument = gql`
    mutation RequestGeneralZarrAccess($input: RequestGeneralZarrAccessInput!) {
  requestGeneralZarrAccess(input: $input) {
    ...GeneralZarrAccessGrant
  }
}
    ${GeneralZarrAccessGrantFragmentDoc}`;
export type RequestGeneralZarrAccessMutationFn = Apollo.MutationFunction<RequestGeneralZarrAccessMutation, RequestGeneralZarrAccessMutationVariables>;

/**
 * __useRequestGeneralZarrAccessMutation__
 *
 * To run a mutation, you first call `useRequestGeneralZarrAccessMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestGeneralZarrAccessMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestGeneralZarrAccessMutation, { data, loading, error }] = useRequestGeneralZarrAccessMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestGeneralZarrAccessMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestGeneralZarrAccessMutation, RequestGeneralZarrAccessMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestGeneralZarrAccessMutation, RequestGeneralZarrAccessMutationVariables>(RequestGeneralZarrAccessDocument, options);
      }
export type RequestGeneralZarrAccessMutationHookResult = ReturnType<typeof useRequestGeneralZarrAccessMutation>;
export type RequestGeneralZarrAccessMutationResult = Apollo.MutationResult<RequestGeneralZarrAccessMutation>;
export type RequestGeneralZarrAccessMutationOptions = Apollo.BaseMutationOptions<RequestGeneralZarrAccessMutation, RequestGeneralZarrAccessMutationVariables>;
export const DetailBlockDocument = gql`
    query DetailBlock($id: ID!) {
  block(id: $id) {
    ...Block
  }
}
    ${BlockFragmentDoc}`;

/**
 * __useDetailBlockQuery__
 *
 * To run a query within a React component, call `useDetailBlockQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailBlockQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailBlockQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailBlockQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailBlockQuery, DetailBlockQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailBlockQuery, DetailBlockQueryVariables>(DetailBlockDocument, options);
      }
export function useDetailBlockLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailBlockQuery, DetailBlockQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailBlockQuery, DetailBlockQueryVariables>(DetailBlockDocument, options);
        }
export type DetailBlockQueryHookResult = ReturnType<typeof useDetailBlockQuery>;
export type DetailBlockLazyQueryHookResult = ReturnType<typeof useDetailBlockLazyQuery>;
export type DetailBlockQueryResult = Apollo.QueryResult<DetailBlockQuery, DetailBlockQueryVariables>;
export const ListBlocksDocument = gql`
    query ListBlocks($pagination: OffsetPaginationInput, $filters: BlockFilter, $ordering: [BlockOrder!]) {
  blocks(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...ListBlock
  }
}
    ${ListBlockFragmentDoc}`;

/**
 * __useListBlocksQuery__
 *
 * To run a query within a React component, call `useListBlocksQuery` and pass it any options that fit your needs.
 * When your component renders, `useListBlocksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListBlocksQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListBlocksQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListBlocksQuery, ListBlocksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListBlocksQuery, ListBlocksQueryVariables>(ListBlocksDocument, options);
      }
export function useListBlocksLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListBlocksQuery, ListBlocksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListBlocksQuery, ListBlocksQueryVariables>(ListBlocksDocument, options);
        }
export type ListBlocksQueryHookResult = ReturnType<typeof useListBlocksQuery>;
export type ListBlocksLazyQueryHookResult = ReturnType<typeof useListBlocksLazyQuery>;
export type ListBlocksQueryResult = Apollo.QueryResult<ListBlocksQuery, ListBlocksQueryVariables>;
export const GetDatasetDocument = gql`
    query GetDataset($id: ID!) {
  dataset(id: $id) {
    ...Dataset
  }
}
    ${DatasetFragmentDoc}`;

/**
 * __useGetDatasetQuery__
 *
 * To run a query within a React component, call `useGetDatasetQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDatasetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDatasetQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetDatasetQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetDatasetQuery, GetDatasetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetDatasetQuery, GetDatasetQueryVariables>(GetDatasetDocument, options);
      }
export function useGetDatasetLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetDatasetQuery, GetDatasetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetDatasetQuery, GetDatasetQueryVariables>(GetDatasetDocument, options);
        }
export type GetDatasetQueryHookResult = ReturnType<typeof useGetDatasetQuery>;
export type GetDatasetLazyQueryHookResult = ReturnType<typeof useGetDatasetLazyQuery>;
export type GetDatasetQueryResult = Apollo.QueryResult<GetDatasetQuery, GetDatasetQueryVariables>;
export const GetDatasetsDocument = gql`
    query GetDatasets($filters: DatasetFilter, $pagination: OffsetPaginationInput, $ordering: [DatasetOrder!]) {
  datasets(filters: $filters, pagination: $pagination, ordering: $ordering) {
    ...ListDataset
  }
}
    ${ListDatasetFragmentDoc}`;

/**
 * __useGetDatasetsQuery__
 *
 * To run a query within a React component, call `useGetDatasetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDatasetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDatasetsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useGetDatasetsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetDatasetsQuery, GetDatasetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetDatasetsQuery, GetDatasetsQueryVariables>(GetDatasetsDocument, options);
      }
export function useGetDatasetsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetDatasetsQuery, GetDatasetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetDatasetsQuery, GetDatasetsQueryVariables>(GetDatasetsDocument, options);
        }
export type GetDatasetsQueryHookResult = ReturnType<typeof useGetDatasetsQuery>;
export type GetDatasetsLazyQueryHookResult = ReturnType<typeof useGetDatasetsLazyQuery>;
export type GetDatasetsQueryResult = Apollo.QueryResult<GetDatasetsQuery, GetDatasetsQueryVariables>;
export const DetailModEnvironmentDocument = gql`
    query DetailModEnvironment($id: ID!) {
  modEnvironment(id: $id) {
    ...ModEnvironment
  }
}
    ${ModEnvironmentFragmentDoc}`;

/**
 * __useDetailModEnvironmentQuery__
 *
 * To run a query within a React component, call `useDetailModEnvironmentQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailModEnvironmentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailModEnvironmentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailModEnvironmentQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailModEnvironmentQuery, DetailModEnvironmentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailModEnvironmentQuery, DetailModEnvironmentQueryVariables>(DetailModEnvironmentDocument, options);
      }
export function useDetailModEnvironmentLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailModEnvironmentQuery, DetailModEnvironmentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailModEnvironmentQuery, DetailModEnvironmentQueryVariables>(DetailModEnvironmentDocument, options);
        }
export type DetailModEnvironmentQueryHookResult = ReturnType<typeof useDetailModEnvironmentQuery>;
export type DetailModEnvironmentLazyQueryHookResult = ReturnType<typeof useDetailModEnvironmentLazyQuery>;
export type DetailModEnvironmentQueryResult = Apollo.QueryResult<DetailModEnvironmentQuery, DetailModEnvironmentQueryVariables>;
export const ListModEnvironmentsDocument = gql`
    query ListModEnvironments($pagination: OffsetPaginationInput, $filters: ModEnvironmentFilter, $ordering: [ModEnvironmentOrder!]) {
  modEnvironments(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...ListModEnvironment
  }
}
    ${ListModEnvironmentFragmentDoc}`;

/**
 * __useListModEnvironmentsQuery__
 *
 * To run a query within a React component, call `useListModEnvironmentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListModEnvironmentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListModEnvironmentsQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListModEnvironmentsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListModEnvironmentsQuery, ListModEnvironmentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListModEnvironmentsQuery, ListModEnvironmentsQueryVariables>(ListModEnvironmentsDocument, options);
      }
export function useListModEnvironmentsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListModEnvironmentsQuery, ListModEnvironmentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListModEnvironmentsQuery, ListModEnvironmentsQueryVariables>(ListModEnvironmentsDocument, options);
        }
export type ListModEnvironmentsQueryHookResult = ReturnType<typeof useListModEnvironmentsQuery>;
export type ListModEnvironmentsLazyQueryHookResult = ReturnType<typeof useListModEnvironmentsLazyQuery>;
export type ListModEnvironmentsQueryResult = Apollo.QueryResult<ListModEnvironmentsQuery, ListModEnvironmentsQueryVariables>;
export const DetailExperimentDocument = gql`
    query DetailExperiment($id: ID!) {
  experiment(id: $id) {
    ...Experiment
  }
}
    ${ExperimentFragmentDoc}`;

/**
 * __useDetailExperimentQuery__
 *
 * To run a query within a React component, call `useDetailExperimentQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailExperimentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailExperimentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailExperimentQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailExperimentQuery, DetailExperimentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailExperimentQuery, DetailExperimentQueryVariables>(DetailExperimentDocument, options);
      }
export function useDetailExperimentLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailExperimentQuery, DetailExperimentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailExperimentQuery, DetailExperimentQueryVariables>(DetailExperimentDocument, options);
        }
export type DetailExperimentQueryHookResult = ReturnType<typeof useDetailExperimentQuery>;
export type DetailExperimentLazyQueryHookResult = ReturnType<typeof useDetailExperimentLazyQuery>;
export type DetailExperimentQueryResult = Apollo.QueryResult<DetailExperimentQuery, DetailExperimentQueryVariables>;
export const ListExperimentsDocument = gql`
    query ListExperiments($pagination: OffsetPaginationInput, $filters: ExperimentFilter, $ordering: [ExperimentOrder!]) {
  experiments(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...ListExperiment
  }
}
    ${ListExperimentFragmentDoc}`;

/**
 * __useListExperimentsQuery__
 *
 * To run a query within a React component, call `useListExperimentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListExperimentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListExperimentsQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListExperimentsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListExperimentsQuery, ListExperimentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListExperimentsQuery, ListExperimentsQueryVariables>(ListExperimentsDocument, options);
      }
export function useListExperimentsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListExperimentsQuery, ListExperimentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListExperimentsQuery, ListExperimentsQueryVariables>(ListExperimentsDocument, options);
        }
export type ListExperimentsQueryHookResult = ReturnType<typeof useListExperimentsQuery>;
export type ListExperimentsLazyQueryHookResult = ReturnType<typeof useListExperimentsLazyQuery>;
export type ListExperimentsQueryResult = Apollo.QueryResult<ListExperimentsQuery, ListExperimentsQueryVariables>;
export const GetFileDocument = gql`
    query GetFile($id: ID!) {
  file(id: $id) {
    ...File
  }
}
    ${FileFragmentDoc}`;

/**
 * __useGetFileQuery__
 *
 * To run a query within a React component, call `useGetFileQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFileQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetFileQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetFileQuery, GetFileQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetFileQuery, GetFileQueryVariables>(GetFileDocument, options);
      }
export function useGetFileLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetFileQuery, GetFileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetFileQuery, GetFileQueryVariables>(GetFileDocument, options);
        }
export type GetFileQueryHookResult = ReturnType<typeof useGetFileQuery>;
export type GetFileLazyQueryHookResult = ReturnType<typeof useGetFileLazyQuery>;
export type GetFileQueryResult = Apollo.QueryResult<GetFileQuery, GetFileQueryVariables>;
export const GetFilesDocument = gql`
    query GetFiles($filters: FileFilter, $pagination: OffsetPaginationInput, $ordering: [FileOrder!]) {
  files(filters: $filters, pagination: $pagination, ordering: $ordering) {
    ...ListFile
  }
}
    ${ListFileFragmentDoc}`;

/**
 * __useGetFilesQuery__
 *
 * To run a query within a React component, call `useGetFilesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFilesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFilesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useGetFilesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetFilesQuery, GetFilesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetFilesQuery, GetFilesQueryVariables>(GetFilesDocument, options);
      }
export function useGetFilesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetFilesQuery, GetFilesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetFilesQuery, GetFilesQueryVariables>(GetFilesDocument, options);
        }
export type GetFilesQueryHookResult = ReturnType<typeof useGetFilesQuery>;
export type GetFilesLazyQueryHookResult = ReturnType<typeof useGetFilesLazyQuery>;
export type GetFilesQueryResult = Apollo.QueryResult<GetFilesQuery, GetFilesQueryVariables>;
export const HomePageDocument = gql`
    query HomePage {
  blocks: blocks(pagination: {limit: 1}, ordering: [{createdAt: DESC}]) {
    ...ListBlock
  }
  models: neuronModels(pagination: {limit: 1}, ordering: [{createdAt: DESC}]) {
    ...ListNeuronModel
  }
}
    ${ListBlockFragmentDoc}
${ListNeuronModelFragmentDoc}`;

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
  blockStats {
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
export const DetailMechanismDocument = gql`
    query DetailMechanism($id: ID!) {
  mechanism(id: $id) {
    ...Mechanism
  }
}
    ${MechanismFragmentDoc}`;

/**
 * __useDetailMechanismQuery__
 *
 * To run a query within a React component, call `useDetailMechanismQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailMechanismQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailMechanismQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailMechanismQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailMechanismQuery, DetailMechanismQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailMechanismQuery, DetailMechanismQueryVariables>(DetailMechanismDocument, options);
      }
export function useDetailMechanismLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailMechanismQuery, DetailMechanismQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailMechanismQuery, DetailMechanismQueryVariables>(DetailMechanismDocument, options);
        }
export type DetailMechanismQueryHookResult = ReturnType<typeof useDetailMechanismQuery>;
export type DetailMechanismLazyQueryHookResult = ReturnType<typeof useDetailMechanismLazyQuery>;
export type DetailMechanismQueryResult = Apollo.QueryResult<DetailMechanismQuery, DetailMechanismQueryVariables>;
export const ListMechanismsDocument = gql`
    query ListMechanisms($pagination: OffsetPaginationInput, $filters: MechanismFilter, $ordering: [MechanismOrder!]) {
  mechanisms(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...ListMechanism
  }
}
    ${ListMechanismFragmentDoc}`;

/**
 * __useListMechanismsQuery__
 *
 * To run a query within a React component, call `useListMechanismsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListMechanismsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListMechanismsQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListMechanismsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListMechanismsQuery, ListMechanismsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListMechanismsQuery, ListMechanismsQueryVariables>(ListMechanismsDocument, options);
      }
export function useListMechanismsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListMechanismsQuery, ListMechanismsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListMechanismsQuery, ListMechanismsQueryVariables>(ListMechanismsDocument, options);
        }
export type ListMechanismsQueryHookResult = ReturnType<typeof useListMechanismsQuery>;
export type ListMechanismsLazyQueryHookResult = ReturnType<typeof useListMechanismsLazyQuery>;
export type ListMechanismsQueryResult = Apollo.QueryResult<ListMechanismsQuery, ListMechanismsQueryVariables>;
export const DetailModelCollectionDocument = gql`
    query DetailModelCollection($id: ID!) {
  modelCollection(id: $id) {
    ...ModelCollection
  }
}
    ${ModelCollectionFragmentDoc}`;

/**
 * __useDetailModelCollectionQuery__
 *
 * To run a query within a React component, call `useDetailModelCollectionQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailModelCollectionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailModelCollectionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailModelCollectionQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailModelCollectionQuery, DetailModelCollectionQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailModelCollectionQuery, DetailModelCollectionQueryVariables>(DetailModelCollectionDocument, options);
      }
export function useDetailModelCollectionLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailModelCollectionQuery, DetailModelCollectionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailModelCollectionQuery, DetailModelCollectionQueryVariables>(DetailModelCollectionDocument, options);
        }
export type DetailModelCollectionQueryHookResult = ReturnType<typeof useDetailModelCollectionQuery>;
export type DetailModelCollectionLazyQueryHookResult = ReturnType<typeof useDetailModelCollectionLazyQuery>;
export type DetailModelCollectionQueryResult = Apollo.QueryResult<DetailModelCollectionQuery, DetailModelCollectionQueryVariables>;
export const ListModelCollectionsDocument = gql`
    query ListModelCollections($pagination: OffsetPaginationInput, $filters: ModelCollectionFilter, $ordering: [ModelCollectionOrder!]) {
  modelCollections(
    pagination: $pagination
    filters: $filters
    ordering: $ordering
  ) {
    ...ListModelCollection
  }
}
    ${ListModelCollectionFragmentDoc}`;

/**
 * __useListModelCollectionsQuery__
 *
 * To run a query within a React component, call `useListModelCollectionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListModelCollectionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListModelCollectionsQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListModelCollectionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListModelCollectionsQuery, ListModelCollectionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListModelCollectionsQuery, ListModelCollectionsQueryVariables>(ListModelCollectionsDocument, options);
      }
export function useListModelCollectionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListModelCollectionsQuery, ListModelCollectionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListModelCollectionsQuery, ListModelCollectionsQueryVariables>(ListModelCollectionsDocument, options);
        }
export type ListModelCollectionsQueryHookResult = ReturnType<typeof useListModelCollectionsQuery>;
export type ListModelCollectionsLazyQueryHookResult = ReturnType<typeof useListModelCollectionsLazyQuery>;
export type ListModelCollectionsQueryResult = Apollo.QueryResult<ListModelCollectionsQuery, ListModelCollectionsQueryVariables>;
export const DetailModelWorkspaceDocument = gql`
    query DetailModelWorkspace($id: ID!) {
  modelWorkspace(id: $id) {
    ...DetailModelWorkspace
  }
}
    ${DetailModelWorkspaceFragmentDoc}`;

/**
 * __useDetailModelWorkspaceQuery__
 *
 * To run a query within a React component, call `useDetailModelWorkspaceQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailModelWorkspaceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailModelWorkspaceQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailModelWorkspaceQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailModelWorkspaceQuery, DetailModelWorkspaceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailModelWorkspaceQuery, DetailModelWorkspaceQueryVariables>(DetailModelWorkspaceDocument, options);
      }
export function useDetailModelWorkspaceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailModelWorkspaceQuery, DetailModelWorkspaceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailModelWorkspaceQuery, DetailModelWorkspaceQueryVariables>(DetailModelWorkspaceDocument, options);
        }
export type DetailModelWorkspaceQueryHookResult = ReturnType<typeof useDetailModelWorkspaceQuery>;
export type DetailModelWorkspaceLazyQueryHookResult = ReturnType<typeof useDetailModelWorkspaceLazyQuery>;
export type DetailModelWorkspaceQueryResult = Apollo.QueryResult<DetailModelWorkspaceQuery, DetailModelWorkspaceQueryVariables>;
export const ListModelWorkspacesDocument = gql`
    query ListModelWorkspaces($pagination: OffsetPaginationInput, $filters: ModelWorkspaceFilter, $ordering: [ModelWorkspaceOrder!]) {
  modelWorkspaces(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...ListModelWorkspace
  }
}
    ${ListModelWorkspaceFragmentDoc}`;

/**
 * __useListModelWorkspacesQuery__
 *
 * To run a query within a React component, call `useListModelWorkspacesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListModelWorkspacesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListModelWorkspacesQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListModelWorkspacesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListModelWorkspacesQuery, ListModelWorkspacesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListModelWorkspacesQuery, ListModelWorkspacesQueryVariables>(ListModelWorkspacesDocument, options);
      }
export function useListModelWorkspacesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListModelWorkspacesQuery, ListModelWorkspacesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListModelWorkspacesQuery, ListModelWorkspacesQueryVariables>(ListModelWorkspacesDocument, options);
        }
export type ListModelWorkspacesQueryHookResult = ReturnType<typeof useListModelWorkspacesQuery>;
export type ListModelWorkspacesLazyQueryHookResult = ReturnType<typeof useListModelWorkspacesLazyQuery>;
export type ListModelWorkspacesQueryResult = Apollo.QueryResult<ListModelWorkspacesQuery, ListModelWorkspacesQueryVariables>;
export const DetailNeuronModelDocument = gql`
    query DetailNeuronModel($id: ID!) {
  neuronModel(id: $id) {
    ...DetailNeuronModel
  }
}
    ${DetailNeuronModelFragmentDoc}`;

/**
 * __useDetailNeuronModelQuery__
 *
 * To run a query within a React component, call `useDetailNeuronModelQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailNeuronModelQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailNeuronModelQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailNeuronModelQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailNeuronModelQuery, DetailNeuronModelQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailNeuronModelQuery, DetailNeuronModelQueryVariables>(DetailNeuronModelDocument, options);
      }
export function useDetailNeuronModelLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailNeuronModelQuery, DetailNeuronModelQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailNeuronModelQuery, DetailNeuronModelQueryVariables>(DetailNeuronModelDocument, options);
        }
export type DetailNeuronModelQueryHookResult = ReturnType<typeof useDetailNeuronModelQuery>;
export type DetailNeuronModelLazyQueryHookResult = ReturnType<typeof useDetailNeuronModelLazyQuery>;
export type DetailNeuronModelQueryResult = Apollo.QueryResult<DetailNeuronModelQuery, DetailNeuronModelQueryVariables>;
export const SectionDominanceDocument = gql`
    query SectionDominance($id: ID!, $weightAxial: Float, $weightCapacitance: Float, $weightConductance: Float) {
  neuronModel(id: $id) {
    id
    sectionDominance(
      weightAxial: $weightAxial
      weightCapacitance: $weightCapacitance
      weightConductance: $weightConductance
    ) {
      ...SectionDominance
    }
  }
}
    ${SectionDominanceFragmentDoc}`;

/**
 * __useSectionDominanceQuery__
 *
 * To run a query within a React component, call `useSectionDominanceQuery` and pass it any options that fit your needs.
 * When your component renders, `useSectionDominanceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSectionDominanceQuery({
 *   variables: {
 *      id: // value for 'id'
 *      weightAxial: // value for 'weightAxial'
 *      weightCapacitance: // value for 'weightCapacitance'
 *      weightConductance: // value for 'weightConductance'
 *   },
 * });
 */
export function useSectionDominanceQuery(baseOptions: ApolloReactHooks.QueryHookOptions<SectionDominanceQuery, SectionDominanceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SectionDominanceQuery, SectionDominanceQueryVariables>(SectionDominanceDocument, options);
      }
export function useSectionDominanceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SectionDominanceQuery, SectionDominanceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SectionDominanceQuery, SectionDominanceQueryVariables>(SectionDominanceDocument, options);
        }
export type SectionDominanceQueryHookResult = ReturnType<typeof useSectionDominanceQuery>;
export type SectionDominanceLazyQueryHookResult = ReturnType<typeof useSectionDominanceLazyQuery>;
export type SectionDominanceQueryResult = Apollo.QueryResult<SectionDominanceQuery, SectionDominanceQueryVariables>;
export const ListNeuronModelsDocument = gql`
    query ListNeuronModels($pagination: OffsetPaginationInput, $filters: NeuronModelFilter, $ordering: [NeuronModelOrder!]) {
  neuronModels(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...ListNeuronModel
  }
}
    ${ListNeuronModelFragmentDoc}`;

/**
 * __useListNeuronModelsQuery__
 *
 * To run a query within a React component, call `useListNeuronModelsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListNeuronModelsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListNeuronModelsQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListNeuronModelsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListNeuronModelsQuery, ListNeuronModelsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListNeuronModelsQuery, ListNeuronModelsQueryVariables>(ListNeuronModelsDocument, options);
      }
export function useListNeuronModelsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListNeuronModelsQuery, ListNeuronModelsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListNeuronModelsQuery, ListNeuronModelsQueryVariables>(ListNeuronModelsDocument, options);
        }
export type ListNeuronModelsQueryHookResult = ReturnType<typeof useListNeuronModelsQuery>;
export type ListNeuronModelsLazyQueryHookResult = ReturnType<typeof useListNeuronModelsLazyQuery>;
export type ListNeuronModelsQueryResult = Apollo.QueryResult<ListNeuronModelsQuery, ListNeuronModelsQueryVariables>;
export const DetailRecordingDocument = gql`
    query DetailRecording($id: ID!) {
  recording(id: $id) {
    ...DetailRecording
  }
}
    ${DetailRecordingFragmentDoc}`;

/**
 * __useDetailRecordingQuery__
 *
 * To run a query within a React component, call `useDetailRecordingQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailRecordingQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailRecordingQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailRecordingQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailRecordingQuery, DetailRecordingQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailRecordingQuery, DetailRecordingQueryVariables>(DetailRecordingDocument, options);
      }
export function useDetailRecordingLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailRecordingQuery, DetailRecordingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailRecordingQuery, DetailRecordingQueryVariables>(DetailRecordingDocument, options);
        }
export type DetailRecordingQueryHookResult = ReturnType<typeof useDetailRecordingQuery>;
export type DetailRecordingLazyQueryHookResult = ReturnType<typeof useDetailRecordingLazyQuery>;
export type DetailRecordingQueryResult = Apollo.QueryResult<DetailRecordingQuery, DetailRecordingQueryVariables>;
export const ListRecordingsDocument = gql`
    query ListRecordings($pagination: OffsetPaginationInput, $filters: RecordingFilter, $ordering: [RecordingOrder!]) {
  recordings(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...ListRecording
  }
}
    ${ListRecordingFragmentDoc}`;

/**
 * __useListRecordingsQuery__
 *
 * To run a query within a React component, call `useListRecordingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListRecordingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListRecordingsQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListRecordingsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListRecordingsQuery, ListRecordingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListRecordingsQuery, ListRecordingsQueryVariables>(ListRecordingsDocument, options);
      }
export function useListRecordingsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListRecordingsQuery, ListRecordingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListRecordingsQuery, ListRecordingsQueryVariables>(ListRecordingsDocument, options);
        }
export type ListRecordingsQueryHookResult = ReturnType<typeof useListRecordingsQuery>;
export type ListRecordingsLazyQueryHookResult = ReturnType<typeof useListRecordingsLazyQuery>;
export type ListRecordingsQueryResult = Apollo.QueryResult<ListRecordingsQuery, ListRecordingsQueryVariables>;
export const GlobalSearchDocument = gql`
    query GlobalSearch($search: String, $pagination: OffsetPaginationInput) {
  traces: traces(filters: {search: $search}, pagination: $pagination) {
    ...ListTrace
  }
}
    ${ListTraceFragmentDoc}`;

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
export const DetailAnalogSignalDocument = gql`
    query DetailAnalogSignal($id: ID!) {
  analogSignal(id: $id) {
    ...AnalogSignal
  }
}
    ${AnalogSignalFragmentDoc}`;

/**
 * __useDetailAnalogSignalQuery__
 *
 * To run a query within a React component, call `useDetailAnalogSignalQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailAnalogSignalQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailAnalogSignalQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailAnalogSignalQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailAnalogSignalQuery, DetailAnalogSignalQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailAnalogSignalQuery, DetailAnalogSignalQueryVariables>(DetailAnalogSignalDocument, options);
      }
export function useDetailAnalogSignalLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailAnalogSignalQuery, DetailAnalogSignalQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailAnalogSignalQuery, DetailAnalogSignalQueryVariables>(DetailAnalogSignalDocument, options);
        }
export type DetailAnalogSignalQueryHookResult = ReturnType<typeof useDetailAnalogSignalQuery>;
export type DetailAnalogSignalLazyQueryHookResult = ReturnType<typeof useDetailAnalogSignalLazyQuery>;
export type DetailAnalogSignalQueryResult = Apollo.QueryResult<DetailAnalogSignalQuery, DetailAnalogSignalQueryVariables>;
export const ListAnalogSignalDocument = gql`
    query ListAnalogSignal($pagination: OffsetPaginationInput, $filters: AnalogSignalFilter, $ordering: [AnalogSignalOrder!]) {
  analogSignals(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...ListAnalogSignal
  }
}
    ${ListAnalogSignalFragmentDoc}`;

/**
 * __useListAnalogSignalQuery__
 *
 * To run a query within a React component, call `useListAnalogSignalQuery` and pass it any options that fit your needs.
 * When your component renders, `useListAnalogSignalQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListAnalogSignalQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListAnalogSignalQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListAnalogSignalQuery, ListAnalogSignalQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListAnalogSignalQuery, ListAnalogSignalQueryVariables>(ListAnalogSignalDocument, options);
      }
export function useListAnalogSignalLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListAnalogSignalQuery, ListAnalogSignalQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListAnalogSignalQuery, ListAnalogSignalQueryVariables>(ListAnalogSignalDocument, options);
        }
export type ListAnalogSignalQueryHookResult = ReturnType<typeof useListAnalogSignalQuery>;
export type ListAnalogSignalLazyQueryHookResult = ReturnType<typeof useListAnalogSignalLazyQuery>;
export type ListAnalogSignalQueryResult = Apollo.QueryResult<ListAnalogSignalQuery, ListAnalogSignalQueryVariables>;
export const DetailAnalogSignalChannelDocument = gql`
    query DetailAnalogSignalChannel($id: ID!) {
  analogSignalChannel(id: $id) {
    ...DetailAnalogSignalChannel
  }
}
    ${DetailAnalogSignalChannelFragmentDoc}`;

/**
 * __useDetailAnalogSignalChannelQuery__
 *
 * To run a query within a React component, call `useDetailAnalogSignalChannelQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailAnalogSignalChannelQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailAnalogSignalChannelQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailAnalogSignalChannelQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailAnalogSignalChannelQuery, DetailAnalogSignalChannelQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailAnalogSignalChannelQuery, DetailAnalogSignalChannelQueryVariables>(DetailAnalogSignalChannelDocument, options);
      }
export function useDetailAnalogSignalChannelLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailAnalogSignalChannelQuery, DetailAnalogSignalChannelQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailAnalogSignalChannelQuery, DetailAnalogSignalChannelQueryVariables>(DetailAnalogSignalChannelDocument, options);
        }
export type DetailAnalogSignalChannelQueryHookResult = ReturnType<typeof useDetailAnalogSignalChannelQuery>;
export type DetailAnalogSignalChannelLazyQueryHookResult = ReturnType<typeof useDetailAnalogSignalChannelLazyQuery>;
export type DetailAnalogSignalChannelQueryResult = Apollo.QueryResult<DetailAnalogSignalChannelQuery, DetailAnalogSignalChannelQueryVariables>;
export const ListAnalogSignalChannelDocument = gql`
    query ListAnalogSignalChannel($pagination: OffsetPaginationInput, $filters: AnalogSignalChannelFilter, $ordering: [AnalogSignalChannelOrder!]) {
  analogSignalChannels(
    pagination: $pagination
    filters: $filters
    ordering: $ordering
  ) {
    ...ListAnalogSignalChannel
  }
}
    ${ListAnalogSignalChannelFragmentDoc}`;

/**
 * __useListAnalogSignalChannelQuery__
 *
 * To run a query within a React component, call `useListAnalogSignalChannelQuery` and pass it any options that fit your needs.
 * When your component renders, `useListAnalogSignalChannelQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListAnalogSignalChannelQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListAnalogSignalChannelQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListAnalogSignalChannelQuery, ListAnalogSignalChannelQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListAnalogSignalChannelQuery, ListAnalogSignalChannelQueryVariables>(ListAnalogSignalChannelDocument, options);
      }
export function useListAnalogSignalChannelLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListAnalogSignalChannelQuery, ListAnalogSignalChannelQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListAnalogSignalChannelQuery, ListAnalogSignalChannelQueryVariables>(ListAnalogSignalChannelDocument, options);
        }
export type ListAnalogSignalChannelQueryHookResult = ReturnType<typeof useListAnalogSignalChannelQuery>;
export type ListAnalogSignalChannelLazyQueryHookResult = ReturnType<typeof useListAnalogSignalChannelLazyQuery>;
export type ListAnalogSignalChannelQueryResult = Apollo.QueryResult<ListAnalogSignalChannelQuery, ListAnalogSignalChannelQueryVariables>;
export const DetailSimulationDocument = gql`
    query DetailSimulation($id: ID!) {
  simulation(id: $id) {
    ...DetailSimulation
  }
}
    ${DetailSimulationFragmentDoc}`;

/**
 * __useDetailSimulationQuery__
 *
 * To run a query within a React component, call `useDetailSimulationQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailSimulationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailSimulationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailSimulationQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailSimulationQuery, DetailSimulationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailSimulationQuery, DetailSimulationQueryVariables>(DetailSimulationDocument, options);
      }
export function useDetailSimulationLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailSimulationQuery, DetailSimulationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailSimulationQuery, DetailSimulationQueryVariables>(DetailSimulationDocument, options);
        }
export type DetailSimulationQueryHookResult = ReturnType<typeof useDetailSimulationQuery>;
export type DetailSimulationLazyQueryHookResult = ReturnType<typeof useDetailSimulationLazyQuery>;
export type DetailSimulationQueryResult = Apollo.QueryResult<DetailSimulationQuery, DetailSimulationQueryVariables>;
export const ListSimulationsDocument = gql`
    query ListSimulations($pagination: OffsetPaginationInput, $filters: SimulationFilter, $ordering: [SimulationOrder!]) {
  simulations(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...ListSimulation
  }
}
    ${ListSimulationFragmentDoc}`;

/**
 * __useListSimulationsQuery__
 *
 * To run a query within a React component, call `useListSimulationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListSimulationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListSimulationsQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListSimulationsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListSimulationsQuery, ListSimulationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListSimulationsQuery, ListSimulationsQueryVariables>(ListSimulationsDocument, options);
      }
export function useListSimulationsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListSimulationsQuery, ListSimulationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListSimulationsQuery, ListSimulationsQueryVariables>(ListSimulationsDocument, options);
        }
export type ListSimulationsQueryHookResult = ReturnType<typeof useListSimulationsQuery>;
export type ListSimulationsLazyQueryHookResult = ReturnType<typeof useListSimulationsLazyQuery>;
export type ListSimulationsQueryResult = Apollo.QueryResult<ListSimulationsQuery, ListSimulationsQueryVariables>;
export const DetailStimulusDocument = gql`
    query DetailStimulus($id: ID!) {
  stimulus(id: $id) {
    ...DetailStimulus
  }
}
    ${DetailStimulusFragmentDoc}`;

/**
 * __useDetailStimulusQuery__
 *
 * To run a query within a React component, call `useDetailStimulusQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailStimulusQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailStimulusQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailStimulusQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailStimulusQuery, DetailStimulusQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailStimulusQuery, DetailStimulusQueryVariables>(DetailStimulusDocument, options);
      }
export function useDetailStimulusLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailStimulusQuery, DetailStimulusQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailStimulusQuery, DetailStimulusQueryVariables>(DetailStimulusDocument, options);
        }
export type DetailStimulusQueryHookResult = ReturnType<typeof useDetailStimulusQuery>;
export type DetailStimulusLazyQueryHookResult = ReturnType<typeof useDetailStimulusLazyQuery>;
export type DetailStimulusQueryResult = Apollo.QueryResult<DetailStimulusQuery, DetailStimulusQueryVariables>;
export const ListStimuliDocument = gql`
    query ListStimuli($pagination: OffsetPaginationInput, $filters: StimulusFilter, $ordering: [StimulusOrder!]) {
  stimuli(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...ListStimulus
  }
}
    ${ListStimulusFragmentDoc}`;

/**
 * __useListStimuliQuery__
 *
 * To run a query within a React component, call `useListStimuliQuery` and pass it any options that fit your needs.
 * When your component renders, `useListStimuliQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListStimuliQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useListStimuliQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListStimuliQuery, ListStimuliQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListStimuliQuery, ListStimuliQueryVariables>(ListStimuliDocument, options);
      }
export function useListStimuliLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListStimuliQuery, ListStimuliQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListStimuliQuery, ListStimuliQueryVariables>(ListStimuliDocument, options);
        }
export type ListStimuliQueryHookResult = ReturnType<typeof useListStimuliQuery>;
export type ListStimuliLazyQueryHookResult = ReturnType<typeof useListStimuliLazyQuery>;
export type ListStimuliQueryResult = Apollo.QueryResult<ListStimuliQuery, ListStimuliQueryVariables>;
export const DetailTraceDocument = gql`
    query DetailTrace($id: ID!) {
  trace(id: $id) {
    ...DetailTrace
  }
}
    ${DetailTraceFragmentDoc}`;

/**
 * __useDetailTraceQuery__
 *
 * To run a query within a React component, call `useDetailTraceQuery` and pass it any options that fit your needs.
 * When your component renders, `useDetailTraceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDetailTraceQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDetailTraceQuery(baseOptions: ApolloReactHooks.QueryHookOptions<DetailTraceQuery, DetailTraceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<DetailTraceQuery, DetailTraceQueryVariables>(DetailTraceDocument, options);
      }
export function useDetailTraceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<DetailTraceQuery, DetailTraceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<DetailTraceQuery, DetailTraceQueryVariables>(DetailTraceDocument, options);
        }
export type DetailTraceQueryHookResult = ReturnType<typeof useDetailTraceQuery>;
export type DetailTraceLazyQueryHookResult = ReturnType<typeof useDetailTraceLazyQuery>;
export type DetailTraceQueryResult = Apollo.QueryResult<DetailTraceQuery, DetailTraceQueryVariables>;
export const TracesDocument = gql`
    query Traces($pagination: OffsetPaginationInput = {limit: 10}, $filters: TraceFilter, $ordering: [TraceOrder!]) {
  traces(pagination: $pagination, filters: $filters, ordering: $ordering) {
    ...ListTrace
  }
}
    ${ListTraceFragmentDoc}`;

/**
 * __useTracesQuery__
 *
 * To run a query within a React component, call `useTracesQuery` and pass it any options that fit your needs.
 * When your component renders, `useTracesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTracesQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useTracesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<TracesQuery, TracesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<TracesQuery, TracesQueryVariables>(TracesDocument, options);
      }
export function useTracesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<TracesQuery, TracesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<TracesQuery, TracesQueryVariables>(TracesDocument, options);
        }
export type TracesQueryHookResult = ReturnType<typeof useTracesQuery>;
export type TracesLazyQueryHookResult = ReturnType<typeof useTracesLazyQuery>;
export type TracesQueryResult = Apollo.QueryResult<TracesQuery, TracesQueryVariables>;