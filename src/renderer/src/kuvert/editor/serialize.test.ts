import { describe, expect, it } from "vitest";
import { fromText, isEmpty, MailNode, toHtml, toText } from "./serialize";

const p = (...children: MailNode[]): MailNode => ({ type: "p", children });
const li = (listStyleType: string, indent: number, text: string): MailNode => ({
  type: "p",
  listStyleType,
  indent,
  children: [{ text }],
});

describe("toHtml", () => {
  it("writes one div per line and marks as tags", () => {
    expect(
      toHtml([p({ text: "Hi " }, { text: "there", bold: true, italic: true }), p({ text: "" }), p({ text: "x", code: true })]),
    ).toBe("<div>Hi <em><strong>there</strong></em></div><div><br></div><div><code>x</code></div>");
  });

  it("escapes text", () => {
    expect(toHtml([p({ text: '<script>alert("x")</script> & co' })])).toBe(
      "<div>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; co</div>",
    );
  });

  it("keeps safe links and drops unsafe hrefs", () => {
    expect(
      toHtml([
        p(
          { type: "a", url: "https://x.org/?a=1&b=2", children: [{ text: "site" }] },
          { text: " " },
          { type: "a", url: "javascript:alert(1)", children: [{ text: "bad" }] },
        ),
      ]),
    ).toBe('<div><a href="https://x.org/?a=1&amp;b=2">site</a> bad</div>');
  });

  it("nests flat indent lists", () => {
    expect(
      toHtml([
        li("disc", 1, "a"),
        li("decimal", 2, "a1"),
        li("decimal", 2, "a2"),
        li("disc", 1, "b"),
        p({ text: "after" }),
      ]),
    ).toBe("<ul><li>a<ol><li>a1</li><li>a2</li></ol></li><li>b</li></ul><div>after</div>");
  });

  it("starts a new list when the kind changes at the same depth", () => {
    expect(toHtml([li("disc", 1, "a"), li("decimal", 1, "b")])).toBe("<ul><li>a</li></ul><ol><li>b</li></ol>");
  });

  it("writes quotes with line breaks", () => {
    expect(toHtml([{ type: "blockquote", children: [{ text: "one\ntwo" }] }])).toContain(">one<br>two</blockquote>");
  });
});

describe("toText", () => {
  it("writes bullets, numbers and quotes", () => {
    expect(
      toText([
        p({ text: "Hi" }),
        li("disc", 1, "a"),
        li("decimal", 2, "a1"),
        li("decimal", 2, "a2"),
        li("disc", 1, "b"),
        { type: "blockquote", children: [{ text: "one\n\ntwo" }] },
      ]),
    ).toBe("Hi\n- a\n   1. a1\n   2. a2\n- b\n> one\n>\n> two");
  });

  it("writes a link as text and url", () => {
    expect(toText([p({ type: "a", url: "https://x.org", children: [{ text: "site" }] })])).toBe("site <https://x.org>");
    expect(toText([p({ type: "a", url: "https://x.org", children: [{ text: "https://x.org" }] })])).toBe("https://x.org");
  });
});

describe("fromText", () => {
  it("makes paragraphs and quotes that write back to the same text", () => {
    const text = "Thanks!\n\nOn Monday, Ann wrote:\n> first\n>> older\n> last";
    const value = fromText(text);
    expect(value.map((n) => n.type)).toEqual(["p", "p", "p", "blockquote"]);
    expect(value[3].children![0].text).toBe("first\n> older\nlast");
    expect(toText(value)).toBe("Thanks!\n\nOn Monday, Ann wrote:\n> first\n> > older\n> last");
  });

  it("gives an empty paragraph for nothing", () => {
    expect(fromText("")).toEqual([{ type: "p", children: [{ text: "" }] }]);
  });
});

describe("isEmpty", () => {
  it("ignores whitespace and empty bullets", () => {
    expect(isEmpty([p({ text: "  " }), li("disc", 1, "")])).toBe(true);
    expect(isEmpty([p({ text: "a" })])).toBe(false);
  });
});
