import { useTrackRiver } from "../context";

export const CanvasSidebar = (props: {}) => {
  const { flow } = useTrackRiver();

  return (
    <div className="h-full flex flex-col text-white p-3">
      <div className="text-white flex-initial text-xl">Flow</div>
      <div className="text-white flex-initial mt-2">{flow?.id}</div>
    </div>
  );
};
