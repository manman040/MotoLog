# Verification

## Supabase integration — 16 November 2026

- TypeScript: passed after regenerating Next.js route artifacts.
- ESLint: passed.
- Application/unit/component tests: **33 passed**, including Supabase signup/login/recovery UI, redirect validation, secret-key rejection and session-cookie proxy tests using mocked SDK responses.
- Production build: passed. A Windows/OneDrive read-only build artifact was resolved by removing only the generated `.next` directory before rebuilding.
- Desktop/phone Playwright regression: **4 passed** in the final uninterrupted run (1.3 minutes).
- `.env.local` and `.env.example` include empty public Supabase configuration fields; no secrets were supplied or logged.
- Supabase SQL migrations and Storage policies: generated and source-reviewed, **not applied or executed**. No remote Supabase database changes were made.
- Live Supabase Auth, SQL triggers/RLS and Storage checks remain pending public configuration and approval to apply migrations in a test project. The mocked tests do not substitute for those acceptance checks. See [Supabase setup](supabase-setup.md).

## Original Firebase implementation

Development verification completed across 15–16 November 2026 on Windows using the workspace-local Node.js 24 runtime. Firebase emulator tests used Java 21. No production Firebase credentials were present.

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, no warnings |
| `npm test` | 22 passed across unit, component and demo integration tests |
| `npm run build` | Passed; all App Router routes compiled and prerendered where applicable |
| `npm run test:security` | 10 passed using Auth, Firestore and Storage emulators |
| Desktop Playwright workflows | 2 passed |
| `npm run test:e2e -- --project=phone` | 2 passed on the final phone rerun |

The interrupted overnight browser run passed desktop tests but its phone browser did not finish. A fresh phone-only run passed both workflows in 37.2 seconds. The final aggregate browser result is therefore two passing desktop workflows and two passing phone workflows across those separate runs, not one uninterrupted four-test run. An earlier uninterrupted four-test run also passed before the final small accessibility refinements.

Browser workflows cover route protection, explicit demo entry, dashboard rendering, phone overflow, adding a vehicle, adding a service, adding an expense, dashboard activity, sign-out, adding mileage, logging fuel, creating a custom reminder, and document create/delete. Dashboard screenshots were inspected during development.

Emulator tests cover actual Authentication SDK registration/sign-in/sign-out, reset and verification email requests; actual repository transactions for moving service costs between months and deletion; authorized and anonymous reads; cross-user vehicle, expense and document access; ownership mutation rejection; field/amount validation; paired odometer writes; and file type, size and ownership checks.

Not verified against a live project: Google OAuth, external email delivery, production App Check enforcement, hosting rollout, real billing configuration, physical-device PWA installation and physical iOS Safari behavior. These require the project setup described in [README](../README.md). Offline account synchronization and background notifications are not implemented or advertised.

The test runner emitted a non-failing Vite configuration-loader migration notice. It does not affect the passing tests or application build.
