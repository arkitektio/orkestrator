import { ReturnWidgetProps } from "@/core/lib/ports/types";

const BoolReturnWidget = ({
  value,
}: ReturnWidgetProps) => {
  return <div className="text-foreground items-center flex justify-center h-full w-full">{value && "true" || "false"}</div>
};

export { BoolReturnWidget };
