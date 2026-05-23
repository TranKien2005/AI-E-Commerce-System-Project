# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This repository has two active areas:
- `backend/`: FastAPI + SQLAlchemy + Alembic monolith for auth, buyer, seller, admin, search, and chat flows.
- `frontend/`: Next.js + React + TypeScript workspace containing two App Router apps: `storefront/` and `admin/`.

## Development commands

### Backend

Run these from `backend/`.

- Install dependencies: `pip install -r requirements.txt`
- Start local infrastructure: `docker compose up -d`
- Run API server: `uvicorn app.main:app --reload`
- Run all tests: `pytest`
- Run one test file: `pytest tests/test_auth.py`
- Run one test case: `pytest tests/test_auth.py -k login`
- Run migrations: `alembic upgrade head`
- Create a migration: `alembic revision --autogenerate -m "message"`

### Frontend

Run these from `frontend/`.

- Install dependencies: `npm install`
- Start storefront dev server: `npm run dev` or `npm run dev:storefront` (port 3000)
- Start admin dev server: `npm run dev:admin` (port 3001)
- Build both apps: `npm run build`
- Build one app: `npm run build:storefront` or `npm run build:admin`
- Lint both apps: `npm run lint`
- Lint one app: `npm run lint:storefront` or `npm run lint:admin`
- Run Playwright tests: `npm run test:e2e`
- Run Playwright headed: `npm run test:e2e:headed`
- Start production server after a build: `npm run start:storefront` or `npm run start:admin`

## Local environment assumptions

- Backend defaults to PostgreSQL at `localhost:5433/ecommerce` via `DATABASE_URL` in `app/core/config.py`; Docker maps container port 5432 to host port 5433.
- `backend/docker-compose.yml` starts PostgreSQL, Redis, and MailHog.
- MailHog is exposed at `http://localhost:8025`; the register flow expects OTP emails to appear there.
- Frontend calls the backend at `http://localhost:8000/api/v1`.
- Backend CORS currently allows the Next.js dev server on `http://localhost:3000` and `http://127.0.0.1:3000`.

## Backend architecture

The backend is organized as a thin-router/service-layer application:

- `app/main.py` creates the FastAPI app, installs CORS, mounts the v1 router, and registers custom exception handlers.
- `app/api/v1/router.py` composes the API from role/domain routers such as `auth`, `buyer`, `seller`, `admin`, and chat/websocket support.
- Route handlers are intended to stay thin; most business logic lives in `app/services/*.py`.
- Database access is synchronous SQLAlchemy ORM through `app/db/session.py`.
- ORM models are centralized in `app/models/entities.py`; Alembic uses `app.db.base.Base.metadata` for autogeneration.

Important consequence: when changing behavior, the real implementation is usually in a service module, not the route file.

### Request/response contract

The API uses a custom response envelope instead of raw model returns:
- success: `{"success": true, "data": ..., "message": ...}` from `app/core/responses.py`
- failure: `{"success": false, "error": {"code": ..., "message": ..., "details": [...]}}`

`app/core/exceptions.py` normalizes validation errors and unhandled exceptions into this shape. The frontend Axios client depends on this convention and unwraps `response.data.data` automatically on success.

### Auth and authorization flow

- JWT creation/verification lives in `app/core/security.py` and is enforced by dependencies in `app/core/deps.py`.
- `get_current_user` loads the user from the access token and rejects non-`active` users.
- Role checks are done with `require_roles(...)`, so seller/admin access rules are dependency-based rather than inline.
- Auth business logic is in `app/services/auth_service.py`.
- OTP verification and forgot-password OTPs are stored in an in-memory dictionary today, while a comment notes Redis is the intended production backing store.
- Refresh-token revocation is also in-memory.

If you change auth semantics, check backend dependencies, auth service logic, and frontend token handling together.

### Domain model and role split

The app models a multi-role e-commerce system in one schema:
- `User` has `role` and `status` fields that drive access control.
- Buyers own carts, orders, payments, reviews, notifications, reports, and seller requests.
- Sellers own `Shop`, `Product`, `ProductImage`, shipping/order management, stats, and chatbot config.
- Admin functionality is routed separately and works on the same core entities.

Most business flows cross multiple tables. For example:
- checkout creates `Order` + `OrderItem`, decrements `Product.stock`, clears `CartItem`, creates `Notification`, and sends email
- seller order updates modify `Order`, may create notifications, and may trigger email sends
- product deletion is soft delete via `deleted_at`, not row removal

When editing a workflow, search the corresponding service first for side effects on notifications, stock, payment state, and email.

### Persistence and migrations

- Models are defined in `app/models/entities.py` and imported into metadata through `app/db/base.py`.
- Alembic is configured in `backend/alembic/env.py` to read the runtime `DATABASE_URL` from settings.
- There is an initial migration in `backend/alembic/versions/8494b1c58eb0_initial.py` that creates the core commerce schema.

If you add or rename model fields, update the ORM model first, then generate and review an Alembic migration.

### Testing shape

- Tests live in `backend/tests/` and use FastAPI `TestClient` from `tests/conftest.py`.
- The current suite is integration-style: auth, buyer, seller, admin, search, and end-to-end style flows all hit the real app.
- Test helpers log in through the real `/api/v1/auth/login` endpoint and reuse issued tokens.

Prefer keeping tests at the HTTP/API level unless there is a strong reason to unit-test internals.

## Frontend architecture

The frontend uses Next.js 16, React 19, the App Router (`app/` directory), Tailwind CSS v4, and Shadcn UI components. The root `frontend/package.json` runs app-specific commands against `storefront/` and `admin/`.

`frontend/AGENTS.md` notes that this Next.js version has breaking changes from older training data; read the relevant guide in `node_modules/next/dist/docs/` before changing Next.js APIs or conventions.

- `storefront/src/app/` contains buyer/seller/public routes including product browsing, cart, checkout, auth, seller flows, search, chat, notifications, and reports.
- `admin/src/app/` contains the admin console and login routes.
- App-local `src/components/` folders contain reusable UI components and Shadcn UI components.
- Routing is handled via Next.js App Router and `<Link>` components with smooth transitions.
- The design system uses a monochromatic cool-white palette with an Apple Store / Dyson style premium aesthetic.
- Glassmorphism is heavily used (e.g., `backdrop-blur-xl bg-white/70`).

Important consequence: frontend API work should be structured carefully considering Next.js Server vs Client components, and changes may need to be applied separately to storefront and admin. Use `next/image` for optimized image delivery.

## Cross-cutting behaviors to remember

- Email is part of normal business flows, not just account setup; buyer and seller services call `email_service` directly.
- Some stateful behavior that would normally live in external infrastructure is currently in process memory (OTP store, refresh-token revocation), so behavior can reset on server restart.
- Redis is provisioned in Docker Compose but not yet wired into the currently read auth flow.
- There is no repo-level README or existing CLAUDE.md with additional project rules, and no Cursor/Copilot instruction files were found at the repository root.
