import React from "react";
import { useParams } from "react-router";
import { Era } from "../../../mikro/components/Era";

export interface DataStageProps {}

export const DataEra: React.FC<DataStageProps> = (props) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;
  return <Era id={id} />;
};
