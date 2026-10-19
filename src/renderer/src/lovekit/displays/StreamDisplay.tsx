import { DisplayLine, DisplayLinePlaceholder } from "@/core/smart/display/DisplayLine";
import type { DisplayWidgetProps } from "@/core/smart/display/registry";
import { StreamKind, useGetStreamQuery } from "@/lovekit/api/graphql";
import { Mic, Video } from "lucide-react";
import { StreamerName, streamKindLabel } from "../components/streamer";

/** `@lovekit/stream`: its title, what it carries and who sends it. */
export const StreamDisplay = (props: DisplayWidgetProps) => {
  const { data } = useGetStreamQuery({ variables: { id: props.id } });
  const stream = data?.stream;
  if (!stream) return <DisplayLinePlaceholder {...props} icon={Video} />;

  return (
    <DisplayLine
      {...props}
      icon={stream.kind === StreamKind.Audio ? Mic : Video}
      title={stream.title || `${streamKindLabel(stream.kind)} stream`}
      meta={[streamKindLabel(stream.kind), <StreamerName streamer={stream.streamer} />]}
    />
  );
};
