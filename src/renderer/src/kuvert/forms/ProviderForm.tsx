import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { SwitchField } from "@/core/forms/SwitchField";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { Spinner } from "@/core/ui/spinner";
import { Switch } from "@/core/ui/switch";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useForm, UseFormReturn, useFormContext, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  ListMailProvidersDocument,
  MailProviderFragment,
  Protocol,
  Provider,
  ProviderCapability,
  ProviderKindFragment,
  Security,
  useCreateOAuthProviderMutation,
  useCreateServerProviderMutation,
  useGetMailProviderQuery,
  useProviderKindsQuery,
  useUpdateOAuthProviderMutation,
  useUpdateServerProviderMutation,
} from "../api/graphql";
import { providerIcon } from "../components/providerKind";
import { errorMessageOf, inKuvertWords } from "../errors";
import { MailProvider } from "../linkers";
import { PasswordField, SelectField, ServerFields, serverInput, ServerValues, TextField } from "./fields";

/** The public relay every OAuth client registers (core/authflow/AUTH_FLOWS.md §3). */
const RELAY_URL = "https://go.arkitekt.live/auth/callback/kuvert";

type Values = {
  name: string;
  enabled: boolean;
  capabilities: ProviderCapability[];
  // Gmail, Microsoft
  clientId: string;
  clientSecret: string;
  redirectUrls: string;
  tenant: string;
  // IMAP
  fixed: boolean;
  protocol: Protocol;
  incoming: ServerValues;
  smtp: ServerValues;
  saveSentCopy: boolean;
};

type ValuesForm = UseFormReturn<Values>;

const isOAuth = (kind: Provider) => kind !== Provider.Generic;

/** One URL per line, as the list the API takes. */
const urlsOf = (text: string) =>
  text
    .split(/\s+/)
    .map((url) => url.trim())
    .filter(Boolean);

const EMPTY_SERVER: ServerValues = { host: "", port: null, security: Security.Tls };

/** What every kind takes; null when a field was refused. */
const common = (form: ValuesForm, data: Values) => {
  if (!data.name.trim()) {
    form.setError("name", { message: "Give the provider a name." });
    return null;
  }
  return { name: data.name.trim(), capabilities: data.capabilities };
};

/** The OAuth client's settings (the secret is optional: a public client has none); null when a field was refused. */
const oauthSettings = (form: ValuesForm, data: Values) => {
  const redirectUrls = urlsOf(data.redirectUrls);
  if (!data.clientId.trim()) {
    form.setError("clientId", { message: "The client id of the OAuth client." });
    return null;
  }
  if (redirectUrls.length === 0) {
    form.setError("redirectUrls", { message: "At least one redirect URL registered for the client." });
    return null;
  }
  return { clientId: data.clientId.trim(), redirectUrls, tenant: data.tenant.trim() || null };
};

/** Fixed servers as the API takes them; null when the incoming one is missing. */
const fixedServers = (form: ValuesForm, data: Values) => {
  const incoming = serverInput(data.incoming);
  if (!incoming) {
    form.setError("incoming.host", { message: "Fixed servers need at least the incoming one." });
    return null;
  }
  return { incoming, smtp: serverInput(data.smtp), protocol: data.protocol };
};

/** What the kind can do, each switched on or off for this provider. */
const CapabilitiesField = ({ kind }: { kind: ProviderKindFragment }) => {
  const form = useFormContext<Values>();
  const enabled = useWatch({ control: form.control, name: "capabilities" });
  if (kind.capabilities.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Capabilities</span>
      {kind.capabilities.map((info) => (
        <label key={info.capability} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex min-w-0 flex-col">
            <span>{info.label}</span>
            <span className="text-xs text-muted-foreground">{info.description}</span>
          </span>
          <Switch
            checked={enabled.includes(info.capability)}
            onCheckedChange={(on) =>
              form.setValue(
                "capabilities",
                on ? [...enabled, info.capability] : enabled.filter((c) => c !== info.capability),
                { shouldDirty: true },
              )
            }
          />
        </label>
      ))}
    </div>
  );
};

/** A Gmail or Microsoft provider's OAuth client. `existing`: what is stored, and whether the client id is locked. */
const OAuthFields = ({ kind, existing }: { kind: Provider; existing?: { hasSecret: boolean; locked: boolean } }) => (
  <>
    <fieldset disabled={existing?.locked} className="contents">
      <TextField
        name="clientId"
        label="Client id"
        description={
          existing?.locked
            ? "Stays while mailboxes go through it: their sign-ins belong to this client."
            : kind === Provider.Microsoft
              ? "The application (client) id of the Entra app registration."
              : "The client id of the Google Cloud OAuth client."
        }
      />
    </fieldset>
    <PasswordField
      name="clientSecret"
      label="Client secret"
      description={
        existing?.hasSecret
          ? "Leave empty to keep the stored secret. It is stored encrypted and never shown again."
          : "Empty for a public client (PKCE). It is stored encrypted and never shown again."
      }
    />
    {kind === Provider.Microsoft && (
      <TextField
        name="tenant"
        label="Tenant"
        placeholder="common"
        description="The Entra tenant id or domain; common lets any account sign in."
      />
    )}
    <ParagraphField
      name="redirectUrls"
      label="Redirect URLs"
      placeholder={RELAY_URL}
      description="One per line, the default first. Each must be registered for the client."
    />
  </>
);

