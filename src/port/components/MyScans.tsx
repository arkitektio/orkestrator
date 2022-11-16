import React, { useState } from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../floating/utils";
import { RepoScan } from "../../linker";
import { useRepoScansQuery } from "../api/graphql";

import { useDialog } from "../../layout/dialog/DialogProvider";
import { withPort } from "../PortContext";
import { PrepareScanDialog } from "./dialogs/PrepareScanDialog";

export type IMyWhalesProps = {};

const MyRepoScans: React.FC<IMyWhalesProps> = ({}) => {
  const { data } = withPort(useRepoScansQuery)();
  const [show, setShow] = useState(false);

  const { ask } = useDialog();

  const { confirm } = useConfirm();

  return (
    <div>
      <span className="font-light text-xl text-white">My Scans</span>
      <br />
      <ResponsiveGrid>
        {data?.reposcans?.filter(notEmpty).map((s, index) => (
          <RepoScan.Smart
            object={s.id}
            key={index}
            className="max-w-sm rounded shadow-md bg-gray-700 text-white group"
            additionalMates={(accept, self) => {
              if (!self) return [];

              if (accept == "item:@port/reposcan") {
                return [
                  {
                    accepts: [accept],
                    action: async (self, drops) => {
                      await confirm({
                        message: "Do you really want to delete?",
                        subtitle: "Deletion is irreversible!",
                        confirmLabel: "Yes delete!",
                      });
                    },
                    label: <BsTrash />,
                    description: "Delete Run",
                  },
                  {
                    action: async (self, drops) => {
                      let d = await ask(PrepareScanDialog, { scan: s.id });
                    },
                    label: "Appify",
                    description: "Apiffy this scan",
                  },
                ];
              }

              return [];
            }}
          >
            <div className="p-2 ">
              <div className="flex">
                <RepoScan.DetailLink
                  object={s.id}
                  className="flex-grow font-semibold text-xs"
                >
                  {s.identifier}:{s.version}
                </RepoScan.DetailLink>
                <span
                  className="flex-none mt-1 text-white cursor-pointer group-hover:text-red-400"
                  onClick={() => {
                    if (s?.id) {
                      confirm({
                        message: "Do you really want to delete this Whale?",
                        subtitle: "Deletion is irreversible!",
                        confirmLabel: "Yes delete!",
                      })
                        .then(() => {
                          console.log("soinsoin");
                        })
                        .catch(console.log);
                    }
                  }}
                >
                  <BsTrash />
                </span>
              </div>
            </div>
          </RepoScan.Smart>
        ))}
      </ResponsiveGrid>
    </div>
  );
};

export { MyRepoScans };
