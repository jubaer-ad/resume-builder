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

The production stack contains one container:

- The standalone Next.js application, published only on the VPS loopback interface

The VPS needs Docker Engine with the Compose plugin, an existing Caddy service, a domain pointing to its public IP, and inbound ports 80 and 443 open.

### First deployment

Clone the repository on the VPS and enter its directory. Then create the deployment environment file:

```bash
cp .env.example .env
nano .env
```

Set `PORT` to the port Next.js should use. Compose publishes that port on `127.0.0.1` only, so it is reachable by Caddy on the VPS but not directly from the internet. Start the application:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f --tail=100
```

Add a site block to the VPS's `/etc/caddy/Caddyfile`. Enter the same numeric port configured in `.env` manually; Caddy does not read the application's `.env` file:

```caddy
resume.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Replace the example domain and port, then validate and reload Caddy:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Once DNS has reached the VPS, Caddy will obtain the TLS certificate and the application will be available at the configured HTTPS domain.

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

# Stop the application
docker compose down
```

Resume data is not stored on the VPS, so the application does not require a database or application-data backup. Caddy certificates and configuration remain managed by the VPS's system Caddy service.
