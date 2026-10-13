import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  TabStopPosition,
  TabStopType,
  TextRun,
} from "docx";
import { ResumeData, lines, list } from "@/lib/resume";
import { getTemplate } from "@/lib/templates";

const twip = (value: number) => value;

function hex(value: string) {
  return value.replace("#", "").toUpperCase();
}

function dateRange(start: string, end: string) {
  return [start, end].filter(Boolean).join(" – ");
}

function heading(text: string, accent: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 210, after: 75 },
    border: { bottom: { color: accent, size: 7, style: BorderStyle.SINGLE, space: 5 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, color: accent, size: 22, characterSpacing: 35 })],
  });
}

function entryTitle(title: string, dates: string) {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    spacing: { before: 85, after: 25 },
    children: [
      new TextRun({ text: title || "Untitled", bold: true, size: 23 }),
      new TextRun({ text: dates ? `\t${dates}` : "", color: "66706D", size: 19 }),
    ],
  });
}

function bullet(text: string) {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 35 },
    style: "ResumeBody",
  });
}

function parsePhoto(dataUrl: string): { data: Uint8Array; type: "png" | "jpg" } | null {
  const match = dataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);
  if (!match) return null;
  return {
    data: new Uint8Array(Buffer.from(match[2], "base64")),
    type: match[1] === "jpeg" ? "jpg" : "png",
  };
}

export async function createDocx(resume: ResumeData): Promise<Uint8Array> {
  const template = getTemplate(resume.templateId);
  const accent = hex(template.accent);
  const photo = template.supportsPhoto ? parsePhoto(resume.basics.photoDataUrl) : null;
  const contactParts = [resume.basics.email, resume.basics.phone, resume.basics.location].filter(Boolean);
  const children: Paragraph[] = [];

  const headerChildren: Array<TextRun | ImageRun> = [];
  if (photo) {
    headerChildren.push(new ImageRun({ data: photo.data, type: photo.type, transformation: { width: 76, height: 76 } }));
    headerChildren.push(new TextRun({ text: "   " }));
  }
  headerChildren.push(new TextRun({ text: resume.basics.fullName.toUpperCase(), bold: true, color: accent, size: 38, font: "Aptos Display" }));

  children.push(new Paragraph({
    alignment: resume.templateId === "classic-ats" ? AlignmentType.CENTER : AlignmentType.LEFT,
    shading: resume.templateId === "profile-sidebar" ? { fill: `${accent}14`, type: ShadingType.CLEAR, color: "auto" } : undefined,
    spacing: { after: 70 },
    children: headerChildren,
  }));

  if (resume.basics.headline) {
    children.push(new Paragraph({
      alignment: resume.templateId === "classic-ats" ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { after: 55 },
      children: [new TextRun({ text: resume.basics.headline.toUpperCase(), size: 21, characterSpacing: 35, color: "46514D" })],
    }));
  }

  if (contactParts.length || resume.basics.link) {
    const contactChildren: Array<TextRun | ExternalHyperlink> = [new TextRun({ text: contactParts.join("  •  "), size: 18, color: "58635F" })];
    if (resume.basics.link) {
      const url = /^https?:\/\//i.test(resume.basics.link) ? resume.basics.link : `https://${resume.basics.link}`;
      contactChildren.push(new TextRun({ text: contactParts.length ? "  •  " : "", size: 18, color: "58635F" }));
      contactChildren.push(new ExternalHyperlink({ link: url, children: [new TextRun({ text: resume.basics.link, style: "Hyperlink", size: 18 })] }));
    }
    children.push(new Paragraph({
      alignment: resume.templateId === "classic-ats" ? AlignmentType.CENTER : AlignmentType.LEFT,
      border: { bottom: { color: accent, size: 12, style: BorderStyle.SINGLE, space: 8 } },
      spacing: { after: 130 },
      children: contactChildren,
    }));
  }

  if (resume.basics.summary) {
    children.push(heading("Profile", accent));
    children.push(new Paragraph({ text: resume.basics.summary, style: "ResumeBody", spacing: { after: 70 } }));
  }

  if (resume.experience.length) {
    children.push(heading("Experience", accent));
    for (const entry of resume.experience) {
      children.push(entryTitle(entry.position, dateRange(entry.startDate, entry.endDate)));
      if (entry.employer) children.push(new Paragraph({ children: [new TextRun({ text: entry.employer, italics: true, color: "46514D", size: 20 })], spacing: { after: 45 } }));
      children.push(...lines(entry.highlights).map(bullet));
    }
  }

  if (resume.education.length) {
    children.push(heading("Education", accent));
    for (const entry of resume.education) {
      children.push(entryTitle(entry.qualification, dateRange(entry.startDate, entry.endDate)));
      if (entry.institution) children.push(new Paragraph({ children: [new TextRun({ text: entry.institution, italics: true, color: "46514D", size: 20 })], spacing: { after: 35 } }));
      if (entry.details) children.push(new Paragraph({ text: entry.details, style: "ResumeBody", spacing: { after: 55 } }));
    }
  }

  if (list(resume.skills).length) {
    children.push(heading("Skills", accent));
    children.push(new Paragraph({ text: list(resume.skills).join("  •  "), style: "ResumeBody" }));
  }

  for (const [title, value] of [["Projects", resume.projects], ["Certifications", resume.certifications], ["Languages", resume.languages]] as const) {
    const items = lines(value);
    if (!items.length) continue;
    children.push(heading(title, accent));
    children.push(...items.map((item) => title === "Languages" ? new Paragraph({ text: item, style: "ResumeBody" }) : bullet(item)));
  }

  const document = new Document({
    numbering: {
      config: [{
        reference: "resume-bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 330, hanging: 180 } } } }],
      }],
    },
    styles: {
      default: { document: { run: { font: "Aptos", size: 20, color: "28302E" }, paragraph: { spacing: { line: 258 } } } },
      paragraphStyles: [{ id: "ResumeBody", name: "Resume Body", basedOn: "Normal", run: { font: "Aptos", size: 20, color: "28302E" }, paragraph: { spacing: { line: 258, after: 50 } } }],
    },
    sections: [{
      properties: {
        page: { margin: { top: twip(750), right: twip(850), bottom: twip(720), left: twip(850) } },
      },
      children,
    }],
  });

  return Packer.toBuffer(document);
}
