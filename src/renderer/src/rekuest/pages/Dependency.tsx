import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import {
  DetailPane,
  DetailPaneHeader
} from "@/core/ui/pane";
import { RekuestDependency } from "@/core/linkers";
import { useDependencyQuery } from "@/rekuest/api/graphql";
import { REKUEST_HELP } from "../help";

export const DependencyPage = asDetailQueryRoute(useDependencyQuery, ({ data }) => {
  return (
    <RekuestDependency.ModelPage
      title={data.dependency.key || "Dependency"}
      help={REKUEST_HELP.dependency}
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
