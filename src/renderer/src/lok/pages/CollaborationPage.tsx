import { Link2, Pencil, Trash2 } from "lucide-react";

import { useDialog } from "@/core/dialogs/registry";
import { PageSections } from "@/core/layout/PageSections";
import { Sidebars } from "@/core/layout/Sidebars";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LokCollaboration, LokUser } from "@/core/linkers";
import { CopyButton } from "@/core/ui/copy-button";
import { InfoList } from "@/core/ui/info-list";
import { PageAction } from "@/core/ui/page-action";
import Timestamp from "@/core/ui/timestamp";
import { useGetCollaborationQuery } from "../api/graphql";
import { LOK_HELP } from "../help";

/**
 * One collaboration: lok's name for a key every service of the organization holds what is
 * put in it under. Its links are made here (Share); what each service holds of it, the
 * services show below (their `pageSections` on `@lok/collaboration`).
 */
export const CollaborationPage = asDetailQueryRoute(useGetCollaborationQuery, ({ data }) => {
  const { openDialog } = useDialog();
  const collaboration = data.collaboration;

  return (
    <LokCollaboration.ModelPage
      help={LOK_HELP.collaboration}
      object={collaboration}
      title={collaboration.name}
      pageActions={
        <>
          <PageAction
            alwaysShow
            size="sm"
            icon={<Link2 className="h-4 w-4" />}
            onClick={() => openDialog("sharecollaboration", { collaboration: collaboration.key }, { size: "medium" })}
          >
            Share
          </PageAction>
          <PageAction
            size="sm"
            variant="outline"
            icon={<Pencil className="h-4 w-4" />}
            onClick={() => openDialog("updatecollaboration", { collaboration: collaboration.key }, { size: "small" })}
          >
            Rename
          </PageAction>
          <PageAction
            size="sm"
            variant="outline"
            icon={<Trash2 className="h-4 w-4" />}
            onClick={() => openDialog("deletecollaboration", { collaboration: collaboration.key }, { size: "small" })}
          >
            Delete
          </PageAction>
        </>
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              [
                "Made by",
                collaboration.createdBy && (
                  <LokUser.DetailLink object={collaboration.createdBy} className="hover:underline">
                    {collaboration.createdBy.username}
                  </LokUser.DetailLink>
                ),
              ],
              ["Made", <Timestamp key="made" date={collaboration.createdAt} relative />],
              [
                "Key",
                <span key="key" className="flex min-w-0 items-center gap-1">
                  <span className="truncate font-mono text-xs">{collaboration.key}</span>
                  <CopyButton value={collaboration.key} title="Copy the key" />
                </span>,
              ],
            ]}
          />
        </Sidebars.Tab>
      }
    >
      <div className="flex flex-col gap-4 p-3">
        <div className="flex flex-col gap-1">
          <div className="text-xl font-semibold">{collaboration.name}</div>
          {collaboration.description && <div className="text-sm text-muted-foreground">{collaboration.description}</div>}
        </div>
        {/* What each service holds of it, by its key. */}
        <PageSections placement="main" identifier="@lok/collaboration" object={{ id: collaboration.key }} />
      </div>
    </LokCollaboration.ModelPage>
  );
});

export default CollaborationPage;
