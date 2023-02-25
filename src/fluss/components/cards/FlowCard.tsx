import { Flow } from "../../../linker";
import { ListFlowFragment } from "../../api/graphql";

export const FlowCard = ({ flow }: { flow: ListFlowFragment }) => {
  return (
    <Flow.Smart
      showSelfMates={true}
      placement="right"
      object={flow.id}
      dragClassName={({ isOver, canDrop, isSelected, isDragging }) =>
        `rounded shadow-xl group text-white bg-slate-700 ${
          isOver && !isDragging && "border-primary-200 border"
        } ${isDragging && "border-primary-200 border"} ${
          isSelected && "ring-1 ring-primary-200 "
        }`
      }
    >
      <div className="px-6 py-4">
        <Flow.DetailLink
          className={({ isActive }) =>
            "font-bold text-md mb-2 cursor-pointer " +
            (isActive ? "text-primary-300" : "")
          }
          object={flow.id}
        >
          <span className="truncate">{flow?.name}</span>
        </Flow.DetailLink>
        <p className="text-white-700 text-base"></p>
      </div>
    </Flow.Smart>
  );
};
