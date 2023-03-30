import { Link } from "react-router-dom";
import { useTrackRiver } from "../context";

export const CanvasSidebar = (props: {}) => {
  const { run } = useTrackRiver();

  return (
    <div className="h-full flex flex-col text-white p-3">
      <div className="text-white flex-initial text-xl">Flow</div>
      <Link
        to={`/user/fluss/timelines/${run?.id}`}
        className="text-white flex-initial mt-2"
      >
        Open Timeline
      </Link>
      <div className="text-white flex-initial mt-2">{run?.id}</div>
    </div>
  );
};
