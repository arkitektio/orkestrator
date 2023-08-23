import React from "react";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { notEmpty } from "../../floating/utils";
import { Client } from "../../linker";
import { withLok } from "../LokContext";
import {
  MyPrivateClientsDocument,
  MyPrivateClientsQuery,
  useDeleteClientMutation,
  useMyPrivateClientsQuery,
} from "../api/graphql";
export type IAppProps = {
  onAppClicked?: (clientID: string) => void;
};

const MyClients: React.FC<IAppProps> = ({ onAppClicked }) => {
  const { data } = withLok(useMyPrivateClientsQuery)();

  const { confirm } = useConfirm();

  const [deletePrivateFakt] = withLok(useDeleteClientMutation)({
    update(cache, result) {
      const query = cache.readQuery<MyPrivateClientsQuery>({
        query: MyPrivateClientsDocument,
      });
      cache.writeQuery({
        query: MyPrivateClientsDocument,
        data: {
          privatefaktapps: query?.myPrivateClients?.filter(
            (t: any) => t.id !== result.data?.deleteClient?.id
          ),
        },
      });
    },
  });

  return (
    <>
      <span className="font-light text-xl text-white">
        {" "}
        Private Applications{" "}
      </span>
      <div className="grid grid-cols-6 gap-3 mt-2 ">
        {data?.myPrivateClients?.filter(notEmpty).map((client, index) => (
          <Client.Smart
            object={client.id}
            key={index}
            className="bg-white rounded shadow-md pl-3 pr-2 py-2 flex group"
            mates={[]}
          >
            <Client.DetailLink
              object={client.id}
              className="flex-none cursor-pointer"
              onClick={() =>
                client?.id && onAppClicked && onAppClicked(client?.id)
              }
            >
              {client?.release?.app?.identifier}/{client?.release?.version}
            </Client.DetailLink>
          </Client.Smart>
        ))}
      </div>
    </>
  );
};

export { MyClients };
