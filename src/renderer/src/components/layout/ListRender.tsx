import { OffsetPaginationInput } from "@/rekuest/api/graphql";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { ListOffsetter, ListTitle } from "../ui/list";
import { Refetcher } from "../ui/refetcher";
import { ContainerGrid } from "./ContainerGrid";

export type ListRenderProps<T> = {
  title?: React.ReactNode;
  error?: Error | null;
  loading?: boolean;
  fitLength?: number;
  loader?: React.ReactNode;
  children: (item: T, index: number) => ReactNode;
  additionalChildren?: ReactNode;
  array: T[] | undefined | null;
  limit?: number;
  fit?: boolean;
  actions?: React.ReactNode;
  refetch?: (values: { pagination: OffsetPaginationInput }) => Promise<any>;
  /**
   * Minimum card width in px. Set it for lists whose cards carry a picture or
   * several rows of metadata — the grid's default ladder packs up to ten
   * columns, which is right for scalars and far too narrow for those.
   */
  minItemWidth?: number;
};

export const ListRender = <T extends any>({
  title,
  loading,
  error,
  array,
  actions,
  children,
  refetch,
  fit,
  additionalChildren,
  loader,
  limit = 20,
  minItemWidth,
}: ListRenderProps<T>) => {
  const [offset, setOffset] = useState(0);

  // Pagination refetches. The parent's `useQuery` already issued the initial
  // request, so on mount we only refetch when the parent evidently did not
  // paginate (it returned more rows than one page); otherwise the mount-time
  // refetch was a duplicate of the request that just completed. Afterwards
  // only a real offset/limit change triggers a refetch — `array` identity
  // changes (cache updates) must not.
  const initialised = useRef(false);
  const lastPage = useRef({ offset, limit });
  useEffect(() => {
    if (!refetch) return;
    if (!initialised.current) {
      if (array === undefined || array === null) return; // parent still loading
      initialised.current = true;
      lastPage.current = { offset, limit };
      if (array.length > limit) {
        refetch({ pagination: { limit: limit, offset: offset } });
      }
      return;
    }
    if (lastPage.current.offset === offset && lastPage.current.limit === limit) {
      return;
    }
    lastPage.current = { offset, limit };
    refetch({ pagination: { limit: limit, offset: offset } });
  }, [offset, limit, array, refetch]);

  // FIX: Removed useMemo.
  // This ensures that if the parent re-renders (changing the 'children' prop),
  // this list updates immediately.
  const childrenComponents = array?.map(children);

  return (
    <>
      {childrenComponents && (childrenComponents.length > 0 || offset > 0) && (
        <>
          <ListTitle
            right={
              <div className="flex flex-row text-gray-700 my-auto">
                {refetch && (
                  <>
                    <ListOffsetter
                      offset={offset}
                      setOffset={setOffset}
                      array={array}
                      step={limit}
                    />
                    <Refetcher
                      refetch={() =>
                        refetch({
                          pagination: { limit: limit, offset: offset },
                        })
                      }
                    />
                  </>
                )}
                {actions}
              </div>
            }
          >
            {title}
          </ListTitle>
          <ContainerGrid
            fitLength={fit ? childrenComponents.length : undefined}
            minItemWidth={minItemWidth}
          >
            {childrenComponents}
            {additionalChildren}
            <div key="xxx" className="flex items-center justify-left group">
              <div className="px-2 py-2 group-hover:visible invisible">{actions}</div>
            </div>
          </ContainerGrid>
        </>
      )}
      {loading && loader}
      {error && <div>Error: {error.message}</div>}
    </>
  );
};
