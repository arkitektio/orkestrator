import { useGraphQlFormDialog } from "@/core/dialogs/FormDialog";
import { ChoicesField } from "@/core/forms/ChoicesField";
import { StringField } from "@/core/forms/StringField";
import { Button } from "@/core/ui/button";
import { DialogFooter } from "@/core/ui/dialog";
import { Form } from "@/core/ui/form";
import { useForm } from "react-hook-form";
import {
  ColumnKind,
  CreateScatterPlotInput,
  GraphTableQueryFragment,
  useCreateScatterPlotMutation,
  ValueKind
} from "../api/graphql";

const TForm = (props: { graphQuery: GraphTableQueryFragment }) => {
  const [add] = useCreateScatterPlotMutation();

  const dialog = useGraphQlFormDialog(add);

  // Get numeric columns from the query
  const numericColumns = props.graphQuery.columns.filter(
    (col) =>
      col.valueKind === ValueKind.Float ||
      col.valueKind === ValueKind.Int ||
      col.kind === ColumnKind.Value,
  );

  // Get ID columns
  const idColumns = props.graphQuery.columns.filter(
    (col) => col.kind === ColumnKind.Node || col.kind === ColumnKind.Edge,
  );

  const form = useForm<CreateScatterPlotInput>({
    defaultValues: {
      name: "New Scatter Plot",
      description: "A scatter plot visualization",
      graphQueryId: Number(props.graphQuery.id),
      xColumn: numericColumns[0]?.key || "",
      yColumn: numericColumns[1]?.key || numericColumns[0]?.key || "",
      idColumn: idColumns[0]?.key || "id",
    },
  });

  const columnOptions = numericColumns.map((col) => ({
    value: col.key,
    label: col.label || col.key,
  }));

  const idColumnOptions = idColumns.map((col) => ({
    value: col.key,
    label: col.label || col.key,
  }));

  const allColumnOptions = props.graphQuery.columns.map((col) => ({
    value: col.key,
    label: col.label || col.key,
  }));

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (data) => {
          dialog({
            variables: {
              input: data,
            },
          });
        })}
      >
        <div className="grid grid-cols-1 gap-4 p-4">
          <StringField
            label="Name"
            name="name"
            description="Name of the scatter plot"
          />
          <StringField
            label="Description"
            name="description"
            description="Optional description"
          />

          <ChoicesField
            label="X-Axis Column"
            name="xColumn"
            description="Select the column for X-axis"
            options={columnOptions}
          />

          <ChoicesField
            label="Y-Axis Column"
            name="yColumn"
            description="Select the column for Y-axis"
            options={columnOptions}
          />

          <ChoicesField
            label="ID Column"
            name="idColumn"
            description="Select the column to use for point IDs"
            options={idColumnOptions}
          />

          <ChoicesField
            label="Color Column (Optional)"
            name="colorColumn"
            description="Select a column to color points by"
            options={allColumnOptions}
          />

          <ChoicesField
            label="Size Column (Optional)"
            name="sizeColumn"
            description="Select a column to size points by"
            options={columnOptions}
          />

          <ChoicesField
            label="Shape Column (Optional)"
            name="shapeColumn"
            description="Select a column to vary point shapes by"
            options={allColumnOptions}
          />
        </div>

        <DialogFooter>
          <Button type="submit">Create Plot</Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default TForm;
