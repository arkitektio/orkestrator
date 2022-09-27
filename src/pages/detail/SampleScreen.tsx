import React from "react";
import { useParams } from "react-router";
import { Sample } from "../../mikro/components/Sample";
import { Application } from "../../man/components/Application";

export type ISampleScreenProps = {};

const SampleScreen: React.FC<ISampleScreenProps> = () => {
  const { sample } = useParams<{ sample: string }>();

  if (!sample) return <></>;
  return (
    <div className="h-screen">
      <Sample id={sample} />
    </div>
  );
};

export { SampleScreen };
