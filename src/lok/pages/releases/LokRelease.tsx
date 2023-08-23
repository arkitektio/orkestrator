import React from "react";
import { useParams } from "react-router";
import { Release } from "../../../lok/components/Release";

export interface ManUserProps {}

export const LokRelease: React.FC<ManUserProps> = (props) => {
  const { id } = useParams<{ id: string }>();

  if (!id) return <></>;

  return <Release id={id} />;
};