/** An IMAP provider's servers: fixed (members give only their login), or each member's own. */
const ServerProviderFields = ({ locked }: { locked: boolean }) => {
  const form = useFormContext<Values>();
  const fixed = useWatch({ control: form.control, name: "fixed" });
  const protocol = useWatch({ control: form.control, name: "protocol" });
  return (
    <>
      <fieldset disabled={locked} className="contents">
        <SwitchField
          name="fixed"
          label="Fixed servers"
          description={
            locked
              ? "Stays while mailboxes go through it."
              : "On: members only give their login. Off: each member names the servers."
          }
        />
      </fieldset>
      {fixed && (
        <>
          <fieldset disabled={locked} className="contents">
            <SelectField
              name="protocol"
              label="Read mail with"
              options={[
                { value: Protocol.Imap, label: "IMAP (folders and flags on the server)" },
                { value: Protocol.Pop3, label: "POP3 (download the inbox)" },
              ]}
            />
          </fieldset>
          <ServerFields prefix="incoming" label={protocol === Protocol.Pop3 ? "POP3" : "IMAP"} />
          <ServerFields prefix="smtp" label="SMTP" />
          <p className="text-xs text-muted-foreground">Without an SMTP server its mailboxes cannot send.</p>
        </>
      )}
      <SwitchField
        name="saveSentCopy"
        label="Keep a copy in Sent"
        description="Off when the server files sent mail itself."
      />
    </>
  );
};

const NewProvider = ({ kind, onBack }: { kind: ProviderKindFragment; onBack?: () => void }) => {
  const navigate = useNavigate();
  const refetchQueries = [ListMailProvidersDocument];
  const [createOAuth] = useCreateOAuthProviderMutation({ refetchQueries });
  const [createServer] = useCreateServerProviderMutation({ refetchQueries });
  const oauth = isOAuth(kind.kind);

  const form = useForm<Values>({
    defaultValues: {
      name: kind.label,
      enabled: true,
      capabilities: kind.capabilities.map((info) => info.capability),
      clientId: "",
      clientSecret: "",
      redirectUrls: RELAY_URL,
      tenant: "",
      fixed: false,
      protocol: Protocol.Imap,
      incoming: { ...EMPTY_SERVER, port: 993 },
      smtp: { ...EMPTY_SERVER, port: 465 },
      saveSentCopy: true,
    },
  });

  // Opens the new provider: that is the confirmation.
  const { submit, submitting } = useDialogSubmit(
    async (data: Values, base: { name: string; capabilities: ProviderCapability[] }) => {
      if (oauth) {
        const settings = oauthSettings(form, data)!;
        const r = await inKuvertWords(
          createOAuth({
            variables: { input: { ...base, ...settings, kind: kind.kind, clientSecret: data.clientSecret || null } },
          }),
        );
        return r.data?.createOAuthProvider.id;
      }
      const servers = data.fixed ? fixedServers(form, data)! : {};
      const r = await inKuvertWords(
        createServer({ variables: { input: { ...base, ...servers, saveSentCopy: data.saveSentCopy } } }),
      );
      return r.data?.createServerProvider.id;
    },
    { errorTitle: `Couldn't set up ${kind.label}`, onSuccess: (id) => id && navigate(MailProvider.linkBuilder(id)) },
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (data) => {
          // A refused field stays in the form; only a valid one is sent.
          const base = common(form, data);
          if (!base) return;
          if (oauth ? !oauthSettings(form, data) : data.fixed && !fixedServers(form, data)) return;
          await submit(data, base);
        })}
        className="flex flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {onBack && (
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onBack} aria-label="Back">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            Set up {kind.label}
          </DialogTitle>
          <DialogDescription>{kind.description}</DialogDescription>
        </DialogHeader>
        <TextField name="name" label="Name" description="What your organization calls it." />
        {oauth ? <OAuthFields kind={kind.kind} /> : <ServerProviderFields locked={false} />}
        <CapabilitiesField kind={kind} />
        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting && <Spinner className="mr-2 size-4" />}
            Set up provider
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/**
 * Set up a provider for the organization (admins): pick a kind the server can
 * run (`providerKinds`), then give it what that kind needs. `kind` skips the
 * choice.
 */
