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
import { GeneralMenu } from "../components/command/GeneralMenu";
import { NavigationActions } from "../components/command/NavigationActions";
import { NodesExtension } from "../components/command/NodesExtension";
import { SearchActions } from "../components/command/SearchActions";
import { SelectionActions } from "../components/command/SelectionActions";
import { notEmpty } from "../floating/utils";
import { FlussWard } from "../fluss/ward";
import { DialogDisplay } from "../layout/dialog/Dialog";
import { MikroGuard } from "../mikro/MikroGuard";
import { MentionListener } from "../mikro/listeners/MentionListener";
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

const DoneMessageContainer =
  (ass: PostmanAssignationFragment) =>
  ({}: ToastContentProps) => {
    return <div className="text-white">{"Done :)"}</div>;
  };

const onAssignUpdate = (ass: PostmanAssignationFragment) => {
  console.log(ass);
  switch (ass.status) {
    case AssignationStatus.Acknowledged:
    case AssignationStatus.Bound:
    case AssignationStatus.Assigned: {
      console.log(ass);
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
      <MikroGuard>
        <MikroWard />
        <SearchActions />
        <MentionListener />
      </MikroGuard>
      <RekuestGuard>
        <RekuestWard />
        <NodesExtension />
        <GraphQLPostman onAssignUpdate={onAssignUpdate} />
      </RekuestGuard>
      <SelectionActions />
    </>
  );
};
