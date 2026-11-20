import { createList } from "@/core/layout/createList";
import { KabinetDeployment } from "@/core/linkers";
import { useListDeploymentsQuery } from "../../api/graphql";
import DeploymentCard from "../cards/DeploymentCard";

const DeploymentList = createList({
  useHook: useListDeploymentsQuery,
  dataKey: "deployments",
  ItemComponent: DeploymentCard,
  title: "Deployments",
  smart: KabinetDeployment,
  emptyTitle: "No deployment",
  emptyDescription: "Deploying an installed release to a backend creates one.",
  minItemWidth: 272,
});

export default DeploymentList;
