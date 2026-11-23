import { Arkitekt } from "@/core/connection/arkitekt/host";
import { instanceToProbeTargets } from "@/core/connection/arkitekt/doctor/targets";
import { serviceRoute } from "@/core/connection/mesh/route";
import { useMeshes } from "@/core/connection/mesh/useMeshes";
import { HubAwareConnectionDoctor } from "@/core/connection/ui/doctor/HubAwareConnectionDoctor";
import { NotFound } from "@/core/layout/fallbacks/NotFound";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/ui/card";
import { cn } from "@/core/util/utils";
import { Stethoscope } from "lucide-react";
import { useParams } from "react-router-dom";
import type { ProbeTarget } from "../../../../../main/doctor/protocol";
import { HubFacts } from "../components/HubFacts";
import { connectionProfile, describeService } from "../components/hubServices";
import { ServiceCard, statusOf } from "../components/ServiceCard";
import { SettingsPage } from "../components/SettingsPage";
import { StatusLabel, TONE_TEXT } from "../components/StatusLabel";
import { settingsLink } from "../sections";

/**
 * One service of the hub (`/settings/hub/:service`): whether it answers, how this computer
 * reaches it, what the hub says of it, its configuration, and the doctor for its addresses
 * alone. For an optional one the hub did not grant: why it is not here.
 */
export const ServiceDetailPage = () => {
  const key = useParams().service ?? "";
  const service = Arkitekt.useServiceState(key);
  const activeProfile = Arkitekt.useActiveProfile();
  const fakts = Arkitekt.useFakts();
  const { payload: mesh } = useMeshes();

  if (!service) return <NotFound />;

  const status = statusOf(service);
  const profile = service.alias
    ? connectionProfile(serviceRoute(service.alias, mesh), service.alias.ssl)
    : undefined;
  const instance = fakts?.instances[key];
  const buildTargets = (): ProbeTarget[] =>
    instance ? instanceToProbeTargets(key, instance, activeProfile?.mesh) : [];

  return (
    <SettingsPage
      slug="hub"
      title={service.definition.name ?? service.key}
      description={describeService(service) ?? `The ${service.key} service of the hub.`}
      back={{ to: settingsLink("hub"), label: "Hub" }}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <StatusLabel tone={status.tone} pulse={status.pulse} className="text-sm">
          {status.label}
        </StatusLabel>
        {profile && (
          <span className={cn("text-sm", TONE_TEXT[profile.tone === "good" ? "muted" : profile.tone])}>
            {profile.line}
          </span>
        )}
      </div>

      {service.configured ? (
        <HubFacts>{(hub) => <ServiceCard service={service} hub={hub} mesh={mesh} />}</HubFacts>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{service.definition.optional ? "Not granted" : "Missing"}</CardTitle>
            <CardDescription>
              {service.definition.optional
                ? "This app can work with this service, but the hub did not grant it: the hub does not run it, or your organisation has not given this app access. The parts of the app that need it stay hidden."
                : "This app needs this service, and the hub did not grant it. Ask the hub's administrator to give this app access."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {instance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5" />
              Connection doctor
            </CardTitle>
            <CardDescription>
              Checks the addresses of this service from this computer: name lookup, the connection,
              the certificate and the answer. Nothing is changed unless you ask.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HubAwareConnectionDoctor
              context={{
                kind: "service",
                serviceKey: key,
                endpointUrl: activeProfile?.session.endpoint.base_url,
                meshCoordUrl: activeProfile ? (activeProfile.session.endpoint.mesh_coord_url ?? null) : undefined,
                profileMesh: activeProfile?.mesh,
                coordinationAlias: activeProfile?.session.fakts.self.alias,
              }}
              buildTargets={buildTargets}
              subject={service.key}
            />
          </CardContent>
        </Card>
      )}
    </SettingsPage>
  );
};

export default ServiceDetailPage;
