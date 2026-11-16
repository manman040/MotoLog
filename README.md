# MotoLog

**Supabase integration:** New accounts use Supabase when selected in `.env.local`. Both initial migrations are deployed to the current MotoLog project; see the [deployment record](docs/migration-review.md) and [Supabase setup](docs/supabase-setup.md). Firebase support below is retained as a separate backend option.

**Every vehicle. Every service. One place.**

A responsive Next.js App Router application for motorcycle and car maintenance. TypeScript strict mode, React, Tailwind CSS, shadcn-style Radix UI primitives, Lucide, Motion, Recharts, Zod, React Hook Form, Firebase Authentication, Firestore and Storage. Dependencies are pinned in `package.json` and `package-lock.json`.

## Run locally on Windows

Install Node.js 22 or 24 LTS and npm. Java 21+ is needed only for Firebase emulators. No Android tools, Flutter, Docker or native framework is used.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open **http://127.0.0.1:3000**. Without Firebase configuration, select **Explore sample garage** on the sign-in screen. If using the portable Node runtime downloaded during development, run `powershell -ExecutionPolicy Bypass -File scripts/dev.ps1` from this directory. `.tools` is ignored and is not part of the application or deployment.

The demo requires explicit selection. Sample WMoto Griffin, Honda RS150 and Proton S70 vehicles are illustrative, not vehicles attributed to the visitor. Changes use browser localStorage; they never sync to an account. Sign-in selection uses sessionStorage. Reset the sample garage in Settings. Demo file uploads are disabled. Private browsing, browser cleanup or local storage limits can remove or prevent demo persistence.

## Working features

- Email/password registration and sign-in, Google popup sign-in, verification emails, password reset and sign-out.
- Separate, user-scoped account data; an empty real account starts empty.
- Add, edit, archive and restore vehicles, deduplicate registration numbers, select an active vehicle, view history and choose a vehicle photo during creation or editing. A failed photo upload can be retried without creating another vehicle.
- Append-only odometer history with atomic vehicle mileage updates and explicit corrections retaining previous readings. Backdated odometer rewrites are rejected.
- Service CRUD, custom maintenance category names, receipt attachments, user-defined next mileage/date fields.
- Configurable reminders with mileage/date OR semantics, warning thresholds, completion and manual rescheduling. Intervals are recorded as user preferences; completion does **not** silently advance thresholds or create service records. Edit the reminder after a completed service to set the next threshold.
- Expense CRUD and monthly/yearly analytics, category/date filters, vehicle comparisons. Service and fuel records own deterministic linked expense rows; edit the original record to change a linked expense.
- Fuel logs, spending, per-litre price and full-tank interval estimates. All intermediate fills must be recorded for an estimate to be meaningful. No estimate is shown from a partially loaded page.
- Insurance/road tax metadata, optional files, expiry listings and document CRUD. No identity numbers are requested.
- Responsive desktop sidebar, phone bottom navigation, keyboard focus, accessible dialogs, reduced motion, empty/loading/error states.
- PWA manifest, PNG/maskable icons, install prompt when the browser supports it, and a public offline fallback. No private Firebase data or authenticated HTML is cached by the service worker. Internet is required for account reads/writes; offline sync and background push are not implemented.

## Firebase setup

