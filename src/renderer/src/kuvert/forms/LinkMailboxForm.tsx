import { Spinner } from "@/core/ui/spinner";
import { parseRedirect } from "@/core/connection/oauth/redirect";
import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/core/ui/collapsible";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { Input } from "@/core/ui/input";
import { useDebounce } from "@uidotdev/usehooks";
import { ChevronDown, ExternalLink, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "@/core/notify";
import {
  ListMailAccountsDocument,
  MailboxTreeDocument,
  MailPresetFragment,
  Protocol,
  Provider,
  Security,
  useCreateMailAccountMutation,
  useMailPresetsQuery,
} from "../api/graphql";
import { useOAuthLink } from "../auth/useOAuthLink";
import { toastText } from "../errors";
import { MailAccount } from "../linkers";
import { PasswordField, SelectField, ServerFields, serverInput, ServerValues, TextField } from "./fields";

const PROVIDER_NAME: Record<Provider, string> = {
  [Provider.Gmail]: "Google",
  [Provider.Microsoft]: "Microsoft",
  [Provider.Generic]: "the provider",
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Sign in at the provider (Gmail, Microsoft): the browser leg, then back here. */
const OAuthStep = ({
  provider,
  address,
  relink,
  name,
}: {
  provider: Provider;
  address?: string;
  relink?: string;
  name?: string;
}) => {
  const { closeDialog } = useDialog();
  const navigate = useNavigate();
  const onLinked = useCallback(
    (account: { id: string; emailAddress: string }) => {
      toast.success(`${account.emailAddress} linked`);
      closeDialog();
      navigate(MailAccount.linkBuilder(account.id));
    },
    [closeDialog, navigate],
  );
  const auth = useOAuthLink(onLinked);
  const [pasted, setPasted] = useState("");
  const parsed = parseRedirect(pasted);

  // Leaving the dialog mid-login drops the pending session on the server.
  const cancel = useRef(auth.cancel);
  cancel.current = auth.cancel;
  useEffect(() => () => cancel.current(), []);

  const begin = () =>
    auth.begin({ provider, loginHint: address || null, account: relink ?? null, name: name || null });

  if (auth.phase === "idle" || auth.phase === "starting") {
    return (
      <div className="flex flex-col gap-2">
        <Button type="button" onClick={begin} disabled={auth.phase === "starting"}>
          {auth.phase === "starting" && <Spinner className="mr-2 size-4" />}
          Sign in with {PROVIDER_NAME[provider]}
        </Button>
        {auth.error && <span className="text-xs text-destructive">{auth.error}</span>}
      </div>
    );
  }

  if (auth.phase === "expired") {
    return (
      <div className="flex flex-col items-start gap-2 text-sm">
        <span className="flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-destructive" />
          The sign-in was not finished in time.
        </span>
        <Button type="button" variant="outline" size="sm" onClick={begin}>
          Start again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-2">
        <Spinner className="size-4 text-muted-foreground" />
        <span className="flex-1">
          {auth.phase === "completing" ? "Finishing…" : "Finish signing in in your browser."}
        </span>
        {auth.phase === "waiting" && <span className="text-xs tabular-nums text-muted-foreground">{clock(auth.secondsLeft)}</span>}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={auth.reopen}>
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
          Open again
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={auth.cancel}>
          Cancel
        </Button>
      </div>
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ChevronDown className="h-3 w-3" />
          The browser did not come back?
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-2 pt-2">
          <span className="text-xs text-muted-foreground">Paste the address the browser ended up on.</span>
          <div className="flex gap-2">
            <Input
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder={`${auth.session?.redirectUrl ?? "https://…"}?code=…&state=…`}
              className="text-xs"
            />
            <Button
              type="button"
              size="sm"
              disabled={!parsed || auth.phase === "completing"}
              onClick={() => parsed && auth.complete(parsed.code, parsed.state)}
            >
              Finish
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
      {auth.error && <span className="text-xs text-destructive">{auth.error}</span>}
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

/** Username and (app) password. The login is tested before the mailbox is saved. */
const PasswordStep = ({ address, preset }: { address: string; preset?: MailPresetFragment }) => {
  const { closeDialog } = useDialog();
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

  const submit = (v: PasswordValues) =>
    create({
      variables: {
        input: {
          emailAddress: address.trim(),
          password: v.password,
          name: v.name.trim() || null,
          displayName: v.displayName.trim() || null,
          protocol: v.protocol,
          username: v.username.trim() || null,
          incoming: serverInput(v.incoming),
          smtp: serverInput(v.smtp),
          smtpUsername: v.smtpUsername.trim() || null,
          smtpPassword: v.smtpPassword || null,
        },
      },
    })
      .then((r) => {
        const account = r.data?.createMailAccount;
        toast.success(`${address} linked`);
        closeDialog();
        if (account) navigate(MailAccount.linkBuilder(account.id));
      })
      .catch((e) => toast.error(toastText(e)));

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
        <DialogFooter>
          <Button type="submit" disabled={loading || !address.includes("@")}>
            {loading ? "Testing the login…" : "Add mailbox"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

/**
 * Link a mailbox. The address picks the provider's preset: Gmail and
 * Microsoft sign in through the browser (when this deployment has an OAuth
 * client for them), anything else with a username and password. `relink`
 * signs an existing OAuth mailbox in again.
 */
export const LinkMailboxForm = (props: { relink?: string; provider?: Provider; address?: string }) => {
  const [address, setAddress] = useState(props.address ?? "");
  const lookup = useDebounce(address.trim(), 400);
  const { data, loading } = useMailPresetsQuery({
    variables: { address: lookup },
    skip: !!props.relink || !lookup.includes("@"),
  });
  const preset = data?.mailPresets[0];
  const oauthProvider = props.relink
    ? props.provider
    : preset?.oauth && preset.oauthConfigured
      ? preset.provider
      : undefined;
  const [name, setName] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>{props.relink ? "Sign in again" : "Add a mailbox"}</DialogTitle>
        <DialogDescription>
          {props.relink
            ? "The mailbox's sign-in ran out. Its mail and folders are kept."
            : "Mail is synced to the server and read here. The mailbox stays private unless you share it."}
        </DialogDescription>
      </DialogHeader>
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
          {preset?.oauth && !preset.oauthConfigured && (
            <span className="text-xs text-muted-foreground">
              {preset.name} sign-in is not set up on this server; use an app password instead.
            </span>
          )}
        </div>
      )}
      {oauthProvider ? (
        <>
          {!props.relink && <Input placeholder="Name (optional), e.g. Work" value={name} onChange={(e) => setName(e.target.value)} />}
          <OAuthStep provider={oauthProvider} address={address.trim()} relink={props.relink} name={name.trim()} />
        </>
      ) : (
        address.includes("@") && <PasswordStep key={preset?.key ?? "generic"} address={address} preset={preset} />
      )}
    </div>
  );
};
