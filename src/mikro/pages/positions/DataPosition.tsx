import React, { useState, useEffect } from "react";
import { useParams } from "react-router";
import { Position } from "../../../mikro/components/Position";

export interface DataPositionProps {}

export const DataPosition: React.FC<DataPositionProps> = (props) => {
  const { position } = useParams<{ position: string }>();
  if (!position) return <></>;
  return <Position id={position} />;
};
