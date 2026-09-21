import { Arkitekt } from "@/app/Arkitekt";
import {
  ActionLabel,
  ActionTrigger,
  PageAction,
} from "@/components/ui/page-action";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Send, Server, Settings, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FaktsViewer } from "../components/FaktsViewer";
import { ServiceCard } from "../components/ServiceCard";
import { SettingsPage } from "../components/SettingsPage";

/** What the deployment provides (fakts), whether each service answers, and a way to tell the coordination server so. */
export const ServicesPage = () => {
  const fakts = Arkitekt.useFakts();
  const services = Arkitekt.useAvailableServices();
  const configurationIssues = Arkitekt.useConfigurationIssues();
  const reportStatus = Arkitekt.useReportStatus();
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

      {services.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2">
          {services.map((service) => (
            <ServiceCard key={service.key} service={service} />
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
      )}
    </SettingsPage>
  );
};

export default ServicesPage;
