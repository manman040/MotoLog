import { format, parseISO } from "date-fns";
export const money = (sen: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(
    sen / 100,
  );
export const km = (value: number) =>
  new Intl.NumberFormat("en-MY").format(value);
export function date(value: string) {
  return value ? format(parseISO(value), "dd/MM/yyyy") : "—";
}
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function toSen(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error("Enter an amount with at most two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result > 100000000)
    throw new Error("Amount is too large.");
  return result;
}
