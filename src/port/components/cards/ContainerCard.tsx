import React from "react";
import { Container } from "../../../linker";
import { useMikro } from "../../../mikro/MikroContext";
import { ListContainerFragment } from "../../api/graphql";

interface UserCardProps {
  container: ListContainerFragment;
}

export const ContainerCard = ({ container }: UserCardProps) => {
  return (
    <Container.Smart
      object={container.id}
      className="bg-back-800 p-3 text-white rounded-md rounded "
    >
      <div className="flex flex-row">
        <Container.DetailLink
          object={container.id}
          className="flex-grow flex-col truncate"
        >
          <div className="text-xl font-light mb-1 flex">{container.name}</div>
          <div className="text-sm font-extralight">
            {container.whale?.image}
          </div>
        </Container.DetailLink>
      </div>
    </Container.Smart>
  );
};
