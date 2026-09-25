import { asDetailQueryRoute } from "@/app/routes/DetailQueryRoute";
import { Sidebars } from "@/components/layout/Sidebars";
import { buildAssignInput } from "@/rekuest/assign";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageAction } from "@/components/ui/page-action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ArgsContainer } from "@/components/ports/ArgsContainer";
import { DependenciesContainer } from "@/rekuest/ports/DependenciesContainer";
import { ApolloError } from "@apollo/client";
import {
  RekuestAction,
  RekuestAgent,
  RekuestImplementation,
  RekuestResolution,
  RekuestState,
} from "@/linkers";
import { PageSections } from "@/components/layout/PageSections";
import {
  TaskEventKind,
  DetailImplementationFragment,
  ResolvedDependencyInput,
  WatchImplementationDocument,
  WatchImplementationSubscription,
  WatchImplementationSubscriptionVariables,
  useImplementationQuery
} from "@/rekuest/api/graphql";
import { ArrowRight, SlidersHorizontal } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { toast } from "sonner";
import TaskList from "../components/lists/TaskList";
import { useImplementationAction } from "../hooks/useImplementationAction";
import { useImplementationForm } from "../hooks/useImplementationForm";
import { ImplementationStatsSidebar } from "../sidebars/ImplementationStatistics";
import { ReturnsContainer } from "@/lib/ports/tailwind";
import PortConstraintBadges from "@/components/ports/PortConstraintBadges";
import { portToLabel } from "@/lib/ports/utils";
import { useWidgetRegistry } from "@/lib/ports/WidgetsContext";


