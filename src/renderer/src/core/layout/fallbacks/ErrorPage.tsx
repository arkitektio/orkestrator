import { useArkitektActions } from "@/core/connection/arkitekt/hooks";
import { useReport } from "@/core/debug/use-report";
import { KeyRound, ShieldOff, Unplug } from "lucide-react";
import { classifyError } from "./classifyError";
import { StatusPage, type StatusDetail } from "./StatusPage";
import {
  BackButton,
  HomeButton,
  ModuleHomeButton,
  ReportButton,
  RetryButton,
  SwitchAccountButton,
  useStatusContext,
} from "./statusActions";
import { UnexpectedError } from "./UnexpectedError";

export type QueryErrorProps = {
  /** What the query failed with (an `ApolloError`, usually). */
  error: unknown;
  /** Re-run the query (Apollo's `refetch`). */
  onRetry?: () => unknown;
  /** What was being loaded ("dataset", "graph"); improves the copy. */
  resource?: string;
  /** The id that was asked for, shown in the details. */
  id?: string | null;
};

/**
 * The object exists or it does not, and the signed-in account may not see it
 * either way. The services answer both the same on purpose, and so does this.
 */
export const AccessDenied = ({
  resource,
  id,
  message,
  onRetry,
}: {
  resource?: string;
  id?: string | null;
  /** The server's own words, for the technical block. */
  message?: string | null;
  onRetry?: () => unknown;
}) => {
  const { organization, who } = useStatusContext();
  const thing = resource ?? "page";

  const details: StatusDetail[] = [];
  if (id) details.push({ label: "Id", value: id, mono: true });
  details.push(...who);

  return (
    <StatusPage
      tone="warning"
      code={403}
      icon={ShieldOff}
      title={`You can't access this ${thing}`}
      description={
        <>
          Either this {thing} doesn&apos;t exist, or the account you&apos;re signed in with isn&apos;t allowed to see
          it. For safety the server doesn&apos;t say which.
        </>
      }
      hints={[
        <>
          Access is granted per organization and role. If this belongs to another organization than{" "}
          {organization ?? "the one you are in"}, switch to it from the account menu in the sidebar.
        </>,
        <>If you should have access, ask whoever owns it to share it, or an administrator for the right role.</>,
        <>It may have been deleted: check the list it belongs to.</>,
      ]}
      actions={
        <>
          <BackButton />
          <ModuleHomeButton />
          <SwitchAccountButton />
          {onRetry ? <RetryButton onRetry={onRetry} /> : null}
        </>
      }
      details={details}
      technical={message ?? null}
    />
  );
};

/**
 * The right page for a failed page query: denied, signed out, unreachable, or
 * something we cannot name. Every query-backed route ends here (see
 * `routes/queryState.tsx`); a page that runs its own query uses it directly.
 */
export const QueryError = ({ error, onRetry, resource, id }: QueryErrorProps) => {
  const classified = classifyError(error);
  const { module, who } = useStatusContext();
  const { reconnect } = useArkitektActions();
  const report = useReport();

  switch (classified.kind) {
    case "denied":
      return <AccessDenied resource={resource} id={id} message={classified.technical} onRetry={onRetry} />;
    case "unauthenticated":
      return (
        <StatusPage
          code={401}
          icon={KeyRound}
          title="Your session ended"
          description="The server no longer accepts this session, so it would not answer for this page."
          hints={[<>Signing in again brings you straight back here.</>]}
          actions={
            <>
              <RetryButton onRetry={reconnect} label="Sign in again" />
              <SwitchAccountButton />
            </>
          }
          details={who}
          technical={classified.technical}
        />
      );
    case "network": {
      const subject = module?.label ?? "the server";
      const serverSide = classified.statusCode != null && classified.statusCode >= 500;
      const details: StatusDetail[] = [];
      if (classified.statusCode != null) {
        details.push({ label: "HTTP status", value: String(classified.statusCode), mono: true });
      }
      details.push(...who);
      return (
        <StatusPage
          tone="destructive"
          code={classified.statusCode ?? undefined}
          eyebrow={classified.statusCode != null ? undefined : "Unreachable"}
          icon={Unplug}
          title={serverSide ? `${subject} hit an error` : `Can't reach ${subject}`}
          description={
            serverSide
              ? "The request arrived, but the service failed while answering it. This is on the server's side."
              : "The request for this page didn't complete. The service may be restarting, or something between you and it is in the way."
          }
          hints={[
            <>Try again in a few seconds; restarts are brief.</>,
            <>If it keeps failing, Settings → Services shows which services answer.</>,
          ]}
          actions={
            <>
              {onRetry ? <RetryButton onRetry={onRetry} /> : null}
              <BackButton />
              <HomeButton />
            </>
          }
          details={details}
          technical={classified.technical}
        />
      );
    }
    default:
      return (
        <UnexpectedError
          error={classified.message}
          title={resource ? `Couldn't load this ${resource}` : module ? `${module.label} could not load this page` : "This page could not load"}
          description="The server returned an error for this page. The message below comes straight from it."
          technical={classified.technical}
          actions={
            <>
              {onRetry ? <RetryButton onRetry={onRetry} /> : null}
              <BackButton />
              <ModuleHomeButton />
              <ReportButton onReport={report} />
            </>
          }
        />
      );
  }
};

/** The older name of `QueryError`. */
export const ErrorPage = QueryError;

export default QueryError;
