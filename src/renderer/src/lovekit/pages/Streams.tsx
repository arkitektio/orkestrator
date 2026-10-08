import { LovekitStream } from "@/core/linkers";
import StreamList from "../components/lists/StreamList";

const Page = () => {
  return (
    <LovekitStream.ListPage title="Streams">
      <div className="p-3">
        <StreamList defaultLimit={30} />
      </div>
    </LovekitStream.ListPage>
  );
};

export default Page;
