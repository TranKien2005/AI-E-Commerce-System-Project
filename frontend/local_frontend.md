# Frontend Dev TL;DR

Use `npm` here because this repo has `package-lock.json`.

Prereq:

- Node.js 20+
- Backend running at `http://localhost:8000`

Install deps:

```powershell
cd frontend
npm ci
```

Start storefront in one terminal:

```powershell
npm run dev:storefront
```

Start admin in another terminal:

```powershell
npm run dev:admin
```

Open:

- Storefront: `http://localhost:3000`
- Admin: `http://localhost:3001`
- Backend docs: `http://localhost:8000/docs`

If your backend is not on the default URL:

```powershell
$env:NEXT_PUBLIC_API_BASE_URL="http://localhost:8000/api/v1"
npm run dev:storefront
```

Use the same env var before `npm run dev:admin` if needed.

Useful logins if backend seed ran:

- Admin: `admin@example.com` / `Admin@123`
- Buyer: `buyer@example.com` / `Buyer@123`
- Sellers: `seed-seller-1@example.com` ... `seed-seller-5@example.com` / `Seed@123`

Notes:

- This project has two Next.js apps: `storefront` on `3000`, `admin` on `3001`.
- Default API base is already `http://localhost:8000/api/v1`.
- Stop each dev server with `Ctrl+C`.
