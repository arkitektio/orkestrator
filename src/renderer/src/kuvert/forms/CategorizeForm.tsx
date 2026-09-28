import { useDialog } from "@/core/dialogs/registry";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Spinner } from "@/core/ui/spinner";
import { useState } from "react";
import {
  GetCategoryDocument,
  ListCategoriesDocument,
  ListMessageFragment,
  ListThreadsDocument,
  useCategorizeMessagesMutation,
  useListCategoriesQuery,
  useListMessagesQuery,
} from "../api/graphql";
import { CategoryDot } from "../components/categories/CategoryDot";
import { categorizeDelta, Membership, membership } from "../components/categories/membership";
import { TriCheck } from "../components/categories/TriCheck";
import { toastText } from "../errors";

type Group = { account: ListMessageFragment["account"]; mail: ListMessageFragment[] };

const byAccount = (messages: readonly ListMessageFragment[]): Group[] => {
  const groups = new Map<string, Group>();
  for (const m of messages) {
    const group = groups.get(m.account.id) ?? { account: m.account, mail: [] };
    group.mail.push(m);
    groups.set(m.account.id, group);
  }
  return [...groups.values()];
};

/** One mailbox's categories, each cycling between in (all), out (none) and — when it started so — some. */
const AccountCategories = ({
  group,
  wanted,
  onChange,
  titled,
}: {
  group: Group;
  wanted: Record<string, Membership>;
  onChange: (category: string, state: Membership) => void;
  titled: boolean;
}) => {
  const { data } = useListCategoriesQuery({ variables: { filters: { account: group.account.id } } });

  return (
    <div className="flex flex-col gap-1">
      {titled && <span className="px-2 text-xs font-medium text-muted-foreground">{group.account.emailAddress}</span>}
      {!data && <Spinner className="mx-auto size-4 text-muted-foreground" />}
      {data?.categories.map((c) => {
        const state = wanted[c.id] ?? membership(group.mail, c.id);
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id, state === "all" ? "none" : "all")}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
          >
            <TriCheck state={state} />
            <CategoryDot color={c.color} />
            <span className="min-w-0 flex-1 truncate">{c.name}</span>
          </button>
        );
      })}
      {data?.categories.length === 0 && (
        <span className="px-2 text-sm text-muted-foreground">No categories yet; add them on the mailbox's page.</span>
      )}
    </div>
  );
};

/** Put mail into categories of its mailbox and take it out; mail of several mailboxes is grouped by mailbox. */
export const CategorizeForm = ({ messages }: { messages: string[] }) => {
  const { closeDialog } = useDialog();
  const { data } = useListMessagesQuery({
    variables: { filters: { ids: messages }, pagination: { limit: messages.length } },
  });
  // Per mailbox, per category: what the member asked for (absent = as it is).
  const [wanted, setWanted] = useState<Record<string, Record<string, Membership>>>({});
  const [categorize, { loading }] = useCategorizeMessagesMutation({
    refetchQueries: [ListCategoriesDocument, GetCategoryDocument, ListThreadsDocument],
  });
  const groups = data ? byAccount(data.messages) : [];

  const save = async () => {
    try {
      for (const group of groups) {
        const { add, remove } = categorizeDelta(group.mail, wanted[group.account.id] ?? {});
        if (add.length || remove.length) {
          await categorize({ variables: { input: { messages: group.mail.map((m) => m.id), add, remove } } });
        }
      }
      toast.success("Categories updated");
      closeDialog();
    } catch (e) {
      toast.error(toastText(e));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Categorize {messages.length === 1 ? "mail" : `${messages.length} mails`}</DialogTitle>
        <DialogDescription>Categories belong to a mailbox; everyone who sees it sees them.</DialogDescription>
      </DialogHeader>
      {!data ? (
        <Spinner className="mx-auto size-5 text-muted-foreground" />
      ) : (
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {groups.map((group) => (
            <AccountCategories
              key={group.account.id}
              group={group}
              titled={groups.length > 1}
              wanted={wanted[group.account.id] ?? {}}
              onChange={(category, state) =>
                setWanted((w) => ({ ...w, [group.account.id]: { ...w[group.account.id], [category]: state } }))
              }
            />
          ))}
        </div>
      )}
      <DialogFooter>
        <Button type="button" disabled={loading || Object.keys(wanted).length === 0} onClick={() => void save()}>
          {loading && <Spinner />}
          Save
        </Button>
      </DialogFooter>
    </div>
  );
};