export const DoForm = ({ id }: { id: string }) => {
  const { assign, latestTask, implementation } = useImplementationAction({
    id: id,
  });

   const form = useImplementationForm({
     implementation: implementation,
     overwrites: { ...latestTask?.args },
     reValidateMode: "onChange",
   });

   const onSubmit = async (data: {
     args: Record<string, unknown>;
     dependencies: Record<string, ResolvedDependencyInput>;
   }) => {
     console.log("Submitting");
     try {
       await assign(buildAssignInput({
         implementation: id,
         args: data.args,
         dependencies: Object.values(data.dependencies),
         hooks: [],
       }));

     } catch (e) {
       const message = (e as ApolloError).message;
         if (!message) {
           toast.error("No key found");
           return;
         }
         toast.error(message);
     }
   };


  const { registry } = useWidgetRegistry();



  const yieldEvent = latestTask?.events?.find(
    (x) => x.kind == TaskEventKind.Yield,
  );

  const errorEvent = latestTask?.events?.find(
    (x) => x.kind == TaskEventKind.Critical,
  );

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="rounded flex gap-2xl max-w-[80%] mt-2 gap-2">
            <Card className="flex-1 p-2">
              <CardHeader>
                <CardTitle className="font-light">Arguments</CardTitle>
              </CardHeader>

              <CardContent>
                <div className="w-full">
                  <ArgsContainer
                    registry={registry}
                    ports={implementation?.action?.args || []}
                    path={[]}
                  />
                   {implementation?.dependencies && (
            <DependenciesContainer dependencies={implementation?.dependencies} bound={implementation.agent.id} />
          )}
                </div>
              </CardContent>
            </Card>
            <div className="flex-initial h-full flex flex-col ">
              <Button
                type="submit"
                variant={"ghost"}
                className="my-auto block h-full"
              >
                <ArrowRight className="my-auto" />
              </Button>
            </div>

            {yieldEvent ? (
              <Card className="flex-1 p-2">
                <CardHeader>
                  <CardTitle className="font-light">Outs</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-col gap-2">
                    <ReturnsContainer
                      registry={registry}
                      ports={implementation?.action.returns || []}
                      values={yieldEvent?.returns}
                    ></ReturnsContainer>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="font-light">Outs</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-col gap-2">
                    {implementation?.action?.returns?.map((p) => (
                      <div key={p.key} className="rounded border border-border/50 p-2">
                        <div className=" font-bold">{p.label || p.key}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.description}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {portToLabel(p)}
                        </div>
                        <PortConstraintBadges items={p.provides} className="mt-1" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {errorEvent && (
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="font-light text-red-800">
                    Errors
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="flex flex-col gap-2">
                    {errorEvent.message}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </form>
      </Form>
    </>
  );
};

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
      {label}
    </dt>
    <dd className="text-sm break-words">{children}</dd>
  </div>
);

const BoolBadge = ({ value, label }: { value: boolean; label: string }) => (
  <Badge variant={value ? "default" : "outline"}>{label}</Badge>
);

const JsonBlock = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  if (typeof value === "object" && Object.keys(value as object).length === 0) {
    return <span className="text-muted-foreground">empty</span>;
  }
  return (
    <pre className="text-xs bg-muted/40 rounded-md p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
};

const formatDate = (value: unknown) => {
  if (!value) return "—";
  try {
    return new Date(value as string).toLocaleString();
  } catch {
    return String(value);
  }
};

const Group = ({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) => (
  <section className="space-y-3">
    <h3 className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
      {count !== undefined && (
        <span className="ml-1.5 text-muted-foreground/50">{count}</span>
      )}
    </h3>
    {children}
  </section>
);

const Row = ({ children }: { children: ReactNode }) => (
  <div className="py-2 first:pt-0 last:pb-0">{children}</div>
);

const Empty = () => <p className="text-sm text-muted-foreground">None</p>;

const ImplementationDetailSheet = ({
  implementation: i,
}: {
  implementation: DetailImplementationFragment;
}) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" size="sm" className="gap-2">
        <SlidersHorizontal className="size-4" />
        Details
      </Button>
    </SheetTrigger>
    <SheetContent
      side="right"
      className="w-full sm:max-w-lg flex flex-col gap-0 p-0"
    >
      <SheetHeader className="border-b">
        <SheetTitle>{i.action.name}</SheetTitle>
        <SheetDescription className="font-mono">{i.interface}</SheetDescription>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        <Group title="Implementation">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Field label="Name">{i.name}</Field>
            <Field label="ID">
              <span className="font-mono text-xs">{i.id}</span>
            </Field>
            <Field label="Needs token">{i.needsToken ? "Yes" : "No"}</Field>
            <Field label="Pinned">{i.pinned ? "Yes" : "No"}</Field>
            <Field label="Provenance audience">
              {i.provenanceAudience && i.provenanceAudience.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {i.provenanceAudience.map((a) => (
                    <Badge key={a} variant="outline">
                      {a}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">derived at dispatch</span>
              )}
            </Field>
          </dl>
        </Group>

        <Separator />

        <Group title="Action">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Field label="Name">
              <RekuestAction.DetailLink
                object={i.action}
                className="text-primary hover:underline"
              >
                {i.action.name}
              </RekuestAction.DetailLink>
            </Field>
            <Field label="Kind">{i.action.kind}</Field>
            <Field label="App">{i.action.app.identifier}</Field>
            <Field label="Version">{i.action.version}</Field>
            <Field label="Stateful">{i.action.stateful ? "Yes" : "No"}</Field>
            <Field label="Key">
              <span className="font-mono text-xs">{i.action.key}</span>
            </Field>
            <Field label="Hash">
              <span className="font-mono text-xs break-all">
                {String(i.action.hash)}
              </span>
            </Field>
          </dl>
        </Group>

        <Separator />

        <Group title="Agent">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Field label="Name">
              <RekuestAgent.DetailLink
                object={i.agent}
                className="text-primary hover:underline"
              >
                {i.agent.name}
              </RekuestAgent.DetailLink>
            </Field>
            <Field label="Kind">{i.agent.kind}</Field>
            <Field label="App">{i.agent.app.identifier}</Field>
            <Field label="Last seen">{formatDate(i.agent.lastSeen)}</Field>
            <Field label="Status">
              <div className="flex flex-wrap gap-1">
                <BoolBadge value={i.agent.active} label="Active" />
                <BoolBadge value={i.agent.connected} label="Connected" />
                {i.agent.blocked && <Badge variant="destructive">Blocked</Badge>}
              </div>
            </Field>
            <Field label="Client">
              <span className="font-mono text-xs">{i.agent.client.id}</span>
            </Field>
          </dl>
        </Group>

        <Separator />

        <Group title="Dependencies" count={i.dependencies.length}>
          {i.dependencies.length === 0 ? (
            <Empty />
          ) : (
            <div className="divide-y divide-border/60">
              {i.dependencies.map((d) => (
                <Row key={d.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{d.key}</span>
                    <div className="flex gap-1">
                      {d.autoResolvable && (
                        <Badge variant="outline">auto</Badge>
                      )}
                      {d.singular && <Badge variant="outline">singular</Badge>}
                    </div>
                  </div>
                  {d.description && (
                    <p className="text-xs text-muted-foreground">
                      {d.description}
                    </p>
                  )}
                </Row>
              ))}
            </div>
          )}
        </Group>

        <Separator />

        <Group title="Manipulates" count={i.manipulates.length}>
          {i.manipulates.length === 0 ? (
            <Empty />
          ) : (
            <div className="divide-y divide-border/60">
              {i.manipulates.map((s) => (
                <Row key={s.id}>
                  <RekuestState.DetailLink
                    object={s}
                    className="font-medium text-primary hover:underline"
                  >
                    {s.definition.name}
                  </RekuestState.DetailLink>
                  <p className="text-xs text-muted-foreground font-mono">
                    {s.interface}
                  </p>
                </Row>
              ))}
            </div>
          )}
        </Group>

        <Separator />

        <Group title="Tracks" count={i.tracks.length}>
          {i.tracks.length === 0 ? (
            <Empty />
          ) : (
            <div className="divide-y divide-border/60">
              {i.tracks.map((t, idx) => (
                <Row key={idx}>
                  <div className="font-medium">{t.label || t.valueKey}</div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground">
                      {t.description}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">state: {t.stateKey}</Badge>
                    <Badge variant="outline">value: {t.valueKey}</Badge>
                    {t.dependencyKey && (
                      <Badge variant="outline">dep: {t.dependencyKey}</Badge>
                    )}
                  </div>
                </Row>
              ))}
            </div>
          )}
        </Group>

        <Separator />

        <Group title="Resolutions" count={i.resolutions.length}>
          {i.resolutions.length === 0 ? (
            <Empty />
          ) : (
            <div className="divide-y divide-border/60">
              {i.resolutions.map((r) => (
                <Row key={r.id}>
                  <RekuestResolution.DetailLink
                    object={r}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.name}
                  </RekuestResolution.DetailLink>
                  <p className="text-xs text-muted-foreground">
                    resolved {formatDate(r.resolvedAt)}
                  </p>
                </Row>
              ))}
            </div>
          )}
        </Group>

        {(i.higherOrderFor ||
          i.lowerOrderImplementations.length > 0 ||
          i.tests.length > 0) && (
          <>
            <Separator />
            <Group title="Relationships">
              <dl className="space-y-4">
                {i.higherOrderFor && (
                  <Field label="Higher-order for">
                    <RekuestImplementation.DetailLink
                      object={i.higherOrderFor}
                      className="text-primary hover:underline"
                    >
                      {i.higherOrderFor.name}
                    </RekuestImplementation.DetailLink>
                  </Field>
                )}
                {i.lowerOrderImplementations.length > 0 && (
                  <Field label={`Wrapped by (${i.lowerOrderImplementations.length})`}>
                    <div className="flex flex-col gap-1">
                      {i.lowerOrderImplementations.map((impl) => (
                        <RekuestImplementation.DetailLink
                          key={impl.id}
                          object={impl}
                          className="text-primary hover:underline"
                        >
                          {impl.name}
                        </RekuestImplementation.DetailLink>
                      ))}
                    </div>
                  </Field>
                )}
                {i.tests.length > 0 && (
                  <Field label={`Tests (${i.tests.length})`}>
                    <div className="flex flex-col gap-1">
                      {i.tests.map((impl) => (
                        <RekuestImplementation.DetailLink
                          key={impl.id}
                          object={impl}
                          className="text-primary hover:underline"
                        >
                          {impl.name}
                        </RekuestImplementation.DetailLink>
                      ))}
                    </div>
                  </Field>
                )}
              </dl>
            </Group>
          </>
        )}

        <Separator />

        <Group title="Params">
          <JsonBlock value={i.params} />
        </Group>

        <Group title="Higher-order config">
          <JsonBlock value={i.higherOrderConfig} />
        </Group>
      </div>
    </SheetContent>
  </Sheet>
);

export const DefaultRenderer = (props: {
  implementation: DetailImplementationFragment;
}) => {
  const i = props.implementation;
  return (
    <div className="p-6 flex flex-col gap-8 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
            {i.action.name}
          </h1>
          {i.action.description && (
            <p className="mt-3 text-xl text-muted-foreground">
              {i.action.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 items-center text-sm text-muted-foreground">
            <Badge variant="secondary">{i.action.kind}</Badge>
            {i.action.stateful && <Badge variant="outline">Stateful</Badge>}
            <span
              className={
                i.agent.connected ? "text-emerald-500" : "text-muted-foreground"
              }
            >
              ●
            </span>
            <RekuestAgent.DetailLink
              object={i.agent}
              className="hover:text-foreground hover:underline"
            >
              {i.agent.name}
            </RekuestAgent.DetailLink>
            <span className="font-mono text-xs">{i.interface}</span>
          </div>
        </div>
        <ImplementationDetailSheet implementation={i} />
      </div>

      <DoForm id={i.id} />

      <TaskList filters={{ implementation: i.id }} />
    </div>
  );
};

export const FlowRender = (props: { implementation: DetailImplementationFragment }) => {
  return (
    <div className="w-full h-full">
      {/* The flow it runs, drawn by fluss (a `main` section on implementations). */}
      <PageSections
        placement="main"
        identifier="@rekuest/implementation"
        object={{ id: props.implementation.id }}
      />
    </div>
  );
};

const TPage = asDetailQueryRoute(
  useImplementationQuery,
  ({ data, subscribeToMore }) => {
    useEffect(() => {
      return subscribeToMore<
        WatchImplementationSubscription,
        WatchImplementationSubscriptionVariables
      >({
        document: WatchImplementationDocument,
        variables: {
          implementation: data.implementation.id,
        },
        updateQuery: (_prev, { subscriptionData }) => {
          return { implementation: subscriptionData.data.implementationChange };
        },
      });
    }, [subscribeToMore]);

    return (
      <RekuestImplementation.ModelPage
        title={`${data.implementation.action.name} @ ${data.implementation.interface}`}
        object={data.implementation}
        additionalSidebars={
          <Sidebars.Tab label="Stats">
            <ImplementationStatsSidebar implementation={data.implementation.id} />
          </Sidebars.Tab>
        }
        pageActions={
          <>
            <RekuestAction.DetailLink object={data.implementation.action}>
              <PageAction>Go to Action</PageAction>
            </RekuestAction.DetailLink>
            <RekuestAgent.DetailLink object={data.implementation.agent}>
              <PageAction>Go to Agent</PageAction>
            </RekuestAgent.DetailLink>
          </>
        }
      >
        {data.implementation?.params?.flow ? (
          <FlowRender implementation={data.implementation} />
        ) : (
          <DefaultRenderer implementation={data.implementation} />
        )}
      </RekuestImplementation.ModelPage>
    );
  },
);


export default TPage;
