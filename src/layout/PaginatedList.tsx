import React, { ReactNode, useEffect, useState } from "react";
import { BiRefresh } from "react-icons/bi";
import { BsCaretLeft, BsCaretRight } from "react-icons/bs";
import { ResponsiveContainerGrid } from "../components/layout/ResponsiveContainerGrid";
import { notEmpty } from "../floating/utils";

export const SectionTitle = (props: {
  children: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
}) => {
  return (
    <div className="font-light text-xl dark:text-white justify-between flex flex-row py-1">
      <div className="flex-grow my-auto">{props.children}</div>
      {props.right && <div className="my-auto">{props.right}</div>}
    </div>
  );
};

export const Refetcher = (props: { onClick: () => Promise<void> }) => {
  const [refetching, setRefetching] = useState(false);

  const onClick = async () => {
    setRefetching(true);
    await props.onClick();
    setRefetching(false);
  };

  return (
    <BiRefresh
      onClick={onClick}
      className={`hover:text-gray-200 transition-all cursor-pointer ${
        refetching ? "animate-spin" : ""
      } `}
    />
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
        className="hover:text-gray-200 transition-all "
        onClick={() => setOffset(offset - step > 0 ? offset - step : 0)}
      >
        {" "}
        <BsCaretLeft />{" "}
      </button>
    )}
    {array && array.length == step && (
      <button
        type="button"
        className="hover:text-gray-200 transition-all "
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

export const PaginatedList = <T extends any>({
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
  refetch?: (values: {
    pagination: { limit: number; offset: number };
  }) => Promise<any>;
}) => {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (refetch) {
      refetch({ pagination: { limit: limit, offset: offset } });
    }
  }, [offset, limit]);

  return (
    <>
      {array && (array.length > 0 || offset > 0) && (
        <>
          <SectionTitle
            right={
              <div className="flex flex-row text-gray-700 my-auto">
                <Offsetter
                  offset={offset}
                  setOffset={setOffset}
                  array={array}
                  step={limit}
                />
                {refetch && (
                  <Refetcher
                    onClick={() =>
                      refetch({ pagination: { limit: limit, offset: offset } })
                    }
                  />
                )}
                {actions}
              </div>
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
