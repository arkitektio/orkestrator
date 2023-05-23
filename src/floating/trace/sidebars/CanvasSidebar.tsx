import { useTraceRiver } from "../context";

export const CanvasSidebar = (props: {}) => {
  const { condition } = useTraceRiver();

  return (
    <div className="h-full flex flex-col text-white p-3">
      <div className="text-white flex-initial text-xl">Condition</div>
      <div className="text-white flex-initial mt-2">{condition?.id}</div>
    </div>
  );
};
