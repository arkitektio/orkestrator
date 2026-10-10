import { Arkitekt } from "@/core/connection/arkitekt/host";
import type { StoredProfile } from "@/core/connection/arkitekt/fakts/profileStorageSchema";
import { useSwitchToProfile } from "@/core/connection/profile/ui/useSwitchToProfile";
import { BackButton, HomeButton } from "@/core/layout/fallbacks/statusActions";
import { StatusPage } from "@/core/layout/fallbacks/StatusPage";
import { useModuleHostVersion } from "@/core/modules/host/host";
import { structureTabTarget } from "@/core/smart/tabTargets";
import { rememberPendingShare } from "@/core/tabs/pendingShare";
import { SHARER_PARAM } from "@/core/tabs/sharing/universalLink";
import { Button } from "@/core/ui/button";
import { ArrowLeftRight, Link2Off, Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { parseSmartPath, SmartLink } from "./smartLink";

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : "Could not connect to this organization.";

const nameOf = (profile: StoredProfile) =>
  profile.label.organizationName ?? profile.label.organizationSlug ?? profile.identity.baseUrl;

/**
 * Whether a login is the one a smartlink names. The slug decides; the hub is
 * only compared when the login knows its own (it is the link's untrusted
 * half, and an old profile may not have one).
 */
const belongsTo = (profile: StoredProfile, link: SmartLink) =>
  profile.label.organizationSlug === link.org && (!profile.identity.hubId || profile.identity.hubId === link.hub);

/**
 * Where a smartlink lands (`/smart/<org>/<hub>/<identifier>/<id>`) before it
 * becomes a page. It only decides which login the link belongs to and where
 * the object's page is: on the right login it moves on silently, on another
 * it asks before switching, and with none it offers to sign in. The link
 * proves nothing (anyone can type one): whether the object may be seen is the
 * service's answer on the page it opens.
 *
 * Unguarded, like `/open`: it has to work on the wrong login.
 */
export const SmartLinkPage = () => {
  useModuleHostVersion();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const active = Arkitekt.useActiveProfile();
  const profiles = Arkitekt.useProfiles();
  const connect = Arkitekt.useConnect();
  const switchTo = useSwitchToProfile();
  const [connecting, setConnecting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const link = parseSmartPath(pathname);
  const target = link && structureTabTarget({ identifier: link.identifier, id: link.id });
  const here = !!link && !!active && belongsTo(active, link);
  // The sharer is for kontrol's page; the object's page gets the rest.
  const query = new URLSearchParams(search);
  query.delete(SHARER_PARAM);
  const to = target ? `${target.to}${query.size ? `?${query}` : ""}` : null;

  useEffect(() => {
    if (here && to) navigate(to, { replace: true });
  }, [here, to, navigate]);

  const leave = (
    <>
      <BackButton />
      <HomeButton />
    </>
  );

  if (!link) {
    return (
      <StatusPage
        icon={Link2Off}
        tone="warning"
        eyebrow="Link"
        title="This link cannot be read"
        description="A link to an object names its organization, its hub, what it is and its id."
        actions={leave}
      />
    );
  }
  if (here) {
    if (to) return <StatusPage icon={Loader2} spin busy eyebrow="Link" title="Opening…" />;
    return (
      <StatusPage
        icon={Link2Off}
        tone="warning"
        eyebrow="Link"
        title="Nothing here can open this"
        description={`No installed module has a page for ${link.identifier}.`}
        actions={leave}
      />
    );
  }

  // The gate itself is remembered, not the page: the login that follows looks
  // at the link again instead of trusting what this one decided.
  const again = `${pathname}${search}`;

  const candidate = profiles.find((profile) => profile.id !== active?.id && belongsTo(profile, link));
  if (candidate) {
    return (
      <StatusPage
        icon={ArrowLeftRight}
        eyebrow="Link"
        title={`Open in ${nameOf(candidate)}?`}
        description={`This link belongs to ${nameOf(candidate)}. You are currently in ${active ? nameOf(active) : "no organization"}.`}
        actions={
          <>
            <Button
              onClick={() => {
                rememberPendingShare(again);
                switchTo(candidate);
              }}
            >
              Switch and open
            </Button>
            <BackButton />
          </>
        }
      />
    );
  }

  // A login that has not heard its organization's slug yet cannot be told apart.
  if (active && !active.label.organizationSlug) {
    return <StatusPage icon={Loader2} spin busy eyebrow="Link" title="Checking this link…" actions={leave} />;
  }

  const signIn = async () => {
    if (!active) return;
    setProblem(null);
    setConnecting(true);
    try {
      rememberPendingShare(again);
      // The hub points the sign-in page at the right place; the organization
      // is chosen there. Never a `sub`: the link may come from someone else.
      await connect({ endpoint: active.session.endpoint, controller: new AbortController(), hint: { hub: link.hub } });
    } catch (error) {
      setProblem(messageOf(error));
    } finally {
      setConnecting(false);
    }
  };

  return (
    <StatusPage
      icon={UserPlus}
      tone="warning"
      eyebrow="Link"
      title={`You have no login for ${link.org} on this device`}
      description={
        problem ??
        "This link opens an object in that organization. Sign in to it to follow the link; you choose the organization in your browser."
      }
      actions={
        <>
          <Button disabled={connecting || !active} onClick={() => void signIn()}>
            {connecting ? "Waiting for approval in your browser…" : "Sign in…"}
          </Button>
          <BackButton />
        </>
      }
    />
  );
};

export default SmartLinkPage;
