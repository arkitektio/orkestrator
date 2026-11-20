import { RekuestImplementation } from "@/core/linkers";
import { useMemo } from "react";
import { Ordering } from "../api/graphql";
import {
  CapabilityFilter,
  useCapabilityFacets,
} from "../components/filter/CapabilityFacets";
import ImplementationList from "../components/lists/ImplementationList";
import { REKUEST_HELP } from "../help";
import { buildCapabilityFilter } from "../lib/capabilities";

const Page = () => {
  const [capabilities, setCapabilities] = useCapabilityFacets();
  const filters = useMemo(() => buildCapabilityFilter(capabilities), [capabilities]);

  return (
    <RekuestImplementation.ListPage
      help={REKUEST_HELP.implementations}
      title={"Implementations"}
      pageActions={
        <CapabilityFilter
          collapse="icon"
          facets={capabilities}
          onChange={setCapabilities}
        />
      }
    >
      <div className="p-3">
        <ImplementationList
          filters={filters}
          order={{ createdAt: Ordering.Desc }}
          pagination={{ limit: 20 }}
        />
      </div>
    </RekuestImplementation.ListPage>
  );
};

export default Page;
