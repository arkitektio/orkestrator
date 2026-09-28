import { PageAction } from "@/core/ui/page-action";
import { RekuestDashboard } from "@/core/linkers";
import { useCreateDashboardMutation } from "../api/graphql";
import DashboardList from "../components/lists/DashboardList";


const Page = () => {
  const [createDashboard] = useCreateDashboardMutation({
    refetchQueries: ["ListDashboards"],
  });

  return (
    <RekuestDashboard.ListPage
      title={"Dashboards"}
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
            });
          }}
        >
          Create Dashboard
        </PageAction>
      }
    >
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-3">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Your Dashboards
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              Dashboards are collections of widgets that can be used to monitor
              and control your robotic devices. They can be customized to fit
              your needs and can display real-time data from your devices.
            </p>
          </div>
        </div>

        <DashboardList />
      </div>
    </RekuestDashboard.ListPage>
  );
};

export default Page;
