import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Card } from "@/core/components/ui/card";
import { ElektroMechanism } from "@/core/linkers";
import { useDetailMechanismQuery } from "../api/graphql";

export type IRepresentationScreenProps = {};

export const MechanismPage = asDetailQueryRoute(
  useDetailMechanismQuery,
  ({ data }) => {

    return (
      <ElektroMechanism.ModelPage
        variant="black"
        title={data?.mechanism?.name}
        object={data.mechanism}
      >
        <div className="h-full w-full grid grid-cols-12 grid-reverse gap-4 pointers-events-none p-4 ">

          <div className="col-span-3  @container bg-black bg-clip-padding backdrop-filter backdrop-blur-2xl bg-opacity-10 z-100 overflow-hidden flex flex-col ">

            <div className=" p-3">
              <div>
                <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                  {data.mechanism.name}
                </h1>
                <p className="mt-3 text-xl text-muted-foreground">
                  {data.mechanism.name}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-3">
              {data.mechanism.parameters.map((param) => (
                <Card className="col-span-1 p-4"  key={param.key}>
                  <div className="flex flex-col gap-2" key={param.key}>
                    <div className="flex-1 font-light">
                      {param.key} ({param.kind})
                    </div>

                  </div>
                </Card>
              ))}
            </div>



        </div>
        </div>

      </ElektroMechanism.ModelPage>
    );
  },
);

export default MechanismPage;
