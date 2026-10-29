import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { ListSearchField } from "@/core/forms/ListSearchField";
import { SearchField, type SearchFunction } from "@/core/forms/SearchField";
import { useStructureOptions } from "@/core/modules/hooks/useStructureOptions";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useCallback } from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { BindingClientsDocument, type BindingClientsQuery, useBindShortcutMutation } from "../../api/graphql";
import { useRekuest } from "../../api/hooks";
import {
  describeBinding,
  EMPTY_BINDING,
  type ShortcutBindingValues,
  toBindingInput,
} from "../../lib/shortcutBinding";

type Option = { value: string; label: string };

const narrow = (options: Option[], search?: string, values?: (string | number)[]): Option[] => {
  const wanted = values?.map(String);
  const term = search?.toLowerCase();
  return options
    .filter((o) =>
      wanted?.length
        ? wanted.includes(o.value)
        : !term || o.label.toLowerCase().includes(term) || o.value.toLowerCase().includes(term),
    )
    .sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * What a binding can name: the clients that called rekuest (a binding matches
 * the caller's client, so these are the ones that can match today), and lok's
 * registered apps and devices, which a deployment may leave empty.
 */
const useBindingSearches = (): { apps: SearchFunction; clients: SearchFunction; devices: SearchFunction } => {
  const client = useRekuest();
  const lokApps = useStructureOptions("@lok/app", "identifier");
  const lokDevices = useStructureOptions("@lok/device", "nodeId");

  const called = useCallback(async () => {
    const { data } = await client.query<BindingClientsQuery>({
      query: BindingClientsDocument,
      variables: { pagination: { limit: 500 } },
    });
    return data?.clients ?? [];
  }, [client]);

  const apps: SearchFunction = useCallback(
    async ({ search, values }) => {
      const [clients, registered] = await Promise.all([
        called(),
        lokApps ? lokApps({ search, values }).catch(() => []) : Promise.resolve([]),
      ]);
      const identifiers = new Set<string>(registered.map((o) => o.value));
      for (const c of clients) if (c.release) identifiers.add(c.release.app.identifier);
      return narrow([...identifiers].map((id) => ({ value: id, label: id })), search, values);
    },
    [called, lokApps],
  );

  const clients: SearchFunction = useCallback(
    async ({ search, values }) => {
      const options = (await called()).map((c) => ({
        value: c.clientId,
        label: `${c.release ? `${c.release.app.identifier} ${c.release.version}` : "Unknown app"} · ${c.clientId.slice(0, 8)}`,
      }));
      return narrow(options, search, values);
    },
    [called],
  );

  const devices: SearchFunction = useCallback(
    async ({ search, values }) => {
      const [clients, registered] = await Promise.all([
        called(),
        lokDevices ? lokDevices({ search, values }).catch(() => []) : Promise.resolve([]),
      ]);
      // Lok's name wins; a device only rekuest saw shows by its id.
      const byId = new Map<string, string>(registered.map((o): [string, string] => [o.value, o.label]));
      for (const c of clients) if (c.device && !byId.has(c.device.deviceId)) byId.set(c.device.deviceId, c.device.deviceId);
      return narrow([...byId].map(([value, label]) => ({ value, label })), search, values);
    },
    [called, lokDevices],
  );

  return { apps, clients, devices };
};

const BindingSummary = () => {
  const { control } = useFormContext<ShortcutBindingValues>();
  const values = useWatch({ control }) as ShortcutBindingValues;
  return <p className="text-sm text-muted-foreground">{describeBinding(values)}</p>;
};

/**
 * Who a shortcut is pinned for and where: members, app, client and device,
 * each optional. Every one that is set must match; empty ones match anyone.
 */
export const ShortcutBindingFields = () => {
  const searchUsers = useStructureOptions("@lok/user");
  const { apps, clients, devices } = useBindingSearches();
  return (
    <>
      {searchUsers && (
        <ListSearchField
          name="users"
          label="Members"
          search={searchUsers}
          placeholder="Every member"
          description="Pinned at the top of their menu, where it applies. They cannot unpin it. Leave empty for every member."
        />
      )}
      <SearchField
        name="app"
        label="App"
        search={apps}
        placeholder="Every app"
        description="Only when they work in this app."
      />
      <SearchField
        name="client"
        label="Client"
        search={clients}
        placeholder="Every client"
        description="Only in this one installation of an app."
      />
      <SearchField
        name="device"
        label="Device"
        search={devices}
        placeholder="Every device"
        description="Only on this machine."
      />
      <BindingSummary />
    </>
  );
};

/** An admin pins a shortcut for whoever the rule matches (`bindShortcut`). */
export const BindShortcutDialog = ({ id, name }: { id: string; name?: string }) => {
  const [bind] = useBindShortcutMutation();
  const form = useForm<ShortcutBindingValues>({ defaultValues: EMPTY_BINDING });
  // The pin shows in their menus, not here: the toast says it took.
  const { submit, submitting } = useDialogSubmit(
    (values: ShortcutBindingValues) =>
      bind({ variables: { input: { shortcut: id, ...toBindingInput(values) } } }),
    {
      errorTitle: "Couldn't pin the shortcut",
      successMessage: "Shortcut pinned",
    },
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-3">
        <DialogHeader>
          <DialogTitle>Pin {name ?? "this shortcut"}</DialogTitle>
          <DialogDescription>
            It stays visible to everyone; for whoever matches it sits pinned at the top of their
            menu and palette. Narrow it by member, app, client or device.
          </DialogDescription>
        </DialogHeader>
        <ShortcutBindingFields />
        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            Pin
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
