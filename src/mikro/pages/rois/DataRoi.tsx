import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Roi } from "../../../mikro/components/Roi";

export interface DataRoiProps {}

export const DataRoi: React.FC<DataRoiProps> = (props) => {
  const { roi } = useParams<{ roi: string }>();

  if (!roi) return <></>;
  return <Roi id={roi} />;
};
