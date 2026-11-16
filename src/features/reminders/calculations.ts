import { differenceInCalendarDays, parseISO } from "date-fns";
import type { Schedule } from "@/types/domain";
export type ReminderStatus =
  "Upcoming" | "Due soon" | "Due" | "Overdue" | "Completed";
export function reminderStatus(
  schedule: Pick<
    Schedule,
    "completed" | "nextDueKm" | "nextDueDate" | "warningKm" | "warningDays"
  >,
  currentKm: number,
  now: string,
): ReminderStatus {
  if (schedule.completed) return "Completed";
  const remainingKm =
    schedule.nextDueKm === null ? Infinity : schedule.nextDueKm - currentKm;
  const remainingDays = schedule.nextDueDate
    ? differenceInCalendarDays(parseISO(schedule.nextDueDate), parseISO(now))
    : Infinity;
  if (remainingKm < 0 || remainingDays < 0) return "Overdue";
  if (remainingKm === 0 || remainingDays === 0) return "Due";
  if (
    remainingKm <= schedule.warningKm ||
    remainingDays <= schedule.warningDays
  )
    return "Due soon";
  return "Upcoming";
}
