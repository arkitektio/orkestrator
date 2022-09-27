import React from "react";
import { useParams } from "react-router";
import { Sample } from "../../mikro/components/Sample";
import { Application } from "../../man/components/Application";
import { Roi } from "../../mikro/components/Roi";

export type IRoiScreenProps = {};

const RoiScreen: React.FC<IRoiScreenProps> = () => {
  const { roi } = useParams<{ roi: string }>();

  if (!roi) return <></>;
  return (
    <div className="h-screen">
      <Roi id={roi} />
    </div>
  );
};

export { RoiScreen };
