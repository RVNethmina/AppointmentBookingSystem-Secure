# Prescripto – Secure Appointment Booking System

A MERN-stack doctor appointment booking system, hardened as part of the
SE4030 Secure Software Development assignment. It has three parts:

| Folder      | What it is                                                     |
|-------------|----------------------------------------------------------------|
| `backend/`  | Express 4 REST API (Mongoose, JWT, bcrypt, Multer, Cloudinary) |
| `frontend/` | Patient app (React 18 + Vite), including Sign in with Google   |
| `admin/`    | Administrator and doctor panel (React 18 + Vite)               |

Each vulnerability fix is its own commit. The commit message names the
finding (V1–V20), its OWASP/CWE classification, the cause and the fix.

## Requirements

- Node.js 22 LTS (see `.nvmrc`; Node 25 is not supported by `jsonwebtoken`'s dependencies)
- MongoDB (Atlas or local) and a Cloudinary account
- Optional: a Google OAuth client ID of type *Web application* for Google sign-in

## Configuration

Secrets are never committed. Copy each template and fill in the values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example admin/.env
```

The API refuses to start if `JWT_SECRET` is shorter than 32 characters.
Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Running locally

```bash
cd backend && npm ci && npm run server     # API on http://localhost:4000
cd frontend && npm ci && npm run dev       # patient app on http://localhost:5173
cd admin && npm ci && npm run dev          # admin/doctor panel on http://localhost:5174
```

## Tests

The backend has a security regression suite (node:test + supertest against an
in-memory MongoDB). Each test file covers one or more findings:

```bash
cd backend && npm test
```

## Docker deployment

```bash
docker compose up --build
```

- Patient app: http://localhost:8088, admin/doctor panel: http://localhost:8089
  (set `FRONTEND_PORT` / `ADMIN_PORT` in a root `.env` to change them).
- Only the two nginx containers publish ports. They serve the built apps, send a
  strict Content Security Policy and other security headers, and proxy `/api` to
  the API. The API is the only service that can reach MongoDB.
- Containers run as non-root with read-only file systems, no Linux capabilities
  and `no-new-privileges`.
- For Google sign-in, put `GOOGLE_CLIENT_ID=...` in the root `.env` (build argument
  for the patient app) and in `backend/.env`, and add the patient app origin to
  the OAuth client's authorised JavaScript origins.

## Continuous security pipeline

GitHub Actions runs on every push and pull request:

- `ci.yml`: backend regression tests, client builds, `npm audit --audit-level=high`
- `codeql.yml`: CodeQL static analysis with the `security-extended` queries
- `gitleaks.yml`: secret scanning of every push
- Dependabot: weekly dependency update pull requests
