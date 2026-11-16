# Supabase integration and setup

Supabase browser/SSR connectivity and authentication are implemented. The existing UI, demo, Firebase repository, Firebase security rules, and tests are preserved. Both initial migrations have been approved and deployed to the current MotoLog project, including its private Storage buckets. See the [deployment record](migration-review.md). Approval instructions below apply to future deployments or other projects; do not manually rerun migrations already applied here.

## Environment

`.env.local` was created with blank values because no existing file was present. It is ignored by Git. Add only the public project URL and publishable key from Supabase Project Settings → API:

```dotenv
NEXT_PUBLIC_AUTH_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLIC_PUBLISHABLE_KEY
```

For older projects, leave the publishable key empty and put the legacy **anon** key in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Do not populate both. Never use the secret key, database password, JWT signing secret, or service-role key. The Next.js configuration rejects secret/service-role keys in these public configuration fields before building or serving the application. Nothing needs an Admin/service-role key.

Restart the development server after changing environment variables. When keys are blank, authentication controls are disabled and the explicitly selected local demo remains usable. Use `NEXT_PUBLIC_AUTH_BACKEND=firebase` to select the retained Firebase implementation. Accounts/data are not automatically migrated or merged between providers.

## Supabase Authentication settings

1. Enable the Email provider and email confirmation under Authentication → Providers. Configure your production SMTP provider for reliable email delivery and set password/rate-limit settings appropriate for your application.
2. Set the Site URL to your production application origin. For development, use `http://127.0.0.1:3000` consistently; do not mix `localhost` and `127.0.0.1` during a PKCE flow.
3. Add these allowed redirect URLs under Authentication → URL Configuration:
   - `http://127.0.0.1:3000/auth/callback`
   - `http://127.0.0.1:3000/auth/callback?next=/update-password`
   - `http://127.0.0.1:3000/auth/confirm`
   - Corresponding HTTPS URLs for your production domain.
4. Standard Supabase confirmation/recovery links use `/auth/callback` to exchange the PKCE code for cookie-backed sessions. Request and open these links in the same browser to retain the PKCE verifier.
5. For token-hash email templates (which also support opening links in another browser), use:

   Confirmation: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`

   Password recovery: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

   Keep your Site URL correct for the target environment. The confirmation handler accepts only email/signup/recovery token types and selects a fixed local destination. Callback destinations are checked to reject external redirects.

6. The existing Google sign-in button remains available. To use it with Supabase, enable the Google provider and configure its OAuth client/secret in the Supabase dashboard, using Supabase's callback URL. Those provider secrets belong in Supabase settings, never in MotoLog environment variables.

Signup without a returned session displays an inbox confirmation instruction rather than pretending to be logged in. Password reset gives a generic inbox response and routes valid recovery sessions to `/update-password`. Sign-out clears Supabase browser cookies and the local demo selection.

## Session and authorization boundaries

- `src/lib/supabase/browser.ts`: singleton browser client using the public key and `@supabase/ssr` cookie storage.
- `src/lib/supabase/server.ts`: a **new server client per request**, using awaited Next.js cookies.
- `src/proxy.ts`: refreshes/validates sessions via `auth.getUser()`, propagates refreshed cookies, and prevents private responses from being cached. It redirects unauthenticated requests to dashboard routes.
- Dashboard server layout independently validates the user. It does not trust `getSession()` or a client-only guard.
- Auth callback/confirmation routes set cookies through the request-scoped SSR client. No private data is server-cached.
- A `motolog-demo` cookie permits rendering the public demo shell. It is **not** an authentication credential or a database authorization mechanism. Client demo mode uses its separate localStorage repository. Altering this cookie cannot grant Supabase or Firebase data access; RLS and provider authorization remain mandatory.
- Supabase RLS and private Storage policies enforce actual data ownership. React user metadata is used for display only, never for authorization. Identity comes from validated Auth sessions and `auth.uid()`.

## Review these SQL files before approval

1. [202611160001_motolog_schema.sql](../supabase/migrations/202611160001_motolog_schema.sql): vehicles, maintenance records, odometer logs, expenses, fuel logs, existing reminders/documents, indexes, RLS, validation and atomic consistency triggers, and an owner-scoped expense summary function.
2. [202611160002_private_storage.sql](../supabase/migrations/202611160002_private_storage.sql): private vehicle-photo, service-receipt and vehicle-document buckets and object policies.

**Do not run `supabase db push`, paste these into the SQL editor, or execute migrations until approved.** The migrations are intentionally additive with ordinary CREATE TABLE statements: they fail on conflicting table names rather than overwrite existing tables. Review compatibility if your project already contains similarly named tables/buckets.

Tables use conventional relational ownership/vehicle/timestamp columns and the existing camelCase domain data in validated JSONB payloads. Generated typed columns expose registration, mileage, money and date query fields. Vehicle registration is unique per owner. Composite parent/owner foreign keys prevent cross-account vehicle references; owner/vehicle IDs cannot change after record creation. All application tables have RLS enabled/forced, no anonymous grants, and owner SELECT/INSERT/UPDATE/DELETE policies. Vehicle deletion and odometer mutation are denied to authenticated clients.

Odometer inserts lock their parent vehicle and atomically update current mileage, latest reading information and the audit entry. Decreases require explicit correction reasons; backdated rewrites are rejected. Service/fuel triggers create/update/delete exactly one linked expense in the same transaction. Direct edits/deletion of linked expenses are rejected. Analytics aggregate indexed, owner-filtered expense rows on the server through a security-invoker RPC; histories are not downloaded for totals and costs are not counted twice.

The Supabase repository is connected to the existing features. Account data queries report **database setup pending** when the required tables are absent; the current project's initial migrations are now deployed. Supabase authentication itself works independently of application tables. Supabase accounts never query Firestore.

## Storage

All three buckets are private, enforce 5 MB limits, and allow only JPEG/PNG/WebP, plus PDFs for receipts/documents. Object names are `{uid}/{vehicleUuid}/{fileUuid}.{extension}`. RLS checks both the UID folder and ownership of the parent vehicle. There is no UPDATE policy; replacements upload a new object. Download links are signed for 60 seconds and should not be shared. MIME checks are not malware scanning. As with the existing implementation, replaced/deleted record attachments are retained until explicitly cleaned up.

Review existing `storage.objects` policies before approval: PostgreSQL permissive policies combine with OR, so an existing broad policy could also grant access to these buckets. This migration deliberately does not delete or overwrite policies belonging to other applications.

## Verification and pending acceptance

The [migration review](migration-review.md) corrected a SQL syntax error and executed both files against a disposable local PostgreSQL engine, including CRUD/RLS and modeled Storage checks. TypeScript, lint, production build and application tests passed. The user then approved deployment; both hosted migrations and all 14 read-only metadata checks passed. No remote test-record writes were performed. Hosted CRUD/upload acceptance with disposable records remains a separate step requiring approval.

After approval, apply schema then Storage migrations in a dedicated test project, and test two distinct users plus an anonymous client. Verify cross-user read/write denial, parent/owner forgery denial, immutable ownership, correction/normal mileage behavior under concurrent writes, expense edit/delete consistency, private file MIME/size/access checks, email confirmation, password recovery, session refresh and sign-out. Run the same acceptance checks against production before opening account access.
