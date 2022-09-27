import React, { useState } from "react";
import { Share } from "../../../components/social/Share";
import { CommentableModels } from "../../api/graphql";

export const DiscussionSidebar: React.FC<{
  id: string;
  model: CommentableModels;
}> = (props) => {
  const [discussionVisible, setDiscussionVisible] = useState(false);

  return (
    <div className="flex p-4 flex-col h-full">
      <div className="flex-grow"></div>
    </div>
  );
};
