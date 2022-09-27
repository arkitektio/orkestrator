import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Sample } from "../../../mikro/components/Sample";

export interface DataSampleProps {}

export const DataSample: React.FC<DataSampleProps> = (props) => {
  const { sample } = useParams<{ sample: string }>();

  if (!sample) return <></>;
  return <Sample id={sample} />;
};
