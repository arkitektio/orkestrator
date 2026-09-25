import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { LocalActionButton, type LocalActionButtonProps } from "@/core/components/ui/localactionbutton";
import { RekuestDashboard } from "@/core/linkers";
import { useGetDashboardQuery } from "../api/graphql";
import { DashboardBlokSidebar, DashboardScene, DashboardSceneProvider } from "../dashboard-scene";

export const DashboardPage = asDetailQueryRoute(useGetDashboardQuery, ({ data, refetch }) => {
  return (
    <RekuestDashboard.ModelPage
      title={data.dashboard.name || "New Dashboard"}
      object={data.dashboard}
      pageActions={(
        <LocalActionButton
          name={"rekuest-delete-dashboard" as LocalActionButtonProps["name"]}
          className="h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
          state={{
            left: [
              {
                identifier: '@rekuest/dashboard',
                id: data.dashboard.id,
              },
            ],
            isCommand: false,
          }}
        />
      )}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Bloks">
            <DashboardBlokSidebar />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <DashboardSceneProvider dashboard={data.dashboard} refetch={refetch}>
        <DashboardScene />
      </DashboardSceneProvider>
    </RekuestDashboard.ModelPage>
  );
});


export default DashboardPage;
