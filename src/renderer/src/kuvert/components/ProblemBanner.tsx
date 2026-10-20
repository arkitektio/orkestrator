import { ADMIN_ROLE, useHasRoles } from "@/core/connection/roles";
import { useDialog } from "@/core/dialogs/registry";
import { useNavigate } from "react-router-dom";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/core/ui/alert";
import { Button } from "@/core/ui/button";
import { AlertTriangle } from "lucide-react";
import { AuthMethod, ListMailAccountFragment, MailAccountStatus, MailErrorCode } from "../api/graphql";
import { describeError } from "../errors";
import { MailAccount, MailProvider } from "../linkers";
import { relinkProps } from "../relink";
import { LOGIN_ANCHOR } from "./settings/anchors";

type Account = Pick<
  ListMailAccountFragment,
  "id" | "status" | "lastError" | "lastErrorCode" | "authMethod" | "provider" | "emailAddress" | "isOwner" | "mailProvider"
>;

/** The one thing that gets a mailbox working again: sign in again (OAuth) or new credentials. */
export const useRelink = () => {
  const { openDialog } = useDialog();
  const navigate = useNavigate();
  return (account: Account) =>
    account.authMethod === AuthMethod.Xoauth2
      ? openDialog("kuvertlink", relinkProps(account), { size: "medium" })
      : navigate(`${MailAccount.linkBuilder(account.id)}#${LOGIN_ANCHOR}`);
};

/**
 * The organization's side of a mailbox: the provider it goes through was
 * removed or disabled, so it neither syncs nor sends. An OAuth mailbox can
 * sign in again through another of its kind; a password mailbox cannot move
 * (the API has no way), an admin has to act.
 */
const ProviderProblem = ({ account }: { account: Account }) => {
  const relink = useRelink();
  const navigate = useNavigate();
  const admin = useHasRoles(ADMIN_ROLE);
  const provider = account.mailProvider;
  const oauth = account.authMethod === AuthMethod.Xoauth2;
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>{account.emailAddress} is on hold</AlertTitle>
      <AlertDescription>
        {provider
          ? `It goes through ${provider.name}, which is disabled: the mailbox neither syncs nor sends until an admin enables it.`
          : oauth
            ? "The provider it was linked through was removed. Sign in again through another one; its mail is kept."
            : "The provider it was linked through was removed, so it neither syncs nor sends. Ask an admin of your organization."}
      </AlertDescription>
      {provider && admin ? (
        <AlertAction>
          <Button size="xs" variant="outline" onClick={() => navigate(MailProvider.linkBuilder(provider.id))}>
            Open provider
          </Button>
        </AlertAction>
      ) : (
        !provider &&
        oauth &&
        account.isOwner && (
          <AlertAction>
            <Button size="xs" variant="outline" onClick={() => relink(account)}>
              Sign in again
            </Button>
          </AlertAction>
        )
      )}
    </Alert>
  );
};

/** Whether the mailbox's provider keeps it from working: removed, or disabled. */
export const providerTrouble = (account: Pick<Account, "mailProvider">) => !account.mailProvider?.enabled;

/**
 * What is wrong with a mailbox, in words, with the button that fixes it.
 * Renders nothing while the mailbox is fine.
 */
export const ProblemBanner = ({ account }: { account: Account }) => {
  const relink = useRelink();
  if (providerTrouble(account)) return <ProviderProblem account={account} />;
  const reauth = account.status === MailAccountStatus.NeedsReauth;
  if (!reauth && !account.lastErrorCode && !account.lastError) return null;
  const problem = describeError(
    reauth && !account.lastErrorCode
      ? account.authMethod === AuthMethod.Xoauth2
        ? MailErrorCode.ConsentExpired
        : MailErrorCode.AuthFailed
      : account.lastErrorCode,
    { message: account.lastError },
  );
  const fixable = account.isOwner && (problem.fix === "relink" || problem.fix === "password" || problem.fix === "servers");

  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>{account.emailAddress} needs attention</AlertTitle>
      <AlertDescription>{problem.text}</AlertDescription>
      {fixable && (
        <AlertAction>
          <Button size="xs" variant="outline" onClick={() => relink(account)}>
            {problem.fix === "relink" ? "Sign in again" : problem.fix === "password" ? "Update password" : "Edit servers"}
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
};
