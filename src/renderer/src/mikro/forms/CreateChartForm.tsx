import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { ChoicesField } from "@/core/forms/ChoicesField";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { ParagraphField } from "@arkitektio/bsx/ports/forms/ParagraphField";
import { StringField } from "@arkitektio/bsx/ports/forms/StringField";
import { MikroChart } from "@/core/linkers";
import { Button } from "@/core/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/ui/tabs";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import {
  AxisType,
  ChartLayout,
  GetChartsDocument,
  GetCoordinateSystemDocument,
  useCoordinateSystemOptionsLazyQuery,
  useCreateChartMutation,
} from "../api/graphql";

type Values = {
  name: string;
  description: string;
  coordinateSystem: string | null;
  axisName: string;
  axisType: AxisType;
  axisUnit: string;
  layout: ChartLayout;
};

// The metric kinds: a chart is laid out along an axis that MEASURES something
// and carries a unit, so the enumerating kinds (channel, index) are not offered.
const AXIS_TYPE_OPTIONS = [
  { label: "Time", value: AxisType.Time },
  { label: "Space", value: AxisType.Space },
  { label: "Spectrum", value: AxisType.Spectrum },
  { label: "Microtime", value: AxisType.Microtime },
];

// How the layers share the screen. OVERLAY needs an axis to lay them along, so a
// chart of values is offered the other two.
const LAYOUT_OPTIONS = [
  { label: "Shared: layers in the same units together", value: ChartLayout.Shared },
  { label: "Stacked: one row or panel per layer", value: ChartLayout.Stacked },
  { label: "Overlay: every layer in one plot, each on its own scale", value: ChartLayout.Overlay },
];

/**
 * A chart is created over a WORLD: a space with exactly one metric axis. Either
 * an existing one is adopted as it is (and everything already laid along it can
 * then be drawn), or a new one is made from a single axis. The chart starts with
 * no layers either way.
 */
export const CreateChartForm = (props: { coordinateSystem?: string }) => {
  const navigate = useNavigate();
  const [createChart] = useCreateChartMutation({
    // A chart over an existing space also joins that system's Visualizations tab.
    refetchQueries: [GetChartsDocument, GetCoordinateSystemDocument],
  });
  const [searchSystems] = useCoordinateSystemOptionsLazyQuery();
  const [world, setWorld] = useState<"existing" | "new" | "values">(
    props.coordinateSystem ? "existing" : "new",
  );

  const submit = useGraphQLDialog(createChart, {
    errorTitle: "Couldn't create the chart",
    onSuccess: (data) => {
      const chart = data?.createChart;
      if (chart) navigate(MikroChart.linkBuilder(chart.id));
    },
  });

  const form = useForm<Values>({
    defaultValues: {
      name: "New Chart",
      description: "",
      coordinateSystem: props.coordinateSystem ?? null,
      axisName: "t",
      axisType: AxisType.Time,
      axisUnit: "second",
      layout: ChartLayout.Shared,
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (data) => {
          if (world !== "new" && !data.coordinateSystem) {
            form.setError("coordinateSystem", { message: "Pick a coordinate system" });
            return;
          }
          submit({
            variables: {
              input: {
                name: data.name,
                description: data.description || null,
                // No kind: what the world is decides what can be drawn in it. A
                // table's rows have no axis, so OVERLAY (which lays along-axis
                // layers in one plot) is not offered there (the field hides it).
                layout:
                  world === "values" && data.layout === ChartLayout.Overlay ? ChartLayout.Shared : data.layout,
                ...(world !== "new"
                  ? { coordinateSystem: data.coordinateSystem }
                  : {
                      axis: {
                        name: data.axisName,
                        type: data.axisType,
                        unit: data.axisUnit,
                      },
                    }),
              },
            },
          });
        })}
      >
        <DialogHeader>
          <DialogTitle>Create Chart</DialogTitle>
          <DialogDescription>
            A chart shows how much: along one axis, or as values against values. It starts empty;
            layers are added afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4">
          <StringField label="Name" name="name" placeholder="My Chart" />
          <ParagraphField label="Description" name="description" />

          <Tabs value={world} onValueChange={(value) => setWorld(value as "existing" | "new" | "values")}>
            <TabsList>
              <TabsTrigger value="new">New axis</TabsTrigger>
              <TabsTrigger value="existing">Existing axis</TabsTrigger>
              <TabsTrigger value="values">Values of rows</TabsTrigger>
            </TabsList>
            <TabsContent value="new" className="grid grid-cols-1 gap-4 pt-2">
              <StringField
                label="Axis name"
                name="axisName"
                description="How the axis is called, e.g. t or wavelength"
              />
              <ChoicesField label="Axis type" name="axisType" options={AXIS_TYPE_OPTIONS} />
              <StringField
                label="Unit"
                name="axisUnit"
                description="The unit positions along the axis are in, e.g. second, ms, nm"
              />
            </TabsContent>
            <TabsContent value="existing" className="pt-2">
              <GraphQLSearchField
                name="coordinateSystem"
                label="Coordinate system"
                searchQuery={searchSystems}
                description="A space with exactly one metric axis. What is already registered into it can be drawn in the chart."
              />
            </TabsContent>
            <TabsContent value="values" className="pt-2">
              <GraphQLSearchField
                name="coordinateSystem"
                label="Whose rows"
                searchQuery={searchSystems}
                description="The space a table's rows live in -- usually its own. Its rows are drawn at the values of their columns: a scatter, a histogram, a box per group. Nothing about the space is drawn. To plot one table straight away, use Plot on the table."
              />
            </TabsContent>
          </Tabs>

          <ChoicesField
            label="Layout"
            name="layout"
            options={
              world === "values" ? LAYOUT_OPTIONS.filter((o) => o.value !== ChartLayout.Overlay) : LAYOUT_OPTIONS
            }
            description="How the layers share the screen. It can be changed on the chart at any time."
          />
        </div>

        <DialogFooter>
          <Button type="submit">Create Chart</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
