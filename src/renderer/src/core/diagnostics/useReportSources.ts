import { useActiveProfile, useArkitektStore } from "@/core/connection/arkitekt/hooks";
import { useRoles } from "@/core/connection/roles";
import { moduleDefinitions } from "@/core/modules/registries";
import { hardwareReportLines } from "@/core/settings/renderer/hardwareReport";
import { getReportableHardware } from "@/core/settings/renderer/rendererBudget";
import { useActiveTabIdOrNull } from "@/core/tabs/TabsProvider";
import { describeError } from "@/core/notify/describeError";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { currentRoute, pageQueriesOf, type RecordedError } from "./recorder";
import type { PageQuery, ReportSources } from "./report";
import { useDiagnostics } from "./useDiagnostics";

type MainInfo = Awaited<ReturnType<NonNullable<Window["api"]>["diagnostics"]["info"]>>;

/**
 * Everything a report can draw on, gathered where the report dialog renders:
 * the record, this page's queries, who and where, and what the main process
 * knows. The web build has no main process; it reports the browser instead.
 */
export const useReportSources = (
  given: { screenshot?: string | null; pinned?: RecordedError | null },
): Omit<ReportSources, "description" | "expected"> => {
  const record = useDiagnostics();
  const tabId = useActiveTabIdOrNull();
  const profile = useActiveProfile();
  const { roles } = useRoles();
  const services = useArkitektStore(
    useShallow((state) =>
      Object.fromEntries(
        Object.entries(state.serviceStates)
          .filter(([, service]) => service?.configured)
          .map(([key, service]) => [key, String(service?.status ?? "unknown")]),
      ),
    ),
  );

  const [info, setInfo] = useState<MainInfo | null>(null);
  const [mainLog, setMainLog] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    void window.api?.diagnostics?.info().then((value) => alive && setInfo(value)).catch(() => {});
    void window.api?.diagnostics?.mainLog().then((value) => alive && setMainLog(value)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Read once, when the dialog opens: the report is about that moment.
  const [queries] = useState<PageQuery[]>(() =>
    pageQueriesOf(tabId).map((query) => ({
      label: query.label,
      variables: query.variables,
      data: query.data,
      error: query.error ? describeError(query.error).technical : undefined,
    })),
  );
  const [route] = useState(currentRoute);
  const [hardware] = useState(() => {
    const detected = getReportableHardware();
    return detected ? hardwareReportLines(detected) : undefined;
  });

  return useMemo(
    () => ({
      pinned: given.pinned,
      screenshot: given.screenshot,
      record,
      queries,
      mainLog,
      hardware,
      scrub: info?.scrub,
      environment: {
        appVersion: info?.appVersion ?? (window.api ? "unknown" : "web"),
        platform: info ? `${info.platform} ${info.arch}` : navigator.userAgent,
        route,
        organization: profile?.label.organizationName ?? undefined,
        roles: roles.length ? roles : undefined,
        services,
        modules: moduleDefinitions().map((definition) => definition.manifest.namespace),
      },
    }),
    [given.pinned, given.screenshot, record, queries, mainLog, hardware, info, route, profile, roles, services],
  );
};
