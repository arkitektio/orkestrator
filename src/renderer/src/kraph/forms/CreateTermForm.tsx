import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
import { KraphTerm } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/core/ui/form";
import { useDebounce } from "@/core/util/hooks/use-debounce";
import { cn } from "@/core/util/utils";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ListTermsDocument, TermKind, useCreateTermMutation, useFindTermQuery } from "../api/graphql";
import { TERM_KIND_HINTS, TERM_KINDS, termKindLabel } from "../lib/terms";

type Values = {
  kind: TermKind;
  key: string;
  label: string;
  description: string;
  purl: string;
};

/**
 * Declare one of the organization's words before any graph uses it.
 *
 * A term's identity is (kind, key), and `createTerm` on an existing pair fills
 * that word in rather than failing — so the dialog looks the pair up as it is
 * typed and offers the existing word instead. Declaring a hidden word shows it
 * again.
 */
export const CreateTermForm = (props: { kind?: TermKind; termKey?: string }) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const [create] = useCreateTermMutation({ refetchQueries: [ListTermsDocument] });

  const form = useForm<Values>({
    defaultValues: {
      kind: props.kind ?? TermKind.Entity,
      key: props.termKey ?? "",
      label: "",
      description: "",
      purl: "",
    },
  });

  const kind = useWatch({ control: form.control, name: "kind" });
  const key = useDebounce(useWatch({ control: form.control, name: "key" }).trim(), 250);
  const { data: found } = useFindTermQuery({
    variables: { kind, key },
    skip: !key,
    fetchPolicy: "cache-and-network",
  });
  const existing = key ? found?.terms.at(0) : undefined;

  const open = (id: string) => {
    closeDialog();
    navigate(KraphTerm.linkBuilder(id));
  };

  // The dialog lands on the term's page, which is the confirmation.
  const { submit: declare, submitting } = useDialogSubmit(
    async (data: Values) => {
      const { data: result } = await create({
        variables: {
          input: {
            kind: data.kind,
            key: data.key.trim(),
            label: data.label.trim() || null,
            description: data.description.trim() || null,
            purl: data.purl.trim() || null,
          },
        },
      });
      return result?.createTerm.id;
    },
    {
      errorTitle: "Couldn't declare the term",
      onSuccess: (id) => {
        if (id) navigate(KraphTerm.linkBuilder(id));
      },
    },
  );

  const submit = async (data: Values) => {
    if (!data.key.trim()) {
      form.setError("key", { message: "A term needs a word" });
      return;
    }
    await declare(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>New term</DialogTitle>
          <DialogDescription>
            A word your organization uses. Graphs that declare it later all share its meaning and its
            claims.
          </DialogDescription>
        </DialogHeader>

        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kind</FormLabel>
              <FormControl>
                <div className="grid grid-cols-2 gap-2" role="radiogroup">
                  {TERM_KINDS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={field.value === option}
                      onClick={() => field.onChange(option)}
                      className={cn(
                        "rounded-md border px-3 py-2 text-left transition-colors",
                        field.value === option
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <div className="text-sm font-medium">{termKindLabel(option)}</div>
                      <div className="text-xs text-muted-foreground">{TERM_KIND_HINTS[option]}</div>
                    </button>
                  ))}
                </div>
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-1">
          <StringField
            name="key"
            label="Word"
            placeholder="AIS"
            description="The word itself. It cannot be changed later — a different word is a different term."
          />
          {existing && (
            <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              “{existing.key}” is already a term ({termKindLabel(existing.kind)})
              {existing.hidden ? ", hidden. Creating it shows it again" : ". Creating it fills in what you add here"}.{" "}
              <Button type="button" variant="link" className="h-auto p-0" onClick={() => open(existing.id)}>
                Open it
              </Button>
            </div>
          )}
        </div>
        <StringField name="label" label="Label" placeholder="Axon initial segment" description="A human readable name." />
        <ParagraphField
          name="description"
          label="Description"
          description="What does this word mean? Every graph that declares it inherits this meaning."
        />
        <StringField
          name="purl"
          label="PURL"
          placeholder="http://purl.obolibrary.org/obo/…"
          description="Where this corresponds to a published ontology term."
        />

        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : existing ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default CreateTermForm;
