# MotoLog production deployment

The application runs on Next.js App Router with server-validated Supabase sessions. Deploy the full Next.js app to Vercel; do not export it to static GitHub Pages or remove the server-side auth routes.

`vercel.json` selects Next.js, `npm ci`, the normal production build, and Singapore functions. Vercel selects a compatible Node.js version from `package.json`. `.vercelignore` excludes local environment files, downloaded runtimes, dependencies, caches and CLI credentials.

## Project and environment

Use the existing GitHub repository `manman040/MotoLog` and project name `motolog`. A connected Vercel account with access to the repository is required for a durable deployment. Use an appropriate personal/Hobby account if eligible; this task does not authorize purchasing a paid plan.

Before the production build, configure:

```dotenv
NEXT_PUBLIC_AUTH_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=https://bpglfexqhdwinteqmtzb.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<the existing public publishable key>
```

For a legacy anon key, populate `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead and leave the publishable key unset. Use the existing `.env.local` as the source of the public configuration without committing that file or printing keys. Do not add service-role keys, Google client secrets or database passwords to the frontend environment. Firebase environment variables are not required for the Supabase deployment.

Environment changes require another build because `NEXT_PUBLIC_` values are compiled into the browser bundle. Do not accept a deployed demo-only screen as a successful production release if the required Supabase configuration is missing.

## Production Google login and recovery

Once Vercel assigns the stable production domain:

1. Add the exact production `/auth/callback` URL to the Supabase Auth redirect allowlist.
2. Also allow `/auth/callback?next=/update-password` and `/auth/confirm` on that production origin for the existing password/confirmation flows.
3. Set the Supabase Site URL to the production HTTPS origin. Preserve working local redirect URLs for development.
4. Preserve all existing Google OAuth provider client settings. Google's authorized callback remains `https://bpglfexqhdwinteqmtzb.supabase.co/auth/v1/callback` because Google returns to Supabase first.
5. Configure only the needed URL fields; do not push the generated local Supabase Auth defaults over the working hosted provider configuration.

Production must use HTTPS for cookies and PWA installation. Signed-in pages and auth callbacks must retain private/no-store caching rules.

## Acceptance

After deployment, verify the production login page and manifest/icons return successful responses, signed-out dashboard requests redirect to login, Google OAuth initiates with the production callback, and the database-setup banner is gone for a signed-in real account. Test phone layout and home-screen installation on an actual phone. Completing Google's consent requires the user's interactive login. No disposable remote records should be created without authorization for those tests.

The deployment is not complete until the live URL and hosting status have been verified. This document is preparation; it does not by itself mean a site has been deployed.

References: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [environment variables](https://vercel.com/docs/environment-variables), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
