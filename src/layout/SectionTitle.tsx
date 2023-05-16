import React, { ReactNode, useEffect, useState } from "react";
import { BsCaretLeft, BsCaretRight } from "react-icons/bs";
import { ResponsiveContainerGrid } from "../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../floating/utils";

export const SectionTitle = (props: {
  children: React.ReactNode;
  right?: React.ReactNode;
}) => {
  return (
    <div className="font-light text-xl dark:text-white justify-between flex flex-row">
      <div className="flex-grow my-auto">{props.children}</div>
      {props.right && <div className="my-auto">{props.right}</div>}
    </div>
  );
};

export const Offsetter = ({
  offset,
  setOffset,
  step,
  array,
}: {
  offset: number;
  setOffset: React.Dispatch<React.SetStateAction<number>>;
  step: number;
  array?: any[] | undefined | null;
}) => (
  <>
    {offset != 0 && (
      <button
        type="button"
        className="p-1 text-gray-600 rounded"
        onClick={() => setOffset(offset - step)}
      >
        {" "}
        <BsCaretLeft />{" "}
      </button>
    )}
    {array && array.length == step && (
      <button
        type="button"
        className="p-1 text-gray-600 rounded"
        onClick={() => setOffset(offset + step)}
      >
        {" "}
        <BsCaretRight />{" "}
      </button>
    )}
  </>
);

export const ConditionalRender = ({
  array,
  loading,
  children,
}: {
  array?: any[] | undefined | null;
  loading?: boolean;
  children: ReactNode;
}) => {
  return <>{array && array.length > 0 && children}</>;
};

export const ListRender = <T extends any>({
  title,
  loading,
  array,
  actions,
  children,
  refetch,
  limit = 20,
}: {
  title: React.ReactNode;
  loading?: boolean;
  children: (item: T, index: number) => ReactNode;
  array: (T | null | undefined)[] | null | undefined;
  limit?: number;
  actions?: React.ReactNode;
  refetch: (values: { limit: number; offset: number }) => Promise<any>;
}) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    refetch({ limit: limit, offset: offset });
  }, [offset, limit]);

  return (
    <>
      {array && array.length > 0 && (
        <>
          <SectionTitle
            right={
              <>
                <Offsetter
                  offset={offset}
                  setOffset={setOffset}
                  array={array}
                  step={limit}
                />
                {actions}
              </>
            }
          >
            {title}
          </SectionTitle>
          <ResponsiveContainerGrid>
            {array?.filter(notEmpty).map(children)}
          </ResponsiveContainerGrid>
        </>
      )}
    </>
  );
};
