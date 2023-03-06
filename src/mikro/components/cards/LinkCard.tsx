import { link } from "fs";
import React from "react";
import { BsTrash } from "react-icons/bs";
import { useConfirm } from "../../../components/confirmer/confirmer-context";
import {
  Dataset,
  Experiment,
  Link,
  linkableModelToIdentifier,
} from "../../../linker";
import { Data } from "../../../pages/Data";
import { structure_to_widget } from "../../../rekuest/widgets/returns/fallbacks/StructureReturnWidget";
import {
  ListDatasetFragment,
  ListLinkFragment,
  useDeleteDatasetMutation,
  useDeleteLinkMutation,
} from "../../api/graphql";
import { withMikro } from "../../MikroContext";

interface LinkCardProps {
  link: ListLinkFragment;
  minimal?: boolean;
}

export const LinkCard = ({ link, minimal }: LinkCardProps) => {
  const { confirm } = useConfirm();

  const [deleteDataset, res] = withMikro(useDeleteLinkMutation)();

  if (!link?.id) return <></>;

  let leftIdentifier =
    link.leftType && linkableModelToIdentifier(link.leftType);
  let rightIdentifier =
    link.rightType && linkableModelToIdentifier(link.rightType);

  return (
    <Link.Smart
      object={link?.id}
      className={`bg-slate-700 text-white rounded shadow-md pl-3  group`}
      additionalMates={(accept, self) => {
        if (!self) return [];

        return [
          {
            accepts: [accept],
            action: async (self, drops) => {
              await confirm({
                message: "Do you really want to delete?",
                subtitle: "Deletion is irreversible!",
                confirmLabel: "Yes delete!",
              });

              await deleteDataset({
                variables: { id: link.id },
              });
            },
            label: <BsTrash />,
            description: "Delete",
          },
        ];
      }}
    >
      <div className="px-1 py-2">
        <Link.DetailLink
          className="flex-grow cursor-pointer font-semibold"
          object={link.id}
        >
          <div className="flex flex-row">
            {leftIdentifier && (
              <div className="flex-1 ">
                {structure_to_widget(leftIdentifier, {
                  value: link.xId,
                  minimal: true,
                })}
              </div>
            )}
            <div className="flex-initial ml-1 font-light">{">"}</div>
            <div className="flex-1 text-center ">{link.relation.name}</div>
            <div className="flex-initial mr-1 font-light">{">"}</div>
            {rightIdentifier && (
              <div className="flex-1 ">
                {structure_to_widget(rightIdentifier, {
                  value: link.yId,
                  minimal: true,
                })}
              </div>
            )}
          </div>
        </Link.DetailLink>
      </div>
    </Link.Smart>
  );
};
