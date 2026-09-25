import { useImplementationQuery } from "@/rekuest/api/graphql";
import type { Object } from "@/types";
import { useFlowQuery } from "../api/graphql";
import { ShowFlow } from "../show/ShowFlow";

/**
 * The flow behind a rekuest implementation: fluss's `main` section on
 * `@rekuest/implementation` pages. Fluss declares `requires: ["rekuest"]`, so
 * it may ask rekuest for the implementation (a cache hit from the page) to
 * learn which flow it runs; the flow itself is fluss's own.
 */
export const ImplementationFlow = (props: { identifier: string; object: Object }) => {
  const { data: implementation } = useImplementationQuery({
    variables: { id: props.object.id },
  });
  const flowId = implementation?.implementation.params.flow;
  const { data } = useFlowQuery({
    variables: { id: flowId },
    skip: !flowId,
  });

  return (
    <>
      {data?.flow && implementation && (
        <ShowFlow flow={data.flow} template={implementation.implementation} />
      )}
    </>
  );
};
