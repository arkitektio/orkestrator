import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { FormSheet } from "@/components/dialog/FormDialog";
import { Badge } from "@/components/ui/badge";
import { KraphReagent, KraphRelation } from "@/linkers";
import { HobbyKnifeIcon } from "@radix-ui/react-icons";
import { useGetRelationQuery } from "../api/graphql";

export default asDetailQueryRoute(useGetRelationQuery, ({ data }) => {
  return (
    <KraphRelation.ModelPage
      object={{ id: data.relation.id }}
      title={data?.relation.category?.label ?? data?.relation.label}
      sidebars={<KraphReagent.Knowledge object={{ id: data.relation.id }} />}
      pageActions={
        <>
          <FormSheet trigger={<HobbyKnifeIcon />}>Not implemented</FormSheet>
        </>
      }
    >
      <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
        <div>
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            {data.relation.category?.label ?? data.relation.label}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground"></p>
          <p className="mt-3 text-xl text-muted-foreground">
            <Badge>{data.relation.category?.label ?? "not declared in this graph"}</Badge>
          </p>
        </div>
      </div>

      <div className="flex flex-col p-6">
        <p className="text-sm font-light">Appears in </p>
      </div>
    </KraphRelation.ModelPage>
  );
});
