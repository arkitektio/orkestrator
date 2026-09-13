import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DialogButton } from "@/components/ui/dialogbutton";
import { RekuestImplementation } from "@/linkers";


import {
  MinimalImplementationFragment
} from "@/rekuest/api/graphql";
import { useLiveTask } from "@/rekuest/hooks/useTasks";

interface Props {
  item: MinimalImplementationFragment;

}

const TheCard = ({ item }: Props) => {

  const progress = useLiveTask({
    assignedImplementation: item.id,
  });

  return (
    <RekuestImplementation.Smart object={item} >
      <Card
        className="group border border-gray-200 dark:border-gray-800 aspect-square max-h-lg"
        style={{
          backgroundSize: `${progress?.progress || 0}% 100%`,
          backgroundImage: `linear-gradient(to right, #10b981 ${progress?.progress}%, #10b981 ${progress?.progress}%)`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "left center",
        }}
      >
        <CardHeader className="flex flex-row p-3">
          <div>
            <CardTitle className="mb-2">
              <RekuestImplementation.DetailLink object={item}>
                {" "}
                {item.interface}
              </RekuestImplementation.DetailLink>
            </CardTitle>
            <CardDescription>{item.agent.name}</CardDescription>
            <p className="text-xs text-gray-500">{item.interface}</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-row gap-2">
            <DialogButton name={"implementationassign"} size="sm" dialogProps={{ id: item.id }} variant={"outline"}>Assign </DialogButton>
          </div>
        </CardContent>
      </Card>
    </RekuestImplementation.Smart>
  );
};

export default React.memo(TheCard);