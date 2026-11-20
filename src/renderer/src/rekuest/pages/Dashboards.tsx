import { reportErrorAs } from "@/core/notify";
import { PageAction } from "@/core/ui/page-action";
import { RekuestDashboard } from "@/core/linkers";
import { useCreateDashboardMutation } from "../api/graphql";
import DashboardList from "../components/lists/DashboardList";
import { REKUEST_HELP } from "../help";


const Page = () => {
  const [createDashboard] = useCreateDashboardMutation({
    refetchQueries: ["ListDashboards"],
  });

  return (
    <RekuestDashboard.ListPage
      title={"Dashboards"}
      help={REKUEST_HELP.dashboards}
      pageActions={
        <PageAction
          alwaysShow
          onClick={() => {
            createDashboard({
              variables: {
                input: {
                  name: "New Dashboard",
                },
              },
            }).catch(reportErrorAs("Couldn't create the dashboard"));
          }}
        >
          Create Dashboard
        </PageAction>
      }
    >
      <div className="p-3">
        <DashboardList />
      </div>
    </RekuestDashboard.ListPage>
  );
};

export default Page;
