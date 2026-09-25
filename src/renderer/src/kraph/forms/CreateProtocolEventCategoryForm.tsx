import { useDialog } from "@/core/dialogs/registry";
import { GraphQLListSearchField } from "@/core/forms/GraphQLListSearchField";
import { GraphQLSearchField } from "@/core/forms/GraphQLSearchField";
import { StringField } from "@/core/forms/StringField";
import { SwitchField } from "@/core/forms/SwitchField";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/core/ui/accordion";
import { Button } from "@/core/ui/button";
import { Card } from "@/core/ui/card";
import { Form } from "@/core/ui/form";
import {
  ResizablePanel,
  ResizablePanelGroup,
} from "@/core/ui/resizable";
import { ScrollArea } from "@/core/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/ui/tabs";
import { useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import {
  CreateProtocolEventCategoryMutationVariables,
  useCreateProtocolEventCategoryMutation,
  useSearchEntityCategoryLazyQuery,
} from "../api/graphql";
import { RoleProvider } from "../providers/RoleProvider";

export const TForm = (props: { graph: string }) => {
  const [create] = useCreateProtocolEventCategoryMutation({
    refetchQueries: ["GetGraph"],
  });

  const dialog = useDialog();

  const onUpdate = (data) => {
    create({
      variables: {
        input: data,
      },
    }).then(() => dialog.closeDialog());
  };

  const myform = useForm<CreateProtocolEventCategoryMutationVariables["input"]>(
    {
      defaultValues: {
        graph: props.graph,
        backfill: false,
        label: "No Label",
        description: "Description",
        inputs: [],
        outputs: [],
      },
    }
  );

  const inputs = myform.watch("inputs");
  const outputs = myform.watch("outputs");

  const roles = useMemo(() => {
    return [
      ...(inputs?.map((role) => ({
        label: role.role,
        value: role.role,
      })) || []),
      ...(outputs?.map((role) => ({
        label: role.role,
        value: role.role,
      })) || []),
    ];
  }, [
    inputs,
    outputs,
  ]);

  const [searchEntityCategory] = useSearchEntityCategoryLazyQuery();

  const sourceArray = useFieldArray({
    control: myform.control,
    name: "inputs",
  });

  const targetArray = useFieldArray({
    control: myform.control,
    name: "outputs",
  });


  return (
    <Form {...myform}>
      <form
        onSubmit={myform.handleSubmit(onUpdate)}
        className="flex flex-col h-full w-full overflow-hidden"
      >
        <div className="flex gap-4 p-4 border-b items-end">
          <div className="flex-1 grid grid-cols-2 gap-4">
            <StringField
              name={`label`}
              label="Label"
              description="Which label for the protocol"
            />
            <StringField
              name={`description`}
              label="Description"
              description="Which description for the protocol"
            />
            <SwitchField
              label="Draw existing evidence"
              name="backfill"
              description="Project claims already made under this word into the graph now, instead of waiting for the next reproject."
            />
          </div>
          <Button type="submit" variant={"default"}>
            Save
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <RoleProvider roles={roles}>
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={100} minSize={30}>
                  <Tabs defaultValue="entities" className="h-full flex flex-col">
                    <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 px-2">
                      <TabsTrigger
                        value="entities"
                        className="data-[state=active]:bg-muted"
                      >
                        Entities
                      </TabsTrigger>
                      <TabsTrigger
                        value="reagents"
                        className="data-[state=active]:bg-muted"
                      >
                        Reagents
                      </TabsTrigger>
                      <TabsTrigger
                        value="variables"
                        className="data-[state=active]:bg-muted"
                      >
                        Variables
                      </TabsTrigger>
                    </TabsList>
                    <ScrollArea className="flex-1">
                      <div className="p-4">
                        <TabsContent value="entities" className="mt-0">
                          <Accordion
                            type="multiple"
                            defaultValue={["source", "target"]}
                          >
                            <AccordionItem value="source">
                              <AccordionTrigger>Source Entities</AccordionTrigger>
                              <AccordionContent className="flex flex-col gap-2">
                                {sourceArray.fields.map((item, index) => (
                                  <Card key={item.id} className="p-3">
                                    <div className="flex flex-col gap-2">
                                      <StringField
                                        name={`sourceEntityRoles.${index}.role`}
                                        label="Role"
                                        description="Role name"
                                      />
                                      <Accordion type="single" collapsible>
                                        <AccordionItem value="details" className="border-none">
                                          <AccordionTrigger className="py-2 text-xs">
                                            Details
                                          </AccordionTrigger>
                                          <AccordionContent className="flex flex-col gap-2 pt-2">
                                            <StringField
                                              name={`sourceEntityRoles.${index}.label`}
                                              label="Label"
                                            />
                                            <StringField
                                              name={`sourceEntityRoles.${index}.description`}
                                              label="Description"
                                            />
                                            <GraphQLListSearchField
                                              name={`sourceEntityRoles.${index}.categoryDefinition.categoryFilters`}
                                              label="Category Filters"
                                              searchQuery={searchEntityCategory}
                                            />
                                            <GraphQLSearchField
                                              name={`sourceEntityRoles.${index}.createCategory`}
                                              label="Create Category"
                                              searchQuery={searchEntityCategory}
                                              description="Category to use when creating"
                                            />
                                          </AccordionContent>
                                        </AccordionItem>
                                      </Accordion>
                                      <Button
                                        type="button"
                                        onClick={() => sourceArray.remove(index)}
                                        variant="destructive"
                                        size="sm"
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </Card>
                                ))}
                                <Button
                                  type="button"
                                  onClick={() =>
                                    sourceArray.append({
                                      key: "new_target",
                                      role: "new_target",
                                      descriptor: {
                                        keys: [],
                                      },
                                    })
                                  }
                                  variant="outline"
                                  size="sm"
                                >
                                  Add Source Entity
                                </Button>
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="target">
                              <AccordionTrigger>Target Entities</AccordionTrigger>
                              <AccordionContent className="flex flex-col gap-2">
                                {targetArray.fields.map((item, index) => (
                                  <Card key={item.id} className="p-3">
                                    <div className="flex flex-col gap-2">
                                      <StringField
                                        name={`targetEntityRoles.${index}.role`}
                                        label="Role"
                                        description="Role name"
                                      />
                                      <Accordion type="single" collapsible>
                                        <AccordionItem value="details" className="border-none">
                                          <AccordionTrigger className="py-2 text-xs">
                                            Details
                                          </AccordionTrigger>
                                          <AccordionContent className="flex flex-col gap-2 pt-2">
                                            <StringField
                                              name={`targetEntityRoles.${index}.label`}
                                              label="Label"
                                            />
                                            <StringField
                                              name={`targetEntityRoles.${index}.description`}
                                              label="Description"
                                            />
                                            <GraphQLListSearchField
                                              name={`targetEntityRoles.${index}.categoryDefinition.categoryFilters`}
                                              label="Category Filters"
                                              searchQuery={searchEntityCategory}
                                            />
                                            <GraphQLSearchField
                                              name={`targetEntityRoles.${index}.createCategory`}
                                              label="Create Category"
                                              searchQuery={searchEntityCategory}
                                              description="Category to use when creating"
                                            />
                                          </AccordionContent>
                                        </AccordionItem>
                                      </Accordion>
                                      <Button
                                        type="button"
                                        onClick={() => targetArray.remove(index)}
                                        variant="destructive"
                                        size="sm"
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  </Card>
                                ))}
                                <Button
                                  type="button"
                                  onClick={() =>
                                    targetArray.append({
                                      key: "new_target",
                                      role: "new_target",
                                      descriptor: {
                                        keys: [],
                                      },
                                    })
                                  }
                                  variant="outline"
                                  size="sm"
                                >
                                  Add Target Entity
                                </Button>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </TabsContent>


                      </div>
                    </ScrollArea>
                  </Tabs>
                </ResizablePanel>
              </ResizablePanelGroup>
          </RoleProvider>
        </div>
      </form>
    </Form>
  );
};

export default TForm;
