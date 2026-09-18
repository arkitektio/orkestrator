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
  /** The `ArrayLike` scalar type represents a reference to a store previously created by the user n a datalayer */
  ArrayLike: { input: any; output: any; }
  /** A type representing a big file store reference, which can be either a string ID or a more complex object. */
  BigFileLike: { input: any; output: any; }
  /** A capacitance (``"5 pF"``, ``"100 nF"``). */
  Capacitance: { input: any; output: any; }
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
  /** An electric current (``"5 pA"``, ``"2 nA"``). */
  ElectricCurrent: { input: any; output: any; }
  /** An electric potential / voltage (``"-70 mV"``, ``"5 V"``). */
  ElectricPotential: { input: ElectricPotential; output: ElectricPotential; }
  /** An electrical conductance (``"5 nS"``, ``"2 µS"``). */
  ElectricalConductance: { input: ElectricalConductance; output: ElectricalConductance; }
  /** An electrical resistance (``"100 MΩ"``, ``"5 GΩ"``). */
  ElectricalResistance: { input: any; output: any; }
  /** The `FileLike` scalar type represents a reference to a big file storage previously created by the user n a datalayer */
  FileLike: { input: any; output: any; }
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
  /** The `ParquetLike` scalar type represents a reference to a parquet objected stored previously created by the user on a datalayer */
  ParquetLike: { input: any; output: any; }
  /** The Color scalar type represents a color as a list of 4 values RGBA */
  RGBAColor: { input: RGBAColor; output: RGBAColor; }
  /** An axial resistivity (NEURON ``Ra``; ``"35.4 ohm*cm"``, ``"100 ohm*cm"``). */
  Resistivity: { input: Resistivity; output: Resistivity; }
  /** A specific membrane capacitance (NEURON ``cm``; ``"1 uF/cm^2"``). */
  SpecificCapacitance: { input: SpecificCapacitance; output: SpecificCapacitance; }
  /** A reference to an uploaded **sporadik store**: one prefix holding one child per axis made contiguous, under `layouts/axis{k}`, each an anndata-spelled sparse group of `data`, `indices` and `indptr`. Named for the wire format. Request it with `requestSparseUpload`, write the layouts, land the `sporadik` block last, then `finishSparseUpload` -- which reads that block and refuses a prefix without one, because zarr fills a missing chunk rather than failing and a torn upload is otherwise indistinguishable from a finished one. A dataset registered this way declares no encoding, no shape and no chunking: the server reads them from the artifact, so they cannot be stated wrong */
  SporadikLike: { input: any; output: any; }
  /** A temperature (``"310 K"``, ``"37 degC"``). */
  Temperature: { input: Temperature; output: Temperature; }
  UUID: { input: string; output: string; }
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

/** The file truth: whatever the acquisition format said, pinned to a coordinate anchor and kept as it said it */
export type AcquisitionMetadata = {
  __typename?: 'AcquisitionMetadata';
  id: Scalars['ID']['output'];
  /** The acquisition metadata, as a JSON object */
  metadata: Scalars['Any']['output'];
};

/** Input type for acquisition metadata: whatever the source format said (an ABF header, an NWB attribute set), kept as a JSON object. mikro's OME metadata slot */
export type AcquisitionMetadataInput = {
  /** The acquisition metadata as a JSON string */
  metadataString: Scalars['String']['input'];
};

export type AddModelsToWorkspaceInput = {
  models: Array<Scalars['ID']['input']>;
  workspace: Scalars['ID']['input'];
  workspaceGroup?: Scalars['String']['input'];
};

/** A whole placement path composed into one affine map, labelled with the axes it is written over. `matrix` is M x (N+1) with rows outermost -- the same layout an AffineTransformation's `affine` uses -- its columns in `inputAxes` order and its last column the translation. **`outputAxes` names only the destination axes the path actually constrains**: a (c,y,x) dataset registered on (y,x) into a (t,z,y,x) world gets two rows, not four, because the registration says nothing about t and z and a zero row there would pin the data at their origin rather than leave it unstated. `total` is whether the map covers every destination axis */
export type AffinePlacement = {
  __typename?: 'AffinePlacement';
  /** The axes the matrix's columns are in, which is the layer's own source coordinate system's axis order */
  inputAxes: Array<Scalars['String']['output']>;
  /** The composed map, M x (N+1), rows outermost. One row per axis in `outputAxes`, one column per axis in `inputAxes`, plus a final translation column */
  matrix: Array<Array<Scalars['Float']['output']>>;
  /** The destination axes the matrix's rows are in, in the world's own axis order. An axis the path says nothing about has no row at all */
  outputAxes: Array<Scalars['String']['output']>;
  /** Whether `outputAxes` covers every axis of the destination space. False for a partial registration -- an honest map over the axes it names, and silence about the rest */
  total: Scalars['Boolean']['output'];
};

/** The fields an AFFINE member of TransformInput reads. Published for codegen; the wire type is the flat TransformInput */
export type AffineTransformInput = {
  affine: Array<Array<Scalars['Float']['input']>>;
  kind?: CreatableTransformKind;
};

/** A general affine map, given as an M x (N+1) matrix with rows outermost */
export type AffineTransformation = Transformation & {
  __typename?: 'AffineTransformation';
  /** The affine matrix, M x (N+1), rows outermost. The last column is the translation */
  affine: Array<Array<Scalars['Float']['output']>>;
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  input?: Maybe<CoordinateSystem>;
  /** The names of the input axes this edge's parameters are ordered by. `scale`, `translation` and the columns of `affine` follow this order -- which is the input system's axis order, NOT the reading layer's axis names, and the two differ often enough that indexing the arrays against them silently misplaces them. A BY_DIMENSION edge names only the subset of axes it acts on; the axes it does not name are the ones it leaves untouched */
  inputAxes: Array<Scalars['String']['output']>;
  /** Which geometric properties survive this edge's map, derived from `kind`: ISOMETRY (distances, angles and areas all transfer), SIMILARITY (angles and length ratios transfer, absolute lengths scale by one common factor), AFFINE (parallelism and area ratios transfer, angles and distances do not), DIFFEOMORPHIC (topology at best, and only locally -- the Jacobian varies with position), NONE (nothing corresponds). A SEQUENCE or BY_DIMENSION is the weakest of its children. Stated by kind, never by inspecting the numbers: an AFFINE edge reads AFFINE even when its matrix happens to be rigid, because separating those needs an SVD. A layer's `placementInvariance` is the minimum of this over its whole path to world */
  invariance: TransformInvariance;
  kind: TransformKind;
  name?: Maybe<Scalars['String']['output']>;
  output?: Maybe<CoordinateSystem>;
  /** The names of the output axes this edge produces. For a rank-changing BY_DIMENSION edge (placing a (c,y,x) dataset into a (t,z,y,x) world) this is the subset it maps onto; the world's other axes are untouched */
  outputAxes: Array<Scalars['String']['output']>;
  /** Provenance entries for this edge: who authored it, and every refinement since. A refinement rewrites the edge in place, so this audit trail is where the placement's earlier states live -- and counting these rows along a chain is what `CoordinateSystem.transformVersion` reports */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Where along one axis this edge applies, or null for an edge that holds everywhere -- which is almost every edge. A per-channel correction is scoped to {axis: "c", index: 2}; several such edges over one axis are one piecewise map. A path query crosses a scoped edge only when it fixes that coordinate with `at` */
  selector?: Maybe<Selector>;
  /** How much this map is actually known: VALIDATED for a map the server derived (or one someone checked), INFERRED for numbers read from metadata, MANUAL for an authored registration, UNKNOWN for one its author marked as a guess. A layer's validity is the weakest edge on its path to world */
  validity: PlacementValidity;
  /** (derivation edges) What the operation this edge records did to the *values*, orthogonal to `kind`: IDENTICAL (a crop -- statistics transfer), TRANSFORMED (a deconvolution -- same quantity, new numbers), CATEGORIZED (a threshold -- values became labels, and a bootstrapped scene renders the data as a label map). Null when unstated, and never present on a registration -- values do not cross a claim between spaces */
  valueRelation?: Maybe<ValueRelation>;
  /** How many times this edge has been written, counting the row that created it -- so a new edge reads 1. Only comparison is meaningful: this and the edge's `id` together are the cache key for anything derived from the edge, and a change means refetch. It counts the same provenance rows `provenanceEntries` lists, so the audit trail and the token cannot disagree; a rename moves it too, which errs towards refetching something that did not change rather than trusting something that did */
  version: Scalars['Int']['output'];
};


/** A general affine map, given as an M x (N+1) matrix with rows outermost */
export type AffineTransformationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A mark on a dataset, a clock or a timeline: an event, an epoch, a measurement, in its collection's coordinate system. It belongs to the collection, not to an experiment: delete the experiment and the annotation survives */
export type Annotation = {
  __typename?: 'Annotation';
  /** The collection this annotation belongs to; its vectors are expressed in the collection's own coordinate system */
  collection: AnnotationCollection;
  /** The coordinate system this annotation's vectors are expressed in: its collection's own system */
  coordinateSystem?: Maybe<CoordinateSystem>;
  /** The discrete coordinates this annotation is pinned to. A coordinate the annotation does not pin is one it spans */
  coordinates: Array<Coordinate>;
  createdWithTransforms: Scalars['Int']['output'];
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  /** The fill color of the geometry, as RGBA, or null for no fill */
  fillColor?: Maybe<Array<Scalars['Int']['output']>>;
  /** Whether the geometry is filled with fill_color */
  filled: Scalars['Boolean']['output'];
  id: Scalars['UUID']['output'];
  /** The annotation's bounding box in the frame its collection names, derived from every corner of its geometry (an affine-transformed box is not a box: min/max alone gives a strictly too-small answer under shear). For an event the box is a point; for an epoch it is the epoch. Not a world box: one collection can sit in two experiments under two registrations. **Not always a dataset's sample grid**: a registration, or a derivation that changes rank, is not something a box can be pushed across -- it says nothing about the axes it does not name -- and the box then stays in the collection's own drawing space. Boxes compare only within one frame, which is why the spatial filters require a collection or coordinate system alongside */
  intrinsicBbox?: Maybe<BoundingBox>;
  kind: AnnotationKind;
  name: Scalars['String']['output'];
  /** Provenance entries for this annotation */
  provenanceEntries: Array<ProvenanceEntry>;
  /** The stroke (outline) color of the geometry, as RGBA */
  strokeColor?: Maybe<Array<Scalars['Int']['output']>>;
  /** The stroke width of the geometry, in the drawing space's units. One number for every direction, so it is a well-defined length only where that space's axes share a scale */
  strokeWidth: Scalars['Float']['output'];
  /** The annotation's vertices: one list per vertex, its components in the order of the collection's axes */
  vectors: Array<Array<Scalars['Float']['output']>>;
};


/** A mark on a dataset, a clock or a timeline: an event, an epoch, a measurement, in its collection's coordinate system. It belongs to the collection, not to an experiment: delete the experiment and the annotation survives */
export type AnnotationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A named set of annotations, owning the coordinate system they are drawn in. All its shapes share one drawing space and so one placement story: the collection is related to other spaces by edges, the shapes just have vectors. Drawn over a dataset's sample grid it marks that dataset; drawn on a segment's clock it marks every signal of the segment at once -- which is what Neo's events and epochs are; drawn on an experiment's world it marks the timeline */
export type AnnotationCollection = {
  __typename?: 'AnnotationCollection';
  /** The annotations in this collection */
  annotations: Array<Annotation>;
  /** The coordinate system the annotations' vectors are expressed in. The collection owns it; `derivedFrom` relates it to whatever the shapes are drawn over */
  coordinateSystem: CoordinateSystem;
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  /** Every edge from this collection's space back into what the shapes are drawn over, in declared order -- the first is the primary parent, the one that places it. An edge into a dataset's sample grid for a collection drawn over a dataset, into a clock for one marking a whole segment. Empty for a freestanding collection, and for an experiment-minted one: its edge lands in a world, which is a registration (see `coordinateSystem { registrations }` on the world), not a lineage */
  derivedFrom: Array<Transformation>;
  description?: Maybe<Scalars['String']['output']>;
  /** The experiment this collection was minted for as its default drawing surface, or null for a collection drawn over a dataset, a clock, or nothing. Bookkeeping, not placement: the registration edge is what places it */
  experiment?: Maybe<Experiment>;
  /** The experiment layers drawing this collection, one per experiment */
  experimentLayers: Array<AnnotationLayer>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Provenance entries for this annotation collection */
  provenanceEntries: Array<ProvenanceEntry>;
};


/** A named set of annotations, owning the coordinate system they are drawn in. All its shapes share one drawing space and so one placement story: the collection is related to other spaces by edges, the shapes just have vectors. Drawn over a dataset's sample grid it marks that dataset; drawn on a segment's clock it marks every signal of the segment at once -- which is what Neo's events and epochs are; drawn on an experiment's world it marks the timeline */
export type AnnotationCollectionAnnotationsArgs = {
  filters?: InputMaybe<AnnotationFilter>;
  ordering?: Array<AnnotationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A named set of annotations, owning the coordinate system they are drawn in. All its shapes share one drawing space and so one placement story: the collection is related to other spaces by edges, the shapes just have vectors. Drawn over a dataset's sample grid it marks that dataset; drawn on a segment's clock it marks every signal of the segment at once -- which is what Neo's events and epochs are; drawn on an experiment's world it marks the timeline */
export type AnnotationCollectionExperimentLayersArgs = {
  filters?: InputMaybe<ExperimentLayerFilter>;
  ordering?: Array<ExperimentLayerOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A named set of annotations, owning the coordinate system they are drawn in. All its shapes share one drawing space and so one placement story: the collection is related to other spaces by edges, the shapes just have vectors. Drawn over a dataset's sample grid it marks that dataset; drawn on a segment's clock it marks every signal of the segment at once -- which is what Neo's events and epochs are; drawn on an experiment's world it marks the timeline */
export type AnnotationCollectionProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** The fields an ANNOTATION_COLLECTION derivation reads. Published for codegen; the wire type is the flat DerivedFromInput */
export type AnnotationCollectionDerivedFromInput = {
  annotationCollection: Scalars['ID']['input'];
  kind?: DerivationSourceKind;
  transform?: InputMaybe<TransformInput>;
  valueRelation?: InputMaybe<ValueRelation>;
};

/** The fields an ANNOTATION_COLLECTION export link reads. Published for codegen; the wire type is the flat ExportOfInput */
export type AnnotationCollectionExportOfInput = {
  annotationCollection: Scalars['ID']['input'];
  kind?: FileLinkContainerKind;
  seriesIdentifier?: InputMaybe<Scalars['String']['input']>;
  valueRelation?: InputMaybe<ValueRelation>;
};

export type AnnotationCollectionFilter = {
  AND?: InputMaybe<AnnotationCollectionFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AnnotationCollectionFilter>;
  OR?: InputMaybe<AnnotationCollectionFilter>;
  /** Filter by the coordinate system the annotations are drawn in (the collection's own) */
  coordinateSystem?: InputMaybe<Scalars['ID']['input']>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter to the collections drawn over this dataset (or over a lens of it), following the derivation edge */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  /** Filter to the collections drawn over this coordinate system: pass a segment's clock for the events and epochs marking the whole segment, or an experiment's world for those on its timeline */
  drawnOver?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the experiment this collection was minted for as its default drawing surface */
  experiment?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  /** Filter by the creator's subject ID */
  owner?: InputMaybe<Scalars['ID']['input']>;
  /** Search by name (case-insensitive substring) */
  search?: InputMaybe<Scalars['String']['input']>;
};

export type AnnotationCollectionOrder =
  { createdAt: Ordering; id?: never; name?: never; }
  |  { createdAt?: never; id: Ordering; name?: never; }
  |  { createdAt?: never; id?: never; name: Ordering; };

export type AnnotationFilter = {
  AND?: InputMaybe<AnnotationFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AnnotationFilter>;
  OR?: InputMaybe<AnnotationFilter>;
  /** Filter by the collection this annotation belongs to */
  collection?: InputMaybe<Scalars['ID']['input']>;
  /** Filter to annotations whose bounding box contains this point (GiST-backed): the epochs in force at one instant. Only meaningful within one frame: pass `collection` or `coordinateSystem` alongside */
  containsPoint?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** Filter by the coordinate system this annotation is drawn in (its collection's own) */
  coordinateSystem?: InputMaybe<Scalars['ID']['input']>;
  /** Filter to the annotations drawn over this dataset (or over a lens of it), following their collection's derivation edge */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<StrFilterLookup>;
  id?: InputMaybe<Scalars['UUID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter to annotations whose bounding box overlaps this box (GiST-backed) -- every event and epoch between two instants is `{min: [t0], max: [t1]}`. Only meaningful within one frame: pass `collection` or `coordinateSystem` alongside. A box of lower rank is zero-filled on the missing coordinates */
  intersects?: InputMaybe<BoundingBoxInput>;
  kind?: InputMaybe<AnnotationKindChoices>;
  name?: InputMaybe<StrFilterLookup>;
  /** Filter to annotations pinned to every one of these coordinates, e.g. [{name: 'c', value: 3}]. GIN-backed containment on the stored coordinate dict; an annotation that spans a coordinate does not match a pin on it */
  pinnedTo?: InputMaybe<Array<CoordinateInput>>;
  /** Search by name (case-insensitive substring) */
  search?: InputMaybe<Scalars['String']['input']>;
};

/** The shape an annotation on a trace is drawn as. The members name geometry only: which axes a shape spans is a property of the coordinate system it is drawn in, and what it *means* -- a spike, an artifact -- is its name, not its kind */
export enum AnnotationKind {
  /** A stretch, as two opposite corners: `[[t0], [t1]]` in a space with only a time axis, where it is an interval -- Neo's Epoch. Drawn in a space with more axes the same two corners bound those too: a run of channels, a range of values. Inverted corners are normalised. */
  Epoch = 'EPOCH',
  /** One instant: a stimulus onset, a threshold crossing, a marker. One vertex. Neo's Event. */
  Event = 'EVENT',
  /** Several instants of one kind, as one annotation: the spikes a detector found, the pulses of a train. One vertex each. */
  Events = 'EVENTS',
  /** A measurement between two points: an amplitude from baseline to peak, a slope, a latency. Two vertices. Meaningful in a space with a second axis, typically a VALUE axis. */
  Line = 'LINE',
  /** An open run of points: a fitted curve, a drawn baseline. At least two vertices. */
  Path = 'PATH',
  /** A closed region: a lasso around part of a trace, a cluster boundary in a phase plot. At least three vertices. */
  Polygon = 'POLYGON'
}

export enum AnnotationKindChoices {
  Epoch = 'EPOCH',
  Event = 'EVENT',
  Events = 'EVENTS',
  Line = 'LINE',
  Path = 'PATH',
  Polygon = 'POLYGON'
}

/** Hand-drawn marks: an annotation collection, drawn in the space it owns. One per collection per experiment -- per-shape styling lives on the annotations themselves */
export type AnnotationLayer = ExperimentLayer & {
  __typename?: 'AnnotationLayer';
  /** The annotation collection whose marks this layer draws. Its own coordinate system is the layer's space */
  annotationCollection: AnnotationCollection;
  /** This layer's whole `pathToWorld` composed into one affine map -- the same path, same edges, same order, with the flagged steps inverted. For a sampled recording or a spike raster it reads `t_world = sample * period + start`, the sampling law and every clock offset multiplied out. Derived on read and stored nowhere. **Null when `pathToWorld` is null.** It errors rather than returning null when a path exists but does not condense: a FIELD step (an irregularly sampled signal, a variable-step run) has no closed form, and the error names the transformation that stopped it. Pass `strict: true` to be refused a partial map instead of handed one */
  asAffine?: Maybe<AffinePlacement>;
  blending: Blending;
  experiment: Experiment;
  id: Scalars['ID']['output'];
  kind: ExperimentLayerKind;
  name?: Maybe<Scalars['String']['output']>;
  opacity: Scalars['Float']['output'];
  order: Scalars['Int']['output'];
  /** The path of transformation edges from this layer's source coordinate system to its experiment's world. A layer belongs to exactly one experiment, so this is the one 'to world' question with a single right answer -- the path uses the data's own facts (a lens shift, a sampling law or time lookup) plus the world's registrations and the clocks chained into it. Null when the layer is unregistered or has no source system; empty when the source already is the world. Every step is here in full, with its own validity, invariance and provenance; `asAffine` is the same path composed */
  pathToWorld?: Maybe<Array<PlacementStep>>;
  /** Whether this layer has a place on its experiment's timeline, and if not, why not. UNREGISTERED is a gap to close (nobody has related this data's clock to the world); UNMAPPABLE is a fact to badge; CONDITIONAL is a placement to ask again for with `at`. Derived, never stored */
  placement: PlacementState;
  /** Which geometric properties survive the whole walk from this layer's data to its experiment's world: the weakest edge on its path. AFFINE or stronger means a duration measured in samples is a duration on the timeline up to one factor; DIFFEOMORPHIC means the path crosses a time lookup; NONE means there is no path. Derived, never stored */
  placementInvariance: TransformInvariance;
  /** How much this layer's placement is actually known: the weakest edge on its path to world. INFERRED when it rests on a sampling law read from metadata, MANUAL once someone authored an offset, VALIDATED once it was checked, UNKNOWN when there is no path at all. Derived, never stored */
  placementValidity: PlacementValidity;
  visible: Scalars['Boolean']['output'];
};


/** Hand-drawn marks: an annotation collection, drawn in the space it owns. One per collection per experiment -- per-shape styling lives on the annotations themselves */
export type AnnotationLayerAsAffineArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
  strict?: Scalars['Boolean']['input'];
};


/** Hand-drawn marks: an annotation collection, drawn in the space it owns. One per collection per experiment -- per-shape styling lives on the annotations themselves */
export type AnnotationLayerPathToWorldArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** Hand-drawn marks: an annotation collection, drawn in the space it owns. One per collection per experiment -- per-shape styling lives on the annotations themselves */
export type AnnotationLayerPlacementArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** Hand-drawn marks: an annotation collection, drawn in the space it owns. One per collection per experiment -- per-shape styling lives on the annotations themselves */
export type AnnotationLayerPlacementInvarianceArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** Hand-drawn marks: an annotation collection, drawn in the space it owns. One per collection per experiment -- per-shape styling lives on the annotations themselves */
export type AnnotationLayerPlacementValidityArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};

export type AnnotationOrder =
  { id: Ordering; name?: never; }
  |  { id?: never; name: Ordering; };

/** One shape of a bulk draw: the per-annotation subset of CreateAnnotationInput, without the collection/experiment target */
export type AnnotationSpecInput = {
  coordinates?: InputMaybe<Array<CoordinateInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  fillColor?: InputMaybe<Array<Scalars['Int']['input']>>;
  filled?: InputMaybe<Scalars['Boolean']['input']>;
  kind: AnnotationKind;
  name?: InputMaybe<Scalars['String']['input']>;
  strokeColor?: InputMaybe<Array<Scalars['Int']['input']>>;
  strokeWidth?: InputMaybe<Scalars['Float']['input']>;
  vectors: Array<Array<Scalars['Float']['input']>>;
};

export type App = {
  __typename?: 'App';
  id: Scalars['ID']['output'];
  identifier: Scalars['String']['output'];
};

/** A multi-dimensional array dataset: a recording, a stimulus, a vector of sample times, a unit's waveform templates. Its dimensions and their types live on the axes of its INTRINSIC (sample grid) coordinate system; physical units live on the clocks it has edges into; its pyramid levels are DataArrays, each mapping into its grid. What it *means* -- a trace in an experiment -- is said by whatever names it, never here; where it was recorded is a `recordingSite` on its anchors */
export type ArrayDataset = {
  __typename?: 'ArrayDataset';
  /** The coordinate anchors of this dataset, each pinning metadata spokes -- a value unit, a channel label, the rig state -- to some of its coordinates */
  anchors: Array<CoordinateAnchor>;
  /** The annotation collections drawn over this dataset, or over a lens of it: the marks made on this dataset in particular. Derived from the graph -- a collection keeps no dataset column, the edge from its drawing space into this dataset's sample grid is the only place that fact lives. Marks made on the *clock* this dataset is sampled onto apply to it too, and are asked of the clock: `intrinsicSystem { annotations }` */
  annotationCollections: Array<AnnotationCollection>;
  /** The dataset's axis names, in array order. Derived from the axes of its intrinsic coordinate system */
  axisNames: Array<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  /** The task this dataset was created through, if any */
  createdThrough?: Maybe<Task>;
  /** The assigner of the creating task, if any */
  createdThroughBy?: Maybe<User>;
  /** Who created this dataset */
  creator?: Maybe<User>;
  /** The multiscale data arrays belonging to this dataset */
  dataArrays: Array<DataArray>;
  /** The datasets computed from this one -- the other end of `derivedFrom`, and the way to ask what a source produced: the deconvolutions, segmentations and projections that named a space of this dataset as their parent. Derived from the same edges, never a stored back-reference that could disagree with them. Every child, not just those this dataset places: a fusion that named this source second is listed here, and so is a child whose derivation is UNMAPPABLE -- it came from here even though its geometry did not survive. The maps themselves are on each child's own `derivedFrom` */
  derivedDatasets: Array<ArrayDataset>;
  /** The edges from this dataset's pixel grid back into the lenses it was computed from, when it is a derived dataset: one for a deconvolution or a resample, several for a fusion of channels or tiles. Empty for a dataset that was acquired rather than derived. The order is the priority its creator declared: the first edge is the primary parent, the one that places the dataset. They are edges, not labels: each carries the map itself, so a client can compose it -- and they are why a derived dataset inherits its sources' placements instead of needing its own registration */
  derivedFrom: Array<Transformation>;
  /** Everything computed from this dataset, whatever kind of container it is: the derived datasets `derivedDatasets` lists, and also the annotation collections that named this dataset as their source. A separate field rather than a widening of that one, which stays honestly about *datasets*. Same edges, same kind-blindness: an UNMAPPABLE child came from here even though its geometry did not survive */
  derivedResidents: Array<Resident>;
  description?: Maybe<Scalars['String']['output']>;
  /** The experiment layers drawing this dataset, through any of its lenses */
  experimentLayers: Array<ExperimentLayer>;
  /** The files written out of this dataset: an NWB export, a CSV of samples. The mirror of `sourceFiles` */
  exports: Array<FileLink>;
  /** The folder this dataset is filed in. Organisational only: it says where a user keeps this dataset, never where the data sits in space -- that is `intrinsicSystem` and the edges out of it */
  folder?: Maybe<Folder>;
  id: Scalars['ID']['output'];
  /** The dataset's INTRINSIC coordinate system: its level-0 sample grid, the space every pyramid level and lens maps into, and the one a sampling law or a time lookup leaves from. Structural and unit-independent */
  intrinsicSystem?: Maybe<CoordinateSystem>;
  /** The lenses over this dataset: its sweeps, epoch windows and channel selections */
  lenses: Array<Lens>;
  /** Whether this dataset carries a resolution pyramid. Derived: true when it has more than one level */
  multiscale: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  /** Every change made to this dataset: who created it, and every subsequent rename or redescription, attributed to the client, user and task it happened under. Only `name` and `description` can change -- the arrays, the axes and the coordinate systems built from them are fixed at creation */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Whether every downsampled level of this pyramid was built by a method that only ever returns a value already present in the input -- NEAREST or MODE. Only meaningful when the values are object ids, and only *reportable* rather than enforceable: `createArrayDataset` refuses a non-compliant pyramid on a dataset already declared CATEGORIZED or carrying an INDEX axis, but a mask can be declared a mask afterwards, by the `keyedBy` FIELD edge authored when its object table is created -- and by then the levels exist. False means the levels above 0 hold ids that were interpolated into existence and belong to no object; treat level 0 as the only trustworthy one. Null when no level says how it was made, which is not the same as compliant. True for an unpyramided dataset: there is nothing that could be wrong */
  pyramidIsLabelCompliant?: Maybe<Scalars['Boolean']['output']>;
  /** The dataset's shape: that of its level-0 array */
  shape: Array<Scalars['Int']['output']>;
  /** The simulation runs this dataset is timed on: those whose clock its sample grid has a sampling law or a time lookup onto. Read off the graph, never stored */
  simulations: Array<Simulation>;
  /** The files this dataset was converted from -- the ABF or NWB file a converter read to write these arrays, named per series. **Read this alongside `derivedFrom`, not instead of it**: `derivedFrom` says which *data* this was computed from and relates two coordinate systems, while this says which *bytes* it was read out of and relates to no space at all, because a file has none. Both can be non-empty and complete */
  sourceFiles: Array<FileLink>;
  /** What this dataset structurally is, materialized from the axes of its intrinsic coordinate system at creation: the one spatial spec its SPACE axis count denotes, then a modifier per acquisition axis present. A (t, c) recording is [SCALAR, TIMESERIES, MULTICHANNEL]. Presence, not size: a one-channel CHANNEL axis still counts. Empty while the intrinsic system does not exist yet */
  spec: Array<ArrayDatasetSpec>;
  /** The physical dimension of this dataset's values, derived from `valueUnit` ('[time]' for a times dataset, a voltage or a current for a recording). Null when the unit is unstated or arbitrary */
  valueDimension?: Maybe<Scalars['Dimension']['output']>;
  /** The unit of this dataset's VALUES -- what was measured at each sample ('mV', 'pA', 'second' for a times dataset). Read from the dataset-wide `ValueUnit` anchor, the one pinned to no coordinate; a per-channel unit is on that channel's anchor and is not an answer here. Not an axis unit: an axis says where a sample is. Null when unstated */
  valueUnit?: Maybe<Scalars['Unit']['output']>;
};


/** A multi-dimensional array dataset: a recording, a stimulus, a vector of sample times, a unit's waveform templates. Its dimensions and their types live on the axes of its INTRINSIC (sample grid) coordinate system; physical units live on the clocks it has edges into; its pyramid levels are DataArrays, each mapping into its grid. What it *means* -- a trace in an experiment -- is said by whatever names it, never here; where it was recorded is a `recordingSite` on its anchors */
export type ArrayDatasetAnchorsArgs = {
  filters?: InputMaybe<CoordinateAnchorFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A multi-dimensional array dataset: a recording, a stimulus, a vector of sample times, a unit's waveform templates. Its dimensions and their types live on the axes of its INTRINSIC (sample grid) coordinate system; physical units live on the clocks it has edges into; its pyramid levels are DataArrays, each mapping into its grid. What it *means* -- a trace in an experiment -- is said by whatever names it, never here; where it was recorded is a `recordingSite` on its anchors */
export type ArrayDatasetDataArraysArgs = {
  filters?: InputMaybe<DataArrayFilter>;
  ordering?: Array<DataArrayOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A multi-dimensional array dataset: a recording, a stimulus, a vector of sample times, a unit's waveform templates. Its dimensions and their types live on the axes of its INTRINSIC (sample grid) coordinate system; physical units live on the clocks it has edges into; its pyramid levels are DataArrays, each mapping into its grid. What it *means* -- a trace in an experiment -- is said by whatever names it, never here; where it was recorded is a `recordingSite` on its anchors */
export type ArrayDatasetExportsArgs = {
  filters?: InputMaybe<FileLinkFilter>;
};


/** A multi-dimensional array dataset: a recording, a stimulus, a vector of sample times, a unit's waveform templates. Its dimensions and their types live on the axes of its INTRINSIC (sample grid) coordinate system; physical units live on the clocks it has edges into; its pyramid levels are DataArrays, each mapping into its grid. What it *means* -- a trace in an experiment -- is said by whatever names it, never here; where it was recorded is a `recordingSite` on its anchors */
export type ArrayDatasetLensesArgs = {
  filters?: InputMaybe<LensFilter>;
  ordering?: Array<LensOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A multi-dimensional array dataset: a recording, a stimulus, a vector of sample times, a unit's waveform templates. Its dimensions and their types live on the axes of its INTRINSIC (sample grid) coordinate system; physical units live on the clocks it has edges into; its pyramid levels are DataArrays, each mapping into its grid. What it *means* -- a trace in an experiment -- is said by whatever names it, never here; where it was recorded is a `recordingSite` on its anchors */
export type ArrayDatasetProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A multi-dimensional array dataset: a recording, a stimulus, a vector of sample times, a unit's waveform templates. Its dimensions and their types live on the axes of its INTRINSIC (sample grid) coordinate system; physical units live on the clocks it has edges into; its pyramid levels are DataArrays, each mapping into its grid. What it *means* -- a trace in an experiment -- is said by whatever names it, never here; where it was recorded is a `recordingSite` on its anchors */
export type ArrayDatasetSourceFilesArgs = {
  filters?: InputMaybe<FileLinkFilter>;
};

/** One change to an array dataset: exactly one of the three fields is set */
export type ArrayDatasetEvent = {
  __typename?: 'ArrayDatasetEvent';
  create?: Maybe<ArrayDataset>;
  delete?: Maybe<Scalars['ID']['output']>;
  update?: Maybe<ArrayDataset>;
};

export type ArrayDatasetFilter = {
  AND?: InputMaybe<ArrayDatasetFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ArrayDatasetFilter>;
  OR?: InputMaybe<ArrayDatasetFilter>;
  /** Filter by the sub of the user that assigned the creating task */
  assignedBy?: InputMaybe<Scalars['ID']['input']>;
  /** Filter to the datasets living in this coordinate system. Usually one; several when datasets genuinely share a frame */
  coordinateSystem?: InputMaybe<Scalars['ID']['input']>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by the database ID of the task the item was created through (the `createdThrough { id }` field) */
  createdThrough?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the database ID of the user that assigned the creating task (the `createdThroughBy { id }` field) */
  createdThroughBy?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the rekuest task id the item was created through */
  createdThroughTask?: InputMaybe<Scalars['String']['input']>;
  /** Filter to the datasets computed from this one -- the filtered, decimated and sorted datasets that named a space of it as their parent. Every child, not just the ones it places: a fusion that named it second is listed, and so is a child whose derivation is UNMAPPABLE, since it still came from here */
  derivedFrom?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<StrFilterLookup>;
  /** Filter by the folder this dataset is filed in */
  folder?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by a list of folder IDs */
  folders?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter to datasets whose intrinsic coordinate system carries every one of these axis types, e.g. [TIME, CHANNEL]. The raw form of `spec`, for the types no spec names: COORDINATE, DISPLACEMENT, INDEX */
  hasAxisTypes?: InputMaybe<Array<AxisType>>;
  /** Filter by whether the dataset has an edge into a space with real units. False finds the data that is still only samples, with no sampling law or time lookup recorded -- the datasets nothing has timed yet */
  hasPhysicalSpace?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by whether the dataset carries a resolution pyramid: true for the multiscale ones, false for those with a single level */
  multiscale?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StrFilterLookup>;
  /** Filter for datasets that were acquired rather than computed: true for the roots, those with no derivation edge into another dataset's space */
  notDerived?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by the creator's subject ID */
  owner?: InputMaybe<Scalars['ID']['input']>;
  /** Filter to datasets placeable into a coordinate system: those with a lens whose space reaches it across steps that compose into one affine map, walking the transformation edges. A route crossing a FIELD is not one -- it relates the two spaces by the values of an array -- so a spike train or a variable-step run is not offered here, though `inView` reports it. Takes a *space*: pass an experiment's `world.id` to ask it of an experiment */
  placeableIn?: InputMaybe<PlaceableFilter>;
  /** Search by name (case-insensitive substring) */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Filter to the datasets converted from this file -- every series of it, unless `sourceSeriesIdentifier` narrows that. A file link, not a derivation: this asks which bytes the arrays were read out of, where `derivedFrom` asks which data they were computed from. A dataset can honestly answer both */
  sourceFile?: InputMaybe<Scalars['ID']['input']>;
  /** Filter to the datasets converted from one series of a file. Pair it with `sourceFile`; alone it matches that series identifier in any file */
  sourceSeriesIdentifier?: InputMaybe<Scalars['String']['input']>;
  /** Filter to datasets satisfying every one of these specs, e.g. [TIMESERIES, MULTICHANNEL] for multi-channel recordings. Materialized from the axes of the intrinsic coordinate system at creation. A dataset carries one spatial spec (by how many SPACE axes it has) plus a modifier per acquisition axis present, so two spatial specs together match nothing */
  spec?: InputMaybe<Array<ArrayDatasetSpec>>;
  /** Filter by the unit of the dataset's VALUES, as stated by its dataset-wide `ValueUnit` anchor, e.g. 'mV'. Compared after normalization, so 'mV' and 'millivolt' are the same request */
  valueUnit?: InputMaybe<Scalars['String']['input']>;
};

export type ArrayDatasetOrder =
  { createdAt: Ordering; id?: never; name?: never; }
  |  { createdAt?: never; id: Ordering; name?: never; }
  |  { createdAt?: never; id?: never; name: Ordering; };

/** What a dataset structurally is, materialized from the axes of its intrinsic coordinate system at creation. Specs stack: a 3D timelapse is VOLUME, TIMESERIES and MULTICHANNEL at once. Exactly one spatial member (SCALAR/PROFILE/IMAGE/VOLUME/HYPERVOLUME) ever holds. */
export enum ArrayDatasetSpec {
  /** Four or more spatial axes. */
  Hypervolume = 'HYPERVOLUME',
  /** Two spatial axes: a plane. The ordinary micrograph. */
  Image = 'IMAGE',
  /** Carries a CHANNEL axis. Presence only: a one-channel axis still counts. */
  Multichannel = 'MULTICHANNEL',
  /** One spatial axis -- a line profile, a depth trace. */
  Profile = 'PROFILE',
  /** No spatial extent: the array carries no SPACE axis at all. What nearly every electrophysiology array is -- a (t, c) recording is SCALAR, TIMESERIES and MULTICHANNEL. */
  Scalar = 'SCALAR',
  /** Carries a FREQUENCY axis: a spectrum or a spectrogram, not a signal over time. */
  Spectral = 'SPECTRAL',
  /** Carries a TIME axis -- a signal. Presence only: a single-sample time axis still counts. */
  Timeseries = 'TIMESERIES',
  /** Three spatial axes: a stack. Holds whenever a z axis is present, even if it carries a single plane. */
  Volume = 'VOLUME'
}

export type AssociateInput = {
  other: Scalars['ID']['input'];
  selfs: Array<Scalars['ID']['input']>;
};

/** One named, typed dimension of a coordinate system. Its `order` is its index into the array shape */
export type Axis = {
  __typename?: 'Axis';
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  longName?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  type: AxisType;
  unit?: Maybe<Scalars['Unit']['output']>;
};

/** Input type for an axis anchor, which pins one axis to one discrete position */
export type AxisAnchorInput = {
  axis: Scalars['String']['input'];
  value: Scalars['Int']['input'];
};

/** One axis of a source's extent: the range it occupies along a single named axis of the queried coordinate system */
export type AxisExtent = {
  __typename?: 'AxisExtent';
  /** The name of the axis, as it is named on the queried coordinate system */
  axis: Scalars['String']['output'];
  /** The upper bound along this axis, inclusive */
  max: Scalars['Float']['output'];
  /** The lower bound along this axis, inclusive */
  min: Scalars['Float']['output'];
};

export type AxisFilter = {
  AND?: InputMaybe<AxisFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<AxisFilter>;
  OR?: InputMaybe<AxisFilter>;
  /** Filter by the coordinate system this axis belongs to */
  coordinateSystem?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  type?: InputMaybe<AxisTypeChoices>;
};

/** Input type for one structural axis of a dataset's sample grid: its name and its semantic kind. Units and sampling rates do not belong here -- they belong to a clock, a separate coordinate system plus one edge */
export type AxisInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  longName?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  type: AxisType;
};

/** The semantic kind of an axis. Axes are declared in the order the data has them -- a trace's store dimension order -- and no ordering by type is required of them: the time and channel axes are found by type rather than by position. */
export enum AxisType {
  /** A categorical channel axis: its coordinates index electrodes or acquisitions, not positions. Never downsampled. */
  Channel = 'CHANNEL',
  /** The value axis of a coordinate-valued array: its positions enumerate the components of an absolute output position. This is what makes the array readable as the `field` of a FIELD edge. A scalar-valued field (a label mask, whose one value is an object id) carries no value axis at all -- absent means scalar, and scalar means COORDINATE. */
  Coordinate = 'COORDINATE',
  /** The value axis of a displacement-valued array: its positions enumerate the components of a per-point OFFSET, where COORDINATE enumerates absolute positions. Stating it here rather than on the edge is deliberate: it is a property of the array, and an array that says it twice can disagree with itself. */
  Displacement = 'DISPLACEMENT',
  /** A spectral bin: a row of a spectrogram, a sample of a power spectral density. Continuous -- unlike a CHANNEL axis -- so it carries a frequency unit in a unit-carrying system and may be rescaled. */
  Frequency = 'FREQUENCY',
  /** An enumerating axis with no metric: a sweep, a trial, a spike number. It has no unit because there is nothing to measure — the distance between spike 3 and spike 4 means nothing, which is why a spike train reaches time through a FIELD and never through a SCALE. */
  Index = 'INDEX',
  /** A spatial axis. Unitless indices in a sample-grid system; carries a physical length unit in a unit-carrying system. No model of this service lives in a spatial system yet, but one can be authored and registered into. */
  Space = 'SPACE',
  /** A time axis. Sample indices in a trace's sample grid (no unit); carries a physical duration unit on a clock. */
  Time = 'TIME',
  /** What was measured: the y axis of a plotted trace. Only a drawing space has one -- an annotation collection's system, where a line from baseline to peak needs somewhere to be drawn. A trace's sample grid never does: the value at a sample is not a coordinate of it. Carries any unit (mV, pA), or none. */
  Value = 'VALUE'
}

export enum AxisTypeChoices {
  Channel = 'CHANNEL',
  Coordinate = 'COORDINATE',
  Displacement = 'DISPLACEMENT',
  Frequency = 'FREQUENCY',
  Index = 'INDEX',
  Space = 'SPACE',
  Time = 'TIME',
  Value = 'VALUE'
}

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

/** The blending mode used to combine multiple channels or layers into a composite image. */
export enum Blending {
  /** Additive blending, where the color values of overlapping layers are summed. */
  Additive = 'ADDITIVE',
  /** Multiplicative blending, where the color values of overlapping layers are multiplied. */
  Multiplicative = 'MULTIPLICATIVE',
  /** Alpha-over compositing: the layer is blended over the layers below using its opacity. */
  Normal = 'NORMAL'
}

/** An axis-aligned bounding box, as a min and a max corner */
export type BoundingBox = {
  __typename?: 'BoundingBox';
  /** The upper corner, in the coordinate order of the coordinate system */
  max: Array<Scalars['Float']['output']>;
  /** The lower corner, in the coordinate order of the coordinate system */
  min: Array<Scalars['Float']['output']>;
};

/** An axis-aligned box as a min and a max corner, in the coordinate order of the frame it is asked in */
export type BoundingBoxInput = {
  max: Array<Scalars['Float']['input']>;
  min: Array<Scalars['Float']['input']>;
};

/** The fields a BY_DIMENSION member of TransformInput reads. Published for codegen; the wire type is the flat TransformInput */
export type ByDimensionTransformInput = {
  affine?: InputMaybe<Array<Array<Scalars['Float']['input']>>>;
  inputAxes: Array<Scalars['String']['input']>;
  kind?: CreatableTransformKind;
  outputAxes: Array<Scalars['String']['input']>;
  scale?: InputMaybe<Array<Scalars['Float']['input']>>;
  translation?: InputMaybe<Array<Scalars['Float']['input']>>;
};

/** A composition of child transformations, each acting on a named subset of the axes */
export type ByDimensionTransformation = Transformation & {
  __typename?: 'ByDimensionTransformation';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  input?: Maybe<CoordinateSystem>;
  /** The names of the input axes this edge's parameters are ordered by. `scale`, `translation` and the columns of `affine` follow this order -- which is the input system's axis order, NOT the reading layer's axis names, and the two differ often enough that indexing the arrays against them silently misplaces them. A BY_DIMENSION edge names only the subset of axes it acts on; the axes it does not name are the ones it leaves untouched */
  inputAxes: Array<Scalars['String']['output']>;
  /** Which geometric properties survive this edge's map, derived from `kind`: ISOMETRY (distances, angles and areas all transfer), SIMILARITY (angles and length ratios transfer, absolute lengths scale by one common factor), AFFINE (parallelism and area ratios transfer, angles and distances do not), DIFFEOMORPHIC (topology at best, and only locally -- the Jacobian varies with position), NONE (nothing corresponds). A SEQUENCE or BY_DIMENSION is the weakest of its children. Stated by kind, never by inspecting the numbers: an AFFINE edge reads AFFINE even when its matrix happens to be rigid, because separating those needs an SVD. A layer's `placementInvariance` is the minimum of this over its whole path to world */
  invariance: TransformInvariance;
  kind: TransformKind;
  name?: Maybe<Scalars['String']['output']>;
  output?: Maybe<CoordinateSystem>;
  /** The names of the output axes this edge produces. For a rank-changing BY_DIMENSION edge (placing a (c,y,x) dataset into a (t,z,y,x) world) this is the subset it maps onto; the world's other axes are untouched */
  outputAxes: Array<Scalars['String']['output']>;
  /** Provenance entries for this edge: who authored it, and every refinement since. A refinement rewrites the edge in place, so this audit trail is where the placement's earlier states live -- and counting these rows along a chain is what `CoordinateSystem.transformVersion` reports */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Where along one axis this edge applies, or null for an edge that holds everywhere -- which is almost every edge. A per-channel correction is scoped to {axis: "c", index: 2}; several such edges over one axis are one piecewise map. A path query crosses a scoped edge only when it fixes that coordinate with `at` */
  selector?: Maybe<Selector>;
  /** The child transformations. Each carries the `inputAxes` and `outputAxes` it acts on */
  transformations: Array<Transformation>;
  /** How much this map is actually known: VALIDATED for a map the server derived (or one someone checked), INFERRED for numbers read from metadata, MANUAL for an authored registration, UNKNOWN for one its author marked as a guess. A layer's validity is the weakest edge on its path to world */
  validity: PlacementValidity;
  /** (derivation edges) What the operation this edge records did to the *values*, orthogonal to `kind`: IDENTICAL (a crop -- statistics transfer), TRANSFORMED (a deconvolution -- same quantity, new numbers), CATEGORIZED (a threshold -- values became labels, and a bootstrapped scene renders the data as a label map). Null when unstated, and never present on a registration -- values do not cross a claim between spaces */
  valueRelation?: Maybe<ValueRelation>;
  /** How many times this edge has been written, counting the row that created it -- so a new edge reads 1. Only comparison is meaningful: this and the edge's `id` together are the cache key for anything derived from the edge, and a change means refetch. It counts the same provenance rows `provenanceEntries` lists, so the audit trail and the token cannot disagree; a rename moves it too, which errs towards refetching something that did not change rather than trusting something that did */
  version: Scalars['Int']['output'];
};


/** A composition of child transformations, each acting on a named subset of the axes */
export type ByDimensionTransformationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

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

/** Input for changing an existing folder's name or parent */
export type ChangeFolderInput = {
  /** The ID of the folder to change */
  id: Scalars['ID']['input'];
  /** The name of the folder */
  name: Scalars['String']['input'];
  /** The ID of the parent folder to nest this folder under */
  parent?: InputMaybe<Scalars['ID']['input']>;
};

export enum ChangeType {
  Added = 'ADDED',
  Changed = 'CHANGED',
  Removed = 'REMOVED'
}

/** The channel truth: a human-readable label for a channel, pinned to a coordinate anchor */
export type ChannelLabel = {
  __typename?: 'ChannelLabel';
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
};

export type ChildrenOrder = {
  direction: ChildrenOrderDirection;
  field: ChildrenOrderField;
};

export enum ChildrenOrderDirection {
  Asc = 'ASC',
  Desc = 'DESC'
}

export enum ChildrenOrderField {
  CreatedAt = 'CREATED_AT',
  Name = 'NAME'
}

export type ChildrenPaginationInput = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

/** Which quantity the amplifier controlled: the potential (voltage clamp), the current (current clamp), or nothing at all (I=0) */
export enum ClampMode {
  CurrentClamp = 'CURRENT_CLAMP',
  VoltageClamp = 'VOLTAGE_CLAMP',
  ZeroCurrent = 'ZERO_CURRENT'
}

/** Input for clearing a shared coordinate system: delete every registration INTO it in one call, keeping the space, its scenes, and its own claims into wider spaces */
export type ClearCoordinateSystemInput = {
  /** The ID of the shared coordinate system to clear */
  id: Scalars['ID']['input'];
};

export type Client = {
  __typename?: 'Client';
  clientId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  release?: Maybe<Release>;
};

/** One entry of a spikes or events layer's colour picker: a column of a table the layer's rows (events) or units (spikes) reach, and how it becomes colour. mikro's COLUMN colour-by, field for field */
export type ColorBy = {
  __typename?: 'ColorBy';
  colormap?: Maybe<ColorMap>;
  column: Scalars['String']['output'];
  joinPath: Array<JoinStep>;
  kind: Scalars['String']['output'];
  label?: Maybe<Scalars['String']['output']>;
  max?: Maybe<Scalars['Float']['output']>;
  min?: Maybe<Scalars['Float']['output']>;
  table: Scalars['ID']['output'];
};

/** One colour picker entry to store: a column of a table the layer reaches, and how it becomes colour. mikro's COLUMN colour-by input, field for field */
export type ColorByInput = {
  colormap?: InputMaybe<ColorMap>;
  column: Scalars['String']['input'];
  joinPath?: InputMaybe<Array<JoinStepInput>>;
  label?: InputMaybe<Scalars['String']['input']>;
  max?: InputMaybe<Scalars['Float']['input']>;
  min?: InputMaybe<Scalars['Float']['input']>;
  table: Scalars['ID']['input'];
};

/** The colormap used to map intensity values of a channel to display colors. */
export enum ColorMap {
  /** A colormap rendering all values as black. */
  Black = 'BLACK',
  /** A monochromatic colormap from black to pure blue. */
  Blue = 'BLUE',
  /** A monochromatic colormap from black to brown. */
  Brown = 'BROWN',
  /** A colormap of cool tones ranging from cyan to magenta. */
  Cool = 'COOL',
  /** A monochromatic colormap from black to cyan. */
  Cyan = 'CYAN',
  /** Qualitative. The hue scatter with saturation and value tiered by rank as well, so two classes that happen to land on nearby hues still separate -- a palette-free take on glasbey. Reach for it when a mask has many classes. */
  Distinct = 'DISTINCT',
  /** A monochromatic colormap from black to pure green. */
  Green = 'GREEN',
  /** A grayscale colormap from black to white. */
  Grey = 'GREY',
  /** Qualitative. A colour per distinct value, scattered around the hue wheel by the golden ratio so consecutive classes land far apart. The default categorical palette, and the one the id hash itself paints with. */
  Hues = 'HUES',
  /** The perceptually uniform inferno colormap, ranging from black through red to yellow. */
  Inferno = 'INFERNO',
  /** A grayscale colormap mapping intensity values directly to brightness. */
  Intensity = 'INTENSITY',
  /** A monochromatic colormap from black to magenta. */
  Magenta = 'MAGENTA',
  /** The perceptually uniform magma colormap, ranging from black through purple to light yellow. */
  Magma = 'MAGMA',
  /** A monochromatic colormap from black to orange. */
  Orange = 'ORANGE',
  /** Qualitative. The hue scatter at low saturation, for a colouring meant to sit under something else rather than carry the picture. */
  Pastel = 'PASTEL',
  /** A monochromatic colormap from black to pink. */
  Pink = 'PINK',
  /** The perceptually uniform plasma colormap, ranging from dark blue to yellow. */
  Plasma = 'PLASMA',
  /** A monochromatic colormap from black to purple. */
  Purple = 'PURPLE',
  /** A multi-hue rainbow colormap cycling through the visible spectrum. */
  Rainbow = 'RAINBOW',
  /** A monochromatic colormap from black to pure red. */
  Red = 'RED',
  /** A diverging colormap spanning the spectral colors from red to blue. */
  Spectral = 'SPECTRAL',
  /** The perceptually uniform viridis colormap, ranging from dark purple to yellow. */
  Viridis = 'VIRIDIS',
  /** Qualitative. The hue scatter at full saturation, for a colouring meant to carry the picture. */
  Vivid = 'VIVID',
  /** A colormap of warm tones ranging from yellow to red. */
  Warm = 'WARM',
  /** A monochromatic colormap from black to white. */
  White = 'WHITE',
  /** A monochromatic colormap from black to yellow. */
  Yellow = 'YELLOW'
}

/** One declared column of a table dataset: its name, dtype and role. A COORDINATE column is also an axis of the table's space */
export type Column = {
  __typename?: 'Column';
  axisType?: Maybe<AxisType>;
  description?: Maybe<Scalars['String']['output']>;
  dtype: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  longName?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  order: Scalars['Int']['output'];
  /** The table whose rows this column's values identify -- a declared foreign key, e.g. an `instance_id` column referencing a table of tracks. The target is keyed by its single INDEX coordinate column; look a value up there. Null for a column that identifies nothing */
  references?: Maybe<TableDataset>;
  role: ColumnRole;
  /** The table this column is declared on. Trivial when the column was read through its table, load-bearing when it was not -- an options list is flat, and a column with no table on it cannot be named in a `colorBy` */
  table: TableDataset;
  unit?: Maybe<Scalars['Unit']['output']>;
};

/** One column of the table -- THE one declaration a column gets. **Every column of the Parquet is declared, and the declaration is checked against the file** -- same names, same order, same types -- so a declaration that has drifted from the data is refused rather than stored. That check is the whole reason `name` is here: it is a fact about the file, and stating it is how a caller says which file they think they are describing. `dtype` is **optional** -- the server read every column's type off the Parquet when the upload finished, so it is checked when given and taken from the file when not. Given, it is a **DuckDB** type name (`BIGINT`, `DOUBLE`, `VARCHAR`), not a pandas one where a float64 is a `double`. A non-null `axisType` makes the column an axis of the table's own space; **the axis-typed columns, in this list's (= the file's) order, ARE the space** -- a table has no byte order, its axes are named columns, and an edge wanting a different order states its own `inputAxes`/`outputAxes`. `identifiedBy` says what the values are, for an axis and a data column alike */
export type ColumnInput = {
  axisType?: InputMaybe<AxisType>;
  description?: InputMaybe<Scalars['String']['input']>;
  dtype?: InputMaybe<Scalars['String']['input']>;
  identifiedBy?: Array<IdentificationInput>;
  longName?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  role?: InputMaybe<ColumnRole>;
  unit?: InputMaybe<Scalars['Unit']['input']>;
};

/** What a table dataset's column is for: a coordinate that places the row, or data hanging off it. */
export enum ColumnRole {
  /** A measurement or property column — area, an intensity, a marker level. Data only; it does not place the row. */
  Attribute = 'ATTRIBUTE',
  /** A per-row color, or a value a layer colors the rows by. */
  Color = 'COLOR',
  /** A spatial or temporal column whose values are coordinates. The coordinate columns become the axes of the table's own coordinate system, which is what makes the table placeable. */
  Coordinate = 'COORDINATE',
  /** Groups rows into one connected object — the nodes of one traced arbor, the points of one cluster. Distinct from TRACK_ID, which means a trajectory: a branching tree is not one, and a table that grouped by TRACK_ID would be claiming an order its rows do not have. */
  GroupId = 'GROUP_ID',
  /** A per-row identifier. */
  Id = 'ID',
  /** A per-row text label. */
  Label = 'LABEL',
  /** Groups rows into a trajectory. Required to render a table as tracks. */
  TrackId = 'TRACK_ID'
}

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

/** A discrete coordinate an annotation is pinned to, e.g. a channel or a sweep */
export type Coordinate = {
  __typename?: 'Coordinate';
  /** The name of the coordinate, e.g. 'c' or 'sweep' */
  name: Scalars['String']['output'];
  /** The value along that coordinate */
  value: Scalars['Int']['output'];
};

/** The axis-agnostic hub that pins metadata spokes (a value unit, a channel label, the rig state, a value histogram, acquisition metadata) to specific coordinates of a dataset */
export type CoordinateAnchor = {
  __typename?: 'CoordinateAnchor';
  acquisitionMetadata?: Maybe<AcquisitionMetadata>;
  channelLabel?: Maybe<ChannelLabel>;
  /** The coordinates this anchor is pinned to, e.g. {'c': 0, 'sweep': 5}. Level-0 sample indices, i.e. coordinates of the dataset's INTRINSIC system. An anchor that omits an axis is global along it; an empty object is the whole dataset */
  coordinates: Scalars['Any']['output'];
  dataset: ArrayDataset;
  id: Scalars['ID']['output'];
  /** (simulation) Where on the model the values at this coordinate were recorded */
  recordingSite?: Maybe<RecordingSite>;
  /** The rig state recorded at this coordinate */
  rig?: Maybe<RigState>;
  /** (simulation) Where on the model the values at this coordinate were injected */
  stimulusSite?: Maybe<StimulusSite>;
  valueHistogram?: Maybe<ValueHistogram>;
  valueUnit?: Maybe<ValueUnit>;
};

export type CoordinateAnchorFilter = {
  AND?: InputMaybe<CoordinateAnchorFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<CoordinateAnchorFilter>;
  OR?: InputMaybe<CoordinateAnchorFilter>;
  dataset?: InputMaybe<IdFilterLookup>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

/** Input type for a coordinate anchor, which specifies a list of dimension anchors to anchor to */
export type CoordinateAnchorInput = {
  acquisitionMetadata?: InputMaybe<AcquisitionMetadataInput>;
  axisAnchors: Array<AxisAnchorInput>;
  label?: InputMaybe<LabelInput>;
  recordingSite?: InputMaybe<RecordingSiteInput>;
  rig?: InputMaybe<RigStateInput>;
  stimulusSite?: InputMaybe<StimulusSiteInput>;
  valueHistogram?: InputMaybe<ValueHistogramInput>;
  valueUnit?: InputMaybe<ValueUnitInput>;
};

/** The connected component of the coordinate graph around one system: every coordinate system it relates to, and every top-level edge between them. Reachability is undirected -- an edge pointing *into* the system you started from (the edge into a physical space, say) relates to it just as much as one pointing out -- but every edge is returned in its true stored direction, so composing a path is still the client's job and still needs the inversions flagged */
export type CoordinateGraph = {
  __typename?: 'CoordinateGraph';
  /** The coordinate system the walk started from */
  root: CoordinateSystem;
  /** Every coordinate system reachable from the root, the root included, ordered by ID */
  systems: Array<CoordinateSystem>;
  /** Every top-level edge with both endpoints in `systems`, ordered by ID. The children of a SEQUENCE / BY_DIMENSION wrapper are not listed here; they hang off their wrapper */
  transformations: Array<Transformation>;
};

/** A discrete coordinate a question is asked at, e.g. a channel or a sweep */
export type CoordinateInput = {
  name: Scalars['String']['input'];
  value: Scalars['Int']['input'];
};

/** A named coordinate space: a node in the transformation graph. Its axes are ordered, and that order is the order of the array's dimensions */
export type CoordinateSystem = {
  __typename?: 'CoordinateSystem';
  /** The annotations drawn in a space that can reach this one. Reachability, not containment: asked of a segment's clock it answers with the events and epochs drawn on the clock *and* those drawn over any dataset sampled onto it; asked of an experiment's world, with everything marked on anything laid out there. An annotation belongs to a collection, and outlives every experiment composing over this space */
  annotations: Array<Annotation>;
  /** The system's axes, in the order the data has them: for a system backed by an array, its store's dimension order; for a table, its coordinate columns as declared. No ordering by type is imposed on either. What matters downstream is that the *spatial* axes are in array order, which is what the render axes are derived from */
  axes: Array<Axis>;
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  /** The wall-clock instant this system's time axis has its origin at: `wall_clock = epoch + t * unit`. A property of the space, not of any composition over it. Meaningful only for a unit-carrying system with a TIME axis (a shared world space); null when the clock is unanchored -- the time axis is still a perfectly composable relative coordinate */
  epoch?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** Which registered sources are in view of an axis-aligned region asked in *this* system's coordinates, each with its extent here, the path of edges that places it, and its in-view coordinate anchors. The field hangs off the coordinate system because the system IS the frame the region is written in -- there is no ambient world to be wrong about, and no camera: a region is a box, and projecting a frustum into one is the client's job. `region` names a leading prefix of this system's axes and says nothing about the rest, so a 2D box asked of a 4D space constrains only its first two axes. Sources the server cannot bound (a mesh collection's vertices and a table's rows live in Parquet it never opens) come back with an empty `extent` and an `extentState` saying why, rather than being culled -- refusing to bound something is not the same as knowing it is out of view. Nothing is stored: the extent is composed per request from the shapes and the edges, so refining a registration moves everything that looks through it and no cached box can disagree. A source registered per index -- a per-channel or per-timepoint correction -- comes back with `extentState: CONDITIONAL` and no extent unless you pass `at`: it is genuinely in the space, but which box it occupies depends on the coordinate. Individual annotations are out of scope; selecting those needs the region pulled back into their frame, and this server composes forward only */
  inView: Array<SourcePlacement>;
  name: Scalars['String']['output'];
  /** Every space whose data can be composed here: those reaching this one across steps that compose into one affine map, walking the transformation edges. Composed, not merely connected -- a space reaching this one only across a FIELD relates to it by the values of an array and yields no matrix to draw with, so it is not here. The same set the `placeableIn` filters answer from, so a picker and a layer mutation cannot disagree. Distinct from `coordinateGraph`, which walks the undirected *neighbourhood* -- this is directed, and asks who can get in */
  placedSystems: Array<CoordinateSystem>;
  /** Provenance entries for this coordinate system: who created it, and every subsequent change */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Every top-level edge landing in this space -- the claims that place something here. They belong to the space, so every scene composing over this system sees the same list, each entry unique for its data-tree, and `layers.pathToWorld` searches exactly these plus the datasets' own facts. On a shared world these are the registrations a client authored; on a container's own grid they are the lens crops and derived children that land in it. Composing the matrices stays the client's job. Not filtered by kind, so a table's own system also lists the FIELD edge of any mask keying it -- that one places nothing (a FIELD has no inverse, so no path walks it backwards); it is a dereference, and `attributePlans` is what reads it */
  registrations: Array<Transformation>;
  /** The data living in this space. Empty for a pure reference frame -- a world, an atlas -- which is what a space with no residents *is*; there is no separate kind to consult. Several residents may share one space: a dataset's own pyramid levels and unsliced lenses live in its grid, and a hundred tiles acquired on one stage can be registered into one stage frame */
  residents: Array<Resident>;
  /** How many times the transformation chain from this system down to its dataset's intrinsic pixel space has been written, as it stands now. Compare it with an annotation's `createdWithTransforms` to detect staleness: the two agreeing means the geometry was authored against the chain still in force, and them differing means an edge on the path has been written since. Only the comparison is meaningful -- the number counts history rows, so it also moves when an edge is merely renamed, which errs towards recomputing a box that did not need it rather than trusting one that did. 0 for a system that IS an intrinsic space, or one with no path down to pixels (a unit-carrying or shared space -- its coordinates are meaningful on their own). Provenance only: it never takes part in resolving a coordinate */
  transformVersion: Scalars['Int']['output'];
};


/** A named coordinate space: a node in the transformation graph. Its axes are ordered, and that order is the order of the array's dimensions */
export type CoordinateSystemAxesArgs = {
  filters?: InputMaybe<AxisFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A named coordinate space: a node in the transformation graph. Its axes are ordered, and that order is the order of the array's dimensions */
export type CoordinateSystemInViewArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
  region: BoundingBoxInput;
};


/** A named coordinate space: a node in the transformation graph. Its axes are ordered, and that order is the order of the array's dimensions */
export type CoordinateSystemProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** The fields a COORDINATE_SYSTEM derivation reads. Published for codegen; the wire type is the flat DerivedFromInput */
export type CoordinateSystemDerivedFromInput = {
  coordinateSystem: Scalars['ID']['input'];
  kind?: DerivationSourceKind;
  transform?: InputMaybe<TransformInput>;
  valueRelation?: InputMaybe<ValueRelation>;
};

export type CoordinateSystemFilter = {
  AND?: InputMaybe<CoordinateSystemFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<CoordinateSystemFilter>;
  OR?: InputMaybe<CoordinateSystemFilter>;
  /** Filter to the spaces something composes over without living in them: an experiment's world, a block's or a segment's or a simulation's clock. False finds the spaces nothing is laid out in */
  composedOver?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter to the spaces this dataset's data lives in: its own sample grid, and the grids of its sliced lenses */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  /** Filter by the creator's subject ID */
  owner?: InputMaybe<Scalars['ID']['input']>;
  /** Search by name (case-insensitive substring) */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Filter to the spaces nothing lives in: pure reference frames -- the clocks and worlds that datasets are sampled onto and registered into. False finds the spaces some data actually occupies */
  uninhabited?: InputMaybe<Scalars['Boolean']['input']>;
};

export type CoordinateSystemOrder =
  { createdAt: Ordering; id?: never; name?: never; }
  |  { createdAt?: never; id: Ordering; name?: never; }
  |  { createdAt?: never; id?: never; name: Ordering; };

/** The kind of a transformation a client can author directly: the discriminator of `TransformInput`. SEQUENCE is absent on purpose -- it is a wrapper the ingest builds together with its children (pyramid levels, stepped lenses), never authored empty. */
export enum CreatableTransformKind {
  /** A general affine map. Takes `affine`, an M x (N+1) matrix with rows outermost. */
  Affine = 'AFFINE',
  /** A map acting on a named subset of the axes and saying nothing about the rest. Takes `inputAxes` and `outputAxes`, and optionally `scale`, `translation` or `affine` acting on the named axes. */
  ByDimension = 'BY_DIMENSION',
  /** A non-affine map given by the values of an array rather than by a formula. Takes `field` (the array's coordinate system), `inputAxes` and `outputAxes`. */
  Field = 'FIELD',
  /** The identity map. Input and output coordinates are the same, so it takes no parameters. */
  Identity = 'IDENTITY',
  /** A permutation of axes, mapping each input axis to an output axis by name. Takes `inputAxes` and `outputAxes`; the matrix is synthesized from them. */
  MapAxis = 'MAP_AXIS',
  /** A rotation. Takes `affine`: the orthonormal matrix, in the same layout an AFFINE uses. */
  Rotation = 'ROTATION',
  /** A per-axis multiplication. Takes `scale`, one entry per input axis. */
  Scale = 'SCALE',
  /** A per-axis offset. Takes `translation`, one entry per input axis. */
  Translation = 'TRANSLATION',
  /** A declared NON-correspondence: no point of either space maps to a point of the other. Takes only an optional `reason`. */
  Unmappable = 'UNMAPPABLE'
}

/** Input for creating an annotation collection. The collection gets a coordinate system of its own, and an edge relates it to the space the shapes are drawn over */
export type CreateAnnotationCollectionInput = {
  axes: Array<AxisInput>;
  derivedFrom?: InputMaybe<Array<DerivedFromInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
};

/** Input for drawing an annotation. Provide exactly one of `collection` (append to it) or `experiment` (draw on the experiment's timeline: its annotation collection is found, or minted on first use together with its coordinate system, its registration into the world, and its view) */
export type CreateAnnotationInput = {
  collection?: InputMaybe<Scalars['ID']['input']>;
  coordinates?: InputMaybe<Array<CoordinateInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  experiment?: InputMaybe<Scalars['ID']['input']>;
  fillColor?: InputMaybe<Array<Scalars['Int']['input']>>;
  filled?: InputMaybe<Scalars['Boolean']['input']>;
  kind: AnnotationKind;
  name?: InputMaybe<Scalars['String']['input']>;
  strokeColor?: InputMaybe<Array<Scalars['Int']['input']>>;
  strokeWidth?: InputMaybe<Scalars['Float']['input']>;
  vectors: Array<Array<Scalars['Float']['input']>>;
};

/** Draw an annotation collection's marks in an experiment. One layer per collection per experiment */
export type CreateAnnotationLayerInput = {
  annotationCollection: Scalars['ID']['input'];
  blending?: InputMaybe<Blending>;
  experiment: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  visible?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for drawing many annotations in one call -- a detector's whole output. Provide exactly one of `collection` or `experiment` (same semantics as createAnnotation); the transform chain and version resolve once for the whole batch */
export type CreateAnnotationsInput = {
  annotations: Array<AnnotationSpecInput>;
  collection?: InputMaybe<Scalars['ID']['input']>;
  experiment?: InputMaybe<Scalars['ID']['input']>;
};

/** Input type for creating an array dataset. Its axes are structural (name and kind); physical units, if known, arrive afterwards through createCoordinateSystem with a registrations entry naming the dataset */
export type CreateArrayDatasetInput = {
  anchors?: InputMaybe<Array<CoordinateAnchorInput>>;
  axes: Array<AxisInput>;
  data: Scalars['ArrayLike']['input'];
  derivedFrom?: InputMaybe<Array<DerivedFromInput>>;
  folder?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  scales: Array<ScaleInput>;
  sourceFiles?: InputMaybe<Array<SourceFileInput>>;
};

/** State where one clock's zero sits on another: a segment within its session, a session or a run within an experiment's world. One edge, shared by everything timed on `clock` -- which is why an offset is stated here once and never per layer. A bare offset when the two clocks count in one unit, a one-axis affine when they do not */
export type CreateClockOffsetInput = {
  clock: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  offset: Scalars['Duration']['input'];
  onto: Scalars['ID']['input'];
  validity?: InputMaybe<PlacementValidity>;
};

/** Create a SHARED coordinate system -- a reference space nothing lives in, e.g. a clock or a world -- and, in the same call, author the edges registering any number of sources (datasets, lenses, coordinate systems) into it. A dataset's sample grid is created with the dataset, so a shared space is the only system created directly. createExperiment can later adopt it as its world */
export type CreateCoordinateSystemInput = {
  axes: Array<PhysicalAxisInput>;
  epoch?: InputMaybe<Scalars['DateTime']['input']>;
  name: Scalars['String']['input'];
  registrations?: Array<RegistrationPathInput>;
};

/** Draw an event table -- a table with a TIME coordinate column -- as a mark per row, or an interval per row with `stopColumn` */
export type CreateEventsLayerInput = {
  activeColorBy?: InputMaybe<Scalars['Int']['input']>;
  activeFilterBys?: InputMaybe<Array<Scalars['Int']['input']>>;
  blending?: InputMaybe<Blending>;
  /** The base colour as RGBA, 0-255 */
  color?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** The colour picker: columns of the layer's table, or of tables it references along `joinPath`. Replaces the whole picker */
  colorBys?: InputMaybe<Array<ColorByInput>>;
  colormap?: InputMaybe<ColorMap>;
  experiment: Scalars['ID']['input'];
  /** The filter picker: columns of the layer's table, or of tables it references along `joinPath`. Replaces the whole picker */
  filterBys?: InputMaybe<Array<FilterByInput>>;
  /** A column naming each row */
  labelColumn?: InputMaybe<Scalars['String']['input']>;
  /** A categorical column giving each distinct value its own lane */
  laneColumn?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  /** The position top to bottom. Omit to append */
  order?: InputMaybe<Scalars['Int']['input']>;
  /** A column ending each row's interval, in the TIME column's unit. Omit to draw instants */
  stopColumn?: InputMaybe<Scalars['String']['input']>;
  /** The event table to draw. It needs a TIME coordinate column, and its space must reach the world */
  tableDataset: Scalars['ID']['input'];
  visible?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Stage what is already laid out on a coordinate system as an experiment over it: a layer for every trace, spike raster, event table and annotation collection that reaches it -- through a sampling law, a time lookup, or a chain of clock offsets. CS-first: time the data on a clock, then point this at the clock. Authors no edges. mikro's createSceneFromCoordinateSystem */
export type CreateExperimentFromCoordinateSystemInput = {
  coordinateSystem: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  policy?: InputMaybe<ExperimentPolicyInput>;
};

/** An empty experiment over a world: an existing space it adopts (`coordinateSystem`), or one minted for it. Fill it with the layer mutations. mikro's createScene */
export type CreateExperimentInput = {
  axes?: InputMaybe<Array<PhysicalAxisInput>>;
  coordinateSystem?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  epoch?: InputMaybe<Scalars['DateTime']['input']>;
  name: Scalars['String']['input'];
};

/** Input for creating a new folder to organize array datasets, recording sessions and files */
export type CreateFolderInput = {
  /** The name of the folder */
  name: Scalars['String']['input'];
  /** The ID of the parent folder to nest this folder under */
  parent?: InputMaybe<Scalars['ID']['input']>;
};

/** Add a layer of any kind with default render settings: exactly one source, the one its kind draws. The per-kind mutations set the render settings too */
export type CreateLayerInput = {
  annotationCollection?: InputMaybe<Scalars['ID']['input']>;
  blending?: InputMaybe<Blending>;
  experiment: Scalars['ID']['input'];
  kind: ExperimentLayerKind;
  lens?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  sparseDataset?: InputMaybe<Scalars['ID']['input']>;
  tableDataset?: InputMaybe<Scalars['ID']['input']>;
  visible?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for creating a lens: a selection over a dataset */
export type CreateLensInput = {
  dataset: Scalars['ID']['input'];
  slices?: InputMaybe<Array<SliceInput>>;
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

/** State `t = sample / samplingRate + tStart` as one edge from a sample grid onto a clock: how a regularly sampled signal -- or a spike raster's sample axis -- is timed. One BY_DIMENSION edge over the grid's TIME axis, in the clock's unit; the same edge `createTransformation` would write, with the arithmetic done for you */
export type CreateSamplingLawInput = {
  clock: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  samplingRate: Scalars['Frequency']['input'];
  source: Scalars['ID']['input'];
  tStart?: Scalars['Duration']['input'];
  validity?: InputMaybe<PlacementValidity>;
};

/** One run of a neuron model: the model, the integrator's parameters, and a clock. Optionally, the array datasets it produced and how their samples are timed on that clock. What was recorded or injected where is not stated here: it is a `recordingSite` / `stimulusSite` on each dataset's anchors, said at `createArrayDataset` */
export type CreateSimulationInput = {
  datasets?: Array<Scalars['ID']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  dt?: InputMaybe<Scalars['Duration']['input']>;
  duration: Scalars['Duration']['input'];
  model: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  sampling?: InputMaybe<SamplingInput>;
  timeDataset?: InputMaybe<Scalars['ID']['input']>;
  timeUnit?: Scalars['Unit']['input'];
};

/** Create a sparse dataset from one uploaded sparse store, which holds the matrix in one or more layouts. A sparse matrix is a grid of numbers with no row labels and no column labels, so **every axis says what its positions are** through its own `identifiedBy` -- a source whose contents are the ids, or the table whose rows they are. Carried on the axis, identified-exactly-once is a property of this input rather than a rule the server enforces. Nothing about the matrix itself is declared: the spec, shape, each layout's encoding and its chunking were read from the store when its upload was finished, and are checked against these axes rather than taken from them */
export type CreateSparseDatasetInput = {
  axes?: Array<SparseAxisInput>;
  derivedFrom?: InputMaybe<Array<DerivedFromInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  folder?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  sourceFiles?: InputMaybe<Array<SourceFileInput>>;
  store: Scalars['SporadikLike']['input'];
};

/** Draw a spike raster -- a sparse dataset over (unit, t) -- as a tick per spike and a row per unit, or as a rate histogram. Colour and order come from the table identifying its unit axis */
export type CreateSpikesLayerInput = {
  activeColorBy?: InputMaybe<Scalars['Int']['input']>;
  activeFilterBys?: InputMaybe<Array<Scalars['Int']['input']>>;
  blending?: InputMaybe<Blending>;
  climMax?: InputMaybe<Scalars['Float']['input']>;
  climMin?: InputMaybe<Scalars['Float']['input']>;
  /** The base colour as RGBA, 0-255 */
  color?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** The colour picker: columns of the layer's table, or of tables it references along `joinPath`. Replaces the whole picker */
  colorBys?: InputMaybe<Array<ColorByInput>>;
  colormap?: InputMaybe<ColorMap>;
  experiment: Scalars['ID']['input'];
  /** The filter picker: columns of the layer's table, or of tables it references along `joinPath`. Replaces the whole picker */
  filterBys?: InputMaybe<Array<FilterByInput>>;
  name?: InputMaybe<Scalars['String']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  /** The position top to bottom. Omit to append */
  order?: InputMaybe<Scalars['Int']['input']>;
  /** Draw a firing-rate histogram at this bin width instead of a raster */
  rateBin?: InputMaybe<Scalars['Duration']['input']>;
  /** A column of the unit table to order the rows by (depth, channel) */
  rowOrderColumn?: InputMaybe<Scalars['String']['input']>;
  /** The spike raster to draw. It needs a TIME axis, placed on a clock that reaches the world */
  sparseDataset: Scalars['ID']['input'];
  /** A spike tick's height as a fraction of its unit's row, 0 to 1 */
  tickHeight?: InputMaybe<Scalars['Float']['input']>;
  /** PRESENCE (every nonzero is a spike) or AMPLITUDE (the value is drawn through `colormap`) */
  valueMode?: InputMaybe<SpikeValueMode>;
  visible?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for creating a table dataset from a Parquet store. A column is declared ONCE, in `columns`: a non-null `axisType` makes it an axis of the coordinate system the table owns, and the axis-typed columns, in list (= file) order, are the space -- there is no separate axes list, because a table's axes are named columns and every consumer addresses them by name. Declare no axis-typed columns for a pure measurement table (its rows enumerate objects, its space is a synthetic `object` axis, and its lineage edge is UNMAPPABLE) */
export type CreateTableDatasetInput = {
  columns?: Array<ColumnInput>;
  data: Scalars['ParquetLike']['input'];
  derivedFrom?: InputMaybe<Array<DerivedFromInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  folder?: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
  sourceFiles?: InputMaybe<Array<SourceFileInput>>;
};

/** Draw an array dataset -- a recording, a stimulus, any signal -- as a trace: a lens over it, and how the lines look. Name a `lens`, or a `dataset` with an optional `window` of time */
export type CreateTraceLayerInput = {
  blending?: InputMaybe<Blending>;
  channelIndex?: InputMaybe<Scalars['Int']['input']>;
  climMax?: InputMaybe<Scalars['Float']['input']>;
  climMin?: InputMaybe<Scalars['Float']['input']>;
  clock?: InputMaybe<Scalars['ID']['input']>;
  color?: InputMaybe<Array<Scalars['Int']['input']>>;
  dataset?: InputMaybe<Scalars['ID']['input']>;
  experiment: Scalars['ID']['input'];
  lens?: InputMaybe<Scalars['ID']['input']>;
  lineWidth?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  visible?: InputMaybe<Scalars['Boolean']['input']>;
  window?: InputMaybe<WindowInput>;
};

/** Input for creating one edge of the coordinate graph, mapping an input coordinate system to an output one */
export type CreateTransformationInput = {
  input: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  output: Scalars['ID']['input'];
  selector?: InputMaybe<SelectorInput>;
  transform: TransformInput;
  validity?: InputMaybe<PlacementValidity>;
  valueRelation?: InputMaybe<ValueRelation>;
};

/** One level of a dataset's resolution pyramid: a zarr-backed array, with its own sample-index coordinate system and a stored edge into the dataset's intrinsic space. Level 0 is the recording; higher levels are decimations a client reads when zoomed out over hours of data */
export type DataArray = {
  __typename?: 'DataArray';
  chunkShape: Array<Scalars['Int']['output']>;
  /** The coordinate system this level's voxels live in. Level 0 owns none: the dataset's INTRINSIC system IS the level-0 pixel grid, so this resolves to it. Higher levels own an ARRAY (voxel index) system */
  coordinateSystem?: Maybe<CoordinateSystem>;
  dataset: ArrayDataset;
  id: Scalars['ID']['output'];
  level: Scalars['Int']['output'];
  /** How this level's voxels were computed from the level above it. Null for level 0, which was downsampled from nothing, and null for a level whose writer did not say. Over a dataset whose values are object ids only NEAREST and MODE are honest -- see `ArrayDataset.pyramidIsLabelCompliant` */
  scaleMethod?: Maybe<ScaleMethod>;
  shape: Array<Scalars['Int']['output']>;
  store: ZarrStore;
  /** The edge from this level's voxel space into the dataset's intrinsic space. Its scale is absolute -- derived from the actual shapes, not from a nominal 2**level -- so a pyramid whose axes do not halve cleanly is described correctly. Null for level 0: its space IS the intrinsic space, and there is nothing to map */
  toParent?: Maybe<Transformation>;
};

export type DataArrayFilter = {
  AND?: InputMaybe<DataArrayFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DataArrayFilter>;
  OR?: InputMaybe<DataArrayFilter>;
  /** Filter by the dataset this array belongs to */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  level?: InputMaybe<IntFilterLookup>;
};

export type DataArrayOrder =
  { id: Ordering; level?: never; }
  |  { id?: never; level: Ordering; };

/** The fields a DATASET derivation reads. Published for codegen; the wire type is the flat DerivedFromInput */
export type DatasetDerivedFromInput = {
  dataset: Scalars['ID']['input'];
  kind?: DerivationSourceKind;
  transform?: InputMaybe<TransformInput>;
  valueRelation?: InputMaybe<ValueRelation>;
};

/** The fields a DATASET export link reads. Published for codegen; the wire type is the flat ExportOfInput */
export type DatasetExportOfInput = {
  dataset: Scalars['ID']['input'];
  kind?: FileLinkContainerKind;
  seriesIdentifier?: InputMaybe<Scalars['String']['input']>;
  valueRelation?: InputMaybe<ValueRelation>;
};

/** The fields a DATASET identification reads. Published for codegen; the wire type is the flat IdentificationInput */
export type DatasetIdentifiesInput = {
  dataset: Scalars['ID']['input'];
  kind?: IdentificationKind;
  name?: InputMaybe<Scalars['String']['input']>;
  validity?: InputMaybe<PlacementValidity>;
};

/** Input for deleting an annotation collection by ID */
export type DeleteAnnotationCollectionInput = {
  /** The ID of the annotation collection to delete */
  id: Scalars['ID']['input'];
};

/** Input for deleting an annotation by ID */
export type DeleteAnnotationInput = {
  id: Scalars['ID']['input'];
};

/** Input for deleting an array dataset by ID */
export type DeleteArrayDatasetInput = {
  /** The ID of the array dataset to delete */
  id: Scalars['ID']['input'];
};

/** Input for deleting a shared coordinate system by ID */
export type DeleteCoordinateSystemInput = {
  /** The ID of the shared coordinate system to delete */
  id: Scalars['ID']['input'];
};

/** Input for deleting a data array by ID */
export type DeleteDataArrayInput = {
  /** The ID of the data array to delete */
  id: Scalars['ID']['input'];
};

/** Input for deleting a file by ID */
export type DeleteFileInput = {
  /** The ID of the file to delete */
  id: Scalars['ID']['input'];
};

/** Input for deleting a folder by ID */
export type DeleteFolderInput = {
  /** The ID of the folder to delete */
  id: Scalars['ID']['input'];
};

/** Input for deleting an object by its id */
export type DeleteInput = {
  id: Scalars['ID']['input'];
};

/** Input for deleting a lens by ID */
export type DeleteLensInput = {
  /** The ID of the lens to delete */
  id: Scalars['ID']['input'];
};

export type DeleteMechanismInput = {
  id: Scalars['ID']['input'];
};

/** Input for un-registering a source from a shared space by naming the source and the space, not the edge. Provide exactly one source -- the same selector registering it took */
export type DeleteRegistrationInput = {
  annotationCollection?: InputMaybe<Scalars['ID']['input']>;
  coordinateSystem?: InputMaybe<Scalars['ID']['input']>;
  dataset?: InputMaybe<Scalars['ID']['input']>;
  lens?: InputMaybe<Scalars['ID']['input']>;
  /** The shared space the registration goes into */
  world: Scalars['ID']['input'];
};

/** Input for deleting a simulation by ID */
export type DeleteSimulationInput = {
  id: Scalars['ID']['input'];
};

/** Input for deleting a sparse dataset by ID */
export type DeleteSparseDatasetInput = {
  /** The ID of the sparse dataset to delete */
  id: Scalars['ID']['input'];
};

/** Input for deleting a table dataset by ID */
export type DeleteTableDatasetInput = {
  /** The ID of the table dataset to delete */
  id: Scalars['ID']['input'];
};

/** Input for deleting a transformation by ID */
export type DeleteTransformationInput = {
  /** The ID of the transformation to delete */
  id: Scalars['ID']['input'];
};

/** Which kind of thing a derivation names as the source its data was computed from: the discriminator of `DerivedFromInput`. The edge itself is the same whichever is chosen -- child space in, source space out -- so a dataset named as DATASET and the same dataset named by its COORDINATE_SYSTEM write the identical row; the read side reports what lives at the far end through `CoordinateSystem.residents`, not which member was used to say it */
export enum DerivationSourceKind {
  /** An annotation collection, through the space its shapes are drawn in. */
  AnnotationCollection = 'ANNOTATION_COLLECTION',
  /** A coordinate system directly, when the source is a space rather than a dataset -- a clock, or a world. */
  CoordinateSystem = 'COORDINATE_SYSTEM',
  /** An array dataset as a whole, through its intrinsic sample grid. Use it when the source is the entire recording and there is no lens worth minting. */
  Dataset = 'DATASET',
  /** A selection over an array dataset, and the preferred way to name one: a lens' own edge back to its dataset already carries the crop, so pointing at it gets the rest of the chain for free. */
  Lens = 'LENS',
  /** A table dataset, through the space its coordinate columns declare -- the direction an image reconstructed from a table of SMLM localizations is derived. A table with no coordinate columns enumerates objects rather than places them, and its only honest edge is UNMAPPABLE. */
  TableDataset = 'TABLE_DATASET'
}

/** Where this data came from, as a discriminated union: `kind` selects which sort of source is being named, and only that member's id field is read -- any other is rejected. The member inputs annotated `@unionElementOf(union: "DerivedFromInput")` say which field each kind reads. Direction is always this data -> its source */
export type DerivedFromInput = {
  /** (ANNOTATION_COLLECTION) The annotation collection this data was computed from */
  annotationCollection?: InputMaybe<Scalars['ID']['input']>;
  /** (COORDINATE_SYSTEM) The space this data was computed from, when the source is a space rather than a container */
  coordinateSystem?: InputMaybe<Scalars['ID']['input']>;
  /** (DATASET) The dataset this data was computed from, through its whole sample grid */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  /** Which sort of thing the source is. It fixes which id field below is read; any other is rejected */
  kind: DerivationSourceKind;
  /** (LENS) The lens this data was computed from */
  lens?: InputMaybe<Scalars['ID']['input']>;
  /** How this data's own space maps back into the source's -- any creatable kind; the rank check holds you to it. **Omit it and the edge is UNMAPPABLE**: naming a source records the lineage and claims no correspondence, which is the truth for a per-unit summary whose values are not at any sample. State IDENTITY for an in-place operation (a zero-phase filter), TRANSLATION for a window or for a causal filter's group delay, SCALE for a decimation, BY_DIMENSION for a reduction that drops an axis (a mean over channels). Only a mappable edge carries placement: derived data sits where its source sits exactly when it says how */
  transform?: InputMaybe<TransformInput>;
  /** What the derivation did to the *values* -- orthogonal to the transform's `kind`, which only says where the data sits: IDENTICAL for a window or a stride decimation (statistics transfer), TRANSFORMED for a filter, a baseline subtraction or an anti-aliased decimation, CATEGORIZED for a threshold crossing or a spike sorting (values became labels). Omit when unstated; the algorithm itself belongs to task provenance */
  valueRelation?: InputMaybe<ValueRelation>;
};

export type DesociateInput = {
  other: Scalars['ID']['input'];
  selfs: Array<Scalars['ID']['input']>;
};

/** One hardware device's recorded state */
export type DeviceState = {
  __typename?: 'DeviceState';
  /** A free-form device kind, e.g. 'amplifier', 'digitizer', 'probe' */
  kind?: Maybe<Scalars['String']['output']>;
  /** The device's identity in the setup, e.g. 'multiclamp-700b-1' */
  label: Scalars['String']['output'];
  settings: Array<Setting>;
};

/** One hardware device's recorded state: its identity in the setup plus its settings at this coordinate */
export type DeviceStateInput = {
  /** A free-form device kind, e.g. 'amplifier', 'digitizer', 'probe' */
  kind?: InputMaybe<Scalars['String']['input']>;
  /** The device's identity in the setup, e.g. 'multiclamp-700b-1' */
  label: Scalars['String']['input'];
  settings?: Array<SettingInput>;
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

/** Events: a table dataset with a TIME coordinate column -- TTL edges, trials, stimulus onsets, Neo events and epochs -- drawn as a mark per row, or as an interval per row when `stopColumn` is set. The time column is the table's own declaration (`timeColumn`), never a per-layer copy; where the table sits on the timeline is the edge out of its space. Bulk and imported events; hand-drawn marks are an AnnotationLayer */
export type EventsLayer = ExperimentLayer & {
  __typename?: 'EventsLayer';
  /** Which entry of `colorBys` is drawn, as an index into it. Null draws every row in `color` */
  activeColorBy?: Maybe<Scalars['Int']['output']>;
  /** Which entries of `filterBys` apply, as indices into it. They combine with AND */
  activeFilterBys: Array<Scalars['Int']['output']>;
  /** This layer's whole `pathToWorld` composed into one affine map -- the same path, same edges, same order, with the flagged steps inverted. For a sampled recording or a spike raster it reads `t_world = sample * period + start`, the sampling law and every clock offset multiplied out. Derived on read and stored nowhere. **Null when `pathToWorld` is null.** It errors rather than returning null when a path exists but does not condense: a FIELD step (an irregularly sampled signal, a variable-step run) has no closed form, and the error names the transformation that stopped it. Pass `strict: true` to be refused a partial map instead of handed one */
  asAffine?: Maybe<AffinePlacement>;
  blending: Blending;
  /** The base colour as RGBA, 0-255. Null lets the viewer choose */
  color?: Maybe<Scalars['RGBAColor']['output']>;
  /** The colourings this layer offers: columns of the event table or of tables it references */
  colorBys: Array<ColorBy>;
  /** The colormap the active colour-by is drawn through */
  colormap?: Maybe<ColorMap>;
  experiment: Experiment;
  /** The filters this layer offers: columns of the event table or of tables it references */
  filterBys: Array<FilterBy>;
  id: Scalars['ID']['output'];
  kind: ExperimentLayerKind;
  /** A column naming each row, drawn beside its mark */
  labelColumn?: Maybe<Scalars['String']['output']>;
  /** A categorical column giving each distinct value its own lane. Null draws one lane */
  laneColumn?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  opacity: Scalars['Float']['output'];
  order: Scalars['Int']['output'];
  /** The path of transformation edges from this layer's source coordinate system to its experiment's world. A layer belongs to exactly one experiment, so this is the one 'to world' question with a single right answer -- the path uses the data's own facts (a lens shift, a sampling law or time lookup) plus the world's registrations and the clocks chained into it. Null when the layer is unregistered or has no source system; empty when the source already is the world. Every step is here in full, with its own validity, invariance and provenance; `asAffine` is the same path composed */
  pathToWorld?: Maybe<Array<PlacementStep>>;
  /** Whether this layer has a place on its experiment's timeline, and if not, why not. UNREGISTERED is a gap to close (nobody has related this data's clock to the world); UNMAPPABLE is a fact to badge; CONDITIONAL is a placement to ask again for with `at`. Derived, never stored */
  placement: PlacementState;
  /** Which geometric properties survive the whole walk from this layer's data to its experiment's world: the weakest edge on its path. AFFINE or stronger means a duration measured in samples is a duration on the timeline up to one factor; DIFFEOMORPHIC means the path crosses a time lookup; NONE means there is no path. Derived, never stored */
  placementInvariance: TransformInvariance;
  /** How much this layer's placement is actually known: the weakest edge on its path to world. INFERRED when it rests on a sampling law read from metadata, MANUAL once someone authored an offset, VALIDATED once it was checked, UNKNOWN when there is no path at all. Derived, never stored */
  placementValidity: PlacementValidity;
  /** A column whose values end each row's interval, in the time column's unit. Null draws instants */
  stopColumn?: Maybe<Scalars['String']['output']>;
  /** The event table this layer draws */
  tableDataset: TableDataset;
  /** The table's TIME coordinate column: where each row sits in the table's own space. Derived from the table's declaration, never stored per layer */
  timeColumn?: Maybe<Scalars['String']['output']>;
  visible: Scalars['Boolean']['output'];
};


/** Events: a table dataset with a TIME coordinate column -- TTL edges, trials, stimulus onsets, Neo events and epochs -- drawn as a mark per row, or as an interval per row when `stopColumn` is set. The time column is the table's own declaration (`timeColumn`), never a per-layer copy; where the table sits on the timeline is the edge out of its space. Bulk and imported events; hand-drawn marks are an AnnotationLayer */
export type EventsLayerAsAffineArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
  strict?: Scalars['Boolean']['input'];
};


/** Events: a table dataset with a TIME coordinate column -- TTL edges, trials, stimulus onsets, Neo events and epochs -- drawn as a mark per row, or as an interval per row when `stopColumn` is set. The time column is the table's own declaration (`timeColumn`), never a per-layer copy; where the table sits on the timeline is the edge out of its space. Bulk and imported events; hand-drawn marks are an AnnotationLayer */
export type EventsLayerPathToWorldArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** Events: a table dataset with a TIME coordinate column -- TTL edges, trials, stimulus onsets, Neo events and epochs -- drawn as a mark per row, or as an interval per row when `stopColumn` is set. The time column is the table's own declaration (`timeColumn`), never a per-layer copy; where the table sits on the timeline is the edge out of its space. Bulk and imported events; hand-drawn marks are an AnnotationLayer */
export type EventsLayerPlacementArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** Events: a table dataset with a TIME coordinate column -- TTL edges, trials, stimulus onsets, Neo events and epochs -- drawn as a mark per row, or as an interval per row when `stopColumn` is set. The time column is the table's own declaration (`timeColumn`), never a per-layer copy; where the table sits on the timeline is the edge out of its space. Bulk and imported events; hand-drawn marks are an AnnotationLayer */
export type EventsLayerPlacementInvarianceArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** Events: a table dataset with a TIME coordinate column -- TTL edges, trials, stimulus onsets, Neo events and epochs -- drawn as a mark per row, or as an interval per row when `stopColumn` is set. The time column is the table's own declaration (`timeColumn`), never a per-layer copy; where the table sits on the timeline is the edge out of its space. Bulk and imported events; hand-drawn marks are an AnnotationLayer */
export type EventsLayerPlacementValidityArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};

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
  /** The collection minted as this experiment's own drawing surface by `createAnnotation(experiment:)`, or null before anything was drawn on it. Its shapes are in the world's coordinates */
  annotationCollection?: Maybe<AnnotationCollection>;
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  /** What this experiment draws, top to bottom: traces, spike rasters, event tables and annotation collections. Each carries its own placement on the timeline, derived from the graph */
  layers: Array<ExperimentLayer>;
  name: Scalars['String']['output'];
  /** Is this experiment pinned by the current user */
  pinned: Scalars['Boolean']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  /** The space this experiment composes over: its timeline. Adopted, never owned -- several experiments may share one, and deleting an experiment never deletes it. Ask it for `registrations` (the clocks laid into it), `placedSystems` and `inView(region:)`; ask a layer for `pathToWorld` */
  world?: Maybe<CoordinateSystem>;
};


export type ExperimentLayersArgs = {
  filters?: InputMaybe<ExperimentLayerFilter>;
};


export type ExperimentProvenanceEntriesArgs = {
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
  world?: InputMaybe<Scalars['ID']['input']>;
};

/** One thing drawn in an experiment, alpha-blended over the layers below it. mikro's Layer, over time. It carries view state only: where its data sits on the timeline is a coordinate system and the edges out of it, and every placement question a layer answers -- `pathToWorld`, `placement`, `placementValidity`, `placementInvariance` -- is derived from the graph on read and stored nowhere, so correcting one sampling law moves every layer that looks through it. The concrete kind carries its own source and render settings: TraceLayer (a lens over an array dataset), SpikesLayer (a spike raster), EventsLayer (an event table), AnnotationLayer (hand-drawn marks) */
export type ExperimentLayer = {
  /** This layer's whole `pathToWorld` composed into one affine map -- the same path, same edges, same order, with the flagged steps inverted. For a sampled recording or a spike raster it reads `t_world = sample * period + start`, the sampling law and every clock offset multiplied out. Derived on read and stored nowhere. **Null when `pathToWorld` is null.** It errors rather than returning null when a path exists but does not condense: a FIELD step (an irregularly sampled signal, a variable-step run) has no closed form, and the error names the transformation that stopped it. Pass `strict: true` to be refused a partial map instead of handed one */
  asAffine?: Maybe<AffinePlacement>;
  blending: Blending;
  experiment: Experiment;
  id: Scalars['ID']['output'];
  kind: ExperimentLayerKind;
  name?: Maybe<Scalars['String']['output']>;
  opacity: Scalars['Float']['output'];
  order: Scalars['Int']['output'];
  /** The path of transformation edges from this layer's source coordinate system to its experiment's world. A layer belongs to exactly one experiment, so this is the one 'to world' question with a single right answer -- the path uses the data's own facts (a lens shift, a sampling law or time lookup) plus the world's registrations and the clocks chained into it. Null when the layer is unregistered or has no source system; empty when the source already is the world. Every step is here in full, with its own validity, invariance and provenance; `asAffine` is the same path composed */
  pathToWorld?: Maybe<Array<PlacementStep>>;
  /** Whether this layer has a place on its experiment's timeline, and if not, why not. UNREGISTERED is a gap to close (nobody has related this data's clock to the world); UNMAPPABLE is a fact to badge; CONDITIONAL is a placement to ask again for with `at`. Derived, never stored */
  placement: PlacementState;
  /** Which geometric properties survive the whole walk from this layer's data to its experiment's world: the weakest edge on its path. AFFINE or stronger means a duration measured in samples is a duration on the timeline up to one factor; DIFFEOMORPHIC means the path crosses a time lookup; NONE means there is no path. Derived, never stored */
  placementInvariance: TransformInvariance;
  /** How much this layer's placement is actually known: the weakest edge on its path to world. INFERRED when it rests on a sampling law read from metadata, MANUAL once someone authored an offset, VALIDATED once it was checked, UNKNOWN when there is no path at all. Derived, never stored */
  placementValidity: PlacementValidity;
  visible: Scalars['Boolean']['output'];
};


/** One thing drawn in an experiment, alpha-blended over the layers below it. mikro's Layer, over time. It carries view state only: where its data sits on the timeline is a coordinate system and the edges out of it, and every placement question a layer answers -- `pathToWorld`, `placement`, `placementValidity`, `placementInvariance` -- is derived from the graph on read and stored nowhere, so correcting one sampling law moves every layer that looks through it. The concrete kind carries its own source and render settings: TraceLayer (a lens over an array dataset), SpikesLayer (a spike raster), EventsLayer (an event table), AnnotationLayer (hand-drawn marks) */
export type ExperimentLayerAsAffineArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
  strict?: Scalars['Boolean']['input'];
};


/** One thing drawn in an experiment, alpha-blended over the layers below it. mikro's Layer, over time. It carries view state only: where its data sits on the timeline is a coordinate system and the edges out of it, and every placement question a layer answers -- `pathToWorld`, `placement`, `placementValidity`, `placementInvariance` -- is derived from the graph on read and stored nowhere, so correcting one sampling law moves every layer that looks through it. The concrete kind carries its own source and render settings: TraceLayer (a lens over an array dataset), SpikesLayer (a spike raster), EventsLayer (an event table), AnnotationLayer (hand-drawn marks) */
export type ExperimentLayerPathToWorldArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** One thing drawn in an experiment, alpha-blended over the layers below it. mikro's Layer, over time. It carries view state only: where its data sits on the timeline is a coordinate system and the edges out of it, and every placement question a layer answers -- `pathToWorld`, `placement`, `placementValidity`, `placementInvariance` -- is derived from the graph on read and stored nowhere, so correcting one sampling law moves every layer that looks through it. The concrete kind carries its own source and render settings: TraceLayer (a lens over an array dataset), SpikesLayer (a spike raster), EventsLayer (an event table), AnnotationLayer (hand-drawn marks) */
export type ExperimentLayerPlacementArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** One thing drawn in an experiment, alpha-blended over the layers below it. mikro's Layer, over time. It carries view state only: where its data sits on the timeline is a coordinate system and the edges out of it, and every placement question a layer answers -- `pathToWorld`, `placement`, `placementValidity`, `placementInvariance` -- is derived from the graph on read and stored nowhere, so correcting one sampling law moves every layer that looks through it. The concrete kind carries its own source and render settings: TraceLayer (a lens over an array dataset), SpikesLayer (a spike raster), EventsLayer (an event table), AnnotationLayer (hand-drawn marks) */
export type ExperimentLayerPlacementInvarianceArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** One thing drawn in an experiment, alpha-blended over the layers below it. mikro's Layer, over time. It carries view state only: where its data sits on the timeline is a coordinate system and the edges out of it, and every placement question a layer answers -- `pathToWorld`, `placement`, `placementValidity`, `placementInvariance` -- is derived from the graph on read and stored nowhere, so correcting one sampling law moves every layer that looks through it. The concrete kind carries its own source and render settings: TraceLayer (a lens over an array dataset), SpikesLayer (a spike raster), EventsLayer (an event table), AnnotationLayer (hand-drawn marks) */
export type ExperimentLayerPlacementValidityArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};

export type ExperimentLayerFilter = {
  AND?: InputMaybe<ExperimentLayerFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<ExperimentLayerFilter>;
  OR?: InputMaybe<ExperimentLayerFilter>;
  /** Filter to the layers drawing this array dataset, through any of its lenses */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  /** Filter to the layers of this experiment */
  experiment?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by how the layer draws: TRACE, SPIKES, EVENTS or ANNOTATION */
  kind?: InputMaybe<ExperimentLayerKind>;
  name?: InputMaybe<StrFilterLookup>;
  /** Filter by whether the layer is shown */
  visible?: InputMaybe<Scalars['Boolean']['input']>;
};

/** How a layer of an experiment draws its data: what kind of source it has and what it renders. mikro's LayerKind, for time series */
export enum ExperimentLayerKind {
  /** An annotation collection: hand-drawn marks, drawn in the space the collection owns. */
  Annotation = 'ANNOTATION',
  /** A table dataset with a TIME coordinate column -- TTL edges, trials, stimuli, Neo events and epochs -- drawn as a mark per row, or an interval when a stop column is named. */
  Events = 'EVENTS',
  /** A sparse dataset with a TIME axis -- a spike raster, units by samples -- drawn as a tick per nonzero and a row per unit. Colour and order come from the table identifying its unit axis. */
  Spikes = 'SPIKES',
  /** A lens over an array dataset -- a recording, a stimulus, an analog or irregularly sampled signal alike -- drawn as a line per channel. Its window is the lens' slices. */
  Trace = 'TRACE'
}

export type ExperimentLayerOrder =
  { id: Ordering; order?: never; }
  |  { id?: never; order: Ordering; };

export type ExperimentOrder =
  { createdAt: Ordering; id?: never; }
  |  { createdAt?: never; id: Ordering; };

/** What `createExperimentFromCoordinateSystem` stages. mikro's ScenePolicyInput, for time series */
export type ExperimentPolicyInput = {
  includeAnnotations?: Scalars['Boolean']['input'];
  includeEvents?: Scalars['Boolean']['input'];
  includeSpikes?: Scalars['Boolean']['input'];
  includeTraces?: Scalars['Boolean']['input'];
  nchildren?: Scalars['Int']['input'];
  skipUnplaceable?: Scalars['Boolean']['input'];
};

/** The container this file was written from, as a discriminated union: `kind` selects which sort of container is being named, and only that member's id field is read -- any other is rejected. The member inputs annotated `@unionElementOf(union: "ExportOfInput")` say which field each kind reads. Direction is always this file -> the data it was written from */
export type ExportOfInput = {
  /** (ANNOTATION_COLLECTION) The annotation collection this file was written from */
  annotationCollection?: InputMaybe<Scalars['ID']['input']>;
  /** (DATASET) The array dataset this file was written from */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  /** Which sort of thing the container is. It fixes which id field below is read; any other is rejected */
  kind: FileLinkContainerKind;
  /** Which part of the file this concerns -- the series of a multi-series ABF or NWB file, the sweep group of a recording. Omit when the file holds one thing. It is part of the link's identity, not a label on it: one dataset fused from two series of one file is two links, and two links naming the same file and the same series are refused */
  seriesIdentifier?: InputMaybe<Scalars['String']['input']>;
  /** (SPARSE_DATASET) The sparse dataset this file was written from */
  sparseDataset?: InputMaybe<Scalars['ID']['input']>;
  /** (TABLE_DATASET) The table dataset this file was written from */
  tableDataset?: InputMaybe<Scalars['ID']['input']>;
  /** What the conversion did to the *values*: IDENTICAL for a lossless transcode (an ABF to a Zarr, a dataset to an NWB file), TRANSFORMED for a filtered or resampled export, CATEGORIZED when the values became labels. Omit when unstated; the converter and its parameters belong to task provenance */
  valueRelation?: InputMaybe<ValueRelation>;
};

/** Whether the server can state where a source sits in a space, and if not, why not. Derived, never stored. */
export enum ExtentState {
  /** The source reaches this space only across a selector-scoped edge — a per-channel or per-timepoint correction — so where it sits depends on a coordinate this query did not fix. The source is returned, because it genuinely is in the space; `extent` is empty because there is no single box, not because none could be computed. Ask again with `at` to get one. */
  Conditional = 'CONDITIONAL',
  /** The path walks an edge against its stored direction, and the extent walk composes forward only -- it pushes a box, and re-bounding one through an inverted step is a different calculation. The step *is* invertible: a placement search offers a backwards step only for a map that has an inverse, which is why `Layer.asAffine` composes such a path without difficulty. So compose `path` yourself, inverting the flagged step, or read the layer's `asAffine`. */
  Inverted = 'INVERTED',
  /** The extent is stated, over the axes it names and only those. */
  Known = 'KNOWN',
  /** A FIELD edge on the path gives the map as the values of an array rather than as a formula, so there is no closed form to push a box through. The path is real and is returned; `invariance` reads DIFFEOMORPHIC. */
  NonAffine = 'NON_AFFINE',
  /** The source's geometry is not something the server holds: a mesh collection's vertices and a table dataset's rows live in Parquet it never opens. `extent` is null because there is no box to push, not because the path failed -- and the source is returned anyway, because refusing to bound something is not the same as knowing it is out of view. */
  Unreadable = 'UNREADABLE'
}

/** The fields a FIELD member of TransformInput reads. Published for codegen; the wire type is the flat TransformInput */
export type FieldTransformInput = {
  field: Scalars['ID']['input'];
  inputAxes: Array<Scalars['String']['input']>;
  kind?: CreatableTransformKind;
  outputAxes: Array<Scalars['String']['input']>;
};

/** A non-affine map given by the values of an array rather than by a formula. The array is a `field`: a node of this graph, not a payload on this edge, so it keeps its own lineage and its axes say what its numbers mean. It has no closed-form inverse, so a placement path never walks it backwards */
export type FieldTransformation = Transformation & {
  __typename?: 'FieldTransformation';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  /** The coordinate system of the array whose values are this map. Its value axis says what they mean: COORDINATE for absolute positions, DISPLACEMENT for offsets, none at all for a scalar array whose single value is a position. Equal to `input` when the array's own pixels are the map, as for a label mask keying a table of objects */
  field?: Maybe<CoordinateSystem>;
  id: Scalars['ID']['output'];
  input?: Maybe<CoordinateSystem>;
  /** The names of the input axes this edge's parameters are ordered by. `scale`, `translation` and the columns of `affine` follow this order -- which is the input system's axis order, NOT the reading layer's axis names, and the two differ often enough that indexing the arrays against them silently misplaces them. A BY_DIMENSION edge names only the subset of axes it acts on; the axes it does not name are the ones it leaves untouched */
  inputAxes: Array<Scalars['String']['output']>;
  /** Which geometric properties survive this edge's map, derived from `kind`: ISOMETRY (distances, angles and areas all transfer), SIMILARITY (angles and length ratios transfer, absolute lengths scale by one common factor), AFFINE (parallelism and area ratios transfer, angles and distances do not), DIFFEOMORPHIC (topology at best, and only locally -- the Jacobian varies with position), NONE (nothing corresponds). A SEQUENCE or BY_DIMENSION is the weakest of its children. Stated by kind, never by inspecting the numbers: an AFFINE edge reads AFFINE even when its matrix happens to be rigid, because separating those needs an SVD. A layer's `placementInvariance` is the minimum of this over its whole path to world */
  invariance: TransformInvariance;
  kind: TransformKind;
  name?: Maybe<Scalars['String']['output']>;
  output?: Maybe<CoordinateSystem>;
  /** The names of the output axes this edge produces. For a rank-changing BY_DIMENSION edge (placing a (c,y,x) dataset into a (t,z,y,x) world) this is the subset it maps onto; the world's other axes are untouched */
  outputAxes: Array<Scalars['String']['output']>;
  /** Provenance entries for this edge: who authored it, and every refinement since. A refinement rewrites the edge in place, so this audit trail is where the placement's earlier states live -- and counting these rows along a chain is what `CoordinateSystem.transformVersion` reports */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Where along one axis this edge applies, or null for an edge that holds everywhere -- which is almost every edge. A per-channel correction is scoped to {axis: "c", index: 2}; several such edges over one axis are one piecewise map. A path query crosses a scoped edge only when it fixes that coordinate with `at` */
  selector?: Maybe<Selector>;
  /** How much this map is actually known: VALIDATED for a map the server derived (or one someone checked), INFERRED for numbers read from metadata, MANUAL for an authored registration, UNKNOWN for one its author marked as a guess. A layer's validity is the weakest edge on its path to world */
  validity: PlacementValidity;
  /** (derivation edges) What the operation this edge records did to the *values*, orthogonal to `kind`: IDENTICAL (a crop -- statistics transfer), TRANSFORMED (a deconvolution -- same quantity, new numbers), CATEGORIZED (a threshold -- values became labels, and a bootstrapped scene renders the data as a label map). Null when unstated, and never present on a registration -- values do not cross a claim between spaces */
  valueRelation?: Maybe<ValueRelation>;
  /** How many times this edge has been written, counting the row that created it -- so a new edge reads 1. Only comparison is meaningful: this and the edge's `id` together are the cache key for anything derived from the edge, and a change means refetch. It counts the same provenance rows `provenanceEntries` lists, so the audit trail and the token cannot disagree; a rename moves it too, which errs towards refetching something that did not change rather than trusting something that did */
  version: Scalars['Int']['output'];
};


/** A non-affine map given by the values of an array rather than by a formula. The array is a `field`: a node of this graph, not a payload on this edge, so it keeps its own lineage and its axes say what its numbers mean. It has no closed-form inverse, so a placement path never walks it backwards */
export type FieldTransformationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A file in its original format (e.g. an ABF, an NWB file, a vendor recording), stored in a BigFileStore. Files are the raw bytes that array datasets are converted from. */
export type File = {
  __typename?: 'File';
  /** The content type of the file */
  contentType?: Maybe<Scalars['String']['output']>;
  /** The task this file was created through, if any */
  createdThrough?: Maybe<Task>;
  /** The assigner of the creating task, if any */
  createdThroughBy?: Maybe<User>;
  /** The user who created this file */
  creator: User;
  /** The containers converted out of this file: the datasets a converter wrote from it, one per series. **Not a derivation** -- a file has no coordinate system, so these links claim no geometry and place nothing; they say only that this file's bytes and that data are the same thing */
  derivedContainers: Array<FileLink>;
  /** The containers this file was written from: the dataset exported to NWB, the annotation collection written to a CSV of events. The mirror of `derivedContainers` */
  exportedFrom: Array<FileLink>;
  /** The folder this file is filed in */
  folder?: Maybe<Folder>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** The organization this file belongs to */
  organization: Organization;
  /** Provenance entries for this file */
  provenanceEntries: Array<ProvenanceEntry>;
  /** The size of the file in bytes */
  size?: Maybe<Scalars['Float']['output']>;
  store: BigFileStore;
};


/** A file in its original format (e.g. an ABF, an NWB file, a vendor recording), stored in a BigFileStore. Files are the raw bytes that array datasets are converted from. */
export type FileDerivedContainersArgs = {
  filters?: InputMaybe<FileLinkFilter>;
};


/** A file in its original format (e.g. an ABF, an NWB file, a vendor recording), stored in a BigFileStore. Files are the raw bytes that array datasets are converted from. */
export type FileExportedFromArgs = {
  filters?: InputMaybe<FileLinkFilter>;
};


/** A file in its original format (e.g. an ABF, an NWB file, a vendor recording), stored in a BigFileStore. Files are the raw bytes that array datasets are converted from. */
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
  /** Filter by the sub of the user that assigned the creating task */
  assignedBy?: InputMaybe<Scalars['ID']['input']>;
  contentType?: InputMaybe<StrFilterLookup>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by the database ID of the task the item was created through (the `createdThrough { id }` field) */
  createdThrough?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the database ID of the user that assigned the creating task (the `createdThroughBy { id }` field) */
  createdThroughBy?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the rekuest task id the item was created through */
  createdThroughTask?: InputMaybe<Scalars['String']['input']>;
  /** Filter to the files written out of this container -- the NWB file a dataset was exported to. The opposite direction from `sourceOf` */
  exportedFrom?: InputMaybe<FileLinkContainerRef>;
  /** Filter by file extension, case-insensitively and with the leading dot optional: `abf`, `.abf` and `ABF` are the same request. A normalizing convenience over `name: {iEndsWith: ".abf"}`, which is still there if you want the raw lookup */
  extension?: InputMaybe<Scalars['String']['input']>;
  /** Filter by the folder this file belongs to */
  folder?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by a list of folder IDs */
  folders?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by whether the file's bytes ever arrived: false finds the `File` rows whose upload was granted and never completed, which carry no store at all */
  hasStore?: InputMaybe<Scalars['Boolean']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter to the files linked to this container in *either* direction: read into it or written out of it. Use `sourceOf` or `exportedFrom` when the direction matters */
  linkedTo?: InputMaybe<FileLinkContainerRef>;
  /** Filter to the files holding one sort of thing. Derived from the extension at query time and stored nowhere -- see `FileMimeGroup`, which explains why this reads the name rather than `contentType`. A curated list, so treat it as a picker convenience and filter on `name` or `contentType` when you need an exact answer */
  mimeGroup?: InputMaybe<FileMimeGroup>;
  name?: InputMaybe<StrFilterLookup>;
  /** Filter for files nothing was exported into: the raw sources a converter read, as opposed to the files written out of data already here. Reads the file's links, which replaced the `origins` M2M -- that column was never written by any resolver, so this filter used to answer `true` for every file in the database */
  notDerived?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by the creator's subject ID */
  owner?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by whether the upload completed. **Implies a store**: a file with no store at all is `hasStore: false`, not `populated: false`, so the two are not complementary and combining `hasStore: false` with `populated: false` matches nothing */
  populated?: InputMaybe<Scalars['Boolean']['input']>;
  /** Search by name (case-insensitive substring) */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Filter to files linked under this series of a multi-series file -- 'series-3' of an NWB file. Matches on any link, in either direction */
  seriesIdentifier?: InputMaybe<Scalars['String']['input']>;
  size?: InputMaybe<IntFilterLookup>;
  /** Filter to the files this container was produced from -- the ABF a converter read to write its arrays. The file-side mirror of `ArrayDatasetFilter.sourceFile`, and the reason this takes a `{kind, id}` rather than a bare ID: dataset 3 and annotation collection 3 both exist, so an unqualified id could not say which was meant */
  sourceOf?: InputMaybe<FileLinkContainerRef>;
  /** Filter for files no data references at all -- the uploads nothing was ever converted from and nothing was ever written into. The orphans, in other words: what a cleanup view wants. `notDerived` is the weaker question (nothing was *exported* into it), so every unlinked file is also notDerived, and not the reverse */
  unlinked?: InputMaybe<Scalars['Boolean']['input']>;
};

/** A file and a container holding the same data, and which of the two was made from the other. **Not a derivation**: `derivedFrom` states how one space maps into another, and a file has no space, so this claims no geometry and no placement -- only that these bytes and this data are the same thing */
export type FileLink = {
  __typename?: 'FileLink';
  /** The data side of the link. Exactly one container is set on a link, and this is it */
  container: FileLinkContainer;
  createdAt: Scalars['DateTime']['output'];
  /** The task this link was created through, if any */
  createdThrough?: Maybe<Task>;
  /** The assigner of the creating task, if any */
  createdThroughBy?: Maybe<User>;
  /** The user who recorded this link */
  creator?: Maybe<User>;
  /** Which side was made from the other: SOURCE when the container was produced from the file (an ingest), RENDITION when the file was written from the container (an export) */
  direction: FileLinkDirection;
  /** The file side of the link */
  file: File;
  id: Scalars['ID']['output'];
  /** The organization this link belongs to */
  organization: Organization;
  /** Provenance entries for this link */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Which part of the file this link concerns -- the series of a multi-series ABF or NWB file. Empty when the file holds one thing. Part of the link's identity, so a dataset fused from two series of one file has two links */
  seriesIdentifier?: Maybe<Scalars['String']['output']>;
  /** What the conversion did to the values: IDENTICAL for a lossless transcode, TRANSFORMED for a filtered or resampled export. Null when unstated */
  valueRelation?: Maybe<ValueRelation>;
};


/** A file and a container holding the same data, and which of the two was made from the other. **Not a derivation**: `derivedFrom` states how one space maps into another, and a file has no space, so this claims no geometry and no placement -- only that these bytes and this data are the same thing */
export type FileLinkProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** The data side of a file link: a container whose contents a file encodes */
export type FileLinkContainer = AnnotationCollection | ArrayDataset | SparseDataset | TableDataset;

/** Which sort of container a file link names: the discriminator of `ExportOfInput`. Only the two containers that hold data a file can be written from or read into -- a lens is a selection over a dataset rather than a thing with its own bytes, and a coordinate system is a space, which no file encodes */
export enum FileLinkContainerKind {
  /** An annotation collection, the container hand-drawn marks are loaded into. */
  AnnotationCollection = 'ANNOTATION_COLLECTION',
  /** An array dataset -- the container an ABF or NWB file is converted into, and the one an export is written from. */
  Dataset = 'DATASET',
  /** A sparse dataset, the container a spike sorter's output is read into -- one raster of units by samples. */
  SparseDataset = 'SPARSE_DATASET',
  /** A table dataset, the container a CSV or parquet file is loaded into: an event list, a trial table, a sorter's unit table. */
  TableDataset = 'TABLE_DATASET'
}

/** One container a file link points at: `kind` says which sort of thing it is, `id` says which one. Structured rather than a bare ID because a link can name two different kinds of container and their ids are drawn from separate sequences -- dataset 3 and annotation collection 3 both exist, and an unqualified 3 could not choose */
export type FileLinkContainerRef = {
  /** The container's ID, in the sequence its `kind` names */
  id: Scalars['ID']['input'];
  /** Which sort of container. It fixes which column the filter reads */
  kind: FileLinkContainerKind;
};

/** Which side of a file link was made from the other. A file is a store, not a container -- it has no coordinate system -- so this relates bytes to data rather than two spaces, and it is deliberately not a `DerivedFromInput` kind. Direction has to be stated because nothing else records which side existed first */
export enum FileLinkDirection {
  /** The file was produced from the container: a dataset written out as OME-TIFF, a mesh exported to STL. This is the export direction, and the container existed first. */
  Rendition = 'RENDITION',
  /** The container was produced from the file: a CZI a converter read to write a Zarr dataset, a CSV a table was loaded from. This is the ingest direction, and the file existed first. */
  Source = 'SOURCE'
}

export type FileLinkFilter = {
  AND?: InputMaybe<FileLinkFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<FileLinkFilter>;
  OR?: InputMaybe<FileLinkFilter>;
  /** Filter by the sub of the user that assigned the creating task */
  assignedBy?: InputMaybe<Scalars['ID']['input']>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by the database ID of the task the item was created through (the `createdThrough { id }` field) */
  createdThrough?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the database ID of the user that assigned the creating task (the `createdThroughBy { id }` field) */
  createdThroughBy?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the rekuest task id the item was created through */
  createdThroughTask?: InputMaybe<Scalars['String']['input']>;
  direction?: InputMaybe<FileLinkDirection>;
  /** Filter by the file side of the link */
  file?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter by the creator's subject ID */
  owner?: InputMaybe<Scalars['ID']['input']>;
  seriesIdentifier?: InputMaybe<StrFilterLookup>;
  valueRelation?: InputMaybe<ValueRelation>;
};

export type FileLinkOrder =
  { createdAt: Ordering; direction?: never; id?: never; }
  |  { createdAt?: never; direction: Ordering; id?: never; }
  |  { createdAt?: never; direction?: never; id: Ordering; };

/** A coarse bucket for what sort of thing a file holds, for a picker that wants "just the recordings". **Derived at query time from the file's extension, never stored** -- so it cannot drift from the file it describes, and it is a filter only. Classified by extension rather than by `contentType` on purpose: an ABF or a vendor recording is uploaded as `application/octet-stream`, so a content-type rule would file every one of them under OTHER, which is precisely the case worth finding. `contentType` is the fallback when the extension is unknown. It is a curated list, not an authority: filter on `name` or `contentType` directly when you need an exact answer */
export enum FileMimeGroup {
  /** Containers of other files: zip, tar, gz, 7z. A zipped acquisition is an ARCHIVE, not a RECORDING -- the extension is all this reads. */
  Archive = 'ARCHIVE',
  /** Human-readable notes and reports: pdf, txt, md, docx. */
  Document = 'DOCUMENT',
  /** Model and morphology sources: hoc, mod, swc, asc, nml. */
  Model = 'MODEL',
  /** Nothing the curated list recognizes, and no usable `contentType`. Includes every file with no extension at all. */
  Other = 'OTHER',
  /** Electrophysiology acquisition formats: abf, nwb, smr, wcp, dat, plx, nev/nsX, rhd, edf, and the generic containers recordings ship in (h5, mat). */
  Recording = 'RECORDING',
  /** Tabular data: csv, tsv, parquet, feather, xlsx. */
  Table = 'TABLE'
}

export type FileOrder =
  { contentType: Ordering; createdAt?: never; id?: never; name?: never; size?: never; }
  |  { contentType?: never; createdAt: Ordering; id?: never; name?: never; size?: never; }
  |  { contentType?: never; createdAt?: never; id: Ordering; name?: never; size?: never; }
  |  { contentType?: never; createdAt?: never; id?: never; name: Ordering; size?: never; }
  |  { contentType?: never; createdAt?: never; id?: never; name?: never; size: Ordering; };

/** One entry of a spikes or events layer's filter picker: a column of a table the layer's rows reach, and which of its values to keep (or, with `exclude`, drop). mikro's COLUMN filter-by, field for field */
export type FilterBy = {
  __typename?: 'FilterBy';
  column: Scalars['String']['output'];
  exclude: Scalars['Boolean']['output'];
  joinPath: Array<JoinStep>;
  kind: Scalars['String']['output'];
  label?: Maybe<Scalars['String']['output']>;
  max?: Maybe<Scalars['Float']['output']>;
  min?: Maybe<Scalars['Float']['output']>;
  table: Scalars['ID']['output'];
  values?: Maybe<Array<Scalars['String']['output']>>;
};

/** One filter picker entry to store: a column of a table the layer reaches, and the range or values to keep */
export type FilterByInput = {
  column: Scalars['String']['input'];
  exclude?: Scalars['Boolean']['input'];
  joinPath?: InputMaybe<Array<JoinStepInput>>;
  label?: InputMaybe<Scalars['String']['input']>;
  max?: InputMaybe<Scalars['Float']['input']>;
  min?: InputMaybe<Scalars['Float']['input']>;
  table: Scalars['ID']['input'];
  values?: InputMaybe<Array<Scalars['String']['input']>>;
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

export type FinishSparseUploadInput = {
  storeId: Scalars['String']['input'];
  valid?: Scalars['Boolean']['input'];
};

export type FinishZarrUploadInput = {
  storeId: Scalars['String']['input'];
  valid?: Scalars['Boolean']['input'];
};

/** A folder is a collection of the things elektro stores. It mimics a folder in a file system and is the top-level container for organising data. */
export type Folder = {
  __typename?: 'Folder';
  /** The annotation collections filed in this folder */
  annotationCollections: Array<AnnotationCollection>;
  /** The array datasets filed in this folder */
  arrayDatasets: Array<ArrayDataset>;
  children: Array<Folder>;
  createdAt: Scalars['DateTime']['output'];
  /** The task this folder was created through, if any */
  createdThrough?: Maybe<Task>;
  /** The assigner of the creating task, if any */
  createdThroughBy?: Maybe<User>;
  creator?: Maybe<User>;
  description?: Maybe<Scalars['String']['output']>;
  files: Array<File>;
  id: Scalars['ID']['output'];
  isDefault: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  parent?: Maybe<Folder>;
  pinned: Scalars['Boolean']['output'];
  /** Provenance entries for this folder */
  provenanceEntries: Array<ProvenanceEntry>;
  /** The sparse datasets (spike rasters) filed in this folder */
  sparseDatasets: Array<SparseDataset>;
  /** The table datasets (event lists, unit tables) filed in this folder */
  tableDatasets: Array<TableDataset>;
  tags: Array<Scalars['String']['output']>;
};


/** A folder is a collection of the things elektro stores. It mimics a folder in a file system and is the top-level container for organising data. */
export type FolderAnnotationCollectionsArgs = {
  filters?: InputMaybe<AnnotationCollectionFilter>;
  ordering?: Array<AnnotationCollectionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A folder is a collection of the things elektro stores. It mimics a folder in a file system and is the top-level container for organising data. */
export type FolderArrayDatasetsArgs = {
  filters?: InputMaybe<ArrayDatasetFilter>;
  ordering?: Array<ArrayDatasetOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A folder is a collection of the things elektro stores. It mimics a folder in a file system and is the top-level container for organising data. */
export type FolderChildrenArgs = {
  filters?: InputMaybe<FolderFilter>;
  ordering?: Array<FolderOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A folder is a collection of the things elektro stores. It mimics a folder in a file system and is the top-level container for organising data. */
export type FolderFilesArgs = {
  filters?: InputMaybe<FileFilter>;
  ordering?: Array<FileOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A folder is a collection of the things elektro stores. It mimics a folder in a file system and is the top-level container for organising data. */
export type FolderProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A folder is a collection of the things elektro stores. It mimics a folder in a file system and is the top-level container for organising data. */
export type FolderSparseDatasetsArgs = {
  filters?: InputMaybe<SparseDatasetFilter>;
  ordering?: Array<SparseDatasetOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A folder is a collection of the things elektro stores. It mimics a folder in a file system and is the top-level container for organising data. */
export type FolderTableDatasetsArgs = {
  filters?: InputMaybe<TableDatasetFilter>;
  ordering?: Array<TableDatasetOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Anything filed in a folder: a sub-folder, a file, an array dataset, a table dataset, a sparse dataset, or an annotation collection */
export type FolderChild = AnnotationCollection | ArrayDataset | File | Folder | SparseDataset | TableDataset;

export type FolderChildrenFilter = {
  search?: InputMaybe<Scalars['String']['input']>;
  showChildren?: InputMaybe<Scalars['Boolean']['input']>;
};

export type FolderFilter = {
  AND?: InputMaybe<FolderFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<FolderFilter>;
  OR?: InputMaybe<FolderFilter>;
  /** Filter by the sub of the user that assigned the creating task */
  assignedBy?: InputMaybe<Scalars['ID']['input']>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by the database ID of the task the item was created through (the `createdThrough { id }` field) */
  createdThrough?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the database ID of the user that assigned the creating task (the `createdThroughBy { id }` field) */
  createdThroughBy?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the rekuest task id the item was created through */
  createdThroughTask?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<StrFilterLookup>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  isDefault?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<StrFilterLookup>;
  /** Filter by the creator's subject ID */
  owner?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the parent folder (list the children of a folder) */
  parent?: InputMaybe<Scalars['ID']['input']>;
  /** Filter for folders with (true) or without (false) a parent */
  parentless?: InputMaybe<Scalars['Boolean']['input']>;
  /** Filter by whether the current user has pinned the item */
  pinned?: InputMaybe<Scalars['Boolean']['input']>;
  search?: InputMaybe<Scalars['String']['input']>;
  /** Filter by tag names */
  tags?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type FolderOrder =
  { createdAt: Ordering; id?: never; name?: never; }
  |  { createdAt?: never; id: Ordering; name?: never; }
  |  { createdAt?: never; id?: never; name: Ordering; };

/** Input for creating a file record from an uploaded big-file store */
export type FromFileLike = {
  /** The containers this file was written from */
  exportOf?: InputMaybe<Array<ExportOfInput>>;
  /** The uploaded big-file store to create the file from */
  file: Scalars['FileLike']['input'];
  /** The name of the file */
  fileName: Scalars['String']['input'];
  /** The ID of the folder to put the file in (defaults to the current default folder) */
  folder?: InputMaybe<Scalars['ID']['input']>;
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

/** Temporary S3 credentials for reading the organization's sparse stores. */
export type GeneralSparseAccessGrant = {
  __typename?: 'GeneralSparseAccessGrant';
  accessKey: Scalars['String']['output'];
  bucket: Scalars['String']['output'];
  expiresIn: Scalars['Int']['output'];
  region: Scalars['String']['output'];
  secretKey: Scalars['String']['output'];
  sessionToken: Scalars['String']['output'];
  status: Scalars['String']['output'];
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

/** The type of change that was made. */
export enum HistoryKind {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

export type IdFilterLookup = {
  contains?: InputMaybe<Scalars['ID']['input']>;
  endsWith?: InputMaybe<Scalars['ID']['input']>;
  exact?: InputMaybe<Scalars['ID']['input']>;
  gt?: InputMaybe<Scalars['ID']['input']>;
  gte?: InputMaybe<Scalars['ID']['input']>;
  iContains?: InputMaybe<Scalars['ID']['input']>;
  iEndsWith?: InputMaybe<Scalars['ID']['input']>;
  iExact?: InputMaybe<Scalars['ID']['input']>;
  iRegex?: InputMaybe<Scalars['String']['input']>;
  iStartsWith?: InputMaybe<Scalars['ID']['input']>;
  inList?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNull?: InputMaybe<Scalars['Boolean']['input']>;
  lt?: InputMaybe<Scalars['ID']['input']>;
  lte?: InputMaybe<Scalars['ID']['input']>;
  range?: InputMaybe<Array<Scalars['ID']['input']>>;
  regex?: InputMaybe<Scalars['String']['input']>;
  startsWith?: InputMaybe<Scalars['ID']['input']>;
};

/** What a column's values or an axis' positions **are**, as a discriminated union: `kind` selects which sort of thing is being named, and only that member's id field is read -- any other is rejected. Carried by a sparse dataset's axes and by a table's columns alike -- the one spelling of every 'values here identify things there' claim. `DATASET` authors a FIELD edge from the source into this data, which is also what makes it reachable from a layer over that source (INDEX axes only -- the edge produces an axis); `TABLE` authors no edge and states a foreign key instead, on an INDEX axis or a plain data column */
export type IdentificationInput = {
  /** (DATASET) The label dataset whose pixel values are the positions along this axis. Its own pixel grid is both the edge's input and its field, which is what a label mask is */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  /** Which sort of thing identifies this column or axis. It fixes which id field below is read; any other is rejected */
  kind: IdentificationKind;
  /** What to call the edge this authors, in a graph a person has to read. Defaults to `<source> -> <dataset>`. Only meaningful for the kinds that author one */
  name?: InputMaybe<Scalars['String']['input']>;
  /** (TABLE) The table whose rows this column's values are -- an INDEX axis' enumeration, or a plain data column's foreign key (an `instance_id` referencing a table of tracks: the edge of the join graph `colorBys` walks). Must be keyed by exactly one INDEX coordinate column, which is where a value is looked up -- the contract `Column.references` records. A matrix with 19 059 features costs one picker entry because of this, not 19 059 */
  table?: InputMaybe<Scalars['ID']['input']>;
  /** How far the edge this authors may be trusted. Only meaningful for the kinds that author one */
  validity?: InputMaybe<PlacementValidity>;
};

/** How one axis is identified -- the discriminator of `IdentificationInput`, and the same question whether the axis belongs to a sparse matrix or to a table. An axis of positions means nothing until something says what those positions *are*, and in this service there are two ways to answer (mikro has five; its mesh and network collections have no counterpart here). `DATASET` authors a FIELD edge, which is also what makes the data reachable from a layer over that source; `TABLE` authors none -- a table states a foreign key */
export enum IdentificationKind {
  /** A label mask, through its intrinsic pixel grid: its pixel values are the positions along this axis. Authors a FIELD edge, so it is also what makes the data reachable from a layer over that mask. */
  Dataset = 'DATASET',
  /** A table whose rows this axis' positions are -- the relation `Column.references` carries, said of the axis. Authors no edge and touches no coordinate system: a table is already in record-land, where the relation is a foreign key rather than a map between spaces. It is what lets a FIELD edge land beside it, because an axis identified this way is one the edge is not expected to supply. Valid on an INDEX axis only: a SPACE or TIME coordinate's values are positions, and a position in nanometres and a row id are different things. */
  Table = 'TABLE'
}

/** The fields an IDENTITY member of TransformInput reads -- only the discriminator, the map having no parameters. Published for codegen; the wire type is the flat TransformInput */
export type IdentityTransformInput = {
  kind?: CreatableTransformKind;
};

/** The identity map: input and output coordinates are the same */
export type IdentityTransformation = Transformation & {
  __typename?: 'IdentityTransformation';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  input?: Maybe<CoordinateSystem>;
  /** The names of the input axes this edge's parameters are ordered by. `scale`, `translation` and the columns of `affine` follow this order -- which is the input system's axis order, NOT the reading layer's axis names, and the two differ often enough that indexing the arrays against them silently misplaces them. A BY_DIMENSION edge names only the subset of axes it acts on; the axes it does not name are the ones it leaves untouched */
  inputAxes: Array<Scalars['String']['output']>;
  /** Which geometric properties survive this edge's map, derived from `kind`: ISOMETRY (distances, angles and areas all transfer), SIMILARITY (angles and length ratios transfer, absolute lengths scale by one common factor), AFFINE (parallelism and area ratios transfer, angles and distances do not), DIFFEOMORPHIC (topology at best, and only locally -- the Jacobian varies with position), NONE (nothing corresponds). A SEQUENCE or BY_DIMENSION is the weakest of its children. Stated by kind, never by inspecting the numbers: an AFFINE edge reads AFFINE even when its matrix happens to be rigid, because separating those needs an SVD. A layer's `placementInvariance` is the minimum of this over its whole path to world */
  invariance: TransformInvariance;
  kind: TransformKind;
  name?: Maybe<Scalars['String']['output']>;
  output?: Maybe<CoordinateSystem>;
  /** The names of the output axes this edge produces. For a rank-changing BY_DIMENSION edge (placing a (c,y,x) dataset into a (t,z,y,x) world) this is the subset it maps onto; the world's other axes are untouched */
  outputAxes: Array<Scalars['String']['output']>;
  /** Provenance entries for this edge: who authored it, and every refinement since. A refinement rewrites the edge in place, so this audit trail is where the placement's earlier states live -- and counting these rows along a chain is what `CoordinateSystem.transformVersion` reports */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Where along one axis this edge applies, or null for an edge that holds everywhere -- which is almost every edge. A per-channel correction is scoped to {axis: "c", index: 2}; several such edges over one axis are one piecewise map. A path query crosses a scoped edge only when it fixes that coordinate with `at` */
  selector?: Maybe<Selector>;
  /** How much this map is actually known: VALIDATED for a map the server derived (or one someone checked), INFERRED for numbers read from metadata, MANUAL for an authored registration, UNKNOWN for one its author marked as a guess. A layer's validity is the weakest edge on its path to world */
  validity: PlacementValidity;
  /** (derivation edges) What the operation this edge records did to the *values*, orthogonal to `kind`: IDENTICAL (a crop -- statistics transfer), TRANSFORMED (a deconvolution -- same quantity, new numbers), CATEGORIZED (a threshold -- values became labels, and a bootstrapped scene renders the data as a label map). Null when unstated, and never present on a registration -- values do not cross a claim between spaces */
  valueRelation?: Maybe<ValueRelation>;
  /** How many times this edge has been written, counting the row that created it -- so a new edge reads 1. Only comparison is meaningful: this and the edge's `id` together are the cache key for anything derived from the edge, and a change means refetch. It counts the same provenance rows `provenanceEntries` lists, so the audit trail and the token cannot disagree; a rename moves it too, which errs towards refetching something that did not change rather than trusting something that did */
  version: Scalars['Int']['output'];
};


/** The identity map: input and output coordinates are the same */
export type IdentityTransformationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A container registered into a coordinate system: the data that can be in view of a region asked in it. A lens appears only where its dataset does not -- a window registered into a world its recording has no route to -- because reporting both would return the same samples twice */
export type InViewSource = AnnotationCollection | ArrayDataset | DataArray | Lens | SparseDataset | TableDataset;

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

/** One reference hop of a picker's join path: the column, in the table it stands in, whose values identify rows of the next table */
export type JoinStep = {
  __typename?: 'JoinStep';
  column: Scalars['String']['output'];
  table: Scalars['ID']['output'];
};

/** One reference hop: the column, in the table it stands in, whose values identify rows of the next table */
export type JoinStepInput = {
  column: Scalars['String']['input'];
  table: Scalars['ID']['input'];
};

/** Input type for a label, which specifies a label to associate with a coordinate anchor */
export type LabelInput = {
  label: Scalars['String']['input'];
};

/** A lens is a way of looking at a dataset: a selection (slices) along its axes -- a sweep, an epoch window, a run of channels. Immutable: there is no updateLens */
export type Lens = {
  __typename?: 'Lens';
  /** The dataset's coordinate anchors that fall inside this lens: an anchor pinned along an axis is in when its position is within the slice, and an anchor global along it always is. How a view of channels 2 to 5 learns what those four channels are called */
  activeAnchors: Array<CoordinateAnchor>;
  /** The lens' axis names, in array order. A selection never drops or reorders an axis */
  axisNames: Array<Scalars['String']['output']>;
  /** The coordinate system the lens' selection is expressed in. A sliced lens owns one (the space its slices cut out, with the derived edge recording the shift); an unsliced lens selects everything, so this resolves to the dataset's INTRINSIC system */
  coordinateSystem?: Maybe<CoordinateSystem>;
  dataset: ArrayDataset;
  /** The datasets computed from this lens' selection: the direct other end of `derivedFrom`, which names a *lens* as a parent rather than a dataset. An unsliced lens reports what was derived from the whole intrinsic grid -- its space is that grid, so it can say nothing narrower. Like the forward field this reports every child, whether or not this lens is its primary parent and whether or not its geometry survived */
  derivedDatasets: Array<ArrayDataset>;
  id: Scalars['ID']['output'];
  /** The shape this lens' slices cut out of its dataset */
  shape: Array<Scalars['Int']['output']>;
  /** The slices this lens makes, one per axis it restricts. Empty for a lens that selects everything */
  slices: Array<Slice>;
  /** The edge from this lens' space back into its dataset's sample grid. A window is a translation of the slice starts; a strided lens also rescales. Without this edge sample 0 of a window would read as sample 0 of the recording. Null for an unsliced lens: its space IS the intrinsic space, and there is no shift to record */
  toParent?: Maybe<Transformation>;
};

/** The fields a LENS derivation reads. Published for codegen; the wire type is the flat DerivedFromInput */
export type LensDerivedFromInput = {
  kind?: DerivationSourceKind;
  lens: Scalars['ID']['input'];
  transform?: InputMaybe<TransformInput>;
  valueRelation?: InputMaybe<ValueRelation>;
};

export type LensFilter = {
  AND?: InputMaybe<LensFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<LensFilter>;
  OR?: InputMaybe<LensFilter>;
  /** Filter by the dataset this lens selects over */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter to lenses placeable into a coordinate system: those whose space reaches it across steps that compose into one affine map, walking the transformation edges */
  placeableIn?: InputMaybe<PlaceableFilter>;
};

export type LensOrder =
  { id: Ordering; };

/** The placement of one pyramid level in a trace layer's experiment: the level, and its path to the world */
export type LevelPlacement = {
  __typename?: 'LevelPlacement';
  /** The pyramid level being placed */
  dataArray: DataArray;
  /** The path from this level's sample grid to the experiment's world, or null when the dataset is not placed in it */
  path?: Maybe<Array<PlacementStep>>;
};

/** The provenance component around one piece of data: every container it was computed from or that was computed from it, transitively, and the derivation edges between them. The lineage counterpart of `coordinateGraph`, and the difference is which edges are *walked*: that one crosses every edge touching a space, so a registration pulls in everything else registered into the same world -- the neighbourhood, not the provenance. This crosses derivation edges only, in both directions, because asking a source what came out of it and asking a product what went into it are the same graph read from two ends */
export type LineageGraph = {
  __typename?: 'LineageGraph';
  /** Every derivation edge with both containers in `nodes`, ordered by ID. Stored direction throughout -- child to source -- so the arrow points the way provenance reads. **Kind-blind**: an UNMAPPABLE edge is here, and is the point of the kind existing, since 'this came from that and the geometry did not survive' is exactly how a measurement table hangs off the mask it was measured from. Filter on `kind` for the chain that actually places things; a registration is never here at all */
  edges: Array<Transformation>;
  /** Every container in the component, the root's own included, ordered by kind and then by ID. Containers rather than spaces: a lineage is a story about data, and a dataset's pixel grid, its pyramid levels and its lenses are one node in it rather than three. Empty when the root space belongs to no container -- a world was computed from nothing and nothing was computed from it */
  nodes: Array<Resident>;
  /** The coordinate system the walk started from. Its container is the node the graph is centred on */
  root: CoordinateSystem;
};

/** Record a link between a file and the data it encodes, after both already exist. Two shapes, one per direction: name a `file` plus `sourceOf` to record what that file was written from, or name one container plus `sourceFiles` to record which files it was produced from */
export type LinkFileInput = {
  /** The annotation collection the files were read into */
  annotationCollection?: InputMaybe<Scalars['ID']['input']>;
  /** The array dataset the files were read into */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  /** The file the containers were written to */
  file?: InputMaybe<Scalars['ID']['input']>;
  /** The files a container was produced from */
  sourceFiles?: InputMaybe<Array<SourceFileInput>>;
  /** The containers this file was written from */
  sourceOf?: InputMaybe<Array<ExportOfInput>>;
  /** The sparse dataset the files were read into */
  sparseDataset?: InputMaybe<Scalars['ID']['input']>;
  /** The table dataset the files were read into */
  tableDataset?: InputMaybe<Scalars['ID']['input']>;
};

/** The fields a MAP_AXIS member of TransformInput reads. Published for codegen; the wire type is the flat TransformInput */
export type MapAxisTransformInput = {
  inputAxes: Array<Scalars['String']['input']>;
  kind?: CreatableTransformKind;
  outputAxes: Array<Scalars['String']['input']>;
};

/** A permutation of axes, mapping each input axis to an output axis by name */
export type MapAxisTransformation = Transformation & {
  __typename?: 'MapAxisTransformation';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  input?: Maybe<CoordinateSystem>;
  /** The names of the input axes, positionally matched to `outputAxes` */
  inputAxes: Array<Scalars['String']['output']>;
  /** Which geometric properties survive this edge's map, derived from `kind`: ISOMETRY (distances, angles and areas all transfer), SIMILARITY (angles and length ratios transfer, absolute lengths scale by one common factor), AFFINE (parallelism and area ratios transfer, angles and distances do not), DIFFEOMORPHIC (topology at best, and only locally -- the Jacobian varies with position), NONE (nothing corresponds). A SEQUENCE or BY_DIMENSION is the weakest of its children. Stated by kind, never by inspecting the numbers: an AFFINE edge reads AFFINE even when its matrix happens to be rigid, because separating those needs an SVD. A layer's `placementInvariance` is the minimum of this over its whole path to world */
  invariance: TransformInvariance;
  kind: TransformKind;
  name?: Maybe<Scalars['String']['output']>;
  output?: Maybe<CoordinateSystem>;
  /** The names of the output axes, positionally matched to `inputAxes` */
  outputAxes: Array<Scalars['String']['output']>;
  /** Provenance entries for this edge: who authored it, and every refinement since. A refinement rewrites the edge in place, so this audit trail is where the placement's earlier states live -- and counting these rows along a chain is what `CoordinateSystem.transformVersion` reports */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Where along one axis this edge applies, or null for an edge that holds everywhere -- which is almost every edge. A per-channel correction is scoped to {axis: "c", index: 2}; several such edges over one axis are one piecewise map. A path query crosses a scoped edge only when it fixes that coordinate with `at` */
  selector?: Maybe<Selector>;
  /** How much this map is actually known: VALIDATED for a map the server derived (or one someone checked), INFERRED for numbers read from metadata, MANUAL for an authored registration, UNKNOWN for one its author marked as a guess. A layer's validity is the weakest edge on its path to world */
  validity: PlacementValidity;
  /** (derivation edges) What the operation this edge records did to the *values*, orthogonal to `kind`: IDENTICAL (a crop -- statistics transfer), TRANSFORMED (a deconvolution -- same quantity, new numbers), CATEGORIZED (a threshold -- values became labels, and a bootstrapped scene renders the data as a label map). Null when unstated, and never present on a registration -- values do not cross a claim between spaces */
  valueRelation?: Maybe<ValueRelation>;
  /** How many times this edge has been written, counting the row that created it -- so a new edge reads 1. Only comparison is meaningful: this and the edge's `id` together are the cache key for anything derived from the edge, and a change means refetch. It counts the same provenance rows `provenanceEntries` lists, so the audit trail and the token cannot disagree; a rename moves it too, which errs towards refetching something that did not change rather than trusting something that did */
  version: Scalars['Int']['output'];
};


/** A permutation of axes, mapping each input axis to an output axis by name */
export type MapAxisTransformationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

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
  /** Delete every registration INTO a shared space in one call, returning the deleted edge ids. The space, whatever is laid out over it (its layers drop to UNREGISTERED) and the space's own claims into wider spaces all survive */
  clearCoordinateSystem: Array<Scalars['ID']['output']>;
  /** Draw an annotation into a collection, or onto an experiment (exactly one of the two). Drawing on an experiment finds its annotation collection or mints it on first use: a coordinate system copying the world's axes, an identity registration into the world, and one annotation layer */
  createAnnotation: Annotation;
  /** Create an annotation collection, in a coordinate system of its own, optionally related to what its shapes are drawn over: a dataset's sample grid, a segment's clock. The common path for a timeline -- drawing on an experiment -- goes through createAnnotation instead, which mints the experiment's collection on first use */
  createAnnotationCollection: AnnotationCollection;
  /** Draw an annotation collection's marks in an experiment */
  createAnnotationLayer: AnnotationLayer;
  /** Draw many annotations in one call -- a detector's whole output. One collection resolve, one chain resolve, one insert */
  createAnnotations: Array<Annotation>;
  /** Create a new dataset from array-like data, with its pyramid levels, optional coordinate anchors (a value unit, channel labels, the rig state) and derivation edges. One of the three ways data enters (with createTableDataset and createSparseDataset): when its samples were taken is said afterwards, by an edge onto a clock (`createSamplingLaw`), and what it is drawn as by an experiment layer */
  createArrayDataset: ArrayDataset;
  /** Place one clock on another -- a segment in its session, a session or a run in an experiment's world -- with one offset edge shared by everything timed on it. Refused when the two are already related */
  createClockOffset: Transformation;
  /** Create a SHARED coordinate system (a space nothing lives in: a clock, a world) and, in one call, author the edges registering any number of sources (datasets, lenses, coordinate systems) into it */
  createCoordinateSystem: CoordinateSystem;
  /** Draw an event table: a mark per row at its TIME column, or an interval with `stopColumn` */
  createEventsLayer: EventsLayer;
  /** Create an empty experiment over a world: an existing space it adopts, or one minted for it. Fill it with the layer mutations */
  createExperiment: Experiment;
  /** Create an experiment over a coordinate system -- a session's or a run's clock -- with a layer for every trace, spike raster, event table and annotation collection laid out on it. Authors no edges */
  createExperimentFromCoordinateSystem: Experiment;
  /** Create a new folder to organize data */
  createFolder: Folder;
  /** Add a layer of any kind to an experiment, with default render settings */
  createLayer: ExperimentLayer;
  /** Create a lens: an immutable selection over a dataset. A sliced lens gets its own coordinate system and the derived edge recording the shift */
  createLens: Lens;
  /** Create a mechanism from a mod file */
  createModEnvironment: ModEnvironment;
  /** Create a new model collection */
  createModelCollection: ModelCollection;
  /** Create a new model workspace */
  createModelWorkspace: ModelWorkspace;
  /** Create a new neuron model */
  createNeuronModel: NeuronModel;
  /** Time a sample grid (an array dataset's, or a spike raster's) on a clock: one BY_DIMENSION edge stating `t = sample / samplingRate + tStart`, in the clock's unit. Refused when the grid is already timed on that clock */
  createSamplingLaw: Transformation;
  /** Create a simulation: a run of a neuron model, its integrator parameters and its clock, and a timing edge onto that clock for each array dataset named. Creates no data; what was recorded where is each dataset's `recordingSite` / `stimulusSite` */
  createSimulation: Simulation;
  /** Create a sparse dataset from an uploaded sparse store. Each INDEX axis says what its positions are through `identifiedBy`; one axis may be TIME (elektro's own) -- a spike raster's samples, identified by nothing and placed on a clock with `createSamplingLaw`. The spec, shape and layouts are read from the store, never declared */
  createSparseDataset: SparseDataset;
  /** Draw a spike raster: a tick per spike and a row per unit, coloured and ordered by the unit table */
  createSpikesLayer: SpikesLayer;
  /** Create a table dataset from an uploaded parquet store: every column declared in file order, checked against the file. Columns with an `axisType` become the axes of the table's own coordinate system -- a TIME column makes it an event table, placeable on a clock. `identifiedBy` on a column says what its values are: a DATASET whose contents are the ids (a FIELD edge), or a TABLE whose rows they are (a foreign key -- a spike's unit id referencing the unit table) */
  createTableDataset: TableDataset;
  /** Draw an array dataset as a trace: a lens over it (or a `window` of time, lowered to one), and how its lines look */
  createTraceLayer: TraceLayer;
  /** Create one edge of the coordinate graph, mapping an input coordinate system to an output one. This is where a sampling law is corrected, two clocks are synchronised, and a recording is registered into a world */
  createTransformation: Transformation;
  /** Delete an annotation. Its collection, and the space it was drawn in, stay */
  deleteAnnotation: Scalars['ID']['output'];
  /** Delete an annotation collection. Its annotations, its experiment layers and the drawing space it owned go with it; what it was drawn over is untouched */
  deleteAnnotationCollection: Scalars['ID']['output'];
  /** Delete an existing array dataset, with its levels, its lenses, every interpretation of it, and the coordinate systems nothing else lives in. Its stores are flagged, not deleted: `purge_orphaned_stores` collects them after a grace period */
  deleteArrayDataset: Scalars['ID']['output'];
  /** Delete an unused shared coordinate system. Refused while data lives in it, while anything is laid out over it (an experiment, a simulation), or while any transformation edge touches it. This is the only door a shared space leaves through -- deleting an experiment never deletes one */
  deleteCoordinateSystem: Scalars['ID']['output'];
  /** Delete one downsampled level of a dataset. Level 0 cannot be deleted: it is the dataset */
  deleteDataArray: Scalars['ID']['output'];
  /** Delete an experiment and its layers. Its world and everything drawn in it stay */
  deleteExperiment: Scalars['ID']['output'];
  /** Delete an existing file */
  deleteFile: Scalars['ID']['output'];
  /** Delete an existing folder. What was filed in it is unfiled, not deleted */
  deleteFolder: Scalars['ID']['output'];
  /** Remove a layer from its experiment. What it drew is untouched */
  deleteLayer: Scalars['ID']['output'];
  /** Delete a lens, and the coordinate system it owned if it was sliced */
  deleteLens: Scalars['ID']['output'];
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
  /** Delete every orphaned shared space in the organization -- nothing living in it, nothing laid out over it, no edge touching it -- and return the deleted ids. Org admins sweep every orphan; anyone else sweeps only their own */
  deleteOrphanedCoordinateSystems: Array<Scalars['ID']['output']>;
  /** Un-register a source from a space by naming the source and the space rather than the edge. Deletes every edge from the source's spaces into that one -- rivals are allowed, so there is no single edge to mean -- and returns their ids. An UNMAPPABLE declaration is not a placement and is never matched */
  deleteRegistration: Array<Scalars['ID']['output']>;
  /** Delete a simulation and its clock, which takes the timing edges onto it along. The array datasets it timed stay */
  deleteSimulation: Scalars['ID']['output'];
  /** Delete a sparse dataset, and the coordinate system it owned if nothing else lives in it. Refused while a layer's picker names it */
  deleteSparseDataset: Scalars['ID']['output'];
  /** Delete a table dataset, and the coordinate system it owned if nothing else lives in it. Refused while a layer's picker or a column elsewhere references it */
  deleteTableDataset: Scalars['ID']['output'];
  /** Delete an existing transformation. A wrapper takes its children with it */
  deleteTransformation: Scalars['ID']['output'];
  /** Delete an existing workspace mapping */
  deleteWorkspaceMapping: Scalars['ID']['output'];
  /** Create a new folder to organize data, or return the one the current user already has under this name and parent */
  ensureFolder: Folder;
  /** Finalize a big file upload after the client has written the object */
  finishBigfileUpload: BigFileStore;
  /** Finalize a media upload after the client has written the object */
  finishMediaUpload: MediaStore;
  /** Finalize a Parquet upload after the client has written the object */
  finishParquetUpload: ParquetStore;
  /** Finalize a sparse upload, which is when the group's own metadata is read. A missing encoding, a missing array, or an `indptr` whose length contradicts the declared shape are all refused here -- that is what an interrupted upload looks like, and catching it now beats a reader discovering it later */
  finishSparseUpload: SparseStore;
  /** Finalize a Zarr upload after the client has written the object */
  finishZarrUpload: ZarrStore;
  /** Create a file from file-like data */
  fromFileLike: File;
  /** Record a link between a file and the data it encodes, after both already exist */
  linkFile: Array<FileLink>;
  /** Pin a folder for quick access */
  pinFolder: Folder;
  /** Pin or unpin a model workspace for the current user */
  pinModelWorkspace: ModelWorkspace;
  /** File annotation collections in a folder */
  putAnnotationCollectionsInFolder: Folder;
  /** File array datasets in a folder. Only root data is filed explicitly: a derived dataset follows its primary parent, and moving the parent moves it */
  putArrayDatasetsInFolder: Folder;
  /** File files in a folder */
  putFilesInFolder: Folder;
  /** Add folders as children of another folder */
  putFoldersInFolder: Folder;
  /** File sparse datasets in a folder. A derived matrix follows its primary parent */
  putSparseDatasetsInFolder: Folder;
  /** File table datasets in a folder. A derived table follows its primary parent */
  putTableDatasetsInFolder: Folder;
  /** Reissue upload credentials for a sparse store whose upload is still in flight, for the reason `refreshZarrUpload` exists: three chunked arrays of a large matrix take long enough that a write can outlive its session token. Refuses a store that is already populated -- that is an overwrite, not a resumption */
  refreshSparseUpload: SparseUploadGrant;
  /** Take annotation collections out of a folder */
  releaseAnnotationCollectionsFromFolder: Folder;
  /** Take array datasets out of a folder */
  releaseArrayDatasetsFromFolder: Folder;
  /** Take files out of a folder */
  releaseFilesFromFolder: Folder;
  /** Remove folders from being children of another folder */
  releaseFoldersFromFolder: Folder;
  /** Take sparse datasets out of a folder */
  releaseSparseDatasetsFromFolder: Folder;
  /** Take table datasets out of a folder */
  releaseTableDatasetsFromFolder: Folder;
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
  /** Request temporary S3 read credentials for sparse stores in the organization */
  requestGeneralSparseAccess: GeneralSparseAccessGrant;
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
  /** Request temporary S3 read credentials for a sparse store. Covers the whole prefix, because a lookup needs `indptr` before it knows which range of `data` to fetch */
  requestSparseAccess: SparseAccessGrant;
  /** Request an upload grant for a sparse store. The grant covers the whole prefix, so one request authorizes the group's metadata and all three of its arrays. It declares nothing about the matrix: the group states its encoding, shape and chunking, and the server reads them when the upload is finished */
  requestSparseUpload: SparseUploadGrant;
  /** Request temporary S3 read credentials for a Zarr store */
  requestZarrAccess: ZarrAccessGrant;
  /** Request an upload grant for a Zarr store */
  requestZarrUpload: ZarrUploadGrant;
  /** Revert folder to a previous version */
  revertFolder: Folder;
  /** Delete a file link. Neither the file nor the container is touched */
  unlinkFile: Scalars['ID']['output'];
  /** Edit an annotation. Only the supplied fields change; new vectors re-derive the bounding box */
  updateAnnotation: Annotation;
  /** Rename a dataset or redescribe it -- the whole of what is editable, and audited on `provenanceEntries`. Its arrays, axes and coordinate systems are fixed at creation; a recomputation is a new dataset */
  updateArrayDataset: ArrayDataset;
  /** Rename a shared coordinate system or anchor its clock. Shared spaces only -- a space data lives in is described by that data, and where data sits is an edge (updateTransformation), not a property of the space */
  updateCoordinateSystem: CoordinateSystem;
  /** Restyle an events layer, or point it at another table */
  updateEventsLayer: EventsLayer;
  /** Rename or redescribe an experiment */
  updateExperiment: Experiment;
  /** Update folder metadata */
  updateFolder: Folder;
  /** Restyle any layer's compositing: name, blending, opacity, visibility, order */
  updateLayer: ExperimentLayer;
  /** Update an existing model workspace */
  updateModelWorkspace: ModelWorkspace;
  /** Rename a sparse dataset or redescribe it. Its store, axes and coordinate system are fixed at creation */
  updateSparseDataset: SparseDataset;
  /** Restyle a spikes layer, or point it at another raster */
  updateSpikesLayer: SpikesLayer;
  /** Rename a table dataset or redescribe it. Its store, columns and coordinate system are fixed at creation */
  updateTableDataset: TableDataset;
  /** Restyle a trace layer, or point it at another lens */
  updateTraceLayer: TraceLayer;
  /** Refine a transformation's parameters in place. Everything that looks through the edge moves with it, because nothing stores a composed path */
  updateTransformation: Transformation;
  /** Update a workspace mapping (e.g. change its group) */
  updateWorkspaceMapping: WorkspaceMapping;
};


export type MutationAddModelsToWorkspaceArgs = {
  input: AddModelsToWorkspaceInput;
};


export type MutationClearCoordinateSystemArgs = {
  input: ClearCoordinateSystemInput;
};


export type MutationCreateAnnotationArgs = {
  input: CreateAnnotationInput;
};


export type MutationCreateAnnotationCollectionArgs = {
  input: CreateAnnotationCollectionInput;
};


export type MutationCreateAnnotationLayerArgs = {
  input: CreateAnnotationLayerInput;
};


export type MutationCreateAnnotationsArgs = {
  input: CreateAnnotationsInput;
};


export type MutationCreateArrayDatasetArgs = {
  input: CreateArrayDatasetInput;
};


export type MutationCreateClockOffsetArgs = {
  input: CreateClockOffsetInput;
};


export type MutationCreateCoordinateSystemArgs = {
  input: CreateCoordinateSystemInput;
};


export type MutationCreateEventsLayerArgs = {
  input: CreateEventsLayerInput;
};


export type MutationCreateExperimentArgs = {
  input: CreateExperimentInput;
};


export type MutationCreateExperimentFromCoordinateSystemArgs = {
  input: CreateExperimentFromCoordinateSystemInput;
};


export type MutationCreateFolderArgs = {
  input: CreateFolderInput;
};


export type MutationCreateLayerArgs = {
  input: CreateLayerInput;
};


export type MutationCreateLensArgs = {
  input: CreateLensInput;
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


export type MutationCreateSamplingLawArgs = {
  input: CreateSamplingLawInput;
};


export type MutationCreateSimulationArgs = {
  input: CreateSimulationInput;
};


export type MutationCreateSparseDatasetArgs = {
  input: CreateSparseDatasetInput;
};


export type MutationCreateSpikesLayerArgs = {
  input: CreateSpikesLayerInput;
};


export type MutationCreateTableDatasetArgs = {
  input: CreateTableDatasetInput;
};


export type MutationCreateTraceLayerArgs = {
  input: CreateTraceLayerInput;
};


export type MutationCreateTransformationArgs = {
  input: CreateTransformationInput;
};


export type MutationDeleteAnnotationArgs = {
  input: DeleteAnnotationInput;
};


export type MutationDeleteAnnotationCollectionArgs = {
  input: DeleteAnnotationCollectionInput;
};


export type MutationDeleteArrayDatasetArgs = {
  input: DeleteArrayDatasetInput;
};


export type MutationDeleteCoordinateSystemArgs = {
  input: DeleteCoordinateSystemInput;
};


export type MutationDeleteDataArrayArgs = {
  input: DeleteDataArrayInput;
};


export type MutationDeleteExperimentArgs = {
  input: DeleteInput;
};


export type MutationDeleteFileArgs = {
  input: DeleteFileInput;
};


export type MutationDeleteFolderArgs = {
  input: DeleteFolderInput;
};


export type MutationDeleteLayerArgs = {
  input: DeleteInput;
};


export type MutationDeleteLensArgs = {
  input: DeleteLensInput;
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


export type MutationDeleteRegistrationArgs = {
  input: DeleteRegistrationInput;
};


export type MutationDeleteSimulationArgs = {
  input: DeleteSimulationInput;
};


export type MutationDeleteSparseDatasetArgs = {
  input: DeleteSparseDatasetInput;
};


export type MutationDeleteTableDatasetArgs = {
  input: DeleteTableDatasetInput;
};


export type MutationDeleteTransformationArgs = {
  input: DeleteTransformationInput;
};


export type MutationDeleteWorkspaceMappingArgs = {
  input: DeleteInput;
};


export type MutationEnsureFolderArgs = {
  input: CreateFolderInput;
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


export type MutationFinishSparseUploadArgs = {
  input: FinishSparseUploadInput;
};


export type MutationFinishZarrUploadArgs = {
  input: FinishZarrUploadInput;
};


export type MutationFromFileLikeArgs = {
  input: FromFileLike;
};


export type MutationLinkFileArgs = {
  input: LinkFileInput;
};


export type MutationPinFolderArgs = {
  input: PinFolderInput;
};


export type MutationPinModelWorkspaceArgs = {
  input: PinModelWorkspaceInput;
};


export type MutationPutAnnotationCollectionsInFolderArgs = {
  input: AssociateInput;
};


export type MutationPutArrayDatasetsInFolderArgs = {
  input: AssociateInput;
};


export type MutationPutFilesInFolderArgs = {
  input: AssociateInput;
};


export type MutationPutFoldersInFolderArgs = {
  input: AssociateInput;
};


export type MutationPutSparseDatasetsInFolderArgs = {
  input: AssociateInput;
};


export type MutationPutTableDatasetsInFolderArgs = {
  input: AssociateInput;
};


export type MutationRefreshSparseUploadArgs = {
  input: RefreshSparseUploadInput;
};


export type MutationReleaseAnnotationCollectionsFromFolderArgs = {
  input: DesociateInput;
};


export type MutationReleaseArrayDatasetsFromFolderArgs = {
  input: DesociateInput;
};


export type MutationReleaseFilesFromFolderArgs = {
  input: DesociateInput;
};


export type MutationReleaseFoldersFromFolderArgs = {
  input: DesociateInput;
};


export type MutationReleaseSparseDatasetsFromFolderArgs = {
  input: DesociateInput;
};


export type MutationReleaseTableDatasetsFromFolderArgs = {
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


export type MutationRequestGeneralSparseAccessArgs = {
  input: RequestGeneralSparseAccessInput;
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


export type MutationRequestSparseAccessArgs = {
  input: RequestSparseAccessInput;
};


export type MutationRequestSparseUploadArgs = {
  input: RequestSparseUploadInput;
};


export type MutationRequestZarrAccessArgs = {
  input: RequestZarrAccessInput;
};


export type MutationRequestZarrUploadArgs = {
  input: RequestZarrUploadInput;
};


export type MutationRevertFolderArgs = {
  input: RevertInput;
};


export type MutationUnlinkFileArgs = {
  input: UnlinkFileInput;
};


export type MutationUpdateAnnotationArgs = {
  input: UpdateAnnotationInput;
};


export type MutationUpdateArrayDatasetArgs = {
  input: UpdateArrayDatasetInput;
};


export type MutationUpdateCoordinateSystemArgs = {
  input: UpdateCoordinateSystemInput;
};


export type MutationUpdateEventsLayerArgs = {
  input: UpdateEventsLayerInput;
};


export type MutationUpdateExperimentArgs = {
  input: UpdateExperimentInput;
};


export type MutationUpdateFolderArgs = {
  input: ChangeFolderInput;
};


export type MutationUpdateLayerArgs = {
  input: UpdateLayerInput;
};


export type MutationUpdateModelWorkspaceArgs = {
  input: UpdateModelWorkspaceInput;
};


export type MutationUpdateSparseDatasetArgs = {
  input: UpdateSparseDatasetInput;
};


export type MutationUpdateSpikesLayerArgs = {
  input: UpdateSpikesLayerInput;
};


export type MutationUpdateTableDatasetArgs = {
  input: UpdateTableDatasetInput;
};


export type MutationUpdateTraceLayerArgs = {
  input: UpdateTraceLayerInput;
};


export type MutationUpdateTransformationArgs = {
  input: UpdateTransformationInput;
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

/** Input type for one axis of a unit-carrying coordinate system: its name, its semantic kind and its physical unit */
export type PhysicalAxisInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  longName?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  type: AxisType;
  unit: Scalars['Unit']['input'];
};

/** Input for pinning or unpinning a folder for quick access */
export type PinFolderInput = {
  /** The ID of the folder to pin or unpin */
  id: Scalars['ID']['input'];
  /** True to pin, false to unpin */
  pin: Scalars['Boolean']['input'];
};

export type PinModelWorkspaceInput = {
  id: Scalars['ID']['input'];
  pin: Scalars['Boolean']['input'];
};

/** A `placeableIn` question: the destination space, and the narrowing of it. Placeable means *affinely* placeable -- reaching the space across steps that compose into one affine map. A spike train or an irregularly sampled signal reaches its clock through a FIELD and is therefore not in this set, although an experiment view over it can still be created: a timeline can draw spike times without a matrix. This filter answers 'what can I lay out with one map', not 'what can I show' */
export type PlaceableFilter = {
  /** Keep only what *needed* a lineage tree to get here: the filtered, decimated and sorted datasets placed by an ancestor's registration. What the space registers directly is dropped */
  derivedOnly?: InputMaybe<Scalars['Boolean']['input']>;
  /** The space to be placed into. A *space*, not an experiment: every experiment over one world offers the same candidates. Pass `experiment.world.id` to ask it of an experiment */
  space: Scalars['ID']['input'];
};

/** Whether a layer has a place in its scene's world, and if not, why not. Derived, never stored. */
export enum PlacementState {
  /** The layer's data is registered, but only at particular coordinates — a per-channel or per-timepoint correction, written as one selector-scoped edge per index. Where it sits genuinely depends on where you are standing, so `pathToWorld` and `asAffine` are null until you pass `at`, and answer for that coordinate when you do. This is a placement, not a gap: there is nothing to author. */
  Conditional = 'CONDITIONAL',
  /** The layer's data reaches the scene's world: `pathToWorld` is the route. */
  Placed = 'PLACED',
  /** This layer's data can never be placed: it reaches the world only across an UNMAPPABLE edge, which declares that no point correspondence exists, and it reaches nowhere else. `pathToWorld` is null because there is nothing to find — badge it, and do not go looking for the missing registration. */
  Unmappable = 'UNMAPPABLE',
  /** Nothing yet relates this layer's data to the scene's world. `pathToWorld` is null because the registration is *missing* — this is a gap in the data, and authoring the edge closes it. */
  Unregistered = 'UNREGISTERED'
}

/** One step of a placement path: a transformation edge, plus whether it is traversed against its stored direction. Each step carries its own map, its own `validity` and its own `invariance`, which is what this shape is for -- a client that only wants the composed answer should ask the layer for `asAffine` instead of composing these itself */
export type PlacementStep = {
  __typename?: 'PlacementStep';
  /** True when the edge is traversed output-to-input, so its map must be inverted before composing. Only ever set on a step that has an inverse -- a rank-changing edge and a warp field are never offered backwards */
  inverted: Scalars['Boolean']['output'];
  /** The transformation edge this step walks along */
  transformation: Transformation;
};

/** How much a transformation edge's map is actually known: guessed, inferred from metadata, authored by someone, or validated against the data. A layer's validity is derived from it, never stored: the weakest edge on its path to world. */
export enum PlacementValidity {
  /** The numbers were read from acquisition metadata (a pixel size, a stage pose). As right as the metadata is. */
  Inferred = 'INFERRED',
  /** Someone authored this map -- a registration pipeline, a human with a matrix. It exists on purpose, but nothing has checked it against the data. */
  Manual = 'MANUAL',
  /** This map was assumed, never measured -- badge it. The server writes it nowhere: nothing fabricates a placement any more, so an edge wears UNKNOWN only because a client said so on `createTransformation`, or because it is a historical auto-registered edge. */
  Unknown = 'UNKNOWN',
  /** Exact or checked: either the server derived the map from shapes and slices, so it cannot be wrong, or someone validated an authored registration against the data. */
  Validated = 'VALIDATED'
}

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
  /** Get a single annotation by ID */
  annotation: Annotation;
  /** Get a single annotation collection by ID */
  annotationCollection: AnnotationCollection;
  /** List annotation collections: named sets of marks, each owning the coordinate system they are drawn in */
  annotationCollections: Array<AnnotationCollection>;
  /** List annotations: events, epochs and measurements, each in its collection's coordinate system */
  annotations: Array<Annotation>;
  /** Get a single array dataset by ID */
  arrayDataset: ArrayDataset;
  /** List array datasets: N-dimensional arrays with named dimensions and anchored metadata -- a recording, a stimulus, a vector of sample times, a unit's waveform templates */
  arrayDatasets: Array<ArrayDataset>;
  /** Returns a list of cells in a model */
  cells: Array<Cell>;
  /** List everything filed in a folder: its sub-folders, files, array, table and sparse datasets and annotation collections */
  children: Array<FolderChild>;
  /** List coordinate anchors: the hubs pinning a value unit, a channel label or the rig state to coordinates of a dataset */
  coordinateAnchors: Array<CoordinateAnchor>;
  /** Walk the coordinate graph out from one system: every coordinate system it reaches and every top-level edge between them. Reachability is undirected (an edge pointing into the system relates to it as much as one pointing out), the edges keep their true direction, and nothing is composed -- what the list queries cannot answer is 'which edges relate to *this* one', because relatedness is transitive and a filter is not */
  coordinateGraph: CoordinateGraph;
  /** Get a single coordinate system by ID */
  coordinateSystem: CoordinateSystem;
  /** List coordinate systems: the nodes of the coordinate graph -- a dataset's sample grid, a clock, an experiment's world */
  coordinateSystems: Array<CoordinateSystem>;
  /** Get a single data array by ID */
  dataArray: DataArray;
  /** List data arrays: the multiscale zarr arrays backing array datasets */
  dataArrays: Array<DataArray>;
  experiment: Experiment;
  experiments: Array<Experiment>;
  file: File;
  /** Get a single file link by ID */
  fileLink: FileLink;
  /** List file links: which file a container was read from, or written to */
  fileLinks: Array<FileLink>;
  files: Array<File>;
  /** Get a single folder by ID */
  folder: Folder;
  /** List folders (collections of array, table and sparse datasets, annotation collections and files) */
  folders: Array<Folder>;
  /** Get a single experiment layer by ID */
  layer: ExperimentLayer;
  /** List the layers of experiments: traces, spike rasters, event tables and annotation collections, each drawn in one experiment */
  layers: Array<ExperimentLayer>;
  /** Get a single lens by ID */
  lens: Lens;
  /** List lenses: immutable selections over a dataset -- a sweep, an epoch window, a run of channels */
  lenses: Array<Lens>;
  /** Walk the *derivation* edges out from one dataset and return its provenance component: everything this data was computed from, everything computed from it, transitively in both directions, and the edges between them. Distinct from `coordinateGraph`, which walks every edge touching a space -- a registration there drags in every other dataset on the same clock, which is a neighbourhood rather than a lineage. Nodes are datasets, not spaces: a dataset's sample grid and its lenses are one node in a provenance story. Kind-blind, so an UNMAPPABLE edge is included; filter on `kind` for the chain that actually places things. Root it at any dataset's coordinate system */
  lineageGraph: LineageGraph;
  mechanism: Mechanism;
  mechanisms: Array<Mechanism>;
  modEnvironment: ModEnvironment;
  modEnvironments: Array<ModEnvironment>;
  modelCollection: ModelCollection;
  modelCollections: Array<ModelCollection>;
  modelWorkspace: ModelWorkspace;
  modelWorkspaces: Array<ModelWorkspace>;
  myfiles: Array<File>;
  /** List folders created by the current user */
  myfolders: Array<Folder>;
  /** The k annotations of one collection nearest to a point -- the events nearest an instant -- by cube distance between the point and each annotation's bounding box (GiST-accelerated; 0 inside the box). Scoped to one collection because boxes only compare within one frame; the point is in the collection's own coordinate order */
  nearestAnnotations: Array<Annotation>;
  /** Returns a single neuron model by ID */
  neuronModel: NeuronModel;
  neuronModels: Array<NeuronModel>;
  /** The sections of one cell of a neuron model, read from the model's config */
  sections: Array<Section>;
  simulation: Simulation;
  simulations: Array<Simulation>;
  /** Get a single sparse dataset by ID */
  sparseDataset: SparseDataset;
  /** List sparse datasets: sparse matrices -- a spike raster of units by samples is one, drawn as a spikes layer */
  sparseDatasets: Array<SparseDataset>;
  /** Get a single table dataset by ID */
  tableDataset: TableDataset;
  /** List table datasets: parquet-backed tables -- event lists, trial tables, a sorter's unit table. One with a TIME coordinate column is drawn as an events layer */
  tableDatasets: Array<TableDataset>;
  /** Get a single transformation by ID */
  transformation: Transformation;
  /** List transformations: the directed edges of the coordinate graph -- a sampling law, a time lookup, an offset, a derivation. Compose them client-side; the server never stores a composed path, because the same dataset can sit in two experiments under two offsets */
  transformations: Array<Transformation>;
  workspaceMapping: WorkspaceMapping;
  workspaceMappings: Array<WorkspaceMapping>;
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryAnnotationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAnnotationCollectionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryAnnotationCollectionsArgs = {
  filters?: InputMaybe<AnnotationCollectionFilter>;
  ordering?: Array<AnnotationCollectionOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryAnnotationsArgs = {
  filters?: InputMaybe<AnnotationFilter>;
  ordering?: Array<AnnotationOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryArrayDatasetArgs = {
  id: Scalars['ID']['input'];
};


export type QueryArrayDatasetsArgs = {
  filters?: InputMaybe<ArrayDatasetFilter>;
  ordering?: Array<ArrayDatasetOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryCellsArgs = {
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  modelId: Scalars['ID']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryChildrenArgs = {
  filters?: InputMaybe<FolderChildrenFilter>;
  order?: InputMaybe<ChildrenOrder>;
  pagination?: InputMaybe<ChildrenPaginationInput>;
  parent: Scalars['ID']['input'];
};


export type QueryCoordinateAnchorsArgs = {
  filters?: InputMaybe<CoordinateAnchorFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryCoordinateGraphArgs = {
  coordinateSystem: Scalars['ID']['input'];
  maxDepth?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryCoordinateSystemArgs = {
  id: Scalars['ID']['input'];
};


export type QueryCoordinateSystemsArgs = {
  filters?: InputMaybe<CoordinateSystemFilter>;
  ordering?: Array<CoordinateSystemOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryDataArrayArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDataArraysArgs = {
  filters?: InputMaybe<DataArrayFilter>;
  ordering?: Array<DataArrayOrder>;
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


export type QueryFileLinkArgs = {
  id: Scalars['ID']['input'];
};


export type QueryFileLinksArgs = {
  filters?: InputMaybe<FileLinkFilter>;
  ordering?: Array<FileLinkOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryFilesArgs = {
  filters?: InputMaybe<FileFilter>;
  ordering?: Array<FileOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryFolderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryFoldersArgs = {
  filters?: InputMaybe<FolderFilter>;
  ordering?: Array<FolderOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryLayerArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLayersArgs = {
  filters?: InputMaybe<ExperimentLayerFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryLensArgs = {
  id: Scalars['ID']['input'];
};


export type QueryLensesArgs = {
  filters?: InputMaybe<LensFilter>;
  ordering?: Array<LensOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryLineageGraphArgs = {
  coordinateSystem: Scalars['ID']['input'];
  maxDepth?: InputMaybe<Scalars['Int']['input']>;
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


export type QueryMyfilesArgs = {
  filters?: InputMaybe<FileFilter>;
  ordering?: Array<FileOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryMyfoldersArgs = {
  filters?: InputMaybe<FolderFilter>;
  ordering?: Array<FolderOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryNearestAnnotationsArgs = {
  collection: Scalars['ID']['input'];
  limit?: Scalars['Int']['input'];
  point: Array<Scalars['Float']['input']>;
};


export type QueryNeuronModelArgs = {
  id: Scalars['ID']['input'];
};


export type QueryNeuronModelsArgs = {
  filters?: InputMaybe<NeuronModelFilter>;
  ordering?: Array<NeuronModelOrder>;
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


export type QuerySparseDatasetArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySparseDatasetsArgs = {
  filters?: InputMaybe<SparseDatasetFilter>;
  ordering?: Array<SparseDatasetOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTableDatasetArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTableDatasetsArgs = {
  filters?: InputMaybe<TableDatasetFilter>;
  ordering?: Array<TableDatasetOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTransformationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWorkspaceMappingArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWorkspaceMappingsArgs = {
  filters?: InputMaybe<WorkspaceMappingFilter>;
  ordering?: Array<WorkspaceMappingOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};

export enum RecordingKind {
  Current = 'CURRENT',
  Ina = 'INA',
  Time = 'TIME',
  Unknown = 'UNKNOWN',
  Voltage = 'VOLTAGE'
}

/** The site truth, recorded: where on a simulated model the anchored values were recorded (NEURON's cell, section and position along it) and what was recorded. elektro's own spoke; it was the `Recording` row of a simulation */
export type RecordingSite = {
  __typename?: 'RecordingSite';
  /** The id of the cell, as the model config names it */
  cell?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: RecordingKind;
  /** The stated label, or the site spelled out as 'cell: location(position)' */
  label: Scalars['String']['output'];
  /** The id of the section, as the model config names it */
  location?: Maybe<Scalars['String']['output']>;
  /** The normalized position along the section, 0 to 1 */
  position?: Maybe<Scalars['Float']['output']>;
};

/** Where on a model the anchored values were RECORDED: NEURON's cell, section and position along it, and what was recorded. elektro's own spoke; it replaces the `Recording` row of a simulation */
export type RecordingSiteInput = {
  cell?: InputMaybe<Scalars['String']['input']>;
  kind?: RecordingKind;
  label?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Float']['input']>;
};

export type RefreshSparseUploadInput = {
  storeId: Scalars['String']['input'];
};

/** A source (dataset, lens, annotation collection, or coordinate system) to register into a shared space, plus the edge that places it. The edge points from the source's own coordinate system to the shared space; the transform is validated exactly as createTransformation validates one */
export type RegistrationPathInput = {
  annotationCollection?: InputMaybe<Scalars['ID']['input']>;
  coordinateSystem?: InputMaybe<Scalars['ID']['input']>;
  dataset?: InputMaybe<Scalars['ID']['input']>;
  lens?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  transform?: InputMaybe<TransformInput>;
  validity?: InputMaybe<PlacementValidity>;
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

export type RequestGeneralSparseAccessInput = {
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

export type RequestSparseAccessInput = {
  storeId: Scalars['String']['input'];
};

export type RequestSparseUploadInput = {
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

/** A piece of data living in a coordinate system. Data belongs to a space; the space belongs to nobody */
export type Resident = AnnotationCollection | ArrayDataset | DataArray | Lens | SparseDataset | TableDataset;

/** Input for reverting a folder to a previous history revision */
export type RevertInput = {
  /** The ID of the provenance history entry to revert the folder to */
  historyId: Scalars['ID']['input'];
  /** The ID of the folder to revert */
  id: Scalars['ID']['input'];
};

/** The hardware truth: the recorded rig state pinned to a coordinate anchor */
export type RigState = {
  __typename?: 'RigState';
  id: Scalars['ID']['output'];
  /** The recorded rig state, reconstructed into its typed form: clamp mode, holding level, access and membrane measurements as quantities, everything else as per-device named settings */
  state: RigStateGraph;
};

/** The recorded rig state: the hardware truth at the moment of acquisition */
export type RigStateGraph = {
  __typename?: 'RigStateGraph';
  devices: Array<DeviceState>;
  holdingCurrent?: Maybe<Scalars['ElectricCurrent']['output']>;
  holdingPotential?: Maybe<Scalars['ElectricPotential']['output']>;
  membraneCapacitance?: Maybe<Scalars['Capacitance']['output']>;
  mode?: Maybe<ClampMode>;
  seriesResistance?: Maybe<Scalars['ElectricalResistance']['output']>;
  temperature?: Maybe<Scalars['Temperature']['output']>;
};

/** The recorded rig state: the hardware truth at the moment of acquisition. The common facts (clamp mode, holding level, access and membrane measurements, temperature) are first-class and quantity-typed; everything else is per-device named settings */
export type RigStateInput = {
  devices?: Array<DeviceStateInput>;
  holdingCurrent?: InputMaybe<Scalars['ElectricCurrent']['input']>;
  holdingPotential?: InputMaybe<Scalars['ElectricPotential']['input']>;
  membraneCapacitance?: InputMaybe<Scalars['Capacitance']['input']>;
  mode?: InputMaybe<ClampMode>;
  seriesResistance?: InputMaybe<Scalars['ElectricalResistance']['input']>;
  temperature?: InputMaybe<Scalars['Temperature']['input']>;
};

/** The fields a ROTATION member of TransformInput reads. Published for codegen; the wire type is the flat TransformInput */
export type RotationTransformInput = {
  affine: Array<Array<Scalars['Float']['input']>>;
  kind?: CreatableTransformKind;
};

/** A rotation, given as an orthonormal matrix */
export type RotationTransformation = Transformation & {
  __typename?: 'RotationTransformation';
  /** The rotation matrix */
  affine: Array<Array<Scalars['Float']['output']>>;
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  input?: Maybe<CoordinateSystem>;
  /** The names of the input axes this edge's parameters are ordered by. `scale`, `translation` and the columns of `affine` follow this order -- which is the input system's axis order, NOT the reading layer's axis names, and the two differ often enough that indexing the arrays against them silently misplaces them. A BY_DIMENSION edge names only the subset of axes it acts on; the axes it does not name are the ones it leaves untouched */
  inputAxes: Array<Scalars['String']['output']>;
  /** Which geometric properties survive this edge's map, derived from `kind`: ISOMETRY (distances, angles and areas all transfer), SIMILARITY (angles and length ratios transfer, absolute lengths scale by one common factor), AFFINE (parallelism and area ratios transfer, angles and distances do not), DIFFEOMORPHIC (topology at best, and only locally -- the Jacobian varies with position), NONE (nothing corresponds). A SEQUENCE or BY_DIMENSION is the weakest of its children. Stated by kind, never by inspecting the numbers: an AFFINE edge reads AFFINE even when its matrix happens to be rigid, because separating those needs an SVD. A layer's `placementInvariance` is the minimum of this over its whole path to world */
  invariance: TransformInvariance;
  kind: TransformKind;
  name?: Maybe<Scalars['String']['output']>;
  output?: Maybe<CoordinateSystem>;
  /** The names of the output axes this edge produces. For a rank-changing BY_DIMENSION edge (placing a (c,y,x) dataset into a (t,z,y,x) world) this is the subset it maps onto; the world's other axes are untouched */
  outputAxes: Array<Scalars['String']['output']>;
  /** Provenance entries for this edge: who authored it, and every refinement since. A refinement rewrites the edge in place, so this audit trail is where the placement's earlier states live -- and counting these rows along a chain is what `CoordinateSystem.transformVersion` reports */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Where along one axis this edge applies, or null for an edge that holds everywhere -- which is almost every edge. A per-channel correction is scoped to {axis: "c", index: 2}; several such edges over one axis are one piecewise map. A path query crosses a scoped edge only when it fixes that coordinate with `at` */
  selector?: Maybe<Selector>;
  /** How much this map is actually known: VALIDATED for a map the server derived (or one someone checked), INFERRED for numbers read from metadata, MANUAL for an authored registration, UNKNOWN for one its author marked as a guess. A layer's validity is the weakest edge on its path to world */
  validity: PlacementValidity;
  /** (derivation edges) What the operation this edge records did to the *values*, orthogonal to `kind`: IDENTICAL (a crop -- statistics transfer), TRANSFORMED (a deconvolution -- same quantity, new numbers), CATEGORIZED (a threshold -- values became labels, and a bootstrapped scene renders the data as a label map). Null when unstated, and never present on a registration -- values do not cross a claim between spaces */
  valueRelation?: Maybe<ValueRelation>;
  /** How many times this edge has been written, counting the row that created it -- so a new edge reads 1. Only comparison is meaningful: this and the edge's `id` together are the cache key for anything derived from the edge, and a change means refetch. It counts the same provenance rows `provenanceEntries` lists, so the audit trail and the token cannot disagree; a rename moves it too, which errs towards refetching something that did not change rather than trusting something that did */
  version: Scalars['Int']['output'];
};


/** A rotation, given as an orthonormal matrix */
export type RotationTransformationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** A fixed recording interval: the run recorded one sample every 1/rate, starting at tStart */
export type SamplingInput = {
  rate: Scalars['Frequency']['input'];
  tStart?: Scalars['Duration']['input'];
};

/** Input type for one pyramid level: the array backing it, and how it was downsampled. Its scale factor is derived from its actual shape, never supplied */
export type ScaleInput = {
  /** The array-like object to create the dataset from */
  array: Scalars['ArrayLike']['input'];
  level: Scalars['Int']['input'];
  scaleMethod?: InputMaybe<ScaleMethod>;
};

/** How a pyramid level's voxels were computed from the level above it. Stated, never derived -- nothing about two arrays says whether one was averaged or picked out of the other -- and it matters because over an array of object ids only NEAREST and MODE are allowed: every other method returns numbers that were not in the input, and an invented id is an object that does not exist. */
export enum ScaleMethod {
  /** The mean over the source window -- the usual image-pyramid default, and the usual way a mask pyramid gets silently ruined. */
  Area = 'AREA',
  /** Cubic interpolation. Invents intermediate values, and overshoots past the input range at edges. */
  Cubic = 'CUBIC',
  /** A Gaussian-weighted average over the source window. */
  Gaussian = 'GAUSSIAN',
  /** Linear interpolation over the source window. Invents intermediate values, so never over ids. */
  Linear = 'LINEAR',
  /** The maximum of the source window. Returns a real value, but over ids it biases every boundary toward whichever object sorts higher, so it is not label-safe either. */
  Max = 'MAX',
  /** The minimum of the source window. Not label-safe, for the mirror of MAX's reason. */
  Min = 'MIN',
  /** The most frequent value in the source window. Label-safe, and the better of the two for a mask -- it keeps the object that actually dominates the window rather than whichever one the sampling grid happens to land on. */
  Mode = 'MODE',
  /** One source voxel, carried through unchanged. Label-safe: the value was already there. */
  Nearest = 'NEAREST'
}

/** The fields a SCALE member of TransformInput reads. Published for codegen; the wire type is the flat TransformInput */
export type ScaleTransformInput = {
  kind?: CreatableTransformKind;
  scale: Array<Scalars['Float']['input']>;
};

/** A per-axis multiplication, with one entry per input axis */
export type ScaleTransformation = Transformation & {
  __typename?: 'ScaleTransformation';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  input?: Maybe<CoordinateSystem>;
  /** The names of the input axes this edge's parameters are ordered by. `scale`, `translation` and the columns of `affine` follow this order -- which is the input system's axis order, NOT the reading layer's axis names, and the two differ often enough that indexing the arrays against them silently misplaces them. A BY_DIMENSION edge names only the subset of axes it acts on; the axes it does not name are the ones it leaves untouched */
  inputAxes: Array<Scalars['String']['output']>;
  /** Which geometric properties survive this edge's map, derived from `kind`: ISOMETRY (distances, angles and areas all transfer), SIMILARITY (angles and length ratios transfer, absolute lengths scale by one common factor), AFFINE (parallelism and area ratios transfer, angles and distances do not), DIFFEOMORPHIC (topology at best, and only locally -- the Jacobian varies with position), NONE (nothing corresponds). A SEQUENCE or BY_DIMENSION is the weakest of its children. Stated by kind, never by inspecting the numbers: an AFFINE edge reads AFFINE even when its matrix happens to be rigid, because separating those needs an SVD. A layer's `placementInvariance` is the minimum of this over its whole path to world */
  invariance: TransformInvariance;
  kind: TransformKind;
  name?: Maybe<Scalars['String']['output']>;
  output?: Maybe<CoordinateSystem>;
  /** The names of the output axes this edge produces. For a rank-changing BY_DIMENSION edge (placing a (c,y,x) dataset into a (t,z,y,x) world) this is the subset it maps onto; the world's other axes are untouched */
  outputAxes: Array<Scalars['String']['output']>;
  /** Provenance entries for this edge: who authored it, and every refinement since. A refinement rewrites the edge in place, so this audit trail is where the placement's earlier states live -- and counting these rows along a chain is what `CoordinateSystem.transformVersion` reports */
  provenanceEntries: Array<ProvenanceEntry>;
  /** The per-axis scale factors, in the axis order of the input system, expressed in the units of the output system's axes (dimensionless between pixel systems, e.g. within a pyramid). Absolute, not relative to another level */
  scale: Array<Scalars['Float']['output']>;
  /** Where along one axis this edge applies, or null for an edge that holds everywhere -- which is almost every edge. A per-channel correction is scoped to {axis: "c", index: 2}; several such edges over one axis are one piecewise map. A path query crosses a scoped edge only when it fixes that coordinate with `at` */
  selector?: Maybe<Selector>;
  /** How much this map is actually known: VALIDATED for a map the server derived (or one someone checked), INFERRED for numbers read from metadata, MANUAL for an authored registration, UNKNOWN for one its author marked as a guess. A layer's validity is the weakest edge on its path to world */
  validity: PlacementValidity;
  /** (derivation edges) What the operation this edge records did to the *values*, orthogonal to `kind`: IDENTICAL (a crop -- statistics transfer), TRANSFORMED (a deconvolution -- same quantity, new numbers), CATEGORIZED (a threshold -- values became labels, and a bootstrapped scene renders the data as a label map). Null when unstated, and never present on a registration -- values do not cross a claim between spaces */
  valueRelation?: Maybe<ValueRelation>;
  /** How many times this edge has been written, counting the row that created it -- so a new edge reads 1. Only comparison is meaningful: this and the edge's `id` together are the cache key for anything derived from the edge, and a change means refetch. It counts the same provenance rows `provenanceEntries` lists, so the audit trail and the token cannot disagree; a rename moves it too, which errs towards refetching something that did not change rather than trusting something that did */
  version: Scalars['Int']['output'];
};


/** A per-axis multiplication, with one entry per input axis */
export type ScaleTransformationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

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

/** Where along one axis a transformation applies */
export type Selector = {
  __typename?: 'Selector';
  /** The axis of the input system this edge is scoped to */
  axis: Scalars['String']['output'];
  /** The position along that axis at which this map holds */
  index: Scalars['Int']['output'];
};

/** Where along one axis a transformation applies: the map holds at that index and makes no claim elsewhere */
export type SelectorInput = {
  axis: Scalars['String']['input'];
  index: Scalars['Int']['input'];
};

/** An ordered composition of child transformations, applied first to last */
export type SequenceTransformation = Transformation & {
  __typename?: 'SequenceTransformation';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  input?: Maybe<CoordinateSystem>;
  /** The names of the input axes this edge's parameters are ordered by. `scale`, `translation` and the columns of `affine` follow this order -- which is the input system's axis order, NOT the reading layer's axis names, and the two differ often enough that indexing the arrays against them silently misplaces them. A BY_DIMENSION edge names only the subset of axes it acts on; the axes it does not name are the ones it leaves untouched */
  inputAxes: Array<Scalars['String']['output']>;
  /** Which geometric properties survive this edge's map, derived from `kind`: ISOMETRY (distances, angles and areas all transfer), SIMILARITY (angles and length ratios transfer, absolute lengths scale by one common factor), AFFINE (parallelism and area ratios transfer, angles and distances do not), DIFFEOMORPHIC (topology at best, and only locally -- the Jacobian varies with position), NONE (nothing corresponds). A SEQUENCE or BY_DIMENSION is the weakest of its children. Stated by kind, never by inspecting the numbers: an AFFINE edge reads AFFINE even when its matrix happens to be rigid, because separating those needs an SVD. A layer's `placementInvariance` is the minimum of this over its whole path to world */
  invariance: TransformInvariance;
  kind: TransformKind;
  name?: Maybe<Scalars['String']['output']>;
  output?: Maybe<CoordinateSystem>;
  /** The names of the output axes this edge produces. For a rank-changing BY_DIMENSION edge (placing a (c,y,x) dataset into a (t,z,y,x) world) this is the subset it maps onto; the world's other axes are untouched */
  outputAxes: Array<Scalars['String']['output']>;
  /** Provenance entries for this edge: who authored it, and every refinement since. A refinement rewrites the edge in place, so this audit trail is where the placement's earlier states live -- and counting these rows along a chain is what `CoordinateSystem.transformVersion` reports */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Where along one axis this edge applies, or null for an edge that holds everywhere -- which is almost every edge. A per-channel correction is scoped to {axis: "c", index: 2}; several such edges over one axis are one piecewise map. A path query crosses a scoped edge only when it fixes that coordinate with `at` */
  selector?: Maybe<Selector>;
  /** The child transformations, applied first to last. They omit their own input and output: the sequence supplies them */
  transformations: Array<Transformation>;
  /** How much this map is actually known: VALIDATED for a map the server derived (or one someone checked), INFERRED for numbers read from metadata, MANUAL for an authored registration, UNKNOWN for one its author marked as a guess. A layer's validity is the weakest edge on its path to world */
  validity: PlacementValidity;
  /** (derivation edges) What the operation this edge records did to the *values*, orthogonal to `kind`: IDENTICAL (a crop -- statistics transfer), TRANSFORMED (a deconvolution -- same quantity, new numbers), CATEGORIZED (a threshold -- values became labels, and a bootstrapped scene renders the data as a label map). Null when unstated, and never present on a registration -- values do not cross a claim between spaces */
  valueRelation?: Maybe<ValueRelation>;
  /** How many times this edge has been written, counting the row that created it -- so a new edge reads 1. Only comparison is meaningful: this and the edge's `id` together are the cache key for anything derived from the edge, and a change means refetch. It counts the same provenance rows `provenanceEntries` lists, so the audit trail and the token cannot disagree; a rename moves it too, which errs towards refetching something that did not change rather than trusting something that did */
  version: Scalars['Int']['output'];
};


/** An ordered composition of child transformations, applied first to last */
export type SequenceTransformationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** One named device setting, exactly one value slot filled */
export type Setting = {
  __typename?: 'Setting';
  flag?: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  number?: Maybe<Scalars['Float']['output']>;
  quantity?: Maybe<Scalars['GenericQuantity']['output']>;
  text?: Maybe<Scalars['String']['output']>;
};

/** One named device setting with exactly one value slot filled: a quantity when the setting carries a unit, else a number, text or flag. A setting holding two values is two settings */
export type SettingInput = {
  flag?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  number?: InputMaybe<Scalars['Float']['input']>;
  quantity?: InputMaybe<Scalars['GenericQuantity']['input']>;
  text?: InputMaybe<Scalars['String']['input']>;
};

export type Simulation = {
  __typename?: 'Simulation';
  /** The clock the run's datasets are timed against: a coordinate system with one TIME axis, in milliseconds by default. Laying a run into an experiment is one edge from this clock into the experiment's world */
  clock?: Maybe<CoordinateSystem>;
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  /** The array datasets timed on this run's clock -- recordings and stimuli alike, each by its own sampling law or time lookup. Read off the graph, never stored: timing a dataset on the clock is what makes it part of the run */
  datasets: Array<ArrayDataset>;
  description?: Maybe<Scalars['String']['output']>;
  /** The integration time step (NEURON's dt). An integrator parameter, not the sampling period: a run can record more coarsely than it integrates. Null when unstated */
  dt?: Maybe<Scalars['Duration']['output']>;
  /** How long the model was run for (NEURON's tstop) */
  duration: Scalars['Duration']['output'];
  id: Scalars['ID']['output'];
  model: NeuronModel;
  name: Scalars['String']['output'];
  provenanceEntries: Array<ProvenanceEntry>;
  /** The datasets of this run carrying a `recordingSite` on some anchor: what was recorded, and where */
  recordings: Array<ArrayDataset>;
  /** The rate the run's samples were recorded at, when every dataset timed on its clock agrees on one. Derived from their sampling laws -- each has its own edge onto the clock, and this is their common value. Null for a run timed by `timeDataset`, and null when the edges have been corrected apart */
  samplingRate?: Maybe<Scalars['Frequency']['output']>;
  /** The datasets of this run carrying a `stimulusSite` on some anchor: what was injected, and where */
  stimuli: Array<ArrayDataset>;
  /** The dataset whose values are the instants the run's samples were recorded at. Derived: it is the field of the time lookups from the run's datasets onto its clock. Null for a run recorded at a fixed interval, which has a sampling law instead -- see `samplingRate` */
  timeDataset?: Maybe<ArrayDataset>;
};


export type SimulationProvenanceEntriesArgs = {
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

/** A slice along a named axis, with optional start, stop and step */
export type Slice = {
  __typename?: 'Slice';
  /** The name of the axis the slice acts on, e.g. 't' or 'c' */
  axis: Scalars['String']['output'];
  /** The starting index of the slice, or None to start from the beginning */
  start?: Maybe<Scalars['Int']['output']>;
  /** The step size of the slice, or None to use the default step */
  step?: Maybe<Scalars['Int']['output']>;
  /** The stopping index of the slice, or None to go to the end */
  stop?: Maybe<Scalars['Int']['output']>;
};

/** A slice along one named axis, with python's half-open `start:stop:step` semantics. Indices are SAMPLE indices along that axis of the dataset, never physical units */
export type SliceInput = {
  axis: Scalars['String']['input'];
  start?: InputMaybe<Scalars['Int']['input']>;
  step?: InputMaybe<Scalars['Int']['input']>;
  stop?: InputMaybe<Scalars['Int']['input']>;
};

/** One file this container was produced from -- the ABF or NWB file a converter read to write these arrays. Recorded as a link between bytes and data, deliberately not as a coordinate-graph edge: a file has no space, so there is no map to state and `derivedFrom` is the wrong mechanism */
export type SourceFileInput = {
  file: Scalars['ID']['input'];
  seriesIdentifier?: InputMaybe<Scalars['String']['input']>;
  valueRelation?: InputMaybe<ValueRelation>;
};

/** One source in view of a region: where it sits in the queried coordinate system, how it got there, and which of its coordinate anchors are in view */
export type SourcePlacement = {
  __typename?: 'SourcePlacement';
  /** The source's coordinate anchors whose slab overlaps the region. An anchor pins some axes and is global along every axis it omits, so its slab is one voxel wide where it pins and the container's full extent where it does not. Only an array dataset has anchors; every other source kind reports none, which is not a gap */
  anchors: Array<CoordinateAnchor>;
  /** The source's axis-aligned extent in the queried system's coordinates, one entry per axis it constrains -- and only those. Usually a proper subset: a (c,y,x) dataset registered onto the (y,x) of a (t,z,y,x) world is a slab, extended along t and z, and an entry there would be a number nothing measured. Empty when `extentState` is not KNOWN */
  extent: Array<AxisExtent>;
  /** Whether the server can state this source's extent, and if not, why not. An empty `extent` alone would conflate a Parquet the server never reads with a warp field on the path */
  extentState: ExtentState;
  /** Which geometric properties survive the walk from this source's data into the queried system: the weakest edge on `path`. The classes nest, so a composition belongs to the weakest group any of its factors belongs to */
  invariance: TransformInvariance;
  /** The ordered edges from `system` into the queried system, in stored direction with the inversions flagged. Empty when the source's own system IS the queried system. The server returns the steps; composing them stays the client's job, exactly as for `Layer.pathToWorld` */
  path: Array<PlacementStep>;
  /** The container in view: a dataset, a lens over one, an event or unit table, a spike raster, or an annotation collection. A collection comes back with `extentState: UNREADABLE` -- the server does not bound a set of rows or shapes as one box; read the rows, or ask an annotation collection's annotations with `intersects` */
  source: InViewSource;
  /** The source's own coordinate system that `extent` is anchored at and `path` starts from -- its pixel grid, its lens crop, or its collection's space. Which one it is follows from where the registration into the queried system actually attaches, which is what keeps the walk running forward */
  system: CoordinateSystem;
  /** How much this placement is actually known: the weakest edge on `path`. VALIDATED for a source that already IS the queried system, a placement exact by construction */
  validity: PlacementValidity;
};

/** Temporary S3 credentials for reading a sparse store. Covers the whole prefix, because a lookup needs `indptr` before it knows which range of `data` to fetch. */
export type SparseAccessGrant = {
  __typename?: 'SparseAccessGrant';
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

/** One stored layout of a sparse matrix: a store, and which axis its `indptr` indexes. The `DataArray` of this world and deliberately thinner -- two layouts are the same space holding the same values in a different order, so unlike a pyramid level there is no coordinate system and no edge, because there is nothing spatial to state */
export type SparseArray = {
  __typename?: 'SparseArray';
  id: Scalars['ID']['output'];
  /** Which axis of the dataset this layout's `indptr` indexes, as a position in the declared axis order. Selecting one position along it is a single contiguous read; selecting along the other axis is a scan of everything, which is why a dataset that must answer both questions holds two of these */
  indexedAxis: Scalars['Int']['output'];
  /** The name of the axis this layout indexes, from the dataset's declared order */
  indexedAxisName?: Maybe<Scalars['String']['output']>;
  /** Where this layout sits inside the store's prefix, e.g. `layouts/csr_matrix`. Open the group at this path, not at the store root */
  path: Scalars['String']['output'];
  /** The store holding this layout. Both layouts of one matrix share it -- one matrix is one upload -- so `path` is what says which of them this is. Ask the store for an access grant and read the three arrays directly */
  store: SparseStore;
};

/** One axis of a sparse matrix, and what its positions **are**. An INDEX axis (the default) enumerates, and says what through `identifiedBy` -- a list because fan-in is real, and not empty: an INDEX axis nothing identifies is one no source could ever key. A TIME axis (at most one; elektro's own) is a spike raster's sample axis: it is identified by nothing, because a sampling law onto a clock is what says when its samples were (`createSamplingLaw`) */
export type SparseAxisInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  identifiedBy?: Array<IdentificationInput>;
  longName?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  type?: AxisType;
};

/** An axis whose positions are rows of a table. The sparse counterpart of `Column.references` -- the same statement said of an axis, because a matrix has no columns to hang it on -- and what lets a FIELD edge land beside it: a mask supplies one id, so the other axis has to be accounted for by its own identification */
export type SparseAxisReference = {
  __typename?: 'SparseAxisReference';
  /** The name of the identified axis */
  axis: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  /** The table whose rows this axis' positions are. Keyed by its single INDEX coordinate column, which is where a position is looked up */
  references: TableDataset;
};

/** A sparse matrix over two enumerated axes -- objects on one, features on the other -- stored as anndata-spelled zarr groups. It exists because a colouring names one *column*, so a colourable measurement is a column of a table: right for a few hundred features and impossible for a transcriptome, where a feature stops being a schema fact and becomes a data one. **Each axis is identified exactly once**, by its own `identifiedBy` -- a source whose contents are the ids, or the table whose rows the positions are. Its stores, axes and coordinate system are fixed at creation; a recomputation is a new dataset */
export type SparseDataset = {
  __typename?: 'SparseDataset';
  /** The stored layouts, one per axis a store's `indptr` indexes. One is legal and offers one capability */
  arrays: Array<SparseArray>;
  /** The matrix's axis names, in the order its stores' `shape` is written */
  axisNames: Array<Scalars['String']['output']>;
  /** The axes identified by a table rather than by a keying source */
  axisReferences: Array<SparseAxisReference>;
  /** The coordinate system whose axes are this matrix's two enumerations. Owned by the dataset, and the space a FIELD edge lands in */
  coordinateSystem: CoordinateSystem;
  /** The task this dataset was created through, if any */
  createdThrough?: Maybe<Task>;
  /** Who assigned that task */
  createdThroughBy?: Maybe<User>;
  /** Every edge from this matrix's space back into the data it was computed from, in declared order */
  derivedFrom: Array<Transformation>;
  description?: Maybe<Scalars['String']['output']>;
  /** The folder it is filed in. Organisational only */
  folder?: Maybe<Folder>;
  id: Scalars['ID']['output'];
  /** The axes this dataset can select a single position along in one contiguous read -- one per stored layout. An axis absent here is one it holds, but can only answer about by scanning every byte, so a surface needing that answer will not offer this dataset */
  indexableAxes: Array<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  /** The recorded history of this dataset. Only `name` and `description` can change */
  provenanceEntries: Array<ProvenanceEntry>;
  /** How this matrix was produced: the run, its parameters and its inputs */
  provenanceMetadata: Scalars['Any']['output'];
  /** The shape of the matrix, read off its stores rather than declared. Every layout of one dataset holds the same shape */
  shape: Array<Scalars['Int']['output']>;
  /** The files this dataset was converted from */
  sourceFiles: Array<FileLink>;
};


/** A sparse matrix over two enumerated axes -- objects on one, features on the other -- stored as anndata-spelled zarr groups. It exists because a colouring names one *column*, so a colourable measurement is a column of a table: right for a few hundred features and impossible for a transcriptome, where a feature stops being a schema fact and becomes a data one. **Each axis is identified exactly once**, by its own `identifiedBy` -- a source whose contents are the ids, or the table whose rows the positions are. Its stores, axes and coordinate system are fixed at creation; a recomputation is a new dataset */
export type SparseDatasetProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A sparse matrix over two enumerated axes -- objects on one, features on the other -- stored as anndata-spelled zarr groups. It exists because a colouring names one *column*, so a colourable measurement is a column of a table: right for a few hundred features and impossible for a transcriptome, where a feature stops being a schema fact and becomes a data one. **Each axis is identified exactly once**, by its own `identifiedBy` -- a source whose contents are the ids, or the table whose rows the positions are. Its stores, axes and coordinate system are fixed at creation; a recomputation is a new dataset */
export type SparseDatasetSourceFilesArgs = {
  filters?: InputMaybe<FileLinkFilter>;
};

/** The fields a SPARSE_DATASET export link reads. Published for codegen; the wire type is the flat ExportOfInput */
export type SparseDatasetExportOfInput = {
  kind?: FileLinkContainerKind;
  seriesIdentifier?: InputMaybe<Scalars['String']['input']>;
  sparseDataset: Scalars['ID']['input'];
  valueRelation?: InputMaybe<ValueRelation>;
};

export type SparseDatasetFilter = {
  AND?: InputMaybe<SparseDatasetFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<SparseDatasetFilter>;
  OR?: InputMaybe<SparseDatasetFilter>;
  /** Filter by the sub of the user that assigned the creating task */
  assignedBy?: InputMaybe<Scalars['ID']['input']>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by the database ID of the task the item was created through (the `createdThrough { id }` field) */
  createdThrough?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the database ID of the user that assigned the creating task (the `createdThroughBy { id }` field) */
  createdThroughBy?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the rekuest task id the item was created through */
  createdThroughTask?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<StrFilterLookup>;
  /** Filter by the folder this sparse dataset is filed in */
  folder?: InputMaybe<Scalars['ID']['input']>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter to datasets holding a layout indexed on this axis -- the ones that can answer about it in one contiguous read rather than by scanning */
  indexesAxis?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<StrFilterLookup>;
  /** Filter by the creator's subject ID */
  owner?: InputMaybe<Scalars['ID']['input']>;
  /** Filter to sparse datasets placeable into a coordinate system across steps that compose into one affine map -- a raster's sampling law onto a clock is one */
  placeableIn?: InputMaybe<PlaceableFilter>;
  /** Search by name (case-insensitive substring) */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Filter by whether the matrix has a TIME axis -- a spike raster, placed on a clock by a sampling law -- or only enumerations. elektro's own */
  timed?: InputMaybe<Scalars['Boolean']['input']>;
};

export type SparseDatasetOrder =
  { createdAt: Ordering; id?: never; name?: never; }
  |  { createdAt?: never; id: Ordering; name?: never; }
  |  { createdAt?: never; id?: never; name: Ordering; };

/** One stored layout of a sparse matrix: an anndata-spelled group under `layouts/<encoding>`, holding `data`, `indices` and `indptr`. Read it with two requests -- `indptr[i:i+2]` at the position, then the range those two offsets name in `indices` and `data`. */
export type SparseLayout = {
  __typename?: 'SparseLayout';
  /** The chunk length of each of `data`, `indices` and `indptr`. What decides the read cost: a chunk is the granularity at which bytes can be fetched, so a slice costs whole chunks -- measured on a 16 um matrix, one slice costs 0.95 ms at 32 768-element chunks and 23.55 ms at 4 Mi ones. Sized for one object-store request, where the cost is round trips rather than bytes and a chunk is also the unit the next lookup along an adjacent slice reuses */
  chunks?: Maybe<Scalars['JSON']['output']>;
  /** The dtype of the stored values */
  dtype: Scalars['String']['output'];
  /** The anndata encoding this layout declares: `csr_matrix` or `csc_matrix`. It names which axis `indptr` indexes, which is the whole of what the two layouts differ in */
  encoding: Scalars['String']['output'];
  /** The version of that encoding, as the layout declares it */
  encodingVersion?: Maybe<Scalars['String']['output']>;
  /** The axes this layout did not compress, in the order `indices` was raveled over them. At rank two it has one member and says nothing; above it, unravel a returned position through this -- it is the one fact in the format that cannot be recovered from the bytes, so a wrong reading does not fail, it reads a different cell */
  indexOrder: Array<Scalars['Int']['output']>;
  /** Which axis of the store's `shape` this layout makes contiguous. Ask along an axis no layout compresses and there is no range to read at all, only a scan of everything */
  indexedAxis: Scalars['Int']['output'];
  /** How many nonzeros this layout holds. Read from the length of `data`, never declared */
  nnz: Scalars['Int']['output'];
  /** Where this layout sits inside the store's prefix, e.g. `layouts/csr_matrix`. A reader opens the group at this path, not the store root */
  path: Scalars['String']['output'];
  /** Whether a slice can be fetched as an exact byte range instead of as whole chunks -- true when every array is one uncompressed chunk, so `indptr` names byte offsets into the raw buffer. False is the ordinary case and not a defect: the default trades bytes for cache reuse, which is the better trade when the cost is requests */
  rangeReadable: Scalars['Boolean']['output'];
};

/** A sparse matrix stored as an anndata-spelled zarr group behind the S3 datalayer: `data`, `indices` and `indptr`, with the encoding, shape and chunking read from the group itself rather than declared. Its `encoding` says which axis `indptr` indexes, and so which question it answers in one contiguous read -- ask the other and there is no range to read at all. */
export type SparseStore = {
  __typename?: 'SparseStore';
  /** Get temporary S3 read credentials for the sparse store. */
  accessGrant: SparseAccessGrant;
  bucket: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  key: Scalars['String']['output'];
  /** The stored layouts, one per `layouts/<encoding>` child. Which axis a layout's `indptr` indexes decides which question it answers in one contiguous read, so a store holding one layout offers one capability and a store holding both offers both. Empty while the store is unpopulated, which is the only state in which what it holds is unknown */
  layouts: Array<SparseLayout>;
  path: Scalars['String']['output'];
  /** The shape of the matrix, as the root block declares it and every layout agrees. Two axes */
  shape?: Maybe<Array<Scalars['Int']['output']>>;
  /** The version of the `sporadik` block this store was accepted under. A spec selects how every byte in the prefix is read, so an unknown one is refused rather than guessed at */
  spec?: Maybe<Scalars['String']['output']>;
};


/** A sparse matrix stored as an anndata-spelled zarr group behind the S3 datalayer: `data`, `indices` and `indptr`, with the encoding, shape and chunking read from the group itself rather than declared. Its `encoding` says which axis `indptr` indexes, and so which question it answers in one contiguous read -- ask the other and there is no range to read at all. */
export type SparseStoreAccessGrantArgs = {
  host?: InputMaybe<Scalars['String']['input']>;
};

/** Temporary S3 credentials for uploading a sparse store. Scoped to the prefix and permitted to read back and delete inside it, because the three arrays are written incrementally. */
export type SparseUploadGrant = {
  __typename?: 'SparseUploadGrant';
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

/** What a spikes layer reads from a raster's nonzero values */
export enum SpikeValueMode {
  /** The stored value is the spike's amplitude, drawn through the layer's colormap between `climMin` and `climMax`. */
  Amplitude = 'AMPLITUDE',
  /** Every nonzero is one spike, drawn in the layer's colour (or its unit's colour-by), whatever the stored value. */
  Presence = 'PRESENCE'
}

/** Spikes: a sparse dataset with a TIME axis -- a raster of units by samples, one nonzero per spike -- drawn as a tick per spike and a row per unit, or as a firing-rate histogram when `rateBin` is set. The raster is placed by its sampling law, exactly as the recording it was sorted from; a unit's colour and row order come from the table identifying the raster's unit axis (`unitTable`) */
export type SpikesLayer = ExperimentLayer & {
  __typename?: 'SpikesLayer';
  /** Which entry of `colorBys` is drawn, as an index into it. Null draws every unit in `color` */
  activeColorBy?: Maybe<Scalars['Int']['output']>;
  /** Which entries of `filterBys` apply, as indices into it. They combine with AND: a unit is drawn when every active rule keeps it */
  activeFilterBys: Array<Scalars['Int']['output']>;
  /** This layer's whole `pathToWorld` composed into one affine map -- the same path, same edges, same order, with the flagged steps inverted. For a sampled recording or a spike raster it reads `t_world = sample * period + start`, the sampling law and every clock offset multiplied out. Derived on read and stored nowhere. **Null when `pathToWorld` is null.** It errors rather than returning null when a path exists but does not condense: a FIELD step (an irregularly sampled signal, a variable-step run) has no closed form, and the error names the transformation that stopped it. Pass `strict: true` to be refused a partial map instead of handed one */
  asAffine?: Maybe<AffinePlacement>;
  blending: Blending;
  /** (AMPLITUDE) The amplitude at the top of the colormap */
  climMax?: Maybe<Scalars['Float']['output']>;
  /** (AMPLITUDE) The amplitude at the bottom of the colormap */
  climMin?: Maybe<Scalars['Float']['output']>;
  /** The base colour as RGBA, 0-255. Null lets the viewer choose */
  color?: Maybe<Scalars['RGBAColor']['output']>;
  /** The colourings this layer offers, in the order a picker should show them: columns of `unitTable` or of tables it references */
  colorBys: Array<ColorBy>;
  /** The colormap an amplitude or the active colour-by is drawn through */
  colormap?: Maybe<ColorMap>;
  experiment: Experiment;
  /** The filters this layer offers: columns of `unitTable` or of tables it references, each keeping a range or a set of values */
  filterBys: Array<FilterBy>;
  id: Scalars['ID']['output'];
  kind: ExperimentLayerKind;
  name?: Maybe<Scalars['String']['output']>;
  opacity: Scalars['Float']['output'];
  order: Scalars['Int']['output'];
  /** The path of transformation edges from this layer's source coordinate system to its experiment's world. A layer belongs to exactly one experiment, so this is the one 'to world' question with a single right answer -- the path uses the data's own facts (a lens shift, a sampling law or time lookup) plus the world's registrations and the clocks chained into it. Null when the layer is unregistered or has no source system; empty when the source already is the world. Every step is here in full, with its own validity, invariance and provenance; `asAffine` is the same path composed */
  pathToWorld?: Maybe<Array<PlacementStep>>;
  /** Whether this layer has a place on its experiment's timeline, and if not, why not. UNREGISTERED is a gap to close (nobody has related this data's clock to the world); UNMAPPABLE is a fact to badge; CONDITIONAL is a placement to ask again for with `at`. Derived, never stored */
  placement: PlacementState;
  /** Which geometric properties survive the whole walk from this layer's data to its experiment's world: the weakest edge on its path. AFFINE or stronger means a duration measured in samples is a duration on the timeline up to one factor; DIFFEOMORPHIC means the path crosses a time lookup; NONE means there is no path. Derived, never stored */
  placementInvariance: TransformInvariance;
  /** How much this layer's placement is actually known: the weakest edge on its path to world. INFERRED when it rests on a sampling law read from metadata, MANUAL once someone authored an offset, VALIDATED once it was checked, UNKNOWN when there is no path at all. Derived, never stored */
  placementValidity: PlacementValidity;
  /** Draw a firing-rate histogram at this bin width instead of a raster. Null draws the raster */
  rateBin?: Maybe<Scalars['Duration']['output']>;
  /** A column of `unitTable` the rows are ordered by (depth, channel); null keeps unit index order */
  rowOrderColumn?: Maybe<Scalars['String']['output']>;
  /** The spike raster this layer draws: a sparse dataset over (unit, t) */
  sparseDataset: SparseDataset;
  /** A spike tick's height as a fraction of its unit's row, 0 to 1 */
  tickHeight?: Maybe<Scalars['Float']['output']>;
  /** The table the raster's units are rows of: the one identifying its INDEX axis. Where every colour-by and filter-by starts. Null when no table identifies the units */
  unitTable?: Maybe<TableDataset>;
  /** What a nonzero value means: one spike (PRESENCE), or its amplitude (AMPLITUDE, drawn through `colormap`) */
  valueMode: SpikeValueMode;
  visible: Scalars['Boolean']['output'];
};


/** Spikes: a sparse dataset with a TIME axis -- a raster of units by samples, one nonzero per spike -- drawn as a tick per spike and a row per unit, or as a firing-rate histogram when `rateBin` is set. The raster is placed by its sampling law, exactly as the recording it was sorted from; a unit's colour and row order come from the table identifying the raster's unit axis (`unitTable`) */
export type SpikesLayerAsAffineArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
  strict?: Scalars['Boolean']['input'];
};


/** Spikes: a sparse dataset with a TIME axis -- a raster of units by samples, one nonzero per spike -- drawn as a tick per spike and a row per unit, or as a firing-rate histogram when `rateBin` is set. The raster is placed by its sampling law, exactly as the recording it was sorted from; a unit's colour and row order come from the table identifying the raster's unit axis (`unitTable`) */
export type SpikesLayerPathToWorldArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** Spikes: a sparse dataset with a TIME axis -- a raster of units by samples, one nonzero per spike -- drawn as a tick per spike and a row per unit, or as a firing-rate histogram when `rateBin` is set. The raster is placed by its sampling law, exactly as the recording it was sorted from; a unit's colour and row order come from the table identifying the raster's unit axis (`unitTable`) */
export type SpikesLayerPlacementArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** Spikes: a sparse dataset with a TIME axis -- a raster of units by samples, one nonzero per spike -- drawn as a tick per spike and a row per unit, or as a firing-rate histogram when `rateBin` is set. The raster is placed by its sampling law, exactly as the recording it was sorted from; a unit's colour and row order come from the table identifying the raster's unit axis (`unitTable`) */
export type SpikesLayerPlacementInvarianceArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** Spikes: a sparse dataset with a TIME axis -- a raster of units by samples, one nonzero per spike -- drawn as a tick per spike and a row per unit, or as a firing-rate histogram when `rateBin` is set. The raster is placed by its sampling law, exactly as the recording it was sorted from; a unit's colour and row order come from the table identifying the raster's unit axis (`unitTable`) */
export type SpikesLayerPlacementValidityArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};

export enum StimulusKind {
  Current = 'CURRENT',
  Unknown = 'UNKNOWN',
  Voltage = 'VOLTAGE'
}

/** The site truth, injected: where on a simulated model the anchored values were injected (NEURON's cell, section and position along it) and what was clamped. elektro's own spoke; it was the `Stimulus` row of a simulation */
export type StimulusSite = {
  __typename?: 'StimulusSite';
  /** The id of the cell, as the model config names it */
  cell?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  kind: StimulusKind;
  /** The stated label, or the site spelled out as 'cell: location(position)' */
  label: Scalars['String']['output'];
  /** The id of the section, as the model config names it */
  location?: Maybe<Scalars['String']['output']>;
  /** The normalized position along the section, 0 to 1 */
  position?: Maybe<Scalars['Float']['output']>;
};

/** Where on a model the anchored values were INJECTED: NEURON's cell, section and position along it, and what was clamped. elektro's own spoke; it replaces the `Stimulus` row of a simulation */
export type StimulusSiteInput = {
  cell?: InputMaybe<Scalars['String']['input']>;
  kind?: StimulusKind;
  label?: InputMaybe<Scalars['String']['input']>;
  location?: InputMaybe<Scalars['String']['input']>;
  position?: InputMaybe<Scalars['Float']['input']>;
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
  /** Subscribe to the array datasets of this organization, or of one of its folders, as they are created, updated and deleted */
  arrayDatasets: ArrayDatasetEvent;
  /** Subscribe to real-time file updates */
  files: FileEvent;
};


export type SubscriptionArrayDatasetsArgs = {
  folder?: InputMaybe<Scalars['ID']['input']>;
};


export type SubscriptionFilesArgs = {
  folder?: InputMaybe<Scalars['ID']['input']>;
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

/** A parquet-backed table whose rows are scientific records (segmented objects, localizations, cells). It owns a coordinate system whose axes are its coordinate columns, which is what makes a localization table placeable; a table with no coordinate columns enumerates its rows and its lineage edge is UNMAPPABLE. Its store, its columns and that coordinate system are fixed at creation -- only `name` and `description` can be updated, and a recomputation is a new table rather than an edit of this one. Read the rows directly from the Parquet store with a datalayer access grant rather than paginating through GraphQL */
export type TableDataset = {
  __typename?: 'TableDataset';
  /** The table's axis names, in order. Derived from the coordinate columns */
  axisNames: Array<Scalars['String']['output']>;
  /** The declared column schema, in order. The COORDINATE columns are the axes of this table's coordinate system */
  columns: Array<Column>;
  /** The coordinate system this table owns. Its axes are the table's coordinate columns (or a single INDEX axis for a pure measurement table) */
  coordinateSystem: CoordinateSystem;
  /** The task this table was created through, if any */
  createdThrough?: Maybe<Task>;
  /** The assigner of the creating task, if any */
  createdThroughBy?: Maybe<User>;
  /** Every edge from this table's space back into data it was computed from, in declared order -- the first is the primary parent, the one that places it. UNMAPPABLE where the lineage is recorded but no geometry is claimed; empty for a freestanding table. The same relation a derived dataset's `derivedFrom` records */
  derivedFrom: Array<Transformation>;
  description?: Maybe<Scalars['String']['output']>;
  /** The files written out of this table dataset: an OME-TIFF export, a rendered snapshot registered as a file. The mirror of `sourceFiles` */
  exports: Array<FileLink>;
  /** The folder this table dataset is filed in. Organisational only: it says where a user keeps this table, never where its rows sit in space -- that is `coordinateSystem` and the edges out of it */
  folder?: Maybe<Folder>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  /** Every change made to this table: who created it, and every subsequent rename or redescription, attributed to the client, user and task it happened under. Only `name` and `description` can change -- the store, the columns and the coordinate system derived from them are fixed at creation */
  provenanceEntries: Array<ProvenanceEntry>;
  /** How this table was produced: the run, its parameters and its inputs */
  provenanceMetadata: Scalars['Any']['output'];
  /** Every column, in any table, that declares this table as its reference target -- the reverse of `Column.references`. This table cannot be deleted while any of them exist */
  referencedBy: Array<Column>;
  /** The files this table dataset was converted from -- the CZI a converter read to write these arrays, named per series. **Read this alongside `derivedFrom`, not instead of it**: `derivedFrom` says which *data* this was computed from and relates two coordinate systems, while this says which *bytes* it was read out of and relates to no space at all, because a file has none. Both can be non-empty and complete */
  sourceFiles: Array<FileLink>;
  /** The Parquet store holding the rows. Request an access grant from it and read the Parquet directly */
  store: ParquetStore;
};


/** A parquet-backed table whose rows are scientific records (segmented objects, localizations, cells). It owns a coordinate system whose axes are its coordinate columns, which is what makes a localization table placeable; a table with no coordinate columns enumerates its rows and its lineage edge is UNMAPPABLE. Its store, its columns and that coordinate system are fixed at creation -- only `name` and `description` can be updated, and a recomputation is a new table rather than an edit of this one. Read the rows directly from the Parquet store with a datalayer access grant rather than paginating through GraphQL */
export type TableDatasetExportsArgs = {
  filters?: InputMaybe<FileLinkFilter>;
};


/** A parquet-backed table whose rows are scientific records (segmented objects, localizations, cells). It owns a coordinate system whose axes are its coordinate columns, which is what makes a localization table placeable; a table with no coordinate columns enumerates its rows and its lineage edge is UNMAPPABLE. Its store, its columns and that coordinate system are fixed at creation -- only `name` and `description` can be updated, and a recomputation is a new table rather than an edit of this one. Read the rows directly from the Parquet store with a datalayer access grant rather than paginating through GraphQL */
export type TableDatasetProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};


/** A parquet-backed table whose rows are scientific records (segmented objects, localizations, cells). It owns a coordinate system whose axes are its coordinate columns, which is what makes a localization table placeable; a table with no coordinate columns enumerates its rows and its lineage edge is UNMAPPABLE. Its store, its columns and that coordinate system are fixed at creation -- only `name` and `description` can be updated, and a recomputation is a new table rather than an edit of this one. Read the rows directly from the Parquet store with a datalayer access grant rather than paginating through GraphQL */
export type TableDatasetSourceFilesArgs = {
  filters?: InputMaybe<FileLinkFilter>;
};

/** The fields a TABLE_DATASET export link reads. Published for codegen; the wire type is the flat ExportOfInput */
export type TableDatasetExportOfInput = {
  kind?: FileLinkContainerKind;
  seriesIdentifier?: InputMaybe<Scalars['String']['input']>;
  tableDataset: Scalars['ID']['input'];
  valueRelation?: InputMaybe<ValueRelation>;
};

export type TableDatasetFilter = {
  AND?: InputMaybe<TableDatasetFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<TableDatasetFilter>;
  OR?: InputMaybe<TableDatasetFilter>;
  /** Filter by the sub of the user that assigned the creating task */
  assignedBy?: InputMaybe<Scalars['ID']['input']>;
  /** Filter for items created after this datetime */
  createdAfter?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter for items created before this datetime */
  createdBefore?: InputMaybe<Scalars['DateTime']['input']>;
  /** Filter by the database ID of the task the item was created through (the `createdThrough { id }` field) */
  createdThrough?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the database ID of the user that assigned the creating task (the `createdThroughBy { id }` field) */
  createdThroughBy?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by the rekuest task id the item was created through */
  createdThroughTask?: InputMaybe<Scalars['String']['input']>;
  /** Filter by the dataset the table was computed from, following its derivation edge */
  dataset?: InputMaybe<Scalars['ID']['input']>;
  description?: InputMaybe<StrFilterLookup>;
  /** Filter by the folder this table dataset is filed in */
  folder?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by a list of folder IDs */
  folders?: InputMaybe<Array<Scalars['ID']['input']>>;
  /** Filter to tables that declare a column of this role, e.g. LABEL */
  hasColumnRole?: InputMaybe<ColumnRole>;
  id?: InputMaybe<Scalars['ID']['input']>;
  /** Filter by list of IDs */
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  name?: InputMaybe<StrFilterLookup>;
  /** Filter by the creator's subject ID */
  owner?: InputMaybe<Scalars['ID']['input']>;
  /** Filter to table datasets placeable into this coordinate system: those whose own coordinate system reaches it across steps that compose into one affine map, walking the transformation edges */
  placeableIn?: InputMaybe<PlaceableFilter>;
  /** Search by name (case-insensitive substring) */
  search?: InputMaybe<Scalars['String']['input']>;
  /** Filter by whether the table has a TIME coordinate column -- an event or epoch list, placeable on a clock -- or none (a unit table, a measurement table). elektro's own */
  timed?: InputMaybe<Scalars['Boolean']['input']>;
};

export type TableDatasetOrder =
  { createdAt: Ordering; id?: never; name?: never; }
  |  { createdAt?: never; id: Ordering; name?: never; }
  |  { createdAt?: never; id?: never; name: Ordering; };

/** The fields a TABLE identification reads. Published for codegen; the wire type is the flat IdentificationInput */
export type TableIdentifiesInput = {
  kind?: IdentificationKind;
  table: Scalars['ID']['input'];
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

/** A trace: a lens over an array dataset, drawn as a line per channel -- a recording, a stimulus, an analog or irregularly sampled signal alike. What it shows is the lens' selection (a window, a channel range); where it sits is the path from the lens' space to the world. What was recorded where is the dataset's own `recordingSite` spokes */
export type TraceLayer = ExperimentLayer & {
  __typename?: 'TraceLayer';
  /** This layer's whole `pathToWorld` composed into one affine map -- the same path, same edges, same order, with the flagged steps inverted. For a sampled recording or a spike raster it reads `t_world = sample * period + start`, the sampling law and every clock offset multiplied out. Derived on read and stored nowhere. **Null when `pathToWorld` is null.** It errors rather than returning null when a path exists but does not condense: a FIELD step (an irregularly sampled signal, a variable-step run) has no closed form, and the error names the transformation that stopped it. Pass `strict: true` to be refused a partial map instead of handed one */
  asAffine?: Maybe<AffinePlacement>;
  blending: Blending;
  /** The one channel of the lens' CHANNEL axis to draw; null draws every channel, stacked */
  channelIndex?: Maybe<Scalars['Int']['output']>;
  /** The top of the value range, in the dataset's value unit. Null reads it from the value histogram */
  climMax?: Maybe<Scalars['Float']['output']>;
  /** The bottom of the value range, in the dataset's value unit. Null reads it from the value histogram */
  climMin?: Maybe<Scalars['Float']['output']>;
  /** The base colour as RGBA, 0-255. Null lets the viewer choose */
  color?: Maybe<Scalars['RGBAColor']['output']>;
  /** How much time this layer shows: its lens' extent along the sample axis over the sampling law's rate. Null when the dataset is timed by a lookup (a sample count is not a duration there) or on no clock at all */
  duration?: Maybe<Scalars['Duration']['output']>;
  experiment: Experiment;
  id: Scalars['ID']['output'];
  kind: ExperimentLayerKind;
  /** The selection this layer draws: a lens over the dataset. Unsliced when the layer shows everything */
  lens: Lens;
  /** Per pyramid level, the path from that level's sample grid to this experiment's world. What a client zoomed out over an hour of data reads: pick a level by zoom and use its path */
  levelPaths: Array<LevelPlacement>;
  /** The line width, in screen pixels */
  lineWidth?: Maybe<Scalars['Float']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  opacity: Scalars['Float']['output'];
  order: Scalars['Int']['output'];
  /** The path of transformation edges from this layer's source coordinate system to its experiment's world. A layer belongs to exactly one experiment, so this is the one 'to world' question with a single right answer -- the path uses the data's own facts (a lens shift, a sampling law or time lookup) plus the world's registrations and the clocks chained into it. Null when the layer is unregistered or has no source system; empty when the source already is the world. Every step is here in full, with its own validity, invariance and provenance; `asAffine` is the same path composed */
  pathToWorld?: Maybe<Array<PlacementStep>>;
  /** Whether this layer has a place on its experiment's timeline, and if not, why not. UNREGISTERED is a gap to close (nobody has related this data's clock to the world); UNMAPPABLE is a fact to badge; CONDITIONAL is a placement to ask again for with `at`. Derived, never stored */
  placement: PlacementState;
  /** Which geometric properties survive the whole walk from this layer's data to its experiment's world: the weakest edge on its path. AFFINE or stronger means a duration measured in samples is a duration on the timeline up to one factor; DIFFEOMORPHIC means the path crosses a time lookup; NONE means there is no path. Derived, never stored */
  placementInvariance: TransformInvariance;
  /** How much this layer's placement is actually known: the weakest edge on its path to world. INFERRED when it rests on a sampling law read from metadata, MANUAL once someone authored an offset, VALIDATED once it was checked, UNKNOWN when there is no path at all. Derived, never stored */
  placementValidity: PlacementValidity;
  visible: Scalars['Boolean']['output'];
};


/** A trace: a lens over an array dataset, drawn as a line per channel -- a recording, a stimulus, an analog or irregularly sampled signal alike. What it shows is the lens' selection (a window, a channel range); where it sits is the path from the lens' space to the world. What was recorded where is the dataset's own `recordingSite` spokes */
export type TraceLayerAsAffineArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
  strict?: Scalars['Boolean']['input'];
};


/** A trace: a lens over an array dataset, drawn as a line per channel -- a recording, a stimulus, an analog or irregularly sampled signal alike. What it shows is the lens' selection (a window, a channel range); where it sits is the path from the lens' space to the world. What was recorded where is the dataset's own `recordingSite` spokes */
export type TraceLayerPathToWorldArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** A trace: a lens over an array dataset, drawn as a line per channel -- a recording, a stimulus, an analog or irregularly sampled signal alike. What it shows is the lens' selection (a window, a channel range); where it sits is the path from the lens' space to the world. What was recorded where is the dataset's own `recordingSite` spokes */
export type TraceLayerPlacementArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** A trace: a lens over an array dataset, drawn as a line per channel -- a recording, a stimulus, an analog or irregularly sampled signal alike. What it shows is the lens' selection (a window, a channel range); where it sits is the path from the lens' space to the world. What was recorded where is the dataset's own `recordingSite` spokes */
export type TraceLayerPlacementInvarianceArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};


/** A trace: a lens over an array dataset, drawn as a line per channel -- a recording, a stimulus, an analog or irregularly sampled signal alike. What it shows is the lens' selection (a window, a channel range); where it sits is the path from the lens' space to the world. What was recorded where is the dataset's own `recordingSite` spokes */
export type TraceLayerPlacementValidityArgs = {
  at?: InputMaybe<Array<CoordinateInput>>;
};

/** One edge of the coordinate graph, as a discriminated union: `kind` selects a member, and only that member's fields are read -- any other supplied field is rejected, never dropped. The member inputs annotated `@unionElementOf(union: "TransformInput")` say which fields each kind reads. Direction is always forward, input -> output */
export type TransformInput = {
  /** (AFFINE, ROTATION, BY_DIMENSION) The matrix, M x (N+1), rows outermost */
  affine?: InputMaybe<Array<Array<Scalars['Float']['input']>>>;
  /** (FIELD) The coordinate system of the array whose values are the map */
  field?: InputMaybe<Scalars['ID']['input']>;
  /** (MAP_AXIS, BY_DIMENSION, FIELD) The names of the input axes the edge acts on */
  inputAxes?: InputMaybe<Array<Scalars['String']['input']>>;
  /** The kind of transformation, which fixes which of the fields below are read. Any field outside the chosen kind's member is rejected */
  kind: CreatableTransformKind;
  /** (MAP_AXIS, BY_DIMENSION, FIELD) The names of the output axes they map onto */
  outputAxes?: InputMaybe<Array<Scalars['String']['input']>>;
  /** (UNMAPPABLE) Why nothing corresponds. Purely descriptive */
  reason?: InputMaybe<Scalars['String']['input']>;
  /** (SCALE, BY_DIMENSION) The per-axis scale factors */
  scale?: InputMaybe<Array<Scalars['Float']['input']>>;
  /** (TRANSLATION, BY_DIMENSION) The per-axis offsets */
  translation?: InputMaybe<Array<Scalars['Float']['input']>>;
};

/** Which geometric properties survive a coordinate transformation. A nested hierarchy -- each class preserves strictly less than the one above it -- so the class of a composed path is the weakest of its steps. Derived from a transformation's `kind`, never stored: a column could contradict the parameters, and the parameters would be right. */
export enum TransformInvariance {
  /** Parallelism and area *ratios* transfer; angles and distances do not. A square may arrive a parallelogram, so an angle or a length read on one side means nothing on the other. Stated for every AFFINE edge, including one whose matrix happens to be rigid: telling those apart needs an SVD, which is numerics inside a metadata answer -- the same line the graph draws when it declines to catch a singular affine. */
  Affine = 'AFFINE',
  /** Topology at best, and only locally: the Jacobian varies with position, so no distance, angle, area or ratio survives anywhere. A ceiling, not a guarantee -- a FIELD is many-to-one on purpose (an object is a set of pixels), and such a map is not a diffeomorphism at all. */
  Diffeomorphic = 'DIFFEOMORPHIC',
  /** Distances, angles and areas all transfer unchanged: a length measured on one side IS that length on the other. An identity, a translation, a rotation, an axis permutation. */
  Isometry = 'ISOMETRY',
  /** Nothing corresponds. On an edge, an UNMAPPABLE: a declared non-correspondence. On a layer, no path to the world at all -- `placement` says which of the two reasons applies. */
  None = 'NONE',
  /** Angles and length *ratios* transfer; every absolute length scales by one common factor. A circle is still a circle, just a different size -- so anything dimensionless carries across untouched, and anything measured needs the one factor. */
  Similarity = 'SIMILARITY'
}

/** The kind of a coordinate transformation, discriminating how its parameters are interpreted. Direction is always forward: input -> output. */
export enum TransformKind {
  /** A general affine map, given as an M x (N+1) matrix with rows outermost. */
  Affine = 'AFFINE',
  /** A composition of child transformations, each acting on a named subset of the axes. */
  ByDimension = 'BY_DIMENSION',
  /** A non-affine map given by the values of an array rather than by a formula. The array is a `field`: a coordinate system, and so a node of this graph, not a payload on this edge. Whether its values are absolute POSITIONS or per-point OFFSETS is read from the value axis of that node -- COORDINATE or DISPLACEMENT -- never restated here. A label mask is the case where the field IS the input: its own pixels are the map. Not invertible in closed form, so a placement path never walks it backwards -- which is also the right semantics for a dereference, an object being a set of pixels. */
  Field = 'FIELD',
  /** The identity map. Input and output coordinates are the same. */
  Identity = 'IDENTITY',
  /** A permutation of axes, mapping each input axis to an output axis by name. */
  MapAxis = 'MAP_AXIS',
  /** A rotation, given as an orthonormal matrix. */
  Rotation = 'ROTATION',
  /** A per-axis multiplication. Its `scale` has one entry per input axis. */
  Scale = 'SCALE',
  /** An ordered composition of child transformations, applied first to last. */
  Sequence = 'SEQUENCE',
  /** A per-axis offset. Its `translation` has one entry per input axis. */
  Translation = 'TRANSLATION',
  /** A declared NON-correspondence: the two systems are related — one was derived from the other — and no point of either maps to a point of the other. It carries no parameters, is constrained by no rank, has no matrix, and is never walked by a placement search, in either direction. Recording an IDENTITY instead would be a lie; recording nothing would lose the lineage. */
  Unmappable = 'UNMAPPABLE'
}

/** A directed edge of the coordinate graph, mapping `input` to `output`. Direction is always forward. The concrete kind (Scale, Translation, Affine, Sequence, ...) carries the parameters */
export type Transformation = {
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  input?: Maybe<CoordinateSystem>;
  /** The names of the input axes this edge's parameters are ordered by. `scale`, `translation` and the columns of `affine` follow this order -- which is the input system's axis order, NOT the reading layer's axis names, and the two differ often enough that indexing the arrays against them silently misplaces them. A BY_DIMENSION edge names only the subset of axes it acts on; the axes it does not name are the ones it leaves untouched */
  inputAxes: Array<Scalars['String']['output']>;
  /** Which geometric properties survive this edge's map, derived from `kind`: ISOMETRY (distances, angles and areas all transfer), SIMILARITY (angles and length ratios transfer, absolute lengths scale by one common factor), AFFINE (parallelism and area ratios transfer, angles and distances do not), DIFFEOMORPHIC (topology at best, and only locally -- the Jacobian varies with position), NONE (nothing corresponds). A SEQUENCE or BY_DIMENSION is the weakest of its children. Stated by kind, never by inspecting the numbers: an AFFINE edge reads AFFINE even when its matrix happens to be rigid, because separating those needs an SVD. A layer's `placementInvariance` is the minimum of this over its whole path to world */
  invariance: TransformInvariance;
  kind: TransformKind;
  name?: Maybe<Scalars['String']['output']>;
  output?: Maybe<CoordinateSystem>;
  /** The names of the output axes this edge produces. For a rank-changing BY_DIMENSION edge (placing a (c,y,x) dataset into a (t,z,y,x) world) this is the subset it maps onto; the world's other axes are untouched */
  outputAxes: Array<Scalars['String']['output']>;
  /** Provenance entries for this edge: who authored it, and every refinement since. A refinement rewrites the edge in place, so this audit trail is where the placement's earlier states live -- and counting these rows along a chain is what `CoordinateSystem.transformVersion` reports */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Where along one axis this edge applies, or null for an edge that holds everywhere -- which is almost every edge. A per-channel correction is scoped to {axis: "c", index: 2}; several such edges over one axis are one piecewise map. A path query crosses a scoped edge only when it fixes that coordinate with `at` */
  selector?: Maybe<Selector>;
  /** How much this map is actually known: VALIDATED for a map the server derived (or one someone checked), INFERRED for numbers read from metadata, MANUAL for an authored registration, UNKNOWN for one its author marked as a guess. A layer's validity is the weakest edge on its path to world */
  validity: PlacementValidity;
  /** (derivation edges) What the operation this edge records did to the *values*, orthogonal to `kind`: IDENTICAL (a crop -- statistics transfer), TRANSFORMED (a deconvolution -- same quantity, new numbers), CATEGORIZED (a threshold -- values became labels, and a bootstrapped scene renders the data as a label map). Null when unstated, and never present on a registration -- values do not cross a claim between spaces */
  valueRelation?: Maybe<ValueRelation>;
  /** How many times this edge has been written, counting the row that created it -- so a new edge reads 1. Only comparison is meaningful: this and the edge's `id` together are the cache key for anything derived from the edge, and a change means refetch. It counts the same provenance rows `provenanceEntries` lists, so the audit trail and the token cannot disagree; a rename moves it too, which errs towards refetching something that did not change rather than trusting something that did */
  version: Scalars['Int']['output'];
};


/** A directed edge of the coordinate graph, mapping `input` to `output`. Direction is always forward. The concrete kind (Scale, Translation, Affine, Sequence, ...) carries the parameters */
export type TransformationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** The fields a TRANSLATION member of TransformInput reads. Published for codegen; the wire type is the flat TransformInput */
export type TranslationTransformInput = {
  kind?: CreatableTransformKind;
  translation: Array<Scalars['Float']['input']>;
};

/** A per-axis offset, with one entry per input axis */
export type TranslationTransformation = Transformation & {
  __typename?: 'TranslationTransformation';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  input?: Maybe<CoordinateSystem>;
  /** The names of the input axes this edge's parameters are ordered by. `scale`, `translation` and the columns of `affine` follow this order -- which is the input system's axis order, NOT the reading layer's axis names, and the two differ often enough that indexing the arrays against them silently misplaces them. A BY_DIMENSION edge names only the subset of axes it acts on; the axes it does not name are the ones it leaves untouched */
  inputAxes: Array<Scalars['String']['output']>;
  /** Which geometric properties survive this edge's map, derived from `kind`: ISOMETRY (distances, angles and areas all transfer), SIMILARITY (angles and length ratios transfer, absolute lengths scale by one common factor), AFFINE (parallelism and area ratios transfer, angles and distances do not), DIFFEOMORPHIC (topology at best, and only locally -- the Jacobian varies with position), NONE (nothing corresponds). A SEQUENCE or BY_DIMENSION is the weakest of its children. Stated by kind, never by inspecting the numbers: an AFFINE edge reads AFFINE even when its matrix happens to be rigid, because separating those needs an SVD. A layer's `placementInvariance` is the minimum of this over its whole path to world */
  invariance: TransformInvariance;
  kind: TransformKind;
  name?: Maybe<Scalars['String']['output']>;
  output?: Maybe<CoordinateSystem>;
  /** The names of the output axes this edge produces. For a rank-changing BY_DIMENSION edge (placing a (c,y,x) dataset into a (t,z,y,x) world) this is the subset it maps onto; the world's other axes are untouched */
  outputAxes: Array<Scalars['String']['output']>;
  /** Provenance entries for this edge: who authored it, and every refinement since. A refinement rewrites the edge in place, so this audit trail is where the placement's earlier states live -- and counting these rows along a chain is what `CoordinateSystem.transformVersion` reports */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Where along one axis this edge applies, or null for an edge that holds everywhere -- which is almost every edge. A per-channel correction is scoped to {axis: "c", index: 2}; several such edges over one axis are one piecewise map. A path query crosses a scoped edge only when it fixes that coordinate with `at` */
  selector?: Maybe<Selector>;
  /** The per-axis offsets, in the axis order of the input system */
  translation: Array<Scalars['Float']['output']>;
  /** How much this map is actually known: VALIDATED for a map the server derived (or one someone checked), INFERRED for numbers read from metadata, MANUAL for an authored registration, UNKNOWN for one its author marked as a guess. A layer's validity is the weakest edge on its path to world */
  validity: PlacementValidity;
  /** (derivation edges) What the operation this edge records did to the *values*, orthogonal to `kind`: IDENTICAL (a crop -- statistics transfer), TRANSFORMED (a deconvolution -- same quantity, new numbers), CATEGORIZED (a threshold -- values became labels, and a bootstrapped scene renders the data as a label map). Null when unstated, and never present on a registration -- values do not cross a claim between spaces */
  valueRelation?: Maybe<ValueRelation>;
  /** How many times this edge has been written, counting the row that created it -- so a new edge reads 1. Only comparison is meaningful: this and the edge's `id` together are the cache key for anything derived from the edge, and a change means refetch. It counts the same provenance rows `provenanceEntries` lists, so the audit trail and the token cannot disagree; a rename moves it too, which errs towards refetching something that did not change rather than trusting something that did */
  version: Scalars['Int']['output'];
};


/** A per-axis offset, with one entry per input axis */
export type TranslationTransformationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Input for deleting a file link by ID */
export type UnlinkFileInput = {
  /** The ID of the file link to delete */
  id: Scalars['ID']['input'];
};

/** The fields an UNMAPPABLE member of TransformInput reads. Published for codegen; the wire type is the flat TransformInput */
export type UnmappableTransformInput = {
  kind?: CreatableTransformKind;
  reason?: InputMaybe<Scalars['String']['input']>;
};

/** A declared NON-correspondence: the two systems are related -- one was computed from the other -- and no point of either maps to a point of the other. It has no parameters, no rank and no matrix, and no placement search will walk it, in either direction. This is what a per-object measurement table's relation to the image it was measured from looks like */
export type UnmappableTransformation = Transformation & {
  __typename?: 'UnmappableTransformation';
  createdAt: Scalars['DateTime']['output'];
  creator?: Maybe<User>;
  id: Scalars['ID']['output'];
  input?: Maybe<CoordinateSystem>;
  /** The names of the input axes this edge's parameters are ordered by. `scale`, `translation` and the columns of `affine` follow this order -- which is the input system's axis order, NOT the reading layer's axis names, and the two differ often enough that indexing the arrays against them silently misplaces them. A BY_DIMENSION edge names only the subset of axes it acts on; the axes it does not name are the ones it leaves untouched */
  inputAxes: Array<Scalars['String']['output']>;
  /** Which geometric properties survive this edge's map, derived from `kind`: ISOMETRY (distances, angles and areas all transfer), SIMILARITY (angles and length ratios transfer, absolute lengths scale by one common factor), AFFINE (parallelism and area ratios transfer, angles and distances do not), DIFFEOMORPHIC (topology at best, and only locally -- the Jacobian varies with position), NONE (nothing corresponds). A SEQUENCE or BY_DIMENSION is the weakest of its children. Stated by kind, never by inspecting the numbers: an AFFINE edge reads AFFINE even when its matrix happens to be rigid, because separating those needs an SVD. A layer's `placementInvariance` is the minimum of this over its whole path to world */
  invariance: TransformInvariance;
  kind: TransformKind;
  name?: Maybe<Scalars['String']['output']>;
  output?: Maybe<CoordinateSystem>;
  /** The names of the output axes this edge produces. For a rank-changing BY_DIMENSION edge (placing a (c,y,x) dataset into a (t,z,y,x) world) this is the subset it maps onto; the world's other axes are untouched */
  outputAxes: Array<Scalars['String']['output']>;
  /** Provenance entries for this edge: who authored it, and every refinement since. A refinement rewrites the edge in place, so this audit trail is where the placement's earlier states live -- and counting these rows along a chain is what `CoordinateSystem.transformVersion` reports */
  provenanceEntries: Array<ProvenanceEntry>;
  /** Why the geometry does not survive, if the author said. Purely descriptive: the kind is what the graph acts on, and an absent reason does not make the edge any less of a statement */
  reason?: Maybe<Scalars['String']['output']>;
  /** Where along one axis this edge applies, or null for an edge that holds everywhere -- which is almost every edge. A per-channel correction is scoped to {axis: "c", index: 2}; several such edges over one axis are one piecewise map. A path query crosses a scoped edge only when it fixes that coordinate with `at` */
  selector?: Maybe<Selector>;
  /** How much this map is actually known: VALIDATED for a map the server derived (or one someone checked), INFERRED for numbers read from metadata, MANUAL for an authored registration, UNKNOWN for one its author marked as a guess. A layer's validity is the weakest edge on its path to world */
  validity: PlacementValidity;
  /** (derivation edges) What the operation this edge records did to the *values*, orthogonal to `kind`: IDENTICAL (a crop -- statistics transfer), TRANSFORMED (a deconvolution -- same quantity, new numbers), CATEGORIZED (a threshold -- values became labels, and a bootstrapped scene renders the data as a label map). Null when unstated, and never present on a registration -- values do not cross a claim between spaces */
  valueRelation?: Maybe<ValueRelation>;
  /** How many times this edge has been written, counting the row that created it -- so a new edge reads 1. Only comparison is meaningful: this and the edge's `id` together are the cache key for anything derived from the edge, and a change means refetch. It counts the same provenance rows `provenanceEntries` lists, so the audit trail and the token cannot disagree; a rename moves it too, which errs towards refetching something that did not change rather than trusting something that did */
  version: Scalars['Int']['output'];
};


/** A declared NON-correspondence: the two systems are related -- one was computed from the other -- and no point of either maps to a point of the other. It has no parameters, no rank and no matrix, and no placement search will walk it, in either direction. This is what a per-object measurement table's relation to the image it was measured from looks like */
export type UnmappableTransformationProvenanceEntriesArgs = {
  pagination?: InputMaybe<OffsetPaginationInput>;
};

/** Input for editing an annotation. Only the supplied fields change; new vectors re-derive the bounding box against the current transform chain */
export type UpdateAnnotationInput = {
  coordinates?: InputMaybe<Array<CoordinateInput>>;
  description?: InputMaybe<Scalars['String']['input']>;
  fillColor?: InputMaybe<Array<Scalars['Int']['input']>>;
  filled?: InputMaybe<Scalars['Boolean']['input']>;
  id: Scalars['ID']['input'];
  kind?: InputMaybe<AnnotationKind>;
  name?: InputMaybe<Scalars['String']['input']>;
  strokeColor?: InputMaybe<Array<Scalars['Int']['input']>>;
  strokeWidth?: InputMaybe<Scalars['Float']['input']>;
  vectors?: InputMaybe<Array<Array<Scalars['Float']['input']>>>;
};

/** Input for renaming or redescribing a dataset. These two fields are the whole of what is editable: the arrays, the axes and the coordinate systems built from them are fixed at creation, and a recomputation is a new dataset */
export type UpdateArrayDatasetInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input for renaming a shared coordinate system or anchoring its clock. Shared spaces only: every other system is named by the container that owns it */
export type UpdateCoordinateSystemInput = {
  epoch?: InputMaybe<Scalars['DateTime']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Restyle an events layer, or point it at another table. Only the supplied fields change; a picker is replaced whole */
export type UpdateEventsLayerInput = {
  activeColorBy?: InputMaybe<Scalars['Int']['input']>;
  activeFilterBys?: InputMaybe<Array<Scalars['Int']['input']>>;
  blending?: InputMaybe<Blending>;
  color?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** The colour picker: columns of the layer's table, or of tables it references along `joinPath`. Replaces the whole picker */
  colorBys?: InputMaybe<Array<ColorByInput>>;
  colormap?: InputMaybe<ColorMap>;
  /** The filter picker: columns of the layer's table, or of tables it references along `joinPath`. Replaces the whole picker */
  filterBys?: InputMaybe<Array<FilterByInput>>;
  id: Scalars['ID']['input'];
  labelColumn?: InputMaybe<Scalars['String']['input']>;
  laneColumn?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  stopColumn?: InputMaybe<Scalars['String']['input']>;
  tableDataset?: InputMaybe<Scalars['ID']['input']>;
  visible?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Rename or redescribe an experiment. Its world is fixed: an experiment over another space is another experiment */
export type UpdateExperimentInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Restyle any layer's compositing: its name, blending, opacity, visibility and position. Its source and render settings are the per-kind update's */
export type UpdateLayerInput = {
  blending?: InputMaybe<Blending>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  visible?: InputMaybe<Scalars['Boolean']['input']>;
};

export type UpdateModelWorkspaceInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Input for renaming or redescribing a sparse dataset */
export type UpdateSparseDatasetInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Restyle a spikes layer, or point it at another raster. Only the supplied fields change; a picker is replaced whole */
export type UpdateSpikesLayerInput = {
  activeColorBy?: InputMaybe<Scalars['Int']['input']>;
  activeFilterBys?: InputMaybe<Array<Scalars['Int']['input']>>;
  blending?: InputMaybe<Blending>;
  climMax?: InputMaybe<Scalars['Float']['input']>;
  climMin?: InputMaybe<Scalars['Float']['input']>;
  color?: InputMaybe<Array<Scalars['Int']['input']>>;
  /** The colour picker: columns of the layer's table, or of tables it references along `joinPath`. Replaces the whole picker */
  colorBys?: InputMaybe<Array<ColorByInput>>;
  colormap?: InputMaybe<ColorMap>;
  /** The filter picker: columns of the layer's table, or of tables it references along `joinPath`. Replaces the whole picker */
  filterBys?: InputMaybe<Array<FilterByInput>>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  rateBin?: InputMaybe<Scalars['Duration']['input']>;
  rowOrderColumn?: InputMaybe<Scalars['String']['input']>;
  sparseDataset?: InputMaybe<Scalars['ID']['input']>;
  tickHeight?: InputMaybe<Scalars['Float']['input']>;
  valueMode?: InputMaybe<SpikeValueMode>;
  visible?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for renaming or redescribing a table dataset. These two fields are the whole of what is editable: the store, the declared columns and the coordinate system derived from them are fixed at creation, and a recomputation is a new table */
export type UpdateTableDatasetInput = {
  description?: InputMaybe<Scalars['String']['input']>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
};

/** Restyle a trace layer, or point it at another lens. Only the supplied fields change */
export type UpdateTraceLayerInput = {
  blending?: InputMaybe<Blending>;
  channelIndex?: InputMaybe<Scalars['Int']['input']>;
  climMax?: InputMaybe<Scalars['Float']['input']>;
  climMin?: InputMaybe<Scalars['Float']['input']>;
  color?: InputMaybe<Array<Scalars['Int']['input']>>;
  id: Scalars['ID']['input'];
  lens?: InputMaybe<Scalars['ID']['input']>;
  lineWidth?: InputMaybe<Scalars['Float']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  opacity?: InputMaybe<Scalars['Float']['input']>;
  order?: InputMaybe<Scalars['Int']['input']>;
  visible?: InputMaybe<Scalars['Boolean']['input']>;
};

/** Input for refining an edge's parameters. The refinement is recorded in the edge's provenance, which is what tells an ROI its chain has moved */
export type UpdateTransformationInput = {
  affine?: InputMaybe<Array<Array<Scalars['Float']['input']>>>;
  id: Scalars['ID']['input'];
  name?: InputMaybe<Scalars['String']['input']>;
  scale?: InputMaybe<Array<Scalars['Float']['input']>>;
  translation?: InputMaybe<Array<Scalars['Float']['input']>>;
  validity?: InputMaybe<PlacementValidity>;
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

/** The distribution of values pinned to a coordinate anchor, including histogram bins, min/max and percentile limits */
export type ValueHistogram = {
  __typename?: 'ValueHistogram';
  bins: Array<Scalars['Float']['output']>;
  histogram: Array<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  max?: Maybe<Scalars['Float']['output']>;
  min?: Maybe<Scalars['Float']['output']>;
  p1?: Maybe<Scalars['Float']['output']>;
  p99?: Maybe<Scalars['Float']['output']>;
};

/** Input type for a value histogram, which specifies the histogram of the values along certain dimensions, so a client can pick a display range without reading the array */
export type ValueHistogramInput = {
  /** The bin indices of the histogram (x values) */
  bins: Array<Scalars['Float']['input']>;
  /** The histogram of the values (y values) */
  histogram: Array<Scalars['Float']['input']>;
  /** The maximum value of the histogram */
  max?: InputMaybe<Scalars['Float']['input']>;
  /** The minimum value of the histogram */
  min?: InputMaybe<Scalars['Float']['input']>;
  /** The 1st percentile value of the histogram */
  p1?: InputMaybe<Scalars['Float']['input']>;
  /** The 99th percentile value of the histogram */
  p99?: InputMaybe<Scalars['Float']['input']>;
};

/** What a derivation did to the values -- the axis the spatial kind says nothing about. A threshold is spatially IDENTITY with categorized values; a crop is value-identical. Stated on the derivation edge (one event, one row, two orthogonal statements); the algorithm and its parameters belong to task provenance, not here. */
export enum ValueRelation {
  Categorized = 'CATEGORIZED',
  Identical = 'IDENTICAL',
  Transformed = 'TRANSFORMED'
}

/** The value truth: the unit of the array's values at the anchored coordinates. Anchored to no coordinate it speaks for the whole dataset; anchored to a channel, for that channel */
export type ValueUnit = {
  __typename?: 'ValueUnit';
  /** The physical dimension of the unit. Null for arbitrary units */
  dimension?: Maybe<Scalars['Dimension']['output']>;
  id: Scalars['ID']['output'];
  /** The unit of the values, e.g. 'millivolt'. 'a.u.' for arbitrary units */
  unit: Scalars['Unit']['output'];
};

/** Input type for a value unit: what the array's VALUES measure at the anchored coordinates. Not an axis unit -- an axis says where a sample is, this says what was measured there */
export type ValueUnitInput = {
  unit: Scalars['Unit']['input'];
};

/** A stretch of time on the dataset's OWN clock, e.g. the first 200 ms of a sweep. Lowered to a lens by inverting the sampling law, so it needs one */
export type WindowInput = {
  start?: InputMaybe<Scalars['Duration']['input']>;
  stop?: InputMaybe<Scalars['Duration']['input']>;
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

export type _Entity = AcquisitionMetadata | AffineTransformation | Annotation | AnnotationCollection | AnnotationLayer | App | ArrayDataset | Axis | BigFileStore | ByDimensionTransformation | ChannelLabel | Client | Column | CoordinateAnchor | CoordinateSystem | DataArray | EventsLayer | FieldTransformation | File | FileLink | Folder | IdentityTransformation | Lens | MapAxisTransformation | MediaStore | ModEnvironment | Organization | ParquetStore | RecordingSite | Release | RigState | RotationTransformation | ScaleTransformation | SequenceTransformation | SparseArray | SparseAxisReference | SparseDataset | SparseStore | SpikesLayer | StimulusSite | TableDataset | TraceLayer | TranslationTransformation | UnmappableTransformation | User | ValueHistogram | ValueUnit | ZarrStore;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type ExpAnnotationFragment = { __typename?: 'Annotation', id: string, name: string, description?: string | null, kind: AnnotationKind, vectors: Array<Array<number>>, strokeColor?: Array<number> | null, fillColor?: Array<number> | null, strokeWidth: number, filled: boolean, createdWithTransforms: number, coordinates: Array<{ __typename?: 'Coordinate', name: string, value: number }> };

export type ExpAnnotationCollectionFragment = { __typename?: 'AnnotationCollection', id: string, name: string, description?: string | null, coordinateSystem: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemFragment
  ), annotations: Array<(
    { __typename?: 'Annotation' }
    & ExpAnnotationFragment
  )> };

export type ExpDataArrayFragment = { __typename?: 'DataArray', id: string, level: number, shape: Array<number>, chunkShape: Array<number>, scaleMethod?: ScaleMethod | null, toParent?: (
    { __typename?: 'AffineTransformation' }
    & ExpTransformation_AffineTransformation_Fragment
  ) | (
    { __typename?: 'ByDimensionTransformation' }
    & ExpTransformation_ByDimensionTransformation_Fragment
  ) | (
    { __typename?: 'FieldTransformation' }
    & ExpTransformation_FieldTransformation_Fragment
  ) | (
    { __typename?: 'IdentityTransformation' }
    & ExpTransformation_IdentityTransformation_Fragment
  ) | (
    { __typename?: 'MapAxisTransformation' }
    & ExpTransformation_MapAxisTransformation_Fragment
  ) | (
    { __typename?: 'RotationTransformation' }
    & ExpTransformation_RotationTransformation_Fragment
  ) | (
    { __typename?: 'ScaleTransformation' }
    & ExpTransformation_ScaleTransformation_Fragment
  ) | (
    { __typename?: 'SequenceTransformation' }
    & ExpTransformation_SequenceTransformation_Fragment
  ) | (
    { __typename?: 'TranslationTransformation' }
    & ExpTransformation_TranslationTransformation_Fragment
  ) | (
    { __typename?: 'UnmappableTransformation' }
    & ExpTransformation_UnmappableTransformation_Fragment
  ) | null, store: (
    { __typename?: 'ZarrStore' }
    & ZarrStoreFragment
  ) };

export type ExpArrayDatasetRefFragment = { __typename?: 'ArrayDataset', id: string, name: string, description?: string | null, axisNames: Array<string>, shape: Array<number>, multiscale: boolean, valueUnit?: Unit | null, valueDimension?: Dimension | null, intrinsicSystem?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemFragment
  ) | null };

export type ExpArrayDatasetFragment = (
  { __typename?: 'ArrayDataset', dataArrays: Array<(
    { __typename?: 'DataArray' }
    & ExpDataArrayFragment
  )> }
  & ExpArrayDatasetRefFragment
);

export type ExpAnchorFragment = { __typename?: 'CoordinateAnchor', id: string, coordinates: any, channelLabel?: { __typename?: 'ChannelLabel', id: string, label: string } | null, valueUnit?: { __typename?: 'ValueUnit', id: string, unit: Unit, dimension?: Dimension | null } | null, valueHistogram?: { __typename?: 'ValueHistogram', id: string, min?: number | null, max?: number | null, p1?: number | null, p99?: number | null } | null, recordingSite?: (
    { __typename?: 'RecordingSite' }
    & ExpRecordingSiteFragment
  ) | null, stimulusSite?: (
    { __typename?: 'StimulusSite' }
    & ExpStimulusSiteFragment
  ) | null };

export type ExpRecordingSiteFragment = { __typename?: 'RecordingSite', id: string, kind: RecordingKind, cell?: string | null, location?: string | null, position?: number | null, label: string };

export type ExpStimulusSiteFragment = { __typename?: 'StimulusSite', id: string, kind: StimulusKind, cell?: string | null, location?: string | null, position?: number | null, label: string };

export type ExpLensFragment = { __typename?: 'Lens', id: string, axisNames: Array<string>, shape: Array<number>, slices: Array<{ __typename?: 'Slice', axis: string, start?: number | null, stop?: number | null, step?: number | null }>, coordinateSystem?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemFragment
  ) | null, activeAnchors: Array<(
    { __typename?: 'CoordinateAnchor' }
    & ExpAnchorFragment
  )>, dataset: (
    { __typename?: 'ArrayDataset' }
    & ExpArrayDatasetFragment
  ) };

export type ListArrayDatasetFragment = { __typename?: 'ArrayDataset', id: string, name: string, valueUnit?: Unit | null };

export type ExpAxisFragment = { __typename?: 'Axis', id: string, order: number, name: string, type: AxisType, unit?: Unit | null, longName?: string | null };

export type ExpCoordinateSystemFragment = { __typename?: 'CoordinateSystem', id: string, name: string, epoch?: any | null, axes: Array<(
    { __typename?: 'Axis' }
    & ExpAxisFragment
  )> };

export type ExpCoordinateSystemRefFragment = { __typename?: 'CoordinateSystem', id: string, name: string };

type ExpTransformationLeaf_AffineTransformation_Fragment = { __typename: 'AffineTransformation', affine: Array<Array<number>>, id: string, kind: TransformKind, name?: string | null, version: number, validity: PlacementValidity, invariance: TransformInvariance, inputAxes: Array<string>, outputAxes: Array<string>, selector?: { __typename?: 'Selector', axis: string, index: number } | null, input?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null, output?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null };

type ExpTransformationLeaf_ByDimensionTransformation_Fragment = { __typename: 'ByDimensionTransformation', id: string, kind: TransformKind, name?: string | null, version: number, validity: PlacementValidity, invariance: TransformInvariance, inputAxes: Array<string>, outputAxes: Array<string>, selector?: { __typename?: 'Selector', axis: string, index: number } | null, input?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null, output?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null };

type ExpTransformationLeaf_FieldTransformation_Fragment = { __typename: 'FieldTransformation', id: string, kind: TransformKind, name?: string | null, version: number, validity: PlacementValidity, invariance: TransformInvariance, inputAxes: Array<string>, outputAxes: Array<string>, field?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null, selector?: { __typename?: 'Selector', axis: string, index: number } | null, input?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null, output?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null };

type ExpTransformationLeaf_IdentityTransformation_Fragment = { __typename: 'IdentityTransformation', id: string, kind: TransformKind, name?: string | null, version: number, validity: PlacementValidity, invariance: TransformInvariance, inputAxes: Array<string>, outputAxes: Array<string>, selector?: { __typename?: 'Selector', axis: string, index: number } | null, input?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null, output?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null };

type ExpTransformationLeaf_MapAxisTransformation_Fragment = { __typename: 'MapAxisTransformation', id: string, kind: TransformKind, name?: string | null, version: number, validity: PlacementValidity, invariance: TransformInvariance, inputAxes: Array<string>, outputAxes: Array<string>, selector?: { __typename?: 'Selector', axis: string, index: number } | null, input?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null, output?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null };

type ExpTransformationLeaf_RotationTransformation_Fragment = { __typename: 'RotationTransformation', id: string, kind: TransformKind, name?: string | null, version: number, validity: PlacementValidity, invariance: TransformInvariance, inputAxes: Array<string>, outputAxes: Array<string>, selector?: { __typename?: 'Selector', axis: string, index: number } | null, input?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null, output?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null };

type ExpTransformationLeaf_ScaleTransformation_Fragment = { __typename: 'ScaleTransformation', scale: Array<number>, id: string, kind: TransformKind, name?: string | null, version: number, validity: PlacementValidity, invariance: TransformInvariance, inputAxes: Array<string>, outputAxes: Array<string>, selector?: { __typename?: 'Selector', axis: string, index: number } | null, input?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null, output?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null };

type ExpTransformationLeaf_SequenceTransformation_Fragment = { __typename: 'SequenceTransformation', id: string, kind: TransformKind, name?: string | null, version: number, validity: PlacementValidity, invariance: TransformInvariance, inputAxes: Array<string>, outputAxes: Array<string>, selector?: { __typename?: 'Selector', axis: string, index: number } | null, input?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null, output?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null };

type ExpTransformationLeaf_TranslationTransformation_Fragment = { __typename: 'TranslationTransformation', translation: Array<number>, id: string, kind: TransformKind, name?: string | null, version: number, validity: PlacementValidity, invariance: TransformInvariance, inputAxes: Array<string>, outputAxes: Array<string>, selector?: { __typename?: 'Selector', axis: string, index: number } | null, input?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null, output?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null };

type ExpTransformationLeaf_UnmappableTransformation_Fragment = { __typename: 'UnmappableTransformation', id: string, kind: TransformKind, name?: string | null, version: number, validity: PlacementValidity, invariance: TransformInvariance, inputAxes: Array<string>, outputAxes: Array<string>, selector?: { __typename?: 'Selector', axis: string, index: number } | null, input?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null, output?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemRefFragment
  ) | null };

export type ExpTransformationLeafFragment = ExpTransformationLeaf_AffineTransformation_Fragment | ExpTransformationLeaf_ByDimensionTransformation_Fragment | ExpTransformationLeaf_FieldTransformation_Fragment | ExpTransformationLeaf_IdentityTransformation_Fragment | ExpTransformationLeaf_MapAxisTransformation_Fragment | ExpTransformationLeaf_RotationTransformation_Fragment | ExpTransformationLeaf_ScaleTransformation_Fragment | ExpTransformationLeaf_SequenceTransformation_Fragment | ExpTransformationLeaf_TranslationTransformation_Fragment | ExpTransformationLeaf_UnmappableTransformation_Fragment;

type ExpTransformation_AffineTransformation_Fragment = (
  { __typename?: 'AffineTransformation' }
  & ExpTransformationLeaf_AffineTransformation_Fragment
);

type ExpTransformation_ByDimensionTransformation_Fragment = (
  { __typename?: 'ByDimensionTransformation', transformations: Array<(
    { __typename?: 'AffineTransformation' }
    & ExpTransformationLeaf_AffineTransformation_Fragment
  ) | (
    { __typename?: 'ByDimensionTransformation' }
    & ExpTransformationLeaf_ByDimensionTransformation_Fragment
  ) | (
    { __typename?: 'FieldTransformation' }
    & ExpTransformationLeaf_FieldTransformation_Fragment
  ) | (
    { __typename?: 'IdentityTransformation' }
    & ExpTransformationLeaf_IdentityTransformation_Fragment
  ) | (
    { __typename?: 'MapAxisTransformation' }
    & ExpTransformationLeaf_MapAxisTransformation_Fragment
  ) | (
    { __typename?: 'RotationTransformation' }
    & ExpTransformationLeaf_RotationTransformation_Fragment
  ) | (
    { __typename?: 'ScaleTransformation' }
    & ExpTransformationLeaf_ScaleTransformation_Fragment
  ) | (
    { __typename?: 'SequenceTransformation' }
    & ExpTransformationLeaf_SequenceTransformation_Fragment
  ) | (
    { __typename?: 'TranslationTransformation' }
    & ExpTransformationLeaf_TranslationTransformation_Fragment
  ) | (
    { __typename?: 'UnmappableTransformation' }
    & ExpTransformationLeaf_UnmappableTransformation_Fragment
  )> }
  & ExpTransformationLeaf_ByDimensionTransformation_Fragment
);

type ExpTransformation_FieldTransformation_Fragment = (
  { __typename?: 'FieldTransformation' }
  & ExpTransformationLeaf_FieldTransformation_Fragment
);

type ExpTransformation_IdentityTransformation_Fragment = (
  { __typename?: 'IdentityTransformation' }
  & ExpTransformationLeaf_IdentityTransformation_Fragment
);

type ExpTransformation_MapAxisTransformation_Fragment = (
  { __typename?: 'MapAxisTransformation' }
  & ExpTransformationLeaf_MapAxisTransformation_Fragment
);

type ExpTransformation_RotationTransformation_Fragment = (
  { __typename?: 'RotationTransformation' }
  & ExpTransformationLeaf_RotationTransformation_Fragment
);

type ExpTransformation_ScaleTransformation_Fragment = (
  { __typename?: 'ScaleTransformation' }
  & ExpTransformationLeaf_ScaleTransformation_Fragment
);

type ExpTransformation_SequenceTransformation_Fragment = (
  { __typename?: 'SequenceTransformation', transformations: Array<(
    { __typename?: 'AffineTransformation' }
    & ExpTransformationLeaf_AffineTransformation_Fragment
  ) | (
    { __typename?: 'ByDimensionTransformation' }
    & ExpTransformationLeaf_ByDimensionTransformation_Fragment
  ) | (
    { __typename?: 'FieldTransformation' }
    & ExpTransformationLeaf_FieldTransformation_Fragment
  ) | (
    { __typename?: 'IdentityTransformation' }
    & ExpTransformationLeaf_IdentityTransformation_Fragment
  ) | (
    { __typename?: 'MapAxisTransformation' }
    & ExpTransformationLeaf_MapAxisTransformation_Fragment
  ) | (
    { __typename?: 'RotationTransformation' }
    & ExpTransformationLeaf_RotationTransformation_Fragment
  ) | (
    { __typename?: 'ScaleTransformation' }
    & ExpTransformationLeaf_ScaleTransformation_Fragment
  ) | (
    { __typename?: 'SequenceTransformation' }
    & ExpTransformationLeaf_SequenceTransformation_Fragment
  ) | (
    { __typename?: 'TranslationTransformation' }
    & ExpTransformationLeaf_TranslationTransformation_Fragment
  ) | (
    { __typename?: 'UnmappableTransformation' }
    & ExpTransformationLeaf_UnmappableTransformation_Fragment
  )> }
  & ExpTransformationLeaf_SequenceTransformation_Fragment
);

type ExpTransformation_TranslationTransformation_Fragment = (
  { __typename?: 'TranslationTransformation' }
  & ExpTransformationLeaf_TranslationTransformation_Fragment
);

type ExpTransformation_UnmappableTransformation_Fragment = (
  { __typename?: 'UnmappableTransformation' }
  & ExpTransformationLeaf_UnmappableTransformation_Fragment
);

export type ExpTransformationFragment = ExpTransformation_AffineTransformation_Fragment | ExpTransformation_ByDimensionTransformation_Fragment | ExpTransformation_FieldTransformation_Fragment | ExpTransformation_IdentityTransformation_Fragment | ExpTransformation_MapAxisTransformation_Fragment | ExpTransformation_RotationTransformation_Fragment | ExpTransformation_ScaleTransformation_Fragment | ExpTransformation_SequenceTransformation_Fragment | ExpTransformation_TranslationTransformation_Fragment | ExpTransformation_UnmappableTransformation_Fragment;

export type ExpPlacementStepFragment = { __typename?: 'PlacementStep', inverted: boolean, transformation: (
    { __typename?: 'AffineTransformation' }
    & ExpTransformation_AffineTransformation_Fragment
  ) | (
    { __typename?: 'ByDimensionTransformation' }
    & ExpTransformation_ByDimensionTransformation_Fragment
  ) | (
    { __typename?: 'FieldTransformation' }
    & ExpTransformation_FieldTransformation_Fragment
  ) | (
    { __typename?: 'IdentityTransformation' }
    & ExpTransformation_IdentityTransformation_Fragment
  ) | (
    { __typename?: 'MapAxisTransformation' }
    & ExpTransformation_MapAxisTransformation_Fragment
  ) | (
    { __typename?: 'RotationTransformation' }
    & ExpTransformation_RotationTransformation_Fragment
  ) | (
    { __typename?: 'ScaleTransformation' }
    & ExpTransformation_ScaleTransformation_Fragment
  ) | (
    { __typename?: 'SequenceTransformation' }
    & ExpTransformation_SequenceTransformation_Fragment
  ) | (
    { __typename?: 'TranslationTransformation' }
    & ExpTransformation_TranslationTransformation_Fragment
  ) | (
    { __typename?: 'UnmappableTransformation' }
    & ExpTransformation_UnmappableTransformation_Fragment
  ) };

export type ExpAffinePlacementFragment = { __typename?: 'AffinePlacement', matrix: Array<Array<number>>, inputAxes: Array<string>, outputAxes: Array<string>, total: boolean };

export type BigFileAccessGrantFragment = { __typename?: 'BigFileAccessGrant', accessKey: string, secretKey: string, sessionToken: string, expiresIn: number, path: string, key: string, bucket: string };

export type ModEnvironmentFragment = { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<(
    { __typename?: 'Mechanism' }
    & MechanismFragment
  )> };

export type ListModEnvironmentFragment = { __typename?: 'ModEnvironment', id: string, name: string, description?: string | null, mechanisms: Array<(
    { __typename?: 'Mechanism' }
    & MechanismFragment
  )> };

type ExpLayerCommon_AnnotationLayer_Fragment = { __typename: 'AnnotationLayer', id: string, kind: ExperimentLayerKind, name?: string | null, blending: Blending, opacity: number, visible: boolean, order: number, placement: PlacementState, placementValidity: PlacementValidity, placementInvariance: TransformInvariance, asAffine?: (
    { __typename?: 'AffinePlacement' }
    & ExpAffinePlacementFragment
  ) | null, pathToWorld?: Array<(
    { __typename?: 'PlacementStep' }
    & ExpPlacementStepFragment
  )> | null };

type ExpLayerCommon_EventsLayer_Fragment = { __typename: 'EventsLayer', id: string, kind: ExperimentLayerKind, name?: string | null, blending: Blending, opacity: number, visible: boolean, order: number, placement: PlacementState, placementValidity: PlacementValidity, placementInvariance: TransformInvariance, asAffine?: (
    { __typename?: 'AffinePlacement' }
    & ExpAffinePlacementFragment
  ) | null, pathToWorld?: Array<(
    { __typename?: 'PlacementStep' }
    & ExpPlacementStepFragment
  )> | null };

type ExpLayerCommon_SpikesLayer_Fragment = { __typename: 'SpikesLayer', id: string, kind: ExperimentLayerKind, name?: string | null, blending: Blending, opacity: number, visible: boolean, order: number, placement: PlacementState, placementValidity: PlacementValidity, placementInvariance: TransformInvariance, asAffine?: (
    { __typename?: 'AffinePlacement' }
    & ExpAffinePlacementFragment
  ) | null, pathToWorld?: Array<(
    { __typename?: 'PlacementStep' }
    & ExpPlacementStepFragment
  )> | null };

type ExpLayerCommon_TraceLayer_Fragment = { __typename: 'TraceLayer', id: string, kind: ExperimentLayerKind, name?: string | null, blending: Blending, opacity: number, visible: boolean, order: number, placement: PlacementState, placementValidity: PlacementValidity, placementInvariance: TransformInvariance, asAffine?: (
    { __typename?: 'AffinePlacement' }
    & ExpAffinePlacementFragment
  ) | null, pathToWorld?: Array<(
    { __typename?: 'PlacementStep' }
    & ExpPlacementStepFragment
  )> | null };

export type ExpLayerCommonFragment = ExpLayerCommon_AnnotationLayer_Fragment | ExpLayerCommon_EventsLayer_Fragment | ExpLayerCommon_SpikesLayer_Fragment | ExpLayerCommon_TraceLayer_Fragment;

export type ExpColorByFragment = { __typename?: 'ColorBy', kind: string, table: string, column: string, colormap?: ColorMap | null, min?: number | null, max?: number | null, label?: string | null, joinPath: Array<{ __typename?: 'JoinStep', table: string, column: string }> };

export type ExpFilterByFragment = { __typename?: 'FilterBy', kind: string, table: string, column: string, min?: number | null, max?: number | null, values?: Array<string> | null, exclude: boolean, label?: string | null, joinPath: Array<{ __typename?: 'JoinStep', table: string, column: string }> };

export type ExpTraceLayerFragment = (
  { __typename?: 'TraceLayer', channelIndex?: number | null, climMin?: number | null, climMax?: number | null, lineWidth?: number | null, color?: RGBAColor | null, duration?: Duration | null, lens: (
    { __typename?: 'Lens' }
    & ExpLensFragment
  ) }
  & ExpLayerCommon_TraceLayer_Fragment
);

export type ExpSpikesLayerFragment = (
  { __typename?: 'SpikesLayer', tickHeight?: number | null, rowOrderColumn?: string | null, valueMode: SpikeValueMode, rateBin?: Duration | null, colormap?: ColorMap | null, climMin?: number | null, climMax?: number | null, color?: RGBAColor | null, activeColorBy?: number | null, activeFilterBys: Array<number>, sparseDataset: (
    { __typename?: 'SparseDataset' }
    & ExpSparseDatasetFragment
  ), colorBys: Array<(
    { __typename?: 'ColorBy' }
    & ExpColorByFragment
  )>, filterBys: Array<(
    { __typename?: 'FilterBy' }
    & ExpFilterByFragment
  )>, unitTable?: (
    { __typename?: 'TableDataset' }
    & ExpTableDatasetFragment
  ) | null }
  & ExpLayerCommon_SpikesLayer_Fragment
);

export type ExpEventsLayerFragment = (
  { __typename?: 'EventsLayer', timeColumn?: string | null, stopColumn?: string | null, labelColumn?: string | null, laneColumn?: string | null, colormap?: ColorMap | null, color?: RGBAColor | null, activeColorBy?: number | null, activeFilterBys: Array<number>, tableDataset: (
    { __typename?: 'TableDataset' }
    & ExpTableDatasetFragment
  ), colorBys: Array<(
    { __typename?: 'ColorBy' }
    & ExpColorByFragment
  )>, filterBys: Array<(
    { __typename?: 'FilterBy' }
    & ExpFilterByFragment
  )> }
  & ExpLayerCommon_EventsLayer_Fragment
);

export type ExpAnnotationLayerFragment = (
  { __typename?: 'AnnotationLayer', annotationCollection: (
    { __typename?: 'AnnotationCollection' }
    & ExpAnnotationCollectionFragment
  ) }
  & ExpLayerCommon_AnnotationLayer_Fragment
);

export type ExperimentSceneFragment = { __typename?: 'Experiment', id: string, name: string, description?: string | null, createdAt: any, pinned: boolean, creator?: { __typename?: 'User', sub: string } | null, world?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemFragment
  ) | null, annotationCollection?: { __typename?: 'AnnotationCollection', id: string } | null, layers: Array<(
    { __typename?: 'AnnotationLayer' }
    & ExpAnnotationLayerFragment
  ) | (
    { __typename?: 'EventsLayer' }
    & ExpEventsLayerFragment
  ) | (
    { __typename?: 'SpikesLayer' }
    & ExpSpikesLayerFragment
  ) | (
    { __typename?: 'TraceLayer' }
    & ExpTraceLayerFragment
  )> };

export type ListExperimentFragment = { __typename?: 'Experiment', id: string, name: string, description?: string | null, createdAt: any, pinned: boolean };

export type FileFragment = { __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, folder?: (
    { __typename?: 'Folder' }
    & ListFolderFragment
  ) | null, store: (
    { __typename?: 'BigFileStore' }
    & BigFileStoreFragment
  ), provenanceEntries: Array<(
    { __typename?: 'ProvenanceEntry' }
    & ProvenanceEntryFragment
  )> };

export type ListFileFragment = { __typename?: 'File', id: string, name: string, size?: number | null, contentType?: string | null, creator: { __typename?: 'User', sub: string } };

export type FolderFragment = { __typename?: 'Folder', id: string, name: string, description?: string | null, isDefault: boolean, pinned: boolean, createdAt: any, tags: Array<string>, provenanceEntries: Array<(
    { __typename?: 'ProvenanceEntry' }
    & ProvenanceEntryFragment
  )>, arrayDatasets: Array<(
    { __typename?: 'ArrayDataset' }
    & ListArrayDatasetFragment
  )>, files: Array<(
    { __typename?: 'File' }
    & ListFileFragment
  )>, sparseDatasets: Array<(
    { __typename?: 'SparseDataset' }
    & ListSparseDatasetFragment
  )>, tableDatasets: Array<(
    { __typename?: 'TableDataset' }
    & ListTableDatasetFragment
  )>, children: Array<(
    { __typename?: 'Folder' }
    & ListFolderFragment
  )>, parent?: (
    { __typename?: 'Folder' }
    & ListFolderFragment
  ) | null, creator?: { __typename?: 'User', sub: string } | null };

export type ListFolderFragment = { __typename?: 'Folder', id: string, name: string, description?: string | null, isDefault: boolean };

export type ParameterFragment = { __typename?: 'Parameter', key: string, label?: string | null, kind: ParameterKind, description?: string | null, default?: any | null, nullable: boolean, referenceUnit?: Unit | null, proposedUnits?: Array<Unit> | null, dimension?: Dimension | null };

export type MechanismFragment = { __typename?: 'Mechanism', id: string, name: string, description?: string | null, parameters: Array<(
    { __typename?: 'Parameter' }
    & ParameterFragment
  )> };

export type ListMechanismFragment = { __typename?: 'Mechanism', id: string, name: string, parameters: Array<(
    { __typename?: 'Parameter' }
    & ParameterFragment
  )> };

export type ModelCollectionFragment = { __typename?: 'ModelCollection', id: string, name: string, models: Array<(
    { __typename?: 'NeuronModel' }
    & ListNeuronModelFragment
  )> };

export type ListModelCollectionFragment = { __typename?: 'ModelCollection', id: string, name: string };

export type ListModelWorkspaceFragment = { __typename?: 'ModelWorkspace', id: string, name: string, pinned: boolean };

export type WorkspaceMappingFragment = { __typename?: 'WorkspaceMapping', id: string, workspaceGroup: string, model: (
    { __typename?: 'NeuronModel' }
    & ListNeuronModelFragment
  ) };

export type DetailModelWorkspaceFragment = { __typename?: 'ModelWorkspace', id: string, name: string, description?: string | null, pinned: boolean, mappings: Array<(
    { __typename?: 'WorkspaceMapping' }
    & WorkspaceMappingFragment
  )> };

export type CoordFragment = { __typename?: 'Coord', x: Length, y: Length, z: Length };

export type SectionFragment = { __typename?: 'Section', id: string, diam: Length, length?: Length | null, category?: string | null, nseg: number, ra?: Resistivity | null, cm?: SpecificCapacitance | null, dLambda?: number | null, coords?: Array<(
    { __typename?: 'Coord' }
    & CoordFragment
  )> | null, parent?: (
    { __typename?: 'Connection' }
    & ConnectionFragment
  ) | null };

export type ConnectionFragment = { __typename?: 'Connection', parent: string, parentLocation: number, childEnd: number };

export type SectionDominanceFragment = { __typename?: 'SectionDominance', cellId: string, sectionId: string, category?: string | null, globalScore: number, conductanceLoad: number, electrotonicDistance: number };

export type IonFragment = { __typename?: 'Ion', ion: string, style: IonStyle, reversalPotential?: ElectricPotential | null, internalConcentration?: Concentration | null, externalConcentration?: Concentration | null };

export type MechanismGlobalParamFragment = { __typename?: 'MechanismGlobalParam', mechanism: string, param: string, value: GenericQuantity, description?: string | null };

export type CompartmentFragment = { __typename?: 'Compartment', id: string, color?: RGBAColor | null, mechanisms: Array<string>, ions: Array<(
    { __typename?: 'Ion' }
    & IonFragment
  )>, sectionParams: Array<{ __typename?: 'SectionParamMap', mechanism: string, param: string, description?: string | null, distribution: { __typename?: 'Distribution', value?: GenericQuantity | null } }> };

export type ProvenanceEntryFragment = { __typename?: 'ProvenanceEntry', id: string, kind: HistoryKind, date: any, task?: { __typename?: 'Task', id: string, taskId: string, assigner?: { __typename?: 'User', sub: string } | null } | null, user?: { __typename?: 'User', sub: string } | null, client?: { __typename?: 'Client', clientId: string } | null, effectiveChanges: Array<{ __typename?: 'ModelChange', field: string }> };

export type DetailNeuronModelFragment = { __typename?: 'NeuronModel', id: string, name: string, description?: string | null, config: { __typename?: 'ModelConfig', temperature: Temperature, vInit: ElectricPotential, label?: string | null, ra?: Resistivity | null, cm?: SpecificCapacitance | null, ions: Array<(
      { __typename?: 'Ion' }
      & IonFragment
    )>, mechanismGlobals: Array<(
      { __typename?: 'MechanismGlobalParam' }
      & MechanismGlobalParamFragment
    )>, cells: Array<{ __typename?: 'Cell', id: string, biophysics: { __typename?: 'Biophysics', compartments: Array<(
          { __typename?: 'Compartment' }
          & CompartmentFragment
        )> }, topology: { __typename?: 'Topology', sections: Array<(
          { __typename?: 'Section' }
          & SectionFragment
        )> } }>, netSynapses?: Array<{ __typename?: 'Exp2Synapse', tau1: Duration, tau2: Duration, e: ElectricPotential, delay?: Duration | null, id: string, cell: string, location: string, position: number }> | null, netStimulators?: Array<{ __typename?: 'NetStimulator', id: string, interval?: Duration | null, number: number, start: Duration }> | null, netConnections?: Array<{ __typename?: 'SynapticConnection', netStimulator: string, synapse: string, id: string, delay?: Duration | null, weight?: ElectricalConductance | null, threshold?: ElectricPotential | null }> | null }, sectionDominance: Array<(
    { __typename?: 'SectionDominance' }
    & SectionDominanceFragment
  )>, comparisons: Array<{ __typename?: 'Comparison', collection: { __typename?: 'ModelCollection', id: string, name: string }, changes: Array<{ __typename?: 'Change', type: ChangeType, path: Array<string>, valueA?: any | null, valueB?: any | null }> }>, simulations: Array<(
    { __typename?: 'Simulation' }
    & ListSimulationFragment
  )>, environment: (
    { __typename?: 'ModEnvironment' }
    & ModEnvironmentFragment
  ), provenanceEntries: Array<(
    { __typename?: 'ProvenanceEntry' }
    & ProvenanceEntryFragment
  )> };

export type ListNeuronModelFragment = { __typename?: 'NeuronModel', id: string, name: string };

export type DetailSimulationFragment = { __typename?: 'Simulation', id: string, name: string, description?: string | null, duration: Duration, dt?: Duration | null, samplingRate?: Frequency | null, createdAt: any, model: (
    { __typename?: 'NeuronModel' }
    & DetailNeuronModelFragment
  ), clock?: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemFragment
  ) | null, timeDataset?: (
    { __typename?: 'ArrayDataset' }
    & ExpArrayDatasetRefFragment
  ) | null, recordings: Array<(
    { __typename?: 'ArrayDataset' }
    & SimulationTraceFragment
  )>, stimuli: Array<(
    { __typename?: 'ArrayDataset' }
    & SimulationTraceFragment
  )>, creator?: { __typename?: 'User', sub: string } | null };

export type SimulationTraceFragment = (
  { __typename?: 'ArrayDataset', anchors: Array<(
    { __typename?: 'CoordinateAnchor' }
    & ExpAnchorFragment
  )> }
  & ExpArrayDatasetRefFragment
);

export type ListSimulationFragment = { __typename?: 'Simulation', id: string, name: string, duration: Duration, dt?: Duration | null, createdAt: any, creator?: { __typename?: 'User', sub: string } | null, model: { __typename?: 'NeuronModel', id: string, name: string } };

export type ExpSparseLayoutFragment = { __typename?: 'SparseLayout', path: string, encoding: string, indexedAxis: number, indexOrder: Array<number>, nnz: number, dtype: string, rangeReadable: boolean };

export type ExpSparseDatasetFragment = { __typename?: 'SparseDataset', id: string, name: string, axisNames: Array<string>, shape: Array<number>, indexableAxes: Array<string>, coordinateSystem: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemFragment
  ), arrays: Array<{ __typename?: 'SparseArray', id: string, path: string, indexedAxis: number, indexedAxisName?: string | null, store: { __typename?: 'SparseStore', id: string, bucket: string, key: string, path: string, spec?: string | null, shape?: Array<number> | null, layouts: Array<(
        { __typename?: 'SparseLayout' }
        & ExpSparseLayoutFragment
      )> } }>, axisReferences: Array<{ __typename?: 'SparseAxisReference', id: string, axis: string, references: (
      { __typename?: 'TableDataset' }
      & ExpTableDatasetFragment
    ) }> };

export type ListSparseDatasetFragment = { __typename?: 'SparseDataset', id: string, name: string, axisNames: Array<string>, shape: Array<number> };

export type ZarrStoreFragment = { __typename?: 'ZarrStore', id: string, key: string, bucket: string, path: string, shape: Array<number>, dtype?: string | null };

export type BigFileStoreFragment = { __typename?: 'BigFileStore', id: string, key: string, bucket: string, path: string };

export type ExpColumnFragment = { __typename?: 'Column', id: string, order: number, name: string, dtype: string, role: ColumnRole, axisType?: AxisType | null, unit?: Unit | null, longName?: string | null, references?: { __typename?: 'TableDataset', id: string, name: string } | null };

export type ExpTableDatasetFragment = { __typename?: 'TableDataset', id: string, name: string, axisNames: Array<string>, store: { __typename?: 'ParquetStore', id: string, bucket: string, key: string, path: string }, coordinateSystem: (
    { __typename?: 'CoordinateSystem' }
    & ExpCoordinateSystemFragment
  ), columns: Array<(
    { __typename?: 'Column' }
    & ExpColumnFragment
  )> };

export type ListTableDatasetFragment = { __typename?: 'TableDataset', id: string, name: string, axisNames: Array<string> };

export type GeneralSparseAccessGrantFragment = { __typename?: 'GeneralSparseAccessGrant', accessKey: string, secretKey: string, sessionToken: string, expiresIn: number, region: string, bucket: string };

export type RequestGeneralSparseAccessMutationVariables = Exact<{
  input: RequestGeneralSparseAccessInput;
}>;


export type RequestGeneralSparseAccessMutation = { __typename?: 'Mutation', requestGeneralSparseAccess: (
    { __typename?: 'GeneralSparseAccessGrant' }
    & GeneralSparseAccessGrantFragment
  ) };

export type ParquetAccessGrantFragment = { __typename?: 'ParquetAccessGrant', accessKey: string, secretKey: string, sessionToken: string, expiresIn: number, region: string, bucket: string, key: string, path: string };

export type RequestParquetAccessMutationVariables = Exact<{
  input: RequestParquetAccessInput;
}>;


export type RequestParquetAccessMutation = { __typename?: 'Mutation', requestParquetAccess: (
    { __typename?: 'ParquetAccessGrant' }
    & ParquetAccessGrantFragment
  ) };

export type GeneralParquetAccessGrantFragment = { __typename?: 'GeneralParquetAccessGrant', accessKey: string, secretKey: string, sessionToken: string, expiresIn: number, region: string, bucket: string };

export type RequestGeneralParquetAccessMutationVariables = Exact<{
  input: RequestGeneralParquetAccessInput;
}>;


export type RequestGeneralParquetAccessMutation = { __typename?: 'Mutation', requestGeneralParquetAccess: (
    { __typename?: 'GeneralParquetAccessGrant' }
    & GeneralParquetAccessGrantFragment
  ) };

export type CreateExperimentAnnotationMutationVariables = Exact<{
  input: CreateAnnotationInput;
}>;


export type CreateExperimentAnnotationMutation = { __typename?: 'Mutation', createAnnotation: (
    { __typename?: 'Annotation' }
    & ExpAnnotationFragment
  ) };

export type DeleteExperimentAnnotationMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteExperimentAnnotationMutation = { __typename?: 'Mutation', deleteAnnotation: string };

export type FinishBigfileUploadMutationVariables = Exact<{
  input: FinishBigFileUploadInput;
}>;


export type FinishBigfileUploadMutation = { __typename?: 'Mutation', finishBigfileUpload: (
    { __typename?: 'BigFileStore' }
    & BigFileStoreFragment
  ) };

export type RequestBigfileAccessMutationVariables = Exact<{
  input: RequestBigFileAccessInput;
}>;


export type RequestBigfileAccessMutation = { __typename?: 'Mutation', requestBigfileAccess: (
    { __typename?: 'BigFileAccessGrant' }
    & BigFileAccessGrantFragment
  ) };

export type CreateExperimentMutationVariables = Exact<{
  input: CreateExperimentInput;
}>;


export type CreateExperimentMutation = { __typename?: 'Mutation', createExperiment: (
    { __typename?: 'Experiment', world?: { __typename?: 'CoordinateSystem', id: string } | null }
    & ListExperimentFragment
  ) };

export type CreateExperimentFromCoordinateSystemMutationVariables = Exact<{
  input: CreateExperimentFromCoordinateSystemInput;
}>;


export type CreateExperimentFromCoordinateSystemMutation = { __typename?: 'Mutation', createExperimentFromCoordinateSystem: (
    { __typename?: 'Experiment' }
    & ListExperimentFragment
  ) };

export type UpdateExperimentMutationVariables = Exact<{
  input: UpdateExperimentInput;
}>;


export type UpdateExperimentMutation = { __typename?: 'Mutation', updateExperiment: { __typename?: 'Experiment', id: string, name: string, description?: string | null } };

export type DeleteExperimentMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteExperimentMutation = { __typename?: 'Mutation', deleteExperiment: string };

export type From_File_LikeMutationVariables = Exact<{
  file: Scalars['FileLike']['input'];
  fileName: Scalars['String']['input'];
  folder?: InputMaybe<Scalars['ID']['input']>;
  exportOf?: InputMaybe<Array<ExportOfInput> | ExportOfInput>;
}>;


export type From_File_LikeMutation = { __typename?: 'Mutation', fromFileLike: (
    { __typename?: 'File' }
    & FileFragment
  ) };

export type DeleteFileMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteFileMutation = { __typename?: 'Mutation', deleteFile: string };

export type CreateFolderMutationVariables = Exact<{
  input: CreateFolderInput;
}>;


export type CreateFolderMutation = { __typename?: 'Mutation', createFolder: { __typename?: 'Folder', id: string, name: string } };

export type EnsureFolderMutationVariables = Exact<{
  input: CreateFolderInput;
}>;


export type EnsureFolderMutation = { __typename?: 'Mutation', ensureFolder: { __typename?: 'Folder', id: string, name: string } };

export type UpdateFolderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  name: Scalars['String']['input'];
  parent?: InputMaybe<Scalars['ID']['input']>;
}>;


export type UpdateFolderMutation = { __typename?: 'Mutation', updateFolder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type PinFolderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  pin: Scalars['Boolean']['input'];
}>;


export type PinFolderMutation = { __typename?: 'Mutation', pinFolder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type PutFoldersInFolderMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type PutFoldersInFolderMutation = { __typename?: 'Mutation', putFoldersInFolder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type ReleaseFoldersFromFolderMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type ReleaseFoldersFromFolderMutation = { __typename?: 'Mutation', releaseFoldersFromFolder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type PutArrayDatasetsInFolderMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type PutArrayDatasetsInFolderMutation = { __typename?: 'Mutation', putArrayDatasetsInFolder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type ReleaseArrayDatasetsFromFolderMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type ReleaseArrayDatasetsFromFolderMutation = { __typename?: 'Mutation', releaseArrayDatasetsFromFolder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type PutFilesInFolderMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type PutFilesInFolderMutation = { __typename?: 'Mutation', putFilesInFolder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type ReleaseFilesFromFolderMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type ReleaseFilesFromFolderMutation = { __typename?: 'Mutation', releaseFilesFromFolder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type PutTableDatasetsInFolderMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type PutTableDatasetsInFolderMutation = { __typename?: 'Mutation', putTableDatasetsInFolder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type ReleaseTableDatasetsFromFolderMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type ReleaseTableDatasetsFromFolderMutation = { __typename?: 'Mutation', releaseTableDatasetsFromFolder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type PutSparseDatasetsInFolderMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type PutSparseDatasetsInFolderMutation = { __typename?: 'Mutation', putSparseDatasetsInFolder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type ReleaseSparseDatasetsFromFolderMutationVariables = Exact<{
  selfs: Array<Scalars['ID']['input']> | Scalars['ID']['input'];
  other: Scalars['ID']['input'];
}>;


export type ReleaseSparseDatasetsFromFolderMutation = { __typename?: 'Mutation', releaseSparseDatasetsFromFolder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type RevertFolderMutationVariables = Exact<{
  folder: Scalars['ID']['input'];
  history: Scalars['ID']['input'];
}>;


export type RevertFolderMutation = { __typename?: 'Mutation', revertFolder: { __typename?: 'Folder', id: string, name: string, description?: string | null } };

export type DeleteFolderMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteFolderMutation = { __typename?: 'Mutation', deleteFolder: string };

export type CreateTraceLayerMutationVariables = Exact<{
  input: CreateTraceLayerInput;
}>;


export type CreateTraceLayerMutation = { __typename?: 'Mutation', createTraceLayer: (
    { __typename?: 'TraceLayer' }
    & ExpTraceLayerFragment
  ) };

export type CreateSpikesLayerMutationVariables = Exact<{
  input: CreateSpikesLayerInput;
}>;


export type CreateSpikesLayerMutation = { __typename?: 'Mutation', createSpikesLayer: (
    { __typename?: 'SpikesLayer' }
    & ExpSpikesLayerFragment
  ) };

export type CreateEventsLayerMutationVariables = Exact<{
  input: CreateEventsLayerInput;
}>;


export type CreateEventsLayerMutation = { __typename?: 'Mutation', createEventsLayer: (
    { __typename?: 'EventsLayer' }
    & ExpEventsLayerFragment
  ) };

export type CreateAnnotationLayerMutationVariables = Exact<{
  input: CreateAnnotationLayerInput;
}>;


export type CreateAnnotationLayerMutation = { __typename?: 'Mutation', createAnnotationLayer: (
    { __typename?: 'AnnotationLayer' }
    & ExpAnnotationLayerFragment
  ) };

export type UpdateLayerMutationVariables = Exact<{
  input: UpdateLayerInput;
}>;


export type UpdateLayerMutation = { __typename?: 'Mutation', updateLayer: { __typename: 'AnnotationLayer', id: string, name?: string | null, blending: Blending, opacity: number, visible: boolean, order: number } | { __typename: 'EventsLayer', id: string, name?: string | null, blending: Blending, opacity: number, visible: boolean, order: number } | { __typename: 'SpikesLayer', id: string, name?: string | null, blending: Blending, opacity: number, visible: boolean, order: number } | { __typename: 'TraceLayer', id: string, name?: string | null, blending: Blending, opacity: number, visible: boolean, order: number } };

export type UpdateTraceLayerMutationVariables = Exact<{
  input: UpdateTraceLayerInput;
}>;


export type UpdateTraceLayerMutation = { __typename?: 'Mutation', updateTraceLayer: { __typename?: 'TraceLayer', id: string, name?: string | null, blending: Blending, opacity: number, visible: boolean, order: number, channelIndex?: number | null, climMin?: number | null, climMax?: number | null, lineWidth?: number | null, color?: RGBAColor | null } };

export type UpdateSpikesLayerMutationVariables = Exact<{
  input: UpdateSpikesLayerInput;
}>;


export type UpdateSpikesLayerMutation = { __typename?: 'Mutation', updateSpikesLayer: { __typename?: 'SpikesLayer', id: string, name?: string | null, blending: Blending, opacity: number, visible: boolean, order: number, tickHeight?: number | null, rowOrderColumn?: string | null, valueMode: SpikeValueMode, rateBin?: Duration | null, colormap?: ColorMap | null, climMin?: number | null, climMax?: number | null, color?: RGBAColor | null, activeColorBy?: number | null, activeFilterBys: Array<number>, colorBys: Array<(
      { __typename?: 'ColorBy' }
      & ExpColorByFragment
    )>, filterBys: Array<(
      { __typename?: 'FilterBy' }
      & ExpFilterByFragment
    )> } };

export type UpdateEventsLayerMutationVariables = Exact<{
  input: UpdateEventsLayerInput;
}>;


export type UpdateEventsLayerMutation = { __typename?: 'Mutation', updateEventsLayer: { __typename?: 'EventsLayer', id: string, name?: string | null, blending: Blending, opacity: number, visible: boolean, order: number, stopColumn?: string | null, labelColumn?: string | null, laneColumn?: string | null, colormap?: ColorMap | null, color?: RGBAColor | null, activeColorBy?: number | null, activeFilterBys: Array<number>, colorBys: Array<(
      { __typename?: 'ColorBy' }
      & ExpColorByFragment
    )>, filterBys: Array<(
      { __typename?: 'FilterBy' }
      & ExpFilterByFragment
    )> } };

export type DeleteLayerMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DeleteLayerMutation = { __typename?: 'Mutation', deleteLayer: string };

export type CreateSamplingLawMutationVariables = Exact<{
  input: CreateSamplingLawInput;
}>;


export type CreateSamplingLawMutation = { __typename?: 'Mutation', createSamplingLaw: (
    { __typename?: 'AffineTransformation' }
    & ExpTransformation_AffineTransformation_Fragment
  ) | (
    { __typename?: 'ByDimensionTransformation' }
    & ExpTransformation_ByDimensionTransformation_Fragment
  ) | (
    { __typename?: 'FieldTransformation' }
    & ExpTransformation_FieldTransformation_Fragment
  ) | (
    { __typename?: 'IdentityTransformation' }
    & ExpTransformation_IdentityTransformation_Fragment
  ) | (
    { __typename?: 'MapAxisTransformation' }
    & ExpTransformation_MapAxisTransformation_Fragment
  ) | (
    { __typename?: 'RotationTransformation' }
    & ExpTransformation_RotationTransformation_Fragment
  ) | (
    { __typename?: 'ScaleTransformation' }
    & ExpTransformation_ScaleTransformation_Fragment
  ) | (
    { __typename?: 'SequenceTransformation' }
    & ExpTransformation_SequenceTransformation_Fragment
  ) | (
    { __typename?: 'TranslationTransformation' }
    & ExpTransformation_TranslationTransformation_Fragment
  ) | (
    { __typename?: 'UnmappableTransformation' }
    & ExpTransformation_UnmappableTransformation_Fragment
  ) };

export type CreateClockOffsetMutationVariables = Exact<{
  input: CreateClockOffsetInput;
}>;


export type CreateClockOffsetMutation = { __typename?: 'Mutation', createClockOffset: (
    { __typename?: 'AffineTransformation' }
    & ExpTransformation_AffineTransformation_Fragment
  ) | (
    { __typename?: 'ByDimensionTransformation' }
    & ExpTransformation_ByDimensionTransformation_Fragment
  ) | (
    { __typename?: 'FieldTransformation' }
    & ExpTransformation_FieldTransformation_Fragment
  ) | (
    { __typename?: 'IdentityTransformation' }
    & ExpTransformation_IdentityTransformation_Fragment
  ) | (
    { __typename?: 'MapAxisTransformation' }
    & ExpTransformation_MapAxisTransformation_Fragment
  ) | (
    { __typename?: 'RotationTransformation' }
    & ExpTransformation_RotationTransformation_Fragment
  ) | (
    { __typename?: 'ScaleTransformation' }
    & ExpTransformation_ScaleTransformation_Fragment
  ) | (
    { __typename?: 'SequenceTransformation' }
    & ExpTransformation_SequenceTransformation_Fragment
  ) | (
    { __typename?: 'TranslationTransformation' }
    & ExpTransformation_TranslationTransformation_Fragment
  ) | (
    { __typename?: 'UnmappableTransformation' }
    & ExpTransformation_UnmappableTransformation_Fragment
  ) };

export type CreateModelWorkspaceMutationVariables = Exact<{
  input: CreateModelWorkspaceInput;
}>;


export type CreateModelWorkspaceMutation = { __typename?: 'Mutation', createModelWorkspace: (
    { __typename?: 'ModelWorkspace' }
    & DetailModelWorkspaceFragment
  ) };

export type AddModelsToWorkspaceMutationVariables = Exact<{
  input: AddModelsToWorkspaceInput;
}>;


export type AddModelsToWorkspaceMutation = { __typename?: 'Mutation', addModelsToWorkspace: (
    { __typename?: 'ModelWorkspace' }
    & DetailModelWorkspaceFragment
  ) };

export type RemoveModelsFromWorkspaceMutationVariables = Exact<{
  input: DesociateInput;
}>;


export type RemoveModelsFromWorkspaceMutation = { __typename?: 'Mutation', removeModelsFromWorkspace: (
    { __typename?: 'ModelWorkspace' }
    & DetailModelWorkspaceFragment
  ) };

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


export type RequestGeneralZarrAccessMutation = { __typename?: 'Mutation', requestGeneralZarrAccess: (
    { __typename?: 'GeneralZarrAccessGrant' }
    & GeneralZarrAccessGrantFragment
  ) };

export type DetailModEnvironmentQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailModEnvironmentQuery = { __typename?: 'Query', modEnvironment: (
    { __typename?: 'ModEnvironment' }
    & ModEnvironmentFragment
  ) };

export type ListModEnvironmentsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ModEnvironmentFilter>;
  ordering?: InputMaybe<Array<ModEnvironmentOrder> | ModEnvironmentOrder>;
}>;


export type ListModEnvironmentsQuery = { __typename?: 'Query', modEnvironments: Array<(
    { __typename?: 'ModEnvironment' }
    & ListModEnvironmentFragment
  )> };

export type GetExperimentSceneQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetExperimentSceneQuery = { __typename?: 'Query', experiment: (
    { __typename?: 'Experiment' }
    & ExperimentSceneFragment
  ) };

export type ListExperimentsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ExperimentFilter>;
  ordering?: InputMaybe<Array<ExperimentOrder> | ExperimentOrder>;
}>;


export type ListExperimentsQuery = { __typename?: 'Query', experiments: Array<(
    { __typename?: 'Experiment' }
    & ListExperimentFragment
  )> };

export type GetFileQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetFileQuery = { __typename?: 'Query', file: (
    { __typename?: 'File' }
    & FileFragment
  ) };

export type GetFilesQueryVariables = Exact<{
  filters?: InputMaybe<FileFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
  ordering?: InputMaybe<Array<FileOrder> | FileOrder>;
}>;


export type GetFilesQuery = { __typename?: 'Query', files: Array<(
    { __typename?: 'File' }
    & ListFileFragment
  )> };

export type GetFolderQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetFolderQuery = { __typename?: 'Query', folder: (
    { __typename?: 'Folder' }
    & FolderFragment
  ) };

export type GetFoldersQueryVariables = Exact<{
  filters?: InputMaybe<FolderFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
  ordering?: InputMaybe<Array<FolderOrder> | FolderOrder>;
}>;


export type GetFoldersQuery = { __typename?: 'Query', folders: Array<(
    { __typename?: 'Folder' }
    & ListFolderFragment
  )> };

export type GetMyFoldersQueryVariables = Exact<{
  filters?: InputMaybe<FolderFilter>;
  pagination?: InputMaybe<OffsetPaginationInput>;
  ordering?: InputMaybe<Array<FolderOrder> | FolderOrder>;
}>;


export type GetMyFoldersQuery = { __typename?: 'Query', myfolders: Array<(
    { __typename?: 'Folder' }
    & ListFolderFragment
  )> };

export type HomePageQueryVariables = Exact<{ [key: string]: never; }>;


export type HomePageQuery = { __typename?: 'Query', experiments: Array<(
    { __typename?: 'Experiment' }
    & ListExperimentFragment
  )>, simulations: Array<(
    { __typename?: 'Simulation' }
    & ListSimulationFragment
  )>, models: Array<(
    { __typename?: 'NeuronModel' }
    & ListNeuronModelFragment
  )> };

export type DetailMechanismQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailMechanismQuery = { __typename?: 'Query', mechanism: (
    { __typename?: 'Mechanism' }
    & MechanismFragment
  ) };

export type ListMechanismsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<MechanismFilter>;
  ordering?: InputMaybe<Array<MechanismOrder> | MechanismOrder>;
}>;


export type ListMechanismsQuery = { __typename?: 'Query', mechanisms: Array<(
    { __typename?: 'Mechanism' }
    & ListMechanismFragment
  )> };

export type DetailModelCollectionQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailModelCollectionQuery = { __typename?: 'Query', modelCollection: (
    { __typename?: 'ModelCollection' }
    & ModelCollectionFragment
  ) };

export type ListModelCollectionsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ModelCollectionFilter>;
  ordering?: InputMaybe<Array<ModelCollectionOrder> | ModelCollectionOrder>;
}>;


export type ListModelCollectionsQuery = { __typename?: 'Query', modelCollections: Array<(
    { __typename?: 'ModelCollection' }
    & ListModelCollectionFragment
  )> };

export type DetailModelWorkspaceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailModelWorkspaceQuery = { __typename?: 'Query', modelWorkspace: (
    { __typename?: 'ModelWorkspace' }
    & DetailModelWorkspaceFragment
  ) };

export type ListModelWorkspacesQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<ModelWorkspaceFilter>;
  ordering?: InputMaybe<Array<ModelWorkspaceOrder> | ModelWorkspaceOrder>;
}>;


export type ListModelWorkspacesQuery = { __typename?: 'Query', modelWorkspaces: Array<(
    { __typename?: 'ModelWorkspace' }
    & ListModelWorkspaceFragment
  )> };

export type DetailNeuronModelQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailNeuronModelQuery = { __typename?: 'Query', neuronModel: (
    { __typename?: 'NeuronModel' }
    & DetailNeuronModelFragment
  ) };

export type SectionDominanceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
  weightAxial?: InputMaybe<Scalars['Float']['input']>;
  weightCapacitance?: InputMaybe<Scalars['Float']['input']>;
  weightConductance?: InputMaybe<Scalars['Float']['input']>;
}>;


export type SectionDominanceQuery = { __typename?: 'Query', neuronModel: { __typename?: 'NeuronModel', id: string, sectionDominance: Array<(
      { __typename?: 'SectionDominance' }
      & SectionDominanceFragment
    )> } };

export type ListNeuronModelsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<NeuronModelFilter>;
  ordering?: InputMaybe<Array<NeuronModelOrder> | NeuronModelOrder>;
}>;


export type ListNeuronModelsQuery = { __typename?: 'Query', neuronModels: Array<(
    { __typename?: 'NeuronModel' }
    & ListNeuronModelFragment
  )> };

export type LayerPickerArrayDatasetsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type LayerPickerArrayDatasetsQuery = { __typename?: 'Query', arrayDatasets: Array<(
    { __typename?: 'ArrayDataset', axisNames: Array<string>, shape: Array<number> }
    & ListArrayDatasetFragment
  )> };

export type LayerPickerSparseDatasetsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type LayerPickerSparseDatasetsQuery = { __typename?: 'Query', sparseDatasets: Array<(
    { __typename?: 'SparseDataset' }
    & ListSparseDatasetFragment
  )> };

export type LayerPickerTableDatasetsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type LayerPickerTableDatasetsQuery = { __typename?: 'Query', tableDatasets: Array<(
    { __typename?: 'TableDataset' }
    & ListTableDatasetFragment
  )> };

export type LayerPickerAnnotationCollectionsQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type LayerPickerAnnotationCollectionsQuery = { __typename?: 'Query', annotationCollections: Array<{ __typename?: 'AnnotationCollection', id: string, name: string }> };

export type GetTableDatasetQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTableDatasetQuery = { __typename?: 'Query', tableDataset: (
    { __typename?: 'TableDataset' }
    & ExpTableDatasetFragment
  ) };

export type PlacementContextQueryVariables = Exact<{
  system: Scalars['ID']['input'];
}>;


export type PlacementContextQuery = { __typename?: 'Query', coordinateSystem: { __typename?: 'CoordinateSystem', id: string, name: string, axes: Array<{ __typename?: 'Axis', name: string, type: AxisType, unit?: Unit | null }>, registrations: Array<{ __typename?: 'AffineTransformation', id: string, kind: TransformKind, input?: { __typename?: 'CoordinateSystem', id: string } | null, output?: { __typename?: 'CoordinateSystem', id: string, name: string, axes: Array<{ __typename?: 'Axis', name: string, type: AxisType, unit?: Unit | null }> } | null } | { __typename?: 'ByDimensionTransformation', id: string, kind: TransformKind, input?: { __typename?: 'CoordinateSystem', id: string } | null, output?: { __typename?: 'CoordinateSystem', id: string, name: string, axes: Array<{ __typename?: 'Axis', name: string, type: AxisType, unit?: Unit | null }> } | null } | { __typename?: 'FieldTransformation', id: string, kind: TransformKind, input?: { __typename?: 'CoordinateSystem', id: string } | null, output?: { __typename?: 'CoordinateSystem', id: string, name: string, axes: Array<{ __typename?: 'Axis', name: string, type: AxisType, unit?: Unit | null }> } | null } | { __typename?: 'IdentityTransformation', id: string, kind: TransformKind, input?: { __typename?: 'CoordinateSystem', id: string } | null, output?: { __typename?: 'CoordinateSystem', id: string, name: string, axes: Array<{ __typename?: 'Axis', name: string, type: AxisType, unit?: Unit | null }> } | null } | { __typename?: 'MapAxisTransformation', id: string, kind: TransformKind, input?: { __typename?: 'CoordinateSystem', id: string } | null, output?: { __typename?: 'CoordinateSystem', id: string, name: string, axes: Array<{ __typename?: 'Axis', name: string, type: AxisType, unit?: Unit | null }> } | null } | { __typename?: 'RotationTransformation', id: string, kind: TransformKind, input?: { __typename?: 'CoordinateSystem', id: string } | null, output?: { __typename?: 'CoordinateSystem', id: string, name: string, axes: Array<{ __typename?: 'Axis', name: string, type: AxisType, unit?: Unit | null }> } | null } | { __typename?: 'ScaleTransformation', id: string, kind: TransformKind, input?: { __typename?: 'CoordinateSystem', id: string } | null, output?: { __typename?: 'CoordinateSystem', id: string, name: string, axes: Array<{ __typename?: 'Axis', name: string, type: AxisType, unit?: Unit | null }> } | null } | { __typename?: 'SequenceTransformation', id: string, kind: TransformKind, input?: { __typename?: 'CoordinateSystem', id: string } | null, output?: { __typename?: 'CoordinateSystem', id: string, name: string, axes: Array<{ __typename?: 'Axis', name: string, type: AxisType, unit?: Unit | null }> } | null } | { __typename?: 'TranslationTransformation', id: string, kind: TransformKind, input?: { __typename?: 'CoordinateSystem', id: string } | null, output?: { __typename?: 'CoordinateSystem', id: string, name: string, axes: Array<{ __typename?: 'Axis', name: string, type: AxisType, unit?: Unit | null }> } | null } | { __typename?: 'UnmappableTransformation', id: string, kind: TransformKind, input?: { __typename?: 'CoordinateSystem', id: string } | null, output?: { __typename?: 'CoordinateSystem', id: string, name: string, axes: Array<{ __typename?: 'Axis', name: string, type: AxisType, unit?: Unit | null }> } | null }> } };

export type ClockPickerQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ClockPickerQuery = { __typename?: 'Query', coordinateSystems: Array<{ __typename?: 'CoordinateSystem', id: string, name: string, axes: Array<{ __typename?: 'Axis', name: string, type: AxisType, unit?: Unit | null }> }> };

export type GlobalSearchQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type GlobalSearchQuery = { __typename?: 'Query', arrayDatasets: Array<(
    { __typename?: 'ArrayDataset' }
    & ListArrayDatasetFragment
  )>, experiments: Array<(
    { __typename?: 'Experiment' }
    & ListExperimentFragment
  )>, simulations: Array<(
    { __typename?: 'Simulation' }
    & ListSimulationFragment
  )> };

export type DetailSimulationQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DetailSimulationQuery = { __typename?: 'Query', simulation: (
    { __typename?: 'Simulation' }
    & DetailSimulationFragment
  ) };

export type ListSimulationsQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
  filters?: InputMaybe<SimulationFilter>;
  ordering?: InputMaybe<Array<SimulationOrder> | SimulationOrder>;
}>;


export type ListSimulationsQuery = { __typename?: 'Query', simulations: Array<(
    { __typename?: 'Simulation' }
    & ListSimulationFragment
  )> };

export type SimulationClockQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type SimulationClockQuery = { __typename?: 'Query', simulation: { __typename?: 'Simulation', id: string, name: string, clock?: { __typename?: 'CoordinateSystem', id: string } | null } };

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
export const ExpAxisFragmentDoc = gql`
    fragment ExpAxis on Axis {
  id
  order
  name
  type
  unit
  longName
}
    `;
export const ExpCoordinateSystemFragmentDoc = gql`
    fragment ExpCoordinateSystem on CoordinateSystem {
  id
  name
  epoch
  axes {
    ...ExpAxis
  }
}
    ${ExpAxisFragmentDoc}`;
export const ExpAffinePlacementFragmentDoc = gql`
    fragment ExpAffinePlacement on AffinePlacement {
  matrix
  inputAxes
  outputAxes
  total
}
    `;
export const ExpCoordinateSystemRefFragmentDoc = gql`
    fragment ExpCoordinateSystemRef on CoordinateSystem {
  id
  name
}
    `;
export const ExpTransformationLeafFragmentDoc = gql`
    fragment ExpTransformationLeaf on Transformation {
  __typename
  id
  kind
  name
  version
  validity
  invariance
  inputAxes
  outputAxes
  selector {
    axis
    index
  }
  input {
    ...ExpCoordinateSystemRef
  }
  output {
    ...ExpCoordinateSystemRef
  }
  ... on AffineTransformation {
    affine
  }
  ... on ScaleTransformation {
    scale
  }
  ... on TranslationTransformation {
    translation
  }
  ... on FieldTransformation {
    field {
      ...ExpCoordinateSystemRef
    }
  }
}
    ${ExpCoordinateSystemRefFragmentDoc}`;
export const ExpTransformationFragmentDoc = gql`
    fragment ExpTransformation on Transformation {
  ...ExpTransformationLeaf
  ... on SequenceTransformation {
    transformations {
      ...ExpTransformationLeaf
    }
  }
  ... on ByDimensionTransformation {
    transformations {
      ...ExpTransformationLeaf
    }
  }
}
    ${ExpTransformationLeafFragmentDoc}`;
export const ExpPlacementStepFragmentDoc = gql`
    fragment ExpPlacementStep on PlacementStep {
  inverted
  transformation {
    ...ExpTransformation
  }
}
    ${ExpTransformationFragmentDoc}`;
export const ExpLayerCommonFragmentDoc = gql`
    fragment ExpLayerCommon on ExperimentLayer {
  __typename
  id
  kind
  name
  blending
  opacity
  visible
  order
  placement
  placementValidity
  placementInvariance
  asAffine {
    ...ExpAffinePlacement
  }
  pathToWorld {
    ...ExpPlacementStep
  }
}
    ${ExpAffinePlacementFragmentDoc}
${ExpPlacementStepFragmentDoc}`;
export const ExpRecordingSiteFragmentDoc = gql`
    fragment ExpRecordingSite on RecordingSite {
  id
  kind
  cell
  location
  position
  label
}
    `;
export const ExpStimulusSiteFragmentDoc = gql`
    fragment ExpStimulusSite on StimulusSite {
  id
  kind
  cell
  location
  position
  label
}
    `;
export const ExpAnchorFragmentDoc = gql`
    fragment ExpAnchor on CoordinateAnchor {
  id
  coordinates
  channelLabel {
    id
    label
  }
  valueUnit {
    id
    unit
    dimension
  }
  valueHistogram {
    id
    min
    max
    p1
    p99
  }
  recordingSite {
    ...ExpRecordingSite
  }
  stimulusSite {
    ...ExpStimulusSite
  }
}
    ${ExpRecordingSiteFragmentDoc}
${ExpStimulusSiteFragmentDoc}`;
export const ExpArrayDatasetRefFragmentDoc = gql`
    fragment ExpArrayDatasetRef on ArrayDataset {
  id
  name
  description
  axisNames
  shape
  multiscale
  valueUnit
  valueDimension
  intrinsicSystem {
    ...ExpCoordinateSystem
  }
}
    ${ExpCoordinateSystemFragmentDoc}`;
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
export const ExpDataArrayFragmentDoc = gql`
    fragment ExpDataArray on DataArray {
  id
  level
  shape
  chunkShape
  scaleMethod
  toParent {
    ...ExpTransformation
  }
  store {
    ...ZarrStore
  }
}
    ${ExpTransformationFragmentDoc}
${ZarrStoreFragmentDoc}`;
export const ExpArrayDatasetFragmentDoc = gql`
    fragment ExpArrayDataset on ArrayDataset {
  ...ExpArrayDatasetRef
  dataArrays {
    ...ExpDataArray
  }
}
    ${ExpArrayDatasetRefFragmentDoc}
${ExpDataArrayFragmentDoc}`;
export const ExpLensFragmentDoc = gql`
    fragment ExpLens on Lens {
  id
  axisNames
  shape
  slices {
    axis
    start
    stop
    step
  }
  coordinateSystem {
    ...ExpCoordinateSystem
  }
  activeAnchors {
    ...ExpAnchor
  }
  dataset {
    ...ExpArrayDataset
  }
}
    ${ExpCoordinateSystemFragmentDoc}
${ExpAnchorFragmentDoc}
${ExpArrayDatasetFragmentDoc}`;
export const ExpTraceLayerFragmentDoc = gql`
    fragment ExpTraceLayer on TraceLayer {
  ...ExpLayerCommon
  lens {
    ...ExpLens
  }
  channelIndex
  climMin
  climMax
  lineWidth
  color
  duration
}
    ${ExpLayerCommonFragmentDoc}
${ExpLensFragmentDoc}`;
export const ExpSparseLayoutFragmentDoc = gql`
    fragment ExpSparseLayout on SparseLayout {
  path
  encoding
  indexedAxis
  indexOrder
  nnz
  dtype
  rangeReadable
}
    `;
export const ExpColumnFragmentDoc = gql`
    fragment ExpColumn on Column {
  id
  order
  name
  dtype
  role
  axisType
  unit
  longName
  references {
    id
    name
  }
}
    `;
export const ExpTableDatasetFragmentDoc = gql`
    fragment ExpTableDataset on TableDataset {
  id
  name
  axisNames
  store {
    id
    bucket
    key
    path
  }
  coordinateSystem {
    ...ExpCoordinateSystem
  }
  columns {
    ...ExpColumn
  }
}
    ${ExpCoordinateSystemFragmentDoc}
${ExpColumnFragmentDoc}`;
export const ExpSparseDatasetFragmentDoc = gql`
    fragment ExpSparseDataset on SparseDataset {
  id
  name
  axisNames
  shape
  indexableAxes
  coordinateSystem {
    ...ExpCoordinateSystem
  }
  arrays {
    id
    path
    indexedAxis
    indexedAxisName
    store {
      id
      bucket
      key
      path
      spec
      shape
      layouts {
        ...ExpSparseLayout
      }
    }
  }
  axisReferences {
    id
    axis
    references {
      ...ExpTableDataset
    }
  }
}
    ${ExpCoordinateSystemFragmentDoc}
${ExpSparseLayoutFragmentDoc}
${ExpTableDatasetFragmentDoc}`;
export const ExpColorByFragmentDoc = gql`
    fragment ExpColorBy on ColorBy {
  kind
  table
  column
  joinPath {
    table
    column
  }
  colormap
  min
  max
  label
}
    `;
export const ExpFilterByFragmentDoc = gql`
    fragment ExpFilterBy on FilterBy {
  kind
  table
  column
  joinPath {
    table
    column
  }
  min
  max
  values
  exclude
  label
}
    `;
export const ExpSpikesLayerFragmentDoc = gql`
    fragment ExpSpikesLayer on SpikesLayer {
  ...ExpLayerCommon
  sparseDataset {
    ...ExpSparseDataset
  }
  tickHeight
  rowOrderColumn
  valueMode
  rateBin
  colormap
  climMin
  climMax
  color
  activeColorBy
  activeFilterBys
  colorBys {
    ...ExpColorBy
  }
  filterBys {
    ...ExpFilterBy
  }
  unitTable {
    ...ExpTableDataset
  }
}
    ${ExpLayerCommonFragmentDoc}
${ExpSparseDatasetFragmentDoc}
${ExpColorByFragmentDoc}
${ExpFilterByFragmentDoc}
${ExpTableDatasetFragmentDoc}`;
export const ExpEventsLayerFragmentDoc = gql`
    fragment ExpEventsLayer on EventsLayer {
  ...ExpLayerCommon
  tableDataset {
    ...ExpTableDataset
  }
  timeColumn
  stopColumn
  labelColumn
  laneColumn
  colormap
  color
  activeColorBy
  activeFilterBys
  colorBys {
    ...ExpColorBy
  }
  filterBys {
    ...ExpFilterBy
  }
}
    ${ExpLayerCommonFragmentDoc}
${ExpTableDatasetFragmentDoc}
${ExpColorByFragmentDoc}
${ExpFilterByFragmentDoc}`;
export const ExpAnnotationFragmentDoc = gql`
    fragment ExpAnnotation on Annotation {
  id
  name
  description
  kind
  vectors
  coordinates {
    name
    value
  }
  strokeColor
  fillColor
  strokeWidth
  filled
  createdWithTransforms
}
    `;
export const ExpAnnotationCollectionFragmentDoc = gql`
    fragment ExpAnnotationCollection on AnnotationCollection {
  id
  name
  description
  coordinateSystem {
    ...ExpCoordinateSystem
  }
  annotations {
    ...ExpAnnotation
  }
}
    ${ExpCoordinateSystemFragmentDoc}
${ExpAnnotationFragmentDoc}`;
export const ExpAnnotationLayerFragmentDoc = gql`
    fragment ExpAnnotationLayer on AnnotationLayer {
  ...ExpLayerCommon
  annotationCollection {
    ...ExpAnnotationCollection
  }
}
    ${ExpLayerCommonFragmentDoc}
${ExpAnnotationCollectionFragmentDoc}`;
export const ExperimentSceneFragmentDoc = gql`
    fragment ExperimentScene on Experiment {
  id
  name
  description
  createdAt
  pinned
  creator {
    sub
  }
  world {
    ...ExpCoordinateSystem
  }
  annotationCollection {
    id
  }
  layers {
    ...ExpTraceLayer
    ...ExpSpikesLayer
    ...ExpEventsLayer
    ...ExpAnnotationLayer
  }
}
    ${ExpCoordinateSystemFragmentDoc}
${ExpTraceLayerFragmentDoc}
${ExpSpikesLayerFragmentDoc}
${ExpEventsLayerFragmentDoc}
${ExpAnnotationLayerFragmentDoc}`;
export const ListExperimentFragmentDoc = gql`
    fragment ListExperiment on Experiment {
  id
  name
  description
  createdAt
  pinned
}
    `;
export const ListFolderFragmentDoc = gql`
    fragment ListFolder on Folder {
  id
  name
  description
  isDefault
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
export const FileFragmentDoc = gql`
    fragment File on File {
  id
  name
  size
  contentType
  folder {
    ...ListFolder
  }
  store {
    ...BigFileStore
  }
  provenanceEntries {
    ...ProvenanceEntry
  }
}
    ${ListFolderFragmentDoc}
${BigFileStoreFragmentDoc}
${ProvenanceEntryFragmentDoc}`;
export const ListArrayDatasetFragmentDoc = gql`
    fragment ListArrayDataset on ArrayDataset {
  id
  name
  valueUnit
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
export const ListSparseDatasetFragmentDoc = gql`
    fragment ListSparseDataset on SparseDataset {
  id
  name
  axisNames
  shape
}
    `;
export const ListTableDatasetFragmentDoc = gql`
    fragment ListTableDataset on TableDataset {
  id
  name
  axisNames
}
    `;
export const FolderFragmentDoc = gql`
    fragment Folder on Folder {
  id
  name
  description
  provenanceEntries {
    ...ProvenanceEntry
  }
  arrayDatasets {
    ...ListArrayDataset
  }
  files {
    ...ListFile
  }
  sparseDatasets {
    ...ListSparseDataset
  }
  tableDatasets {
    ...ListTableDataset
  }
  children {
    ...ListFolder
  }
  parent {
    ...ListFolder
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
${ListArrayDatasetFragmentDoc}
${ListFileFragmentDoc}
${ListSparseDatasetFragmentDoc}
${ListTableDatasetFragmentDoc}
${ListFolderFragmentDoc}`;
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
export const SimulationTraceFragmentDoc = gql`
    fragment SimulationTrace on ArrayDataset {
  ...ExpArrayDatasetRef
  anchors {
    ...ExpAnchor
  }
}
    ${ExpArrayDatasetRefFragmentDoc}
${ExpAnchorFragmentDoc}`;
export const DetailSimulationFragmentDoc = gql`
    fragment DetailSimulation on Simulation {
  id
  name
  description
  model {
    ...DetailNeuronModel
  }
  duration
  dt
  samplingRate
  clock {
    ...ExpCoordinateSystem
  }
  timeDataset {
    ...ExpArrayDatasetRef
  }
  recordings {
    ...SimulationTrace
  }
  stimuli {
    ...SimulationTrace
  }
  createdAt
  creator {
    sub
  }
}
    ${DetailNeuronModelFragmentDoc}
${ExpCoordinateSystemFragmentDoc}
${ExpArrayDatasetRefFragmentDoc}
${SimulationTraceFragmentDoc}`;
export const GeneralSparseAccessGrantFragmentDoc = gql`
    fragment GeneralSparseAccessGrant on GeneralSparseAccessGrant {
  accessKey
  secretKey
  sessionToken
  expiresIn
  region
  bucket
}
    `;
export const ParquetAccessGrantFragmentDoc = gql`
    fragment ParquetAccessGrant on ParquetAccessGrant {
  accessKey
  secretKey
  sessionToken
  expiresIn
  region
  bucket
  key
  path
}
    `;
export const GeneralParquetAccessGrantFragmentDoc = gql`
    fragment GeneralParquetAccessGrant on GeneralParquetAccessGrant {
  accessKey
  secretKey
  sessionToken
  expiresIn
  region
  bucket
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
export const RequestGeneralSparseAccessDocument = gql`
    mutation RequestGeneralSparseAccess($input: RequestGeneralSparseAccessInput!) {
  requestGeneralSparseAccess(input: $input) {
    ...GeneralSparseAccessGrant
  }
}
    ${GeneralSparseAccessGrantFragmentDoc}`;
export type RequestGeneralSparseAccessMutationFn = Apollo.MutationFunction<RequestGeneralSparseAccessMutation, RequestGeneralSparseAccessMutationVariables>;

/**
 * __useRequestGeneralSparseAccessMutation__
 *
 * To run a mutation, you first call `useRequestGeneralSparseAccessMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestGeneralSparseAccessMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestGeneralSparseAccessMutation, { data, loading, error }] = useRequestGeneralSparseAccessMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestGeneralSparseAccessMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestGeneralSparseAccessMutation, RequestGeneralSparseAccessMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestGeneralSparseAccessMutation, RequestGeneralSparseAccessMutationVariables>(RequestGeneralSparseAccessDocument, options);
      }
export type RequestGeneralSparseAccessMutationHookResult = ReturnType<typeof useRequestGeneralSparseAccessMutation>;
export type RequestGeneralSparseAccessMutationResult = Apollo.MutationResult<RequestGeneralSparseAccessMutation>;
export type RequestGeneralSparseAccessMutationOptions = Apollo.BaseMutationOptions<RequestGeneralSparseAccessMutation, RequestGeneralSparseAccessMutationVariables>;
export const RequestParquetAccessDocument = gql`
    mutation RequestParquetAccess($input: RequestParquetAccessInput!) {
  requestParquetAccess(input: $input) {
    ...ParquetAccessGrant
  }
}
    ${ParquetAccessGrantFragmentDoc}`;
export type RequestParquetAccessMutationFn = Apollo.MutationFunction<RequestParquetAccessMutation, RequestParquetAccessMutationVariables>;

/**
 * __useRequestParquetAccessMutation__
 *
 * To run a mutation, you first call `useRequestParquetAccessMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestParquetAccessMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestParquetAccessMutation, { data, loading, error }] = useRequestParquetAccessMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestParquetAccessMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestParquetAccessMutation, RequestParquetAccessMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestParquetAccessMutation, RequestParquetAccessMutationVariables>(RequestParquetAccessDocument, options);
      }
export type RequestParquetAccessMutationHookResult = ReturnType<typeof useRequestParquetAccessMutation>;
export type RequestParquetAccessMutationResult = Apollo.MutationResult<RequestParquetAccessMutation>;
export type RequestParquetAccessMutationOptions = Apollo.BaseMutationOptions<RequestParquetAccessMutation, RequestParquetAccessMutationVariables>;
export const RequestGeneralParquetAccessDocument = gql`
    mutation RequestGeneralParquetAccess($input: RequestGeneralParquetAccessInput!) {
  requestGeneralParquetAccess(input: $input) {
    ...GeneralParquetAccessGrant
  }
}
    ${GeneralParquetAccessGrantFragmentDoc}`;
export type RequestGeneralParquetAccessMutationFn = Apollo.MutationFunction<RequestGeneralParquetAccessMutation, RequestGeneralParquetAccessMutationVariables>;

/**
 * __useRequestGeneralParquetAccessMutation__
 *
 * To run a mutation, you first call `useRequestGeneralParquetAccessMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRequestGeneralParquetAccessMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [requestGeneralParquetAccessMutation, { data, loading, error }] = useRequestGeneralParquetAccessMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRequestGeneralParquetAccessMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RequestGeneralParquetAccessMutation, RequestGeneralParquetAccessMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RequestGeneralParquetAccessMutation, RequestGeneralParquetAccessMutationVariables>(RequestGeneralParquetAccessDocument, options);
      }
export type RequestGeneralParquetAccessMutationHookResult = ReturnType<typeof useRequestGeneralParquetAccessMutation>;
export type RequestGeneralParquetAccessMutationResult = Apollo.MutationResult<RequestGeneralParquetAccessMutation>;
export type RequestGeneralParquetAccessMutationOptions = Apollo.BaseMutationOptions<RequestGeneralParquetAccessMutation, RequestGeneralParquetAccessMutationVariables>;
export const CreateExperimentAnnotationDocument = gql`
    mutation CreateExperimentAnnotation($input: CreateAnnotationInput!) {
  createAnnotation(input: $input) {
    ...ExpAnnotation
  }
}
    ${ExpAnnotationFragmentDoc}`;
export type CreateExperimentAnnotationMutationFn = Apollo.MutationFunction<CreateExperimentAnnotationMutation, CreateExperimentAnnotationMutationVariables>;

/**
 * __useCreateExperimentAnnotationMutation__
 *
 * To run a mutation, you first call `useCreateExperimentAnnotationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateExperimentAnnotationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createExperimentAnnotationMutation, { data, loading, error }] = useCreateExperimentAnnotationMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateExperimentAnnotationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateExperimentAnnotationMutation, CreateExperimentAnnotationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateExperimentAnnotationMutation, CreateExperimentAnnotationMutationVariables>(CreateExperimentAnnotationDocument, options);
      }
export type CreateExperimentAnnotationMutationHookResult = ReturnType<typeof useCreateExperimentAnnotationMutation>;
export type CreateExperimentAnnotationMutationResult = Apollo.MutationResult<CreateExperimentAnnotationMutation>;
export type CreateExperimentAnnotationMutationOptions = Apollo.BaseMutationOptions<CreateExperimentAnnotationMutation, CreateExperimentAnnotationMutationVariables>;
export const DeleteExperimentAnnotationDocument = gql`
    mutation DeleteExperimentAnnotation($id: ID!) {
  deleteAnnotation(input: {id: $id})
}
    `;
export type DeleteExperimentAnnotationMutationFn = Apollo.MutationFunction<DeleteExperimentAnnotationMutation, DeleteExperimentAnnotationMutationVariables>;

/**
 * __useDeleteExperimentAnnotationMutation__
 *
 * To run a mutation, you first call `useDeleteExperimentAnnotationMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteExperimentAnnotationMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteExperimentAnnotationMutation, { data, loading, error }] = useDeleteExperimentAnnotationMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteExperimentAnnotationMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteExperimentAnnotationMutation, DeleteExperimentAnnotationMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteExperimentAnnotationMutation, DeleteExperimentAnnotationMutationVariables>(DeleteExperimentAnnotationDocument, options);
      }
export type DeleteExperimentAnnotationMutationHookResult = ReturnType<typeof useDeleteExperimentAnnotationMutation>;
export type DeleteExperimentAnnotationMutationResult = Apollo.MutationResult<DeleteExperimentAnnotationMutation>;
export type DeleteExperimentAnnotationMutationOptions = Apollo.BaseMutationOptions<DeleteExperimentAnnotationMutation, DeleteExperimentAnnotationMutationVariables>;
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
export const CreateExperimentDocument = gql`
    mutation CreateExperiment($input: CreateExperimentInput!) {
  createExperiment(input: $input) {
    ...ListExperiment
    world {
      id
    }
  }
}
    ${ListExperimentFragmentDoc}`;
export type CreateExperimentMutationFn = Apollo.MutationFunction<CreateExperimentMutation, CreateExperimentMutationVariables>;

/**
 * __useCreateExperimentMutation__
 *
 * To run a mutation, you first call `useCreateExperimentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateExperimentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createExperimentMutation, { data, loading, error }] = useCreateExperimentMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateExperimentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateExperimentMutation, CreateExperimentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateExperimentMutation, CreateExperimentMutationVariables>(CreateExperimentDocument, options);
      }
export type CreateExperimentMutationHookResult = ReturnType<typeof useCreateExperimentMutation>;
export type CreateExperimentMutationResult = Apollo.MutationResult<CreateExperimentMutation>;
export type CreateExperimentMutationOptions = Apollo.BaseMutationOptions<CreateExperimentMutation, CreateExperimentMutationVariables>;
export const CreateExperimentFromCoordinateSystemDocument = gql`
    mutation CreateExperimentFromCoordinateSystem($input: CreateExperimentFromCoordinateSystemInput!) {
  createExperimentFromCoordinateSystem(input: $input) {
    ...ListExperiment
  }
}
    ${ListExperimentFragmentDoc}`;
export type CreateExperimentFromCoordinateSystemMutationFn = Apollo.MutationFunction<CreateExperimentFromCoordinateSystemMutation, CreateExperimentFromCoordinateSystemMutationVariables>;

/**
 * __useCreateExperimentFromCoordinateSystemMutation__
 *
 * To run a mutation, you first call `useCreateExperimentFromCoordinateSystemMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateExperimentFromCoordinateSystemMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createExperimentFromCoordinateSystemMutation, { data, loading, error }] = useCreateExperimentFromCoordinateSystemMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateExperimentFromCoordinateSystemMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateExperimentFromCoordinateSystemMutation, CreateExperimentFromCoordinateSystemMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateExperimentFromCoordinateSystemMutation, CreateExperimentFromCoordinateSystemMutationVariables>(CreateExperimentFromCoordinateSystemDocument, options);
      }
export type CreateExperimentFromCoordinateSystemMutationHookResult = ReturnType<typeof useCreateExperimentFromCoordinateSystemMutation>;
export type CreateExperimentFromCoordinateSystemMutationResult = Apollo.MutationResult<CreateExperimentFromCoordinateSystemMutation>;
export type CreateExperimentFromCoordinateSystemMutationOptions = Apollo.BaseMutationOptions<CreateExperimentFromCoordinateSystemMutation, CreateExperimentFromCoordinateSystemMutationVariables>;
export const UpdateExperimentDocument = gql`
    mutation UpdateExperiment($input: UpdateExperimentInput!) {
  updateExperiment(input: $input) {
    id
    name
    description
  }
}
    `;
export type UpdateExperimentMutationFn = Apollo.MutationFunction<UpdateExperimentMutation, UpdateExperimentMutationVariables>;

/**
 * __useUpdateExperimentMutation__
 *
 * To run a mutation, you first call `useUpdateExperimentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateExperimentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateExperimentMutation, { data, loading, error }] = useUpdateExperimentMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateExperimentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateExperimentMutation, UpdateExperimentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateExperimentMutation, UpdateExperimentMutationVariables>(UpdateExperimentDocument, options);
      }
export type UpdateExperimentMutationHookResult = ReturnType<typeof useUpdateExperimentMutation>;
export type UpdateExperimentMutationResult = Apollo.MutationResult<UpdateExperimentMutation>;
export type UpdateExperimentMutationOptions = Apollo.BaseMutationOptions<UpdateExperimentMutation, UpdateExperimentMutationVariables>;
export const DeleteExperimentDocument = gql`
    mutation DeleteExperiment($id: ID!) {
  deleteExperiment(input: {id: $id})
}
    `;
export type DeleteExperimentMutationFn = Apollo.MutationFunction<DeleteExperimentMutation, DeleteExperimentMutationVariables>;

/**
 * __useDeleteExperimentMutation__
 *
 * To run a mutation, you first call `useDeleteExperimentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteExperimentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteExperimentMutation, { data, loading, error }] = useDeleteExperimentMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteExperimentMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteExperimentMutation, DeleteExperimentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteExperimentMutation, DeleteExperimentMutationVariables>(DeleteExperimentDocument, options);
      }
export type DeleteExperimentMutationHookResult = ReturnType<typeof useDeleteExperimentMutation>;
export type DeleteExperimentMutationResult = Apollo.MutationResult<DeleteExperimentMutation>;
export type DeleteExperimentMutationOptions = Apollo.BaseMutationOptions<DeleteExperimentMutation, DeleteExperimentMutationVariables>;
export const From_File_LikeDocument = gql`
    mutation from_file_like($file: FileLike!, $fileName: String!, $folder: ID, $exportOf: [ExportOfInput!]) {
  fromFileLike(
    input: {file: $file, fileName: $fileName, folder: $folder, exportOf: $exportOf}
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
 *      fileName: // value for 'fileName'
 *      folder: // value for 'folder'
 *      exportOf: // value for 'exportOf'
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
export const CreateFolderDocument = gql`
    mutation CreateFolder($input: CreateFolderInput!) {
  createFolder(input: $input) {
    id
    name
  }
}
    `;
export type CreateFolderMutationFn = Apollo.MutationFunction<CreateFolderMutation, CreateFolderMutationVariables>;

/**
 * __useCreateFolderMutation__
 *
 * To run a mutation, you first call `useCreateFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createFolderMutation, { data, loading, error }] = useCreateFolderMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateFolderMutation, CreateFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateFolderMutation, CreateFolderMutationVariables>(CreateFolderDocument, options);
      }
export type CreateFolderMutationHookResult = ReturnType<typeof useCreateFolderMutation>;
export type CreateFolderMutationResult = Apollo.MutationResult<CreateFolderMutation>;
export type CreateFolderMutationOptions = Apollo.BaseMutationOptions<CreateFolderMutation, CreateFolderMutationVariables>;
export const EnsureFolderDocument = gql`
    mutation EnsureFolder($input: CreateFolderInput!) {
  ensureFolder(input: $input) {
    id
    name
  }
}
    `;
export type EnsureFolderMutationFn = Apollo.MutationFunction<EnsureFolderMutation, EnsureFolderMutationVariables>;

/**
 * __useEnsureFolderMutation__
 *
 * To run a mutation, you first call `useEnsureFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useEnsureFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [ensureFolderMutation, { data, loading, error }] = useEnsureFolderMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useEnsureFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<EnsureFolderMutation, EnsureFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<EnsureFolderMutation, EnsureFolderMutationVariables>(EnsureFolderDocument, options);
      }
export type EnsureFolderMutationHookResult = ReturnType<typeof useEnsureFolderMutation>;
export type EnsureFolderMutationResult = Apollo.MutationResult<EnsureFolderMutation>;
export type EnsureFolderMutationOptions = Apollo.BaseMutationOptions<EnsureFolderMutation, EnsureFolderMutationVariables>;
export const UpdateFolderDocument = gql`
    mutation UpdateFolder($id: ID!, $name: String!, $parent: ID) {
  updateFolder(input: {id: $id, name: $name, parent: $parent}) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;
export type UpdateFolderMutationFn = Apollo.MutationFunction<UpdateFolderMutation, UpdateFolderMutationVariables>;

/**
 * __useUpdateFolderMutation__
 *
 * To run a mutation, you first call `useUpdateFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateFolderMutation, { data, loading, error }] = useUpdateFolderMutation({
 *   variables: {
 *      id: // value for 'id'
 *      name: // value for 'name'
 *      parent: // value for 'parent'
 *   },
 * });
 */
export function useUpdateFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateFolderMutation, UpdateFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateFolderMutation, UpdateFolderMutationVariables>(UpdateFolderDocument, options);
      }
export type UpdateFolderMutationHookResult = ReturnType<typeof useUpdateFolderMutation>;
export type UpdateFolderMutationResult = Apollo.MutationResult<UpdateFolderMutation>;
export type UpdateFolderMutationOptions = Apollo.BaseMutationOptions<UpdateFolderMutation, UpdateFolderMutationVariables>;
export const PinFolderDocument = gql`
    mutation PinFolder($id: ID!, $pin: Boolean!) {
  pinFolder(input: {id: $id, pin: $pin}) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;
export type PinFolderMutationFn = Apollo.MutationFunction<PinFolderMutation, PinFolderMutationVariables>;

/**
 * __usePinFolderMutation__
 *
 * To run a mutation, you first call `usePinFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinFolderMutation, { data, loading, error }] = usePinFolderMutation({
 *   variables: {
 *      id: // value for 'id'
 *      pin: // value for 'pin'
 *   },
 * });
 */
export function usePinFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PinFolderMutation, PinFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PinFolderMutation, PinFolderMutationVariables>(PinFolderDocument, options);
      }
export type PinFolderMutationHookResult = ReturnType<typeof usePinFolderMutation>;
export type PinFolderMutationResult = Apollo.MutationResult<PinFolderMutation>;
export type PinFolderMutationOptions = Apollo.BaseMutationOptions<PinFolderMutation, PinFolderMutationVariables>;
export const PutFoldersInFolderDocument = gql`
    mutation PutFoldersInFolder($selfs: [ID!]!, $other: ID!) {
  putFoldersInFolder(input: {selfs: $selfs, other: $other}) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;
export type PutFoldersInFolderMutationFn = Apollo.MutationFunction<PutFoldersInFolderMutation, PutFoldersInFolderMutationVariables>;

/**
 * __usePutFoldersInFolderMutation__
 *
 * To run a mutation, you first call `usePutFoldersInFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutFoldersInFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putFoldersInFolderMutation, { data, loading, error }] = usePutFoldersInFolderMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function usePutFoldersInFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PutFoldersInFolderMutation, PutFoldersInFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PutFoldersInFolderMutation, PutFoldersInFolderMutationVariables>(PutFoldersInFolderDocument, options);
      }
export type PutFoldersInFolderMutationHookResult = ReturnType<typeof usePutFoldersInFolderMutation>;
export type PutFoldersInFolderMutationResult = Apollo.MutationResult<PutFoldersInFolderMutation>;
export type PutFoldersInFolderMutationOptions = Apollo.BaseMutationOptions<PutFoldersInFolderMutation, PutFoldersInFolderMutationVariables>;
export const ReleaseFoldersFromFolderDocument = gql`
    mutation ReleaseFoldersFromFolder($selfs: [ID!]!, $other: ID!) {
  releaseFoldersFromFolder(input: {selfs: $selfs, other: $other}) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;
export type ReleaseFoldersFromFolderMutationFn = Apollo.MutationFunction<ReleaseFoldersFromFolderMutation, ReleaseFoldersFromFolderMutationVariables>;

/**
 * __useReleaseFoldersFromFolderMutation__
 *
 * To run a mutation, you first call `useReleaseFoldersFromFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseFoldersFromFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseFoldersFromFolderMutation, { data, loading, error }] = useReleaseFoldersFromFolderMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function useReleaseFoldersFromFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ReleaseFoldersFromFolderMutation, ReleaseFoldersFromFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ReleaseFoldersFromFolderMutation, ReleaseFoldersFromFolderMutationVariables>(ReleaseFoldersFromFolderDocument, options);
      }
export type ReleaseFoldersFromFolderMutationHookResult = ReturnType<typeof useReleaseFoldersFromFolderMutation>;
export type ReleaseFoldersFromFolderMutationResult = Apollo.MutationResult<ReleaseFoldersFromFolderMutation>;
export type ReleaseFoldersFromFolderMutationOptions = Apollo.BaseMutationOptions<ReleaseFoldersFromFolderMutation, ReleaseFoldersFromFolderMutationVariables>;
export const PutArrayDatasetsInFolderDocument = gql`
    mutation PutArrayDatasetsInFolder($selfs: [ID!]!, $other: ID!) {
  putArrayDatasetsInFolder(input: {selfs: $selfs, other: $other}) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;
export type PutArrayDatasetsInFolderMutationFn = Apollo.MutationFunction<PutArrayDatasetsInFolderMutation, PutArrayDatasetsInFolderMutationVariables>;

/**
 * __usePutArrayDatasetsInFolderMutation__
 *
 * To run a mutation, you first call `usePutArrayDatasetsInFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutArrayDatasetsInFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putArrayDatasetsInFolderMutation, { data, loading, error }] = usePutArrayDatasetsInFolderMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function usePutArrayDatasetsInFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PutArrayDatasetsInFolderMutation, PutArrayDatasetsInFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PutArrayDatasetsInFolderMutation, PutArrayDatasetsInFolderMutationVariables>(PutArrayDatasetsInFolderDocument, options);
      }
export type PutArrayDatasetsInFolderMutationHookResult = ReturnType<typeof usePutArrayDatasetsInFolderMutation>;
export type PutArrayDatasetsInFolderMutationResult = Apollo.MutationResult<PutArrayDatasetsInFolderMutation>;
export type PutArrayDatasetsInFolderMutationOptions = Apollo.BaseMutationOptions<PutArrayDatasetsInFolderMutation, PutArrayDatasetsInFolderMutationVariables>;
export const ReleaseArrayDatasetsFromFolderDocument = gql`
    mutation ReleaseArrayDatasetsFromFolder($selfs: [ID!]!, $other: ID!) {
  releaseArrayDatasetsFromFolder(input: {selfs: $selfs, other: $other}) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;
export type ReleaseArrayDatasetsFromFolderMutationFn = Apollo.MutationFunction<ReleaseArrayDatasetsFromFolderMutation, ReleaseArrayDatasetsFromFolderMutationVariables>;

/**
 * __useReleaseArrayDatasetsFromFolderMutation__
 *
 * To run a mutation, you first call `useReleaseArrayDatasetsFromFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseArrayDatasetsFromFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseArrayDatasetsFromFolderMutation, { data, loading, error }] = useReleaseArrayDatasetsFromFolderMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function useReleaseArrayDatasetsFromFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ReleaseArrayDatasetsFromFolderMutation, ReleaseArrayDatasetsFromFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ReleaseArrayDatasetsFromFolderMutation, ReleaseArrayDatasetsFromFolderMutationVariables>(ReleaseArrayDatasetsFromFolderDocument, options);
      }
export type ReleaseArrayDatasetsFromFolderMutationHookResult = ReturnType<typeof useReleaseArrayDatasetsFromFolderMutation>;
export type ReleaseArrayDatasetsFromFolderMutationResult = Apollo.MutationResult<ReleaseArrayDatasetsFromFolderMutation>;
export type ReleaseArrayDatasetsFromFolderMutationOptions = Apollo.BaseMutationOptions<ReleaseArrayDatasetsFromFolderMutation, ReleaseArrayDatasetsFromFolderMutationVariables>;
export const PutFilesInFolderDocument = gql`
    mutation PutFilesInFolder($selfs: [ID!]!, $other: ID!) {
  putFilesInFolder(input: {selfs: $selfs, other: $other}) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;
export type PutFilesInFolderMutationFn = Apollo.MutationFunction<PutFilesInFolderMutation, PutFilesInFolderMutationVariables>;

/**
 * __usePutFilesInFolderMutation__
 *
 * To run a mutation, you first call `usePutFilesInFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutFilesInFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putFilesInFolderMutation, { data, loading, error }] = usePutFilesInFolderMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function usePutFilesInFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PutFilesInFolderMutation, PutFilesInFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PutFilesInFolderMutation, PutFilesInFolderMutationVariables>(PutFilesInFolderDocument, options);
      }
export type PutFilesInFolderMutationHookResult = ReturnType<typeof usePutFilesInFolderMutation>;
export type PutFilesInFolderMutationResult = Apollo.MutationResult<PutFilesInFolderMutation>;
export type PutFilesInFolderMutationOptions = Apollo.BaseMutationOptions<PutFilesInFolderMutation, PutFilesInFolderMutationVariables>;
export const ReleaseFilesFromFolderDocument = gql`
    mutation ReleaseFilesFromFolder($selfs: [ID!]!, $other: ID!) {
  releaseFilesFromFolder(input: {selfs: $selfs, other: $other}) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;
export type ReleaseFilesFromFolderMutationFn = Apollo.MutationFunction<ReleaseFilesFromFolderMutation, ReleaseFilesFromFolderMutationVariables>;

/**
 * __useReleaseFilesFromFolderMutation__
 *
 * To run a mutation, you first call `useReleaseFilesFromFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseFilesFromFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseFilesFromFolderMutation, { data, loading, error }] = useReleaseFilesFromFolderMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function useReleaseFilesFromFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ReleaseFilesFromFolderMutation, ReleaseFilesFromFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ReleaseFilesFromFolderMutation, ReleaseFilesFromFolderMutationVariables>(ReleaseFilesFromFolderDocument, options);
      }
export type ReleaseFilesFromFolderMutationHookResult = ReturnType<typeof useReleaseFilesFromFolderMutation>;
export type ReleaseFilesFromFolderMutationResult = Apollo.MutationResult<ReleaseFilesFromFolderMutation>;
export type ReleaseFilesFromFolderMutationOptions = Apollo.BaseMutationOptions<ReleaseFilesFromFolderMutation, ReleaseFilesFromFolderMutationVariables>;
export const PutTableDatasetsInFolderDocument = gql`
    mutation PutTableDatasetsInFolder($selfs: [ID!]!, $other: ID!) {
  putTableDatasetsInFolder(input: {selfs: $selfs, other: $other}) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;
export type PutTableDatasetsInFolderMutationFn = Apollo.MutationFunction<PutTableDatasetsInFolderMutation, PutTableDatasetsInFolderMutationVariables>;

/**
 * __usePutTableDatasetsInFolderMutation__
 *
 * To run a mutation, you first call `usePutTableDatasetsInFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutTableDatasetsInFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putTableDatasetsInFolderMutation, { data, loading, error }] = usePutTableDatasetsInFolderMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function usePutTableDatasetsInFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PutTableDatasetsInFolderMutation, PutTableDatasetsInFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PutTableDatasetsInFolderMutation, PutTableDatasetsInFolderMutationVariables>(PutTableDatasetsInFolderDocument, options);
      }
export type PutTableDatasetsInFolderMutationHookResult = ReturnType<typeof usePutTableDatasetsInFolderMutation>;
export type PutTableDatasetsInFolderMutationResult = Apollo.MutationResult<PutTableDatasetsInFolderMutation>;
export type PutTableDatasetsInFolderMutationOptions = Apollo.BaseMutationOptions<PutTableDatasetsInFolderMutation, PutTableDatasetsInFolderMutationVariables>;
export const ReleaseTableDatasetsFromFolderDocument = gql`
    mutation ReleaseTableDatasetsFromFolder($selfs: [ID!]!, $other: ID!) {
  releaseTableDatasetsFromFolder(input: {selfs: $selfs, other: $other}) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;
export type ReleaseTableDatasetsFromFolderMutationFn = Apollo.MutationFunction<ReleaseTableDatasetsFromFolderMutation, ReleaseTableDatasetsFromFolderMutationVariables>;

/**
 * __useReleaseTableDatasetsFromFolderMutation__
 *
 * To run a mutation, you first call `useReleaseTableDatasetsFromFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseTableDatasetsFromFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseTableDatasetsFromFolderMutation, { data, loading, error }] = useReleaseTableDatasetsFromFolderMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function useReleaseTableDatasetsFromFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ReleaseTableDatasetsFromFolderMutation, ReleaseTableDatasetsFromFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ReleaseTableDatasetsFromFolderMutation, ReleaseTableDatasetsFromFolderMutationVariables>(ReleaseTableDatasetsFromFolderDocument, options);
      }
export type ReleaseTableDatasetsFromFolderMutationHookResult = ReturnType<typeof useReleaseTableDatasetsFromFolderMutation>;
export type ReleaseTableDatasetsFromFolderMutationResult = Apollo.MutationResult<ReleaseTableDatasetsFromFolderMutation>;
export type ReleaseTableDatasetsFromFolderMutationOptions = Apollo.BaseMutationOptions<ReleaseTableDatasetsFromFolderMutation, ReleaseTableDatasetsFromFolderMutationVariables>;
export const PutSparseDatasetsInFolderDocument = gql`
    mutation PutSparseDatasetsInFolder($selfs: [ID!]!, $other: ID!) {
  putSparseDatasetsInFolder(input: {selfs: $selfs, other: $other}) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;
export type PutSparseDatasetsInFolderMutationFn = Apollo.MutationFunction<PutSparseDatasetsInFolderMutation, PutSparseDatasetsInFolderMutationVariables>;

/**
 * __usePutSparseDatasetsInFolderMutation__
 *
 * To run a mutation, you first call `usePutSparseDatasetsInFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePutSparseDatasetsInFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [putSparseDatasetsInFolderMutation, { data, loading, error }] = usePutSparseDatasetsInFolderMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function usePutSparseDatasetsInFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<PutSparseDatasetsInFolderMutation, PutSparseDatasetsInFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<PutSparseDatasetsInFolderMutation, PutSparseDatasetsInFolderMutationVariables>(PutSparseDatasetsInFolderDocument, options);
      }
export type PutSparseDatasetsInFolderMutationHookResult = ReturnType<typeof usePutSparseDatasetsInFolderMutation>;
export type PutSparseDatasetsInFolderMutationResult = Apollo.MutationResult<PutSparseDatasetsInFolderMutation>;
export type PutSparseDatasetsInFolderMutationOptions = Apollo.BaseMutationOptions<PutSparseDatasetsInFolderMutation, PutSparseDatasetsInFolderMutationVariables>;
export const ReleaseSparseDatasetsFromFolderDocument = gql`
    mutation ReleaseSparseDatasetsFromFolder($selfs: [ID!]!, $other: ID!) {
  releaseSparseDatasetsFromFolder(input: {selfs: $selfs, other: $other}) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;
export type ReleaseSparseDatasetsFromFolderMutationFn = Apollo.MutationFunction<ReleaseSparseDatasetsFromFolderMutation, ReleaseSparseDatasetsFromFolderMutationVariables>;

/**
 * __useReleaseSparseDatasetsFromFolderMutation__
 *
 * To run a mutation, you first call `useReleaseSparseDatasetsFromFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReleaseSparseDatasetsFromFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [releaseSparseDatasetsFromFolderMutation, { data, loading, error }] = useReleaseSparseDatasetsFromFolderMutation({
 *   variables: {
 *      selfs: // value for 'selfs'
 *      other: // value for 'other'
 *   },
 * });
 */
export function useReleaseSparseDatasetsFromFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<ReleaseSparseDatasetsFromFolderMutation, ReleaseSparseDatasetsFromFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<ReleaseSparseDatasetsFromFolderMutation, ReleaseSparseDatasetsFromFolderMutationVariables>(ReleaseSparseDatasetsFromFolderDocument, options);
      }
export type ReleaseSparseDatasetsFromFolderMutationHookResult = ReturnType<typeof useReleaseSparseDatasetsFromFolderMutation>;
export type ReleaseSparseDatasetsFromFolderMutationResult = Apollo.MutationResult<ReleaseSparseDatasetsFromFolderMutation>;
export type ReleaseSparseDatasetsFromFolderMutationOptions = Apollo.BaseMutationOptions<ReleaseSparseDatasetsFromFolderMutation, ReleaseSparseDatasetsFromFolderMutationVariables>;
export const RevertFolderDocument = gql`
    mutation RevertFolder($folder: ID!, $history: ID!) {
  revertFolder(input: {id: $folder, historyId: $history}) {
    id
    name
    description
  }
}
    `;
export type RevertFolderMutationFn = Apollo.MutationFunction<RevertFolderMutation, RevertFolderMutationVariables>;

/**
 * __useRevertFolderMutation__
 *
 * To run a mutation, you first call `useRevertFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRevertFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [revertFolderMutation, { data, loading, error }] = useRevertFolderMutation({
 *   variables: {
 *      folder: // value for 'folder'
 *      history: // value for 'history'
 *   },
 * });
 */
export function useRevertFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<RevertFolderMutation, RevertFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<RevertFolderMutation, RevertFolderMutationVariables>(RevertFolderDocument, options);
      }
export type RevertFolderMutationHookResult = ReturnType<typeof useRevertFolderMutation>;
export type RevertFolderMutationResult = Apollo.MutationResult<RevertFolderMutation>;
export type RevertFolderMutationOptions = Apollo.BaseMutationOptions<RevertFolderMutation, RevertFolderMutationVariables>;
export const DeleteFolderDocument = gql`
    mutation DeleteFolder($id: ID!) {
  deleteFolder(input: {id: $id})
}
    `;
export type DeleteFolderMutationFn = Apollo.MutationFunction<DeleteFolderMutation, DeleteFolderMutationVariables>;

/**
 * __useDeleteFolderMutation__
 *
 * To run a mutation, you first call `useDeleteFolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteFolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteFolderMutation, { data, loading, error }] = useDeleteFolderMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteFolderMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteFolderMutation, DeleteFolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteFolderMutation, DeleteFolderMutationVariables>(DeleteFolderDocument, options);
      }
export type DeleteFolderMutationHookResult = ReturnType<typeof useDeleteFolderMutation>;
export type DeleteFolderMutationResult = Apollo.MutationResult<DeleteFolderMutation>;
export type DeleteFolderMutationOptions = Apollo.BaseMutationOptions<DeleteFolderMutation, DeleteFolderMutationVariables>;
export const CreateTraceLayerDocument = gql`
    mutation CreateTraceLayer($input: CreateTraceLayerInput!) {
  createTraceLayer(input: $input) {
    ...ExpTraceLayer
  }
}
    ${ExpTraceLayerFragmentDoc}`;
export type CreateTraceLayerMutationFn = Apollo.MutationFunction<CreateTraceLayerMutation, CreateTraceLayerMutationVariables>;

/**
 * __useCreateTraceLayerMutation__
 *
 * To run a mutation, you first call `useCreateTraceLayerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTraceLayerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTraceLayerMutation, { data, loading, error }] = useCreateTraceLayerMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTraceLayerMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateTraceLayerMutation, CreateTraceLayerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateTraceLayerMutation, CreateTraceLayerMutationVariables>(CreateTraceLayerDocument, options);
      }
export type CreateTraceLayerMutationHookResult = ReturnType<typeof useCreateTraceLayerMutation>;
export type CreateTraceLayerMutationResult = Apollo.MutationResult<CreateTraceLayerMutation>;
export type CreateTraceLayerMutationOptions = Apollo.BaseMutationOptions<CreateTraceLayerMutation, CreateTraceLayerMutationVariables>;
export const CreateSpikesLayerDocument = gql`
    mutation CreateSpikesLayer($input: CreateSpikesLayerInput!) {
  createSpikesLayer(input: $input) {
    ...ExpSpikesLayer
  }
}
    ${ExpSpikesLayerFragmentDoc}`;
export type CreateSpikesLayerMutationFn = Apollo.MutationFunction<CreateSpikesLayerMutation, CreateSpikesLayerMutationVariables>;

/**
 * __useCreateSpikesLayerMutation__
 *
 * To run a mutation, you first call `useCreateSpikesLayerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSpikesLayerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSpikesLayerMutation, { data, loading, error }] = useCreateSpikesLayerMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateSpikesLayerMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateSpikesLayerMutation, CreateSpikesLayerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateSpikesLayerMutation, CreateSpikesLayerMutationVariables>(CreateSpikesLayerDocument, options);
      }
export type CreateSpikesLayerMutationHookResult = ReturnType<typeof useCreateSpikesLayerMutation>;
export type CreateSpikesLayerMutationResult = Apollo.MutationResult<CreateSpikesLayerMutation>;
export type CreateSpikesLayerMutationOptions = Apollo.BaseMutationOptions<CreateSpikesLayerMutation, CreateSpikesLayerMutationVariables>;
export const CreateEventsLayerDocument = gql`
    mutation CreateEventsLayer($input: CreateEventsLayerInput!) {
  createEventsLayer(input: $input) {
    ...ExpEventsLayer
  }
}
    ${ExpEventsLayerFragmentDoc}`;
export type CreateEventsLayerMutationFn = Apollo.MutationFunction<CreateEventsLayerMutation, CreateEventsLayerMutationVariables>;

/**
 * __useCreateEventsLayerMutation__
 *
 * To run a mutation, you first call `useCreateEventsLayerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateEventsLayerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createEventsLayerMutation, { data, loading, error }] = useCreateEventsLayerMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateEventsLayerMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateEventsLayerMutation, CreateEventsLayerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateEventsLayerMutation, CreateEventsLayerMutationVariables>(CreateEventsLayerDocument, options);
      }
export type CreateEventsLayerMutationHookResult = ReturnType<typeof useCreateEventsLayerMutation>;
export type CreateEventsLayerMutationResult = Apollo.MutationResult<CreateEventsLayerMutation>;
export type CreateEventsLayerMutationOptions = Apollo.BaseMutationOptions<CreateEventsLayerMutation, CreateEventsLayerMutationVariables>;
export const CreateAnnotationLayerDocument = gql`
    mutation CreateAnnotationLayer($input: CreateAnnotationLayerInput!) {
  createAnnotationLayer(input: $input) {
    ...ExpAnnotationLayer
  }
}
    ${ExpAnnotationLayerFragmentDoc}`;
export type CreateAnnotationLayerMutationFn = Apollo.MutationFunction<CreateAnnotationLayerMutation, CreateAnnotationLayerMutationVariables>;

/**
 * __useCreateAnnotationLayerMutation__
 *
 * To run a mutation, you first call `useCreateAnnotationLayerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateAnnotationLayerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createAnnotationLayerMutation, { data, loading, error }] = useCreateAnnotationLayerMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateAnnotationLayerMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateAnnotationLayerMutation, CreateAnnotationLayerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateAnnotationLayerMutation, CreateAnnotationLayerMutationVariables>(CreateAnnotationLayerDocument, options);
      }
export type CreateAnnotationLayerMutationHookResult = ReturnType<typeof useCreateAnnotationLayerMutation>;
export type CreateAnnotationLayerMutationResult = Apollo.MutationResult<CreateAnnotationLayerMutation>;
export type CreateAnnotationLayerMutationOptions = Apollo.BaseMutationOptions<CreateAnnotationLayerMutation, CreateAnnotationLayerMutationVariables>;
export const UpdateLayerDocument = gql`
    mutation UpdateLayer($input: UpdateLayerInput!) {
  updateLayer(input: $input) {
    __typename
    id
    name
    blending
    opacity
    visible
    order
  }
}
    `;
export type UpdateLayerMutationFn = Apollo.MutationFunction<UpdateLayerMutation, UpdateLayerMutationVariables>;

/**
 * __useUpdateLayerMutation__
 *
 * To run a mutation, you first call `useUpdateLayerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateLayerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateLayerMutation, { data, loading, error }] = useUpdateLayerMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateLayerMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateLayerMutation, UpdateLayerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateLayerMutation, UpdateLayerMutationVariables>(UpdateLayerDocument, options);
      }
export type UpdateLayerMutationHookResult = ReturnType<typeof useUpdateLayerMutation>;
export type UpdateLayerMutationResult = Apollo.MutationResult<UpdateLayerMutation>;
export type UpdateLayerMutationOptions = Apollo.BaseMutationOptions<UpdateLayerMutation, UpdateLayerMutationVariables>;
export const UpdateTraceLayerDocument = gql`
    mutation UpdateTraceLayer($input: UpdateTraceLayerInput!) {
  updateTraceLayer(input: $input) {
    id
    name
    blending
    opacity
    visible
    order
    channelIndex
    climMin
    climMax
    lineWidth
    color
  }
}
    `;
export type UpdateTraceLayerMutationFn = Apollo.MutationFunction<UpdateTraceLayerMutation, UpdateTraceLayerMutationVariables>;

/**
 * __useUpdateTraceLayerMutation__
 *
 * To run a mutation, you first call `useUpdateTraceLayerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTraceLayerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateTraceLayerMutation, { data, loading, error }] = useUpdateTraceLayerMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateTraceLayerMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateTraceLayerMutation, UpdateTraceLayerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateTraceLayerMutation, UpdateTraceLayerMutationVariables>(UpdateTraceLayerDocument, options);
      }
export type UpdateTraceLayerMutationHookResult = ReturnType<typeof useUpdateTraceLayerMutation>;
export type UpdateTraceLayerMutationResult = Apollo.MutationResult<UpdateTraceLayerMutation>;
export type UpdateTraceLayerMutationOptions = Apollo.BaseMutationOptions<UpdateTraceLayerMutation, UpdateTraceLayerMutationVariables>;
export const UpdateSpikesLayerDocument = gql`
    mutation UpdateSpikesLayer($input: UpdateSpikesLayerInput!) {
  updateSpikesLayer(input: $input) {
    id
    name
    blending
    opacity
    visible
    order
    tickHeight
    rowOrderColumn
    valueMode
    rateBin
    colormap
    climMin
    climMax
    color
    activeColorBy
    activeFilterBys
    colorBys {
      ...ExpColorBy
    }
    filterBys {
      ...ExpFilterBy
    }
  }
}
    ${ExpColorByFragmentDoc}
${ExpFilterByFragmentDoc}`;
export type UpdateSpikesLayerMutationFn = Apollo.MutationFunction<UpdateSpikesLayerMutation, UpdateSpikesLayerMutationVariables>;

/**
 * __useUpdateSpikesLayerMutation__
 *
 * To run a mutation, you first call `useUpdateSpikesLayerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSpikesLayerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateSpikesLayerMutation, { data, loading, error }] = useUpdateSpikesLayerMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateSpikesLayerMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateSpikesLayerMutation, UpdateSpikesLayerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateSpikesLayerMutation, UpdateSpikesLayerMutationVariables>(UpdateSpikesLayerDocument, options);
      }
export type UpdateSpikesLayerMutationHookResult = ReturnType<typeof useUpdateSpikesLayerMutation>;
export type UpdateSpikesLayerMutationResult = Apollo.MutationResult<UpdateSpikesLayerMutation>;
export type UpdateSpikesLayerMutationOptions = Apollo.BaseMutationOptions<UpdateSpikesLayerMutation, UpdateSpikesLayerMutationVariables>;
export const UpdateEventsLayerDocument = gql`
    mutation UpdateEventsLayer($input: UpdateEventsLayerInput!) {
  updateEventsLayer(input: $input) {
    id
    name
    blending
    opacity
    visible
    order
    stopColumn
    labelColumn
    laneColumn
    colormap
    color
    activeColorBy
    activeFilterBys
    colorBys {
      ...ExpColorBy
    }
    filterBys {
      ...ExpFilterBy
    }
  }
}
    ${ExpColorByFragmentDoc}
${ExpFilterByFragmentDoc}`;
export type UpdateEventsLayerMutationFn = Apollo.MutationFunction<UpdateEventsLayerMutation, UpdateEventsLayerMutationVariables>;

/**
 * __useUpdateEventsLayerMutation__
 *
 * To run a mutation, you first call `useUpdateEventsLayerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateEventsLayerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateEventsLayerMutation, { data, loading, error }] = useUpdateEventsLayerMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateEventsLayerMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<UpdateEventsLayerMutation, UpdateEventsLayerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<UpdateEventsLayerMutation, UpdateEventsLayerMutationVariables>(UpdateEventsLayerDocument, options);
      }
export type UpdateEventsLayerMutationHookResult = ReturnType<typeof useUpdateEventsLayerMutation>;
export type UpdateEventsLayerMutationResult = Apollo.MutationResult<UpdateEventsLayerMutation>;
export type UpdateEventsLayerMutationOptions = Apollo.BaseMutationOptions<UpdateEventsLayerMutation, UpdateEventsLayerMutationVariables>;
export const DeleteLayerDocument = gql`
    mutation DeleteLayer($id: ID!) {
  deleteLayer(input: {id: $id})
}
    `;
export type DeleteLayerMutationFn = Apollo.MutationFunction<DeleteLayerMutation, DeleteLayerMutationVariables>;

/**
 * __useDeleteLayerMutation__
 *
 * To run a mutation, you first call `useDeleteLayerMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteLayerMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteLayerMutation, { data, loading, error }] = useDeleteLayerMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useDeleteLayerMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteLayerMutation, DeleteLayerMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteLayerMutation, DeleteLayerMutationVariables>(DeleteLayerDocument, options);
      }
export type DeleteLayerMutationHookResult = ReturnType<typeof useDeleteLayerMutation>;
export type DeleteLayerMutationResult = Apollo.MutationResult<DeleteLayerMutation>;
export type DeleteLayerMutationOptions = Apollo.BaseMutationOptions<DeleteLayerMutation, DeleteLayerMutationVariables>;
export const CreateSamplingLawDocument = gql`
    mutation CreateSamplingLaw($input: CreateSamplingLawInput!) {
  createSamplingLaw(input: $input) {
    ...ExpTransformation
  }
}
    ${ExpTransformationFragmentDoc}`;
export type CreateSamplingLawMutationFn = Apollo.MutationFunction<CreateSamplingLawMutation, CreateSamplingLawMutationVariables>;

/**
 * __useCreateSamplingLawMutation__
 *
 * To run a mutation, you first call `useCreateSamplingLawMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateSamplingLawMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createSamplingLawMutation, { data, loading, error }] = useCreateSamplingLawMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateSamplingLawMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateSamplingLawMutation, CreateSamplingLawMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateSamplingLawMutation, CreateSamplingLawMutationVariables>(CreateSamplingLawDocument, options);
      }
export type CreateSamplingLawMutationHookResult = ReturnType<typeof useCreateSamplingLawMutation>;
export type CreateSamplingLawMutationResult = Apollo.MutationResult<CreateSamplingLawMutation>;
export type CreateSamplingLawMutationOptions = Apollo.BaseMutationOptions<CreateSamplingLawMutation, CreateSamplingLawMutationVariables>;
export const CreateClockOffsetDocument = gql`
    mutation CreateClockOffset($input: CreateClockOffsetInput!) {
  createClockOffset(input: $input) {
    ...ExpTransformation
  }
}
    ${ExpTransformationFragmentDoc}`;
export type CreateClockOffsetMutationFn = Apollo.MutationFunction<CreateClockOffsetMutation, CreateClockOffsetMutationVariables>;

/**
 * __useCreateClockOffsetMutation__
 *
 * To run a mutation, you first call `useCreateClockOffsetMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateClockOffsetMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createClockOffsetMutation, { data, loading, error }] = useCreateClockOffsetMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateClockOffsetMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<CreateClockOffsetMutation, CreateClockOffsetMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<CreateClockOffsetMutation, CreateClockOffsetMutationVariables>(CreateClockOffsetDocument, options);
      }
export type CreateClockOffsetMutationHookResult = ReturnType<typeof useCreateClockOffsetMutation>;
export type CreateClockOffsetMutationResult = Apollo.MutationResult<CreateClockOffsetMutation>;
export type CreateClockOffsetMutationOptions = Apollo.BaseMutationOptions<CreateClockOffsetMutation, CreateClockOffsetMutationVariables>;
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
export const GetExperimentSceneDocument = gql`
    query GetExperimentScene($id: ID!) {
  experiment(id: $id) {
    ...ExperimentScene
  }
}
    ${ExperimentSceneFragmentDoc}`;

/**
 * __useGetExperimentSceneQuery__
 *
 * To run a query within a React component, call `useGetExperimentSceneQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetExperimentSceneQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetExperimentSceneQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetExperimentSceneQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetExperimentSceneQuery, GetExperimentSceneQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetExperimentSceneQuery, GetExperimentSceneQueryVariables>(GetExperimentSceneDocument, options);
      }
export function useGetExperimentSceneLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetExperimentSceneQuery, GetExperimentSceneQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetExperimentSceneQuery, GetExperimentSceneQueryVariables>(GetExperimentSceneDocument, options);
        }
export type GetExperimentSceneQueryHookResult = ReturnType<typeof useGetExperimentSceneQuery>;
export type GetExperimentSceneLazyQueryHookResult = ReturnType<typeof useGetExperimentSceneLazyQuery>;
export type GetExperimentSceneQueryResult = Apollo.QueryResult<GetExperimentSceneQuery, GetExperimentSceneQueryVariables>;
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
export const GetFolderDocument = gql`
    query GetFolder($id: ID!) {
  folder(id: $id) {
    ...Folder
  }
}
    ${FolderFragmentDoc}`;

/**
 * __useGetFolderQuery__
 *
 * To run a query within a React component, call `useGetFolderQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFolderQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFolderQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetFolderQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetFolderQuery, GetFolderQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetFolderQuery, GetFolderQueryVariables>(GetFolderDocument, options);
      }
export function useGetFolderLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetFolderQuery, GetFolderQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetFolderQuery, GetFolderQueryVariables>(GetFolderDocument, options);
        }
export type GetFolderQueryHookResult = ReturnType<typeof useGetFolderQuery>;
export type GetFolderLazyQueryHookResult = ReturnType<typeof useGetFolderLazyQuery>;
export type GetFolderQueryResult = Apollo.QueryResult<GetFolderQuery, GetFolderQueryVariables>;
export const GetFoldersDocument = gql`
    query GetFolders($filters: FolderFilter, $pagination: OffsetPaginationInput, $ordering: [FolderOrder!]) {
  folders(filters: $filters, pagination: $pagination, ordering: $ordering) {
    ...ListFolder
  }
}
    ${ListFolderFragmentDoc}`;

/**
 * __useGetFoldersQuery__
 *
 * To run a query within a React component, call `useGetFoldersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetFoldersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetFoldersQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useGetFoldersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetFoldersQuery, GetFoldersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetFoldersQuery, GetFoldersQueryVariables>(GetFoldersDocument, options);
      }
export function useGetFoldersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetFoldersQuery, GetFoldersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetFoldersQuery, GetFoldersQueryVariables>(GetFoldersDocument, options);
        }
export type GetFoldersQueryHookResult = ReturnType<typeof useGetFoldersQuery>;
export type GetFoldersLazyQueryHookResult = ReturnType<typeof useGetFoldersLazyQuery>;
export type GetFoldersQueryResult = Apollo.QueryResult<GetFoldersQuery, GetFoldersQueryVariables>;
export const GetMyFoldersDocument = gql`
    query GetMyFolders($filters: FolderFilter, $pagination: OffsetPaginationInput, $ordering: [FolderOrder!]) {
  myfolders(filters: $filters, pagination: $pagination, ordering: $ordering) {
    ...ListFolder
  }
}
    ${ListFolderFragmentDoc}`;

/**
 * __useGetMyFoldersQuery__
 *
 * To run a query within a React component, call `useGetMyFoldersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMyFoldersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMyFoldersQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      pagination: // value for 'pagination'
 *      ordering: // value for 'ordering'
 *   },
 * });
 */
export function useGetMyFoldersQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<GetMyFoldersQuery, GetMyFoldersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetMyFoldersQuery, GetMyFoldersQueryVariables>(GetMyFoldersDocument, options);
      }
export function useGetMyFoldersLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetMyFoldersQuery, GetMyFoldersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetMyFoldersQuery, GetMyFoldersQueryVariables>(GetMyFoldersDocument, options);
        }
export type GetMyFoldersQueryHookResult = ReturnType<typeof useGetMyFoldersQuery>;
export type GetMyFoldersLazyQueryHookResult = ReturnType<typeof useGetMyFoldersLazyQuery>;
export type GetMyFoldersQueryResult = Apollo.QueryResult<GetMyFoldersQuery, GetMyFoldersQueryVariables>;
export const HomePageDocument = gql`
    query HomePage {
  experiments: experiments(pagination: {limit: 1}, ordering: [{createdAt: DESC}]) {
    ...ListExperiment
  }
  simulations: simulations(pagination: {limit: 1}, ordering: [{createdAt: DESC}]) {
    ...ListSimulation
  }
  models: neuronModels(pagination: {limit: 1}, ordering: [{createdAt: DESC}]) {
    ...ListNeuronModel
  }
}
    ${ListExperimentFragmentDoc}
${ListSimulationFragmentDoc}
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
export const LayerPickerArrayDatasetsDocument = gql`
    query LayerPickerArrayDatasets($search: String, $pagination: OffsetPaginationInput) {
  arrayDatasets(
    filters: {search: $search}
    pagination: $pagination
    ordering: [{createdAt: DESC}]
  ) {
    ...ListArrayDataset
    axisNames
    shape
  }
}
    ${ListArrayDatasetFragmentDoc}`;

/**
 * __useLayerPickerArrayDatasetsQuery__
 *
 * To run a query within a React component, call `useLayerPickerArrayDatasetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useLayerPickerArrayDatasetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLayerPickerArrayDatasetsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useLayerPickerArrayDatasetsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<LayerPickerArrayDatasetsQuery, LayerPickerArrayDatasetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<LayerPickerArrayDatasetsQuery, LayerPickerArrayDatasetsQueryVariables>(LayerPickerArrayDatasetsDocument, options);
      }
export function useLayerPickerArrayDatasetsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<LayerPickerArrayDatasetsQuery, LayerPickerArrayDatasetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<LayerPickerArrayDatasetsQuery, LayerPickerArrayDatasetsQueryVariables>(LayerPickerArrayDatasetsDocument, options);
        }
export type LayerPickerArrayDatasetsQueryHookResult = ReturnType<typeof useLayerPickerArrayDatasetsQuery>;
export type LayerPickerArrayDatasetsLazyQueryHookResult = ReturnType<typeof useLayerPickerArrayDatasetsLazyQuery>;
export type LayerPickerArrayDatasetsQueryResult = Apollo.QueryResult<LayerPickerArrayDatasetsQuery, LayerPickerArrayDatasetsQueryVariables>;
export const LayerPickerSparseDatasetsDocument = gql`
    query LayerPickerSparseDatasets($search: String, $pagination: OffsetPaginationInput) {
  sparseDatasets(
    filters: {search: $search, timed: true}
    pagination: $pagination
    ordering: [{createdAt: DESC}]
  ) {
    ...ListSparseDataset
  }
}
    ${ListSparseDatasetFragmentDoc}`;

/**
 * __useLayerPickerSparseDatasetsQuery__
 *
 * To run a query within a React component, call `useLayerPickerSparseDatasetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useLayerPickerSparseDatasetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLayerPickerSparseDatasetsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useLayerPickerSparseDatasetsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<LayerPickerSparseDatasetsQuery, LayerPickerSparseDatasetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<LayerPickerSparseDatasetsQuery, LayerPickerSparseDatasetsQueryVariables>(LayerPickerSparseDatasetsDocument, options);
      }
export function useLayerPickerSparseDatasetsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<LayerPickerSparseDatasetsQuery, LayerPickerSparseDatasetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<LayerPickerSparseDatasetsQuery, LayerPickerSparseDatasetsQueryVariables>(LayerPickerSparseDatasetsDocument, options);
        }
export type LayerPickerSparseDatasetsQueryHookResult = ReturnType<typeof useLayerPickerSparseDatasetsQuery>;
export type LayerPickerSparseDatasetsLazyQueryHookResult = ReturnType<typeof useLayerPickerSparseDatasetsLazyQuery>;
export type LayerPickerSparseDatasetsQueryResult = Apollo.QueryResult<LayerPickerSparseDatasetsQuery, LayerPickerSparseDatasetsQueryVariables>;
export const LayerPickerTableDatasetsDocument = gql`
    query LayerPickerTableDatasets($search: String, $pagination: OffsetPaginationInput) {
  tableDatasets(
    filters: {search: $search, timed: true}
    pagination: $pagination
    ordering: [{createdAt: DESC}]
  ) {
    ...ListTableDataset
  }
}
    ${ListTableDatasetFragmentDoc}`;

/**
 * __useLayerPickerTableDatasetsQuery__
 *
 * To run a query within a React component, call `useLayerPickerTableDatasetsQuery` and pass it any options that fit your needs.
 * When your component renders, `useLayerPickerTableDatasetsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLayerPickerTableDatasetsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useLayerPickerTableDatasetsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<LayerPickerTableDatasetsQuery, LayerPickerTableDatasetsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<LayerPickerTableDatasetsQuery, LayerPickerTableDatasetsQueryVariables>(LayerPickerTableDatasetsDocument, options);
      }
export function useLayerPickerTableDatasetsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<LayerPickerTableDatasetsQuery, LayerPickerTableDatasetsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<LayerPickerTableDatasetsQuery, LayerPickerTableDatasetsQueryVariables>(LayerPickerTableDatasetsDocument, options);
        }
export type LayerPickerTableDatasetsQueryHookResult = ReturnType<typeof useLayerPickerTableDatasetsQuery>;
export type LayerPickerTableDatasetsLazyQueryHookResult = ReturnType<typeof useLayerPickerTableDatasetsLazyQuery>;
export type LayerPickerTableDatasetsQueryResult = Apollo.QueryResult<LayerPickerTableDatasetsQuery, LayerPickerTableDatasetsQueryVariables>;
export const LayerPickerAnnotationCollectionsDocument = gql`
    query LayerPickerAnnotationCollections($search: String, $pagination: OffsetPaginationInput) {
  annotationCollections(filters: {search: $search}, pagination: $pagination) {
    id
    name
  }
}
    `;

/**
 * __useLayerPickerAnnotationCollectionsQuery__
 *
 * To run a query within a React component, call `useLayerPickerAnnotationCollectionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useLayerPickerAnnotationCollectionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useLayerPickerAnnotationCollectionsQuery({
 *   variables: {
 *      search: // value for 'search'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useLayerPickerAnnotationCollectionsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<LayerPickerAnnotationCollectionsQuery, LayerPickerAnnotationCollectionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<LayerPickerAnnotationCollectionsQuery, LayerPickerAnnotationCollectionsQueryVariables>(LayerPickerAnnotationCollectionsDocument, options);
      }
export function useLayerPickerAnnotationCollectionsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<LayerPickerAnnotationCollectionsQuery, LayerPickerAnnotationCollectionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<LayerPickerAnnotationCollectionsQuery, LayerPickerAnnotationCollectionsQueryVariables>(LayerPickerAnnotationCollectionsDocument, options);
        }
export type LayerPickerAnnotationCollectionsQueryHookResult = ReturnType<typeof useLayerPickerAnnotationCollectionsQuery>;
export type LayerPickerAnnotationCollectionsLazyQueryHookResult = ReturnType<typeof useLayerPickerAnnotationCollectionsLazyQuery>;
export type LayerPickerAnnotationCollectionsQueryResult = Apollo.QueryResult<LayerPickerAnnotationCollectionsQuery, LayerPickerAnnotationCollectionsQueryVariables>;
export const GetTableDatasetDocument = gql`
    query GetTableDataset($id: ID!) {
  tableDataset(id: $id) {
    ...ExpTableDataset
  }
}
    ${ExpTableDatasetFragmentDoc}`;

/**
 * __useGetTableDatasetQuery__
 *
 * To run a query within a React component, call `useGetTableDatasetQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTableDatasetQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTableDatasetQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetTableDatasetQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetTableDatasetQuery, GetTableDatasetQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetTableDatasetQuery, GetTableDatasetQueryVariables>(GetTableDatasetDocument, options);
      }
export function useGetTableDatasetLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetTableDatasetQuery, GetTableDatasetQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetTableDatasetQuery, GetTableDatasetQueryVariables>(GetTableDatasetDocument, options);
        }
export type GetTableDatasetQueryHookResult = ReturnType<typeof useGetTableDatasetQuery>;
export type GetTableDatasetLazyQueryHookResult = ReturnType<typeof useGetTableDatasetLazyQuery>;
export type GetTableDatasetQueryResult = Apollo.QueryResult<GetTableDatasetQuery, GetTableDatasetQueryVariables>;
export const PlacementContextDocument = gql`
    query PlacementContext($system: ID!) {
  coordinateSystem(id: $system) {
    id
    name
    axes {
      name
      type
      unit
    }
    registrations {
      id
      kind
      input {
        id
      }
      output {
        id
        name
        axes {
          name
          type
          unit
        }
      }
    }
  }
}
    `;

/**
 * __usePlacementContextQuery__
 *
 * To run a query within a React component, call `usePlacementContextQuery` and pass it any options that fit your needs.
 * When your component renders, `usePlacementContextQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePlacementContextQuery({
 *   variables: {
 *      system: // value for 'system'
 *   },
 * });
 */
export function usePlacementContextQuery(baseOptions: ApolloReactHooks.QueryHookOptions<PlacementContextQuery, PlacementContextQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PlacementContextQuery, PlacementContextQueryVariables>(PlacementContextDocument, options);
      }
export function usePlacementContextLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PlacementContextQuery, PlacementContextQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PlacementContextQuery, PlacementContextQueryVariables>(PlacementContextDocument, options);
        }
export type PlacementContextQueryHookResult = ReturnType<typeof usePlacementContextQuery>;
export type PlacementContextLazyQueryHookResult = ReturnType<typeof usePlacementContextLazyQuery>;
export type PlacementContextQueryResult = Apollo.QueryResult<PlacementContextQuery, PlacementContextQueryVariables>;
export const ClockPickerDocument = gql`
    query ClockPicker($search: String, $pagination: OffsetPaginationInput) {
  coordinateSystems(filters: {search: $search}, pagination: $pagination) {
    id
    name
    axes {
      name
      type
      unit
    }
  }
}
    `;

/**
 * __useClockPickerQuery__
 *
 * To run a query within a React component, call `useClockPickerQuery` and pass it any options that fit your needs.
 * When your component renders, `useClockPickerQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useClockPickerQuery({
 *   variables: {
 *      search: // value for 'search'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useClockPickerQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ClockPickerQuery, ClockPickerQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ClockPickerQuery, ClockPickerQueryVariables>(ClockPickerDocument, options);
      }
export function useClockPickerLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ClockPickerQuery, ClockPickerQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ClockPickerQuery, ClockPickerQueryVariables>(ClockPickerDocument, options);
        }
export type ClockPickerQueryHookResult = ReturnType<typeof useClockPickerQuery>;
export type ClockPickerLazyQueryHookResult = ReturnType<typeof useClockPickerLazyQuery>;
export type ClockPickerQueryResult = Apollo.QueryResult<ClockPickerQuery, ClockPickerQueryVariables>;
export const GlobalSearchDocument = gql`
    query GlobalSearch($search: String, $pagination: OffsetPaginationInput) {
  arrayDatasets: arrayDatasets(
    filters: {search: $search}
    pagination: $pagination
  ) {
    ...ListArrayDataset
  }
  experiments: experiments(filters: {search: $search}, pagination: $pagination) {
    ...ListExperiment
  }
  simulations: simulations(filters: {search: $search}, pagination: $pagination) {
    ...ListSimulation
  }
}
    ${ListArrayDatasetFragmentDoc}
${ListExperimentFragmentDoc}
${ListSimulationFragmentDoc}`;

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
export const SimulationClockDocument = gql`
    query SimulationClock($id: ID!) {
  simulation(id: $id) {
    id
    name
    clock {
      id
    }
  }
}
    `;

/**
 * __useSimulationClockQuery__
 *
 * To run a query within a React component, call `useSimulationClockQuery` and pass it any options that fit your needs.
 * When your component renders, `useSimulationClockQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSimulationClockQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useSimulationClockQuery(baseOptions: ApolloReactHooks.QueryHookOptions<SimulationClockQuery, SimulationClockQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SimulationClockQuery, SimulationClockQueryVariables>(SimulationClockDocument, options);
      }
export function useSimulationClockLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SimulationClockQuery, SimulationClockQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SimulationClockQuery, SimulationClockQueryVariables>(SimulationClockDocument, options);
        }
export type SimulationClockQueryHookResult = ReturnType<typeof useSimulationClockQuery>;
export type SimulationClockLazyQueryHookResult = ReturnType<typeof useSimulationClockLazyQuery>;
export type SimulationClockQueryResult = Apollo.QueryResult<SimulationClockQuery, SimulationClockQueryVariables>;