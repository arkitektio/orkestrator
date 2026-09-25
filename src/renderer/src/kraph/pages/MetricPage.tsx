import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { FormSheet } from "@/core/components/dialog/FormDialog";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { Badge } from "@/core/components/ui/badge";
import {
  KraphEntity,
  KraphMetric
} from "@/core/linkers";
import { HobbyKnifeIcon } from "@radix-ui/react-icons";
import { useGetMetricQuery } from "../api/graphql";

export default asDetailQueryRoute(useGetMetricQuery, ({ data }) => {
  return (
    <KraphMetric.ModelPage
      object={{ id: data.metric.id }}
      title={data?.metric.kind?.label || data?.metric.kind?.key || data?.metric.key || "Metric"}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <KraphMetric.Knowledge object={{ id: data.metric.id }} />
          </Sidebars.Tab>
        </Sidebars>
      }
      pageActions={
        <>
          <FormSheet trigger={<HobbyKnifeIcon />}>Not implemented</FormSheet>
        </>
      }
    >
      <KraphEntity.Drop
        object={{ id: data.metric.id }}
        className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6"
      >
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            {data.metric.kind?.label || data.metric.kind?.key || data.metric.key}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground"></p>
          <p className="mt-3 text-xl text-muted-foreground">
            <Badge>{data.metric.kind?.key || data.metric.key}</Badge>
          </p>
        </div>
      </KraphEntity.Drop>
      {data.metric.value}
    </KraphMetric.ModelPage>
  );
});
