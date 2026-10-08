import { useGraphQLDialog } from "@/core/dialogs/useGraphQLDialog";
import { ChoicesField } from "@/core/forms/ChoicesField";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { ParagraphField } from "@/core/forms/ParagraphField";
import { StringField } from "@/core/forms/StringField";
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
  GetChartsDocument,
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
};

// The metric kinds: a chart is laid out along an axis that MEASURES something
// and carries a unit, so the enumerating kinds (channel, index) are not offered.
const AXIS_TYPE_OPTIONS = [
  { label: "Time", value: AxisType.Time },
  { label: "Space", value: AxisType.Space },
  { label: "Spectrum", value: AxisType.Spectrum },
  { label: "Microtime", value: AxisType.Microtime },
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
    refetchQueries: [GetChartsDocument],
  });
  const [searchSystems] = useCoordinateSystemOptionsLazyQuery();
  const [world, setWorld] = useState<"existing" | "new">(
    props.coordinateSystem ? "existing" : "new",
  );

  const submit = useGraphQLDialog(createChart, {
    successMessage: "Chart created",
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
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (data) => {
          if (world === "existing" && !data.coordinateSystem) {
            form.setError("coordinateSystem", { message: "Pick a coordinate system" });
            return;
          }
          submit({
            variables: {
              input: {
                name: data.name,
                description: data.description || null,
                ...(world === "existing"
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
            A chart lays data out along one axis. It starts empty; layers are added afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4">
          <StringField label="Name" name="name" placeholder="My Chart" />
          <ParagraphField label="Description" name="description" />

          <Tabs value={world} onValueChange={(value) => setWorld(value as "existing" | "new")}>
            <TabsList>
              <TabsTrigger value="new">New axis</TabsTrigger>
              <TabsTrigger value="existing">Existing space</TabsTrigger>
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
          </Tabs>
        </div>

        <DialogFooter>
          <Button type="submit">Create Chart</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};
