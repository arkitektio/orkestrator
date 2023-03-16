import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { notEmpty } from "../../floating/utils";
import { PrivateFakt } from "../../linker";
import {
  ApplicationsDocument,
  PrivateFaktDocument,
  PrivateFaktsDocument,
  PrivateFaktsQuery,
  useApplicationsQuery,
  useDeletePrivateFaktMutation,
  usePrivateFaktsQuery,
} from "../api/graphql";
import { withMan } from "../man";
export type IAppProps = {
  onAppClicked?: (clientID: string) => void;
};

const MyPrivateFakts: React.FC<IAppProps> = ({ onAppClicked }) => {
  const { data } = withMan(usePrivateFaktsQuery)();

  const { confirm } = useConfirm();

  const [deletePrivateFakt] = withMan(useDeletePrivateFaktMutation)({
    update(cache, result) {
      const query = cache.readQuery<PrivateFaktsQuery>({
        query: PrivateFaktsDocument,
      });
      cache.writeQuery({
        query: PrivateFaktsDocument,
        data: {
          privatefaktapps: query?.privatefaktapps?.filter(
            (t: any) => t.id !== result.data?.deletePrivateFakt?.id
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
        {data?.privatefaktapps?.filter(notEmpty).map((app, index) => (
          <PrivateFakt.Smart
            object={app.id}
            key={index}
            className="bg-white rounded shadow-md pl-3 pr-2 py-2 flex group"
            mates={[]}
          >
            <PrivateFakt.DetailLink
              object={app.id}
              className="flex-none cursor-pointer"
              onClick={() =>
                app?.clientId && onAppClicked && onAppClicked(app?.clientId)
              }
            >
              {app?.app?.identifier}/{app?.app?.version}
            </PrivateFakt.DetailLink>
          </PrivateFakt.Smart>
        ))}
      </div>
    </>
  );
};

export { MyPrivateFakts };
