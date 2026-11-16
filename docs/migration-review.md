# Supabase migration review and deployment record

Target project: **bpglfexqhdwinteqmtzb** (`MotoLog-Web`). The user explicitly approved both corrected migrations and completed Supabase CLI login. Both migrations have now been deployed successfully. Google OAuth, the frontend design, and existing records were not changed. No remote test records were created.

## Completed deployment

- Linked only the approved project and ran a read-only preflight: no conflicting MotoLog tables, functions, buckets or shared Storage policies existed.
- Dry-run listed exactly `202611160001_motolog_schema.sql` and `202611160002_private_storage.sql`, with no seeds or roles.
- Executed the approved `db push` with an explicit project reference and `--skip-vault`. Both versions are recorded in remote migration history.
- Ran [verification-report.sql](../supabase/review/verification-report.sql) read-only against the hosted database. **All 14 checks passed:** seven tables with forced RLS, 28 authenticated owner policies, anonymous denial, immutable vehicle/odometer history privileges, six composite parent foreign keys, seven Auth owner foreign keys, registration uniqueness, eight query indexes, nine integrity triggers, an invoker-only summary RPC, three private 5 MB buckets with the expected MIME limits, exactly the three reviewed Storage policies, and enabled Storage RLS.
- Local CRUD/RLS tests passed before deployment. Hosted record creation, mutation, and upload acceptance were not executed because the approval covered the migrations, not disposable remote test data. Refreshing the signed-in app can now exercise real account reads and normal user-driven saves.

The approval and command sections below document the reviewed process; approval and deployment are complete for this project. Do not run the migrations again manually.

## Findings

1. **Fixed deployment blocker in the existing schema migration.** The expense-summary SQL used `month` as a bare alias, which PostgreSQL rejected with `42601: syntax error at or near "month"`. The existing file now uses `month_key` consistently while keeping the API's `month` JSON property. No replacement or extra migration was generated. If any version was already deployed elsewhere, do not alter its recorded history; reconcile that environment before using these files.
2. **Shared Storage policy audit required before deployment.** New bucket policies check both the user-ID folder and ownership of the parent vehicle. Existing permissive policies on `storage.objects` can nevertheless also grant access because policies combine with OR. They cannot be audited with the browser public key. Review [preflight.sql](../supabase/review/preflight.sql) in the target project's SQL editor; do not delete unrelated policies automatically.
3. **Not idempotent by design.** The files create named tables, functions, buckets and policies. They fail rather than overwrite conflicting objects. Reconcile existing objects and migration history before deployment, particularly if a file was previously run manually in the SQL editor.
4. **No destructive reset SQL.** Neither file drops/truncates tables, resets the database, or deletes existing user data as a deployment step. `DELETE` statements exist only in business triggers to remove the matching linked expense after its source service/fuel log is deleted. Foreign-key cascades intentionally clean up related records when a privileged operation deletes their parent/account. Grants/revokes intentionally restrict access to the new MotoLog tables/helpers.

## Reviewed contracts

- Seven tables: vehicles, maintenance records, odometer logs, expenses, fuel logs, maintenance schedules, vehicle documents. Payload keys are validated; money and mileage have typed generated columns and bounds. Registration numbers are unique per owner.
- Six composite `(vehicle_id, owner_id)` parent foreign keys prevent attaching an owner's record to another owner's vehicle. Ownership and parent IDs cannot be changed after creation.
- RLS is enabled and forced on all seven tables. Policies scope every operation to `auth.uid() = owner_id`. Anonymous table privileges are revoked. Vehicle deletion and odometer UPDATE/DELETE privileges are revoked from authenticated clients.
- Mileage inserts lock the parent vehicle, preserve the previous reading, enforce correction/date rules, and update current mileage in the same transaction. Stored generated columns are read from existing rows; the BEFORE triggers update JSON payloads, not generated NEW columns.
- Service/fuel changes create, update or remove their canonical linked expenses in the same transaction. Direct mutation of linked expenses is rejected. The summary RPC aggregates only owner-filtered expenses as a security-invoker function, avoiding double counting and browser history downloads.
- Indexes cover owner/vehicle cursor pagination, vehicle listing and annual expense ranges. Foreign keys and ownership filters use compatible leading index columns.
- Three private buckets enforce 5 MB limits and image/PDF MIME allowlists. Policies check the owner and parent vehicle, restrict upload paths, and provide no object UPDATE policy. Real Storage service enforcement must still be verified after deployment; local tests model its metadata and RLS only.
- The real Supabase repository reports database errors and does not fall back to local samples. Demo selection is explicit and labelled. A regression test confirms that a failed real query never calls the demo repository.

## Verification completed before approval

TypeScript, ESLint, production build, and all **45 application tests** passed. Both migration files and the two read-only audit SQL files also passed execution against the disposable local PostgreSQL test database.

