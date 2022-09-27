import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import {
  ApplicationsDocument,
  useApplicationsQuery,
  useDeleteApplicationMutation,
} from "../../man/api/graphql";
import { withMan } from "../man";
export type IAppProps = {
  onAppClicked?: (clientID: string) => void;
};

const Applications: React.FC<IAppProps> = ({ onAppClicked }) => {
  const { data } = withMan(useApplicationsQuery)();

  const { confirm } = useConfirm();

  const [deleteApplication, res] = withMan(useDeleteApplicationMutation)({
    update(cache, result) {
      const existingApps: any = cache.readQuery({
        query: ApplicationsDocument,
      });
      cache.writeQuery({
        query: ApplicationsDocument,
        data: {
          applications: existingApps.applications.filter(
            (t: any) => t.clientId !== result.data?.deleteApplication?.clientId
          ),
        },
      });
    },
  });

  return (
    <>
      <span className="font-light text-xl"> Registered Applications </span>
      <div className="grid grid-cols-6 gap-3 mt-2 ">
        {data?.applications?.map((app, index) => (
          <div
            key={index}
            className="bg-white rounded overflow-hidden shadow-md pl-3 pr-2 py-2 flex group"
          >
            <span
              className="flex-none cursor-pointer"
              onClick={() =>
                app?.clientId && onAppClicked && onAppClicked(app?.clientId)
              }
            >
              {app?.name}{" "}
            </span>
            <span
              className="flex-grow cursor-pointer"
              onClick={() =>
                app?.clientId && onAppClicked && onAppClicked(app?.clientId)
              }
            ></span>
            <span
              className="flex-none mt-1 text-white cursor-pointer group-hover:text-red-400"
              onClick={() => {
                if (app?.clientId) {
                  confirm({
                    message: "Do you really want to delete?",
                    subtitle: "Deletion is irreversible!",
                    confirmLabel: "Yes delete!",
                  })
                    .then(() => {
                      deleteApplication({
                        variables: { clientId: app?.clientId },
                      });
                    })
                    .catch(console.log);
                }
              }}
            >
              <BsTrash />
            </span>
          </div>
        ))}
      </div>
    </>
  );
};

export { Applications };
