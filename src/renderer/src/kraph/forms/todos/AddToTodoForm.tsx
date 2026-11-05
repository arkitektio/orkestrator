import { useDialog } from "@/core/dialogs/registry";
import { structureLabel } from "@/core/modules/export/structureLabel";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { toast } from "@/core/notify";
import type { Structure } from "@/core/types";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { ErrorNote } from "@/core/ui/error-note";
import { Form } from "@/core/ui/form";
import type { SearchOptions } from "@arkitektio/bsx/ports/forms/SearchField";
import { SearchField } from "@arkitektio/bsx/ports/forms/SearchField";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import {
  TodoListDocument,
  useAttachToTodoItemMutation,
  useCreateTodoItemMutation,
  useTodoItemsLazyQuery,
  useTodoListsLazyQuery,
} from "../../api/graphql";
import { todoTitleFor } from "../../lib/todos";

type Values = { list: string | null; item: string | null; title: string };

/**
 * Put objects on a todo item: an existing one on a list, or a new one named by
 * the title typed (or after the objects). The fields alone, so the "Add to
 * todo…" dialog and the page bar's todo popover share them; `onAdded` is told
 * once the objects are on the item.
 */
export const AddToTodoFields = ({
  structures,
  onAdded,
  submitLabel = "Add",
}: {
  structures: Structure[];
  onAdded?: () => void;
  submitLabel?: string;
}) => {
  const [fetchLists] = useTodoListsLazyQuery();
  const [fetchItems] = useTodoItemsLazyQuery();
  const [attach] = useAttachToTodoItemMutation();
  const [create] = useCreateTodoItemMutation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const form = useForm<Values>({ defaultValues: { list: null, item: null, title: "" } });
  const list = form.watch("list");
  const item = form.watch("item");

  const searchLists = useCallback(
    async ({ search, values }: SearchOptions) => {
      const { data } = await fetchLists({
        variables: { filters: values?.length ? { ids: values.map(String) } : { search: search || undefined }, pagination: { limit: 20 } },
      });
      return (data?.todoLists ?? []).map((todoList) => ({ value: todoList.id, label: `${todoList.project.name} / ${todoList.name}` }));
    },
    [fetchLists],
  );

  const searchItems = useCallback(
    async ({ search, values }: SearchOptions) => {
      if (!list) return [];
      const { data } = await fetchItems({
        variables: { filters: values?.length ? { ids: values.map(String) } : { list, search: search || undefined }, pagination: { limit: 20 } },
      });
      return (data?.todoItems ?? []).map((todoItem) => ({ value: todoItem.id, label: todoItem.title }));
    },
    [fetchItems, list],
  );

  const pairs = structures.map((structure) => ({ identifier: structure.identifier, object: structure.id }));
  // No title typed: the item is named after what it is about.
  const defaultTitle = todoTitleFor(structures.map(structureLabel));

  const submit = async (values: Values) => {
    setError(null);
    setSubmitting(true);
    try {
      if (!values.list) throw new Error("Pick a todo list first.");
      // The board, and every active "items carrying …" read (the Knowledge sidebar, the page bar, My todos).
      const refetchQueries = [{ query: TodoListDocument, variables: { id: values.list } }, "TodoItems", "TodoTrack", "TodoSummary", "SlimTodoItems", "TodoItem", "TodoItemObjects"];
      if (values.item) {
        await attach({ variables: { input: { item: values.item, structures: pairs } }, refetchQueries });
      } else {
        const title = values.title.trim() || defaultTitle;
        if (!title) throw new Error("Pick an item, or give the new one a title.");
        await create({ variables: { input: { list: values.list, title, structures: pairs } }, refetchQueries });
      }
      form.reset({ list: values.list, item: null, title: "" });
      onAdded?.();
    } catch (failure) {
      setError(failure);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form className="flex flex-col gap-3" onSubmit={form.handleSubmit(submit)}>
        <SearchField name="list" label="List" search={searchLists} placeholder="Pick a todo list" />
        {list && (
          <SearchField
            key={list}
            name="item"
            label="Item"
            search={searchItems}
            searchKey={list}
            placeholder="A new item"
            description="Leave empty to make a new item"
          />
        )}
        {list && !item && (
          <StringField
            name="title"
            label="New item"
            placeholder={defaultTitle ?? "Annotate these images"}
            description="Leave empty to name it after the objects"
          />
        )}
        {error ? <ErrorNote error={error} title="Couldn't add to the todo list" /> : null}
        <Button type="submit" className="self-end" disabled={submitting || !list}>
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
};

/**
 * "Add to todo…" as a dialog, for the local action on any datum (one or many
 * selected). Nothing on screen shows the result there, so a toast says it.
 */
export const AddToTodoForm = ({ structures }: { structures: Structure[] }) => {
  const { closeDialog } = useDialog();
  const many = structures.length === 1 ? "it" : `these ${structures.length}`;

  return (
    <div className="flex flex-col gap-3">
      <DialogHeader>
        <DialogTitle>Add to todo</DialogTitle>
        <DialogDescription>Put {many} on a todo item, each with its own Done.</DialogDescription>
      </DialogHeader>
      <div className="flex flex-wrap gap-1">
        {structures.map((structure) => (
          <StructureDisplay key={`${structure.identifier}:${structure.id}`} identifier={structure.identifier} id={structure.id} variant="chip" />
        ))}
      </div>
      <AddToTodoFields
        structures={structures}
        onAdded={() => {
          toast.success("Added to the todo list");
          closeDialog();
        }}
      />
    </div>
  );
};

export default AddToTodoForm;
