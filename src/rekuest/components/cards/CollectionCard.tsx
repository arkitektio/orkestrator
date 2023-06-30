import { Collection } from "../../../linker";
import { MateFinder } from "../../../mates/types";
import { ListCollectionFragment } from "../../api/graphql";

export const CollectionCard = ({
  collection,
  mates,
}: {
  collection: ListCollectionFragment;
  mates: MateFinder[];
}) => {
  return (
    <Collection.Smart
      object={collection?.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-slate-900 p-3 hover:bg-slate-700 hover:border-slate-600 rounded rounded-md border-slate-700 border-1 border transition-all ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
      mates={mates}
    >
      <Collection.DetailLink className="cursor-pointer" object={collection?.id}>
        <div className="text-xl font-medium mb-2">{collection?.name}</div>
        <div className="text-sm mb-2">{collection?.description}</div>
      </Collection.DetailLink>
    </Collection.Smart>
  );
};
