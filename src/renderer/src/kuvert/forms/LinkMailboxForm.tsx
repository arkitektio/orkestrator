import { ADMIN_ROLE, useHasRoles } from "@/core/connection/roles";
import { Label } from "@/core/ui/label";
import { RadioGroup, RadioGroupItem } from "@/core/ui/radio-group";
import { Spinner } from "@/core/ui/spinner";
import { AuthFlowPanel } from "@/core/authflow/AuthFlow";
import { useAuthFlow } from "@/core/authflow/useAuthFlow";
import { useDialog } from "@/core/dialogs/registry";
import { useDialogSubmit } from "@/core/dialogs/useDialogSubmit";
import { Button } from "@/core/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/ui/collapsible";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { Input } from "@/core/ui/input";
import { useDebounce } from "@uidotdev/usehooks";
import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  ListMailAccountsDocument,
  ListMailProviderFragment,
  MailboxTreeDocument,
  MailPresetFragment,
  Protocol,
  Provider,
  Security,
  useCreateMailAccountMutation,
  useListMailProvidersQuery,
  useMailPresetsQuery,
  useStartOAuthLinkMutation,
} from "../api/graphql";
import { sessionOf } from "@/core/authflow/contract";
import { providerIcon, serversOf, SIGN_IN_WITH } from "../components/providerKind";
import { errorMessageOf, inKuvertWords } from "../errors";
import { MailAccount } from "../linkers";
import { PasswordField, SelectField, ServerFields, serverInput, ServerValues, TextField } from "./fields";

