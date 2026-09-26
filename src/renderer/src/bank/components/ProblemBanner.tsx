import { useDialog } from "@/core/dialogs/registry";
import { Button } from "@/core/ui/button";
import { AlertTriangle } from "lucide-react";
import { BankErrorCode, Provider } from "../api/graphql";
import { describeError } from "../errors";

export type RelinkTarget = { provider: Provider; aspspCountry: string; aspspName: string };

/** Opens the link dialog on the same provider (and bank): how every "log in again" fix starts. */
export const useRelink = () => {
  const { openDialog } = useDialog();
  return (target: RelinkTarget) =>
    openDialog(
      "banklink",
      target.provider === Provider.Scalable
        ? { provider: target.provider }
        : { provider: target.provider, country: target.aspspCountry, bank: target.aspspName },
      { size: "medium" },
    );
};

/**
 * What is wrong with an account or connection, in words, with the one button
 * that fixes it (from `lastErrorCode`). Renders nothing when nothing is wrong.
 */
export const ProblemBanner = ({
  code,
  message,
  needsReauth,
  nextSyncAllowedAt,
  relink,
}: {
  code?: BankErrorCode | null;
  message?: string | null;
  needsReauth?: boolean;
  nextSyncAllowedAt?: string | null;
  relink?: RelinkTarget | null;
}) => {
  const doRelink = useRelink();
  if (!code && !message && !needsReauth) return null;
  // A consent that ran out is the fix to show even when the last error was another.
  const problem = describeError(needsReauth ? BankErrorCode.ConsentExpired : code, { message, nextSyncAllowedAt });
  const showRelink = relink && (problem.fix === "relink" || problem.fix === "login" || problem.fix === "restart");

  return (
    <div className="flex items-center gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
      <span className="flex-1">{problem.text}</span>
      {showRelink && (
        <Button size="sm" variant="outline" onClick={() => doRelink(relink)}>
          {problem.fix === "relink" ? "Relink" : "Log in again"}
        </Button>
      )}
    </div>
  );
};
