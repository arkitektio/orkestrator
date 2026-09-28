import { AxisType, ColumnRole } from "@/mikro/api/graphql";

/**
 * What a column's declared role and axis type MEAN, in one sentence each.
 *
 * The schema documents both enums, but a docstring is only visible to whoever
 * reads the schema, and a badge reading `TRACK_ID` tells a reader nothing about
 * why a table with one can be drawn as tracks and a table with `GROUP_ID`
 * cannot. These are the paraphrases the column popover shows next to the
 * value, so the distinction is stated where the column is looked at.
 *
 * Typed as `Record<Enum, string>` on purpose: a new member of either enum
 * fails the typecheck here until it has a note, which is the whole guarantee.
 */
export const COLUMN_ROLE_NOTES: Record<ColumnRole, string> = {
  [ColumnRole.Attribute]:
    "A measurement or property of the row — an area, an intensity, a marker level. Data only; it does not place the row.",
  [ColumnRole.Color]:
    "A per-row colour, or a value a layer colours the rows by.",
  [ColumnRole.Coordinate]:
    "Places the row: this column is an axis of the table's own coordinate system, which is what makes the table drawable in space.",
  [ColumnRole.GroupId]:
    "Groups rows into one connected object — the nodes of one arbor, the points of one cluster — without claiming an order between them.",
  [ColumnRole.Id]: "A per-row identifier.",
  [ColumnRole.Label]: "A per-row text label.",
  [ColumnRole.TrackId]:
    "Groups rows into a trajectory, in order. Required to render the table as tracks.",
};

export const AXIS_TYPE_NOTES: Record<AxisType, string> = {
  [AxisType.Channel]:
    "A categorical channel axis: its coordinates index acquisitions, not positions.",
  [AxisType.Coordinate]:
    "The value axis of a coordinate-valued array: its positions enumerate the components of an absolute output position.",
  [AxisType.Displacement]:
    "The value axis of a displacement-valued array: its positions enumerate the components of a per-point offset.",
  [AxisType.Index]:
    "An enumerating axis with no metric — an object id, a row number. The distance between two indices means nothing.",
  [AxisType.Microtime]:
    "A FLIM arrival-time bin. Continuous, so it can be re-binned or taken a phasor over.",
  [AxisType.Space]:
    "A spatial axis: pixel indices in a pixel grid, or a physical length in a unit-carrying system.",
  [AxisType.Spectrum]:
    "A wavelength bin of a spectrally resolved acquisition. Continuous, unlike a channel axis.",
  [AxisType.Time]:
    "A time axis: frame indices in a pixel grid, or a physical duration in a unit-carrying system.",
};

/** `GROUP_ID` → "group id": the enum's wire spelling, read as words. */
const wordsOf = (member: string) => member.toLowerCase().replaceAll("_", " ");

export const columnRoleLabel = (role: ColumnRole): string => wordsOf(role);

export const axisTypeLabel = (axisType: AxisType): string => wordsOf(axisType);
