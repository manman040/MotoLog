# Enable Google sign-in for MotoLog

The app already uses Supabase OAuth with the PKCE callback route. The error `Unsupported provider: provider is not enabled` means the Google provider must be configured in Supabase.

## 1. Create a Google OAuth client

Open [Google Cloud Console](https://console.cloud.google.com/auth/clients) and select or create the project for MotoLog.

- Under Google Auth Platform, configure Branding (MotoLog, support email) and Audience.
- For a personal/public app choose the appropriate External audience. If publishing status is Testing, add your own Google email under Test users.
- Create a client with application type **Web application**.
- Under Authorized JavaScript origins, add `http://127.0.0.1:3000` (and your HTTPS app origin when deploying).
- Under Authorized redirect URIs, add the exact Supabase callback:

```text
https://bpglfexqhdwinteqmtzb.supabase.co/auth/v1/callback
```

This is Google's redirect back to **Supabase**, and is different from MotoLog's `/auth/callback` route. No native Android/iOS OAuth client is needed.

## 2. Enable Google in Supabase

Open [this project's Authentication providers](https://supabase.com/dashboard/project/bpglfexqhdwinteqmtzb/auth/providers), choose **Google**, and:

1. Enable Sign in with Google.
2. Enter the Google OAuth Web client ID.
3. Enter the matching Google client secret.
4. Save.

Keep the client secret in Supabase's provider settings. Do not put it in `.env.local`, source code, or a `NEXT_PUBLIC_` variable. The existing public Supabase URL/key in MotoLog are sufficient for the app.

## 3. Configure the application redirect

In [Supabase URL configuration](https://supabase.com/dashboard/project/bpglfexqhdwinteqmtzb/auth/url-configuration):

- Development Site URL: `http://127.0.0.1:3000`
- Add redirect URL: `http://127.0.0.1:3000/auth/callback`
- Add the corresponding HTTPS app callback URL when deploying.

Use the same hostname throughout sign-in. Do not switch between `localhost` and `127.0.0.1` mid-flow.

## 4. Try it

Return to MotoLog's login screen, refresh, and choose **Continue with Google**. For login testing, use a normal browser such as Chrome or Edge if your IDE's embedded browser blocks the Google sign-in page. If Google reports `redirect_uri_mismatch`, compare its Authorized redirect URI with the Supabase callback in step 1. If Google reports access denied while in Testing, confirm your email is an allowed test user.

No SQL migration is needed to enable Google authentication. Application database migrations are still awaiting approval independently of Auth setup.

MotoLog checks the public provider settings before redirecting, so a disabled provider produces an accessible error on the login screen rather than an unstyled JSON error page. Provider settings are not cached. Changing settings in Supabase does not require changing app code.

References: [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