1. Create a Firebase project in the [Firebase console](https://console.firebase.google.com/). Register a **web app** and copy its public configuration to `.env.local` using `.env.example`.
2. Authentication → Sign-in method: enable **Email/Password** and **Google**, set the Google support email, and add development/production domains under Authorized domains. Configure verification and password-reset templates and their action URLs. Google popup sign-in requires an allowed browser/domain; email/password remains available if popups are blocked.
3. Create Cloud Firestore in production mode. Choose a region appropriate for Malaysian users and your deployment. Deploy this repository's rules before using accounts.
4. Enable Cloud Storage and set `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` to the console's exact bucket name. Enable the Storage Rules → Firestore integration permission when prompted because Storage rules check vehicle existence.
5. Optionally register the web app with App Check using reCAPTCHA Enterprise, add allowed domains, and set `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`. Monitor valid traffic before enabling enforcement for Firestore, Storage, and supported Authentication operations. App Check supplements authorization; it does not replace rules. It is intentionally omitted when using emulators. See [Firebase App Check setup](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider).
6. Authenticate the Firebase CLI and deploy rules and indexes to your own explicit project:

```powershell
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes,storage --project YOUR_PROJECT_ID
```

Never put a service-account JSON, Admin SDK private key, or server secret into a `NEXT_PUBLIC_` variable. This implementation uses browser Firebase SDKs and no Admin credentials or cookie session endpoints. Protected pages contain no private server-rendered records; client route guards provide navigation convenience while Firestore/Storage rules enforce authorization.

## Emulator development

Use a separate `.env.local` with a **demo project ID**, so accidental non-emulated calls fail:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-motolog.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-motolog
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=demo-motolog.appspot.com
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456:web:motolog
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456
NEXT_PUBLIC_USE_EMULATORS=true
```

```powershell
npx firebase emulators:start --project demo-motolog
# In another terminal:
npm run dev
```

Emulator UI: http://127.0.0.1:4000. Auth: 9099, Firestore: 8080, Storage: 9199. Emulator links for password reset/verification are printed to the terminal. Emulator settings use loopback and are intended for the development laptop. Testing account flows from a separate phone requires explicit emulator host configuration; the normal hosted app works on phones without emulators.

## Data model and consistency

See [docs/architecture.md](docs/architecture.md) for paths, indexes, limits, transaction relationships and security boundaries.

Money is stored as integer sen; display uses `en-MY`/MYR. Calendar dates are ISO `YYYY-MM-DD` values, rendered as `DD/MM/YYYY`. Calendar boundaries use `Asia/Kuala_Lumpur`; Firestore created/updated timestamps use server timestamps. Formatting and domain calculations are separate from UI to support future locale preferences.

## Tests and checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
# Java 21+ on PATH:
npm run test:security
```

Vitest covers reminder boundaries, mileage corrections, expense totals, money, valid fuel intervals, forms, validation/error/empty states and demo repository consistency. Playwright runs protected-route and garage/service/expense/dashboard/sign-out workflows at desktop and phone sizes. Emulator tests cover Auth registration/sign-in/reset/verification requests, actual Firestore repository transactions, anonymous/cross-user access, ownership changes, invalid data, atomic mileage, and Storage MIME/size/ownership.

Emulator verification tests request verification emails; they do not prove external email deliverability. Google OAuth, production App Check, billing configuration, real uploads and installation on physical devices require your configured Firebase project and manual acceptance testing. Automated Chromium phone emulation is not a physical iOS Safari test.

## Deploy with Firebase App Hosting

1. Keep `.env.local` out of Git. Commit the source and lockfile to your repository.
2. In Firebase App Hosting, create a backend connected to the repository and choose the repository root as the app root. `apphosting.yaml` contains conservative runtime scaling defaults.
3. Set every required `NEXT_PUBLIC_FIREBASE_*` variable in the backend environment **before building**. Next.js bundles these values at build time. Set the optional App Check site key there too. See [App Hosting environment configuration](https://firebase.google.com/docs/app-hosting/configure).
4. Deploy rules/indexes/Storage rules with the explicit production project ID, then trigger the backend rollout. Build command: `npm run build`; start command: `npm start`.
5. Add the generated HTTPS domain to Firebase Auth and reCAPTCHA Enterprise allowed domains. Verify sign-in, isolated account data, uploads, reminders and manifest in the deployed environment.
6. To add a custom domain, use the App Hosting backend's domain setup, enter the hostname, add the supplied DNS verification/routing records at your registrar, and wait for DNS and managed TLS provisioning. Authorize the new domain in Auth and reCAPTCHA, then test OAuth and email action links.

App Hosting uses a compatible Next.js server environment. A standard Node.js Next.js host is also suitable. This project is not configured as a static GitHub Pages export; dynamic vehicle routes and any future authenticated server operations need a compatible host. Classic Firebase Hosting requires an appropriate server/framework backend rather than simply uploading this project directory.

Firebase App Hosting requires a billing-enabled Blaze project. Cloud Storage availability also depends on Firebase billing requirements; budget for Storage usage and downloads. Firestore, build infrastructure, Cloud Run and reCAPTCHA Enterprise can incur charges beyond applicable allowances. Confirm current quotas and region-specific prices in [Firebase pricing](https://firebase.google.com/pricing) and [App Hosting costs](https://firebase.google.com/docs/app-hosting/costs). Set billing alerts; they are notifications, not guaranteed spending caps.

## Current scope

Single-owner MVP: family sharing, background push, offline synchronization, automatic manufacturer intervals, OCR and bulk exports are outside this version. Record search/date/category filters and sorting apply to **loaded pages**, with an explicit Load more button. Overview sections disclose truncation beyond 20 reminders/documents per vehicle. Vehicle lists currently support the latest 100 vehicles; larger fleets need vehicle pagination and server-maintained overview summaries. Stored user-owned monthly summaries are optimized dashboard caches, not tamper-proof accounting ledgers. Deleting records retains their uploaded files for recovery; remove unused objects in the Firebase console. Replaced attachments are likewise retained.
