import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { StructureDisplay } from "@/core/smart/display/StructureDisplay";
import { PageAction } from "@/core/ui/page-action";
import { Switch } from "@/core/ui/switch";
import Timestamp from "@/core/ui/timestamp";
import { PenSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  MailFolderFragment,
  Protocol,
  useGetMailAccountQuery,
  useSyncMailAccountMutation,
  useUpdateMailFolderMutation,
} from "../api/graphql";
import { InfoList } from "../components/InfoList";
import { ProblemBanner } from "../components/ProblemBanner";
import { toastText } from "../errors";
import { sortFolders } from "../format";
import { MailAccount, MailFolder } from "../linkers";

const FolderRow = ({ folder, canToggle }: { folder: MailFolderFragment; canToggle: boolean }) => {
  const [update, { loading }] = useUpdateMailFolderMutation();
  return (
    <MailFolder.Smart object={folder}>
      <div className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
        <MailFolder.DetailLink object={folder} className="min-w-0 truncate">
          {folder.path}
        </MailFolder.DetailLink>
        <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          <span>
            {folder.unreadCount > 0 && `${folder.unreadCount} unread · `}
            {folder.totalCount}
          </span>
          {canToggle && (
            <Switch
              checked={folder.syncEnabled}
              disabled={loading || !folder.selectable}
              title={folder.syncEnabled ? "Synced" : "Not synced"}
              onCheckedChange={(syncEnabled) =>
                update({ variables: { input: { id: folder.id, syncEnabled } } }).catch((e) => toast.error(toastText(e)))
              }
            />
          )}
        </span>
      </div>
    </MailFolder.Smart>
  );
};

/** A mailbox: what is wrong with it (if anything), its folders and what syncs, and how it connects. */
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
              ["Sender name", account.displayName],
              ["Provider", account.provider.toLowerCase()],
              ["Status", account.status.toLowerCase().replace("_", " ")],
              ["Sharing", account.visibility.toLowerCase()],
              ["Reads via", account.protocol],
              ["Incoming", server(account.incomingHost, account.incomingPort, account.incomingSecurity)],
              ["Outgoing", server(account.smtpHost, account.smtpPort, account.smtpSecurity) ?? "cannot send"],
              ["Login", `${account.username} (${account.authMethod === "XOAUTH2" ? "OAuth" : "password"})`],
              ["Copy to Sent", account.saveSentCopy ? "yes" : "no"],
              ["Keep on server", account.protocol === Protocol.Pop3 && (account.popLeaveOnServer ? "yes" : "no")],
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
      <div className="flex flex-col gap-3 p-3">
        <ProblemBanner account={account} />
        <div className="flex flex-col divide-y rounded-md border">
          {sortFolders(account.folders).map((folder) => (
            <FolderRow key={folder.id} folder={folder} canToggle={account.serverSideFolders} />
          ))}
        </div>
      </div>
    </MailAccount.ModelPage>
  );
});

export default AccountPage;
