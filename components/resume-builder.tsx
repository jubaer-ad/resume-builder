"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { CustomSection, Education, emptyResume, Experience, orderedSectionIds, ResumeData, sectionIsVisible } from "@/lib/resume";
import { hasRichText, richTextBlocks, sanitizeRichText } from "@/lib/rich-text";
import { getTemplate, templates } from "@/lib/templates";

const DRAFT_KEY = "resumate-draft-v1";

const steps = [
  { name: "Template", hint: "Pick a look" },
  { name: "About you", hint: "Contact and summary" },
  { name: "Experience", hint: "Jobs and achievements" },
  { name: "Education", hint: "Studies and training" },
  { name: "More", hint: "Skills and projects" },
  { name: "Review", hint: "Preview and download" },
];

const makeId = () => Math.random().toString(36).slice(2, 10);

const blankExperience = (): Experience => ({
  id: makeId(), employer: "", position: "", startDate: "", endDate: "", highlights: "",
});

const blankEducation = (): Education => ({
  id: makeId(), institution: "", qualification: "", startDate: "", endDate: "", details: "",
});

export function ResumeBuilder() {
  const [resume, setResume] = useState<ResumeData>(emptyResume);
  const [step, setStep] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [generating, setGenerating] = useState<"pdf" | "docx" | "preview" | null>(null);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const mobileMenuButton = useRef<HTMLButtonElement>(null);
  const mobileMenu = useRef<HTMLElement>(null);

  const template = useMemo(() => getTemplate(resume.templateId), [resume.templateId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ResumeData;
        setResume({ ...emptyResume, ...parsed, basics: { ...emptyResume.basics, ...parsed.basics, photoDataUrl: "" } });
      }
    } catch {
      localStorage.removeItem(DRAFT_KEY);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const draft = { ...resume, basics: { ...resume.basics, photoDataUrl: "" } };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [resume, loaded]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    mobileMenu.current?.querySelector<HTMLButtonElement>(".step-button.active")?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileMenuOpen(false);
      mobileMenuButton.current?.focus();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  function updateBasics(field: keyof ResumeData["basics"], value: string) {
    setResume((current) => ({ ...current, basics: { ...current.basics, [field]: value } }));
  }

  function updateExperience(id: string, field: keyof Experience, value: string) {
    setResume((current) => ({
      ...current,
      experience: current.experience.map((entry) => entry.id === id ? { ...entry, [field]: value } : entry),
    }));
  }

  function updateEducation(id: string, field: keyof Education, value: string) {
    setResume((current) => ({
      ...current,
      education: current.education.map((entry) => entry.id === id ? { ...entry, [field]: value } : entry),
    }));
  }

  function moveItem(type: "experience" | "education", index: number, direction: -1 | 1) {
    setResume((current) => {
      const values = [...current[type]];
      const target = index + direction;
      if (target < 0 || target >= values.length) return current;
      [values[index], values[target]] = [values[target], values[index]];
      return { ...current, [type]: values };
    });
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!(["image/jpeg", "image/png"].includes(file.type)) || file.size > 2_000_000) {
      setMessage("Please choose a JPG or PNG image smaller than 2 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateBasics("photoDataUrl", String(reader.result));
    reader.readAsDataURL(file);
    setMessage("");
  }

  function goNext() {
    if (step === 1 && !resume.basics.fullName.trim()) {
      setMessage("Add your full name before continuing.");
      return;
    }
    setMessage("");
    setStep((current) => Math.min(steps.length - 1, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectStep(index: number) {
    setStep(index);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function generate(format: "pdf" | "docx", preview = false) {
    if (!resume.basics.fullName.trim()) {
      setMessage("Add your full name before generating your resume.");
      setStep(1);
      return;
    }

    setGenerating(preview ? "preview" : format);
    setMessage("");
    try {
      const response = await fetch("/api/resumes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, resume }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "We could not generate the file.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (preview) {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(url);
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ?? `resume.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setGenerating(null);
    }
  }

  function resetDraft() {
    if (!window.confirm("Delete this draft and start again?")) return;
    localStorage.removeItem(DRAFT_KEY);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setResume(emptyResume);
    setStep(0);
    setMessage("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => selectStep(0)} aria-label="Go to template selection">
          <span className="brand-mark">R</span>
          <span>Resumate</span>
        </button>
        <div className="topbar-actions">
          <span className="save-status">{loaded ? "Draft saved on this device" : "Loading draft…"}</span>
          <button className="text-button" onClick={resetDraft}>Start over</button>
          <button
            ref={mobileMenuButton}
            type="button"
            className="mobile-menu-button"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-steps-menu"
            aria-label={mobileMenuOpen ? "Close section navigation" : "Open section navigation"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className={mobileMenuOpen ? "mobile-menu-layer open" : "mobile-menu-layer"}>
        <button className="mobile-menu-backdrop" type="button" aria-label="Close section navigation" onClick={() => setMobileMenuOpen(false)} />
        <nav ref={mobileMenu} id="mobile-steps-menu" className="mobile-steps-menu" aria-label="Resume sections">
          <div className="mobile-menu-heading">
            <p className="eyebrow">Your resume</p>
            <span>Step {step + 1} of {steps.length}</span>
          </div>
          <ol className="steps-list">
            {steps.map((item, index) => (
              <li key={item.name}>
                <button
                  className={index === step ? "step-button active" : index < step ? "step-button complete" : "step-button"}
                  onClick={() => selectStep(index)}
                  aria-current={index === step ? "step" : undefined}
                >
                  <span className="step-number">{index < step ? "✓" : index + 1}</span>
                  <span><strong>{item.name}</strong><small>{item.hint}</small></span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="builder-layout">
        <aside className="steps-panel" aria-label="Resume steps">
          <p className="eyebrow">Your resume</p>
          <ol className="steps-list">
            {steps.map((item, index) => (
              <li key={item.name}>
                <button
                  className={index === step ? "step-button active" : index < step ? "step-button complete" : "step-button"}
                  onClick={() => selectStep(index)}
                  aria-current={index === step ? "step" : undefined}
                >
                  <span className="step-number">{index < step ? "✓" : index + 1}</span>
                  <span><strong>{item.name}</strong><small>{item.hint}</small></span>
                </button>
              </li>
            ))}
          </ol>
          <div className="privacy-note">
            <span aria-hidden="true">⌁</span>
            <p><strong>Private by default</strong>Your draft stays in this browser.</p>
          </div>
        </aside>

        <section className="editor-panel">
          <div className="mobile-progress"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
          {message && <div className="notice" role="alert">{message}</div>}

          {step === 0 && <TemplateStep resume={resume} setResume={setResume} />}
          {step === 1 && <BasicsStep resume={resume} update={updateBasics} onPhoto={handlePhoto} />}
          {step === 2 && (
            <ExperienceStep
              entries={resume.experience}
              add={() => setResume((current) => ({ ...current, experience: [...current.experience, blankExperience()] }))}
              update={updateExperience}
              remove={(id) => setResume((current) => ({ ...current, experience: current.experience.filter((item) => item.id !== id) }))}
              move={(index, direction) => moveItem("experience", index, direction)}
            />
          )}
          {step === 3 && (
            <EducationStep
              entries={resume.education}
              add={() => setResume((current) => ({ ...current, education: [...current.education, blankEducation()] }))}
              update={updateEducation}
              remove={(id) => setResume((current) => ({ ...current, education: current.education.filter((item) => item.id !== id) }))}
              move={(index, direction) => moveItem("education", index, direction)}
            />
          )}
          {step === 4 && <MoreStep resume={resume} setResume={setResume} />}
          {step === 5 && (
            <ReviewStep
              resume={resume}
              previewUrl={previewUrl}
              generating={generating}
              generate={generate}
            />
          )}

          <nav className="form-navigation" aria-label="Form navigation">
            <button className="button secondary" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>Back</button>
            <span>Step {step + 1} of {steps.length}</span>
            {step < steps.length - 1
              ? <button className="button primary" onClick={goNext}>Continue <span aria-hidden="true">→</span></button>
              : <button className="button secondary" onClick={() => setStep(1)}>Edit details</button>}
          </nav>
        </section>

        {step > 0 && step < 5 && (
          <aside className="preview-panel" aria-label="Resume preview">
            <div className="preview-heading"><span>Live preview</span><small>{template.name}</small></div>
            <ResumePreview resume={resume} />
            <p className="preview-help">The final PDF preview shows exact page breaks.</p>
          </aside>
        )}
      </div>
    </main>
  );
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="section-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></header>;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function RichTextEditor({ value, onChange, placeholder, rows = 4, label }: { value: string; onChange: (value: string) => void; placeholder?: string; rows?: number; label: string }) {
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor.current || document.activeElement === editor.current) return;
    const safeValue = sanitizeRichText(value);
    if (editor.current.innerHTML !== safeValue) editor.current.innerHTML = safeValue;
  }, [value]);

  const update = () => {
    if (editor.current) onChange(sanitizeRichText(editor.current.innerHTML));
  };

  const format = (command: string) => {
    editor.current?.focus();
    document.execCommand(command, false);
    update();
  };

  return (
    <div className="rich-editor">
      <div className="format-toolbar" role="toolbar" aria-label={`Format ${label}`}>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("bold")} aria-label="Bold"><strong>B</strong></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("italic")} aria-label="Italic"><em>I</em></button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("underline")} aria-label="Underline"><u>U</u></button>
        <span />
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("insertUnorderedList")} aria-label="Bullet list">• List</button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("insertOrderedList")} aria-label="Numbered list">1. List</button>
        <span />
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => format("justifyLeft")} aria-label="Align left">≡</button>
        <button type="button" className="align-center" onMouseDown={(event) => event.preventDefault()} onClick={() => format("justifyCenter")} aria-label="Align center">≡</button>
        <button type="button" className="align-right" onMouseDown={(event) => event.preventDefault()} onClick={() => format("justifyRight")} aria-label="Align right">≡</button>
      </div>
      <div
        ref={editor}
        className="rich-input"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={label}
        aria-multiline="true"
        data-placeholder={placeholder}
        style={{ minHeight: `${rows * 1.55 + 1.5}em` }}
        onInput={update}
        onBlur={() => {
          update();
          if (editor.current) editor.current.innerHTML = sanitizeRichText(editor.current.innerHTML);
        }}
        onPaste={(event) => {
          event.preventDefault();
          document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
          update();
        }}
      />
    </div>
  );
}

function TemplateStep({ resume, setResume }: { resume: ResumeData; setResume: React.Dispatch<React.SetStateAction<ResumeData>> }) {
  return (
    <div>
      <SectionHeading eyebrow="First, choose a style" title="Pick a template that feels like you" copy="You can switch later without losing any information." />
      <div className="template-grid">
        {templates.map((template) => (
          <button
            key={template.id}
            className={resume.templateId === template.id ? "template-card selected" : "template-card"}
            onClick={() => setResume((current) => ({ ...current, templateId: template.id }))}
          >
            <span className={`template-art ${template.id}`} style={{ "--accent": template.accent } as React.CSSProperties}>
              <i /><b /><i /><i /><b /><i /><i />
            </span>
            <span className="template-copy"><small>{template.label}</small><strong>{template.name}</strong><span>{template.description}</span></span>
            <span className="selection-mark">{resume.templateId === template.id ? "✓" : ""}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BasicsStep({ resume, update, onPhoto }: { resume: ResumeData; update: (field: keyof ResumeData["basics"], value: string) => void; onPhoto: (event: ChangeEvent<HTMLInputElement>) => void }) {
  const supportsPhoto = getTemplate(resume.templateId).supportsPhoto;
  return (
    <div>
      <SectionHeading eyebrow="About you" title="Let's start with the basics" copy="Use the contact details employers should use to reach you." />
      <div className="form-grid">
        <Field label="Full name"><input autoFocus value={resume.basics.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="e.g. Amina Rahman" /></Field>
        <Field label="Job title you want"><input value={resume.basics.headline} onChange={(e) => update("headline", e.target.value)} placeholder="e.g. Customer Service Associate" /></Field>
        <Field label="Email"><input type="email" value={resume.basics.email} onChange={(e) => update("email", e.target.value)} placeholder="you@example.com" /></Field>
        <Field label="Phone"><input type="tel" value={resume.basics.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+880 1XXX XXXXXX" /></Field>
        <Field label="Location"><input value={resume.basics.location} onChange={(e) => update("location", e.target.value)} placeholder="City, Country" /></Field>
        <Field label="LinkedIn or portfolio"><input value={resume.basics.link} onChange={(e) => update("link", e.target.value)} placeholder="linkedin.com/in/your-name" /></Field>
      </div>
      <Field label="Professional summary" hint="Write 2–4 short sentences. Freshers can describe their strengths, education, and the kind of opportunity they want.">
        <RichTextEditor rows={5} label="Professional summary" value={resume.basics.summary} onChange={(value) => update("summary", value)} placeholder="Motivated business graduate with strong communication skills…" />
      </Field>
      {supportsPhoto && (
        <div className="photo-field">
          {resume.basics.photoDataUrl ? <img src={resume.basics.photoDataUrl} alt="Selected profile" /> : <span aria-hidden="true">☺</span>}
          <div><strong>Profile photo</strong><p>Optional. Use a clear JPG or PNG smaller than 2 MB.</p><input type="file" accept="image/jpeg,image/png" onChange={onPhoto} /></div>
          {resume.basics.photoDataUrl && <button className="text-button" onClick={() => update("photoDataUrl", "")}>Remove</button>}
        </div>
      )}
    </div>
  );
}

function ExperienceStep({ entries, add, update, remove, move }: { entries: Experience[]; add: () => void; update: (id: string, field: keyof Experience, value: string) => void; remove: (id: string) => void; move: (index: number, direction: -1 | 1) => void }) {
  return (
    <div>
      <SectionHeading eyebrow="Work experience" title="Show what you've done" copy="No work experience yet? You can skip this step and add projects later." />
      {entries.length === 0 && <EmptyState icon="↗" title="No experience added" copy="Add paid work, internships, volunteering, or part-time roles—or continue without it." action="Add experience" onAction={add} />}
      {entries.map((entry, index) => (
        <EntryCard key={entry.id} title={entry.position || `Experience ${index + 1}`} index={index} total={entries.length} move={move} remove={() => remove(entry.id)}>
          <div className="form-grid">
            <Field label="Job title"><input value={entry.position} onChange={(e) => update(entry.id, "position", e.target.value)} placeholder="e.g. Sales Assistant" /></Field>
            <Field label="Employer"><input value={entry.employer} onChange={(e) => update(entry.id, "employer", e.target.value)} placeholder="Company or organization" /></Field>
            <Field label="Start date"><input value={entry.startDate} onChange={(e) => update(entry.id, "startDate", e.target.value)} placeholder="Jan 2024" /></Field>
            <Field label="End date"><input value={entry.endDate} onChange={(e) => update(entry.id, "endDate", e.target.value)} placeholder="Present" /></Field>
          </div>
          <Field label="Achievements and responsibilities" hint="Use the toolbar to emphasize text, create lists, or change alignment."><RichTextEditor rows={5} label={`Achievements for ${entry.position || `experience ${index + 1}`}`} value={entry.highlights} onChange={(value) => update(entry.id, "highlights", value)} placeholder={"Helped 40+ customers each day\nMaintained accurate sales records"} /></Field>
        </EntryCard>
      ))}
      {entries.length > 0 && <button className="add-button" onClick={add}>+ Add another experience</button>}
    </div>
  );
}

function EducationStep({ entries, add, update, remove, move }: { entries: Education[]; add: () => void; update: (id: string, field: keyof Education, value: string) => void; remove: (id: string) => void; move: (index: number, direction: -1 | 1) => void }) {
  return (
    <div>
      <SectionHeading eyebrow="Education" title="Add your education" copy="Include your most recent or relevant education first." />
      {entries.length === 0 && <EmptyState icon="⌂" title="No education added" copy="Add a school, college, university, course, or vocational qualification." action="Add education" onAction={add} />}
      {entries.map((entry, index) => (
        <EntryCard key={entry.id} title={entry.qualification || `Education ${index + 1}`} index={index} total={entries.length} move={move} remove={() => remove(entry.id)}>
          <div className="form-grid">
            <Field label="Qualification"><input value={entry.qualification} onChange={(e) => update(entry.id, "qualification", e.target.value)} placeholder="e.g. Bachelor of Business Studies" /></Field>
            <Field label="Institution"><input value={entry.institution} onChange={(e) => update(entry.id, "institution", e.target.value)} placeholder="School, college, or university" /></Field>
            <Field label="Start date"><input value={entry.startDate} onChange={(e) => update(entry.id, "startDate", e.target.value)} placeholder="2020" /></Field>
            <Field label="End date"><input value={entry.endDate} onChange={(e) => update(entry.id, "endDate", e.target.value)} placeholder="2024 or Expected 2027" /></Field>
          </div>
          <Field label="Details" hint="Optional: result, specialization, relevant subjects, or activities."><RichTextEditor rows={3} label={`Education details for ${entry.qualification || `education ${index + 1}`}`} value={entry.details} onChange={(value) => update(entry.id, "details", value)} /></Field>
        </EntryCard>
      ))}
      {entries.length > 0 && <button className="add-button" onClick={add}>+ Add another education</button>}
    </div>
  );
}

function EntryCard({ title, index, total, move, remove, children }: { title: string; index: number; total: number; move: (index: number, direction: -1 | 1) => void; remove: () => void; children: React.ReactNode }) {
  return (
    <article className="entry-card">
      <header><strong>{title}</strong><div><button onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">↑</button><button onClick={() => move(index, 1)} disabled={index === total - 1} aria-label="Move down">↓</button><button className="remove-button" onClick={remove}>Remove</button></div></header>
      {children}
    </article>
  );
}

function EmptyState({ icon, title, copy, action, onAction }: { icon: string; title: string; copy: string; action: string; onAction: () => void }) {
  return <div className="empty-state"><span>{icon}</span><h2>{title}</h2><p>{copy}</p><button className="button primary" onClick={onAction}>{action}</button></div>;
}

function MoreStep({ resume, setResume }: { resume: ResumeData; setResume: React.Dispatch<React.SetStateAction<ResumeData>> }) {
  const [newTitle, setNewTitle] = useState("");
  const [newPosition, setNewPosition] = useState("end");
  const update = (field: "skills" | "projects" | "certifications" | "languages", value: string) => setResume((current) => ({ ...current, [field]: value }));
  const ordered = orderedSectionIds(resume);
  const labels: Record<string, string> = {
    profile: "Profile",
    experience: "Experience",
    education: "Education",
    skills: "Skills",
    projects: "Projects",
    certifications: "Certifications",
    languages: "Languages",
  };
  for (const section of resume.customSections) labels[section.id] = section.title || "Untitled section";

  const toggleSection = (id: string) => setResume((current) => ({
    ...current,
    hiddenSections: current.hiddenSections.includes(id)
      ? current.hiddenSections.filter((sectionId) => sectionId !== id)
      : [...current.hiddenSections, id],
  }));

  const moveSection = (index: number, direction: -1 | 1) => setResume((current) => {
    const values = orderedSectionIds(current);
    const target = index + direction;
    if (target < 0 || target >= values.length) return current;
    [values[index], values[target]] = [values[target], values[index]];
    return { ...current, sectionOrder: values };
  });

  const addCustomSection = () => {
    const title = newTitle.trim();
    if (!title || resume.customSections.length >= 8) return;
    const section: CustomSection = { id: `custom-${makeId()}`, title, content: "" };
    setResume((current) => {
      const order = orderedSectionIds(current);
      const index = newPosition === "start" ? 0 : newPosition === "end" ? order.length : Math.max(0, order.indexOf(newPosition) + 1);
      order.splice(index, 0, section.id);
      return { ...current, customSections: [...current.customSections, section], sectionOrder: order };
    });
    setNewTitle("");
    setNewPosition("end");
  };

  const updateCustom = (id: string, changes: Partial<Pick<CustomSection, "title" | "content">>) => setResume((current) => ({
    ...current,
    customSections: current.customSections.map((section) => section.id === id ? { ...section, ...changes } : section),
  }));

  const removeCustom = (id: string) => setResume((current) => ({
    ...current,
    customSections: current.customSections.filter((section) => section.id !== id),
    sectionOrder: current.sectionOrder.filter((sectionId) => sectionId !== id),
    hiddenSections: current.hiddenSections.filter((sectionId) => sectionId !== id),
  }));

  return (
    <div>
      <SectionHeading eyebrow="Sections and content" title="Build the resume you need" copy="Choose which sections to include, arrange them, and add your own text sections." />
      <section className="section-manager" aria-labelledby="section-manager-title">
        <div className="manager-heading"><div><h2 id="section-manager-title">Resume sections</h2><p>Unchecked sections stay saved but will not appear in previews or downloads.</p></div></div>
        <div className="section-order-list">
          {ordered.map((id, index) => (
            <div className="section-order-row" key={id}>
              <label><input type="checkbox" checked={sectionIsVisible(resume, id)} onChange={() => toggleSection(id)} /><span>{labels[id]}</span>{id.startsWith("custom-") && <small>Custom</small>}</label>
              <div><button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label={`Move ${labels[id]} up`}>↑</button><button type="button" onClick={() => moveSection(index, 1)} disabled={index === ordered.length - 1} aria-label={`Move ${labels[id]} down`}>↓</button></div>
            </div>
          ))}
        </div>
        <div className="add-section-form">
          <Field label="New section title"><input value={newTitle} maxLength={100} onChange={(event) => setNewTitle(event.target.value)} placeholder="e.g. Volunteer work" /></Field>
          <Field label="Position">
            <select value={newPosition} onChange={(event) => setNewPosition(event.target.value)}>
              <option value="start">At the beginning</option>
              {ordered.map((id) => <option value={id} key={id}>After {labels[id]}</option>)}
              <option value="end">At the end</option>
            </select>
          </Field>
          <button type="button" className="button secondary" onClick={addCustomSection} disabled={!newTitle.trim() || resume.customSections.length >= 8}>Add section</button>
        </div>
      </section>
      <div className="stacked-fields">
        <Field label="Skills"><RichTextEditor rows={3} label="Skills" value={resume.skills} onChange={(value) => update("skills", value)} placeholder="Customer service, Microsoft Excel, Communication" /></Field>
        <Field label="Projects"><RichTextEditor rows={4} label="Projects" value={resume.projects} onChange={(value) => update("projects", value)} placeholder="Student budget tracker — Built a spreadsheet to…" /></Field>
        <Field label="Certifications"><RichTextEditor rows={3} label="Certifications" value={resume.certifications} onChange={(value) => update("certifications", value)} placeholder="Google Digital Marketing Certificate, 2025" /></Field>
        <Field label="Languages"><RichTextEditor rows={3} label="Languages" value={resume.languages} onChange={(value) => update("languages", value)} placeholder="Bangla — Native, English — Professional" /></Field>
        {resume.customSections.map((section) => (
          <article className="custom-section-card" key={section.id}>
            <header><input aria-label="Custom section title" value={section.title} maxLength={100} onChange={(event) => updateCustom(section.id, { title: event.target.value })} /><button type="button" className="text-button" onClick={() => removeCustom(section.id)}>Remove</button></header>
            <RichTextEditor rows={5} label={`${section.title} content`} value={section.content} onChange={(content) => updateCustom(section.id, { content })} placeholder={`Add content for ${section.title}…`} />
          </article>
        ))}
      </div>
    </div>
  );
}

function ReviewStep({ resume, previewUrl, generating, generate }: { resume: ResumeData; previewUrl: string; generating: string | null; generate: (format: "pdf" | "docx", preview?: boolean) => Promise<void> }) {
  return (
    <div>
      <SectionHeading eyebrow="Ready when you are" title="Review and download" copy="Generate the final preview to check page breaks before downloading." />
      <div className="review-toolbar">
        <button className="button primary" onClick={() => generate("pdf", true)} disabled={Boolean(generating)}>{generating === "preview" ? "Building preview…" : "Generate final preview"}</button>
        <div className="download-group">
          <button className="button secondary" onClick={() => generate("docx")} disabled={Boolean(generating)}>{generating === "docx" ? "Preparing…" : "Download DOCX"}</button>
          <button className="button dark" onClick={() => generate("pdf")} disabled={Boolean(generating)}>{generating === "pdf" ? "Preparing…" : "Download PDF"}</button>
        </div>
      </div>
      {previewUrl
        ? <iframe className="pdf-preview" src={previewUrl} title="Final resume PDF preview" />
        : <div className="review-paper"><ResumePreview resume={resume} /><div className="preview-overlay"><span>Browser preview</span><p>Generate the final preview to confirm the exported document.</p></div></div>}
      <p className="privacy-footer">Your information is sent only to create the file and is not stored on the server.</p>
    </div>
  );
}

function ResumePreview({ resume }: { resume: ResumeData }) {
  const theme = getTemplate(resume.templateId);
  const contacts = [resume.basics.email, resume.basics.phone, resume.basics.location, resume.basics.link].filter(Boolean);
  const sections = orderedSectionIds(resume).filter((id) => sectionIsVisible(resume, id));
  const customSections = new Map(resume.customSections.map((section) => [section.id, section]));

  const renderSection = (id: string) => {
    if (id === "profile" && hasRichText(resume.basics.summary)) return <PreviewSection key={id} title="Profile"><RichTextContent value={resume.basics.summary} /></PreviewSection>;
    if (id === "experience" && resume.experience.length > 0) return <PreviewSection key={id} title="Experience">{resume.experience.map((entry) => <div className="resume-entry" key={entry.id}><h4>{entry.position || "Position"}</h4><strong>{entry.employer}</strong><em>{[entry.startDate, entry.endDate].filter(Boolean).join(" – ")}</em>{hasRichText(entry.highlights) && <RichTextContent value={entry.highlights} />}</div>)}</PreviewSection>;
    if (id === "education" && resume.education.length > 0) return <PreviewSection key={id} title="Education">{resume.education.map((entry) => <div className="resume-entry" key={entry.id}><h4>{entry.qualification || "Qualification"}</h4><strong>{entry.institution}</strong><em>{[entry.startDate, entry.endDate].filter(Boolean).join(" – ")}</em>{hasRichText(entry.details) && <RichTextContent value={entry.details} />}</div>)}</PreviewSection>;
    const textSections: Record<string, [string, string]> = {
      skills: ["Skills", resume.skills],
      projects: ["Projects", resume.projects],
      certifications: ["Certifications", resume.certifications],
      languages: ["Languages", resume.languages],
    };
    if (textSections[id] && hasRichText(textSections[id][1])) return <PreviewSection key={id} title={textSections[id][0]}><RichTextContent value={textSections[id][1]} /></PreviewSection>;
    const custom = customSections.get(id);
    if (custom && custom.title.trim() && hasRichText(custom.content)) return <PreviewSection key={id} title={custom.title}><RichTextContent value={custom.content} /></PreviewSection>;
    return null;
  };

  return (
    <div className={`resume-paper ${resume.templateId}`} style={{ "--resume-accent": theme.accent } as React.CSSProperties}>
      <header className="resume-header">
        {theme.supportsPhoto && resume.basics.photoDataUrl && <img src={resume.basics.photoDataUrl} alt="" />}
        <div><h2>{resume.basics.fullName || "Your Name"}</h2><h3>{resume.basics.headline || "Your professional title"}</h3><p>{contacts.join("  •  ")}</p></div>
      </header>
      <div className="resume-body">
        {sections.map(renderSection)}
      </div>
    </div>
  );
}

function RichTextContent({ value }: { value: string }) {
  let orderedItem = 0;
  return <div className="rich-content">{richTextBlocks(value).map((block, index) => {
    const content = block.runs.map((run, runIndex) => <span key={runIndex} style={{ fontWeight: run.bold ? 700 : undefined, fontStyle: run.italic ? "italic" : undefined, textDecoration: run.underline ? "underline" : undefined }}>{run.text}</span>);
    const style = { textAlign: block.alignment } as React.CSSProperties;
    orderedItem = block.list === "number" ? orderedItem + 1 : 0;
    if (block.list === "bullet") return <ul key={index} style={style}><li>{content}</li></ul>;
    if (block.list === "number") return <ol key={index} start={orderedItem} style={style}><li>{content}</li></ol>;
    return <p key={index} style={style}>{content}</p>;
  })}</div>;
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="resume-section"><h3>{title}</h3>{children}</section>;
}
