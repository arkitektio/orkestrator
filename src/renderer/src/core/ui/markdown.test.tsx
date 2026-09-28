// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Markdown } from "./markdown";

// Output-parity snapshots: the parser was hoisted/memoised for performance and
// these pin the rendered HTML so any behavioural drift shows up as a diff.
const SAMPLES: Record<string, string> = {
  headings: "# Title\n## Sub *title*\n### Third `code`\n#### Deep\n##### Deeper\n###### Deepest\n####### not a heading",
  inline:
    "Some **bold**, some *italic*, some `code` and a [link](https://example.com/a_b) plus **bold with *nested italic* and `code`**.",
  nestedAndOverlap:
    "*italic **bold inside** tail* and **bold [link](x) inside** and `**not bold in code**` and [**bold link**](https://x.y)",
  lists:
    "- one\n- two **bold**\n+ three\n* four\n\n1. first\n2. second `code`\n3. third\n\n- back to unordered\n1. then ordered",
  listInterruptedByParagraph: "- a\n- b\nplain line after list\n- c",
  blockquoteAndParagraphs:
    "> quoted *text*\n> second quote\n\nParagraph line one\nline two of same paragraph\n\nNext paragraph",
  codeBlocks:
    "before\n```ts\nconst x = **not bold**;\n\nconsole.log(x);\n```\nafter\n```\nno language\n```",
  unterminatedCode: "text\n```python\nprint('hi')\nstill code",
  edgeCases: "**\n***\n* \n1.\n1. \n[]()\n``\n\n\n   \nend",
  empty: "",
  onlyWhitespace: "  \n\t\n",
  unicode: "Héllo **wörld** — `ünïcode` ✓ [链接](https://例え.jp) 🎉",
};

describe("Markdown", () => {
  for (const [name, text] of Object.entries(SAMPLES)) {
    it(`renders ${name}`, () => {
      expect(renderToStaticMarkup(<Markdown text={text} />)).toMatchSnapshot();
    });
    it(`renders ${name} (isOwn)`, () => {
      expect(
        renderToStaticMarkup(<Markdown text={text} isOwn className="extra" />),
      ).toMatchSnapshot();
    });
  }
});
