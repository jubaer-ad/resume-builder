import { z } from "zod";

const optionalText = z.string().trim().max(2000).optional().default("");

export const resumeSchema = z.object({
  templateId: z.enum(["classic-ats", "clean-modern", "profile-sidebar"]),
  basics: z.object({
    fullName: z.string().trim().min(1, "Please enter your name.").max(100),
    headline: z.string().trim().max(120).optional().default(""),
    email: z.string().trim().max(150).optional().default(""),
    phone: z.string().trim().max(50).optional().default(""),
    location: z.string().trim().max(120).optional().default(""),
    link: z.string().trim().max(300).optional().default(""),
    summary: z.string().trim().max(2000).optional().default(""),
    photoDataUrl: z.string().max(3_000_000).optional().default(""),
  }),
  experience: z.array(z.object({
    id: z.string(),
    employer: z.string().trim().max(150),
    position: z.string().trim().max(150),
    startDate: z.string().trim().max(40),
    endDate: z.string().trim().max(40),
    highlights: z.string().trim().max(2500),
  })).max(12),
  education: z.array(z.object({
    id: z.string(),
    institution: z.string().trim().max(150),
    qualification: z.string().trim().max(150),
    startDate: z.string().trim().max(40),
    endDate: z.string().trim().max(40),
    details: z.string().trim().max(1000),
  })).max(12),
  skills: optionalText,
  projects: optionalText,
  certifications: optionalText,
  languages: optionalText,
});

export type ResumeData = z.infer<typeof resumeSchema>;
export type Experience = ResumeData["experience"][number];
export type Education = ResumeData["education"][number];

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
};

export function lines(value: string): string[] {
  return value.split(/\r?\n/).map((line) => line.replace(/^[-•]\s*/, "").trim()).filter(Boolean);
}

export function list(value: string): string[] {
  return value.split(/,|\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export function safeFileName(name: string): string {
  const normalized = name.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${normalized || "resume"}-resume`;
}
