import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { toast } from "@/core/notify";
import { Button } from "@/core/ui/button";
import { DialogButton } from "@/core/ui/dialog-button";
import { InfoList } from "@/core/ui/info-list";
import { PageAction } from "@/core/ui/page-action";
import Timestamp from "@/core/ui/timestamp";
import { useDialog } from "@/core/dialogs/registry";
import { BankProvider } from "@/bank/linkers";
import { Check, Minus, Pencil, Power, PowerOff } from "lucide-react";
import { ListBankProvidersDocument, useGetBankProviderQuery, useUpdateProviderMutation } from "../api/graphql";
import ConnectionList from "../components/lists/ConnectionList";
import { toastText } from "../errors";
import { BANK_HELP } from "../help";

/** One provider (admins): what it is set up with, what it may do, and the connections made through it. */
const ProviderPage = asDetailQueryRoute(useGetBankProviderQuery, ({ data }) => {
  const provider = data.bankProvider;
  const settings = provider.enableBanking;
  const { openDialog } = useDialog();
  const [update, { loading }] = useUpdateProviderMutation({ refetchQueries: [ListBankProvidersDocument] });

  const setEnabled = (enabled: boolean) =>
    update({ variables: { input: { id: provider.id, enabled } } })
      .then(() => toast.success(enabled ? `${provider.name} enabled` : `${provider.name} disabled`))
      .catch((e) => toast.error(toastText(e)));

  return (
    <BankProvider.ModelPage
      help={BANK_HELP.provider}
      title={provider.name}
      object={provider}
      pageActions={
        <>
          {provider.enabled && (
            <DialogButton
              name="banklink"
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
            onClick={() => openDialog("bankeditprovider", { id: provider.id }, { size: "medium" })}
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
              ["Syncs a day", provider.dailySyncLimit ?? "Unlimited"],
              ["Application id", settings && <span className="break-all font-mono text-xs">{settings.appId}</span>],
              ["Key", settings && <span className="break-all font-mono text-xs">{settings.keyFingerprint}</span>],
              ["Consent", settings && `${settings.consentDays} days`],
              ["Account holders", settings?.psuType],
              [
                "Redirect URLs",
                settings && settings.redirectUrls.length > 0 && (
                  <span className="flex flex-col gap-1">
                    {settings.redirectUrls.map((url) => (
                      <span key={url} className="break-all font-mono text-xs">
                        {url}
                      </span>
                    ))}
                  </span>
                ),
              ],
              ["Set up", <Timestamp date={provider.createdAt} relative />],
              ["Changed", <Timestamp date={provider.updatedAt} relative />],
              ["By", provider.creator?.preferredUsername],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="p-6 flex flex-col gap-6">
        {!provider.enabled && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
            <PowerOff className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1">This provider is disabled: it starts no links and syncs nothing.</span>
            <Button size="sm" disabled={loading} onClick={() => setEnabled(true)}>
              Enable
            </Button>
          </div>
        )}
        <p className="max-w-prose text-sm text-muted-foreground">{provider.kindInfo.description}</p>
        {provider.kindInfo.capabilities.length > 0 && (
          <ul className="flex max-w-prose flex-col gap-2 text-sm">
            {provider.kindInfo.capabilities.map((info) => {
              const on = provider.capabilities.includes(info.capability);
              return (
                <li key={info.capability} className={"flex items-start gap-3" + (on ? "" : " text-muted-foreground")}>
                  {on ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Minus className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
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
        <ConnectionList filters={{ provider: provider.id }} title="Connections" />
      </div>
    </BankProvider.ModelPage>
  );
});

export default ProviderPage;
