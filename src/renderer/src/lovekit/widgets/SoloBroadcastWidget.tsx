import { cn } from "@/core/util/utils";
import { useGetSoloBroadcastQuery } from "@/lovekit/api/graphql";
import { Loader2 } from "lucide-react";
import { StreamJoiner } from "../components/StreamJoiner";


export const AsyncSoloBroadcastWidget = (props: {
  id: string;
  className?: string;
}) => {
  const { data } = useGetSoloBroadcastQuery({
    variables: {
      id: props.id,
    },
  });

  if (!data?.soloBroadcast) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-black text-white/60", props.className)}>
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  return <StreamJoiner broadcast={data.soloBroadcast} showTitle className={props.className} />;
};
