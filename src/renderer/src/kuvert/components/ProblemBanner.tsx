import { useDialog } from "@/core/dialogs/registry";
import { useNavigate } from "react-router-dom";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/core/ui/alert";
import { Button } from "@/core/ui/button";
import { AlertTriangle } from "lucide-react";
import { AuthMethod, ListMailAccountFragment, MailAccountStatus, MailErrorCode } from "../api/graphql";
import { describeError } from "../errors";
import { MailAccount } from "../linkers";
import { LOGIN_ANCHOR } from "./settings/anchors";

type Account = Pick<
  ListMailAccountFragment,
  "id" | "status" | "lastError" | "lastErrorCode" | "authMethod" | "provider" | "emailAddress" | "isOwner"
>;

/** The one thing that gets a mailbox working again: sign in again (OAuth) or new credentials. */
export const useRelink = () => {
  const { openDialog } = useDialog();
  const navigate = useNavigate();
  return (account: Account) =>
    account.authMethod === AuthMethod.Xoauth2
      ? openDialog(
          "kuvertlink",
          { relink: account.id, provider: account.provider, address: account.emailAddress },
          { size: "medium" },
        )
      : navigate(`${MailAccount.linkBuilder(account.id)}#${LOGIN_ANCHOR}`);
};

/**
 * What is wrong with a mailbox, in words, with the button that fixes it.
 * Renders nothing while the mailbox is fine.
 */
export const ProblemBanner = ({ account }: { account: Account }) => {
  const relink = useRelink();
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
