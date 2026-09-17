import { ContextualParams } from "@/reaktion/types";
import { ClickContextual } from "./ClickContextual";
import { ConnectContextual } from "./ConnectContextual";
import { DropContextual } from "./DropContextual";
import { EdgeContextual } from "./EdgeContextual";
import { NodeContextual } from "./NodeContextual";

export const DelegatingContextual = ({ contextual }: { contextual: ContextualParams }) => {
  switch (contextual.kind) {
    case "drop":
    case "subflowdrop":
      return <DropContextual params={contextual} />;
    case "click":
      return <ClickContextual params={contextual} />;
    case "edge":
      return <EdgeContextual params={contextual} />;
    case "connect":
      return <ConnectContextual params={contextual} />;
    case "node":
      return <NodeContextual params={contextual} />;
  }
  return null;
};
