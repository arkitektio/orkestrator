import { LokBugReport } from "@/core/linkers";
import { BugReportTable } from "../components/bugreports/BugReportTable";
import { LOK_HELP } from "../help";

/** Every bug report of the organization (an admin's view; anyone else sees their own). */
const Page = () => (
  <LokBugReport.ListPage title="Bug reports" help={LOK_HELP.bugReports}>
    <div className="p-3">
      <BugReportTable search />
    </div>
  </LokBugReport.ListPage>
);

export default Page;
