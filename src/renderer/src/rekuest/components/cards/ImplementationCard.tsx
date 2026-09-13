import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { DialogButton } from "@/components/ui/dialogbutton";
import { RekuestImplementation } from "@/linkers";


import {
  ListImplementationFragment,
} from "@/rekuest/api/graphql";
import { PlayCircle } from "lucide-react";

interface Props {
  item: ListImplementationFragment;

}

const TheCard = ({ item }: Props) => {
  return (
    <RekuestImplementation.Smart object={item}>
      <Card className="group hover:shadow-md transition-shadow overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base mb-1">
                <RekuestImplementation.DetailLink object={item} className="hover:text-primary transition-colors">
                  {item.action.name}
                </RekuestImplementation.DetailLink>
              </CardTitle>
              <CardDescription className="line-clamp-2">
                {item.action.description}
              </CardDescription>
              <Badge variant="secondary" className="text-xs font-mono">
              {item.interface}
            </Badge>
            </div>
          </div>
        </CardHeader>
        <CardFooter className="pt-0">

            <DialogButton
              name={"implementationassign"}
              size="sm"
              dialogProps={{ id: item.id }}
              variant={"outline"}
              className="h-8"
            >
              <PlayCircle className="h-3 w-3 mr-1" />
              Assign
            </DialogButton>
        </CardFooter>
      </Card>
    </RekuestImplementation.Smart>
  );
};

export default React.memo(TheCard);