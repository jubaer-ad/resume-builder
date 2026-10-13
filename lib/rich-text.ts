export type TextAlignment = "left" | "center" | "right";

export type RichTextRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

export type RichTextBlock = {
  alignment: TextAlignment;
  list: "bullet" | "number" | null;
  runs: RichTextRun[];
};

const blockTags = new Set(["p", "div", "li"]);
const allowedTags = new Set(["p", "div", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li"]);

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeHtml(value: string) {
  const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_, entity: string) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] ?? "";
    const radix = entity[1].toLowerCase() === "x" ? 16 : 10;
    const number = Number.parseInt(entity.slice(radix === 16 ? 2 : 1), radix);
    return Number.isFinite(number) ? String.fromCodePoint(number) : "";
  });
}

export function sanitizeRichText(value: string): string {
  if (!value) return "";
  if (!/<[a-z][\s\S]*>/i.test(value)) return escapeHtml(value).replace(/\r?\n/g, "<br>");

  const withoutUnsafeBlocks = value
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<(script|style|iframe|object|svg|math)[^>]*>[\s\S]*?<\/\1\s*>/gi, "");

  return withoutUnsafeBlocks.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (tag, rawName: string, attributes: string) => {
    const name = rawName.toLowerCase();
    if (!allowedTags.has(name)) return "";
    if (tag.startsWith("</")) return name === "br" ? "" : `</${name}>`;
    if ((name === "p" || name === "div") && /text-align\s*:\s*(left|center|right)/i.test(attributes)) {
      const alignment = attributes.match(/text-align\s*:\s*(left|center|right)/i)?.[1].toLowerCase();
      return `<${name} style="text-align:${alignment}">`;
    }
    return name === "br" ? "<br>" : `<${name}>`;
  }).slice(0, 20_000);
}

export function richTextBlocks(value: string): RichTextBlock[] {
  const html = sanitizeRichText(value);
  if (!html) return [];

  const blocks: RichTextBlock[] = [];
  let runs: RichTextRun[] = [];
  let alignment: TextAlignment = "left";
  let list: RichTextBlock["list"] = null;
  let bold = 0;
  let italic = 0;
  let underline = 0;

  const finish = () => {
    const cleaned = runs.map((run) => ({ ...run, text: run.text.replace(/\u00a0/g, " ") }));
    if (cleaned.some((run) => run.text.trim())) blocks.push({ alignment, list, runs: cleaned });
    runs = [];
    alignment = "left";
  };

  for (const token of html.split(/(<[^>]+>)/g).filter(Boolean)) {
    if (!token.startsWith("<")) {
      const text = decodeHtml(token);
      if (text) runs.push({ text, bold: bold > 0 || undefined, italic: italic > 0 || undefined, underline: underline > 0 || undefined });
      continue;
    }

    const match = token.match(/^<(\/)?([a-z]+)([^>]*)>/i);
    if (!match) continue;
    const closing = Boolean(match[1]);
    const name = match[2].toLowerCase();
    if (!closing && blockTags.has(name)) {
      if (runs.length) finish();
      const requested = match[3].match(/text-align\s*:\s*(left|center|right)/i)?.[1].toLowerCase();
      if (requested === "center" || requested === "right") alignment = requested;
    }
    if (name === "br") finish();
    if ((name === "strong" || name === "b")) bold += closing ? -1 : 1;
    if ((name === "em" || name === "i")) italic += closing ? -1 : 1;
    if (name === "u") underline += closing ? -1 : 1;
    if (!closing && name === "ul") list = "bullet";
    if (!closing && name === "ol") list = "number";
    if (closing && (name === "ul" || name === "ol")) list = null;
    if (closing && blockTags.has(name)) finish();
  }
  finish();
  return blocks;
}

export function richTextToPlain(value: string): string {
  return richTextBlocks(value).map((block) => block.runs.map((run) => run.text).join("").trim()).filter(Boolean).join("\n");
}

export function hasRichText(value: string): boolean {
  return richTextToPlain(value).length > 0;
}
