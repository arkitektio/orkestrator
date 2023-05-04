import { useDatalayer } from "@jhnnsrs/datalayer";
import { Client } from "../../../linker";
import { DetailClientFragment } from "../../api/graphql";

interface AppCardProps {
  client: DetailClientFragment;
}

export const ClientCard = ({ client }: AppCardProps) => {
  const { s3resolve } = useDatalayer();

  return (
    <Client.Smart
      object={client?.id}
      className="bg-back-800 p-3 text-white rounded-md rounded cursor-pointer"
    >
      <div className="flex flex-row">
        <img
          height={64}
          width={64}
          src={
            client?.release?.logo
              ? s3resolve(client?.release?.logo)
              : `https://eu.ui-avatars.com/api/?name=${client?.release?.app?.identifier}&background=random`
          }
          className="h-15 object-fit flex-initial aspect-h-1 aspect-w-1 rounded-md mr-2"
        />
        <Client.DetailLink
          object={client?.id}
          className="flex-grow flex-col truncate"
        >
          <div className="text-xl font-light mb-1 flex truncate">
            {client.release?.app?.identifier}:{client?.release?.version}
          </div>
          <div className="text-sm font-extralight">
            {" "}
            {client.user?.username}
          </div>
        </Client.DetailLink>
      </div>
    </Client.Smart>
  );
};
