import type { TripMode } from "./api/graphql";

/** The confirm word `deleteServerCopy` requires. */
export const DELETE_CONFIRM = "DELETE";

/** A time: the time alone today, else the day and the time. */
export const formatAt = (iso: string, now = new Date()) => {
  const date = new Date(iso);
  const time = formatTime(iso);
  if (date.toDateString() === now.toDateString()) return time;
  const day = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
  return `${day} ${time}`;
};

/** Hours and minutes, in the viewer's locale. */
export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** Meters as a person reads them: "850 m", "12.4 km", "128 km". */
export const formatDistance = (meters: number | null | undefined): string => {
  if (meters == null) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${km < 100 ? km.toFixed(1) : Math.round(km)} km`;
};

/** Seconds as "45 min", "2 h 5 min", "3 d 4 h"; under a minute is "<1 min". */
export const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds == null) return "";
  if (seconds < 60) return "<1 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours < 24) return rest ? `${hours} h ${rest} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days} d ${restHours} h` : `${days} d`;
};

export const MODE_LABELS: Record<TripMode, string> = {
  WALK: "Walk",
  BIKE: "Bike",
  VEHICLE: "Drive",
  UNKNOWN: "Trip",
};

/** The viewer's IANA time zone; `day` is asked in it so midnight is theirs. */
export const localTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

/** A local date as `YYYY-MM-DD` (the `Date` scalar), not via UTC. */
export const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** `YYYY-MM-DD` back to a local midnight; null for anything else. */
export const parseIsoDate = (value: string | null | undefined): Date | null => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
};

/** The day `days` after `date` (negative: before), in local calendar days. */
export const shiftDay = (date: Date, days: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** "Today", "Yesterday", or the weekday and date. */
export const formatDayTitle = (date: Date, now = new Date()) => {
  const today = isoDate(now);
  if (isoDate(date) === today) return "Today";
  if (isoDate(date) === isoDate(shiftDay(now, -1))) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
};

/** A date the way the lists show it: "3 Sep", with the year when not this one. */
export const formatDay = (iso: string, now = new Date()) => {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
};

/** [west, south, east, north] around every [lon, lat]; null for none. */
export const bboxOf = (coordinates: readonly (readonly [number, number])[]): [number, number, number, number] | null => {
  if (coordinates.length === 0) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [lon, lat] of coordinates) {
    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }
  return [west, south, east, north];
};

const EARTH_RADIUS = 6_371_008.8;

/**
 * A circle of `radius` meters around a point, as a closed GeoJSON ring of
 * [lon, lat]. Good enough for the tens-to-hundreds of meters a visit or place
 * spans; not for continents.
 */
export const circleRing = (lat: number, lon: number, radius: number, steps = 48): [number, number][] => {
  const angular = radius / EARTH_RADIUS;
  const phi = (lat * Math.PI) / 180;
  const lambda = (lon * Math.PI) / 180;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (2 * Math.PI * i) / steps;
    const phi2 = Math.asin(Math.sin(phi) * Math.cos(angular) + Math.cos(phi) * Math.sin(angular) * Math.cos(bearing));
    const lambda2 =
      lambda +
      Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(phi), Math.cos(angular) - Math.sin(phi) * Math.sin(phi2));
    ring.push([(lambda2 * 180) / Math.PI, (phi2 * 180) / Math.PI]);
  }
  return ring;
};

/** A track's GeoJSON LineString coordinates; empty when it is not one. */
export const lineCoordinates = (geojson: string): [number, number][] => {
  try {
    const parsed = JSON.parse(geojson) as { type?: string; coordinates?: unknown };
    if (parsed.type !== "LineString" || !Array.isArray(parsed.coordinates)) return [];
    return parsed.coordinates.filter(
      (c): c is [number, number] => Array.isArray(c) && typeof c[0] === "number" && typeof c[1] === "number",
    );
  } catch {
    return [];
  }
};
