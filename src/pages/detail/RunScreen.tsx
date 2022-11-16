import React from "react";
import { useParams } from "react-router";
import { Run } from "../../fluss/components/Run";
import { ModuleLayout } from "../../layout/ModuleLayout";

export type IRoiScreenProps = {};

const RunScreen: React.FC<IRoiScreenProps> = () => {
  const { runid } = useParams<{ runid: string }>();

  if (!runid) return <></>;
  return (
    <ModuleLayout>
      <Run id={runid} />
    </ModuleLayout>
  );
};

export { RunScreen };
