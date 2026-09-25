import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { buildAssignInput } from "@/rekuest/assign";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { ArgsContainer } from "@/components/ports/ArgsContainer";
import { useActionDescription } from "@/lib/rekuest/ActionDescription";
import { RekuestShortcut } from "@/linkers";
import {
  TaskEventKind,
  ShortcutFragment,
  useShortcutQuery,
} from "@/rekuest/api/graphql";
import { ArrowRight } from "lucide-react";
import { useCallback } from "react";
import { useAction } from "../hooks/useAction";
import { usePortForm } from "@/lib/ports/usePortForm";
import { ReturnsContainer } from "@/lib/ports/tailwind";
import { portToLabel } from "@/lib/ports/utils";
import { useWidgetRegistry } from "@/lib/ports/WidgetsContext";

export const ShortcutForm = ({ shortcut }: { shortcut: ShortcutFragment }) => {
  const { assign, latestTask } = useAction({
    id: shortcut.action.id,
  });

  const form = usePortForm({
    ports: shortcut?.args || [],
  });

  const onSubmit = (data: any) => {
    console.log("Submiftting");
    assign(buildAssignInput({
      action: shortcut.action.id,
      args: { ...data, ...shortcut.savedArgs },
      hooks: [],
    })).then(
      (v) => {
        console.log("Result", v);
      },
      (error) => {
        console.log("Error", error);
      },
    );
  };

  const { registry } = useWidgetRegistry();

  const yieldEvent = latestTask?.events.find(
    (x) => x.kind == TaskEventKind.Yield,
  );

  const errorEvent = latestTask?.events.find(
    (x) => x.kind == TaskEventKind.Critical,
  );

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="rounded flex gap-2xl max-w-[80%] mt-2 gap-2">
            <Card className="flex-1 p-2">
              <CardHeader>
                <CardTitle className="font-light">Arguments</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="w-full">
                  <ArgsContainer
                    registry={registry}
                    groups={shortcut?.action.portGroups || []}
                    ports={shortcut?.args || []}
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
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="font-light">Outs</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-col gap-2">
                    <ReturnsContainer
                      registry={registry}
                      ports={shortcut.returns}
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
                    {shortcut?.returns?.map((p) => (
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

export const TPage = asDetailQueryRoute(useShortcutQuery, ({ data }) => {
  const copyHashToClipboard = useCallback(() => {
    navigator.clipboard.writeText(data?.shortcut.action?.hash || "");
  }, [data?.shortcut.action?.hash]);

  const description = useActionDescription({
    description: data.shortcut.action.description || "",
  });

  return (
    <RekuestShortcut.ModelPage
      title={data.shortcut.name}
      object={data.shortcut}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Knowledge">
            <RekuestShortcut.Knowledge object={data?.shortcut} />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <div className=" p-6">
        <div className="mb-3">
          <h1
            className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl cursor-pointer"
            onClick={copyHashToClipboard}
          >
            {data?.shortcut?.name}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground max-w-[80%]">
            {description}{" "}
            {data.shortcut.bindNumber ? `(${data.shortcut.bindNumber})` : ""}
          </p>
        </div>
        <ShortcutForm shortcut={data.shortcut} />
      </div>
    </RekuestShortcut.ModelPage>
  );
});


export default TPage;
