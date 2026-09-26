import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { PageAction } from "@/core/ui/page-action";
import { ToggleGroup, ToggleGroupItem } from "@/core/ui/toggle-group";
import { PenSquare, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ListThreadsDocument, useGetMailFolderQuery, useSyncMailAccountMutation } from "../api/graphql";
import { MailSplit } from "../components/split/MailSplit";
import { MailList } from "../components/list/MailList";
import { ProblemBanner } from "../components/ProblemBanner";
import { toastText } from "../errors";
import { MailFolder } from "../linkers";

/** A folder's conversations, newest first. */
const FolderPage = asDetailQueryRoute(useGetMailFolderQuery, ({ data, refetch }) => {
  const folder = data.mailFolder;
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { openSheet } = useDialog();
  const [sync, { loading: syncing }] = useSyncMailAccountMutation({
    variables: { id: folder.account.id, folders: [folder.id] },
    refetchQueries: [ListThreadsDocument],
  });

  return (
    <MailFolder.ModelPage
      title={folder.name}
      object={folder}
      pageActions={
        <>
          <PageAction.Slot collapse="hide">
            <ToggleGroup
              type="single"
              size="sm"
              value={unreadOnly ? "unread" : "all"}
              onValueChange={(v) => v && setUnreadOnly(v === "unread")}
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="unread">Unread</ToggleGroupItem>
            </ToggleGroup>
          </PageAction.Slot>
          <PageAction
            size="sm"
            collapse="icon"
            icon={<RefreshCw className={"h-4 w-4" + (syncing || folder.account.syncing ? " animate-spin" : "")} />}
            disabled={syncing || folder.account.syncing}
            onClick={() =>
              sync()
                .then((r) => {
                  const result = r.data?.syncMailAccount;
                  void refetch();
                  toast.success(result ? `Synced: ${result.created} new` + (result.more ? ", more to come" : "") : "Synced");
                })
                .catch((e) => toast.error(toastText(e)))
            }
          >
            Sync
          </PageAction>
          {folder.account.canSend && (
            <PageAction
              size="sm"
              collapse="icon"
              icon={<PenSquare className="h-4 w-4" />}
              onClick={() => openSheet("kuvertcompose", { account: folder.account.id }, { size: "large" })}
            >
              Compose
            </PageAction>
          )}
        </>
      }
    >
      <MailSplit
        top={
          <>
            <div className="empty:hidden [&>*]:m-2">
              <ProblemBanner account={folder.account} />
            </div>
            {!folder.syncEnabled && (
              <span className="border-b px-3 py-1.5 text-xs text-muted-foreground">
                This folder is not synced; what is shown may be old.
              </span>
            )}
          </>
        }
        list={
          <MailList
            key={`${folder.id}:${unreadOnly}`}
            title={folder.name}
            subtitle={[folder.unreadCount ? `${folder.unreadCount} unread` : null, folder.account.emailAddress]
              .filter(Boolean)
              .join(" · ")}
            source={{
              kind: "threads",
              filters: { folder: folder.id, ...(unreadOnly ? { unread: true } : {}) },
              inFolder: folder.id,
            }}
            empty={
              unreadOnly
                ? { title: "All caught up", description: `Nothing unread in ${folder.name}.` }
                : folder.backfillDone
                  ? { title: "Empty", description: `Nothing in ${folder.name}.` }
                  : { title: "Still syncing", description: "This folder's mail is on its way." }
            }
          />
        }
      />
    </MailFolder.ModelPage>
  );
});

export default FolderPage;
