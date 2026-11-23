import { Arkitekt } from "@/core/connection/arkitekt/host";
import {
  ActionLabel,
  ActionTrigger,
  PageAction,
} from "@/core/ui/page-action";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/core/ui/dialog";
import { ChevronRight, Send, Settings, Stethoscope, XCircle } from "lucide-react";
import { useState } from "react";
import { useMeshes } from "@/core/connection/mesh/useMeshes";
import { reportError, toast } from "@/core/notify";
import { HubAwareConnectionDoctor } from "@/core/connection/ui/doctor/HubAwareConnectionDoctor";
import { instanceToProbeTargets } from "@/core/connection/arkitekt/doctor/targets";
import type { HubHealthFacts } from "@/core/connection/arkitekt/doctor/hubHealth";
import type { ProbeTarget } from "../../../../../main/doctor/protocol";
import { DeploymentDiagram } from "../components/DeploymentDiagram";
import { FaktsViewer } from "../components/FaktsViewer";
import { HubFacts } from "../components/HubFacts";
import { HubHealthCard } from "../components/HubHealthCard";
import { splitServices } from "../components/hubServices";
import { ServiceRow } from "../components/ServiceRow";
import { SettingsPage } from "../components/SettingsPage";

/** Every service of the hub: what it granted this app as rows, the optional rest folded away. */
const HubServices = ({ hub }: { hub?: HubHealthFacts }) => {
  const services = Arkitekt.useServiceStates();
  // Live, so a row says "through the mesh" exactly when requests go through it.
  const { payload: mesh } = useMeshes();
  const { listed, notGranted } = splitServices(services);
  const granted = listed.filter((service) => service.configured);

  return (
    <>
      {hub && <HubHealthCard hub={hub} />}
      {granted.length > 0 && <DeploymentDiagram services={granted} hub={hub} mesh={mesh} />}
      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>
            What the hub grants this app, how this computer reaches each one, and whether it
            answers. Open one for its details.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3">
          {listed.length > 0 ? (
            <div className="divide-y">
              {listed.map((service) => (
                <ServiceRow key={service.key} service={service} mesh={mesh} />
              ))}
            </div>
          ) : (
            <p className="px-3 text-sm text-muted-foreground">The hub grants this app no services.</p>
          )}
        </CardContent>
      </Card>
      {notGranted.length > 0 && (
        <details className="group rounded-lg border" data-testid="not-granted">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
            Optional services not granted ({notGranted.length})
          </summary>
          <div className="space-y-2 px-3 pb-3">
            <p className="px-3 text-xs text-muted-foreground">
              This app can work with these, but the hub did not grant them: it does not run them,
              or your organisation has not given this app access. The parts of the app that need
              them stay hidden.
            </p>
            <div className="divide-y">
              {notGranted.map((service) => (
                <ServiceRow key={service.key} service={service} mesh={mesh} />
              ))}
            </div>
          </div>
        </details>
      )}
    </>
  );
};

/** What the deployment provides (fakts), whether each service answers, and a way to tell the coordination server so. */
export const HubPage = () => {
  const fakts = Arkitekt.useFakts();
  const configurationIssues = Arkitekt.useConfigurationIssues();
  const reportStatus = Arkitekt.useReportStatus();
  const activeProfile = Arkitekt.useActiveProfile();
  const [reporting, setReporting] = useState(false);

  const handleReportStatus = async () => {
    setReporting(true);
    try {
      const result = await reportStatus();
      if (!result) {
        toast.error("Not connected — nothing to report.");
      } else if (!result.ok) {
        toast.error("Failed to reach the coordination server.");
      } else if (result.functional) {
        toast.success("Reported status: all services reachable.");
      } else {
        toast.warning("Status reported, but some services are unreachable.");
      }
    } catch (error) {
      reportError(error, "Couldn't report the status");
    } finally {
      setReporting(false);
    }
  };

  /**
   * Every address this deployment advertises, across every service — the
   * doctor probes the whole set, because "all of them fail" and "one of them
   * fails" are different problems with different answers.
   */
  const buildTargets = (): ProbeTarget[] =>
    Object.entries(fakts?.instances ?? {}).flatMap(([key, instance]) =>
      instanceToProbeTargets(key, instance, activeProfile?.mesh),
    );

  return (
    <SettingsPage
      slug="hub"
      pageActions={
        <>
          <PageAction
            collapse="icon"
            icon={<Send className="w-4 h-4" />}
            menuLabel="Report Status"
            onClick={handleReportStatus}
            disabled={reporting || !fakts}
          >
            {reporting ? "Reporting…" : "Report Status"}
          </PageAction>
          <PageAction.Slot collapse="icon">
            <Dialog>
            <DialogTrigger asChild>
              <ActionTrigger aria-label="Inspect Configuration">
                <Settings className="w-4 h-4" />
                <ActionLabel>Inspect Configuration</ActionLabel>
              </ActionTrigger>
            </DialogTrigger>
            <DialogContent className="min-w-[80vw] max-w-[90vw] h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Application Configuration (Fakts)
                </DialogTitle>
              </DialogHeader>
              <FaktsViewer fakts={fakts} />
            </DialogContent>
            </Dialog>
          </PageAction.Slot>
        </>
      }
    >
      {configurationIssues.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <XCircle className="w-5 h-5" />
              Configuration issues
            </CardTitle>
            <CardDescription>
              Fakts was retrieved, but some expected services or module dependencies are missing or invalid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {configurationIssues.map((issue) => (
              <div key={issue} className="rounded border border-warning/30 bg-warning/10 p-2 text-sm">
                {issue}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <HubFacts>{(hub) => <HubServices hub={hub} />}</HubFacts>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Connection doctor
          </CardTitle>
          <CardDescription>
            Checks every address above from this computer — DNS, the connection
            itself, the certificate and the answer — checks the network
            software this deployment needs, and sets it against what the hub
            reports about itself. Nothing is changed unless you ask.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HubAwareConnectionDoctor
            context={{
              kind: "service",
              serviceKey: "all",
              endpointUrl: activeProfile?.session.endpoint.base_url,
              meshCoordUrl: activeProfile ? (activeProfile.session.endpoint.mesh_coord_url ?? null) : undefined,
              profileMesh: activeProfile?.mesh,
              coordinationAlias: activeProfile?.session.fakts.self.alias,
            }}
            buildTargets={buildTargets}
            subject={activeProfile?.session.endpoint.base_url ?? "this deployment"}
          />
        </CardContent>
      </Card>
    </SettingsPage>
  );
};

export default HubPage;
