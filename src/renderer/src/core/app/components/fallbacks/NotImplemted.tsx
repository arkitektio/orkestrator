import { Card } from "@/core/components/ui/card";
import { cn } from "@/core/lib/utils";

export const NotImplementedYet = (props: {
  message?: string;
  className?: string;
}) => {
  return (
    <Card className={cn("text-xs bg-red-700 p-1", props.className)}>
      <b className=" font-semibold"> Not implemented: </b>
      {props.message || "This feature is not implemented yet"}
    </Card>
  );
};
