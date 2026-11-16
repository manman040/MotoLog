export type CallbackFailure =
  | "callback_network"
  | "callback_verifier"
  | "callback_expired"
  | "callback_denied"
  | "callback";
export function callbackFailure(
  error: { code?: string; name?: string } | null,
): CallbackFailure {
  if (!error) return "callback";
  if (
    error.name === "AuthRetryableFetchError" ||
    ["request_timeout", "unexpected_failure"].includes(error.code || "")
  )
    return "callback_network";
  if (
    ["pkce_code_verifier_not_found", "bad_code_verifier"].includes(
      error.code || "",
    )
  )
    return "callback_verifier";
  if (
    ["flow_state_not_found", "flow_state_expired", "otp_expired"].includes(
      error.code || "",
    )
  )
    return "callback_expired";
  return "callback";
}
export function callbackMessage(reason: string) {
  switch (reason) {
    case "callback_network":
      return "MotoLog could not securely connect to the sign-in service. Please try again. On a managed laptop, start the app using scripts/dev.ps1.";
    case "callback_verifier":
      return "This sign-in attempt belongs to another browser or address. Start Google sign-in again in this browser and keep using the same address (localhost or 127.0.0.1).";
    case "callback_expired":
      return "This sign-in attempt has expired or was already used. Click Continue with Google to start again.";
    case "callback_denied":
      return "Google sign-in was cancelled or denied. Please start again and allow access.";
    default:
      return "Sign-in could not be completed. Start a new sign-in attempt in this browser.";
  }
}
