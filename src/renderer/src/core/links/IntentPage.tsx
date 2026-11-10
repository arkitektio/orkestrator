import { Arkitekt, serviceGuard } from "@/core/connection/arkitekt/host";
import type { StoredProfile } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { useServiceState } from "@/core/connection/arkitekt/hooks";
import { useSwitchToProfile } from "@/core/connection/profile/ui/useSwitchToProfile";
import { satisfiesRoles } from "@/core/connection/roles";
import { RoleRoute } from "@/core/layout/fallbacks/NotPermitted";
import { ServiceUnavailable } from "@/core/layout/fallbacks/ServiceUnavailable";
import { BackButton, HomeButton } from "@/core/layout/fallbacks/statusActions";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { useModuleHostVersion } from "@/core/modules/host/host";
import { findIntent, type HostIntent } from "@/core/modules/registries";
import { rememberPendingShare } from "@/core/tabs/pendingShare";
import { Button } from "@/core/ui/button";
import { ArrowRight, Building2, Link2Off, Loader2, PackageX, Sparkles } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { parseIntentPath, PICKED_PROFILE_PARAM, type IntentLink } from "./intents";

const nameOf = (profile: StoredProfile) =>
  profile.label.organizationName ?? profile.label.organizationSlug ?? profile.identity.baseUrl;

const EYEBROW = "Link";

/**
 * Whether a login could follow the intent, from what it stored the last time
 * it was active: its deployment runs the service, and its cached roles (when
 * known) meet the requirement. Unknown roles do not exclude a login here; the
 * role step after the switch decides with fresh ones.
 */
export const canFollow = (profile: StoredProfile, intent: Pick<HostIntent, "serviceKey" | "roles">): boolean => {
  if (intent.serviceKey !== "self" && !profile.session.fakts.instances?.[intent.serviceKey]) return false;
  const roles = profile.label.roles;
  return roles === undefined || satisfiesRoles(roles, intent.roles);
};

const leave = (
  <>
    <BackButton />
    <HomeButton />
  </>
);

/** This page's own path with the picked login recorded, for the far side of a switch. */
const withPicked = (pathname: string, params: URLSearchParams, profileId: string) => {
  const next = new URLSearchParams(params);
  next.set(PICKED_PROFILE_PARAM, profileId);
  return `${pathname}?${next}`;
};

/**
 * Where an intent link lands (`/do/v<n>/<name>?…`, `./intents.ts`) before it
 * becomes a page. One ladder, the same for every intent:
 *
 * 1. readable: the path is an intent link at all;
 * 2. known: an installed module answers this name at this version (else the
 *    link is newer than this app: "update Orkestrator", never a 404);
 * 3. valid: the module's parser accepts the parameters, and says what is
 *    wrong when not;
 * 4. where: an intent that acts in an organization asks which, when this
 *    device holds more than one login;
 * 5. permitted: the intent's roles, in that organization;
 * 6. served: its service runs there (missing: says which module it needs and
 *    offers the other logins; unreachable: the usual service page);
 * 7. then the module's current route for it, replacing this one.
 *
 * Unguarded, like `/open` and `/smart`: it has to work on the wrong login.
 * Nobody signed in is the shell's (`rememberPendingShare` on the welcome
 * screen): routes do not render without a session.
 */
export const IntentPage = () => {
  useModuleHostVersion();
  const { pathname, search } = useLocation();
  const link = parseIntentPath(pathname, search);

  if (!link) {
    return (
      <StatusPage
        icon={Link2Off}
        tone="warning"
        eyebrow={EYEBROW}
        title="This link cannot be read"
        description="An Orkestrator link names what to do as /do/v1/<what>, followed by its details."
        details={[{ label: "Path", value: `${pathname}${search}` }]}
        actions={leave}
      />
    );
  }

  const intent = findIntent(link.name);
  if (!intent || link.version > intent.version) {
    return (
      <StatusPage
        icon={Sparkles}
        eyebrow={EYEBROW}
        title="This link needs a newer Orkestrator"
        description={
          intent
            ? `It asks for version ${link.version} of "${intent.title}"; this app reads up to version ${intent.version}.`
            : "It asks for something this version of Orkestrator does not know yet."
        }
        hints={["Update Orkestrator, then open the link again."]}
        details={[
          { label: "Asks for", value: `${link.name} v${link.version}` },
          { label: "Path", value: `${pathname}${search}` },
        ]}
        actions={leave}
      />
    );
  }

  const parsed = intent.parse(link.params, link.version);
  if (!parsed.ok) {
    return (
      <StatusPage
        icon={Link2Off}
        tone="warning"
        eyebrow={EYEBROW}
        title={`This "${intent.title}" link is incomplete`}
        description={parsed.problem}
        details={[{ label: "Path", value: `${pathname}${search}` }]}
        actions={leave}
      />
    );
  }

  return (
    <IntentLadder
      // A new link in the same tab starts the ladder again.
      key={`${pathname}${search}`}
      intent={intent}
      link={link}
      pathname={pathname}
      subject={intent.describe?.(parsed.value)}
      to={intent.target(parsed.value)}
    />
  );
};

