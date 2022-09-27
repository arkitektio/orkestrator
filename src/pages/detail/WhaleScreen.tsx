import React from "react";
import { useParams } from "react-router";
import { Whale } from "../../port/components/screens/Whale";

export type ISampleScreenProps = {};

const WhaleScreen: React.FC<ISampleScreenProps> = () => {
  const { whale } = useParams<{ whale: string }>();
  if (!whale) return <></>;
  return (
    <div className="h-full">
      <Whale id={whale} />
    </div>
  );
};

export { WhaleScreen };
