import React from "react";
import { useParams } from "react-router";
import { Representation } from "../../mikro/components/Representation";

export type IRepresentationScreenProps = {};

const RepresentationScreen: React.FC<IRepresentationScreenProps> = () => {
  const { representation } = useParams<{ representation: string }>();
  if (!representation) return <></>;
  return (
    <div>
      <Representation id={representation} />
    </div>
  );
};

export { RepresentationScreen };
