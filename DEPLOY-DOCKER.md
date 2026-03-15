# Docker-Deployment

Dieses Projekt wird als statische Expo-Web-App gebaut und dann mit Nginx ausgeliefert.

## Dateien auf den Server kopieren

Per FTP oder SFTP sollte mindestens dieser Projektordner auf den Server:

- `app/`
- `assets/`
- `src/`
- `package.json`
- `package-lock.json`
- `app.json`
- `tsconfig.json`
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `docker/nginx.conf`

Am einfachsten ist es, den kompletten Ordner `einsmal-eins-expedition/` hochzuladen.

## Auf dem Linux-Server

Docker und Docker Compose Plugin installieren, dann im Projektordner ausfuhren:

```bash
docker compose build
docker compose up -d
```

Danach ist die App standardmassig auf Port `8089` erreichbar.

## Wichtige Kommandos

Container starten:

```bash
docker compose up -d
```

Container neu bauen:

```bash
docker compose up -d --build
```

Logs ansehen:

```bash
docker compose logs -f
```

Container stoppen:

```bash
docker compose down
```

## Optional: anderer Port

Falls der Server statt `8089` z. B. `3000` nutzen soll, in `docker-compose.yml` anpassen:

```yaml
ports:
  - "3000:8080"
```
