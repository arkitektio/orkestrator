import { AiOutlineCheck, AiOutlineExclamation } from "react-icons/ai";
import { useParams } from "react-router";
import { SelfActions } from "../../../components/SelfActions";
import { ResponsiveGrid } from "../../../components/layout/ResponsiveGrid";
import { notEmpty } from "../../../floating/utils";
import { FlussTemplate } from "../../../fluss/components/FlussTemplate";
import { ActionButton } from "../../../layout/ActionButton";
import { PageLayout } from "../../../layout/PageLayout";
import { useDialog } from "../../../layout/dialog/DialogProvider";
import { RekuestNode, RekuestTestCase } from "../../../linker";
import { withRekuest } from "../../../rekuest";
import { useDetailTemplateQuery } from "../../../rekuest/api/graphql";
import { ProvisionCard } from "../../../rekuest/components/cards/ProvisionCard";
import { ProvideDialog } from "../../../rekuest/components/dialogs/ProvideDialog";

export interface DashboardTemplateProps {}

export const DashboardTemplate: React.FC<DashboardTemplateProps> = (props) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;
  const { data } = withRekuest(useDetailTemplateQuery)({
    variables: { id: id },
  });

  const { ask } = useDialog();

  return (
    <PageLayout
      actions={
        <>
          <ActionButton
            label="Provide"
            onAction={async () => {
              if (data?.template) {
                let x = await ask(ProvideDialog, {
                  template: data.template,
                });
                console.log(x);
              }
            }}
            description="Provide this Template"
          />
          {data?.template?.id && (
            <SelfActions
              object={data?.template?.id}
              type={"@rekuest/template"}
            />
          )}
        </>
      }
    >
      <div className="flex h-full flex-col">
        <div className="flex-initial text-white">
          <div className="flex flex-row">
            <div className="flex-initial">
              <div className="flex flex-col">
                <div className="font-light text-2xl">
                  {data?.template?.interface}
                </div>
                {data?.template?.node && (
                  <div className="flex-initial text-md text-white mt-auto">
                    implements{" "}
                    <RekuestNode.DetailLink
                      object={data?.template?.node.id}
                      className="text-xl"
                    >
                      {data?.template?.node.name}
                    </RekuestNode.DetailLink>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-grow"></div>
            <div className="flex-none">
              <div className="flex flex-row gap-2">
                {data?.template?.extensions?.map((i) => (
                  <div className="border-primary-300 p-1 border rounded-md bg-primary-300 text-white">
                    {" "}
                    {i}{" "}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {data?.template?.testresults &&
          data?.template.testresults.length > 0 && (
            <div className="flex-initial flex">
              <div className="bg-gray-800 p-2 text-white rounded rounded-md border-gray-700 border">
                <div className="font-light mb-1 text-md"> Tests </div>
                {data?.template?.testresults
                  ?.filter(notEmpty)
                  .map((test, index) => (
                    <div className="flex flex-row text-white">
                      <RekuestTestCase.DetailLink object={test.case.id}>
                        {test.case.name}
                      </RekuestTestCase.DetailLink>
                      <div className="flex flex-row ml-1">
                        {test.passed ? (
                          <AiOutlineCheck className="text-green-600 my-auto" />
                        ) : (
                          <AiOutlineExclamation className="text-red-600 my-auto" />
                        )}
                        <div className="text-red-600">{test.result}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        <div className="flex-grow">
          {data?.template?.extensions?.includes("flow") &&
            data?.template?.params?.flow && (
              <FlussTemplate flow={data?.template.params.flow} />
            )}
        </div>

        <div className="flex-initial text-white">
          <div className="font-light mt-3 mb-1 text-xl"> Provided on </div>
          <ResponsiveGrid>
            {data?.template?.provisions?.filter(notEmpty).map((prov, index) => (
              <ProvisionCard provision={prov} key={index} />
            ))}
          </ResponsiveGrid>
        </div>
      </div>
    </PageLayout>
  );
};
