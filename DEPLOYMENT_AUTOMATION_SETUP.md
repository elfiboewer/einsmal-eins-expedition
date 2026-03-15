# Deployment Automation Setup (einsmal-eins-expedition)

Dieses Repo ist für den Standard-Flow **GitHub -> GHCR -> Portainer** vorbereitet.

## Enthalten

- CI/CD Workflow: `.github/workflows/einsmal-eins-expedition-ci-cd.yml`
- Manueller Deploy Workflow: `.github/workflows/einsmal-eins-expedition-manual-deploy.yml`
- Docker Image Build: `Dockerfile` (Expo Web Export -> Nginx Runtime)
- Portainer Stack Definition: `docker-compose.stack.yml`
- Helper Scripts:
  - `scripts/ensure-portainer-stack.mjs`
  - `scripts/portainer-stack.mjs`
  - `scripts/wait-health.mjs`

## Benötigte GitHub Secrets

### Pflicht (DEV)

- `PORTAINER_DEV_URL` *(oder `PORTAINER_URL`)*
- `PORTAINER_DEV_API_KEY` *(oder `PORTAINER_API_KEY`)*
- `PORTAINER_DEV_ENDPOINT_ID` *(oder `PORTAINER_ENDPOINT_ID`)*

### Optional

- `EINSMAL_EINS_EXPEDITION_EXTERNAL_PORT` (Default: `8089`)
- `EINSMAL_EINS_EXPEDITION_HEALTHCHECK_URL`

## Laufzeit-Defaults

- Stack Name: `einsmal-eins-expedition`
- Container Name: `einsmal-eins-expedition`
- Image: `ghcr.io/<owner>/einsmal-eins-expedition:main`
- Host-Port: `8089` -> Container-Port `8080`
- Health Endpoint (Container intern): `/health`

## Trigger

- **Auto Deploy:** Push auf `main`/`master`
- **Manuell:** GitHub Actions -> `einsmal-eins-expedition-manual-deploy`

## Lokale Checks vor Push

```bash
npm ci
npm run typecheck
npx expo export --platform web
```
