import { Group } from "../plot/types";
import { MultiChart } from "./MultiChart";
import { ChartProps } from "./types";
import { ViolinChart } from "./ViolinChart";

export type AvailableCharts = "multi" | "violin";

export const MatchableChart = ({
  kind,
  ...props
}: {
  kind: AvailableCharts | undefined;
} & ChartProps) => {
  switch (kind) {
    case "multi":
      return <MultiChart {...props} />;
    case "violin":
      return <ViolinChart {...props} />;
    default:
      return <></>;
  }
};

export type ChartOption = {
  label: string;
  value: AvailableCharts;
};

export const getMatchableChart = (group: Group): ChartOption[] => {
  if (!group.data || group.data.length == 0) return [];

  return [
    { label: "Multi", value: "multi" },
    { label: "Violin", value: "violin" },
  ];
};
