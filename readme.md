# Resumate

A simple, privacy-minded resume builder for freshers and experienced job seekers. Users complete a guided form, select one of three layouts, preview their resume, and download it as PDF or DOCX. There are no accounts or server-side resume storage.

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Checks

```bash
npm run typecheck
npm run build
```

To verify both export formats against a running server:

```bash
npm run smoke:exports
```

Set `RESUME_BUILDER_URL` if the application is running somewhere other than `http://localhost:3000`.

## Current MVP scope

- Six-step, mobile-friendly resume wizard
- Three visual resume styles, including photo and no-photo options
- Repeatable work experience and education sections
- Optional skills, projects, certifications, and languages
- Browser-local text draft saving
- PDF preview and PDF/DOCX downloads
- Server-side schema validation and request-size limits

See [the MVP plan](docs/mvp-plan.md) for the product boundaries and future triggers.
