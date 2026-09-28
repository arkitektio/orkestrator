import { useDialog } from "@/core/dialogs/registry";
import { toast } from "@/core/notify";
import { Alert, AlertDescription } from "@/core/ui/alert";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Input } from "@/core/ui/input";
import { Label } from "@/core/ui/label";
import { RadioGroup, RadioGroupItem } from "@/core/ui/radio-group";
import { Spinner } from "@/core/ui/spinner";
import { Switch } from "@/core/ui/switch";
import { cn } from "@/core/util/utils";
import { Check } from "lucide-react";
import { useState } from "react";
import {
  CategoryFragment,
  CategorySync,
  GetMailAccountDocument,
  ListCategoriesDocument,
  ListMessagesDocument,
  ListThreadsDocument,
  useCreateCategoryMutation,
  useGetCategoryQuery,
  useGetMailAccountQuery,
  useUpdateCategoryMutation,
} from "../api/graphql";
import { CATEGORY_COLORS } from "../components/categories/CategoryDot";
import { toastText } from "../errors";

const HEX = /^#[0-9a-f]{6}$/i;

/** The keyword the server derives from a name when none is given, as a hint. */
const keywordHint = (name: string) => "$" + (name.trim().replace(/[^A-Za-z0-9]+/g, "") || "Name");

const SYNC_OPTIONS = [
  {
    value: CategorySync.Local,
    label: "Only here",
    description: "Kept by this service; the mail server never sees it.",
  },
  {
    value: CategorySync.Keyword,
    label: "On the server",
    description: "Kept on the mail server as an IMAP keyword, so other mail clients see it too.",
  },
];

const ColorField = ({ value, onChange }: { value: string; onChange: (color: string) => void }) => (
  <div className="flex flex-col gap-1.5">
    <Label>Colour</Label>
    <div className="flex flex-wrap items-center gap-1.5">
      {CATEGORY_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => onChange(c)}
          className="flex size-6 items-center justify-center rounded-full ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
          style={{ backgroundColor: c }}
        >
          {value.toLowerCase() === c && <Check className="size-3.5 text-white" />}
        </button>
      ))}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="#4f86f7"
        aria-invalid={!!value && !HEX.test(value)}
        className="ml-1 h-7 w-24 font-mono text-xs"
      />
    </div>
  </div>
);

const Edit = ({ account, category }: { account: string; category?: CategoryFragment }) => {
  const { closeDialog } = useDialog();
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color || CATEGORY_COLORS[5]);
  const [sync, setSync] = useState(category?.sync ?? CategorySync.Local);
  const [keyword, setKeyword] = useState(category?.keyword ?? "");
  const [removeKeywords, setRemoveKeywords] = useState(false);
  const { data: mailbox } = useGetMailAccountQuery({ variables: { id: account } });
  const refetchQueries = [GetMailAccountDocument, ListCategoriesDocument, ListThreadsDocument, ListMessagesDocument];
  const [create, created] = useCreateCategoryMutation({ refetchQueries });
  const [update, updated] = useUpdateCategoryMutation({ refetchQueries });
  const loading = created.loading || updated.loading;

  // Folders that do not keep keywords: a KEYWORD category stays local in them.
  const noKeywords = (mailbox?.mailAccount.folders ?? []).filter((f) => f.syncEnabled && !f.keywordsAllowed);
  const toLocal = category?.sync === CategorySync.Keyword && sync === CategorySync.Local;
  const valid = name.trim() !== "" && (!color || HEX.test(color));

  const submit = () => {
    const work = category
      ? update({
          variables: {
            input: {
              id: category.id,
              name: name.trim() !== category.name ? name.trim() : undefined,
              color: color !== category.color ? color : undefined,
              sync: sync !== category.sync ? sync : undefined,
              keyword:
                sync === CategorySync.Keyword && keyword.trim() && keyword.trim() !== category.keyword
                  ? keyword.trim()
                  : undefined,
              removeKeywords: toLocal && removeKeywords,
            },
          },
        })
      : create({
          variables: {
            input: {
              account,
              name: name.trim(),
              color,
              sync,
              keyword: sync === CategorySync.Keyword && keyword.trim() ? keyword.trim() : undefined,
            },
          },
        });
    return work
      .then(() => {
        toast.success(category ? "Category updated" : `Created ${name.trim()}`);
        closeDialog();
      })
      .catch((e) => toast.error(toastText(e)));
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid && !loading) void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>{category ? `Edit ${category.name}` : "New category"}</DialogTitle>
        <DialogDescription>
          Everyone who sees {mailbox?.mailAccount.emailAddress ?? "this mailbox"} sees its categories.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category-name">Name</Label>
        <Input id="category-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Invoices" />
      </div>
      <ColorField value={color} onChange={setColor} />
      <div className="flex flex-col gap-1.5">
        <Label>Where it lives</Label>
        <RadioGroup value={sync} onValueChange={(v) => setSync(v as CategorySync)} className="gap-2">
          {SYNC_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2",
                sync === o.value && "border-primary bg-primary/5",
              )}
            >
              <RadioGroupItem value={o.value} className="mt-0.5" />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">{o.label}</span>
                <span className="text-xs text-muted-foreground">{o.description}</span>
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>
      {sync === CategorySync.Keyword && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category-keyword">Keyword</Label>
          <Input
            id="category-keyword"
            className="font-mono"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={keywordHint(name)}
          />
          <p className="text-xs text-muted-foreground">
            {category
              ? "A new keyword re-keys the category's mail on the server."
              : "Derived from the name when left empty. Mail that already carries it starts out in the category."}
          </p>
          {noKeywords.length > 0 && (
            <Alert>
              <AlertDescription className="text-xs">
                {noKeywords.length === 1 ? `${noKeywords[0].name} does` : `${noKeywords.length} synced folders do`} not keep
                keywords on the server; mail there stays in the category only here.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
      {toLocal && (
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            Also remove <span className="font-mono">{category?.keyword}</span> from the mail on the server
          </span>
          <Switch checked={removeKeywords} onCheckedChange={setRemoveKeywords} />
        </label>
      )}
      <DialogFooter>
        <Button type="submit" disabled={!valid || loading}>
          {loading && <Spinner />}
          {category ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
};

const EditExisting = ({ id }: { id: string }) => {
  const { data } = useGetCategoryQuery({ variables: { id } });
  if (!data) return <Spinner className="mx-auto size-5 text-muted-foreground" />;
  return <Edit account={data.category.account.id} category={data.category} />;
};

/** Create a category of a mailbox (`account`), or edit one (`id`). */
export const CategoryForm = ({ account, id }: { account?: string; id?: string }) => {
  if (id) return <EditExisting id={id} />;
  if (account) return <Edit account={account} />;
  return <p className="text-sm text-muted-foreground">Pick a mailbox to add a category to.</p>;
};
