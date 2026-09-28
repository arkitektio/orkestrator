import { ReactNode } from "react";
import { cn } from "@/core/util/utils";

type VerticalListRenderProps<T> = {
  title: ReactNode;
  array: T[] | undefined | null;
  titleClassName?: string;
  children: (item: T, index: number) => ReactNode;
};

export const VerticalListRender = <T,>({
  title,
  array,
  titleClassName,
  children,
}: VerticalListRenderProps<T>) => {
  if (!array || array.length === 0) return null;

  return (
    <div>
      <span
        className={cn(
          "text-sm font-semibold uppercase tracking-wider text-muted-foreground",
          titleClassName,
        )}
      >
        {title}
      </span>
      <div className="mt-2 space-y-2 gap-1">
        {array.map((item, index) => children(item, index))}
      </div>
    </div>
  );
};
