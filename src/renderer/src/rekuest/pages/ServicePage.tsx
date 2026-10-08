import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { RekuestService, RekuestStructure } from "@/core/linkers";
import { CollapsibleSearch } from "@/core/ui/collapsible-search";
import { PageAction } from "@/core/ui/page-action";
import { parseAsString, useQueryState } from "@/core/util/hooks/use-search-param-state";
import { useServiceQuery } from "@/rekuest/api/graphql";
import { describeService, matchesWords } from "@/rekuest/lib/service";
import { KIND_LABELS } from "@/rekuest/lib/triggerConditions";
import { Radio } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DeclarationRow } from "../components/automation/DeclarationRow";
import { REKUEST_HELP } from "../help";

/**
 * One service of the hub and what it declares: the signals it sends (with
 * the triggers waiting for each) and the structures it hosts, each with the
 * descriptors its objects carry: what a trigger's conditions can test.
 */
export const ServicePage = asDetailQueryRoute(useServiceQuery, ({ data }) => {
  const service = data.service;
  const navigate = useNavigate();
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));

  const signals = useMemo(
    () =>
      service.signals.filter((declaration) =>
        matchesWords(search, [
          declaration.identifier,
          KIND_LABELS[declaration.kind],
          declaration.description,
          ...declaration.descriptorKeys,
        ]),
      ),
    [service.signals, search],
  );
  const structures = useMemo(
    () =>
      service.structures.filter((structure) =>
        matchesWords(search, [
          structure.identifier,
          structure.label,
          structure.description,
          ...structure.descriptors.map((descriptor) => descriptor.key),
        ]),
      ),
    [service.structures, search],
  );
  const declares = describeService({
    signals: service.signals.length,
    structures: service.structures.length,
  });

  return (
    <RekuestService.ModelPage
      title={service.name}
      help={REKUEST_HELP.service}
      object={service}
      pageActions={
        <>
          <CollapsibleSearch
            alwaysShow
            value={search}
            onChange={(value) => setSearch(value || null)}
            placeholder="Search what it declares…"
          />
          <PageAction
            icon={<Radio className="h-4 w-4" />}
            onClick={() => navigate(`/rekuest/signals?service=${encodeURIComponent(service.name)}`)}
            collapse="icon"
          >
            What it sent
          </PageAction>
        </>
      }
    >
      <div className="max-w-3xl space-y-8 p-6">
        <header>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{service.name}</h1>
            {service.identifier && (
              <span className="font-mono text-xs text-muted-foreground">{service.identifier}</span>
            )}
            {declares && <span className="text-sm text-muted-foreground">{declares}</span>}
          </div>
          {service.description && (
            <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
          )}
        </header>

        {signals.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-medium">Signals</h2>
            <ul className="-mx-1.5 flex flex-col">
              {signals.map((declaration) => (
                <DeclarationRow key={declaration.id} declaration={declaration} />
              ))}
            </ul>
          </section>
        )}

        {structures.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-medium">Structures</h2>
            <div className="flex flex-col divide-y divide-border/40">
              {structures.map((structure) => (
                <div key={structure.id} className="py-3 first:pt-0">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                    <RekuestStructure.DetailLink
                      object={structure}
                      className="text-sm font-medium hover:underline"
                    >
                      {structure.label || structure.identifier}
                    </RekuestStructure.DetailLink>
                    {structure.label && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {structure.identifier}
                      </span>
                    )}
                  </div>
                  {structure.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{structure.description}</p>
                  )}
                  {structure.descriptors.length > 0 && (
                    <dl className="mt-2 grid grid-cols-[max-content_max-content_minmax(0,1fr)] gap-x-5 gap-y-1 text-xs">
                      {structure.descriptors.map((descriptor) => (
                        <div key={descriptor.id} className="contents">
                          <dt className="font-mono leading-5">{descriptor.key}</dt>
                          <dd className="leading-5 text-muted-foreground/70">
                            {descriptor.type.toLowerCase()}
                          </dd>
                          <dd className="min-w-0 leading-5 text-muted-foreground">
                            {descriptor.description}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {signals.length === 0 && structures.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {search
              ? `Nothing it declares matches “${search}”.`
              : "It declares no signals and hosts no structures."}
          </p>
        )}
      </div>
    </RekuestService.ModelPage>
  );
});

export default ServicePage;
