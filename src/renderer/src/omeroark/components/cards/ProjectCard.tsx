import React from "react";
import { OmeroArkProject } from "@/linkers";

import { Card } from "@/components/ui/card";
import { ListProjectFragment } from "../../api/graphql";

interface Props {
  project: ListProjectFragment;

}

const TCard = ({ project }: Props) => {
  return (
    <OmeroArkProject.Smart
      object={project}
    >
      <Card className="px-2 py-2 h-full w-full">
        <OmeroArkProject.DetailLink
          className={({ isActive } /*  */) =>
            "z-10 font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={project}
        >
          {project?.name}
        </OmeroArkProject.DetailLink>
      </Card>
    </OmeroArkProject.Smart>
  );
};

export default React.memo(TCard);