import { hardwareReportLines } from "@/core/settings/renderer/hardwareReport";
import { getReportableHardware } from "@/core/settings/renderer/rendererBudget";
import { useLocation } from "react-router-dom";

/**
 * What a report says about this computer: the detected hardware, unless the
 * user switched that off in Settings → Telemetry. Read when the report is
 * filed, so it follows the setting as it is then.
 */
const reportHardware = (): string[] | undefined => {
  const hardware = getReportableHardware();
  return hardware ? hardwareReportLines(hardware) : undefined;
};



export const useReport = () => {
  const location = useLocation();

  const reportBug = () => {
    window.api.reportIssue({
      title: `Issue in ${location.pathname}`,
      includeScreenshot: true,
      labels: ["bug"],
      template: "bug_report.md",
      hardware: reportHardware(),
    });
  }

  return reportBug;
}


export const useFatalReport = () => {

  const reportBug = (error: Error) => {
    window.api.reportIssue({
      title: `Fatal Error: ${error.message}`,
      includeScreenshot: true,
      labels: ["bug", "critical"],
      template: "bug_report.md",
      hardware: reportHardware(),
    });
  }

  return reportBug;
}
