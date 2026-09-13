import { useGetMemoryDrawerQuery } from "@/rekuest/api/graphql";
import { ReturnWidgetProps } from "@/rekuest/widgets/types";
import React from "react";

const MemoryStructureReturnWidget: React.FC<ReturnWidgetProps> = ({ value }) => {
  const valid =
    !!value && typeof value === "object" && !Array.isArray(value) && "object" in value;

  // The query hook runs on every render (hook order); it is skipped for
  // invalid values instead of being placed after an early return.
  const { data } = useGetMemoryDrawerQuery({
    variables: {
      id: valid ? String((value as Record<string, unknown>).object) : "",
    },
    skip: !valid,
  });

  if (!valid) {
    return (
      <div className="text-white items-center flex justify-center h-full w-full">
        Invalid Memory Structure
      </div>
    );
  }

  return (
    <div className="text-white items-center flex justify-center h-full w-full">
      {data?.memoryDrawer?.label}
    </div>
  );
};

export { MemoryStructureReturnWidget };
