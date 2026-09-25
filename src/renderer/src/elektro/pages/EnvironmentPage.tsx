import { asDetailQueryRoute } from "@/core/layout/routes/DetailQueryRoute";
import { Badge } from "@/core/components/ui/badge";
import { ElektroEnvironment, ElektroMechanism } from "@/core/linkers";
import { useDetailModEnvironmentQuery } from "../api/graphql";

export type IRepresentationScreenProps = {};

export const EnvironmentPage = asDetailQueryRoute(
  useDetailModEnvironmentQuery,
  ({ data }) => {
    const env = data.modEnvironment;
    const mechanisms = env.mechanisms ?? [];
    const parameterCount = mechanisms.reduce(
      (acc, mech) => acc + mech.parameters.length,
      0,
    );

    return (
      <ElektroEnvironment.ModelPage
        variant="black"
        title={env?.name}
        object={env}
      >
        <div className="h-full w-full grid grid-cols-12 gap-4 pointer-events-none p-4">
          <div className="col-span-4 @container bg-black bg-clip-padding backdrop-filter backdrop-blur-2xl bg-opacity-10 z-100 rounded-lg overflow-hidden flex flex-col pointer-events-auto">
            <div className="p-6 border-b border-white/10">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Model Environment
              </p>
              <h1 className="mt-1 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                {env.name}
              </h1>
              {env.description && (
                <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                  {env.description}
                </p>
              )}
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">
                  {mechanisms.length}{" "}
                  {mechanisms.length === 1 ? "mechanism" : "mechanisms"}
                </Badge>
                <Badge variant="outline">
                  {parameterCount}{" "}
                  {parameterCount === 1 ? "parameter" : "parameters"}
                </Badge>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {mechanisms.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  This environment exposes no mechanisms.
                </p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {mechanisms.map((mech) => (
                    <li key={mech.id} className="p-6 hover:bg-white/5 transition-colors">
                      <ElektroMechanism.DetailLink
                        object={mech}
                        className="text-lg font-semibold tracking-tight hover:underline"
                      >
                        {mech.name}
                      </ElektroMechanism.DetailLink>
                      {mech.description && (
                        <p className="mt-1 text-sm text-muted-foreground leading-snug">
                          {mech.description}
                        </p>
                      )}
                      {mech.parameters.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {mech.parameters.map((param) => (
                            <Badge
                              key={param.key}
                              variant="outline"
                              title={
                                param.description ??
                                `${param.label ?? param.key} (${param.kind})`
                              }
                            >
                              <span className="font-medium">
                                {param.label ?? param.key}
                              </span>
                              <span className="text-muted-foreground">
                                {param.kind.toLowerCase()}
                              </span>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </ElektroEnvironment.ModelPage>
    );
  },
);

export default EnvironmentPage;
