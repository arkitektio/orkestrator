import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Plot } from "../../../mikro/components/Plot";

export interface DataPlotProps {}

export const DataPlot: React.FC<DataPlotProps> = (props) => {
  const { plot } = useParams<{ plot: string }>();
  if (!plot) return <></>;
  return <Plot id={plot} />;
};