type LadderProps = {
  intent: HostIntent;
  link: IntentLink;
  pathname: string;
  subject?: string;
  to: string;
};

/** Steps 4–7: they need the session, the profiles and the service. */
const IntentLadder = (props: LadderProps) => {
  const { intent, link } = props;
  const active = Arkitekt.useActiveProfile();
  const profiles = Arkitekt.useProfiles();

  // Only logins that could follow it are offered anywhere on this page:
  // switching to one without the service would be a dead end.
  const eligible = profiles.filter((profile) => canFollow(profile, intent));
  const picked = !!active && link.params.get(PICKED_PROFILE_PARAM) === active.id;
  // One eligible login (or none) is no choice: the steps below speak for the
  // active one, and offer the other when it is the one that can.
  if (intent.picksOrganization && eligible.length > 1 && !picked) {
    return <PickOrganization {...props} active={active ?? null} profiles={eligible} />;
  }

  const Guard = serviceGuard(intent.serviceKey);
  return (
    <RoleRoute roles={intent.roles}>
      {intent.serviceKey === "self" ? (
        <Forward to={props.to} />
      ) : (
        <Guard fallback={<ServiceMissing {...props} active={active ?? null} profiles={eligible} />}>
          <Forward to={props.to} />
        </Guard>
      )}
    </RoleRoute>
  );
};

const Forward = ({ to }: { to: string }) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to, navigate]);
  return <StatusPage icon={Loader2} spin busy eyebrow={EYEBROW} title="Opening…" />;
};

/** `profiles`: the logins that could follow the intent (`canFollow`), not every login. */
type WithProfiles = LadderProps & { active: StoredProfile | null; profiles: StoredProfile[] };

/** Buttons that switch to another login and follow the link again there. */
const SwitchButtons = ({
  pathname,
  link,
  profiles,
  variant = "outline",
}: {
  pathname: string;
  link: IntentLink;
  profiles: StoredProfile[];
  variant?: "default" | "outline";
}) => {
  const switchTo = useSwitchToProfile();
  return (
    <>
      {profiles.map((profile) => (
        <Button
          key={profile.id}
          variant={variant}
          onClick={() => {
            // The link is remembered, not the page: the far side walks the
            // ladder again (its service, its roles) with the choice made.
            rememberPendingShare(withPicked(pathname, link.params, profile.id));
            switchTo(profile);
          }}
        >
          {nameOf(profile)}
        </Button>
      ))}
    </>
  );
};

const Subject = ({ subject }: { subject?: string }): ReactNode =>
  subject ? <span className="font-mono text-foreground">{subject}</span> : null;

/** Step 4: more than one login, and the intent acts in an organization. */
const PickOrganization = ({ active, profiles, ...props }: WithProfiles) => {
  const navigate = useNavigate();
  const others = profiles.filter((profile) => profile.id !== active?.id);
  const activeCan = !!active && profiles.some((profile) => profile.id === active.id);
  return (
    <StatusPage
      icon={Building2}
      eyebrow={EYEBROW}
      title={props.intent.title}
      description={
        <>
          <Subject subject={props.subject} />
          {props.subject ? " · " : null}
          Which organization should this go to?
        </>
      }
      actions={
        <div className="flex flex-col items-start gap-3">
          {active && activeCan && (
            <Button
              onClick={() =>
                navigate(withPicked(props.pathname, props.link.params, active.id), { replace: true })
              }
            >
              Continue in {nameOf(active)}
              <ArrowRight />
            </Button>
          )}
          {others.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{activeCan ? "or switch to" : "Switch to"}</span>
              <SwitchButtons pathname={props.pathname} link={props.link} profiles={others} />
            </div>
          )}
          <BackButton />
        </div>
      }
    />
  );
};

/**
 * Step 6 failed. Missing from this deployment: say which module the link
 * needs and offer the other logins. Configured but not ready: the usual
 * service page (connecting, unreachable, the doctor).
 */
const ServiceMissing = ({ active, profiles, ...props }: WithProfiles) => {
  const state = useServiceState(props.intent.serviceKey);
  const missing = !state || !state.configured || state.status === "unconfigured";
  if (!missing) return <ServiceUnavailable serviceKey={props.intent.serviceKey} />;

  const others = profiles.filter((profile) => profile.id !== active?.id);
  const here = active ? nameOf(active) : "This organization";
  return (
    <StatusPage
      icon={PackageX}
      tone="warning"
      eyebrow={EYEBROW}
      title={`${here} has no ${props.intent.moduleLabel}`}
      description={
        <>
          &ldquo;{props.intent.title}&rdquo;
          {props.subject ? (
            <>
              {" "}
              (<Subject subject={props.subject} />)
            </>
          ) : null}{" "}
          needs {props.intent.moduleLabel}, which this organization&apos;s deployment does not run.
          {others.length > 0 ? " Open it in another organization instead:" : ""}
        </>
      }
      hints={others.length > 0 ? undefined : [`Ask an admin to add ${props.intent.moduleLabel} to the deployment.`]}
      actions={
        <>
          {others.length > 0 && (
            <SwitchButtons pathname={props.pathname} link={props.link} profiles={others} variant="default" />
          )}
          <BackButton />
        </>
      }
    />
  );
};

export default IntentPage;
