import { MikroLink, linkableModelToIdentifier } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { useConfirm } from "../../../providers/confirmer/confirmer-context";
import { structure_to_widget } from "../../../rekuest/widgets/returns/fallbacks/StructureReturnWidget";
import { ListLinkFragment } from "../../api/graphql";

interface LinkCardProps {
  link: ListLinkFragment;
  minimal?: boolean;
  mates: MateFinder[];
}

export const LinkCard = ({ link, minimal, mates }: LinkCardProps) => {
  const { confirm } = useConfirm();

  if (!link?.id) return <></>;

  let leftIdentifier =
    link.leftType && linkableModelToIdentifier(link.leftType);
  let rightIdentifier =
    link.rightType && linkableModelToIdentifier(link.rightType);

  return (
    <MikroLink.Smart
      object={link?.id}
      className={`bg-slate-700 text-white rounded shadow-md pl-3  group`}
      mates={mates}
    >
      <div className="px-1 py-2">
        <MikroLink.DetailLink
          className="flex-grow cursor-pointer font-semibold"
          object={link.id}
        >
          <div className="flex flex-row">
            {leftIdentifier && (
              <div className="flex-1 ">
                {structure_to_widget({identifier: leftIdentifier, key: "left"}, {
                  value: link.xId,
                  minimal: true,
                })}
              </div>
            )}
            <div className="flex-initial ml-5 font-light">is {">"} </div>
            <div className="flex-1 text-center ">{link.relation.name}</div>
            <div className="flex-initial mr-5 font-light">for {">"}</div>
            {rightIdentifier && (
              <div className="flex-1 ">
                {structure_to_widget({identifier: rightIdentifier, key: "left"}, {
                  value: link.yId,
                  minimal: true,
                })}
              </div>
            )}
          </div>
        </MikroLink.DetailLink>
      </div>
    </MikroLink.Smart>
  );
};
