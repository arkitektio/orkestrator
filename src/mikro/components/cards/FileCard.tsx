import { MikroFile } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListOmeroFileFragment } from "../../api/graphql";

interface FileCardProps {
  file: ListOmeroFileFragment;
  mates: MateFinder[];
}

export const FileCard = ({ file, mates }: FileCardProps) => {
  return (
    <MikroFile.Smart
      object={file?.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-back-800 rounded-md truncate border border-1  ${
          isOver && !isDragging
            ? "ring-primary-200 ring-1 ring"
            : "border-back-700"
        } ${isDragging && "ring-primary-200 ring-1 ring"} ${
          isSelected && "ring-1 ring-secondary-500 "
        }`
      }
      mates={mates}
    >
      <div className="px-2 py-2">
        <MikroFile.DetailLink
          className="font-bold text-md mb-2 cursor-pointer"
          object={file.id}
        >
          {file?.name}
        </MikroFile.DetailLink>
        <p className="text-white-700 text-base">{file?.type}</p>
      </div>
    </MikroFile.Smart>
  );
};
