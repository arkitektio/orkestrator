import React from "react";
import { useParams } from "react-router";
import { Group } from "../../man/screens/Group";

export type IRoiScreenProps = {};

const GroupScreen: React.FC<IRoiScreenProps> = () => {
  const { group } = useParams<{ group: string }>();

  if (!group) return <></>;
  return (
    <div className="h-full relative">
      <Group id={group} />
    </div>
  );
};

export { GroupScreen };
