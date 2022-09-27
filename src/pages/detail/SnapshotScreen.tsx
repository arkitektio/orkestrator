import React from "react";
import { useParams } from "react-router";
import { Run } from "../../fluss/components/Run";
import { Snapshot } from "../../fluss/components/Snapshot";
import { Roi } from "../../mikro/components/Roi";

export type IRoiScreenProps = {};

const SnapshotScreen: React.FC<IRoiScreenProps> = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) return <></>;
  return (
    <div className="h-screen">
      <Snapshot id={id} />
    </div>
  );
};

export { SnapshotScreen };
