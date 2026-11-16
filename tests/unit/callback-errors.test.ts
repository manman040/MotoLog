import { expect, it } from "vitest";
import { callbackFailure, callbackMessage } from "@/lib/auth/callback-errors";
it("distinguishes network failures from expired codes", () => {
  expect(callbackFailure({ name: "AuthRetryableFetchError" })).toBe(
    "callback_network",
  );
  expect(callbackMessage("callback_network")).not.toContain("expired");
});
it("explains browser/hostname mismatch without exposing tokens", () => {
  expect(callbackFailure({ code: "pkce_code_verifier_not_found" })).toBe(
    "callback_verifier",
  );
  expect(callbackMessage("callback_verifier")).toContain("same address");
});
it("handles used codes separately and never echoes arbitrary provider errors", () => {
  expect(callbackFailure({ code: "flow_state_not_found" })).toBe(
    "callback_expired",
  );
  expect(callbackMessage("sensitive-provider-payload")).not.toContain(
    "sensitive-provider-payload",
  );
});
