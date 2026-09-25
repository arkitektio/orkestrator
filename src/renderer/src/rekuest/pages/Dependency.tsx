import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import {
  DetailPane,
  DetailPaneHeader
} from "@/core/components/ui/pane";
import { RekuestDependency } from "@/core/linkers";
import { useDependencyQuery } from "@/rekuest/api/graphql";

export const DependencyPage = asDetailQueryRoute(useDependencyQuery, ({ data }) => {
  return (
    <RekuestDependency.ModelPage
      title={data.dependency.key || "Dependency"}
      object={data.dependency}
    >
      <DetailPane>
        <DetailPaneHeader>

        </DetailPaneHeader>

      </DetailPane>
    </RekuestDependency.ModelPage>
  );
});


export default DependencyPage;
