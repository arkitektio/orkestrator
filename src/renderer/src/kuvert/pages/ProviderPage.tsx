import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/core/ui/alert";
import { Button } from "@/core/ui/button";
import { DialogButton } from "@/core/ui/dialog-button";
import { PageAction } from "@/core/ui/page-action";
import Timestamp from "@/core/ui/timestamp";
import { Check, Minus, Pencil, Power, PowerOff } from "lucide-react";
import { ListMailProvidersDocument, Provider, ServerSettingsFragment, useGetMailProviderQuery, useUpdateProviderMutation } from "../api/graphql";
import { InfoList } from "../components/InfoList";
import MailAccountList from "../components/lists/MailAccountList";
import { reportKuvertErrorAs } from "../errors";
import { KUVERT_HELP } from "../help";
import { MailProvider } from "../linkers";

const server = (s?: ServerSettingsFragment | null) => s && `${s.host}:${s.port} (${s.security.toLowerCase()})`;

const Urls = ({ urls }: { urls: string[] }) => (
  <span className="flex flex-col gap-1">
    {urls.map((url) => (
      <span key={url} className="break-all font-mono text-xs">
        {url}
      </span>
    ))}
  </span>
);

/** One provider (admins): what it is set up with, what it may do, and the mailboxes linked through it. */
const ProviderPage = asDetailQueryRoute(useGetMailProviderQuery, ({ data }) => {
  const provider = data.mailProvider;
  const { oauth, server: servers } = provider;
  const { openDialog } = useDialog();
  const [update, { loading }] = useUpdateProviderMutation({ refetchQueries: [ListMailProvidersDocument] });

  const setEnabled = (enabled: boolean) =>
    update({ variables: { input: { id: provider.id, enabled } } }).catch(
      reportKuvertErrorAs(enabled ? `Couldn't enable ${provider.name}` : `Couldn't disable ${provider.name}`),
    );

  return (
    <MailProvider.ModelPage
      help={KUVERT_HELP.provider}
      title={provider.name}
      object={provider}
      pageActions={
        <>
          {provider.enabled && (
            <DialogButton
              name="kuvertlink"
              size="sm"
              variant="outline"
              dialogProps={{ provider: provider.id }}
              options={{ size: "medium" }}
            >
              Link through it
            </DialogButton>
          )}
          <PageAction
            size="sm"
            collapse="icon"
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openDialog("kuverteditprovider", { id: provider.id }, { size: "medium" })}
          >
            Edit
          </PageAction>
          <PageAction
            size="sm"
            priority={-10}
            collapse="icon"
            icon={provider.enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            disabled={loading}
            onClick={() => setEnabled(!provider.enabled)}
          >
            {provider.enabled ? "Disable" : "Enable"}
          </PageAction>
        </>
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              ["Kind", provider.kindInfo.label],
              ["Status", provider.enabled ? "Enabled" : "Disabled"],
              ["Mailboxes", provider.mailboxCount],
              ["Client id", oauth && <span className="break-all font-mono text-xs">{oauth.clientId}</span>],
              ["Secret", oauth && (oauth.hasSecret ? "Stored" : "None (public client)")],
              ["Tenant", oauth && provider.kind === Provider.Microsoft && oauth.tenant],
              ["Redirect URLs", oauth && oauth.redirectUrls.length > 0 && <Urls urls={oauth.redirectUrls} />],
              ["Servers", servers && (servers.fixed ? "Fixed" : "Each member names their own")],
              ["Reads via", servers?.fixed && servers.protocol],
              ["Incoming", servers?.fixed && server(servers.incoming)],
              ["Outgoing", servers?.fixed && (server(servers.smtp) ?? "cannot send")],
              ["Copy to Sent", servers && (servers.saveSentCopy ? "Yes" : "No")],
              ["Set up", <Timestamp date={provider.createdAt} relative />],
              ["Changed", <Timestamp date={provider.updatedAt} relative />],
              ["By", provider.creator && <StructureDisplay identifier="@lok/user" id={provider.creator.sub} variant="chip" />],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-3">
        {!provider.enabled && (
          <Alert>
            <PowerOff />
            <AlertTitle>Disabled</AlertTitle>
            <AlertDescription>It links no mailbox, and its mailboxes neither sync nor send.</AlertDescription>
            <AlertAction>
              <Button size="xs" variant="outline" disabled={loading} onClick={() => setEnabled(true)}>
                Enable
              </Button>
            </AlertAction>
          </Alert>
        )}
        <p className="max-w-prose px-1 text-sm text-muted-foreground">{provider.kindInfo.description}</p>
        {provider.kindInfo.capabilities.length > 0 && (
          <ul className="flex max-w-prose flex-col gap-2 px-1 text-sm">
            {provider.kindInfo.capabilities.map((info) => {
              const on = provider.capabilities.includes(info.capability);
              return (
                <li key={info.capability} className={"flex items-start gap-3" + (on ? "" : " text-muted-foreground")}>
                  {on ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <Minus className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span className="flex min-w-0 flex-col">
                    <span>
                      {info.label}
                      {!on && " · off"}
                    </span>
                    <span className="text-xs text-muted-foreground">{info.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {/* Only the mailboxes this admin can see; `mailboxCount` counts every one. */}
        <MailAccountList filters={{ provider: provider.id }} title="Mailboxes you can see" />
      </div>
    </MailProvider.ModelPage>
  );
});

export default ProviderPage;
