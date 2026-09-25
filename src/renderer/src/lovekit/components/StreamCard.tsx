import { Card } from "@/core/components/ui/card";
import { cn } from "@/core/lib/utils";
import { LovekitStream } from "@/core/linkers";
import { ListStreamFragment } from "../api/graphql";


interface Props {
  item: ListStreamFragment;
  className?: string;
}

const TheCard = ({ item, className }: Props) => {
  return (
    <LovekitStream.Smart object={item}>
      <Card
        className={cn(
          "px-2 py-2 h-20 transition-all ease-in-out duration-200 truncate",
          className,
        )}
      >
        <LovekitStream.DetailLink
          object={item}
          className="px-2 py-2 h-full w-full absolute top-0 left-0 bg-opacity-20 bg-back-999 hover:bg-opacity-10 transition-all ease-in-out duration-200 truncate"
        >
          {item.id}
        </LovekitStream.DetailLink>
      </Card>
    </LovekitStream.Smart>
  );
};

export default TheCard;
