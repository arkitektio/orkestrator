import { useLocation } from "react-router-dom";


export const useReport = () => {
  const location = useLocation();

  const reportBug = () => {
    window.api.reportIssue({
      title: `Issue in ${location.pathname}`,
      includeScreenshot: true,
      labels: ["bug"],
      template: "bug_report.md",
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
    });
  }

  return reportBug;
}
