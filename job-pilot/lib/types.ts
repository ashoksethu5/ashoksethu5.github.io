export type Stage = "L1" | "L2" | "L3" | "L4" | "L5"

export type Pattern = "S" | "F" | "SF"

export type PaymentKey = "p1" | "p2" | "p3"

export type Payment = {
  amount: number
  paid: boolean
  paidDate: string | null
}

export type Assignment = {
  date: string
  pattern: Pattern
  shopStaffId: string | null
  fieldStaffId: string | null
}

export type Job = {
  id: string
  number: number
  customerName: string
  phone: string
  email: string
  address: string
  quote: number
  promiseDate: string
  acceptedDate: string
  stage: Stage
  sequence: Pattern[]
  payments: Record<PaymentKey, Payment>
  days: Assignment[]
  missesPromise: boolean
  onCalendar: boolean
}

export type StaffMember = {
  id: string
  name: string
}

export type TimeOffKind = "vacation" | "sick"

export type TimeOff = {
  id: string
  staffId: string
  start: string
  end: string
  kind: TimeOffKind
  note: string
}

export type SchedulerData = {
  version: 1
  jobs: Job[]
  staff: StaffMember[]
  timeOff: TimeOff[]
  nextNumber: number
}

export type JobInput = {
  customerName: string
  phone: string
  email: string
  address: string
  quote: number
  promiseDate: string
  sequence: Pattern[]
  payments: Record<PaymentKey, Payment>
  stage: Stage
  startDate: string | null
}

export const STAGE_ORDER: Stage[] = ["L1", "L2", "L3", "L4", "L5"]

export const STAGE_LABEL: Record<Stage, { title: string; detail: string }> = {
  L1: {
    title: "Quote accepted",
    detail: "First deposit is expected. The estimator can still move this job.",
  },
  L2: {
    title: "Scheduled",
    detail: "Work is on the calendar. The estimator can still move it.",
  },
  L3: {
    title: "Schedule sent",
    detail: "The customer has the dates. This job stays put while others move around it.",
  },
  L4: {
    title: "In progress",
    detail: "Work has started. The second deposit is expected. Dates stay locked.",
  },
  L5: {
    title: "Completed",
    detail: "Work is finished. The final payment is expected. Dates stay locked.",
  },
}

export function isLocked(job: Job): boolean {
  return job.stage === "L3" || job.stage === "L4" || job.stage === "L5"
}

export function isComplete(job: Job): boolean {
  return (
    job.stage === "L5" &&
    job.payments.p1.paid &&
    job.payments.p2.paid &&
    job.payments.p3.paid
  )
}

export function patternLabel(pattern: Pattern): string {
  if (pattern === "S") return "Shop"
  if (pattern === "F") return "Field"
  return "Shop + field"
}

export function formatSequence(sequence: Pattern[]): string {
  return sequence.join("-")
}

export function peakCrew(sequence: Pattern[]): number {
  return sequence.reduce((max, pattern) => Math.max(max, pattern === "SF" ? 2 : 1), 0)
}

export function jobTitle(job: Pick<Job, "number" | "customerName">): string {
  return `#${job.number} ${job.customerName}`
}

export function jobPath(id: string): string {
  return `/jobs/view?id=${encodeURIComponent(id)}`
}
