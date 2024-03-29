import { Transition } from "@headlessui/react";
import { Placement } from "@popperjs/core";
import React, { Fragment, useEffect, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { getEmptyImage } from "react-dnd-html5-backend";
import { usePopper } from "react-popper";
import { SMART_MODEL_DROP_TYPE } from "../../constants";
import { composeMates } from "../../mates/compose";
import { usePostmanMate } from "../../mates/postman/usePostmanMates";
import { Drop, MateFinder, MateOptions } from "../../mates/types";
import { Identifier } from "../api/scalars";
import { Mates } from "./Mates";
import { useModelSelect } from "./context";

export type ClassNameOptions = {
  isOver: boolean;
  canDrop: boolean;
  isDragging: boolean;
  isSelecting: boolean;
  isSelected: boolean;
  progress: number | undefined;
};

export type DropObject = {
  identifier: Identifier;
  object: any;
};

export interface SmartModelProps {
  identifier: Identifier;
  object: string;
  as?: HTMLElement;
  children: React.ReactNode;
  placement?: Placement;
  options?: MateOptions;
  showSelectingIndex?: boolean;
  containerClassName?: string;
  dragClassName?: (props: ClassNameOptions) => string;
  dropClassName?: (props: ClassNameOptions) => string;
  dragStyle?: (props: ClassNameOptions) => React.CSSProperties;
  dropStyle?: (props: ClassNameOptions) => React.CSSProperties;
  hover?: boolean;
  showSelfMates?: boolean;
  className?: string;
  mates?: MateFinder[];
}

export const SmartModel = ({
  showSelfMates = true,
  placement = "bottom",
  showSelectingIndex = true,
  mates,
  options,
  hover = false,
  ...props
}: SmartModelProps) => {
  const self = {
    identifier: props.identifier,
    id: props.object,
  };

  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(
    null
  );
  const [referenceElement, setReferenceElement] =
    useState<HTMLDivElement | null>(null);

  const [progress, setProgress] = useState<number | undefined>(undefined);
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);

  const on_progress = async (x: number | undefined) => {
    setProgress(x);
  };

  const postmanMate = usePostmanMate();

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: placement || "bottom",
    modifiers: [{ name: "arrow", options: { element: ".arrow" } }],
  });

  useEffect(() => {
    if (show) {
      const listener = {
        handleEvent: (e: Event) => {
          e.stopPropagation();
          setShow(false);
        },
      };
      document.addEventListener("click", listener);

      return () => {
        document.removeEventListener("click", listener);
      };
    }
  }, [show]);




  const [{ isOver, canDrop, overItems }, drop] = useDrop(() => {
    return {
      accept: [SMART_MODEL_DROP_TYPE],
      drop: (item, monitor) => {
        if (!monitor.didDrop()) {
          console.log("Ommitting Parent Drop");
        }
        return {};
      },
      collect: (monitor) => {
        let item = monitor.getItem() as Drop[] | null;
        return {
          isOver: !!monitor.isOver(),
          overItems: item,
          canDrop: !!monitor.canDrop(),
        };
      },
    };
  });

  const {
    isFocused,
    bind,
    isSelecting,
    isSelected,
    bisSelected,
    bisFocused,
    bselection,
    selectionIndex,
    bselectionIndex,
    selection,
  } = useModelSelect({ identifier: props.identifier, id: props.object });

  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: SMART_MODEL_DROP_TYPE,
      item: !isSelecting ? [self] : selection,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [isSelecting, selection]
  );

  useEffect(() => {
    preview(getEmptyImage(), {
      captureDraggingState: true,
    });
  }, []);

  const dragClassNameFunc =
    props.dragClassName || (({ isOver, canDrop }) => "");

  const dropClassNameFunc =
    props.dropClassName ||
    (({ isOver, canDrop, progress }) =>
      `${props.className} ${
        hover &&
        "hover:scale-110 transition-all ease-in-out duration-200 group hover:shadow-xl hover:shadow border-2 border-hidden"
      } ${isOver && "border-solid "} ${progress && "animate-pulse"}`);

  return (
    <div
      ref={drop}
      data-disableselect
      data-identifier={props.identifier}
      data-object={props.object}
      {...bind}
      className={dropClassNameFunc({
        isDragging,
        isOver,
        isSelecting,
        isSelected,
        canDrop,
        progress,
      })}
      style={
        props.dropStyle &&
        props.dropStyle({
          isDragging,
          isOver,
          isSelecting,
          isSelected,
          canDrop,
          progress,
        })
      }
      onFocus={() => {
        setShow(true);
      }}
      onBlur={() => {
        setShow(false);
      }}
      onDoubleClick={() => {
        setShow(!show);
      }}
      onContextMenu={(e) => {
        setShow(!show);
        e.preventDefault();
      }}
    >
      <div
        ref={setReferenceElement}
        className={
          "relative " +
          (props.containerClassName ? props.containerClassName : "")
        }
      >
        {isOver && overItems && (
          <>
            {isDragging && !showSelfMates ? (
              <></>
            ) : (
              <div
                ref={setPopperElement}
                style={{
                  ...styles.popper,
                  zIndex: 9000,
                  width:
                    placement == "bottom"
                      ? referenceElement?.getBoundingClientRect().width &&
                        referenceElement?.getBoundingClientRect().width * 0.8
                      : undefined,
                }}
                {...attributes.popper}
              >
                <div
                  className={
                    "bg-back-900 border border-1 border-solid border-back-800 max-w-100 mt-[-1em] flex flex-col rounded-md shadow p-3 @container"
                  }
                  style={{ zIndex: 10 }}
                >
                  <Mates
                    progress={on_progress}
                    self={self}
                    overItems={overItems}
                    withSelf={isDragging}
                    mateFinder={mates && composeMates([...mates, postmanMate])}
                  />
                </div>
              </div>
            )}
          </>
        )}
        {((isFocused && !isOver) || show ) && (
          <div
            ref={setPopperElement}
            style={{
              ...styles.popper,
              zIndex: 9000,
              width:
                placement == "bottom"
                  ? referenceElement?.getBoundingClientRect().width &&
                    referenceElement?.getBoundingClientRect().width * 0.8
                  : undefined,
            }}
            {...attributes.popper}
          >
            <div
              className={
                "bg-back-900 border border-1 border-solid border-back-800 max-w-100 mt-[-1em] flex flex-col rounded-md shadow p-3 @container"
              }
              style={{ zIndex: 10 }}
            >
              <Mates
                self={self}
                withSelf={true}
                overItems={[self]}
                progress={on_progress}
                onDone={async () => setShow(false)}
                onError={async () => setShow(false)}
                mateFinder={mates && composeMates([...mates, postmanMate])}
              />
            </div>
          </div>
        )}
        <div
          ref={drag}
          data-draggable
          className={dragClassNameFunc({
            isDragging,
            isOver,
            isSelecting,
            isSelected,
            canDrop,
            progress,
          })}
          style={
            props.dragStyle &&
            props.dragStyle({
              isDragging,
              isOver,
              isSelecting,
              isSelected,
              canDrop,
              progress,
            })
          }
          draggable={true}
          onDragStart={(e) => {
            e.dataTransfer.setData("text", JSON.stringify(self));
          }}
        >
          {props.children}
        </div>
        <Transition
          as={Fragment}
          show={isSelecting && showSelectingIndex}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className={`text-sm text-black absolute right-0 bottom-0 translate-x-2 translate-y-2 px-2 ${
              bselectionIndex == undefined ? "bg-primary-300" : "bg-primary-100"
            } rounded-full`}
            data-draggable
          >
            {selectionIndex}
            {bselectionIndex}
          </div>
        </Transition>
      </div>
    </div>
  );
};
