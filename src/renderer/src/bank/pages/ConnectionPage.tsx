import { useDialog } from "@/core/dialogs/registry";
import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/layout/Sidebars";
import { Button } from "@/core/ui/button";
import { PageAction } from "@/core/ui/page-action";
import Timestamp from "@/core/ui/timestamp";
import { ADMIN_ROLE, useHasRoles } from "@/core/connection/roles";
import { BankConnection, BankProvider } from "@/bank/linkers";
import { Link2, LogIn, RefreshCw, Unplug, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "@/core/notify";
import {
  ConnectionStatus,
  ListBankConnectionsDocument,
  Provider,
  useCancelAuthMutation,
  useGetBankConnectionQuery,
  useSyncConnectionMutation,
} from "../api/graphql";
import AccountCard from "../components/cards/AccountCard";
import { ConnectionStatusBadge } from "../components/ConnectionStatus";
import { InfoList } from "@/core/ui/info-list";
import { ProblemBanner, useRelink } from "../components/ProblemBanner";
import { toastText } from "../errors";
import { formatDay } from "../format";
import { syncBudget } from "../sync";
import { BANK_HELP } from "../help";

/**
 * A login that was started but never finished: continue it (the server keeps
 * its session) or throw it away. Past `pendingExpiresAt` it can only go. Both
 * go by the login's `state`, which the server tells only whoever started it.
 */
const PendingLogin = ({
  connection,
  onCancel,
  cancelling,
}: {
  connection: { isAbandoned: boolean; pendingExpiresAt?: string | null; pendingAuth?: { state: string } | null };
  onCancel: (state: string) => void;
  cancelling: boolean;
}) => {
  const { openDialog } = useDialog();
  const state = connection.pendingAuth?.state;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border p-3 text-sm">
      <LogIn className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1">
        {connection.isAbandoned ? (
          "This login was never finished and can no longer be completed."
        ) : (
          <>
            This login is not finished yet.
            {connection.pendingExpiresAt && (
              <span className="text-muted-foreground">
                {" "}It can be continued until <Timestamp date={connection.pendingExpiresAt} relative />.
              </span>
            )}
          </>
        )}
      </span>
      {state && !connection.isAbandoned && (
        <Button size="sm" onClick={() => openDialog("banklink", { resume: state }, { size: "medium" })}>
          Continue login
        </Button>
      )}
      {state && (
        <Button size="sm" variant="outline" disabled={cancelling} onClick={() => onCancel(state)}>
          <X className="h-4 w-4" /> {connection.isAbandoned ? "Remove" : "Cancel"}
        </Button>
      )}
    </div>
  );
};

/**
 * A connection whose provider was removed or switched off cannot sync until an
 * admin sets it up again; say so instead of leaving a greyed-out button.
 */
const ProviderProblem = ({
  connection,
  admin,
}: {
  connection: { bankProvider?: { id: string; name: string; enabled: boolean } | null };
  admin: boolean;
}) => {
  const provider = connection.bankProvider;
  if (provider?.enabled) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <Unplug className="h-4 w-4 shrink-0 text-amber-500" />
      <span className="flex-1">
        {provider
          ? `${provider.name}, the provider this connection goes through, is disabled. It cannot sync until it is enabled again.`
          : "This connection is attached to no provider. It cannot sync until an admin sets its provider up again."}
        {!admin && " Ask an admin of your organization."}
      </span>
      {admin && (
        <Button size="sm" variant="outline" asChild>
          <Link to={provider ? BankProvider.linkBuilder(provider.id) : "/bank/providers"}>
            {provider ? "Open provider" : "Providers"}
          </Link>
        </Button>
      )}
    </div>
  );
};

