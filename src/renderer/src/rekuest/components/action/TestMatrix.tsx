import { Badge } from "@/core/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/ui/card";
import { RekuestAction, RekuestImplementation } from "@/core/linkers";
import {
  ActionTestCaseFragment,
  DetailActionFragment,
  ProvidingImplementationFragment,
  TaskEventKind,
} from "@/rekuest/api/graphql";
import { pivotTestMatrix } from "@/rekuest/lib/actionBrowse";
import { Check, Minus, X } from "lucide-react";

const Outcome = ({
  result,
}: {
  result: { passed: boolean; createdAt?: string } | undefined;
}) => {
  if (!result) {
    return (
      <span title="Never run here" aria-label="Never run here">
        <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />
      </span>
    );
  }
  const verdict = result.passed ? "Passed" : "Failed";
  const label = result.createdAt
    ? `${verdict} · ${new Date(result.createdAt).toLocaleString()}`
    : verdict;
  return (
    <span title={label} aria-label={label}>
      {result.passed ? (
        <Check className="mx-auto h-4 w-4 text-green-500" />
      ) : (
        <X className="mx-auto h-4 w-4 text-destructive" />
      )}
    </span>
  );
};

/**
 * Test cases down, implementations across, the LATEST result in each cell —
 * "does this action work on that app" at a glance.
 */
export const TestMatrix = ({
  testCases,
  implementations,
}: {
  testCases: ActionTestCaseFragment[];
  implementations: ProvidingImplementationFragment[];
}) => {
  const matrix = pivotTestMatrix(testCases, implementations);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tests</CardTitle>
        <p className="text-xs text-muted-foreground">
          Latest result of each test case on each implementation.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="py-1 pr-4 text-left font-normal">Test case</th>
              {matrix.cols.map((implementation) => (
                <th
                  key={implementation.id}
                  className="px-2 py-1 text-center font-normal"
                >
                  <RekuestImplementation.DetailLink
                    object={implementation}
                    className="hover:underline"
                  >
                    {implementation.agent.name}
                    <span className="block font-mono text-[10px]">
                      {implementation.interface}
                    </span>
                  </RekuestImplementation.DetailLink>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((testCase) => (
              <tr key={testCase.id} className="border-t border-border">
                <td className="py-2 pr-4">
                  <div className="flex flex-row items-center gap-2">
                    <RekuestAction.DetailLink
                      object={testCase.tester}
                      className="font-medium hover:underline"
                    >
                      {testCase.name}
                    </RekuestAction.DetailLink>
                    {testCase.isBenchmark && (
                      <Badge variant="outline" className="text-[10px]">
                        benchmark
                      </Badge>
                    )}
                  </div>
                  {testCase.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {testCase.description}
                    </div>
                  )}
                </td>
                {matrix.cols.map((implementation) => (
                  <td key={implementation.id} className="px-2 py-2 text-center">
                    <Outcome result={matrix.cell(testCase.id, implementation.id)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

/**
 * The older mechanism — actions registered as tests of this one, judged by
 * their runs — shown only for actions that have no test cases.
 */
export const LegacyActionTests = ({
  tests,
}: {
  tests: DetailActionFragment["tests"];
}) => (
  <Card>
    <CardHeader>
      <CardTitle>Tests</CardTitle>
    </CardHeader>
    <CardContent className="flex flex-col gap-3">
      {tests.map((test) => (
        <div key={test.id}>
          <RekuestAction.DetailLink
            object={test}
            className="text-sm font-medium hover:underline"
          >
            {test.name}
          </RekuestAction.DetailLink>
          {test.description && (
            <p className="text-xs text-muted-foreground">{test.description}</p>
          )}
          <div className="mt-1 flex flex-col gap-0.5">
            {test.runs?.map((run, index) =>
              run?.implementation_id == null ? null : (
                <div key={index} className="flex flex-row items-center gap-2 text-xs">
                  <Outcome
                    result={{
                      passed: run.latestEventKind === TaskEventKind.Completed,
                    }}
                  />
                  <RekuestImplementation.DetailLink
                    object={{ id: String(run.implementation_id) }}
                    className="font-mono hover:underline"
                  >
                    {String(run.implementation_id)}
                  </RekuestImplementation.DetailLink>
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);
