import { FormDialog, useFormDialog } from "@/components/dialog/FormDialog";
import { ChoicesField } from "@/components/fields/ChoicesField";
import {
  ListSearchField,
  SearchOptions,
} from "@/components/fields/ListSearchField";
import { ParagraphField } from "@/components/fields/ParagraphField";
import { StringField } from "@/components/fields/StringField";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  CreateMeasurementCategoryMutationVariables,
  CreateRelationCategoryMutationVariables,
  GraphFragment,
  ValueKind,
} from "@/kraph/api/graphql";
import { cn } from "@/lib/utils";
import { smartRegistry } from "@/providers/smart/registry";
import { ContextualContainer } from "@/reaktion/edit/contextuals/ContextualContainer";
import { useForm } from "react-hook-form";
import { ConnectContextualParams, StagingEdgeParams } from "../types";
import { labelToEdgeAgeName } from "../utils";

const search = async ({ search, values }: SearchOptions) => {
  const models = smartRegistry
    .registeredModels()
    .filter((model) => {
      if (values) return values.includes(model.identifier);
      if (search) return model.identifier.includes(search);
      if (!search) return true;
      return false;
    })
    .map((model) => ({
      label: model.identifier,
      value: model.identifier,
    }));
  return models || [];
};

export const RelationForm = (props: {
  params: ConnectContextualParams;
  graph: GraphFragment;
  addStagingEdge: (params: StagingEdgeParams) => void;
}) => {
  const run = useFormDialog();

  const form = useForm<CreateRelationCategoryMutationVariables["input"]>({
    defaultValues: {
      label: "",
      graph: props.graph.id,
    },
  });

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            run.onSubmit(data);
          })}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 flex-col gap-1 flex">
              <StringField
                label="Label"
                name="label"
                description="Add a label"
              />

              <DialogFooter>
                <Button type="submit">Add</Button>
              </DialogFooter>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
};

export const MeasurmentForm = (props: {
  params: ConnectContextualParams;
  graph: GraphFragment;
  addStagingEdge: (params: StagingEdgeParams) => void;
}) => {
  const run = useFormDialog();

  const form = useForm<CreateMeasurementCategoryMutationVariables["input"]>({
    defaultValues: {
      label: "",
      graph: props.graph.id,
    },
  });

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(async (data) => {
            run.onSubmit(data);
          })}
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 flex-col gap-1 flex">
              <StringField
                label="Label"
                name="label"
                description="Add a label"
              />

              <ParagraphField
                label="Description"
                name="description"
                description="Add a description"
              />

              <ChoicesField
                label="Data Kind"
                name="dataKind"
                description="Select a data kind"
                options={[
                  { label: "Float", value: ValueKind.Float },
                  { label: "Integer", value: ValueKind.Int },
                  { label: "String", value: ValueKind.String },
                ]}
              />

              <ListSearchField
                search={search}
                label="Allowed Structures"
                name="measuring_structures"
                description="Search for a structure that is allowed to measure this"
              />

              <DialogFooter>
                <Button type="submit">Add</Button>
              </DialogFooter>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
};

export const ConnectContextual = (props: {
  params: ConnectContextualParams;
  graph: GraphFragment;
  addStagingEdge: (params: StagingEdgeParams) => void;
  onCancel: () => void;
}) => {
  const onSubmitMeasurement = async (
    data: CreateMeasurementCategoryMutationVariables["input"],
  ) => {
    await props.addStagingEdge({
      data: data,
      ageName: labelToEdgeAgeName(data.label || data.key),
      type: "stagingmeasurement",
      source: props.params.leftNode.id,
      target: props.params.rightNode.id,
    });
  };

  const onSubmitRelation = async (
    data: CreateRelationCategoryMutationVariables["input"],
  ) => {
    await props.addStagingEdge({
      data: data,
      ageName: labelToEdgeAgeName(data.label || data.key),
      type: "stagingrelation",
      source: props.params.leftNode.id,
      target: props.params.rightNode.id,
    });
  };

  return (
    <ContextualContainer
      style={{
        left: props.params.position.x,
        top: props.params.position.y,
      }}
      active={true}
    >
      <div className="flex flex-col space-y-1.5 text-center sm:text-left">
        <FormDialog
          trigger={
            <Button
              className={cn("flex flex-row items-center justify-center")}
              variant={"outline"}
              size="sm"
            >
              Add Relation
            </Button>
          }
          onSubmit={onSubmitRelation}
          onError={props.onCancel}
        >
          <RelationForm
            graph={props.graph}
            addStagingEdge={props.addStagingEdge}
            params={props.params}
          />
        </FormDialog>
        <FormDialog
          trigger={
            <Button
              className={cn("flex flex-row items-center justify-center")}
              variant={"outline"}
              size="sm"
            >
              Add Measurement
            </Button>
          }
          onSubmit={onSubmitMeasurement}
          onError={props.onCancel}
        >
          <MeasurmentForm
            graph={props.graph}
            addStagingEdge={props.addStagingEdge}
            params={props.params}
          />
        </FormDialog>
      </div>
    </ContextualContainer>
  );
};
