# The Cyber Grimoire

A personal English-language publishing archive, built with React, TypeScript, a Cloudflare Worker/Hono API, D1, and R2. The public experience is a restrained, typography-led archive in deep purple; the private dashboard supports a single administrator, draft and publishing workflows, editable block templates, and protected media uploads.

The private input materials remain in `md data for AI (not posting on github)/`. That directory is ignored by Git and is not referenced or copied into the app or its production assets. Keep the originals in place; do not commit them.

## Requirements

- Node.js 20+ and npm
- A Cloudflare account with Workers, D1, and R2 enabled for deployment
- Wrangler CLI access (the project-local version is installed with npm)

## Local development

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create local secrets from the safe example and set a unique admin credential:

   ```powershell
   Copy-Item .dev.vars.example .dev.vars
   ```

   Edit `.dev.vars`. Use a long, unique password. This file is ignored by Git.

3. Configure `wrangler.toml` with a D1 database ID. For local-only development, Wrangler accepts a placeholder ID; for a Cloudflare deployment, replace it with the ID returned by `wrangler d1 create`.

4. Apply the local schema and build the frontend assets:

   ```powershell
   npm run db:local
   npm run build
   ```

5. In one terminal start the local Worker (D1 and R2 bindings):

   ```powershell
   npm run dev:worker
   ```

6. In another terminal start Vite:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:5173`. Vite proxies `/api` requests to Wrangler on port 8787. The public site is empty until entries are published; sign in at `/admin` to create categories, entries, and media.

After changing Worker code, Wrangler reloads it. After changing frontend code, Vite hot reloads. Rebuild before testing the Worker's static asset fallback or deploying.

## Cloudflare resources and first deployment

1. Install dependencies and authenticate:

   ```powershell
   npm install
   npx wrangler login
   ```

2. Create the production D1 database and R2 bucket:

   ```powershell
   npx wrangler d1 create the-cyber-grimoire
   npx wrangler r2 bucket create the-cyber-grimoire-media
   ```

   Copy the D1 `database_id` from Wrangler's output into `wrangler.toml`. The configured R2 bucket name must match the created bucket.

3. Provision the one administrator as Cloudflare Worker secrets. Use unique, private values; do not put production credentials in `.dev.vars`, source, or frontend configuration:

   ```powershell
   npx wrangler secret put ADMIN_USERNAME
   npx wrangler secret put ADMIN_PASSWORD
   ```

   `ADMIN_PASSWORD` is verified with PBKDF2-SHA-256 (600,000 iterations); sessions are random, hashed in D1, HttpOnly, SameSite=Strict, and Secure in production. There is no registration flow or default account. Missing secrets cause login to return a configuration error.

4. Apply the migration remotely and deploy:

   ```powershell
   npm run db:remote
   npm run deploy
   ```

5. Visit the Worker URL and `/admin`. The initial seeded categories and site title are in the D1 migration. Change public and secondary titles under **Site settings**.

### Future schema changes

Add a new ordered SQL migration under `migrations/`, apply locally first, then remotely:

```powershell
npm run db:local
npm run db:remote
```

### Recovery and media handling

- D1 stores content, relationships, settings, session hashes, and media metadata; R2 stores the binary objects.
- Draft media is private. A media URL is publicly served only while that file is linked to a published entry.
- Back up D1 and R2 separately using Cloudflare's supported export/backup workflows. Store backups outside this repository, restrict access, and test restoration before relying on them.
- If an administrator credential is lost, replace the Worker secrets through Wrangler. Existing sessions can be cleared from D1 by deleting rows from `admin_sessions`.

## Product and editor

- The public visual system uses a restrained deep-purple palette, editorial serif typography, and simple surfaces, with subtle twinkling stars, a soft cursor glow, a rotating record, and pull-cord mobile navigation. Publishing, archive, search, music, and admin interactions remain independent of presentation.
- `/` home, `/archive`, `/category/:slug`, `/tag/:slug`, `/post/:slug`, `/music`, and `/about`
- `/admin` single-owner login and dashboard, with post editing, categories, site identity, and media library
- The canvas editor supports editable starter templates, text/Markdown, quotes, image/gallery, audio, MP4, PDF, code, LaTeX, callouts, dividers, tables, generated contents lists, spacers, reordering, duplication, deletion, layout choices, preview modes, drafts, publishing, and unpublishing.
- Published content is read from D1. Search, category/tag/content-type/date filters, sorting, paging, random entry, related entries, reading progress, table of contents, local bookmarks, code copy, and a persistent opt-in player are implemented.
- Upload limits are 24 MB. File types are allow-listed and identified from file signatures (JPEG, PNG, GIF, WebP, MP3, WAV, OGG, MP4, PDF); extensions and browser MIME declarations alone are not trusted. Do not upload material you do not have permission to publish.
- The database initializes a “Listening Room” playlist. Owners can create and curate additional playlists from uploaded audio; published playlist tracks appear in the public music archive and persistent player.

## Validation

```powershell
npm run typecheck
npm run build
npm audit
npx wrangler deploy --dry-run
```

`typecheck` and `build` validate TypeScript; `build` also produces deployable static assets. `deploy --dry-run` packages the Worker and reports its configured bindings without publishing. For end-to-end API checks, apply the D1 migration and use the local Worker. No public database-backed entries are seeded by default. See [TESTING_REPORT.md](./TESTING_REPORT.md) for the validation performed for this implementation.

## Architecture and known refinements

The implementation uses native React block composition rather than a heavyweight third-party canvas editor; two-column presentation is a responsive reading layout, not arbitrary free-positioning. Richer media metadata workflows, advanced image optimization, and automated browser/integration tests remain areas for follow-up. The owner-provided planning documents are private development references and are intentionally excluded from Git and production assets. The Cloudflare production deployment must be completed from an account that owns the Worker, D1 database, and R2 bucket.
