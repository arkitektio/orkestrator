import React from "react";
import { useParams } from "react-router";
import { File } from "../../mikro/components/File";

export type IRoiScreenProps = {};

const FileScreen: React.FC<IRoiScreenProps> = () => {
  const { file } = useParams<{ file: string }>();

  if (!file) return <></>;
  return (
    <div className="h-screen">
      <File id={file} />
    </div>
  );
};

export { FileScreen };
