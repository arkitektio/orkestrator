import { CategoryChipFragment } from "../../api/graphql";
import { CategoryDot } from "./CategoryDot";

/**
 * A mail's categories as small coloured chips (null when none). Plain chips,
 * not links: the card header they sit in is itself a button.
 */
export const MessageCategories = ({ categories }: { categories: readonly CategoryChipFragment[] }) =>
  categories.length === 0 ? null : (
    <div className="flex flex-wrap gap-1 pt-1">
      {categories.map((c) => (
        <span
          key={c.id}
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] leading-none text-foreground/80"
        >
          <CategoryDot color={c.color} className="size-1.5" />
          {c.name}
        </span>
      ))}
    </div>
  );
