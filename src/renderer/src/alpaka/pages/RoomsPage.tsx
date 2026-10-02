import { Explainer } from "@/core/layout/Explainer";
import { PageAction } from "@/core/ui/page-action";
import { AlpakaRoom } from "@/core/linkers";
import { UploadIcon } from "lucide-react";
import React from "react";
import RoomList from "../components/lists/RoomList";
import { ALPAKA_HELP } from "../help";

export type IRepresentationScreenProps = {};

const ImagesPage: React.FC<IRepresentationScreenProps> = () => {
  return (
    <AlpakaRoom.ListPage
      help={ALPAKA_HELP.rooms}
      title="Rooms"
      pageActions={
        <>
          <AlpakaRoom.NewButton alwaysShow collapse="icon">
            <PageAction size="sm" icon={<UploadIcon className="h-4 w-4" />}>
              New
            </PageAction>
          </AlpakaRoom.NewButton>
        </>
      }
    >
      <div className="p-3">
        <Explainer
          title="Rooms"
          description="Rooms are places to chat with LLM models. They are the main interface for interacting with the models."
        />
        <RoomList pagination={{ limit: 30 }} />
      </div>
    </AlpakaRoom.ListPage>
  );
};

export default ImagesPage;
