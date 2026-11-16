import type { Expense, MonthlySummary } from "@/types/domain";
export function expenseTotal(
  expenses: Pick<
    Expense,
    "id" | "amountSen" | "sourceType" | "sourceRecordId"
  >[],
) {
  const seen = new Set<string>();
  return expenses.reduce((sum, item) => {
    const key =
      item.sourceType === "manual"
        ? item.id
        : `${item.sourceType}:${item.sourceRecordId}`;
    if (seen.has(key)) return sum;
    seen.add(key);
    return sum + item.amountSen;
  }, 0);
}
export function summaryTotal(summaries: MonthlySummary[]) {
  return summaries.reduce((sum, item) => sum + item.totalSen, 0);
}
