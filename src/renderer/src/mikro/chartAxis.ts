import type { AxisFragment } from "./api/graphql";

/**
 * A chart's axis in one line: its name and, when it carries one, its unit —
 * "time (second)". What tells two charts apart before either is opened.
 */
export const chartAxisLabel = (axis: Pick<AxisFragment, "name" | "unit">) =>
  axis.unit ? `${axis.name} (${axis.unit})` : axis.name;
