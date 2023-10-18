import { FlussFlow } from "../../../linker";
import { useTrackRiver } from "../context";
export const CanvasSidebar = (props: {}) => {
  const { run } = useTrackRiver();

  return (
    <div className="h-full flex flex-col text-white p-3">
      <div className="text-white flex-initial text-xl">Run</div>
      {run?.flow?.id && <FlussFlow.DetailLink
        object={run?.flow?.id}
        className="text-white flex-initial mt-2"
      >
        Open Flow
      </FlussFlow.DetailLink>}
    </div>
  );
};
