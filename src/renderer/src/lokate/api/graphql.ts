import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import * as ApolloReactHooks from '@/lokate/api/funcs';
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
  /** Date (isoformat) */
  Date: { input: string; output: string; }
  /** Date with time (isoformat) */
  DateTime: { input: string; output: string; }
  _Any: { input: any; output: any; }
};

/** A lat/lon rectangle, e.g. a map viewport. */
export type BoxInput = {
  east: Scalars['Float']['input'];
  north: Scalars['Float']['input'];
  south: Scalars['Float']['input'];
  west: Scalars['Float']['input'];
};

/** One page of everything the user has, from all their devices, in change order. */
export type ChangeSet = {
  __typename?: 'ChangeSet';
  deletedPlaces: Array<Scalars['ID']['output']>;
  hasMore: Scalars['Boolean']['output'];
  nextCursor?: Maybe<Scalars['String']['output']>;
  places: Array<Place>;
  points: Array<Point>;
  trips: Array<Trip>;
  visits: Array<Visit>;
};

/** One calendar day of the timeline, across all your devices. */
export type Day = {
  __typename?: 'Day';
  date: Scalars['Date']['output'];
  /** Meters travelled, summed over the day's trips. */
  distance: Scalars['Float']['output'];
  end: Scalars['DateTime']['output'];
  pointCount: Scalars['Int']['output'];
  /** Midnight, in the requested time zone. */
  start: Scalars['DateTime']['output'];
  /** Trips overlapping the day, oldest first. */
  trips: Array<Trip>;
  /** Visits overlapping the day, oldest first. */
  visits: Array<Visit>;
};

export type DeletedInput = {
  clientId: Scalars['ID']['input'];
  deletedAt: Scalars['DateTime']['input'];
};

/** One of your phones (an install): the token's client_device. */
export type Device = {
  __typename?: 'Device';
  /** The client_device claim it uploads with. */
  deviceId: Scalars['String']['output'];
  firstSeenAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  /** When this device last wrote anything. */
  lastUploadAt?: Maybe<Scalars['DateTime']['output']>;
  /** How many points it has uploaded. */
  pointCount: Scalars['Int']['output'];
  /** The `from` of its last replaceSegments. */
  segmentsFrom?: Maybe<Scalars['DateTime']['output']>;
};

/**
 * One phone (install) of a user: the ``client_device`` claim of its token.
 *
 * Keyed by user as well, so two accounts on one phone never share rows. A reinstall that
 * is issued a new device id is a new ``Device``; its old one's history stays readable
 * through ``changes``.
 */
export type DeviceFilter = {
  AND?: InputMaybe<DeviceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<DeviceFilter>;
  OR?: InputMaybe<DeviceFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
};

export type DeviceOrder =
  { firstSeenAt: Ordering; lastUploadAt?: never; }
  |  { firstSeenAt?: never; lastUploadAt: Ordering; };

/** The width of a stats bucket. */
export enum Granularity {
  Day = 'DAY',
  Month = 'MONTH',
  Week = 'WEEK'
}

/** Trips of one mode within a stats bucket. */
export type ModeStat = {
  __typename?: 'ModeStat';
  /** Meters. */
  distance: Scalars['Float']['output'];
  mode: TripMode;
  seconds: Scalars['Float']['output'];
  trips: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Delete all of your data on this server (confirm = "DELETE"). Returns how many points, visits, trips and places were deleted. */
  deleteServerCopy: Scalars['Int']['output'];
  /** In one transaction, make this device's visits and trips starting at or after `from` exactly the ones sent. */
  replaceSegments: ReplaceResult;
  /** Merge places and tombstones, last write wins on updatedAt; newer server copies come back in `stale`. */
  syncPlaces: PlaceSyncResult;
  /** Store points (at most 1000 per call). Safe to repeat: a point already stored counts as a duplicate. */
  uploadPoints: UploadResult;
};


export type MutationDeleteServerCopyArgs = {
  confirm: Scalars['String']['input'];
};


export type MutationReplaceSegmentsArgs = {
  from: Scalars['DateTime']['input'];
  trips: Array<TripInput>;
  visits: Array<VisitInput>;
};


export type MutationSyncPlacesArgs = {
  deleted: Array<DeletedInput>;
  places: Array<PlaceInput>;
};


export type MutationUploadPointsArgs = {
  points: Array<PointInput>;
};

/** Within `radius` meters of a point. */
export type NearInput = {
  lat: Scalars['Float']['input'];
  lon: Scalars['Float']['input'];
  radius: Scalars['Float']['input'];
};

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

/** A named place, shared by all of your phones. */
export type Place = {
  __typename?: 'Place';
  clientId: Scalars['ID']['output'];
  /** Set on a tombstone (only ever seen in syncPlaces' `stale`). */
  deletedAt?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  /** When the latest visit to it ended. */
  lastVisitAt?: Maybe<Scalars['DateTime']['output']>;
  lat?: Maybe<Scalars['Float']['output']>;
  lon?: Maybe<Scalars['Float']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  /** Meters. */
  radius?: Maybe<Scalars['Float']['output']>;
  /** The phone's edit time; last write wins on it. */
  updatedAt: Scalars['DateTime']['output'];
  /** How many visits were matched to it. */
  visitCount: Scalars['Int']['output'];
};

/**
 * A named place, shared by all of a user's phones (so keyed by user, not device).
 *
 * Last write wins on ``updated_at``. A deleted place stays as a tombstone (``deleted_at``
 * set) so another phone's older copy is not uploaded again. A tombstone can arrive for a
 * place the server never saw, so everything but the key and the stamps is nullable.
 */
