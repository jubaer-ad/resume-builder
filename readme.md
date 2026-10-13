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
- Selectable, reorderable sections plus positioned custom text sections
- Rich-text formatting for multiline resume content in previews and exports
- Browser-local text draft saving
- PDF preview and PDF/DOCX downloads
- Server-side schema validation and request-size limits

See [the MVP plan](docs/mvp-plan.md) for the product boundaries and future triggers.

## Deploy to an Ubuntu VPS

The production stack contains two containers:

- The standalone Next.js application, available only inside the Compose network
- Caddy, which exposes ports 80/443 and automatically manages HTTPS

The VPS needs Docker Engine with the Compose plugin, a domain pointing to its public IP, and inbound ports 80 and 443 open.

### First deployment

Clone the repository on the VPS and enter its directory. Then create the deployment environment file:

```bash
cp .env.example .env
nano .env
```

Replace `resume.example.com` with the real domain. Start the stack:

`PORT` controls the internal Next.js port. Compose passes the same value to Caddy automatically, so it normally does not need to be changed from `3000`.

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f --tail=100
```

Once DNS has reached the VPS, Caddy will obtain the TLS certificate and the application will be available at `https://your-domain.example`.

Do not expose the configured application `PORT` in the VPS firewall. Only SSH, HTTP, and HTTPS are needed:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
```

### Verify the deployed generators

Run the export smoke test inside the application container:

```bash
docker compose exec app \
  sh -c 'RESUME_BUILDER_URL=http://localhost:$PORT npm run smoke:exports'
```

The command should report valid PDF and DOCX signatures.

### Deploy an update

```bash
git pull
docker compose up -d --build
docker image prune -f
```

### Useful operations

```bash
# View recent logs
docker compose logs --tail=100

# Restart the application
docker compose restart app

# Stop the stack without deleting HTTPS certificate data
docker compose down
```

Resume data is not stored on the VPS, so the application does not require a database or application-data backup. The named Caddy volumes preserve certificates and configuration between container replacements.
