import { describe, it, expect } from "vitest";
import { plainTextToTiptap, markdownToTiptap } from "../lib/importDoc";

describe("plainTextToTiptap", () => {
  it("splits blank-line-separated text into separate paragraphs", () => {
    const doc = plainTextToTiptap("Hello world.\n\nSecond paragraph.");
    expect(doc.type).toBe("doc");
    expect(doc.content).toHaveLength(2);
    expect(doc.content?.[0]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "Hello world." }],
    });
    expect(doc.content?.[1]).toMatchObject({
      type: "paragraph",
      content: [{ type: "text", text: "Second paragraph." }],
    });
  });

  it("preserves single line breaks within a paragraph as hardBreaks", () => {
    const doc = plainTextToTiptap("line one\nline two");
    expect(doc.content).toHaveLength(1);
    const nodes = doc.content?.[0].content ?? [];
    expect(nodes.map((n) => n.type)).toEqual(["text", "hardBreak", "text"]);
  });

  it("falls back to a single empty paragraph for empty input", () => {
    const doc = plainTextToTiptap("   \n\n  ");
    expect(doc.content).toEqual([{ type: "paragraph" }]);
  });
});

describe("markdownToTiptap", () => {
  it("converts a heading to a Tiptap heading node with the right level", () => {
    const doc = markdownToTiptap("# Title\n\nSome text.");
    expect(doc.content?.[0]).toMatchObject({
      type: "heading",
      attrs: { level: 1 },
    });
  });

  it("converts bold and italic markdown into marks", () => {
    const doc = markdownToTiptap("This is **bold** and *italic*.");
    const para = doc.content?.[0];
    expect(para?.type).toBe("paragraph");
    const bold = para?.content?.find((n) => n.text === "bold");
    const italic = para?.content?.find((n) => n.text === "italic");
    expect(bold?.marks).toEqual([{ type: "bold" }]);
    expect(italic?.marks).toEqual([{ type: "italic" }]);
  });

  it("converts a markdown bullet list into a bulletList/listItem tree", () => {
    const doc = markdownToTiptap("- one\n- two\n- three");
    const list = doc.content?.[0];
    expect(list?.type).toBe("bulletList");
    expect(list?.content).toHaveLength(3);
    expect(list?.content?.[0].type).toBe("listItem");
  });

  it("caps heading depth at level 3 (editor only supports h1-h3)", () => {
    const doc = markdownToTiptap("###### Deep heading");
    expect(doc.content?.[0]).toMatchObject({ type: "heading", attrs: { level: 3 } });
  });
});
