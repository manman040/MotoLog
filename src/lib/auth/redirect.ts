export function safeNext(value: string | null, fallback = "/dashboard") {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f]/.test(value)
    ? value
    : fallback;
}
export const protectedPaths = [
  "/dashboard",
  "/garage",
  "/maintenance",
  "/expenses",
  "/fuel",
  "/reminders",
  "/documents",
  "/settings",
];
export function isProtected(path: string) {
  return protectedPaths.some(
    (base) => path === base || path.startsWith(`${base}/`),
  );
}
