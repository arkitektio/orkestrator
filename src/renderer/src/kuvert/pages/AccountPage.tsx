import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { PageAction } from "@/core/ui/page-action";
import Timestamp from "@/core/ui/timestamp";
import { PenSquare, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/core/notify";
import { useGetMailAccountQuery, useSyncMailAccountMutation } from "../api/graphql";
import { AccountChanges, changesRoute } from "../components/changes/AccountChanges";
import { InfoList } from "../components/InfoList";
import { ProblemBanner } from "../components/ProblemBanner";
import { AccountSettings } from "../components/settings/AccountSettings";
import { toastText } from "../errors";
import { MailAccount } from "../linkers";

/** A mailbox: what is wrong with it (if anything), and its settings: names, what goes to the server, folders, categories, sign-in. */
const AccountPage = asDetailQueryRoute(useGetMailAccountQuery, ({ data, refetch }) => {
  const account = data.mailAccount;
  const { openSheet } = useDialog();
  const [sync, { loading: syncing }] = useSyncMailAccountMutation({ variables: { id: account.id } });
  const server = (host?: string | null, port?: number | null, security?: string) =>
    host ? `${host}:${port ?? ""} (${security?.toLowerCase()})` : null;

  return (
    <MailAccount.ModelPage
      title={account.name || account.emailAddress}
      object={account}
      pageActions={
        <>
          <PageAction
            size="sm"
            collapse="icon"
            icon={<RefreshCw className={"h-4 w-4" + (syncing || account.syncing ? " animate-spin" : "")} />}
            disabled={syncing || account.syncing}
            onClick={() =>
              sync()
                .then((r) => {
                  const result = r.data?.syncMailAccount;
                  void refetch();
                  toast.success(
                    result
                      ? `Synced ${result.folders} folders: ${result.created} new` + (result.more ? ", more to come" : "")
                      : "Synced",
                  );
                })
                .catch((e) => toast.error(toastText(e)))
            }
          >
            Sync now
          </PageAction>
          {account.canSend && (
            <PageAction
              size="sm"
              collapse="icon"
              icon={<PenSquare className="h-4 w-4" />}
              onClick={() => openSheet("kuvertcompose", { account: account.id }, { size: "large" })}
            >
              Compose
            </PageAction>
          )}
          <MailAccount.ObjectButton alwaysShow object={account} />
        </>
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              ["Address", account.emailAddress],
              ["Provider", account.provider.toLowerCase()],
              ["Status", account.status.toLowerCase().replace("_", " ")],
              ["Sharing", account.visibility.toLowerCase()],
              ["Reads via", account.protocol],
              ["Incoming", server(account.incomingHost, account.incomingPort, account.incomingSecurity)],
              ["Outgoing", server(account.smtpHost, account.smtpPort, account.smtpSecurity) ?? "cannot send"],
              ["Login", `${account.username} (${account.authMethod === "XOAUTH2" ? "OAuth" : "password"})`],
              [
                "Unsynced",
                account.pendingChanges + account.failedChanges > 0 && (
                  <Link to={changesRoute(account.id)} className="underline-offset-2 hover:underline">
                    {account.pendingChanges} pending{account.failedChanges > 0 && `, ${account.failedChanges} failed`}
                  </Link>
                ),
              ],
              ["Last synced", account.lastSyncedAt && <Timestamp date={account.lastSyncedAt} relative />],
              ["Backfill", account.backfillDone ? "complete" : "in progress"],
              ["Linked", <Timestamp date={account.createdAt} relative />],
              [
                "Linked by",
                account.creator && <StructureDisplay identifier="@lok/user" id={account.creator.sub} variant="chip" />,
              ],
              [
                "Shared with",
                account.sharedWith.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {account.sharedWith.map((u) => (
                      <StructureDisplay key={u.id} identifier="@lok/user" id={u.sub} variant="chip" />
                    ))}
                  </div>
                ),
              ],
            ]}
          />
        </Sidebars.Tab>
      }
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 p-3">
        <ProblemBanner account={account} />
        <AccountChanges account={account} />
        <AccountSettings account={account} />
      </div>
    </MailAccount.ModelPage>
  );
});

export default AccountPage;
