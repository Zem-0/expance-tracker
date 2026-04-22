# Expense Tracker

A full-stack personal expense tracker with idempotent API, optimistic UI, and delete-with-undo.

---

## Running locally

```bash
# Terminal 1 — backend (http://localhost:3001)
cd backend
npm install
cp .env.example .env
npm start

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

---

## Deploying (one repo, two services)

You do **not** need two separate repositories.  
Deploy the `backend/` subfolder to Railway and the `frontend/` subfolder to Vercel.

### Step 1 — Push to GitHub

```bash
cd D:/expense-tracker
git init
git add .
git commit -m "initial commit"
# create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
git push -u origin main
```

### Step 2 — Deploy backend to Railway

1. Go to [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
2. Select your repo
3. Set **Root Directory** → `backend`
4. Railway auto-detects Node.js via `railway.toml`
5. Add a **Volume** (for SQLite persistence):
   - In Railway dashboard → your service → **Volumes** → Add volume
   - Mount path: `/data`
6. Set these **environment variables** in Railway:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DB_PATH` | `/data/expenses.db` |
   | `ALLOWED_ORIGIN` | *(leave blank for now — fill in after Vercel deploy)* |

7. Deploy. Copy the public URL (e.g. `https://expense-tracker-production.up.railway.app`)

### Step 3 — Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project → Import** your GitHub repo
2. Set **Root Directory** → `frontend`
3. Add this **environment variable**:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://your-app.up.railway.app` ← Railway URL from Step 2 |

4. Deploy. Copy the Vercel URL (e.g. `https://expense-tracker.vercel.app`)

### Step 4 — Wire CORS

Go back to Railway → your service → **Variables**, update:

```
ALLOWED_ORIGIN=https://expense-tracker.vercel.app
```

Redeploy the backend. Done.

---

## Key design decisions

### Money storage
Amounts are stored as `INTEGER` paise (₹1.50 → 150) in SQLite to avoid IEEE-754
floating-point drift. Division/display happens only at the API and UI boundary.

### Idempotency
The frontend generates a `crypto.randomUUID()` when the form mounts and sends it
with every POST as `idempotency_key`. The backend has a `UNIQUE` constraint on that
column, so double-submits (button mash, slow network retry, page reload mid-flight)
are silently deduplicated — the original record is returned. The key rotates only
after a confirmed response.

### AbortController
Every fetch is tied to an `AbortController`. When the user changes a filter or sort
option before the previous response arrives, the stale request is cancelled so it
can never overwrite newer data.

### Optimistic UI
The expense row appears immediately on submit (faded, with a pulsing dot). The form
resets instantly so the user can add the next expense without waiting. On API failure
the row is removed and the form is restored with the original values.

### Delete with undo
Clicking delete removes the row immediately from the UI and starts a 3-second timer.
The actual `DELETE /expenses/:id` call is delayed until the timer fires, giving the
user a chance to undo. If the API call fails, the row is restored automatically.

### SQLite
Chosen over in-memory/JSON file: ACID-compliant, survives restarts, WAL mode for
safe concurrent reads. Swappable for Postgres by changing the driver.

### Security
Helmet.js sets 11 security headers (HSTS, XSS protection, etc.) on every response.
CORS is locked to a configurable `ALLOWED_ORIGIN` — defaults to `*` in dev, must be
set explicitly in production.

---

## Trade-offs

- No auth / multi-user (out of scope)
- No pagination (acceptable for personal use)
- No edit — delete + re-add is the workaround
- SQLite on Railway requires a persistent volume; Postgres would remove that dependency

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Uptime check |
| `POST` | `/expenses` | Create expense (idempotent) |
| `GET` | `/expenses?category=X&sort=date_desc` | List expenses |
| `DELETE` | `/expenses/:id` | Delete expense |

## Running tests

```bash
cd backend && npm test
```
