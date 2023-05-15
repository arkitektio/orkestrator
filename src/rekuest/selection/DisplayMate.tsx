import React, { useEffect } from "react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import { useAlert } from "../../components/alerter/alerter-context";
import { Mate, MateOptions, Partner } from "../postman/mater/mater-context";

export interface MateProps {
  mate: Mate;
  self: Partner;
  options?: MateOptions;
  focus?: boolean;
  progress: (x: number | undefined) => Promise<void>;
}

export const DisplayMate: React.FC<MateProps> = ({
  mate,
  self,
  focus = false,
  progress: prog,
}) => {
  const { alert } = useAlert();

  const [{ isOver, canDrop }, drop] = useDrop(() => {
    return {
      accept: mate.accepts || [NativeTypes.HTML],
      drop: (partners: Partner[], monitor) => {
        if (monitor.getItemType() == NativeTypes.HTML) {
          return;
        }
        console.log(partners);
        mate
          .action(self, partners, prog)
          .then(() => {
            prog(undefined);
            console.log("done");
          })
          .catch((error) => {
            prog(undefined);
            alert({ message: error.message });
          });
        return {};
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver(),
        canDrop: !!monitor.canDrop(),
      }),
    };
  }, []);

  useEffect(() => {
    if (focus) {
      const listener = {
        handleEvent: (e: KeyboardEvent) => {
          if (e.key === " ") {
            e.stopPropagation();
            mate
              .action(self, [self], prog)
              .then(() => {
                console.log("done");
                prog(undefined);
              })
              .catch((error) => {
                prog(undefined);
                alert({ message: error.message });
              });
          }
        },
      };
      document.addEventListener("keydown", listener);

      return () => {
        document.removeEventListener("keydown", listener);
      };
    }
  }, [focus]);

  return (
    <div
      ref={drop}
      className={
        mate.className
          ? typeof mate.className == "function"
            ? mate.className({ isOver: isOver || focus })
            : mate.className
          : `flex-1 rounded shadow-md group  text-black bg-center bg-cover bg-primary-200 px-2 py-1 transition-colors ${
              isOver || focus ? "bg-primary-500 text-slate-50" : ""
            }`
      }
    >
      {mate?.label}
    </div>
  );
};
