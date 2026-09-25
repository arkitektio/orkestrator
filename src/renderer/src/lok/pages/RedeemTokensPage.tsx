import { Explainer } from "@/core/components/explainer/Explainer";
import { PageLayout } from "@/core/components/layout/PageLayout";
import { DialogButton } from "@/core/components/ui/dialog-button";
import { LokRedeemToken } from "@/core/linkers";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { PlusIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import RedeemTokenList from "../components/lists/RedeemTokenList";
export type IRepresentationScreenProps = {};

const Page: React.FC<IRepresentationScreenProps> = () => {
  const navigate = useNavigate();

  return (
    <PageLayout
      title="Lok"
      pageActions={
        <>
          <DialogButton
            alwaysShow
            name="createredeemtoken"
            variant={"outline"}
            size={"sm"}
            dialogProps={{
              onSuccess: (data) =>
                data?.createRedeemToken &&
                navigate(LokRedeemToken.linkBuilder(data.createRedeemToken.id)),
            }}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Token
          </DialogButton>
        </>
      }
    >
      <Explainer
        title="Redeem Tokens"
        description="Redeem Tokens allow users to authorize new apps or devices to access your arkitekt account. Each token can be used to securely link a new application or device, ensuring that only trusted entities gain access. Manage your tokens carefully to maintain the security of your account."
      />
      <RedeemTokenList />

      <Separator />
    </PageLayout>
  );
};

export default Page;
