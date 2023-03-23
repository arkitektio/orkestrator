import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Live } from "../../../dashboard/Dashboard";
import { Plot } from "../../../mikro/components/Plot";

export interface DataPlotProps {}

export const DataLive: React.FC<DataPlotProps> = (props) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <>no id</>;
  return <Live id={id} />;
};
