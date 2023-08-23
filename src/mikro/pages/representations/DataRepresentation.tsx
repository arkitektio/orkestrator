import React from "react";
import { useParams } from "react-router";
import { Representation } from "../../../mikro/components/Representation";

export type IRepresentationScreenProps = {};

const DataRepresentation: React.FC<IRepresentationScreenProps> = () => {
  const { representation } = useParams<{ representation: string }>();
  if (!representation) return <></>;
  return <Representation id={representation} />;
};

export { DataRepresentation };
