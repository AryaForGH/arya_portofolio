# Personal portfolio

A React + Vite portfolio backed by Supabase. Public pages read only published data. Admin writes, message management, and Storage changes require a Supabase Auth user whose `app_metadata.role` is `admin`. There is intentionally no seed identity or fabricated portfolio content.

## Run locally

1. Install Node.js 20.19+ (or 22.12+) and npm.
2. Copy `.env.example` to `.env.local` and fill in:
   - `VITE_SUPABASE_URL`: Supabase project URL.
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: current Supabase publishable key (`sb_publishable_...`) or legacy anon/public key. Never use a `service_role` or secret key here.
3. Apply both SQL migrations in the order documented below from the Supabase SQL Editor (or `supabase db push` after linking the CLI).
4. Deploy the Edge Functions as described below.
5. Run `npm install`, then `npm run dev`. On Windows PowerShell where `npm.ps1` is blocked, use `npm.cmd`.

Without Supabase credentials the site displays a setup notice and an editable-content empty state. It does not substitute mock portfolio records.

## Supabase and first admin

1. Create a Supabase project. In **Project Settings → API**, copy the project URL and the publishable key (or legacy anon key) into `.env.local`.
2. Apply migrations in order from the Supabase SQL Editor: `supabase/migrations/202610090001_portfolio.sql`, `supabase/migrations/202610090002_education_cv.sql`, then `supabase/migrations/202610090003_contact_phone.sql`. They create the portfolio tables, indexes, `updated_at` triggers, RLS policies, Storage buckets, and the private rate-limit table/function. They do not drop existing objects or insert sample data. Review any name conflicts before applying them to a database that already uses these names.
3. Use a valid email address controlled by the administrator. The app does not invent an email or ask visitors to register.
4. Bootstrap once from a trusted local machine after `npm install`. In PowerShell, set the service URL, service-role key, email and username as process-only environment variables; retrieve the secret values using secure prompts, not a source file:

   ```powershell
   $env:SUPABASE_URL = Read-Host "Supabase project URL"
   $secret = Read-Host "Supabase service_role key" -AsSecureString
   $env:SUPABASE_SERVICE_ROLE_KEY = [System.Net.NetworkCredential]::new("", $secret).Password
   $env:BOOTSTRAP_ADMIN_EMAIL = Read-Host "Verified administrator email"
   $env:BOOTSTRAP_ADMIN_USERNAME = "cliarym"
   $secret = Read-Host "Initial admin password" -AsSecureString
   $env:BOOTSTRAP_ADMIN_PASSWORD = [System.Net.NetworkCredential]::new("", $secret).Password
   npm.cmd run bootstrap:admin
   Remove-Item Env:SUPABASE_URL, Env:SUPABASE_SERVICE_ROLE_KEY, Env:BOOTSTRAP_ADMIN_EMAIL, Env:BOOTSTRAP_ADMIN_USERNAME, Env:BOOTSTRAP_ADMIN_PASSWORD
   Remove-Variable secret
   ```

   Enter the initial password supplied by the site owner at the secure prompt. The script creates the Auth user with `app_metadata.role=admin`, records the username-to-user mapping in the RLS-protected `admin_accounts` table, and marks the account to require a password change. It does not store a password in the application database. The service-role key and bootstrap values must never be put in `.env.local`, Vercel variables, browser code, or source control. If setup fails after account creation, inspect Auth users and `admin_accounts` in the Supabase dashboard before retrying.
