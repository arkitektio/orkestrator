import { asDetailQueryRoute } from "@/core/app/routes/DetailQueryRoute";
import { Sidebars } from "@/core/components/layout/Sidebars";
import { buildAssignInput } from "@/rekuest/assign";
import { RekuestResolution, RekuestToolbox } from "@/core/linkers";
import {
  TaskEventKind,
  useGetResolutionQuery
} from "@/rekuest/api/graphql";
import { useImplementationAction } from "../hooks/useImplementationAction";
import { usePortForm } from "@/core/lib/ports/usePortForm";
import { toast } from "sonner";
import { useWidgetRegistry } from "@/core/lib/ports/WidgetsContext";
import { Form } from "@/core/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card";
import { ArgsContainer } from "@/core/components/ports/ArgsContainer";
import { Button } from "@/core/components/ui/button";
import { ArrowRight } from "lucide-react";
import { ReturnsContainer } from "@/core/components/ports/returns/ReturnsContainer";
import { portToLabel } from "@/core/lib/ports/utils";
import { ResolutionGraph } from "../components/global/ResolutionGraph";

export const DoForm = ({ id, resolution }: { id: string, resolution: string }) => {
  const { assign, latestTask, implementation } = useImplementationAction({
    id: id,
  });

  const form = usePortForm({
    ports: implementation?.action.args || [],
  });


  const onSubmit = (data: any) => {
    assign(buildAssignInput({
      implementation: id,
      args: data,
      resolution: resolution,
      hooks: [],
    })).then(
      () => {},
      (error) => {
        toast.error(error.message);
      },
    );
  };

  const { registry } = useWidgetRegistry();

  const yieldEvent = latestTask?.events?.find(
    (x) => x.kind == TaskEventKind.Yield,
  );

  const errorEvent = latestTask?.events?.find(
    (x) => x.kind == TaskEventKind.Critical,
  );

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-4 h-full">
            <Card className="flex-1 p-2">
              <CardHeader>
                <CardTitle className="font-light">Arguments</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="w-full">
                  <ArgsContainer
                    registry={registry}
                    ports={implementation?.action?.args || []}
                    path={[]}
                  />
                </div>
              </CardContent>
            </Card>
            <div className="flex-initial h-full flex flex-col ">
              <Button
                type="submit"
                variant={"ghost"}
                className="my-auto block h-full"
              >
                <ArrowRight className="my-auto" />
              </Button>
            </div>

            {yieldEvent ? (
              <Card className="flex-1 p-2">
                <CardHeader>
                  <CardTitle className="font-light">Outs</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-col gap-2">
                    <ReturnsContainer
                      registry={registry}
                      ports={implementation?.action.returns || []}
                      values={yieldEvent?.returns}
                    ></ReturnsContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="font-light">Outs</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-col gap-2">
                    {implementation?.action?.returns?.map((p) => (
                      <div>
                        <div className=" font-bold">{p.label || p.key}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.description}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {portToLabel(p)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {errorEvent && (
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="font-light text-red-800">
                    Errors
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-col gap-2">
                    {errorEvent.message}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </form>
      </Form>
    </>
  );
};

export const ResolutionPage = asDetailQueryRoute(useGetResolutionQuery, ({ data }) => {
  return (
    <RekuestResolution.ModelPage
      title={data.resolution.name}
      object={data.resolution}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <RekuestToolbox.Knowledge object={data?.resolution} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className="flex flex-col gap-4 h-full">
      <div className="flex-initial p-6">
        <div className="mb-3">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl cursor-pointer">
            {data?.resolution?.name}
          </h1>
        </div>
        </div>
        <div className="grid grid-cols-12 gap-4 px-6 h-full w-full">
          <div className="col-span-2 ">
        <DoForm id={data.resolution.implementation.id} resolution={data.resolution.id}/>
        </div>
        <div className="col-span-10 h-full w-full mb-6">
        <ResolutionGraph resolution={data.resolution} />
        </div>
        </div>
      </div>
    </RekuestResolution.ModelPage>
  );
});

export default ResolutionPage;
