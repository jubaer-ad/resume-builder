import type { ResumeData } from "./resume";

export type TemplateId = ResumeData["templateId"];

export type ResumeTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  label: string;
  accent: string;
  supportsPhoto: boolean;
};

export const templates: ResumeTemplate[] = [
  {
    id: "classic-ats",
    name: "Classic ATS",
    description: "Clean, single-column layout made for online applications.",
    label: "Best for most jobs",
    accent: "#25445f",
    supportsPhoto: false,
  },
  {
    id: "clean-modern",
    name: "Clean Modern",
    description: "A calm contemporary layout with an optional photo.",
    label: "Flexible",
    accent: "#087e6a",
    supportsPhoto: true,
  },
  {
    id: "profile-sidebar",
    name: "Profile Sidebar",
    description: "A confident layout for customer-facing and creative roles.",
    label: "With photo",
    accent: "#6847a5",
    supportsPhoto: true,
  },
];

export function getTemplate(id: TemplateId): ResumeTemplate {
  return templates.find((template) => template.id === id) ?? templates[0];
}
