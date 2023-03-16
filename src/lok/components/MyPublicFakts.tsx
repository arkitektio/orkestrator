import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { notEmpty } from "../../floating/utils";
import { PrivateFakt, PublicFakt } from "../../linker";
import {
  ApplicationsDocument,
  PublicFaktsDocument,
  PublicFaktsQuery,
  useApplicationsQuery,
  useDeletePublicFaktMutation,
  usePrivateFaktsQuery,
  usePublicFaktsQuery,
} from "../api/graphql";
import { withMan } from "../man";
export type IAppProps = {
  onAppClicked?: (clientID: string) => void;
};

const MyPublicFakts: React.FC<IAppProps> = ({ onAppClicked }) => {
  const { data } = withMan(usePublicFaktsQuery)();

  const { confirm } = useConfirm();

  const [deletePublicFakt] = withMan(useDeletePublicFaktMutation)({
    update(cache, result) {
      const query = cache.readQuery<PublicFaktsQuery>({
        query: PublicFaktsDocument,
      });
      cache.writeQuery({
        query: PublicFaktsDocument,
        data: {
          publicfaktapps: query?.publicfaktapps?.filter(
            (t: any) => t.id !== result.data?.deletePublicFakt?.id
          ),
        },
      });
    },
  });

  return (
    <>
      <span className="font-light text-xl text-white">
        {" "}
        Public Applications{" "}
      </span>
      <div className="grid grid-cols-6 gap-3 mt-2 ">
        {data?.publicfaktapps?.filter(notEmpty).map((app, index) => (
          <PublicFakt.Smart
            object={app.id}
            key={index}
            className="bg-white rounded shadow-md pl-3 pr-2 py-2 flex group"
            mates={[]}
          >
            <PublicFakt.DetailLink
              object={app.id}
              className="flex-none cursor-pointer"
            >
              {app?.app?.identifier}/{app?.app?.version}
            </PublicFakt.DetailLink>
          </PublicFakt.Smart>
        ))}
      </div>
    </>
  );
};

export { MyPublicFakts };
