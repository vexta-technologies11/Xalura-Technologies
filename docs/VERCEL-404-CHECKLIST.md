# Vercel 404 — dashboard checklist

Your repo is a normal **Next.js App Router** app (`app/page.tsx` = `/`). A **Vercel `404: NOT_FOUND`** with **0 function invocations** usually means the platform is **not serving this Next build** (settings), not that `page.tsx` is wrong.

## 1. Confirm GitHub has the real app

- Repo root must contain: `package.json`, `next.config.mjs`, `app/page.tsx`, `package-lock.json`.
- On GitHub, open `app/page.tsx` — if it exists, the code is there.

## 2. Vercel project → Settings → General

| Setting | Correct value |
|--------|----------------|
| **Root Directory** | **Empty** (leave blank). Not `app`, not `src`, not a subfolder. |
| **Node.js Version** | **20.x** (or match `package.json` `engines.node`). |

## 3. Build & Development Settings (same page, scroll)

| Setting | Correct value |
|--------|----------------|
| **Framework Preset** | **Next.js** |
| **Build Command** | Default, or exactly: `next build` / `npm run build` |
| **Output Directory** | **Empty** — do **not** set `out`, `dist`, `build`, or `.next` unless Vercel support told you to. |
| **Install Command** | Default (`npm install` / `npm ci` with lockfile). |

If **Output Directory** has any value, **clear it** and redeploy.

## 4. Git

- **Settings → Git**: Connected repository must be **`vexta-technologies11/Xalura-Technologies`** (or your fork that has the same files).
- **Production Branch**: **`main`**.

## 5. After changing settings

**Deployments → … → Redeploy** → turn **off** “Use existing Build Cache” once.

## 6. Test URLs (after deploy is Ready)

1. `https://YOUR-PROJECT.vercel.app/` — should show the marketing site.
2. `https://YOUR-PROJECT.vercel.app/api/health` — should return JSON: `{"ok":true,"service":"xalura-tech"}`.

- If **`/api/health` works** but **`/` is 404** → rare routing issue; share build logs.
- If **both 404** → wrong root/output/framework or wrong repo on the Vercel project.
- If **`.vercel.app` works** but **custom domain 404** → **Domains** / DNS for that domain only.

## 7. Still stuck

Create a **new** Vercel project: **Add New → Project → Import** the same GitHub repo, leave **all defaults**, add env vars, deploy. Compare with the old project.
