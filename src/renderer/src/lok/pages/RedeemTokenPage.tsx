import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { LokRedeemToken } from "@/core/linkers";
import { useGetRedeemTokenQuery } from "../api/graphql";

export const RedeemTokenPage = asDetailQueryRoute(useGetRedeemTokenQuery, ({ data }) => {
  return (
    <LokRedeemToken.ModelPage
      object={data.redeemToken}
      actions={<LokRedeemToken.Actions object={data?.redeemToken} />}
      title="Redeem Token"
      sidebars={<LokRedeemToken.Knowledge object={data?.redeemToken} />}
    >
      <div className="grid grid-cols-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center p-6">
          <div>
            <div className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              {data.redeemToken.token}
            </div>
          </div>
        </div>
        <div className="col-span-2"></div>
      </div>
    </LokRedeemToken.ModelPage>
  );
});


export default RedeemTokenPage;
