import { cn } from "@/core/util/utils";
import { BankCategory } from "@/bank/linkers";

export type CategoryLike = { id: string; name: string; color?: string | null };

/**
 * A category as a coloured dot and its name, linking to the category. A
 * `guessed` one (assigned from similar transactions, not by a rule or by hand)
 * shows a hollow dot.
 */
export const CategoryBadge = ({
  category,
  className,
  link = true,
  guessed = false,
}: {
  category: CategoryLike;
  className?: string;
  link?: boolean;
  guessed?: boolean;
}) => {
  const color = category.color ?? undefined;
  const inner = (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", className)}
      title={guessed ? "Guessed from similar transactions" : undefined}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          guessed ? "border-[1.5px] border-muted-foreground" : "bg-muted-foreground",
        )}
        style={color ? (guessed ? { borderColor: color } : { backgroundColor: color }) : undefined}
      />
      <span className="truncate">{category.name}</span>
    </span>
  );
  return link ? <BankCategory.DetailLink object={category}>{inner}</BankCategory.DetailLink> : inner;
};
