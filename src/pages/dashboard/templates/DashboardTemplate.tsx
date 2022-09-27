import { useParams } from "react-router";
import {
  AvailableModels,
  useDetailTemplateQuery,
} from "../../../arkitekt/api/graphql";
import { withArkitekt } from "../../../arkitekt/arkitekt";
import { ShareModal } from "../../../arkitekt/components/dialogs/ShareModal";
import { Modal } from "../../../components/modals/Modal";
import { notEmpty } from "../../../floating/utils";
import { Actionbar } from "../../../layout/Actionbar";
import { PageLayout } from "../../../layout/PageLayout";
import { Provision } from "../../../linker";

export interface DashboardTemplateProps {}

export const DashboardTemplate: React.FC<DashboardTemplateProps> = (props) => {
  const { id } = useParams<{ id: string }>();
  if (!id) return <></>;
  const { data } = withArkitekt(useDetailTemplateQuery)({
    variables: { id: id },
  });

  return (
    <PageLayout>
      <div className="flex-initial h-20">{data?.template?.id}</div>
      <div className="flex-grow dark:text-white">
        Fullfills extensions: {data?.template?.extensions?.map((ext) => ext)}
        <Modal child={<button>OPEN SHARE</button>}>
          <ShareModal type={AvailableModels.FacadeTemplate} object={id} />
        </Modal>
        <div className="flex-initial">
          <div className="font-light mt-3 mb-1 text-xl"> Provided by </div>
          {data?.template?.provisions?.filter(notEmpty).map((prov) => (
            <Provision.DetailLink
              object={prov.id}
              className="bg-blue-800 rounded shadow-md text-xl text-white p-1 mr-2 my-auto"
            >
              {prov?.reservation?.waiter?.registry?.user?.email}
            </Provision.DetailLink>
          ))}
        </div>
      </div>
      <Actionbar>Hallo</Actionbar>
    </PageLayout>
  );
};
