import { ServiceUnavailable } from "@/app/components/fallbacks/ServiceUnavailable";
import { Guard } from "@/app/Arkitekt";
import { NotFound } from "@/app/components/fallbacks/NotFound";
import { ModuleLayout } from "@/components/layout/ModuleLayout";
import React from "react";
import { Route, Routes } from "react-router-dom";
import EntityCategoriesPage from "./pages/EntityCategoriesPage";
import EntityCategoryPage from "./pages/EntityCategoryPage";
import EntityPage from "./pages/EntityPage";
import GraphPage from "./pages/GraphPage";
import GraphQueryPage from "./pages/GraphTableQueryPage";
import GraphsPage from "./pages/GraphsPage";
import HomePage from "./pages/HomePage";
import InstancePage from "./pages/InstancePage";
import LinkPage from "./pages/LinkPage";
import MeasurementCategoriesPage from "./pages/MeasurementCategoriesPage";
import MeasurementCategoryPage from "./pages/MeasurementCategoryPage";
import MetricKindsPage from "./pages/MetricKindsPage";
import MetricKindPage from "./pages/MetricKindPage";
import MetricPage from "./pages/MetricPage";
import NaturalEventCategoriesPage from "./pages/NaturalEventCategoriesPage";
import NaturalEventCategoryPage from "./pages/NaturalEventCategoryPage";
import NodePage from "./pages/NodePage";
import ProtocolEventCategoriesPage from "./pages/ProtocolEventCategoriesPage";
import ProtocolEventCategoryPage from "./pages/ProtocolEventCategoryPage";
import ProtocolEventPage from "./pages/ProtocolEventPage";
import RelationCategoriesPage from "./pages/RelationCategoriesPage";
import RelationCategoryPage from "./pages/RelationCategoryPage";
import RelationPage from "./pages/RelationPage";
import ScatterPlotPage from "./pages/ScatterPlotPage";
import StructureKindsPage from "./pages/StructureKindsPage";
import TermPage from "./pages/TermPage";
import TermsPage from "./pages/TermsPage";
import {
  default as ExpressionPage,
  default as StructureKindPage,
} from "./pages/StructureKindPage";
import StructurePage from "./pages/StructurePage";
import StructureRelationCategoriesPage from "./pages/StructureRelationCategoriesPage";
import StuctureRelationCategoryPage from "./pages/StructureRelationCategoryPage";
import StructureRelationPage from "./pages/StructureRelationPage";
import BuilderPage from "./pages/graph/BuilderPage";
import GraphGraphQueriesPage from "./pages/graph/GraphGraphQueriesPage";
import StandardPane from "./panes/StandardPane";
import { GraphScopeLayout } from "./providers/GraphScopeProvider";

import { EntityCategorySchemaBuilderPage } from "./pages/EntityCategorySchemaBuilderPage";
interface Props { }

export const KraphModule: React.FC<Props> = () => {
  return (
    <Guard.Kraph fallback={<ServiceUnavailable serviceKey="kraph" />}>
      <ModuleLayout pane={<StandardPane />}>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="home" element={<HomePage />} />
          <Route path="expressions/:id" element={<ExpressionPage />} />
          {/*
            Claim grain: a bare uuid, no graph. Where a dropped id lands when
            nothing supplies a view — the page then offers `drawnIn`.
          */}
          <Route path="instances/:id" element={<InstancePage />} />
          <Route path="links/:id" element={<LinkPage />} />
          <Route path="relations/:id" element={<RelationPage />} />
          <Route
            path="structurerelations/:id"
            element={<StructureRelationPage />}
          />
          <Route path="metrics/:id" element={<MetricPage />} />
          <Route path="scatterplots/:id" element={<ScatterPlotPage />} />
          <Route path="structures/:id" element={<StructurePage />} />
          <Route path="graphs" element={<GraphsPage />} />
          {/*
            Nested under the graph, because these are *view-grain* reads:
            `entity(id:, graph:)` answers for one graph's drawing of a claim and
            refuses a node that view does not admit. `GraphScopeLayout` turns the
            `:graph` segment into context so the pages below never thread it.

            The claim itself lives at a flat bare-uuid route — `instances/:id`,
            `structures/:id`, `links/:id` — which is where a dropped id with no
            graph in hand lands.
          */}
          <Route path="graphs/:graph" element={<GraphScopeLayout />}>
            <Route index element={<GraphPage />} />
            <Route path="queries" element={<GraphGraphQueriesPage />} />
            <Route path="nodes/:id" element={<NodePage />} />
            <Route path="entities/:id" element={<EntityPage />} />
            <Route path="protocolevents/:id" element={<ProtocolEventPage />} />
          </Route>
          <Route path="graphqueries/:id" element={<GraphQueryPage />} />
          <Route path="graphqueries/:id/builder" element={<BuilderPage />} />
          <Route path="entitycategories" element={<EntityCategoriesPage />} />
          <Route
            path="structurerelationcategories"
            element={<StructureRelationCategoriesPage />}
          />
          <Route
            path="structurerelationcategories/:id"
            element={<StuctureRelationCategoryPage />}
          />
          <Route path="terms" element={<TermsPage />} />
          <Route
            path="structurekinds"
            element={<StructureKindsPage />}
          />
          <Route
            path="measurementcategories"
            element={<MeasurementCategoriesPage />}
          />
          <Route
            path="naturaleventcategories"
            element={<NaturalEventCategoriesPage />}
          />
          <Route
            path="relationcategories"
            element={<RelationCategoriesPage />}
          />
          <Route
            path="protocoleventcategories"
            element={<ProtocolEventCategoriesPage />}
          />
          <Route path="metrickinds" element={<MetricKindsPage />} />

          <Route path="terms/:id" element={<TermPage />} />
          <Route
            path="structurekinds/:id"
            element={<StructureKindPage />}
          />
          <Route path="metrickinds/:id" element={<MetricKindPage />} />
          <Route
            path="relationcategories/:id"
            element={<RelationCategoryPage />}
          />

          <Route path="entitycategories/:id" element={<EntityCategoryPage />} />
          <Route
            path="entitycategories/:id/schema"
            element={<EntityCategorySchemaBuilderPage />}
          />
          <Route
            path="protocoleventcategories/:id"
            element={<ProtocolEventCategoryPage />}
          />
          <Route
            path="naturaleventcategories/:id"
            element={<NaturalEventCategoryPage />}
          />
          <Route
            path="measurementcategories/:id"
            element={<MeasurementCategoryPage />}
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ModuleLayout>
    </Guard.Kraph>
  );
};

export default KraphModule;
