import React from "react";
import { useParams } from "react-router";
import { Client } from "../../../lok/components/Client";

export interface ManUserProps {}

export const LokClient: React.FC<ManUserProps> = (props) => {
  const { id } = useParams<{ id: string }>();

  if (!id) return <></>;

  return <Client id={id} />;
};
