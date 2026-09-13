import { ListRender } from "@/components/layout/ListRender";
import { LokRedeemToken } from "@/linkers";

import {
  OffsetPaginationInput,
  RedeemTokenFilter,
  useRedeemTokensQuery,
} from "@/lok-next/api/graphql";
import RedeemTokenCard from "../cards/RedeemTokenCard";

export type Props = {
  filters?: RedeemTokenFilter;
  pagination?: OffsetPaginationInput;
};

const List = ({ filters, pagination }: Props) => {
  const { data, refetch } = useRedeemTokensQuery({
    variables: { filters, pagination },
  });

  return (
    <ListRender
      array={data?.redeemTokens}
      title={
        <LokRedeemToken.ListLink className="flex-0">
          Token
        </LokRedeemToken.ListLink>
      }
      refetch={refetch}
    >
      {(ex) => <RedeemTokenCard key={ex.id} item={ex} />}
    </ListRender>
  );
};

export default List;
