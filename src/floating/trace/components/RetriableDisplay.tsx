import { RetriableNodeFragment } from "../../../fluss/api/graphql";

export const RetriableDisplay = (props: { node: RetriableNodeFragment }) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-white text-xl"> Max Retries </div>
        <div className="text-white text-xl"> {props.node.maxRetries}</div>
        <div className="text-white text-xl"> Retry Delay</div>
        <div className="text-white text-xl"> {props.node.retryDelay}</div>
      </div>
    </>
  );
};
