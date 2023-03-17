import React from "react";
import { App } from "../../../linker";
import { useMikro } from "../../../mikro/MikroContext";
import {
  ListAppFragment,
  ListApplicationFragment,
  ListClientFragment,
} from "../../api/graphql";

interface AppCardProps {
  client: ListClientFragment;
}

export const ClientCard = ({ client }: AppCardProps) => {
  const { s3resolve } = useMikro();

  return (
    <App.Smart
      object={client?.faktapplication?.app?.id}
      className="bg-back-800 p-3 text-white rounded-md rounded cursor-pointer"
    >
      <div className="flex flex-row">
        <img
          height={64}
          width={64}
          src={
            client?.faktapplication?.app?.logo
              ? s3resolve(client?.faktapplication?.app?.logo)
              : `https://eu.ui-avatars.com/api/?name=${client?.faktapplication?.app?.identifier}&background=random`
          }
          className="h-15 object-fit flex-initial aspect-h-1 aspect-w-1 rounded-md mr-2"
        />
        <App.DetailLink
          object={client?.faktapplication?.app?.id}
          className="flex-grow flex-col truncate"
        >
          <div className="text-xl font-light mb-1 flex truncate">
            {client.faktapplication?.app?.identifier}
          </div>
          <div className="text-sm font-extralight">
            {" "}
            {client.faktapplication?.app?.version}
          </div>
        </App.DetailLink>
      </div>
    </App.Smart>
  );
};