const ConnectionPage = asDetailQueryRoute(useGetBankConnectionQuery, ({ data }) => {
  const connection = data.bankConnection;
  const navigate = useNavigate();
  const relink = useRelink();
  // The provider's page is the admins'; everyone else reads its name.
  const admin = useHasRoles(ADMIN_ROLE);
  const through = connection.bankProvider;
  const scalable = connection.provider === Provider.Scalable;
  const pending = connection.status === ConnectionStatus.Pending;
  const budget = syncBudget(connection);

  const [sync, { loading: syncing }] = useSyncConnectionMutation({ variables: { id: connection.id } });
  const [cancel, { loading: cancelling }] = useCancelAuthMutation({
    refetchQueries: [ListBankConnectionsDocument],
  });

  const cancelLogin = (state: string) =>
    cancel({ variables: { state } })
      .then(() => {
        toast.success("Login cancelled");
        navigate("/bank/connections", { replace: true });
      })
      .catch((e) => toast.error(toastText(e)));

  return (
    <BankConnection.ModelPage
      help={BANK_HELP.connection}
      title={connection.aspspName}
      object={connection}
      pageActions={
        <>
          {connection.status === ConnectionStatus.Active && (
            <PageAction
              size="sm"
              collapse="icon"
              icon={<RefreshCw className={"h-4 w-4" + (syncing ? " animate-spin" : "")} />}
              disabled={syncing || budget.blocked}
              title={budget.title}
              onClick={() =>
                sync()
                  .then((r) => toast.success(`Synced ${r.data?.syncConnection.length ?? 0} accounts`))
                  .catch((e) => toast.error(toastText(e, connection)))
              }
            >
              Sync all
            </PageAction>
          )}
          {!pending && (
            <PageAction size="sm" collapse="icon" icon={<Link2 className="h-4 w-4" />} onClick={() => relink(connection)}>
              {scalable ? "Log in again" : "Relink"}
            </PageAction>
          )}
        </>
      }
      additionalSidebars={
        <Sidebars.Tab label="Info">
          <InfoList
            rows={[
              [
                "Status",
                <ConnectionStatusBadge
                  status={connection.status}
                  needsReauth={connection.needsReauth}
                  linkStep={connection.linkStep}
                  isAbandoned={connection.isAbandoned}
                />,
              ],
              [
                "Through",
                through ? (
                  admin ? (
                    <BankProvider.DetailLink object={through} className="underline-offset-2 hover:underline">
                      {through.name}
                    </BankProvider.DetailLink>
                  ) : (
                    through.name
                  )
                ) : scalable ? (
                  "Scalable login"
                ) : (
                  "Enable Banking (PSD2)"
                ),
              ],
              ["Country", !scalable && connection.aspspCountry],
              ["Started", <Timestamp date={connection.createdAt} relative />],
              ["Linked", connection.linkedAt && <Timestamp date={connection.linkedAt} relative />],
              ["Consent until", connection.validUntil && formatDay(connection.validUntil)],
              ["Syncs left today", !pending && budget.remaining],
              ["Next sync allowed", budget.until && <Timestamp date={budget.until} relative />],
              ["By", connection.creator?.preferredUsername],
            ]}
          />
        </Sidebars.Tab>
      }
      defaultSidebar="Info"
    >
      <div className="p-6 flex flex-col gap-4">
        {pending ? (
          <PendingLogin connection={connection} onCancel={cancelLogin} cancelling={cancelling} />
        ) : (
          <ProblemBanner
            code={connection.lastErrorCode}
            message={connection.lastError}
            needsReauth={connection.needsReauth}
            nextSyncAllowedAt={connection.nextSyncAllowedAt}
            relink={connection}
          />
        )}
        {!pending && connection.status !== ConnectionStatus.Revoked && connection.status !== ConnectionStatus.Cancelled && (
          <ProviderProblem connection={connection} admin={admin} />
        )}
        {connection.accounts.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {connection.accounts.map((account) => (
              <AccountCard key={account.id} item={account} />
            ))}
          </div>
        )}
      </div>
    </BankConnection.ModelPage>
  );
});

export default ConnectionPage;
