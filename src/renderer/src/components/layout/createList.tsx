import React, { useEffect, useMemo, useState } from "react";
import type { WatchQueryFetchPolicy } from "@apollo/client";
import * as ListLayout from "@/components/ui/list-layout";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { FileQuestion, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OffsetPaginationInput } from "@/lok-next/api/graphql";
import { Smart } from "@/providers/smart/builder";
import { BsCaretLeft, BsCaretRight } from "react-icons/bs";
import { Refetcher } from "../ui/refetcher";
import { GroupableListRenderer, GroupByDef } from "./GroupableListRenderer";

// --- Types ---

interface StandardVariables<TFilters, TOrder, TOrdering> {
  filters?: TFilters;
  order?: TOrder;
  ordering?: TOrdering;
  pagination: OffsetPaginationInput;
}

interface HookResult<TData> {
  data?: TData;
  loading: boolean;
  error?: any;
  refetch: (variables?: any) => Promise<any>;
}

type ItemComponentType<TItem> = React.ComponentType<{ item: TItem } & any>;

// The props available when you USE the component (<BlockList ... />)
export interface GeneratedListProps<TFilters, TOrder, TOrdering> {
  filters?: TFilters;
  order?: TOrder;
  ordering?: TOrdering;
  // All display props are now optional because they might be defined in the factory
  title?: React.ReactNode;
  actions?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  defaultLimit?: number;
  cardProps?: Record<string, any>;
  // When set, items are rendered as titled sections instead of a flat grid.
  // Typed as `any` at this boundary because `TItem` is not reliably inferred by
  // the factory; the group-by definitions are strongly typed at their def site.
  groupBy?: GroupByDef<any>;
  // When set, the grid gives way to justified rows sized by this ratio — see
  // `GroupableListRenderer`. A per-page prop rather than a factory option: the
  // same list reads as a picture shelf on a page of planes and as a grid of
  // readouts everywhere else. Same `any` caveat as `groupBy`.
  aspectOf?: (item: any) => number;
}



export const Offseter = ({
  offset,
  setOffset,
  refetch,
  step,
  array,
}: {
  offset: number;
  setOffset: (value: number) => void;
  step: number;
  array?: any[] | undefined | null;
  refetch: () => Promise<any>;
}) => (
  <div className="flex flex-row items-center gap-1 text-gray-600">
    {offset != 0 && (
      <Button
        size={"sm"}
        variant={"ghost"}
        type="button"
        className="hover:text-gray-200 transition-all"
        onClick={() => setOffset(offset - step > 0 ? offset - step : 0)}
      >
        {" "}
        <BsCaretLeft />{" "}
      </Button>
    )}
    {array && array.length == step && (
      <Button
        size={"sm"}
        variant={"ghost"}
        className="hover:text-gray-200 transition-all "
        onClick={() => setOffset(offset + step)}
      >
        {" "}
        <BsCaretRight />{" "}
      </Button>
    )}
    <Refetcher refetch={() => refetch()} />
  </div>
);

// The Configuration Object passed to createList({...})
interface CreateListOptions<TData, TFilters, TOrder, TOrdering, TItem> {
  // Logic (Required)
  useHook: (options: {
    variables: StandardVariables<TFilters, TOrder, TOrdering>;
    fetchPolicy?: any;
  }) => HookResult<TData>;
  dataKey: keyof TData;
  ItemComponent: ItemComponentType<TItem>;

  // Defaults (Optional)
  autoHide?: boolean;
  title?: React.ReactNode;
  actions?: React.ReactNode; // Default actions (e.g. always show "New")
  emptyTitle?: string;
  emptyDescription?: string;
  defaultLimit?: number;
  smart?: Smart;
  cardProps?: Record<string, any>;
  /**
   * Minimum card width in px. Set it for lists whose cards carry a picture or
   * several rows of metadata — the grid's default ladder packs up to ten
   * columns, which is right for scalars and far too narrow for those.
   */
  minItemWidth?: number;
  /**
   * Apollo fetch policy for the list query. Defaults to `cache-and-network`
   * (always revalidates on mount); pass `cache-first` for lists that are
   * kept fresh by subscriptions or updaters.
   */
  fetchPolicy?: WatchQueryFetchPolicy;
}

export const createList = <
  TData,
  TFilters,
  TOrder,
  TOrdering,
  TItem extends { id?: string | number }
