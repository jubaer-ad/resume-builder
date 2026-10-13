import { z } from "zod";

const optionalText = z.string().trim().max(20_000).optional().default("");

export const BUILTIN_SECTION_IDS = ["profile", "experience", "education", "skills", "projects", "certifications", "languages"] as const;
export type BuiltinSectionId = typeof BUILTIN_SECTION_IDS[number];
export const DEFAULT_SECTION_ORDER: string[] = [...BUILTIN_SECTION_IDS];

const customSectionSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().trim().max(100),
  content: z.string().max(20_000).optional().default(""),
});

export const resumeSchema = z.object({
  templateId: z.enum(["classic-ats", "clean-modern", "profile-sidebar"]),
  basics: z.object({
    fullName: z.string().trim().min(1, "Please enter your name.").max(100),
    headline: z.string().trim().max(120).optional().default(""),
    email: z.string().trim().max(150).optional().default(""),
    phone: z.string().trim().max(50).optional().default(""),
    location: z.string().trim().max(120).optional().default(""),
    link: z.string().trim().max(300).optional().default(""),
    summary: z.string().trim().max(20_000).optional().default(""),
    photoDataUrl: z.string().max(3_000_000).optional().default(""),
  }),
  experience: z.array(z.object({
    id: z.string(),
    employer: z.string().trim().max(150),
    position: z.string().trim().max(150),
    startDate: z.string().trim().max(40),
    endDate: z.string().trim().max(40),
    highlights: z.string().trim().max(20_000),
  })).max(12),
  education: z.array(z.object({
    id: z.string(),
    institution: z.string().trim().max(150),
    qualification: z.string().trim().max(150),
    startDate: z.string().trim().max(40),
    endDate: z.string().trim().max(40),
    details: z.string().trim().max(20_000),
  })).max(12),
  skills: optionalText,
  projects: optionalText,
  certifications: optionalText,
  languages: optionalText,
  sectionOrder: z.array(z.string().max(40)).max(20).optional().default(DEFAULT_SECTION_ORDER),
  hiddenSections: z.array(z.string().max(40)).max(20).optional().default([]),
  customSections: z.array(customSectionSchema).max(8).optional().default([]),
});

export type ResumeData = z.infer<typeof resumeSchema>;
export type Experience = ResumeData["experience"][number];
export type Education = ResumeData["education"][number];
export type CustomSection = ResumeData["customSections"][number];

export const emptyResume: ResumeData = {
  templateId: "classic-ats",
  basics: {
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    link: "",
    summary: "",
    photoDataUrl: "",
  },
  experience: [],
  education: [],
  skills: "",
  projects: "",
  certifications: "",
  languages: "",
  sectionOrder: DEFAULT_SECTION_ORDER,
  hiddenSections: [],
  customSections: [],
};

export function orderedSectionIds(resume: ResumeData): string[] {
  const valid = new Set([...BUILTIN_SECTION_IDS, ...resume.customSections.map((section) => section.id)]);
  const ordered = resume.sectionOrder.filter((id, index, values) => valid.has(id) && values.indexOf(id) === index);
  for (const id of valid) if (!ordered.includes(id)) ordered.push(id);
  return ordered;
}

export function sectionIsVisible(resume: ResumeData, id: string): boolean {
  return !resume.hiddenSections.includes(id);
}

export function safeFileName(name: string): string {
  const normalized = name.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${normalized || "resume"}-resume`;
}
