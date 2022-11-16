import { Transition } from "@headlessui/react";
import { Placement } from "@popperjs/core";
import React, { Fragment, useEffect, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { getEmptyImage, NativeTypes } from "react-dnd-html5-backend";
import { usePopper } from "react-popper";
import {
  Accept,
  AdditionalMate,
  Identifier,
  MateOptions,
} from "../postman/mater/mater-context";
import { useModelSelect } from "./context";
import { SelfMates } from "./SelfMates";
import { ShowMates } from "./ShowMates";

export type ClassNameOptions = {
  isOver: boolean;
  canDrop: boolean;
  type: string | symbol | null;
  isDragging: boolean;
  isSelecting: boolean;
  isSelected: boolean;
};

export type DropObject = {
  identifier: Identifier;
  object: any;
};

export type SmartItem = {
  type: Accept;
  objects: DropObject[];
};

export interface SmartModelProps<T extends Accept> {
  identifier: Identifier;
  object: string;
  as?: HTMLElement;
  children: React.ReactNode;
  placement?: Placement;
  options?: MateOptions;
  accepts: T[];
  showSelectingIndex?: boolean;
  containerClassName?: string;
  dragClassName?: (props: ClassNameOptions) => string;
  dropClassName?: (props: ClassNameOptions) => string;
  dragStyle?: (props: ClassNameOptions) => React.CSSProperties;
  dropStyle?: (props: ClassNameOptions) => React.CSSProperties;
  showSelfMates?: boolean;
  className?: string;
  additionalMates?:
    | ((type: T, isSelf: boolean) => AdditionalMate[] | undefined)
    | AdditionalMate[];
}

export const SmartModel = <T extends Accept>({
  showSelfMates = true,
  placement = "bottom",
  showSelectingIndex = true,
  additionalMates,
  options,
  ...props
}: SmartModelProps<T>) => {
  const self = {
    identifier: props.identifier,
    object: props.object,
  };

  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(
    null
  );
  const [referenceElement, setReferenceElement] =
    useState<HTMLDivElement | null>(null);

  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: placement || "bottom",
    modifiers: [{ name: "arrow", options: { element: ".arrow" } }],
  });

  const [{ isOver, canDrop, type }, drop] = useDrop(() => {
    return {
      accept: (props.accepts as string[]).concat([
        NativeTypes.TEXT,
        NativeTypes.HTML,
      ]),
      drop: (item, monitor) => {
        if (!monitor.didDrop()) {
          console.log("Ommitting Parent Drop");
        }
        return {};
      },
      collect: (monitor) => {
        let type = monitor.getItemType() as Accept | null;
        let settype = type;
        return {
          isOver: !!monitor.isOver(),
          type: settype,
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
    selectionIndex,
    selection,
  } = useModelSelect({ identifier: props.identifier, object: props.object });

  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: !isSelecting
        ? "item:" + props.identifier
        : "list:" + props.identifier,
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
    (({ isOver, canDrop }) =>
      `${props.className} ${isOver && "border-primary-200 border"}`);

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
        type,
      })}
      style={
        props.dropStyle &&
        props.dropStyle({
          isDragging,
          isOver,
          isSelecting,
          isSelected,
          canDrop,
          type,
        })
      }
    >
      <div
        ref={setReferenceElement}
        className={
          "relative " +
          (props.containerClassName ? props.containerClassName : "")
        }
      >
        {isOver && type && (
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
                    "bg-slate-800 w-100 mt-[-1em] flex flex-col rounded-md shadow p-3"
                  }
                  style={{ zIndex: 10 }}
                >
                  {!isDragging ? (
                    <ShowMates
                      type={type as T}
                      self={self}
                      options={options}
                      additionalMates={additionalMates}
                    />
                  ) : (
                    <SelfMates
                      type={type as T}
                      self={self}
                      options={options}
                      additionalMates={additionalMates}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {isFocused && !isOver && (
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
                "bg-slate-800 w-100 mt-[-1em] flex flex-col rounded-md shadow p-3"
              }
              style={{ zIndex: 10 }}
            >
              <SelfMates
                type={("item:" + props.identifier) as T}
                self={self}
                options={options}
                additionalMates={additionalMates}
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
            type,
          })}
          style={
            props.dragStyle &&
            props.dragStyle({
              isDragging,
              isOver,
              isSelecting,
              isSelected,
              canDrop,
              type,
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
            className="text-sm text-black absolute right-0 bottom-0 translate-x-2 translate-y-2 px-2 bg-primary-300 rounded-full"
            data-draggable
          >
            {selectionIndex}
          </div>
        </Transition>
      </div>
    </div>
  );
};