export const CreateProviderForm = (props: { kind?: Provider }) => {
  const { data, error, refetch } = useProviderKindsQuery();
  const [picked, setPicked] = useState<Provider | null>(props.kind ?? null);

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 text-sm">
        <span className="text-destructive">{errorMessageOf(error)}</span>
        <Button size="sm" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!data) return <Spinner className="mx-auto size-5 text-muted-foreground" />;

  const kinds = data.providerKinds;
  const kind = kinds.find((k) => k.kind === picked) ?? (kinds.length === 1 ? kinds[0] : null);
  if (kind) {
    return <NewProvider key={kind.kind} kind={kind} onBack={kinds.length > 1 ? () => setPicked(null) : undefined} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Set up a provider</DialogTitle>
        <DialogDescription>
          A provider is how your organization's members link their mailboxes: an IMAP server, or a Google or Microsoft
          sign-in.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-2">
        {kinds.map((option) => {
          const Icon = providerIcon(option.kind);
          return (
            <button
              key={option.kind}
              type="button"
              onClick={() => setPicked(option.kind)}
              className="group flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-accent"
            >
              <Icon className="h-6 w-6 shrink-0 text-muted-foreground" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const EditProvider = ({ provider }: { provider: MailProviderFragment }) => {
  const [updateOAuth] = useUpdateOAuthProviderMutation();
  const [updateServer] = useUpdateServerProviderMutation();
  const { oauth, server } = provider;
  // While mailboxes go through it, its client id (OAuth) or its protocol and fixedness (IMAP) stay.
  const locked = provider.mailboxCount > 0;

  const form = useForm<Values>({
    defaultValues: {
      name: provider.name,
      enabled: provider.enabled,
      capabilities: provider.capabilities,
      clientId: oauth?.clientId ?? "",
      clientSecret: "",
      redirectUrls: oauth?.redirectUrls.join("\n") ?? "",
      tenant: oauth?.tenant ?? "",
      fixed: server?.fixed ?? false,
      protocol: server?.protocol ?? Protocol.Imap,
      incoming: server?.incoming ?? { ...EMPTY_SERVER, port: 993 },
      smtp: server?.smtp ?? { ...EMPTY_SERVER, port: 465 },
      saveSentCopy: server?.saveSentCopy ?? true,
    },
  });

  const { submit, submitting } = useDialogSubmit(
    async (data: Values, base: { name: string; capabilities: ProviderCapability[] }) => {
      const input = { id: provider.id, enabled: data.enabled, ...base };
      if (oauth) {
        const settings = oauthSettings(form, data)!;
        await inKuvertWords(
          updateOAuth({
            variables: {
              input: {
                ...input,
                ...settings,
                clientId: locked ? undefined : settings.clientId,
                // Omitted, not emptied: the stored secret stays.
                clientSecret: data.clientSecret || undefined,
              },
            },
          }),
        );
        return;
      }
      // Fixed servers off with none before: nothing about servers changes. Off
      // after on (only without mailboxes) clears them.
      const servers = data.fixed
        ? { ...fixedServers(form, data)!, protocol: locked ? undefined : data.protocol }
        : server?.fixed
          ? { incoming: null, smtp: null }
          : {};
      await inKuvertWords(
        updateServer({ variables: { input: { ...input, ...servers, saveSentCopy: data.saveSentCopy } } }),
      );
    },
    { errorTitle: "Couldn't save the provider" },
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (data) => {
          const base = common(form, data);
          if (!base) return;
          if (oauth ? !oauthSettings(form, data) : data.fixed && !fixedServers(form, data)) return;
          await submit(data, base);
        })}
        className="flex flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle>Edit {provider.name}</DialogTitle>
          <DialogDescription>{provider.kindInfo.description}</DialogDescription>
        </DialogHeader>
        <SwitchField
          name="enabled"
          label="Enabled"
          description="A disabled provider links no mailbox, and its mailboxes neither sync nor send."
        />
        <TextField name="name" label="Name" description="What your organization calls it." />
        {oauth ? (
          <OAuthFields kind={provider.kind} existing={{ hasSecret: oauth.hasSecret, locked }} />
        ) : (
          <ServerProviderFields locked={locked} />
        )}
        <CapabilitiesField kind={provider.kindInfo} />
        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting && <Spinner className="mr-2 size-4" />}
            Save
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/** Change a provider (admins): its name, client or servers, capabilities, or whether it is on. */
export const EditProviderForm = (props: { id: string }) => {
  const { data, error } = useGetMailProviderQuery({ variables: { id: props.id } });
  if (error) return <p className="text-sm text-destructive">{errorMessageOf(error)}</p>;
  if (!data) return <Spinner className="mx-auto size-5 text-muted-foreground" />;
  return <EditProvider provider={data.mailProvider} />;
};
