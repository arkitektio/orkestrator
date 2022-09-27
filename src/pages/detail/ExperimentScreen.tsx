import React from "react";
import { useParams } from "react-router";
import { Experiment } from "../../mikro/components/Experiment";

export type IExperimentScreenProps = {};

const ExperimentScreen: React.FC<IExperimentScreenProps> = () => {
  const { experiment } = useParams<{ experiment: string }>();
  if (!experiment) return <></>;
  return (
    <div className="h-full">
      <Experiment id={experiment} />
    </div>
  );
};

export { ExperimentScreen };
