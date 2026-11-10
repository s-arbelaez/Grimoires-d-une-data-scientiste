# Testing report

## Results

| Check | Result | Notes |
|---|---|---|
| `npm run build` | Passed | TypeScript project build and Vite production build completed. |
| `npm run typecheck` | Passed | Standalone TypeScript check completed. |
| `npm audit` | Passed | Zero known dependency vulnerabilities reported. |
| `npm run db:local` | Passed | Local D1 migration applied; rerunning reports no pending migration. |
| `npx wrangler deploy --dry-run` | Passed | Worker packaged with D1, R2, Assets, and `COOKIE_SECURE` bindings; no deployment performed. |
| Browser smoke check | Passed | Public home page and admin sign-in/dashboard rendered locally; responsive visual review prompted a hero layout adjustment. |
| Art direction and interaction check | Passed | Reviewed the traced nave, articulated bat wings, and lace framing; at 375px there was no horizontal overflow or hero-content collision; the pull-cord opened all navigation links; cursor aura has no center dot; rose-petal release and page-specific hidden notes work. The API-backed archive needs the local Worker, which was not running during this visual-only check. |
| Local Worker API checks | Passed | Authentication, unauthorized access rejection, draft privacy, publishing, combined search/filtering, settings, sitemap, and robots routes were exercised. |
| Media and playlist checks | Passed | Invalid file signatures were rejected; published image access and revocation on unpublish, audio playlist visibility, playlist management, default-playlist protection, and cross-origin mutation rejection were exercised. |

## Scope and limitations

- Production deployment and remote D1/R2 behavior were not tested because they require the owner's Cloudflare account and resources.
- The local API and browser checks are manual integration/smoke checks; the repository does not yet include an automated test suite.
- Audio was verified through upload and playlist visibility, not through an end-to-end audible playback test across browsers.
- The media workflow supports the documented file types and size limit, but does not yet provide advanced image optimization or rich per-asset metadata.
- `wrangler deploy --dry-run` validates packaging and bindings only; it does not provision Cloudflare resources or verify production secrets.

## Deploying after validation

Create the Cloudflare D1 database and R2 bucket, replace the D1 placeholder ID in `wrangler.toml`, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` as Worker secrets, then run `npm run db:remote` and `npm run deploy`. See the deployment steps in [README.md](./README.md).
