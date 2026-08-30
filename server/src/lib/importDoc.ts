import { marked } from "marked";

// Converts uploaded .txt / .md files into a Tiptap/ProseMirror JSON document,
// so an imported file becomes a normal editable document (same shape as
// anything typed directly in the editor).
//
// We deliberately avoid pulling in jsdom just to reuse Tiptap's own
// generateJSON() helper server-side -- for the small feature set this
// product needs (headings, bold/italic/strike/code, paragraphs, lists,
// blockquotes, code blocks) walking marked's token tree directly is a lot
// less machinery and is easy to reason about / test.

type TTNode = { type: string; attrs?: Record<string, unknown>; content?: TTNode[]; text?: string; marks?: { type: string }[] };

export function plainTextToTiptap(text: string): TTNode {
  const paragraphs = text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!paragraphs.length) return { type: "doc", content: [{ type: "paragraph" }] };

  const content = paragraphs.map((p) => {
    const lines = p.split(/\r?\n/);
    const inline: TTNode[] = [];
    lines.forEach((line, i) => {
      if (i > 0) inline.push({ type: "hardBreak" });
      if (line.length) inline.push({ type: "text", text: line });
    });
    return { type: "paragraph", ...(inline.length ? { content: inline } : {}) };
  });

  return { type: "doc", content };
}

export function markdownToTiptap(markdown: string): TTNode {
  const tokens = marked.lexer(markdown, { gfm: true });
  const content = tokens.map(blockToNode).filter((n): n is TTNode => n !== null);
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function blockToNode(token: any): TTNode | null {
  switch (token.type) {
    case "heading":
      return { type: "heading", attrs: { level: Math.min(token.depth, 3) }, content: inlineToNodes(token.tokens) };
    case "paragraph": {
      const inline = inlineToNodes(token.tokens);
      return { type: "paragraph", ...(inline.length ? { content: inline } : {}) };
    }
    case "list":
      return {
        type: token.ordered ? "orderedList" : "bulletList",
        content: token.items.map(itemToListItem),
      };
    case "code":
      return { type: "codeBlock", ...(token.text ? { content: [{ type: "text", text: token.text }] } : {}) };
    case "blockquote":
      return {
        type: "blockquote",
        content: (token.tokens || []).map(blockToNode).filter((n: TTNode | null): n is TTNode => n !== null),
      };
    case "hr":
      return { type: "horizontalRule" };
    case "space":
      return null;
    default:
      if (token.text) return { type: "paragraph", content: [{ type: "text", text: String(token.text) }] };
      return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function itemToListItem(item: any): TTNode {
  const content = (item.tokens || [])
    .map((t: any) => {
      if (t.type === "text") {
        const inline = inlineToNodes(t.tokens && t.tokens.length ? t.tokens : [{ type: "text", text: t.text }]);
        return { type: "paragraph", ...(inline.length ? { content: inline } : {}) };
      }
      return blockToNode(t);
    })
    .filter((n: TTNode | null): n is TTNode => n !== null);

  return { type: "listItem", content: content.length ? content : [{ type: "paragraph" }] };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inlineToNodes(tokens: any[] | undefined): TTNode[] {
  if (!tokens || !tokens.length) return [];
  const out: TTNode[] = [];
  for (const t of tokens) out.push(...inlineTokenToNodes(t, []));
  return out;
}

function inlineTokenToNodes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any,
  marks: { type: string }[]
): TTNode[] {
  switch (t.type) {
    case "strong":
      return flattenChildren(t.tokens, [...marks, { type: "bold" }]);
    case "em":
      return flattenChildren(t.tokens, [...marks, { type: "italic" }]);
    case "del":
      return flattenChildren(t.tokens, [...marks, { type: "strike" }]);
    case "codespan":
      return t.text ? [{ type: "text", text: t.text, marks: [...marks, { type: "code" }] }] : [];
    case "link":
      return flattenChildren(t.tokens, marks);
    case "text":
      if (t.tokens && t.tokens.length) return flattenChildren(t.tokens, marks);
      return t.text ? [{ type: "text", text: t.text, ...(marks.length ? { marks } : {}) }] : [];
    case "br":
      return [{ type: "hardBreak" }];
    default:
      return t.text ? [{ type: "text", text: t.text, ...(marks.length ? { marks } : {}) }] : [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenChildren(tokens: any[] | undefined, marks: { type: string }[]): TTNode[] {
  if (!tokens || !tokens.length) return [];
  const out: TTNode[] = [];
  for (const t of tokens) out.push(...inlineTokenToNodes(t, marks));
  return out;
}

export function importFileToTiptap(filename: string, buffer: Buffer): { title: string; content: TTNode } {
  const lower = filename.toLowerCase();
  const text = buffer.toString("utf-8");
  const title = filename.replace(/\.(txt|md|markdown)$/i, "") || "Imported document";

  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return { title, content: markdownToTiptap(text) };
  }
  // default: treat as plain text (covers .txt and anything unrecognized we still accepted)
  return { title, content: plainTextToTiptap(text) };
}
