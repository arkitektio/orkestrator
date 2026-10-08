import { useActiveProfile } from "@/core/connection/arkitekt/hooks";
import { openRailSwitcher } from "@/core/connection/profile/ui/railSwitcher";
import { useSelf } from "@/core/connection/useSelf";
import { moduleDefinitions } from "@/core/modules/registries";
import { Button } from "@/core/ui/button";
import { ArrowLeft, Bug, House, LayoutGrid, RefreshCw, UserRound } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { StatusDetail } from "./StatusPage";

/*
 * What the status pages share: where we are, who is asking, and the buttons
 * under the headline. These need a router and the profile, which `StatusPage`
 * itself must not.
 */

/** The page that failed, the module it belongs to and who is signed in. */
export const useStatusContext = () => {
  const location = useLocation();
  const { username } = useSelf();
  const profile = useActiveProfile();

  const segment = location.pathname.split("/").filter(Boolean)[0];
  const module = moduleDefinitions().find((definition) => definition.manifest.namespace === segment)?.manifest;
  const path = `${location.pathname}${location.search}${location.hash}`;
  const organization = profile?.label.organizationName;

  /** The rows every page ends its "Details" card with. */
  const who: StatusDetail[] = [{ label: "Page", value: path, mono: true }];
  if (organization) who.push({ label: "Organization", value: organization });
  if (username) who.push({ label: "Signed in as", value: username });

  return {
    path,
    module: module ? { namespace: module.namespace, label: module.label } : undefined,
    organization,
    username,
    who,
  };
};

export const BackButton = () => {
  const navigate = useNavigate();
  return (
    <Button type="button" size="lg" variant="outline" onClick={() => navigate(-1)}>
      <ArrowLeft />
      Go back
    </Button>
  );
};

export const HomeButton = () => {
  const navigate = useNavigate();
  return (
    <Button type="button" size="lg" variant="outline" onClick={() => navigate("/")}>
      <House />
      Home
    </Button>
  );
};

/** To the start page of the module the failed page belongs to, when it has one. */
export const ModuleHomeButton = () => {
  const navigate = useNavigate();
  const { module } = useStatusContext();
  if (!module) return null;
  return (
    <Button type="button" size="lg" variant="outline" onClick={() => navigate(`/${module.namespace}`)}>
      <LayoutGrid />
      {module.label}
    </Button>
  );
};

/** Opens the rail's switcher: a profile is one user in one organization. */
export const SwitchAccountButton = ({ label = "Switch organization" }: { label?: string }) => (
  <Button type="button" size="lg" variant="ghost" onClick={openRailSwitcher}>
    <UserRound />
    {label}
  </Button>
);

export const RetryButton = ({
  onRetry,
  label = "Try again",
}: {
  onRetry: () => unknown;
  label?: string;
}) => {
  const [retrying, setRetrying] = useState(false);
  return (
    <Button
      type="button"
      size="lg"
      disabled={retrying}
      onClick={async () => {
        setRetrying(true);
        try {
          await onRetry();
        } catch {
          // The page this sits on shows whatever the retry ends in.
        } finally {
          setRetrying(false);
        }
      }}
    >
      <RefreshCw className={retrying ? "animate-spin motion-reduce:animate-none" : undefined} />
      {label}
    </Button>
  );
};

export const ReportButton = ({ onReport }: { onReport: () => void }) => (
  <Button type="button" size="lg" variant="ghost" onClick={onReport}>
    <Bug />
    Report bug
  </Button>
);