`npm run test:supabase:local` applies the exact two migration files to a disposable in-memory PostgreSQL database (PGlite). It does not read `.env.local` or connect to a remote service. It verifies SQL compilation, table/RLS/bucket metadata, owner CRUD, summary totals, linked expense integrity, odometer transactions/corrections, immutable ownership/history, anonymous denial, cross-user read/write denial, and modeled Storage isolation. This is a PostgreSQL integration test with stand-ins for Supabase's Auth/Storage schemas, not a hosted Supabase acceptance test.

Read-only remote REST probes reached the configured Supabase project and returned **404 / PGRST205** for all seven expected tables. That means they are absent from the exposed schema cache, explaining the dashboard setup warning. It does not grant visibility into private catalog state or the shared Storage policies. No remote test users or records were created.

## What approval authorizes

Approve deployment of **only** these two corrected files, in this order, to **bpglfexqhdwinteqmtzb**, conditional on a clean preflight:

1. `202611160001_motolog_schema.sql`
2. `202611160002_private_storage.sql`

This creates the seven MotoLog tables, private helper functions/triggers, indexes, owner policies, expense-summary RPC, three private buckets and their policies. It does not change Google OAuth, delete/reset existing tables, import Firebase/demo data, or overwrite conflicting application objects.

Also explicitly approve isolated remote CRUD/upload verification if you want test records written after deployment. Tests must use clearly labelled disposable records and appropriate test accounts; existing personal records must not be modified. Because normal clients cannot delete vehicles or odometer history, use a dedicated test account with authorized administrative cleanup, or agree to retain an archived test vehicle. Cross-user acceptance needs two authenticated test users. Never send account passwords, service-role credentials or database passwords in chat.

## Exact deployment steps — prepared, not executed

Recommended: Supabase CLI, which records migration history. Run from the MotoLog project root in PowerShell with Node/npm available. No local Docker stack is required for these remote operations.

```powershell
# Setup/local linking and review only. init is needed because config.toml is absent.
if (!(Test-Path -LiteralPath 'supabase/config.toml')) { npx --yes supabase@latest init }
npx --yes supabase@latest login
npx --yes supabase@latest link --project-ref bpglfexqhdwinteqmtzb
npx --yes supabase@latest migration list --remote
npx --yes supabase@latest db push --dry-run --remote
```

Use the CLI's private login/password prompt. Do not put secrets into `NEXT_PUBLIC_` variables or command arguments. Before approval, run the SELECT-only [preflight.sql](../supabase/review/preflight.sql) in [this project's SQL editor](https://supabase.com/dashboard/project/bpglfexqhdwinteqmtzb/sql/new). Confirm there are no conflicting tables/functions/buckets, that shared Storage policies do not grant broad access to the three MotoLog buckets, and that migration history agrees with the local files. The dry-run must list only the two approved migrations. Stop if it proposes unrelated changes. Do not run reset, automatic history repair, seed inclusion or `--include-all` to bypass a mismatch.

**Only after explicit approval and a clean preflight:**

```powershell
npx --yes supabase@latest db push --remote
npx --yes supabase@latest migration list --remote
```

The CLI may create its migration-history metadata as part of the approved push. The two files are separate transactions: if the second fails, the first can already be committed. Inspect and resolve the second failure; do not reset the project or blindly rerun SQL.

Alternative if you prefer the SQL editor: after the same explicit approval/preflight, paste and run the complete first migration, then the complete second migration. Use the existing files verbatim, including BEGIN/COMMIT. Manual SQL execution does not automatically record Supabase CLI migration history; do not subsequently push these same files through the CLI without deliberately reconciling that history.

## After deployment

1. Run [post-deployment.sql](../supabase/review/post-deployment.sql) in the target SQL editor. Verify all seven tables, constraints, indexes, triggers, 28 owner policies, restricted grants, security-invoker RPC, three private buckets and shared Storage policies. Confirm both applied versions in CLI migration history when using the CLI path.
2. Reload MotoLog while signed in with Google. Verify real account reads work without the setup warning and without the DEMO WORKSPACE banner. Do not remove the setup-error handling merely to hide an incomplete deployment.
3. With approval for test writes, use an isolated test account to add/edit/archive a labelled vehicle; add/edit/delete service/fuel/manual expenses and a document; verify summary totals and linked rows; add normal/corrected mileage and reject invalid decreases. Check that deleting linked expenses directly is denied.
4. From a second test user and an anonymous session, verify direct API read/write denial for the first user's vehicle and all child tables. A public key alone cannot exercise authenticated-owner CRUD or inspect all security metadata.
5. Upload allowed images/PDFs, reject disallowed MIME types and files above 5 MB, verify private downloads and cross-user denial, and remove disposable uploaded objects. Signed links are short-lived bearer links and must not be shared.
6. Clean up only approved disposable data using the agreed method. Record results honestly; hosted metadata and CRUD cannot be marked passed before deployment/access is available.

References: [Supabase CLI db push](https://supabase.com/docs/reference/cli/supabase-db-push), [remote/local command targeting](https://supabase.com/docs/guides/local-development/local-and-hosted-projects), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control).
