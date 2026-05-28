# Backend Docker TL;DR

Run these from the repo root in PowerShell:

```powershell
cd backend
if (!(Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d
docker build -f Dockerfile.local -t ecommerce-backend:local .
```

Run DB migrations:

```powershell
docker run --rm --env-file .env `
  -e DATABASE_URL="postgresql+psycopg2://postgres:postgres@host.docker.internal:5433/ecommerce" `
  -e REDIS_URL="redis://host.docker.internal:6379/0" `
  -e SMTP_HOST="host.docker.internal" `
  -e TRACING_ENABLED="false" `
  ecommerce-backend:local alembic upgrade head
```

Start the API:

```powershell
docker run --rm --name ecommerce_backend -p 8000:8000 --env-file .env `
  -e DATABASE_URL="postgresql+psycopg2://postgres:postgres@host.docker.internal:5433/ecommerce" `
  -e REDIS_URL="redis://host.docker.internal:6379/0" `
  -e SMTP_HOST="host.docker.internal" `
  -e TRACING_ENABLED="false" `
  ecommerce-backend:local
```

Open:

- API health: `http://localhost:8000/health`
- Swagger docs: `http://localhost:8000/docs`
- API base: `http://localhost:8000/api/v1`
- MailHog inbox: `http://localhost:8025`

Optional seed, needs internet for taxonomy data:

```powershell
docker run --rm --env-file .env `
  -e DATABASE_URL="postgresql+psycopg2://postgres:postgres@host.docker.internal:5433/ecommerce" `
  -e REDIS_URL="redis://host.docker.internal:6379/0" `
  -e SMTP_HOST="host.docker.internal" `
  -e TRACING_ENABLED="false" `
  ecommerce-backend:local python scripts/seed.py --reset --yes
```

Seed logins:

- Admin: `admin@example.com` / `Admin@123`
- Buyer: `buyer@example.com` / `Buyer@123`
- Sellers: `seed-seller-1@example.com` ... `seed-seller-5@example.com` / `Seed@123`

Shutdown:

```powershell
Ctrl+C
docker stop ecommerce_backend
docker compose down
```

Hard reset DB/cache:

```powershell
docker compose down -v
```

Notes:

- `docker-compose.yml` starts Postgres, Redis, and MailHog only.
- `host.docker.internal` lets the backend container reach those Compose services through the host-published ports.
- On native Linux Docker, add `--add-host=host.docker.internal:host-gateway` to each `docker run`.