export type PlaceFilter = {
  AND?: InputMaybe<PlaceFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<PlaceFilter>;
  OR?: InputMaybe<PlaceFilter>;
  ids?: InputMaybe<Array<Scalars['ID']['input']>>;
  inBox?: InputMaybe<BoxInput>;
  near?: InputMaybe<NearInput>;
  search?: InputMaybe<Scalars['String']['input']>;
};

export type PlaceInput = {
  clientId: Scalars['ID']['input'];
  lat: Scalars['Float']['input'];
  lon: Scalars['Float']['input'];
  name: Scalars['String']['input'];
  radius: Scalars['Float']['input'];
  updatedAt: Scalars['DateTime']['input'];
};

export type PlaceOrder =
  { name: Ordering; updatedAt?: never; }
  |  { name?: never; updatedAt: Ordering; };

/** Time spent at one place. */
export type PlaceStat = {
  __typename?: 'PlaceStat';
  firstVisitAt: Scalars['DateTime']['output'];
  lastVisitAt: Scalars['DateTime']['output'];
  /** None if the place was deleted. */
  place?: Maybe<Place>;
  placeClientId: Scalars['ID']['output'];
  seconds: Scalars['Float']['output'];
  visitCount: Scalars['Int']['output'];
};

export type PlaceSyncResult = {
  __typename?: 'PlaceSyncResult';
  applied: Scalars['Int']['output'];
  /** Places whose server copy is newer; the phone takes them (deletedAt set: delete it). */
  stale: Array<Place>;
};

/** One location fix. */
export type Point = {
  __typename?: 'Point';
  /** Horizontal accuracy, meters. */
  acc?: Maybe<Scalars['Float']['output']>;
  /** Altitude, meters. */
  alt?: Maybe<Scalars['Float']['output']>;
  clientId: Scalars['ID']['output'];
  device: Device;
  /** The client_device of the device that recorded it. */
  deviceId: Scalars['ID']['output'];
  /** Degrees from north. */
  heading?: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  lat: Scalars['Float']['output'];
  lon: Scalars['Float']['output'];
  /** Meters per second. */
  speed?: Maybe<Scalars['Float']['output']>;
  ts: Scalars['DateTime']['output'];
};

/** One location fix. Partitioned by month of ``ts`` (see the module docstring). */
export type PointFilter = {
  AND?: InputMaybe<PointFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<PointFilter>;
  OR?: InputMaybe<PointFilter>;
  devices?: InputMaybe<Array<Scalars['ID']['input']>>;
  inBox?: InputMaybe<BoxInput>;
  maxAccuracy?: InputMaybe<Scalars['Float']['input']>;
  near?: InputMaybe<NearInput>;
  since?: InputMaybe<Scalars['DateTime']['input']>;
  until?: InputMaybe<Scalars['DateTime']['input']>;
};

export type PointInput = {
  acc?: InputMaybe<Scalars['Float']['input']>;
  alt?: InputMaybe<Scalars['Float']['input']>;
  clientId: Scalars['ID']['input'];
  heading?: InputMaybe<Scalars['Float']['input']>;
  lat: Scalars['Float']['input'];
  lon: Scalars['Float']['input'];
  speed?: InputMaybe<Scalars['Float']['input']>;
  ts: Scalars['DateTime']['input'];
};

export type PointOrder =
  { ts: Ordering; };

export type Query = {
  __typename?: 'Query';
  _entities: Array<Maybe<_Entity>>;
  _service: _Service;
  /** Everything of yours, from all your devices, changed after `cursor`, oldest first (limit at most 1000). Page until hasMore is false; used to restore. */
  changes: ChangeSet;
  /** One calendar day (in `timezone`, IANA name): its visits and trips in order, and totals. */
  day: Day;
  /** A device by id. */
  device: Device;
  /** Your phones (installs) that have backed up here. */
  devices: Array<Device>;
  /** A place by id. */
  place: Place;
  /** Time spent per place, most first. */
  placeStats: Array<PlaceStat>;
  /** Your named places (paginated, filterable by name, box or distance). */
  places: Array<Place>;
  /** A point by id. */
  point: Point;
  /** Location fixes (paginated, filterable by time, device, box or distance). */
  points: Array<Point>;
  /** How many points match (the same filters as `points`). */
  pointsCount: Scalars['Int']['output'];
  /** Your path between `since` and `until`, one GeoJSON line per device. */
  route: Array<Track>;
  /** Points, visits, trips and distance per day, week or month. */
  stats: Array<StatsBucket>;
  /** The calling device's watermarks. */
  syncState: SyncState;
  /** A trip by id. */
  trip: Trip;
  /** Movements between visits (paginated, filterable by time, device, mode or distance). */
  trips: Array<Trip>;
  /** How many trips match (the same filters as `trips`). */
  tripsCount: Scalars['Int']['output'];
  /** A visit by id. */
  visit: Visit;
  /** Stays (paginated, filterable by time, device, place, box or distance). */
  visits: Array<Visit>;
  /** How many visits match (the same filters as `visits`). */
  visitsCount: Scalars['Int']['output'];
};


export type Query_EntitiesArgs = {
  representations: Array<Scalars['_Any']['input']>;
};