/** Sign in at the provider (Gmail, Microsoft) through one of the organization's OAuth clients: the browser leg, then back here. */
const OAuthStep = ({
  provider,
  address,
  relink,
  name,
}: {
  provider: ListMailProviderFragment;
  address?: string;
  relink?: string;
  name?: string;
}) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const [start] = useStartOAuthLinkMutation();
  const open = useCallback(async () => {
    const session = (
      await start({
        variables: {
          input: { provider: provider.id, loginHint: address || null, account: relink ?? null, name: name || null },
        },
      })
    ).data?.startOAuthLink;
    return session && sessionOf(session);
  }, [start, provider.id, address, relink, name]);

  const auth = useAuthFlow({
    flow: "kuvert",
    open,
    // Its page opens: that is the confirmation.
    onDone: (session) => {
      closeDialog();
      if (session.result) navigate(MailAccount.linkBuilder(session.result.id));
    },
  });

  // Leaving the dialog mid-login drops the pending session on the server.
  const cancel = useRef(auth.cancel);
  cancel.current = auth.cancel;
  useEffect(() => () => cancel.current(), []);

  if (!auth.session) {
    return (
      <div className="flex flex-col gap-2">
        <Button type="button" onClick={() => void auth.begin()} disabled={auth.opening}>
          {auth.opening && <Spinner className="mr-2 size-4" />}
          Sign in with {SIGN_IN_WITH[provider.kind]}
        </Button>
        {auth.problem && <span className="text-xs text-destructive">{auth.problem}</span>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <AuthFlowPanel auth={auth} onRestart={() => void auth.begin()} />
      {auth.phase?.kind === "approve" && (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={auth.cancel}>
          Cancel
        </Button>
      )}
    </div>
  );
};

type PasswordValues = {
  password: string;
  name: string;
  displayName: string;
  protocol: Protocol;
  username: string;
  incoming: ServerValues;
  smtp: ServerValues;
  smtpUsername: string;
  smtpPassword: string;
};

const fromPreset = (preset: MailPresetFragment | undefined, protocol: Protocol): Pick<PasswordValues, "incoming" | "smtp"> => {
  const incoming = protocol === Protocol.Pop3 ? preset?.pop3 : preset?.imap;
  return {
    incoming: { host: incoming?.host ?? "", port: incoming?.port ?? (protocol === Protocol.Pop3 ? 995 : 993), security: incoming?.security ?? Security.Tls },
    smtp: { host: preset?.smtp?.host ?? "", port: preset?.smtp?.port ?? 465, security: preset?.smtp?.security ?? Security.Tls },
  };
};

/**
 * Username and (app) password, through an IMAP provider. With fixed servers
 * that is all; otherwise the servers too, from the address's preset. The
 * login is tested before the mailbox is saved.
 */
const PasswordStep = ({
  address,
  preset,
  provider,
}: {
  address: string;
  preset?: MailPresetFragment;
  provider: ListMailProviderFragment;
}) => {
  const fixed = !!provider.server?.fixed;
  const navigate = useNavigate();
  const [create, { loading }] = useCreateMailAccountMutation({
    refetchQueries: [ListMailAccountsDocument, MailboxTreeDocument],
  });
  const form = useForm<PasswordValues>({
    defaultValues: {
      password: "",
      name: "",
      displayName: "",
      protocol: Protocol.Imap,
      username: "",
      smtpUsername: "",
      smtpPassword: "",
      ...fromPreset(preset, Protocol.Imap),
    },
  });

  // A new preset (the address changed) or protocol refills the servers.
  const protocol = form.watch("protocol");
  useEffect(() => {
    const servers = fromPreset(preset, protocol);
    form.setValue("incoming", servers.incoming);
    form.setValue("smtp", servers.smtp);
  }, [preset?.key, protocol]);

  // A refused login test stays in the dialog with the server's reason; a
  // linked mailbox opens on its page.
  const { submit, submitting } = useDialogSubmit(
    (v: PasswordValues) =>
      inKuvertWords(
        create({
          variables: {
            input: {
              provider: provider.id,
              emailAddress: address.trim(),
              password: v.password,
              name: v.name.trim() || null,
              displayName: v.displayName.trim() || null,
              username: v.username.trim() || null,
              // A provider with fixed servers takes only the login.
              ...(fixed
                ? {}
                : { protocol: v.protocol, incoming: serverInput(v.incoming), smtp: serverInput(v.smtp) }),
              smtpUsername: v.smtpUsername.trim() || null,
              smtpPassword: v.smtpPassword || null,
            },
          },
        }),
      ),
    {
      errorTitle: "Couldn't link the mailbox",
      onSuccess: (r) => {
        const account = r.data?.createMailAccount;
        if (account) navigate(MailAccount.linkBuilder(account.id));
      },
    },
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-3">
        <PasswordField
          name="password"
          label="Password"
          description={preset?.note || "Many providers want an app password here, not your usual one."}
        />
        <div className="grid grid-cols-2 gap-2">
          <TextField name="name" label="Name" placeholder="Work" />
          <TextField name="displayName" label="Sender name" placeholder="Jane Doe" />
        </div>
        {fixed ? (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-3 w-3" />
              Login ({serversOf(provider.server)})
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-3">
              <TextField name="username" label="Username" placeholder={address || "the address"} />
              <div className="grid grid-cols-2 gap-2">
                <TextField name="smtpUsername" label="SMTP username" placeholder="same as above" />
                <PasswordField name="smtpPassword" label="SMTP password" />
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <Collapsible defaultOpen={!preset}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-3 w-3" />
              Servers{preset ? ` (${preset.name})` : ""}
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3 pt-3">
              <SelectField
                name="protocol"
                label="Read mail with"
                options={[
                  { value: Protocol.Imap, label: "IMAP (folders and flags on the server)" },
                  { value: Protocol.Pop3, label: "POP3 (download the inbox)" },
                ]}
              />
              <ServerFields prefix="incoming" label={protocol === Protocol.Pop3 ? "POP3" : "IMAP"} />
              <TextField name="username" label="Username" placeholder={address || "the address"} />
              <ServerFields prefix="smtp" label="SMTP" />
              <div className="grid grid-cols-2 gap-2">
                <TextField name="smtpUsername" label="SMTP username" placeholder="same as above" />
                <PasswordField name="smtpPassword" label="SMTP password" />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        <DialogFooter>
          <Button type="submit" disabled={loading || submitting || !address.includes("@")}>
            {loading ? "Testing the login…" : "Add mailbox"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/** Nothing to link through: an admin sets a provider up first. */
const NoProvider = ({ kind, children }: { kind?: Provider; children?: React.ReactNode }) => {
  const { openDialog } = useDialog();
  const admin = useHasRoles(ADMIN_ROLE);
  return (
    <div className="flex flex-col items-start gap-3 text-sm">
      <p className="text-muted-foreground">
        {children ?? "Mailboxes are linked through a provider your organization sets up once."}{" "}
        {admin ? "Set one up, then link the mailbox through it." : "Ask an admin of your organization to set one up."}
      </p>
      {admin && (
        <Button size="sm" onClick={() => openDialog("kuvertcreateprovider", { kind }, { size: "medium" })}>
          Set up a provider
        </Button>
      )}
    </div>
  );
};

/** Which of several providers to link through; the first is picked until another is. */
const ProviderChoice = ({
  providers,
  value,
  onChange,
}: {
  providers: ListMailProviderFragment[];
  value: string;
  onChange: (id: string) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-sm font-medium">Link through</span>
    <RadioGroup value={value} onValueChange={onChange} className="gap-1">
      {providers.map((provider) => {
        const Icon = providerIcon(provider.kind);
        const servers = serversOf(provider.server);
        return (
          <Label
            key={provider.id}
            className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 font-normal has-[[data-state=checked]]:border-primary"
          >
            <RadioGroupItem value={provider.id} />
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{provider.name}</span>
            {servers && <span className="shrink-0 text-xs text-muted-foreground">{servers}</span>}
          </Label>
        );
      })}
    </RadioGroup>
  </div>
);

/**
 * The providers a mailbox at `address` can be linked through: the pinned
 * one; else the organization's Google or Microsoft sign-in when the address
 * is theirs; else its IMAP providers (app password).
 */
const candidatesFor = (
  providers: ListMailProviderFragment[],
  preset: MailPresetFragment | undefined,
  pinned: ListMailProviderFragment | undefined,
) => {
  if (pinned) return { candidates: [pinned], noOAuth: false };
  const imap = providers.filter((p) => p.kind === Provider.Generic);
  if (!preset?.oauth) return { candidates: imap, noOAuth: false };
  const oauth = providers.filter((p) => p.kind === preset.provider);
  return oauth.length > 0 ? { candidates: oauth, noOAuth: false } : { candidates: imap, noOAuth: true };
};

/**
 * Link a mailbox through one of the organization's providers (`mailProviders`).
 * The address picks the kind: a Google or Microsoft address signs in through
 * the browser when the organization set that sign-in up, anything else with a
 * username and password through an IMAP provider. Several candidates are
 * offered to choose from, one is used without asking.
 *
 * - `provider` (a provider's id) links through that one: "Link through it".
 * - `relink` signs an existing OAuth mailbox in again, through `provider` (its
 *   own) or, when that is gone or disabled, another of its `kind`.
 */
export const LinkMailboxForm = (props: { relink?: string; provider?: string; kind?: Provider; address?: string }) => {
  const [address, setAddress] = useState(props.address ?? "");
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string | null>(props.provider ?? null);
  const lookup = useDebounce(address.trim(), 400);
  const providers = useListMailProvidersQuery({
    variables: { filters: { enabled: true } },
    fetchPolicy: "cache-and-network",
  });
  const { data, loading } = useMailPresetsQuery({
    variables: { address: lookup },
    skip: !!props.relink || !lookup.includes("@"),
  });
  const preset = data?.mailPresets[0];

  const enabled = providers.data?.mailProviders;
  const { candidates, noOAuth } = useMemo(() => {
    if (!enabled) return { candidates: [], noOAuth: false };
    if (props.relink) return { candidates: enabled.filter((p) => p.kind === props.kind), noOAuth: false };
    // The asked-for provider may be gone or disabled: then the address decides again.
    return candidatesFor(enabled, preset, enabled.find((p) => p.id === props.provider));
  }, [enabled, preset, props.relink, props.kind, props.provider]);
  const provider = candidates.find((p) => p.id === picked) ?? candidates[0];
  const oauth = !!provider && provider.kind !== Provider.Generic;

  const header = (
    <DialogHeader>
      <DialogTitle>{props.relink ? "Sign in again" : "Add a mailbox"}</DialogTitle>
      <DialogDescription>
        {props.relink
          ? "The mailbox's sign-in ran out. Its mail and folders are kept."
          : "Mail is synced to the server and read here. The mailbox stays private unless you share it."}
      </DialogDescription>
    </DialogHeader>
  );

  if (!enabled) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        {providers.error ? (
          <div className="flex flex-col items-start gap-3 text-sm">
            <span className="text-destructive">{errorMessageOf(providers.error)}</span>
            <Button size="sm" onClick={() => providers.refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <Spinner className="mx-auto size-5 text-muted-foreground" />
        )}
      </div>
    );
  }

  if (enabled.length === 0 || (props.relink && candidates.length === 0)) {
    return (
      <div className="flex flex-col gap-4">
        {header}
        <NoProvider kind={props.kind}>
          {props.relink
            ? `The organization has no ${SIGN_IN_WITH[props.kind ?? Provider.Generic]} sign-in enabled any more.`
            : undefined}
        </NoProvider>
      </div>
    );
  }

  const ready = address.includes("@");

  return (
    <div className="flex flex-col gap-4">
      {header}
      {!props.relink && (
        <div className="flex flex-col gap-1.5">
          <Input
            autoFocus
            type="email"
            placeholder="you@example.org"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          {loading && <span className="text-xs text-muted-foreground">Looking up the provider…</span>}
          {ready && noOAuth && candidates.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {preset?.name} sign-in is not set up for your organization; use an app password instead.
            </span>
          )}
        </div>
      )}
      {candidates.length > 1 && (ready || oauth || props.relink) && (
        <ProviderChoice providers={candidates} value={provider!.id} onChange={setPicked} />
      )}
      {!provider ? (
        ready && (
          <NoProvider kind={preset?.oauth ? preset.provider : Provider.Generic}>
            {preset?.oauth
              ? `Neither ${preset.name} sign-in nor an IMAP server is set up for your organization.`
              : "No IMAP provider is set up for your organization."}
          </NoProvider>
        )
      ) : oauth ? (
        <>
          {!props.relink && <Input placeholder="Name (optional), e.g. Work" value={name} onChange={(e) => setName(e.target.value)} />}
          <OAuthStep
            key={provider.id}
            provider={provider}
            address={address.trim()}
            relink={props.relink}
            name={name.trim()}
          />
        </>
      ) : (
        ready && (
          <PasswordStep
            key={`${provider.id}:${preset?.key ?? "generic"}`}
            address={address}
            preset={preset}
            provider={provider}
          />
        )
      )}
    </div>
  );
};
