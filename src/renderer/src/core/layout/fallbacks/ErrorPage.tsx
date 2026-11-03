import { useReport } from "@/core/debug/use-report";
import { KeyRound, ShieldOff, Unplug } from "lucide-react";
import { classifyError, describeNeeded, type Denial } from "./classifyError";
import { StatusPage, type StatusDetail } from "./StatusPage";
import {
  BackButton,
  HomeButton,
  ModuleHomeButton,
  ReportButton,
  RetryButton,
  SignInAgainButton,
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
 * The server named what the sign-in lacks: a scope, a role, or full
 * membership. Unlike the object-level refusal this says exactly what is
 * missing, and since scopes and roles ride on the token, the first way out
 * is a fresh sign-in.
 */
const MissingGrant = ({
  denial,
  resource,
  id,
  message,
  onRetry,
}: {
  denial: Denial;
  resource?: string;
  id?: string | null;
  message?: string | null;
  onRetry?: () => unknown;
}) => {
  const { organization, who } = useStatusContext();
  const thing = resource ?? "page";
  const org = organization ?? "the organization";

  const details: StatusDetail[] = [];
  if (denial.needed.length > 0) {
    details.push({
      label: denial.kind === "scope" ? "Missing scope" : "Missing role",
      value: denial.needed.join(denial.any ? " or " : ", "),
      mono: true,
    });
  }
  if (id) details.push({ label: "Id", value: id, mono: true });
  details.push(...who);

  if (denial.kind === "guest") {
    const readOnly = denial.reason === "SCOPED_READ_ONLY";
    return (
      <StatusPage
        tone="warning"
        code={403}
        icon={ShieldOff}
        title={
          readOnly
            ? "As a guest you can look, but not change this"
            : `This ${thing} needs full membership${organization ? ` of ${organization}` : ""}`
        }
        description={
          readOnly
            ? "You are signed in as a guest: what was shared with you is yours to see, but changing it is for members of the organization."
            : "You are signed in as a guest: what was shared with you is yours to see, but this part is for members of the organization."
        }
        hints={[
          <>Ask an administrator of {org} to invite you as a member.</>,
          <>If you are a member of another organization, switch to it from the account menu in the sidebar.</>,
        ]}
        actions={
          <>
            <BackButton />
            <ModuleHomeButton />
            <SwitchAccountButton />
          </>
        }
        details={details}
        technical={message ?? null}
      />
    );
  }

  const needed = describeNeeded(denial);
  const them = denial.needed.length > 1 && !denial.any ? "them" : "it";

  return (
    <StatusPage
      tone="warning"
      code={403}
      icon={ShieldOff}
      title={denial.kind === "scope" ? `Your sign-in doesn't include ${needed}` : `This ${thing} needs ${needed}`}
      description={
        denial.kind === "scope"
          ? "The server accepted your sign-in, but this app wasn't granted the scope this needs when you signed in."
          : `You are signed in, but the server didn't find ${needed} on your sign-in${organization ? ` for ${organization}` : ""}.`
      }
      hints={[
        <>
          <strong>If you&apos;re sure you have {them}, sign in again.</strong> Your{" "}
          {denial.kind === "scope" ? "scopes are" : "roles are"} fixed when you sign in, so{" "}
          {denial.kind === "scope" ? "one" : "a role"} granted since only arrives with a new sign-in.
        </>,
        denial.kind === "scope" ? (
          <>If signing in again doesn&apos;t help, this app may not ask for that scope: tell an administrator.</>
        ) : (
          <>
            Otherwise ask an administrator of {org} to give you {needed}, or switch to an organization where you
            have {them} from the account menu in the sidebar.
          </>
        ),
      ]}
      actions={
        <>
          <SignInAgainButton />
          <BackButton />
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
 * The object exists or it does not, and the signed-in account may not see it
 * either way. The services answer both the same on purpose, and so does this.
 */
export const AccessDenied = ({
  resource,
  id,
  message,
  onRetry,
  denial,
}: {
  resource?: string;
  id?: string | null;
  /** The server's own words, for the technical block. */
  message?: string | null;
  onRetry?: () => unknown;
  /** What the server named as missing (a scope, a role); switches to that page. */
  denial?: Denial;
}) => {
  if (denial) return <MissingGrant denial={denial} resource={resource} id={id} message={message} onRetry={onRetry} />;
  return <ObjectDenied resource={resource} id={id} message={message} onRetry={onRetry} />;
};

const ObjectDenied = ({
  resource,
  id,
  message,
  onRetry,
}: {
  resource?: string;
  id?: string | null;
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
  const report = useReport();

  switch (classified.kind) {
    case "denied":
      return (
        <AccessDenied
          resource={resource}
          id={id}
          message={classified.technical}
          onRetry={onRetry}
          denial={classified.denial}
        />
      );
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
              <SignInAgainButton />
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
