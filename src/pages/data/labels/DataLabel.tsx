import React, { useState, useEffect } from "react";
import { useParams } from "react-router";

export interface DataLabelProps {}

export const DataLabel: React.FC<DataLabelProps> = (props) => {
  const { label } = useParams<{ label: string }>();
  if (!label) return <></>;
  return <></>;
};
