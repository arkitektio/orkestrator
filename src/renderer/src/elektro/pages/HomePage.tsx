import { asParamlessRoute, HookFunction } from "@/core/layout/routes/ParamlessRoute";
import { OperationVariables } from "@apollo/client";
import { Sidebars } from "@/core/layout/Sidebars";
import { PageLayout } from "@/core/layout/PageLayout";
import { HelpSidebar } from "@/core/layout/help";
import { HomeEmpty, ModuleHome } from "@/core/layout/ModuleHome";
import { HomePageQuery, Ordering, useHomePageQuery } from "../api/graphql";
import ExperimentList from "../components/lists/ExperimentList";
import NeuronModelList from "../components/lists/NeuronModelList";
import ArrayDatasetList from "../components/lists/ArrayDatasetList";
import { ELEKTRO_HELP } from "../help";

export interface IRepresentationScreenProps {}

// The generated `useHomePageQuery` takes no variables at all (`Exact<{}>`),
// which is too narrow for `asParamlessRoute`'s generic `HookFunction` (it is
// invoked with a generic `OperationVariables` options object). The runtime
// shape is unaffected: options are always `{}` for this query.
const useHomePageQueryAsHookFunction = useHomePageQuery as unknown as HookFunction<
  HomePageQuery,
  OperationVariables
>;

/** Newest first: every elektro *Order input is a @oneOf over { createdAt | id }. */
const RECENT = [{ createdAt: Ordering.Desc }];

/**
 * Elektro's front door: its pages, then the newest datasets, neuron models
 * and experiments. Search, sort and date ranges are the list pages'.
 */
const Page = asParamlessRoute(useHomePageQueryAsHookFunction, ({ data }) => {
  const isEmpty = data?.experiments.length == 0 && data?.models.length == 0;

  return (
    <PageLayout
      title="Elektro"
      help={ELEKTRO_HELP.home}
      sidebars={
        <Sidebars>
          <Sidebars.Tab label="Help">
            <HelpSidebar />
          </Sidebars.Tab>
        </Sidebars>
      }
    >
      <ModuleHome
        moduleKey="elektro"
        title="Elektro"
        description="Electrophysiology and modelling: recordings on timelines, neuron models and simulations."
      >
        {isEmpty ? (
          <HomeEmpty title="Nothing recorded or modelled yet">
            Upload recordings under <b>Files</b>, or build a neuron model under{" "}
            <b>Neuron models</b>, to get started.
          </HomeEmpty>
        ) : (
          <>
            <ArrayDatasetList title="Recent datasets" ordering={RECENT} defaultLimit={12} />
            <NeuronModelList title="Recent neuron models" ordering={RECENT} defaultLimit={8} />
            <ExperimentList title="Recent experiments" ordering={RECENT} defaultLimit={8} />
          </>
        )}
      </ModuleHome>
    </PageLayout>
  );
});

export default Page;
