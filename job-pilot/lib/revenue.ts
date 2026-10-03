import { addDays, formatMedium, startOfMonth, startOfWeekMonday, todayISO } from "@/lib/dates"
import type { Job, PaymentKey } from "@/lib/types"

export type RevenueKind = "scheduled" | "income"

export type RevenueLine = {
  date: string
  jobId: string
  jobNumber: number
  customerName: string
  slot: PaymentKey
  amount: number
  kind: RevenueKind
}

export type RevenueRangeId = "today" | "week" | "mtd" | "custom"

const SLOT_LABEL: Record<PaymentKey, string> = {
  p1: "First deposit",
  p2: "Second deposit",
  p3: "Final payment",
}

export function slotLabel(slot: PaymentKey): string {
  return SLOT_LABEL[slot]
}

function stageRank(stage: Job["stage"]): number {
  return { L1: 1, L2: 2, L3: 3, L4: 4, L5: 5 }[stage]
}

export function revenueLines(job: Job): RevenueLine[] {
  const start = job.days[0]?.date ?? job.promiseDate
  const end = job.days[job.days.length - 1]?.date ?? job.promiseDate
  const lines: RevenueLine[] = []

  const push = (slot: PaymentKey, active: boolean, scheduledDate: string) => {
    const payment = job.payments[slot]
    if (payment.amount <= 0) return
    if (payment.paid && payment.paidDate) {
      lines.push({
        date: payment.paidDate,
        jobId: job.id,
        jobNumber: job.number,
        customerName: job.customerName,
        slot,
        amount: payment.amount,
        kind: "income",
      })
      return
    }
    if (active) {
      lines.push({
        date: scheduledDate,
        jobId: job.id,
        jobNumber: job.number,
        customerName: job.customerName,
        slot,
        amount: payment.amount,
        kind: "scheduled",
      })
    }
  }

  push("p1", stageRank(job.stage) >= 1, job.acceptedDate)
  push("p2", stageRank(job.stage) >= 4, start)
  push("p3", stageRank(job.stage) >= 5, end)
  return lines
}

export function linesInRange(jobs: Job[], start: string, end: string): RevenueLine[] {
  return jobs
    .flatMap((job) => revenueLines(job))
    .filter((line) => line.date >= start && line.date <= end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.jobNumber - b.jobNumber)
}

export function summarize(lines: RevenueLine[]): {
  scheduled: number
  income: number
  byDay: { date: string; scheduled: number; income: number }[]
} {
  let scheduled = 0
  let income = 0
  const days = new Map<string, { scheduled: number; income: number }>()
  for (const line of lines) {
    const row = days.get(line.date) ?? { scheduled: 0, income: 0 }
    row[line.kind] += line.amount
    days.set(line.date, row)
    if (line.kind === "scheduled") scheduled += line.amount
    else income += line.amount
  }
  return {
    scheduled,
    income,
    byDay: [...days.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amounts]) => ({ date, ...amounts })),
  }
}

export function rangeBounds(
  id: RevenueRangeId,
  today = todayISO(),
  custom?: { start: string; end: string },
): { start: string; end: string; label: string } {
  if (id === "today") {
    return { start: today, end: today, label: formatMedium(today) }
  }
  if (id === "week") {
    const start = startOfWeekMonday(today)
    const end = addDays(start, 6)
    return { start, end, label: `${formatMedium(start)} – ${formatMedium(end)}` }
  }
  if (id === "mtd") {
    const start = startOfMonth(today)
    return { start, end: today, label: `${formatMedium(start)} – ${formatMedium(today)}` }
  }
  const start = custom?.start && custom.start <= (custom.end || custom.start) ? custom.start : startOfMonth(today)
  const end = custom?.end && custom.end >= start ? custom.end : today
  return { start, end, label: `${formatMedium(start)} – ${formatMedium(end)}` }
}
