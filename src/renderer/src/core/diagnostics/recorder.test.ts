import { beforeEach, describe, expect, it } from "vitest";
import {
  getDiagnostics,
  LIMITS,
  recordConsole,
  recordError,
  recordNavigation,
  recordRequest,
  recordStep,
  resetDiagnostics,
} from "./recorder";
import { redactText, redactValue, REDACTED } from "./redact";
import { buildReport, DEFAULT_SELECTION, renderMarkdown, renderReportFile, scrubber } from "./report";

beforeEach(resetDiagnostics);

describe("redaction", () => {
  it("removes bearer tokens, JWTs and signed query values", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.abcDEF123";
    const text = redactText(`Authorization: Bearer abc.def-123 token ${jwt} at https://s3/x.png?X-Amz-Signature=deadbeef&ok=1`);
    expect(text).not.toContain("abc.def-123");
    expect(text).not.toContain(jwt);
    expect(text).not.toContain("deadbeef");
    expect(text).toContain("ok=1");
  });

  it("masks values under secret-looking keys and bounds what it keeps", () => {
    const value = redactValue({ id: "7", password: "hunter2", nested: { accessToken: "x", name: "a" }, list: Array(80).fill(1) }) as any;
    expect(value.id).toBe("7");
    expect(value.password).toBe(REDACTED);
    expect(value.nested.accessToken).toBe(REDACTED);
    expect(value.nested.name).toBe("a");
    expect(value.list).toHaveLength(51);
  });
});

describe("recorder", () => {
  it("stamps errors with the page and records one object once", () => {
    recordNavigation("/mikro/folders/1");
    const error = new Error("boom");
    recordError(error, { source: "toast", title: "Couldn't move the folder" });
    recordError(error, { source: "uncaught" });
    const { errors } = getDiagnostics();
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ route: "/mikro/folders/1", source: "toast", title: "Couldn't move the folder", message: "boom" });
  });

  it("does not record a cancellation", () => {
    recordError(Object.assign(new Error("stop"), { name: "AbortError" }), { source: "uncaught" });
    expect(getDiagnostics().errors).toHaveLength(0);
  });

  it("keeps each ring bounded, newest last", () => {
    for (let i = 0; i < LIMITS.steps + 20; i++) recordStep("action", `a${i}`);
    const { steps } = getDiagnostics();
    expect(steps).toHaveLength(LIMITS.steps);
    expect(steps[steps.length - 1].label).toBe(`a${LIMITS.steps + 19}`);
  });

  it("collapses a console line that repeats", () => {
    recordConsole("warn", ["same", { a: 1 }]);
    recordConsole("warn", ["same", { a: 1 }]);
    recordConsole("error", ["other"]);
    expect(getDiagnostics().console.map((line) => [line.text, line.count])).toEqual([
      ['same {"a":1}', 2],
      ["other", 1],
    ]);
  });

  it("records a navigation once per page", () => {
    recordNavigation("/a");
    recordNavigation("/a");
    recordNavigation("/b");
    expect(getDiagnostics().steps.map((step) => step.label)).toEqual(["/a", "/b"]);
  });

  it("redacts request variables on the way in", () => {
    recordRequest({ service: "lok", operation: "Login", kind: "mutation", variables: { password: "p", user: "u" }, status: 500, message: "no" });
    expect(getDiagnostics().requests[0].variables).toEqual({ password: REDACTED, user: "u" });
  });
});

describe("report", () => {
  const environment = { appVersion: "6.0.1", platform: "linux 7", route: "/mikro" };

  const sources = () => {
    recordNavigation("/mikro");
    recordError(new Error("failed in /home/ada/project"), { source: "page" });
    recordRequest({ service: "mikro", operation: "GetFolder", kind: "query", variables: { id: "1" }, status: null, message: "denied" });
    return {
      description: "The folder page is empty\nafter moving a file",
      environment,
      record: getDiagnostics(),
      queries: [{ label: "FolderPage", variables: { id: "1" }, data: { folder: { name: "secret sample" } } }],
      screenshot: "data:image/jpeg;base64,AAAA",
      scrub: { home: "/home/ada", username: "ada", hostname: "adas-laptop" },
    };
  };

  it("names itself after the first line and leaves returned data out by default", () => {
    const report = buildReport(sources(), DEFAULT_SELECTION);
    expect(report.title).toBe("The folder page is empty");
    expect(report.queries).toEqual([{ label: "FolderPage", variables: { id: "1" } }]);
    expect(JSON.stringify(report)).not.toContain("secret sample");
    expect(report.screenshot).toBe("data:image/jpeg;base64,AAAA");
  });

  it("carries only what is ticked", () => {
    const report = buildReport(sources(), {
      ...DEFAULT_SELECTION,
      errors: false,
      variables: false,
      screenshot: false,
      data: true,
    });
    expect(report.errors).toBeUndefined();
    expect(report.screenshot).toBeUndefined();
    expect(report.requests?.[0].variables).toBeUndefined();
    expect(report.queries?.[0]).toEqual({ label: "FolderPage", data: { folder: { name: "secret sample" } } });
  });

  it("removes the home folder and the user's name from every text", () => {
    const report = buildReport(sources(), DEFAULT_SELECTION);
    expect(JSON.stringify(report)).not.toContain("/home/ada");
    expect(report.errors?.[0].message).toBe("failed in ~/project");
    expect(scrubber({})("at /Users/bob/app and C:\\Users\\bob\\app")).toBe("at /Users/<username>/app and C:\\Users\\<username>\\app");
  });

  it("renders Markdown, cut to a limit when asked", () => {
    const report = buildReport(sources(), DEFAULT_SELECTION);
    const markdown = renderMarkdown(report);
    expect(markdown).toContain("### What happened?");
    expect(markdown).toContain("`GetFolder`");
    expect(markdown).not.toContain("base64");
    expect(renderMarkdown(report, { limit: 120 }).length).toBeLessThan(200);
  });

  it("writes a file whose data cannot break out of its block", () => {
    const report = buildReport({ ...sources(), description: "</script><b>x" }, DEFAULT_SELECTION);
    const html = renderReportFile(report);
    expect(html).not.toContain("</script><b>x");
    expect(html).toContain('<img src="data:image/jpeg;base64,AAAA"');
  });
});
