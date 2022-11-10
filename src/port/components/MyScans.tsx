import React, { useState } from "react";
import {
  BsArrowDownCircleFill,
  BsCaretLeft,
  BsCaretRight,
  BsPlusCircle,
  BsTrash,
} from "react-icons/bs";
import { useNavigate } from "react-router";
import { IconButton } from "../../components/buttons/IconButton";
import { useConfirm } from "../../components/confirmer/confirmer-context";
import { ResponsiveGrid } from "../../components/layout/ResponsiveGrid";
import { Modal } from "../../components/modals/Modal";
import { notEmpty } from "../../floating/utils";
import { GithubRepo, RepoScan } from "../../linker";
import {
  DetailWhaleFragment,
  ListRepoScanFragment,
  useCreateWhaleMutation,
  useDetailRepoScanQuery,
  useRepoScansQuery,
} from "../api/graphql";
import {
  CreatePrivateFaktMutationVariables,
  CreatePublicFaktMutationVariables,
  useCreatePrivateFaktMutation,
  useCreateUserAppMutation,
  useScopesOptionsLazyQuery,
} from "../../man/api/graphql";

import { withPort } from "../PortContext";
import { modalfy, ModalProps } from "../../layout/Modal";
import {
  DialogProvider,
  Submit,
  useDialog,
} from "../../layout/dialog/DialogProvider";
import { TwDialog } from "../../layout/dialog/TwDialog";
import { withMan } from "../../man/context";
import { Form, Formik } from "formik";
import { SelectInputField } from "../../components/forms/fields/select_input";
import { SubmitButton } from "../../components/forms/fields/SubmitButton";
import { SearchSelectInput } from "../../components/forms/fields/search_select_input";
import { TextInputField } from "../../components/forms/fields/text_input";
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
