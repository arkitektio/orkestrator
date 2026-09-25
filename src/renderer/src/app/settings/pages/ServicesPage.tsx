import { Arkitekt, Guard } from "@/core/connection/arkitekt/host";
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
import { Send, Server, Settings, Stethoscope, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useMeshes } from "@/core/connection/mesh/useMeshes";
import { toast } from "sonner";
import { HubAwareConnectionDoctor } from "@/core/connection/ui/doctor/HubAwareConnectionDoctor";
import { instanceToProbeTargets } from "@/core/connection/arkitekt/doctor/targets";
import { toHubHealthFacts, type HubHealthFacts } from "@/core/connection/arkitekt/doctor/hubHealth";
import type { ServiceRuntimeState } from "@/core/connection/arkitekt/types";
import { useMyHubHealthQuery } from "@/lok/api/graphql";
import type { ProbeTarget } from "../../../../../main/doctor/protocol";
import { FaktsViewer } from "../components/FaktsViewer";
import { HubHealthCard } from "../components/HubHealthCard";
import { ServiceCard } from "../components/ServiceCard";
import { SettingsPage } from "../components/SettingsPage";

const ServiceGrid = ({ services, hub }: { services: ServiceRuntimeState[]; hub?: HubHealthFacts }) => {
  // Live, so a card says "through the mesh" exactly when requests go through it.
  const { meshes, sidecar } = useMeshes();
  const mesh = useMemo(() => ({ sidecar, meshes }), [sidecar, meshes]);
  return services.length > 0 ? (
    <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
      {services.map((service) => (
        <ServiceCard key={service.key} service={service} hub={hub} mesh={mesh} />
      ))}
    </div>
  ) : (
    <Card>
      <CardContent className="flex items-center justify-center py-12">
        <div className="text-center">
          <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No active services found</p>
        </div>
      </CardContent>
    </Card>
  );
};

/** Hubs report on an interval; a slow poll keeps "last report" honest while the page is open. */
const HUB_POLL_MS = 30_000;

/** Only mounted under `Guard.Lok`: the hub's word, then the services with it. */
const ServicesWithHub = ({ services }: { services: ServiceRuntimeState[] }) => {
  const fakts = Arkitekt.useFakts();
  const { data } = useMyHubHealthQuery({ pollInterval: HUB_POLL_MS });
  const raw = data?.mycontext.hub;
  const hub = raw ? toHubHealthFacts(raw, fakts?.instances ?? {}) : undefined;

  return (
    <>
      {hub && <HubHealthCard hub={hub} />}
      <ServiceGrid services={services} hub={hub} />
    </>
  );
};

/** What the deployment provides (fakts), whether each service answers, and a way to tell the coordination server so. */
export const ServicesPage = () => {
  const fakts = Arkitekt.useFakts();
  const services = Arkitekt.useAvailableServices();
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
      toast.error(
        `Failed to report status: ${error instanceof Error ? error.message : String(error)}`,
      );
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
      instanceToProbeTargets(key, instance),
    );

  return (
    <SettingsPage
      slug="services"
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
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <XCircle className="w-5 h-5" />
              Configuration issues
            </CardTitle>
            <CardDescription>
              Fakts was retrieved, but some expected services or module dependencies are missing or invalid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {configurationIssues.map((issue) => (
              <div key={issue} className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-sm">
                {issue}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Guard.Lok
        notConnectedFallback={<ServiceGrid services={services} />}
        connectingFallback={<ServiceGrid services={services} />}
        bootingFallback={<ServiceGrid services={services} />}
      >
        <ServicesWithHub services={services} />
      </Guard.Lok>

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

export default ServicesPage;