5. Install the Supabase CLI, authenticate, link the project, and deploy the functions:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   node -e 'require("node:fs").writeFileSync(".env.functions", "PORTFOLIO_ORIGIN=https://your-domain.example\nRATE_LIMIT_SALT=" + require("node:crypto").randomBytes(32).toString("hex") + "\n")'
   npx supabase secrets set --env-file .env.functions
   Remove-Item .env.functions
   npx supabase functions deploy login-username
   npx supabase functions deploy contact-submit
   npx supabase functions deploy change-password
   ```

   Generate a strong random `RATE_LIMIT_SALT` locally (for example, with Node `crypto.randomBytes(32).toString("hex")`) and enter it only in the CLI prompt/command.          The temporary `.env.functions` contains only the origin and a randomly generated rate-limit salt, is ignored by Git, and should be removed after the CLI call. Both public-facing functions allow five requests per IP hash per 15 minutes using the database limiter; the contact function also uses a honeypot. Supabase Auth's built-in rate limits also apply to password authentication. Set `PORTFOLIO_ORIGIN` to the exact production origin; use your local origin during local Edge Function testing. The function gateway's JWT check is disabled because the login/contact functions are intentionally public and must work with Supabase publishable keys; `change-password` validates its bearer token with Supabase Auth itself and then verifies the admin role and bootstrap flag server-side. The service-role key is supplied to deployed functions by Supabase and is never a Vite variable.
6. Sign in at `/admin/login` with username `cliarym` and the initial password. Change it when prompted. Username login resolves the private mapping server-side and then uses Supabase Auth password sign-in; only an admin-role user receives a session.

## Content model and Storage

- Edit portfolio copy as JSON translations, for example `{"id":"Halo","en":"Hello"}`. If one translation is missing, the other language is used as fallback. Arrays such as technologies, features, and gallery URLs use JSON arrays.
- Profile and site settings are editable in the admin. The profile's `section_visibility` object accepts keys `home`, `about`, `projects`, `education`, `certificates`, `experience`, `services`, and `contact`; setting a key to `false` removes the navigation item and hides that public route's content.
- `site_settings` entries used by services: set `is_public` for intentional public values; `whatsapp_number` should have a JSON string value such as `"6281234567890"`; `whatsapp_template` should contain `{service}`. Only a valid 8–15 digit international number enables the WhatsApp order button. Other settings remain private by default.
- Add education entries at `/admin/education`. The profile editor includes a visibility toggle; setting `section_visibility.education` to `false` hides the Education route and navigation link. Education content uses plain text/JSON translations, not executable HTML.
- Manage the CV at `/admin/settings/cv`. Its metadata is stored in the singleton `cv_settings` row; the PDF lives in the dedicated `portfolio-cv` bucket, with a 5 MB PDF-only upload limit. That bucket is public because its contents are exclusively intended for public CV downloads, but admin-only RLS policies protect listing and writes. The existing private `documents` bucket is not made public. The migration never changes bucket privacy if `portfolio-cv` already exists; before using that bucket, inspect it and ensure it contains no unrelated/private files, then set it public in Supabase Storage settings if needed. The public CV query only exposes metadata while the CV is active and the button is enabled.
- Set the public location, phone number, and email in the profile editor. Add social accounts in the existing Social links admin page with direct profile URLs (including WhatsApp `https://wa.me/<international-number>`, Instagram, TikTok, GitHub, and LinkedIn); published links are shown on Contact and open in a new tab. If WhatsApp is not listed there, the Contact page can create its link from the public WhatsApp number site setting or profile phone number.
- Public buckets: `profile-images`, `project-images`, `certificates`, and the isolated `portfolio-cv` bucket. The private `documents` bucket serves admin-only signed previews. The education editor accepts JPG/PNG/WebP logos and uploads them to `project-images`. The CV bucket only accepts PDFs up to 5 MB; the admin CV uploader reports upload progress, retains the prior CV on upload/metadata failure, and deletes the prior PDF only after the new file is active.
- A PDF does not automatically get a thumbnail. Upload a separate image and set the certificate's `preview_url` explicitly. Public certificate PDFs belong in the `certificates` bucket; files in `documents` are private and should not be used as public download links.
- Public RLS reads only published rows. Contact message rows have no visitor select/update policy; the server-side function inserts them, and only admin-role sessions can read, mark read, or delete them. Edge functions use the service role only on the server.

## Deployment to Vercel

1. Push this project to a private or public GitHub repository; verify `.env.local` and service credentials are not committed.
2. Import the repository in Vercel. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under Project Settings → Environment Variables for Development/Preview/Production as appropriate.
3. Deploy. `vercel.json` rewrites SPA routes to `index.html`, so `/projects/:slug` and `/admin/...` work on refresh.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to the production domain and add the production and preview redirect URLs. Username login itself returns its session directly; these values are still needed for Supabase Auth redirects and future email flows.
5. Add the final exact domain as the `PORTFOLIO_ORIGIN` Edge Function secret. Redeploy the functions after changing their code or function secrets when required.
6. To update the website, push the change to the connected GitHub branch; Vercel builds and deploys it. Apply new SQL migrations separately to Supabase.
7. Verify the live homepage, published/draft visibility, admin sign-in and logout, content editing, message flow, Storage upload/download, theme/language persistence, mobile navigation, and direct refresh on a nested URL.

## Current implementation and validation notes

- Implemented: public home/about/projects/detail/education/certificates/experience/services/contact routes; published-content queries; image-inspired static Home skill cards; education CRUD and visibility; dedicated CV settings, PDF upload progress, safe replacement/deletion, public download filename and bilingual labels; search and category/technology filters; certificate preview/download/verification; valid WhatsApp links; contact Edge Function with validation, honeypot, and database-backed rate limiting; username-to-Supabase-Auth admin sign-in; forced initial password change enforced through app metadata, an Edge Function, and RLS; protected admin routes; CRUD for profiles, projects, education, certificates, experience, services, skills, social links, site settings, and messages; Storage manager; Indonesian/English UI; persisted system-aware light/dark theme; loading/error/empty states; responsive styles; admin code splitting; Vercel rewrites.
- Not implemented: automatic PDF thumbnail generation, rich-text editor, activity log, captcha/Turnstile, content image optimization/resizing, database-backed cache, or a non-portfolio media trash/recovery flow. Portfolio text is rendered as plain React text (not HTML); no rich-text sanitization is needed.
- Build validation is performed with `npm run build`. Supabase-backed authentication, RLS, Storage policies, Edge Functions, email validity, and Vercel deployment cannot be verified without access to a configured Supabase project and Vercel account. Apply/test the SQL migration and functions in a staging project before production.
