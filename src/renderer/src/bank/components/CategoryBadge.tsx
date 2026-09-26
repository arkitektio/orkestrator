import { cn } from "@/core/util/utils";
import { BankCategory } from "@/bank/linkers";

export type CategoryLike = { id: string; name: string; color?: string | null };

/** A category as a coloured dot and its name, linking to the category. */
export const CategoryBadge = ({
  category,
  className,
  link = true,
}: {
  category: CategoryLike;
  className?: string;
  link?: boolean;
}) => {
  const inner = (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", className)}>
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground"
        style={category.color ? { backgroundColor: category.color } : undefined}
      />
      <span className="truncate">{category.name}</span>
    </span>
  );
  return link ? <BankCategory.DetailLink object={category}>{inner}</BankCategory.DetailLink> : inner;
};
