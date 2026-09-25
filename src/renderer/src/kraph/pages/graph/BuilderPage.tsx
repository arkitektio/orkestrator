import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { KraphGraphQuery } from "@/core/linkers";
import {
  useGetGraphQuery,
  useGetGraphTableQueryQuery,
} from "../../api/graphql";

import QueryBuilderGraph from "@/kraph/components/designer/QueryBuilderGraph";

// Note: the backend no longer exposes a `pinned` field on `GraphTableQuery`
// (the pin/unpin concept has been removed from that type), so the pin button
// that used to live here has been dropped.
const Page = asDetailQueryRoute(useGetGraphTableQueryQuery, ({ data }) => {
  const { data: graphData } = useGetGraphQuery({
    variables: {
      id: data.graphTableQuery.graph.id,
    },
  });

  if (!graphData?.graph) {
    return <div>Loading graph data...</div>;
  }

  return (
    <KraphGraphQuery.ModelPage
      object={{ id: data.graphTableQuery.id }}
      title={data.graphTableQuery.label}
      pageActions={
        <>
          <KraphGraphQuery.ObjectButton alwaysShow object={{ id: data.graphTableQuery.id }} />
        </>
      }
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <KraphGraphQuery.Knowledge object={{ id: data.graphTableQuery.id }} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="grid grid-cols-12 gap-4 mb-4 h-full w-full">
        <div className="col-span-12 md:col-span-12">
          <QueryBuilderGraph
            graph={graphData.graph}
            graphQuery={data.graphTableQuery}
          />
        </div>
      </div>
    </KraphGraphQuery.ModelPage>
  );
});


export default Page;
