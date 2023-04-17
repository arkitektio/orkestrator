import React from "react";
import { useParams } from "react-router";
import { Provenance } from "../../../mikro/components/Provenance";

export type IRepresentationScreenProps = {};

const DataProvenance: React.FC<IRepresentationScreenProps> = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;
  return <Provenance id={id} />;
};

export { DataProvenance };
