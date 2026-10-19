import { LovekitStream } from "@/core/linkers";
import StreamList from "../components/lists/StreamList";
import { LOVEKIT_HELP } from "../help";

const Page = () => {
  return (
    <LovekitStream.ListPage title="Streams" help={LOVEKIT_HELP.streams}>
      <div className="p-3">
        <StreamList defaultLimit={30} />
      </div>
    </LovekitStream.ListPage>
  );
};

export default Page;
