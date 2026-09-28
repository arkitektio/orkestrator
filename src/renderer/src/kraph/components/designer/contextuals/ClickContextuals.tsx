import { DialogButton } from "@/core/ui/dialogbutton";
import { GraphFragment } from "@/kraph/api/graphql";
import { ContextualContainer } from "@/core/ui/contextual-container";
import { ClickContextualParams, StagingNodeParams } from "../types";

export const ClickContextual = (props: {
  params: ClickContextualParams;
  graph: GraphFragment;
  addStagingNode: (params: StagingNodeParams) => void;
  onCancel: () => void;
}) => {
  return (
    <ContextualContainer
      style={{
        left: props.params.position.x,
        top: props.params.position.y,
      }}
      active={true}
    >
      <div className="flex flex-col space-y-1.5 text-center sm:text-left">
        <DialogButton
          variant={"outline"}
          name="createentitycategory"
          size={"default"}
          onSubmit={props.onCancel}
          onError={props.onCancel}
          options={{ size: "large" }}
          dialogProps={{ graph: props.graph.id }}
        > Entity </DialogButton>
      </div>
    </ContextualContainer>
  );
};
