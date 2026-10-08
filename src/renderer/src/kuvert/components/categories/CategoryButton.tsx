import { useDialog } from "@/core/dialogs/registry";
import { toast } from "@/core/notify";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/core/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/core/ui/popover";
import { TooltipButton } from "@/core/ui/tooltip-button";
import { Plus, Tag } from "lucide-react";
import { useState } from "react";
import {
  CategoryChipFragment,
  GetCategoryDocument,
  ListCategoriesDocument,
  ListThreadsDocument,
  useCategorizeMessagesMutation,
  useListCategoriesQuery,
} from "../../api/graphql";
import { toastText } from "../../errors";
import { CategoryDot } from "./CategoryDot";
import { membership } from "./membership";
import { TriCheck } from "./TriCheck";

/**
 * The reader toolbar's category picker: the mailbox's categories, checked
 * when every shown mail is in one (a dash when some are). Picking one puts all
 * shown mail in it, or (when all are) takes them out.
 */
export const CategoryButton = ({
  mail,
  account,
}: {
  mail: readonly { id: string; categories: readonly CategoryChipFragment[] }[];
  account: string;
}) => {
  const { openDialog } = useDialog();
  const [open, setOpen] = useState(false);
  const { data } = useListCategoriesQuery({ variables: { filters: { account } }, skip: !open });
  const [categorize, { loading }] = useCategorizeMessagesMutation({
    refetchQueries: [ListCategoriesDocument, GetCategoryDocument, ListThreadsDocument],
  });
  const messages = mail.map((m) => m.id);
  const anyIn = mail.some((m) => m.categories.length > 0);

  const toggle = (category: CategoryChipFragment) => {
    const all = membership(mail, category.id) === "all";
    categorize({
      variables: { input: { messages, add: all ? [] : [category.id], remove: all ? [category.id] : [] } },
    }).catch((e) => toast.error(toastText(e)));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <TooltipButton variant="ghost" size="icon-lg" tooltip="Categories">
          <Tag className={anyIn ? "fill-current/20 text-primary" : undefined} />
        </TooltipButton>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Category…" />
          <CommandList>
            <CommandEmpty>{data ? "No such category." : "Loading…"}</CommandEmpty>
            {data && data.categories.length > 0 && (
              <CommandGroup>
                {data.categories.map((c) => (
                  <CommandItem key={c.id} value={c.name} disabled={loading} onSelect={() => toggle(c)}>
                    <TriCheck state={membership(mail, c.id)} />
                    <CategoryDot color={c.color} />
                    <span className="truncate">{c.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="__new"
                onSelect={() => {
                  setOpen(false);
                  openDialog("kuvertcategory", { account }, { size: "medium" });
                }}
              >
                <Plus />
                New category…
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
