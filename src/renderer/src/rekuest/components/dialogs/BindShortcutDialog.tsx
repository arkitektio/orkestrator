import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { ListSearchField } from "@/core/forms/ListSearchField";
import { SearchField, type SearchFunction } from "@/core/forms/SearchField";
import { useStructureOptions } from "@/core/modules/hooks/useStructureOptions";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { ClientsDocument, type ClientsQuery, useBindShortcutMutation } from "../../api/graphql";
import { useRekuest } from "../../api/hooks";

export type ShortcutBindingValues = { users: string[]; app?: string | null };

/**
 * The apps a binding can name: those whose clients called rekuest (a binding
 * matches the caller's client app, so these are the ones that can ever match),
 * and lok's registered ones, which a deployment may leave empty.
 */
const useAppSearch = (): SearchFunction => {
  const client = useRekuest();
  const fromLok = useStructureOptions("@lok/app", "identifier");
  return useCallback(
    async ({ search, values }) => {
      const [{ data }, registered] = await Promise.all([
        client.query<ClientsQuery>({ query: ClientsDocument, variables: { pagination: { limit: 500 } } }),
        fromLok ? fromLok({ search, values }).catch(() => []) : Promise.resolve([]),
      ]);
      const identifiers = new Set<string>();
      for (const c of data?.clients ?? []) if (c.release) identifiers.add(c.release.app.identifier);
      for (const option of registered) identifiers.add(option.value);
      const term = search?.toLowerCase();
      const wanted = values?.map(String);
      return [...identifiers]
        .filter((id) => (wanted?.length ? wanted.includes(id) : !term || id.toLowerCase().includes(term)))
        .sort()
        .map((id) => ({ value: id, label: id }));
    },
    [client, fromLok],
  );
};

/** The members to pin a shortcut for, and the app it is pinned in. */
export const ShortcutBindingFields = () => {
  const searchUsers = useStructureOptions("@lok/user");
  const searchApps = useAppSearch();
  return (
    <>
      {searchUsers && (
        <ListSearchField
          name="users"
          label="Members"
          search={searchUsers}
          placeholder="Pick members"
          description="Pinned at the top of their menu, where it applies. They cannot unpin it."
        />
      )}
      <SearchField
        name="app"
        label="App"
        search={searchApps}
        placeholder="Every app"
        description="Pinned only when they work in this app. Leave empty for every app."
      />
    </>
  );
};

/** An admin pins a shortcut for members (`bindShortcut`). */
export const BindShortcutDialog = ({ id, name }: { id: string; name?: string }) => {
  const [bind] = useBindShortcutMutation();
  const form = useForm<ShortcutBindingValues>({ defaultValues: { users: [], app: null } });
  // The pin shows in their menus, not here: the toast says it took.
  const { submit, submitting } = useDialogSubmit(
    (values: ShortcutBindingValues) =>
      bind({ variables: { input: { shortcut: id, users: values.users, app: values.app || null } } }),
    {
      errorTitle: "Couldn't pin the shortcut",
      successMessage: "Shortcut pinned for the members you picked",
    },
  );
  const users = form.watch("users");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Pin {name ?? "this shortcut"} for members</DialogTitle>
          <DialogDescription>
            It stays visible to everyone; for the members you pick it sits pinned at the top of
            their menu and palette.
          </DialogDescription>
        </DialogHeader>
        <ShortcutBindingFields />
        <DialogFooter>
          <Button type="submit" disabled={submitting || users.length === 0}>
            Pin
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
