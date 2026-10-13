# Simple Resume Builder — MVP Plan

## 1. MVP goal

Build a mobile-friendly website where anyone can create a professional resume by answering simple questions, selecting a template, previewing the final document, and downloading it as DOCX or PDF.

The first version should be:

- Usable without an account
- Friendly to freshers and people with little technical experience
- Fast on mobile devices and slower connections
- Private by default
- Limited to a few high-quality templates
- Easy to extend later without building scaling infrastructure now

## 2. User journey

### 2.1 Choose a resume template

- Show large template previews.
- Label templates clearly, such as “Best for most jobs,” “With photo,” and “For freshers.”
- Allow the user to change templates later without losing entered data.

### 2.2 Personal details

Collect:

- Full name
- Desired job title
- Email
- Phone number
- Location
- LinkedIn, portfolio, or another relevant link
- Optional profile photo, including basic crop and positioning controls

### 2.3 Professional introduction

- Ask whether the user is a fresher or has work experience.
- Show a short example before each field.
- Let freshers enter a career objective.
- Let experienced users enter a professional summary.

### 2.4 Experience

Collect:

- Job title
- Employer
- Location
- Start and end dates
- “I currently work here” selection
- Achievement or responsibility bullet points

Users should be able to add, remove, and move entries up or down. They must also be able to skip the entire section.

### 2.5 Education

Collect:

- Qualification
- Institution
- Location
- Start and end dates
- Optional grade or result
- Optional description

### 2.6 Skills and optional sections

Support:

- Skills
- Projects
- Certifications
- Languages
- Awards
- References, only when requested by the user

### 2.7 Review

- Display a quick browser preview while the user edits.
- Provide a **Generate final preview** action.
- Show the actual generated PDF so page breaks and final formatting can be checked.
- Highlight missing essential information without preventing otherwise valid downloads.

### 2.8 Download

- Download DOCX
- Download PDF
- Return to editing
- Start over

Every step should have **Back**, **Continue**, and **Skip** controls where applicable, along with a visible progress indicator.

## 3. Initial templates

Start with only three carefully tested templates:

| Template | Photo | Best suited for |
| --- | --- | --- |
| Classic ATS | No | Corporate jobs and online applications |
| Clean Modern | Optional | General-purpose resumes |
| Profile Sidebar | Yes | Hospitality, sales, customer-facing, and creative roles |

Each template should support:

- One to three pages without breaking
- Empty or omitted sections
- Long names and job titles
- Multiple experience and education records
- Unicode text
- Clickable email and web links
- A4 output initially
- Standard fonts available in Microsoft Word and LibreOffice

Users should not be allowed to upload their own templates in the MVP. Supporting arbitrary templates would introduce additional validation, rendering, and security requirements.

## 4. Recommended architecture

Use one TypeScript application:

```text
Browser wizard
    │
    │ resume data + optional image
    ▼
Next.js server endpoint
    │
    ├── validate and normalize data
    ├── populate selected DOCX template
    └── convert generated DOCX to PDF
              │
              ▼
      Preview or file download
```

Recommended components:

- **Next.js App Router and TypeScript** for the frontend and server endpoints
- **CSS Modules or Tailwind CSS** for the user interface
- **React Hook Form** for validation and repeatable form sections
- **Zod** as the shared resume-data schema
- **docx-templates** for populating trusted DOCX files
- **LibreOffice in headless mode** for converting the generated DOCX into PDF
- **Docker** containing Node.js, LibreOffice, and the required fonts
- **Vitest** for data and document-generation tests
- **Playwright** for the main browser workflow

This keeps the frontend and backend in one repository and one deployment. Next.js Route Handlers support POST requests and multipart form data, so a separate API service is unnecessary for the MVP.

References:

- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)
- [Next.js FormData support](https://nextjs.org/docs/app/api-reference/file-conventions/route)
- [docx-templates documentation](https://github.com/guigrpa/docx-templates/blob/master/README.md)
- [LibreOffice PDF conversion parameters](https://help.libreoffice.org/latest/en-US/text/shared/guide/pdf_params.html)
- [Next.js deployment options](https://nextjs.org/docs/app/getting-started/deploying)

`docx-templates` supports loops, conditional sections, and dynamic images. These features cover repeatable work history, optional sections, and profile photos. Only application-owned templates should be processed because templates may contain executable expressions.

The PDF should be generated from the completed DOCX using LibreOffice rather than from a separately maintained PDF layout. This gives the DOCX and PDF the closest practical visual match.

Because LibreOffice must run on the server, deploy the application as a normal Node.js Docker container rather than as a static or edge-only application.

## 5. Data and privacy

A database is not needed initially.

- Keep the working resume in browser state.
- Autosave textual data to `localStorage`.
- Keep the uploaded photo browser-side until document generation.
- Provide a visible **Delete saved draft** action.
- Send data to the server only when generating a preview or download.
- Generate documents inside a request-specific temporary directory.
- Delete temporary inputs and outputs after the response completes.
- Never include resume contents or photos in application logs.
- Set request and image-size limits.
- Accept JPEG and PNG only.
- Verify the actual uploaded file type and normalize the image before using it.

A refresh should restore the textual draft. Requiring the user to select their photo again after a full browser restart is an acceptable MVP limitation if storing it safely becomes cumbersome.

## 6. Suggested data model

```ts
type ResumeData = {
  templateId: "classic-ats" | "clean-modern" | "profile-sidebar";

  basics: {
    fullName: string;
    headline?: string;
    email?: string;
    phone?: string;
    location?: string;
    links: Array<{ label: string; url: string }>;
    summary?: string;
    photo?: UploadedPhoto;
  };

  experience: Array<{
    employer: string;
    position: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current: boolean;
    highlights: string[];
  }>;

  education: Array<{
    institution: string;
    qualification: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    result?: string;
    details?: string;
  }>;

  skills: string[];
  projects: Project[];
  certifications: Certification[];
  languages: Array<{ name: string; level?: string }>;
  awards: Award[];
};
```

Use the same schema for the form, browser preview, template generation, and API validation. Individual templates should not define competing data structures.

## 7. Proposed application structure

```text
app/
  page.tsx
  builder/page.tsx
  api/resumes/generate/route.ts

components/
  builder/
    BuilderShell.tsx
    StepNavigation.tsx
    PersonalDetailsStep.tsx
    SummaryStep.tsx
    ExperienceStep.tsx
    EducationStep.tsx
    SkillsStep.tsx
    OptionalSectionsStep.tsx
    ReviewStep.tsx
  preview/
  template-gallery/

lib/
  resume/
    schema.ts
    defaults.ts
    normalize.ts
    draft-storage.ts
  documents/
    generate-docx.ts
    convert-to-pdf.ts
    generate-resume.ts
    template-registry.ts

templates/
  classic-ats/
    template.docx
    thumbnail.webp
    metadata.json
  clean-modern/
  profile-sidebar/

tests/
  fixtures/
  documents/
  e2e/
```

## 8. Generation API

One generation endpoint is sufficient:

```http
POST /api/resumes/generate
Content-Type: multipart/form-data

data: JSON resume data
photo: optional image
format: docx | pdf
```

For the final preview, call the same endpoint with `format=pdf` and display the response in the browser. Downloads must use the same generator rather than a separate rendering path.

## 9. Important UX rules

- Use ordinary language such as “What job do you want?” rather than “Professional headline.”
- Explain each field with a short example.
- Never make work experience mandatory.
- Allow incomplete dates, such as only a year.
- Use buttons rather than drag-and-drop for ordering entries on mobile.
- Automatically hide empty sections in generated resumes.
- Preserve entered information when the user changes templates.
- Warn when content is likely to create an unusually long resume, but do not silently remove it.
- Ensure full keyboard navigation, visible labels, sufficient contrast, and readable error messages.
- Design the data model for Unicode from the beginning, but launch the interface in one language first.

## 10. Delivery plan

### Phase 1: Foundation

- Create the Next.js application and Docker setup.
- Define the Zod resume schema and representative test fixtures.
- Build the wizard shell, navigation, draft saving, and responsive layout.
- Add template selection.

**Completion condition:** A user can complete the entire form, refresh the page, and recover their textual draft.

### Phase 2: Document generation

- Create the Classic ATS DOCX template first.
- Populate text, repeatable entries, optional sections, and links.
- Add PDF conversion.
- Return generated files with safe filenames.
- Add generation timeouts and temporary-file cleanup.

**Completion condition:** One representative resume downloads successfully in both formats and opens correctly in Microsoft Word and LibreOffice.

### Phase 3: Preview and photo support

- Add final PDF preview.
- Add photo selection, crop, normalization, and size validation.
- Add the two remaining templates.
- Test missing sections and long content.

**Completion condition:** All three templates work with their supported photo modes, and the final preview matches the downloaded PDF.

### Phase 4: MVP hardening

- Add keyboard and mobile workflow tests.
- Test Unicode, long names, empty sections, two-page resumes, and malformed uploads.
- Add clear retry messages for generation failures.
- Add a privacy notice and delete-draft control.
- Deploy the single Docker container.

**Completion condition:** A new user can build and download a resume on both phone and desktop without assistance.

## 11. MVP acceptance criteria

The MVP is complete when:

- No account is required.
- Users can choose among three templates.
- At least one template supports a headshot and one excludes it.
- Freshers can complete a resume without entering work experience.
- Relevant sections and entries can be skipped, added, removed, and reordered.
- Switching templates preserves entered data.
- A final PDF preview is available.
- DOCX and PDF downloads work.
- Empty sections do not leave blank headings or obvious gaps.
- Temporary server files are deleted.
- No resume content is intentionally persisted server-side.
- The primary workflow works on a small mobile screen and with keyboard navigation.

## 12. Explicitly deferred

Do not include these features in the first version:

- Authentication or user accounts
- Server-side resume storage
- Payments
- AI-generated summaries or bullet points
- User-uploaded DOCX templates
- A template editor
- Cover letters
- Applicant tracking or job applications
- Collaboration or public sharing links
- Multiple paper sizes
- A fully multilingual interface
- Analytics containing resume data
- Microservices, queues, object storage, or Kubernetes

Add a database and accounts only when users need cross-device history. Add a job queue or separate conversion worker only when synchronous generation becomes measurably unreliable under real traffic. These boundaries keep the initial product focused and maintainable.