>(
  options: CreateListOptions<TData, TFilters, TOrder, TOrdering, TItem>
) => {
  // Destructure options for easier access
  const {
    useHook,
    dataKey,
    ItemComponent,
    // Extract defaults to merge later
    smart,
    autoHide = true,
    title: defaultTitle,
    actions: defaultActions,
    emptyTitle: defaultEmptyTitle = "No items found",
    emptyDescription: defaultEmptyDesc = "No results match your criteria.",
    defaultLimit: initialLimit = 20,
    cardProps: defaultCardProps = {},
    minItemWidth,
    fetchPolicy = "cache-and-network",
  } = options;

  const GenericList = (props: GeneratedListProps<TFilters, TOrder, TOrdering>) => {
    // MERGE: Props passed at runtime override defaults passed at creation
    const title = props.title ?? defaultTitle;
    const actions = props.actions ?? defaultActions;
    const emptyTitle = props.emptyTitle ?? defaultEmptyTitle;
    const emptyDescription = props.emptyDescription ?? defaultEmptyDesc;
    const defaultLimit = props.defaultLimit ?? initialLimit;
    // Stable per `props.cardProps` identity so memoized item cards can bail
    // out; callers should hoist literal `cardProps` objects.
    const cardProps = useMemo(
      () => ({ ...defaultCardProps, ...props.cardProps }),
      [props.cardProps],
    );

    // --- Logic ---

    const [pagination, setPagination] = useState<OffsetPaginationInput>({
      limit: defaultLimit,
      offset: 0,
    });

    // Serialize the query inputs once per identity change rather than three
    // times on every render.
    const queryKey = useMemo(
      () =>
        JSON.stringify(props.filters) +
        "|" +
        JSON.stringify(props.order) +
        "|" +
        JSON.stringify(props.ordering),
      [props.filters, props.order, props.ordering],
    );

    useEffect(() => {
      setPagination((prev) => ({ ...prev, offset: 0 }));
    }, [queryKey]);

    const { data, loading, error, refetch, } = useHook({
      variables: {
        filters: props.filters as TFilters,
        order: props.order as TOrder,
        ordering: props.ordering as TOrdering,
        pagination: pagination,
      },
      fetchPolicy,
    });

    const listData = (data ? data[dataKey] : []) as unknown as TItem[];
    const hasItems = listData && listData.length > 0;

    const headerActions = (
      <div className="flex items-center gap-2">

        {actions}
        {smart ? (
          <smart.NewButton><Button size={"icon"} variant={"ghost"} className="text-gray-600"><Plus className="h-4 w-4 mr-1" /></Button></smart.NewButton>
        ) : null}
        <Offseter
          offset={pagination.offset || 0}
          step={pagination.limit || 20}
          setOffset={(newOffset) =>
            setPagination((prev) => ({ ...prev, offset: newOffset }))
          }
          array={listData}
          refetch={refetch}
        />
      </div>
    );

    if (error) {
      return (
        <ListLayout.Root>
          <div className="p-4 text-red-500 border border-red-200 rounded bg-red-50">
            <div className="font-bold">Error loading data</div>
            <div className="text-sm">{error.message}</div>
          </div>
        </ListLayout.Root>
      );
    }

    if (autoHide && !hasItems && !loading) {
      return (
        <></>
      );
    }

    return (
      <ListLayout.Root>
        {(title || headerActions) && (
          <ListLayout.Header actions={headerActions}>
            {smart ? (
              <smart.ListLink className="flex-0 ">{title}</smart.ListLink>
            ) : (
              title
            )}


          </ListLayout.Header>
        )}

        {loading && !hasItems ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground animate-pulse">
            Loading...
          </div>
        ) : !hasItems ? (
          <Empty>
            <EmptyHeader>
              <div className="flex justify-center">
                <EmptyMedia>
                  <FileQuestion className="h-10 w-10 text-muted-foreground" />
                </EmptyMedia>
              </div>
              <EmptyTitle>{emptyTitle}</EmptyTitle>
              <EmptyDescription>{emptyDescription}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={() => refetch()}>
                Check Again
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <GroupableListRenderer<TItem>
            items={listData}
            groupBy={props.groupBy}
            ItemComponent={ItemComponent}
            cardProps={cardProps}
            minItemWidth={minItemWidth}
            aspectOf={props.aspectOf}
          />
        )}

      </ListLayout.Root>
    );
  };

  GenericList.displayName = `GeneratedList(${String(dataKey)})`;

  return GenericList;
};