export type QueryChangesArgs = {
  cursor?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryDayArgs = {
  date: Scalars['Date']['input'];
  timezone?: InputMaybe<Scalars['String']['input']>;
};


export type QueryDeviceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryDevicesArgs = {
  filters?: InputMaybe<DeviceFilter>;
  ordering?: Array<DeviceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryPlaceArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPlaceStatsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  since?: InputMaybe<Scalars['DateTime']['input']>;
  until?: InputMaybe<Scalars['DateTime']['input']>;
};


export type QueryPlacesArgs = {
  filters?: InputMaybe<PlaceFilter>;
  ordering?: Array<PlaceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryPointArgs = {
  id: Scalars['ID']['input'];
};


export type QueryPointsArgs = {
  filters?: InputMaybe<PointFilter>;
  ordering?: Array<PointOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryPointsCountArgs = {
  filters?: InputMaybe<PointFilter>;
};


export type QueryRouteArgs = {
  devices?: InputMaybe<Array<Scalars['ID']['input']>>;
  maxAccuracy?: InputMaybe<Scalars['Float']['input']>;
  simplify?: InputMaybe<Scalars['Float']['input']>;
  since: Scalars['DateTime']['input'];
  until: Scalars['DateTime']['input'];
};


export type QueryStatsArgs = {
  granularity?: InputMaybe<Granularity>;
  since: Scalars['DateTime']['input'];
  timezone?: InputMaybe<Scalars['String']['input']>;
  until: Scalars['DateTime']['input'];
};


export type QueryTripArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTripsArgs = {
  filters?: InputMaybe<TripFilter>;
  ordering?: Array<TripOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryTripsCountArgs = {
  filters?: InputMaybe<TripFilter>;
};


export type QueryVisitArgs = {
  id: Scalars['ID']['input'];
};


export type QueryVisitsArgs = {
  filters?: InputMaybe<VisitFilter>;
  ordering?: Array<VisitOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
};


export type QueryVisitsCountArgs = {
  filters?: InputMaybe<VisitFilter>;
};

export type ReplaceResult = {
  __typename?: 'ReplaceResult';
  deletedTrips: Scalars['Int']['output'];
  deletedVisits: Scalars['Int']['output'];
  trips: Scalars['Int']['output'];
  visits: Scalars['Int']['output'];
};

/** Totals for one day, week or month. */
export type StatsBucket = {
  __typename?: 'StatsBucket';
  byMode: Array<ModeStat>;
  /** Meters, over all trips. */
  distance: Scalars['Float']['output'];
  pointCount: Scalars['Int']['output'];
  start: Scalars['DateTime']['output'];
  tripCount: Scalars['Int']['output'];
  visitCount: Scalars['Int']['output'];
};

/** The calling device's watermarks. */
export type SyncState = {
  __typename?: 'SyncState';
  lastPointTs?: Maybe<Scalars['DateTime']['output']>;
  pointCount: Scalars['Int']['output'];
  /** The `from` of this device's last replaceSegments. */
  segmentsFrom?: Maybe<Scalars['DateTime']['output']>;
};

/** One device's points over a time range, joined into a line. */
export type Track = {
  __typename?: 'Track';
  device: Device;
  /** Geodesic length of the (unsimplified) line, meters. */
  distance: Scalars['Float']['output'];
  end: Scalars['DateTime']['output'];
  /** A GeoJSON LineString (coordinates are [lon, lat]). */
  geojson: Scalars['String']['output'];
  pointCount: Scalars['Int']['output'];
  start: Scalars['DateTime']['output'];
};

/** A movement between two visits. */
export type Trip = {
  __typename?: 'Trip';
  clientId: Scalars['ID']['output'];
  device: Device;
  /** The client_device of the device that recorded it. */
  deviceId: Scalars['ID']['output'];
  /** Meters. */
  distance: Scalars['Float']['output'];
  /** How long it took, seconds. */
  duration: Scalars['Float']['output'];
  end: Scalars['DateTime']['output'];
  /** The clientId of the visit it left. */
  fromVisit?: Maybe<Scalars['ID']['output']>;
  id: Scalars['ID']['output'];
  /** How it was travelled. */
  mode: TripMode;
  start: Scalars['DateTime']['output'];
  /** The clientId of the visit it arrived at. */
  toVisit?: Maybe<Scalars['ID']['output']>;
};

/** A movement between two visits, as the phone segmented it. */
export type TripFilter = {
  AND?: InputMaybe<TripFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<TripFilter>;
  OR?: InputMaybe<TripFilter>;
  devices?: InputMaybe<Array<Scalars['ID']['input']>>;
  minDistance?: InputMaybe<Scalars['Float']['input']>;
  modes?: InputMaybe<Array<TripMode>>;
  since?: InputMaybe<Scalars['DateTime']['input']>;
  until?: InputMaybe<Scalars['DateTime']['input']>;
};

export type TripInput = {
  clientId: Scalars['ID']['input'];
  distance: Scalars['Float']['input'];
  end: Scalars['DateTime']['input'];
  fromVisit?: InputMaybe<Scalars['ID']['input']>;
  mode: TripMode;
  start: Scalars['DateTime']['input'];
  toVisit?: InputMaybe<Scalars['ID']['input']>;
};

/** How a trip was travelled, as the phone classified it. */
export enum TripMode {
  Bike = 'BIKE',
  Unknown = 'UNKNOWN',
  Vehicle = 'VEHICLE',
  Walk = 'WALK'
}

export type TripOrder =
  { distance: Ordering; start?: never; }
  |  { distance?: never; start: Ordering; };

export type UploadResult = {
  __typename?: 'UploadResult';
  accepted: Scalars['Int']['output'];
  duplicates: Scalars['Int']['output'];
};

/** A stay at one spot. */
export type Visit = {
  __typename?: 'Visit';
  clientId: Scalars['ID']['output'];
  device: Device;
  /** The client_device of the device that recorded it. */
  deviceId: Scalars['ID']['output'];
  /** How long it lasted, seconds. */
  duration: Scalars['Float']['output'];
  end: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lat: Scalars['Float']['output'];
  lon: Scalars['Float']['output'];
  /** The place it was matched to (none if deleted or unmatched). */
  place?: Maybe<Place>;
  /** The clientId of the place it was matched to. */
  placeClientId?: Maybe<Scalars['ID']['output']>;
  pointCount: Scalars['Int']['output'];
  /** Meters. */
  radius: Scalars['Float']['output'];
  start: Scalars['DateTime']['output'];
};

/** A stay at one spot, as the phone segmented it. */
export type VisitFilter = {
  AND?: InputMaybe<VisitFilter>;
  DISTINCT?: InputMaybe<Scalars['Boolean']['input']>;
  NOT?: InputMaybe<VisitFilter>;
  OR?: InputMaybe<VisitFilter>;
  devices?: InputMaybe<Array<Scalars['ID']['input']>>;
  hasPlace?: InputMaybe<Scalars['Boolean']['input']>;
  inBox?: InputMaybe<BoxInput>;
  minDuration?: InputMaybe<Scalars['Float']['input']>;
  near?: InputMaybe<NearInput>;
  places?: InputMaybe<Array<Scalars['ID']['input']>>;
  since?: InputMaybe<Scalars['DateTime']['input']>;
  until?: InputMaybe<Scalars['DateTime']['input']>;
};

export type VisitInput = {
  clientId: Scalars['ID']['input'];
  end: Scalars['DateTime']['input'];
  lat: Scalars['Float']['input'];
  lon: Scalars['Float']['input'];
  placeClientId?: InputMaybe<Scalars['ID']['input']>;
  pointCount: Scalars['Int']['input'];
  radius: Scalars['Float']['input'];
  start: Scalars['DateTime']['input'];
};

export type VisitOrder =
  { end: Ordering; start?: never; }
  |  { end?: never; start: Ordering; };

export type _Entity = Device | Place | Point | Trip | Visit;

export type _Service = {
  __typename?: '_Service';
  sdl: Scalars['String']['output'];
};

export type ListPlaceFragment = { __typename?: 'Place', id: string, clientId: string, name?: string | null, lat?: number | null, lon?: number | null, radius?: number | null, visitCount: number, lastVisitAt?: string | null };

export type PlaceFragment = (
  { __typename?: 'Place', updatedAt: string, deletedAt?: string | null }
  & ListPlaceFragment
);

export type DeviceFragment = { __typename?: 'Device', id: string, deviceId: string, firstSeenAt: string, lastUploadAt?: string | null, segmentsFrom?: string | null, pointCount: number };

export type ListVisitFragment = { __typename?: 'Visit', id: string, clientId: string, start: string, end: string, lat: number, lon: number, radius: number, pointCount: number, duration: number, deviceId: string, place?: { __typename?: 'Place', id: string, clientId: string, name?: string | null } | null };

export type VisitFragment = (
  { __typename?: 'Visit', device: (
    { __typename?: 'Device' }
    & DeviceFragment
  ) }
  & ListVisitFragment
);

export type ListTripFragment = { __typename?: 'Trip', id: string, clientId: string, start: string, end: string, distance: number, duration: number, mode: TripMode, deviceId: string, fromVisit?: string | null, toVisit?: string | null };

export type TripFragment = (
  { __typename?: 'Trip', device: (
    { __typename?: 'Device' }
    & DeviceFragment
  ) }
  & ListTripFragment
);

export type TrackFragment = { __typename?: 'Track', start: string, end: string, pointCount: number, distance: number, geojson: string, device: { __typename?: 'Device', id: string, deviceId: string } };

export type DayFragment = { __typename?: 'Day', date: string, start: string, end: string, pointCount: number, distance: number, visits: Array<(
    { __typename?: 'Visit' }
    & ListVisitFragment
  )>, trips: Array<(
    { __typename?: 'Trip' }
    & ListTripFragment
  )> };

export type ModeStatFragment = { __typename?: 'ModeStat', mode: TripMode, trips: number, distance: number, seconds: number };

export type StatsBucketFragment = { __typename?: 'StatsBucket', start: string, pointCount: number, visitCount: number, tripCount: number, distance: number, byMode: Array<(
    { __typename?: 'ModeStat' }
    & ModeStatFragment
  )> };

export type PlaceStatFragment = { __typename?: 'PlaceStat', placeClientId: string, visitCount: number, seconds: number, firstVisitAt: string, lastVisitAt: string, place?: (
    { __typename?: 'Place' }
    & ListPlaceFragment
  ) | null };

export type SyncPlacesMutationVariables = Exact<{
  places: Array<PlaceInput> | PlaceInput;
  deleted: Array<DeletedInput> | DeletedInput;
}>;


export type SyncPlacesMutation = { __typename?: 'Mutation', syncPlaces: { __typename?: 'PlaceSyncResult', applied: number, stale: Array<(
      { __typename?: 'Place' }
      & PlaceFragment
    )> } };

export type DeleteServerCopyMutationVariables = Exact<{
  confirm: Scalars['String']['input'];
}>;


export type DeleteServerCopyMutation = { __typename?: 'Mutation', deleteServerCopy: number };

export type ListPlacesQueryVariables = Exact<{
  filters?: InputMaybe<PlaceFilter>;
  ordering?: InputMaybe<Array<PlaceOrder> | PlaceOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListPlacesQuery = { __typename?: 'Query', places: Array<(
    { __typename?: 'Place' }
    & ListPlaceFragment
  )> };

export type GetPlaceQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetPlaceQuery = { __typename?: 'Query', place: (
    { __typename?: 'Place' }
    & PlaceFragment
  ) };

export type SearchPlacesQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  values?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
}>;


export type SearchPlacesQuery = { __typename?: 'Query', options: Array<{ __typename?: 'Place', value: string, label?: string | null }> };

export type PlaceStatsQueryVariables = Exact<{
  since?: InputMaybe<Scalars['DateTime']['input']>;
  until?: InputMaybe<Scalars['DateTime']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type PlaceStatsQuery = { __typename?: 'Query', placeStats: Array<(
    { __typename?: 'PlaceStat' }
    & PlaceStatFragment
  )> };

export type ListDevicesQueryVariables = Exact<{
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListDevicesQuery = { __typename?: 'Query', devices: Array<(
    { __typename?: 'Device' }
    & DeviceFragment
  )> };

export type GetDayQueryVariables = Exact<{
  date: Scalars['Date']['input'];
  timezone?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetDayQuery = { __typename?: 'Query', day: (
    { __typename?: 'Day' }
    & DayFragment
  ) };

export type GetRouteQueryVariables = Exact<{
  since: Scalars['DateTime']['input'];
  until: Scalars['DateTime']['input'];
  devices?: InputMaybe<Array<Scalars['ID']['input']> | Scalars['ID']['input']>;
  simplify?: InputMaybe<Scalars['Float']['input']>;
  maxAccuracy?: InputMaybe<Scalars['Float']['input']>;
}>;


export type GetRouteQuery = { __typename?: 'Query', route: Array<(
    { __typename?: 'Track' }
    & TrackFragment
  )> };

export type ListVisitsQueryVariables = Exact<{
  filters?: InputMaybe<VisitFilter>;
  ordering?: InputMaybe<Array<VisitOrder> | VisitOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListVisitsQuery = { __typename?: 'Query', visits: Array<(
    { __typename?: 'Visit' }
    & ListVisitFragment
  )> };

export type GetVisitQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetVisitQuery = { __typename?: 'Query', visit: (
    { __typename?: 'Visit' }
    & VisitFragment
  ) };

export type ListTripsQueryVariables = Exact<{
  filters?: InputMaybe<TripFilter>;
  ordering?: InputMaybe<Array<TripOrder> | TripOrder>;
  pagination?: InputMaybe<OffsetPaginationInput>;
}>;


export type ListTripsQuery = { __typename?: 'Query', trips: Array<(
    { __typename?: 'Trip' }
    & ListTripFragment
  )> };

export type GetTripQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetTripQuery = { __typename?: 'Query', trip: (
    { __typename?: 'Trip' }
    & TripFragment
  ) };

export type GetStatsQueryVariables = Exact<{
  since: Scalars['DateTime']['input'];
  until: Scalars['DateTime']['input'];
  granularity?: InputMaybe<Granularity>;
  timezone?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetStatsQuery = { __typename?: 'Query', stats: Array<(
    { __typename?: 'StatsBucket' }
    & StatsBucketFragment
  )> };

export const ListPlaceFragmentDoc = gql`
    fragment ListPlace on Place {
  id
  clientId
  name
  lat
  lon
  radius
  visitCount
  lastVisitAt
}
    `;
export const PlaceFragmentDoc = gql`
    fragment Place on Place {
  ...ListPlace
  updatedAt
  deletedAt
}
    ${ListPlaceFragmentDoc}`;
export const ListVisitFragmentDoc = gql`
    fragment ListVisit on Visit {
  id
  clientId
  start
  end
  lat
  lon
  radius
  pointCount
  duration
  deviceId
  place {
    id
    clientId
    name
  }
}
    `;
export const DeviceFragmentDoc = gql`
    fragment Device on Device {
  id
  deviceId
  firstSeenAt
  lastUploadAt
  segmentsFrom
  pointCount
}
    `;
export const VisitFragmentDoc = gql`
    fragment Visit on Visit {
  ...ListVisit
  device {
    ...Device
  }
}
    ${ListVisitFragmentDoc}
${DeviceFragmentDoc}`;
export const ListTripFragmentDoc = gql`
    fragment ListTrip on Trip {
  id
  clientId
  start
  end
  distance
  duration
  mode
  deviceId
  fromVisit
  toVisit
}
    `;
export const TripFragmentDoc = gql`
    fragment Trip on Trip {
  ...ListTrip
  device {
    ...Device
  }
}
    ${ListTripFragmentDoc}
${DeviceFragmentDoc}`;
export const TrackFragmentDoc = gql`
    fragment Track on Track {
  device {
    id
    deviceId
  }
  start
  end
  pointCount
  distance
  geojson
}
    `;
export const DayFragmentDoc = gql`
    fragment Day on Day {
  date
  start
  end
  pointCount
  distance
  visits {
    ...ListVisit
  }
  trips {
    ...ListTrip
  }
}
    ${ListVisitFragmentDoc}
${ListTripFragmentDoc}`;
export const ModeStatFragmentDoc = gql`
    fragment ModeStat on ModeStat {
  mode
  trips
  distance
  seconds
}
    `;
export const StatsBucketFragmentDoc = gql`
    fragment StatsBucket on StatsBucket {
  start
  pointCount
  visitCount
  tripCount
  distance
  byMode {
    ...ModeStat
  }
}
    ${ModeStatFragmentDoc}`;
export const PlaceStatFragmentDoc = gql`
    fragment PlaceStat on PlaceStat {
  placeClientId
  place {
    ...ListPlace
  }
  visitCount
  seconds
  firstVisitAt
  lastVisitAt
}
    ${ListPlaceFragmentDoc}`;
export const SyncPlacesDocument = gql`
    mutation SyncPlaces($places: [PlaceInput!]!, $deleted: [DeletedInput!]!) {
  syncPlaces(places: $places, deleted: $deleted) {
    applied
    stale {
      ...Place
    }
  }
}
    ${PlaceFragmentDoc}`;
export type SyncPlacesMutationFn = Apollo.MutationFunction<SyncPlacesMutation, SyncPlacesMutationVariables>;

/**
 * __useSyncPlacesMutation__
 *
 * To run a mutation, you first call `useSyncPlacesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSyncPlacesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [syncPlacesMutation, { data, loading, error }] = useSyncPlacesMutation({
 *   variables: {
 *      places: // value for 'places'
 *      deleted: // value for 'deleted'
 *   },
 * });
 */
export function useSyncPlacesMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<SyncPlacesMutation, SyncPlacesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<SyncPlacesMutation, SyncPlacesMutationVariables>(SyncPlacesDocument, options);
      }
export type SyncPlacesMutationHookResult = ReturnType<typeof useSyncPlacesMutation>;
export type SyncPlacesMutationResult = Apollo.MutationResult<SyncPlacesMutation>;
export type SyncPlacesMutationOptions = Apollo.BaseMutationOptions<SyncPlacesMutation, SyncPlacesMutationVariables>;
export const DeleteServerCopyDocument = gql`
    mutation DeleteServerCopy($confirm: String!) {
  deleteServerCopy(confirm: $confirm)
}
    `;
export type DeleteServerCopyMutationFn = Apollo.MutationFunction<DeleteServerCopyMutation, DeleteServerCopyMutationVariables>;

/**
 * __useDeleteServerCopyMutation__
 *
 * To run a mutation, you first call `useDeleteServerCopyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteServerCopyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteServerCopyMutation, { data, loading, error }] = useDeleteServerCopyMutation({
 *   variables: {
 *      confirm: // value for 'confirm'
 *   },
 * });
 */
export function useDeleteServerCopyMutation(baseOptions?: ApolloReactHooks.MutationHookOptions<DeleteServerCopyMutation, DeleteServerCopyMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useMutation<DeleteServerCopyMutation, DeleteServerCopyMutationVariables>(DeleteServerCopyDocument, options);
      }
export type DeleteServerCopyMutationHookResult = ReturnType<typeof useDeleteServerCopyMutation>;
export type DeleteServerCopyMutationResult = Apollo.MutationResult<DeleteServerCopyMutation>;
export type DeleteServerCopyMutationOptions = Apollo.BaseMutationOptions<DeleteServerCopyMutation, DeleteServerCopyMutationVariables>;
export const ListPlacesDocument = gql`
    query ListPlaces($filters: PlaceFilter, $ordering: [PlaceOrder!], $pagination: OffsetPaginationInput) {
  places(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListPlace
  }
}
    ${ListPlaceFragmentDoc}`;

/**
 * __useListPlacesQuery__
 *
 * To run a query within a React component, call `useListPlacesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListPlacesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListPlacesQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListPlacesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListPlacesQuery, ListPlacesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListPlacesQuery, ListPlacesQueryVariables>(ListPlacesDocument, options);
      }
export function useListPlacesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListPlacesQuery, ListPlacesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListPlacesQuery, ListPlacesQueryVariables>(ListPlacesDocument, options);
        }
export type ListPlacesQueryHookResult = ReturnType<typeof useListPlacesQuery>;
export type ListPlacesLazyQueryHookResult = ReturnType<typeof useListPlacesLazyQuery>;
export type ListPlacesQueryResult = Apollo.QueryResult<ListPlacesQuery, ListPlacesQueryVariables>;
export const GetPlaceDocument = gql`
    query GetPlace($id: ID!) {
  place(id: $id) {
    ...Place
  }
}
    ${PlaceFragmentDoc}`;

/**
 * __useGetPlaceQuery__
 *
 * To run a query within a React component, call `useGetPlaceQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPlaceQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPlaceQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetPlaceQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetPlaceQuery, GetPlaceQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetPlaceQuery, GetPlaceQueryVariables>(GetPlaceDocument, options);
      }
export function useGetPlaceLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetPlaceQuery, GetPlaceQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetPlaceQuery, GetPlaceQueryVariables>(GetPlaceDocument, options);
        }
export type GetPlaceQueryHookResult = ReturnType<typeof useGetPlaceQuery>;
export type GetPlaceLazyQueryHookResult = ReturnType<typeof useGetPlaceLazyQuery>;
export type GetPlaceQueryResult = Apollo.QueryResult<GetPlaceQuery, GetPlaceQueryVariables>;
export const SearchPlacesDocument = gql`
    query SearchPlaces($search: String, $values: [ID!]) {
  options: places(
    filters: {search: $search, ids: $values}
    pagination: {limit: 10}
  ) {
    value: id
    label: name
  }
}
    `;

/**
 * __useSearchPlacesQuery__
 *
 * To run a query within a React component, call `useSearchPlacesQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchPlacesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchPlacesQuery({
 *   variables: {
 *      search: // value for 'search'
 *      values: // value for 'values'
 *   },
 * });
 */
export function useSearchPlacesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<SearchPlacesQuery, SearchPlacesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<SearchPlacesQuery, SearchPlacesQueryVariables>(SearchPlacesDocument, options);
      }
export function useSearchPlacesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<SearchPlacesQuery, SearchPlacesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<SearchPlacesQuery, SearchPlacesQueryVariables>(SearchPlacesDocument, options);
        }
export type SearchPlacesQueryHookResult = ReturnType<typeof useSearchPlacesQuery>;
export type SearchPlacesLazyQueryHookResult = ReturnType<typeof useSearchPlacesLazyQuery>;
export type SearchPlacesQueryResult = Apollo.QueryResult<SearchPlacesQuery, SearchPlacesQueryVariables>;
export const PlaceStatsDocument = gql`
    query PlaceStats($since: DateTime, $until: DateTime, $limit: Int = 100) {
  placeStats(since: $since, until: $until, limit: $limit) {
    ...PlaceStat
  }
}
    ${PlaceStatFragmentDoc}`;

/**
 * __usePlaceStatsQuery__
 *
 * To run a query within a React component, call `usePlaceStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePlaceStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePlaceStatsQuery({
 *   variables: {
 *      since: // value for 'since'
 *      until: // value for 'until'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function usePlaceStatsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<PlaceStatsQuery, PlaceStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<PlaceStatsQuery, PlaceStatsQueryVariables>(PlaceStatsDocument, options);
      }
export function usePlaceStatsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<PlaceStatsQuery, PlaceStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<PlaceStatsQuery, PlaceStatsQueryVariables>(PlaceStatsDocument, options);
        }
export type PlaceStatsQueryHookResult = ReturnType<typeof usePlaceStatsQuery>;
export type PlaceStatsLazyQueryHookResult = ReturnType<typeof usePlaceStatsLazyQuery>;
export type PlaceStatsQueryResult = Apollo.QueryResult<PlaceStatsQuery, PlaceStatsQueryVariables>;
export const ListDevicesDocument = gql`
    query ListDevices($pagination: OffsetPaginationInput) {
  devices(ordering: [{lastUploadAt: DESC_NULLS_LAST}], pagination: $pagination) {
    ...Device
  }
}
    ${DeviceFragmentDoc}`;

/**
 * __useListDevicesQuery__
 *
 * To run a query within a React component, call `useListDevicesQuery` and pass it any options that fit your needs.
 * When your component renders, `useListDevicesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListDevicesQuery({
 *   variables: {
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListDevicesQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListDevicesQuery, ListDevicesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListDevicesQuery, ListDevicesQueryVariables>(ListDevicesDocument, options);
      }
export function useListDevicesLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListDevicesQuery, ListDevicesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListDevicesQuery, ListDevicesQueryVariables>(ListDevicesDocument, options);
        }
export type ListDevicesQueryHookResult = ReturnType<typeof useListDevicesQuery>;
export type ListDevicesLazyQueryHookResult = ReturnType<typeof useListDevicesLazyQuery>;
export type ListDevicesQueryResult = Apollo.QueryResult<ListDevicesQuery, ListDevicesQueryVariables>;
export const GetDayDocument = gql`
    query GetDay($date: Date!, $timezone: String) {
  day(date: $date, timezone: $timezone) {
    ...Day
  }
}
    ${DayFragmentDoc}`;

/**
 * __useGetDayQuery__
 *
 * To run a query within a React component, call `useGetDayQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetDayQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetDayQuery({
 *   variables: {
 *      date: // value for 'date'
 *      timezone: // value for 'timezone'
 *   },
 * });
 */
export function useGetDayQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetDayQuery, GetDayQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetDayQuery, GetDayQueryVariables>(GetDayDocument, options);
      }
export function useGetDayLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetDayQuery, GetDayQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetDayQuery, GetDayQueryVariables>(GetDayDocument, options);
        }
export type GetDayQueryHookResult = ReturnType<typeof useGetDayQuery>;
export type GetDayLazyQueryHookResult = ReturnType<typeof useGetDayLazyQuery>;
export type GetDayQueryResult = Apollo.QueryResult<GetDayQuery, GetDayQueryVariables>;
export const GetRouteDocument = gql`
    query GetRoute($since: DateTime!, $until: DateTime!, $devices: [ID!], $simplify: Float, $maxAccuracy: Float) {
  route(
    since: $since
    until: $until
    devices: $devices
    simplify: $simplify
    maxAccuracy: $maxAccuracy
  ) {
    ...Track
  }
}
    ${TrackFragmentDoc}`;

/**
 * __useGetRouteQuery__
 *
 * To run a query within a React component, call `useGetRouteQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRouteQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRouteQuery({
 *   variables: {
 *      since: // value for 'since'
 *      until: // value for 'until'
 *      devices: // value for 'devices'
 *      simplify: // value for 'simplify'
 *      maxAccuracy: // value for 'maxAccuracy'
 *   },
 * });
 */
export function useGetRouteQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetRouteQuery, GetRouteQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetRouteQuery, GetRouteQueryVariables>(GetRouteDocument, options);
      }
export function useGetRouteLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetRouteQuery, GetRouteQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetRouteQuery, GetRouteQueryVariables>(GetRouteDocument, options);
        }
export type GetRouteQueryHookResult = ReturnType<typeof useGetRouteQuery>;
export type GetRouteLazyQueryHookResult = ReturnType<typeof useGetRouteLazyQuery>;
export type GetRouteQueryResult = Apollo.QueryResult<GetRouteQuery, GetRouteQueryVariables>;
export const ListVisitsDocument = gql`
    query ListVisits($filters: VisitFilter, $ordering: [VisitOrder!], $pagination: OffsetPaginationInput) {
  visits(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListVisit
  }
}
    ${ListVisitFragmentDoc}`;

/**
 * __useListVisitsQuery__
 *
 * To run a query within a React component, call `useListVisitsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListVisitsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListVisitsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListVisitsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListVisitsQuery, ListVisitsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListVisitsQuery, ListVisitsQueryVariables>(ListVisitsDocument, options);
      }
export function useListVisitsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListVisitsQuery, ListVisitsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListVisitsQuery, ListVisitsQueryVariables>(ListVisitsDocument, options);
        }
export type ListVisitsQueryHookResult = ReturnType<typeof useListVisitsQuery>;
export type ListVisitsLazyQueryHookResult = ReturnType<typeof useListVisitsLazyQuery>;
export type ListVisitsQueryResult = Apollo.QueryResult<ListVisitsQuery, ListVisitsQueryVariables>;
export const GetVisitDocument = gql`
    query GetVisit($id: ID!) {
  visit(id: $id) {
    ...Visit
  }
}
    ${VisitFragmentDoc}`;

/**
 * __useGetVisitQuery__
 *
 * To run a query within a React component, call `useGetVisitQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetVisitQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetVisitQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetVisitQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetVisitQuery, GetVisitQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetVisitQuery, GetVisitQueryVariables>(GetVisitDocument, options);
      }
export function useGetVisitLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetVisitQuery, GetVisitQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetVisitQuery, GetVisitQueryVariables>(GetVisitDocument, options);
        }
export type GetVisitQueryHookResult = ReturnType<typeof useGetVisitQuery>;
export type GetVisitLazyQueryHookResult = ReturnType<typeof useGetVisitLazyQuery>;
export type GetVisitQueryResult = Apollo.QueryResult<GetVisitQuery, GetVisitQueryVariables>;
export const ListTripsDocument = gql`
    query ListTrips($filters: TripFilter, $ordering: [TripOrder!], $pagination: OffsetPaginationInput) {
  trips(filters: $filters, ordering: $ordering, pagination: $pagination) {
    ...ListTrip
  }
}
    ${ListTripFragmentDoc}`;

/**
 * __useListTripsQuery__
 *
 * To run a query within a React component, call `useListTripsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListTripsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListTripsQuery({
 *   variables: {
 *      filters: // value for 'filters'
 *      ordering: // value for 'ordering'
 *      pagination: // value for 'pagination'
 *   },
 * });
 */
export function useListTripsQuery(baseOptions?: ApolloReactHooks.QueryHookOptions<ListTripsQuery, ListTripsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<ListTripsQuery, ListTripsQueryVariables>(ListTripsDocument, options);
      }
export function useListTripsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<ListTripsQuery, ListTripsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<ListTripsQuery, ListTripsQueryVariables>(ListTripsDocument, options);
        }
export type ListTripsQueryHookResult = ReturnType<typeof useListTripsQuery>;
export type ListTripsLazyQueryHookResult = ReturnType<typeof useListTripsLazyQuery>;
export type ListTripsQueryResult = Apollo.QueryResult<ListTripsQuery, ListTripsQueryVariables>;
export const GetTripDocument = gql`
    query GetTrip($id: ID!) {
  trip(id: $id) {
    ...Trip
  }
}
    ${TripFragmentDoc}`;

/**
 * __useGetTripQuery__
 *
 * To run a query within a React component, call `useGetTripQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTripQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTripQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetTripQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetTripQuery, GetTripQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetTripQuery, GetTripQueryVariables>(GetTripDocument, options);
      }
export function useGetTripLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetTripQuery, GetTripQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetTripQuery, GetTripQueryVariables>(GetTripDocument, options);
        }
export type GetTripQueryHookResult = ReturnType<typeof useGetTripQuery>;
export type GetTripLazyQueryHookResult = ReturnType<typeof useGetTripLazyQuery>;
export type GetTripQueryResult = Apollo.QueryResult<GetTripQuery, GetTripQueryVariables>;
export const GetStatsDocument = gql`
    query GetStats($since: DateTime!, $until: DateTime!, $granularity: Granularity, $timezone: String) {
  stats(
    since: $since
    until: $until
    granularity: $granularity
    timezone: $timezone
  ) {
    ...StatsBucket
  }
}
    ${StatsBucketFragmentDoc}`;

/**
 * __useGetStatsQuery__
 *
 * To run a query within a React component, call `useGetStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetStatsQuery({
 *   variables: {
 *      since: // value for 'since'
 *      until: // value for 'until'
 *      granularity: // value for 'granularity'
 *      timezone: // value for 'timezone'
 *   },
 * });
 */
export function useGetStatsQuery(baseOptions: ApolloReactHooks.QueryHookOptions<GetStatsQuery, GetStatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return ApolloReactHooks.useQuery<GetStatsQuery, GetStatsQueryVariables>(GetStatsDocument, options);
      }
export function useGetStatsLazyQuery(baseOptions?: ApolloReactHooks.LazyQueryHookOptions<GetStatsQuery, GetStatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return ApolloReactHooks.useLazyQuery<GetStatsQuery, GetStatsQueryVariables>(GetStatsDocument, options);
        }
export type GetStatsQueryHookResult = ReturnType<typeof useGetStatsQuery>;
export type GetStatsLazyQueryHookResult = ReturnType<typeof useGetStatsLazyQuery>;
export type GetStatsQueryResult = Apollo.QueryResult<GetStatsQuery, GetStatsQueryVariables>;