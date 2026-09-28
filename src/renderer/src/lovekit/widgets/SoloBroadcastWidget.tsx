import { cn } from "@/core/util/utils";
import { useGetSoloBroadcastQuery } from "@/lovekit/api/graphql";
import { StreamJoiner } from "../components/StreamJoiner";


export const AsyncSoloBroadcastWidget = (props: {
  id: string;
  className?: string;
}) => {
  const { data, error } = useGetSoloBroadcastQuery({
    variables: {
      id: props.id,
    },
  });

  const broadcast = data?.soloBroadcast?.id;

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-black", props.className)}>
      {broadcast && (
        <StreamJoiner broadcast={data.soloBroadcast} />
      )}
      {!broadcast && (
        <div className="flex items-center justify-center h-full">
          <span className="text-white">Loading broadcast...</span>
        </div>
      )}
      {error && (
        <div className="text-red-500">
          Error loading stream: {error.message}
        </div>
      )}
    </div>
  );
};
