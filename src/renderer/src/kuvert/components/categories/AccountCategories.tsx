import { useDialog } from "@/core/dialogs/registry";
import { usePerformAction } from "@/core/smart/localactions/useLocalAction";
import { Badge } from "@/core/ui/badge";
import { Button } from "@/core/ui/button";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { CategoryFragment, CategorySync, MailAccountFragment } from "../../api/graphql";
import { MailCategory } from "../../linkers";
import { CATEGORY_ACTIONS } from "../../localactions/categories";
import { CategoryDot } from "./CategoryDot";

const DELETE = "kuvert-delete-category";

const CategoryRow = ({ category }: { category: CategoryFragment }) => {
  const { openDialog } = useDialog();
  const { assign, confirmationDialog } = usePerformAction({
    action: CATEGORY_ACTIONS[DELETE],
    actionId: DELETE,
    state: { left: [{ identifier: "@kuvert/category", id: category.id }], isCommand: false },
  });

  return (
    <MailCategory.Smart object={category}>
      <div className="group relative flex items-center gap-2.5 px-3 py-1.5 text-sm">
        <CategoryDot color={category.color} />
        <MailCategory.DetailLink object={category} className="min-w-0 truncate">
          {category.name}
        </MailCategory.DetailLink>
        {category.sync === CategorySync.Keyword && (
          <Badge variant="outline" className="font-mono text-[10px]" title="Kept on the server as this IMAP keyword">
            {category.keyword}
          </Badge>
        )}
        <span className="ml-auto shrink-0 text-xs text-muted-foreground group-hover:invisible">{category.messageCount}</span>
        <div className="absolute inset-y-0 right-2 hidden items-center gap-0.5 group-hover:flex">
          <TooltipButton
            variant="ghost"
            size="icon-sm"
            tooltip="Edit"
            onClick={() => openDialog("kuvertcategory", { id: category.id }, { size: "small" })}
          >
            <Pencil />
          </TooltipButton>
          <TooltipButton variant="ghost" size="icon-sm" tooltip="Delete" onClick={() => void assign()}>
            <Trash2 />
          </TooltipButton>
        </div>
      </div>
      {confirmationDialog}
    </MailCategory.Smart>
  );
};

/**
 * A mailbox's categories on its page: one row each (colour, name, the keyword
 * it is kept as on the server, how much mail is in it), edit and delete on
 * hover, and the button for a new one — alone when there are none.
 */
export const AccountCategories = ({ account }: { account: MailAccountFragment }) => {
  const { openDialog } = useDialog();
  const add = (
    <Button
      variant="ghost"
      size="sm"
      className="self-start text-muted-foreground"
      onClick={() => openDialog("kuvertcategory", { account: account.id }, { size: "small" })}
    >
      <Plus />
      New category
    </Button>
  );

  if (account.categories.length === 0) return add;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-col divide-y rounded-md border">
        {account.categories.map((c) => (
          <CategoryRow key={c.id} category={c} />
        ))}
      </div>
      {add}
    </div>
  );
};
