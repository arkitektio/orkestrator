// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { normalizeReleaseNotes } from "./releaseNotes";
import {
  parseReleaseHtml,
  splitMarkdownHeading,
  type NoteNode,
} from "./ReleaseNotesView";

// What GitHub's releases atom feed carries for a semantic-release body.
const GITHUB_HTML = `<h1><a href="https://github.com/arkitektio/orkestrator/compare/v2.13.0...v2.14.0">2.14.0</a> (2026-09-24)</h1>
<h3>Features</h3>
<ul>
<li><strong>scene:</strong> implement white balance gains for RGB layers (<a href="https://github.com/arkitektio/orkestrator/commit/295b7b5"><tt>295b7b5</tt></a>)</li>
</ul>`;

const text = (nodes: NoteNode[]): string =>
  nodes.map((n) => (n.t === "text" ? n.text : text(n.children))).join("");

const find = (nodes: NoteNode[], pred: (n: NoteNode) => boolean): NoteNode[] =>
  nodes.flatMap((n) => [
    ...(pred(n) ? [n] : []),
    ...(n.t === "el" ? find(n.children, pred) : []),
  ]);

describe("normalizeReleaseNotes", () => {
  it("wraps a single string with the update's version", () => {
    expect(normalizeReleaseNotes("<p>hi</p>", "2.14.0")).toEqual([
      { version: "2.14.0", body: "<p>hi</p>" },
    ]);
  });

  it("maps a full changelog and drops empty notes", () => {
    expect(
      normalizeReleaseNotes([
        { version: "2.14.0", note: "a" },
        { version: "2.13.1", note: "" },
        null,
      ]),
    ).toEqual([{ version: "2.14.0", body: "a" }]);
  });

  it("returns nothing for nothing", () => {
    expect(normalizeReleaseNotes("  ")).toBeUndefined();
    expect(normalizeReleaseNotes(undefined)).toBeUndefined();
  });
});

describe("parseReleaseHtml", () => {
  it("lifts the version heading out for its date", () => {
    const { date, nodes } = parseReleaseHtml(GITHUB_HTML);
    expect(date).toBe("2026-09-24");
    expect(text(nodes)).not.toContain("2.14.0");
    expect(text(nodes)).toContain("Features");
  });

  it("turns commit links into hash chips without their parentheses", () => {
    const { nodes } = parseReleaseHtml(GITHUB_HTML);
    const [chip] = find(nodes, (n) => n.t === "el" && n.tag === "a");
    expect(chip).toMatchObject({ hash: true });
    const [li] = find(nodes, (n) => n.t === "el" && n.tag === "li");
    expect(text([li])).toBe("scene: implement white balance gains for RGB layers 295b7b5");
  });

  it("drops scripts and unsafe links, unwraps unknown tags", () => {
    const { nodes } = parseReleaseHtml(
      `<p>a<script>alert(1)</script><span>b</span><img src=x onerror="alert(1)"><a href="javascript:alert(1)">c</a></p>`,
    );
    expect(text(nodes)).toBe("abc");
    expect(find(nodes, (n) => n.t === "el" && n.tag === "a")).toEqual([]);
  });
});

describe("splitMarkdownHeading", () => {
  it("lifts semantic-release's markdown heading", () => {
    const md =
      "# [2.14.0](https://github.com/a/b/compare/v2.13.0...v2.14.0) (2026-09-24)\n\n### Features\n\n* x";
    expect(splitMarkdownHeading(md)).toEqual({
      date: "2026-09-24",
      body: "### Features\n\n* x",
    });
  });
});
