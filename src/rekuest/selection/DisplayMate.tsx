import React, { useEffect } from "react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import { SMART_MODEL_DROP_TYPE } from "../../constants";
import { Drop, Mate, MateOptions } from "../../mates/types";
import { useModelSelector } from "./context";

export interface MateProps {
  mate: Mate;
  self: Drop;
  options?: MateOptions;
  focus?: boolean;
  clickable?: boolean;
  progress: (x: number | undefined) => Promise<void>;
  onDone?: () => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

export const DisplayMate: React.FC<MateProps> = ({
  mate,
  self,
  focus = false,
  progress: prog,
  clickable = false,
  onDone,
  onError,
}) => {
  const { selection } = useModelSelector();

  const click = (e: any) => {
    console.log("click");
    if (clickable) {
      e.stopPropagation();
      console.log("clickable");
      mate
        .action({
          self: self,
          partners: selection && selection.length > 0 ? selection : [self],
          progress: prog,
        })
        .then(() => {
          prog(undefined);
          onDone && onDone();
          console.log("done");
        })
        .catch((error) => {
          prog(undefined);
          console.log(error);
          onError && onError(error);
        });
    }
  };

  const [{ isOver, canDrop }, drop] = useDrop(() => {
    return {
      accept: [SMART_MODEL_DROP_TYPE],
      drop: (partners: Drop[], monitor) => {
        if (monitor.getItemType() == NativeTypes.HTML) {
          return;
        }
        let item = monitor.getItem();
        console.log(partners);
        mate
          .action({
            self: self,
            partners: item,
            progress: prog,
          })
          .then(() => {
            prog(undefined);
            onDone && onDone();
            console.log("done");
          })
          .catch((error) => {
            prog(undefined);
            console.log(error);
            onError && onError(error);
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
              .action({
                self: self,
                partners:
                  selection && selection.length > 0 ? selection : [self],
                progress: prog,
              })
              .then(() => {
                console.log("done");
                onDone && onDone();
                prog(undefined);
              })
              .catch((error) => {
                prog(undefined);
                console.log(error);
                onError && onError(error);
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
            }${
              clickable &&
              "hover:bg-primary-500 hover:text-slate-50 cursor-pointer"
            }
            
            `
      }
      onClick={click}
    >
      {mate?.label}
    </div>
  );
};
