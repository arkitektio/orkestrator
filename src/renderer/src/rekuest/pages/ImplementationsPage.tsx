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
      <div className="p-6">
        <div className="col-span-4 grid md:grid-cols-2 gap-4 md:gap-8 xl:gap-20 md:items-center mb-3">
          <div>
            <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
              Your latest Implementations
            </h1>
            <p className="mt-3 text-xl text-muted-foreground">
              All the data types you have created to use in actions.
            </p>
          </div>
        </div>

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
