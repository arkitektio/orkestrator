import { WellKnownDiscovery } from "@jhnnsrs/fakts";
import { ToastContainer, ToastContentProps, toast } from "react-toastify";
import { DatalayerAutoConfigure } from "../bridges/DatalayerAutoConfigure";
import { FlussAutoConfigure } from "../bridges/FlussAutoConfigure";
import { LokAutoConfigure } from "../bridges/LokAutoConfigure";
import { MikroAutoConfigure } from "../bridges/MikroAutoConfigure";
import { MikroNextAutoConfigure } from "../bridges/MikroNextAutoConfigure";
import { MikroNextWard } from "../bridges/MikroNextWard";
import { MikroWard } from "../bridges/MikroWard";
import { PortAutoConfigure } from "../bridges/PortAutoConfigure";
import { RekuestAutoConfigure } from "../bridges/RekuestAutoConfigure";
import { RekuestWard } from "../bridges/RekuestWard";
import { TauriFaktsSearcher } from "../bridges/TauriFaktsSearcher";
import { GeneralMenu } from "../components/command/GeneralMenu";
import { NavigationActions } from "../components/command/NavigationActions";
import { NodesExtension } from "../components/command/NodesExtension";
import { SearchActions } from "../components/command/SearchActions";
import { SelectionActions } from "../components/command/SelectionActions";
import { ConfirmModal } from "../components/confirmer/ConfirmModal";
import { DialogDisplay } from "../components/dialog/Dialog";
import { notEmpty } from "../floating/utils";
import { FlussWard } from "../fluss/ward";
import { RekuestAssignation } from "../linker";
import { LokGuard } from "../lok/LokGuard";
import { MentionListener } from "../lok/komment/listeners/MentionListener";
import { MikroGuard } from "../mikro/MikroGuard";
import { withRekuest } from "../rekuest";
import { RekuestGuard } from "../rekuest/RekuestGuard";
import {
  AssignationStatus,
  PostmanAssignationFragment,
  useDetailNodeQuery,
} from "../rekuest/api/graphql";
import { GraphQLPostman } from "../rekuest/providers/postman/GraphQLPostman";
import { RequestResolver } from "../rekuest/providers/requester/RequestResolver";
import { ReserveResolver } from "../rekuest/providers/reserver/ReserveResolver";
import { WidgetsContainer } from "../rekuest/widgets/containers/ReturnWidgetsContainer";
import { TauriGuard } from "../tauri/guard";
import { DndPreview } from "../universal/components/DndPreview";

const Internal = (props: { assignation: PostmanAssignationFragment }) => {
  const { data } = withRekuest(useDetailNodeQuery)({
    variables: { assignation: props.assignation.id },
  });

  return data?.node?.returns &&
    props.assignation?.returns &&
    props.assignation.returns.length >= 0 ? (
    <WidgetsContainer
      ports={data.node.returns.filter(notEmpty)}
      values={props.assignation.returns}
    />
  ) : (
    <>{props.assignation.statusmessage} JSON.</>
  );
};

const Msg =
  (ass: PostmanAssignationFragment) =>
  ({}: ToastContentProps) => {
    return (
      <div>
        <Internal assignation={ass} />
      </div>
    );
  };

const CriticalMessageContainer =
  (ass: PostmanAssignationFragment) =>
  ({}: ToastContentProps) => {
    return (
      <div className="text-white">
        {ass.status} : {ass.statusmessage}
      </div>
    );
  };

  const AssignMessageContainer =
  (ass: PostmanAssignationFragment) =>
  ({}: ToastContentProps) => {
    return (
      <RekuestAssignation.DetailLink object={ass.id} className="text-white">
        Open Assignation
      </RekuestAssignation.DetailLink>
    );
  };




const DoneMessageContainer =
  (ass: PostmanAssignationFragment) =>
  ({}: ToastContentProps) => {
    return <RekuestAssignation.DetailLink object={ass.id} className="text-white">{"Done :)"}</RekuestAssignation.DetailLink>;
  };

const onAssignUpdate = (ass: PostmanAssignationFragment) => {
  console.log(ass);
  switch (ass.status) {
    case AssignationStatus.Acknowledged:
    case AssignationStatus.Bound:{
      console.log(ass);
      break;
    }
    case AssignationStatus.Bound: {
      toast(AssignMessageContainer(ass));
      break;
    }




    case AssignationStatus.Critical: {
      toast(CriticalMessageContainer(ass));
      break;
    }
    case AssignationStatus.Yield:
    case AssignationStatus.Returned: {
      toast(Msg(ass));
      break;
    }
    case AssignationStatus.Done: {
      toast(DoneMessageContainer(ass));
      break;
    }
  }
};

export const AutoConfiguration = () => {
  return (
    <>
      <RekuestAutoConfigure />
      <MikroAutoConfigure />
      <RequestResolver />
      <ReserveResolver />
      <DialogDisplay />
      <MikroNextAutoConfigure />
      <PortAutoConfigure />
      <DatalayerAutoConfigure />
      <LokAutoConfigure />
      <FlussAutoConfigure />
      <ConfirmModal />

      <FlussWard />
      <MikroNextWard />
      <ToastContainer
        position="bottom-right"
        theme="dark"
        pauseOnFocusLoss={false}
      />
      <DndPreview />
      <GeneralMenu />
      <NavigationActions />
      <LokGuard>
        <MentionListener />
      </LokGuard>
      <MikroGuard>
        <MikroWard />
        <SearchActions />
      </MikroGuard>
      <TauriGuard>
        <TauriFaktsSearcher />
      </TauriGuard>
      <WellKnownDiscovery endpoints={["http://localhost:8000"]} />
      <RekuestGuard>
        <RekuestWard />
        <NodesExtension />
        <GraphQLPostman onAssignUpdate={onAssignUpdate} />
      </RekuestGuard>
      <SelectionActions />
    </>
  );
};
