import { Identifier } from "../../../arkitekt/api/scalars";
import { bisector } from "d3-array";
import { scaleLinear, scaleTime, scaleBand } from "@visx/scale";
import { Datum } from "./types";

export const get_identifier_for_type = (type: string): Identifier | null => {
  switch (type) {
    case "Feature":
      return "@mikro/feature";
    case "Label":
      return "@mikro/label";
    case "Representation":
      return "@mikro/representation";
    case "Sample":
      return "@mikro/sample";
    case "ROI":
      return "@mikro/roi";
    case "Table":
      return "@mikro/table";
    case "Metric":
      return "@mikro/metric";
    default:
      return null;
  }
};

export default function findNearestDatum({
  value,
  scale,
  accessor,
  data,
}: {
  value: number;
  scale: ReturnType<typeof scaleLinear | typeof scaleTime>;
  accessor: (d: Datum) => number;
  data: Datum[];
}): Datum {
  const bisect = bisector(accessor).left;
  const nearestValue = scale.invert(value) as number;
  const nearestValueIndex = bisect(data, nearestValue, 1);
  const d0 = data[nearestValueIndex - 1];
  const d1 = data[nearestValueIndex];
  let nearestDatum = d0;
  if (d1 && accessor(d1)) {
    nearestDatum =
      nearestValue - accessor(d0) > accessor(d1) - nearestValue ? d1 : d0;
  }
  return nearestDatum;
}

export function scaleBandInvert(scale: ReturnType<typeof scaleBand>) {
  var domain = scale.domain();
  var paddingOuter = scale(domain[0]);
  var eachBand = scale.step();
  return function (value: any) {
    var index = Math.floor((value - (paddingOuter || 0)) / eachBand);
    return domain[Math.max(0, Math.min(index, domain.length - 1))];
  };
}
