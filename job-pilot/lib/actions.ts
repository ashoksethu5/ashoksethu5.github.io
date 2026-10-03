import { eachDate, isValidISODate } from "@/lib/dates"
import { paymentSum } from "@/lib/money"
import { lockedConflict, placeSingleJob, rescheduleUnlocked } from "@/lib/scheduler"
import {
  isComplete,
  isLocked,
  jobTitle,
  type Job,
  type JobInput,
  type PaymentKey,
  type SchedulerData,
  type TimeOff,
} from "@/lib/types"

export type ActionResult =
  | { ok: true; data: SchedulerData; warnings: string[]; jobId?: string }
  | { ok: false; error: string }

const PAYMENT_KEYS: PaymentKey[] = ["p1", "p2", "p3"]

export function validateJobInput(input: JobInput, today: string, existing?: Job): string | null {
  if (!input.customerName.trim()) return "Enter the customer name."
  if (input.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return "Enter a valid email, or leave it blank."
  }
  if (!Number.isInteger(input.quote) || input.quote <= 0) return "Enter a quote amount greater than zero."
  if (!isValidISODate(input.promiseDate)) return "Enter the committed delivery date."
  if (input.sequence.length === 0) return "Add at least one shop or field day."
  if (input.sequence.length > 40) return "A job can't run longer than 40 work days."

  for (const key of PAYMENT_KEYS) {
    const payment = input.payments[key]
    if (!Number.isInteger(payment.amount) || payment.amount < 0) {
      return "Deposit amounts need to be zero or more."
    }
    if (existing?.payments[key].paid && payment.amount !== existing.payments[key].amount) {
      return "A deposit can't be edited after it's marked paid."
    }
    if (payment.paid) {
      if (!payment.paidDate || !isValidISODate(payment.paidDate)) {
        return "Add the date the deposit was paid."
      }
      if (payment.paidDate > today) return "Paid date can't be later than today."
    }
  }

  const paidTotal = PAYMENT_KEYS.reduce((sum, key) => {
    return sum + (existing?.payments[key].paid ? existing.payments[key].amount : 0)
  }, 0)
  if (paidTotal > input.quote) {
    return "Paid deposits already total more than the quote."
  }
  if (paymentSum(PAYMENT_KEYS.map((key) => input.payments[key])) !== input.quote) {
    return "The three deposits have to add up to the quote."
  }
  return null
}

function cleanPayments(input: JobInput): Job["payments"] {
  return {
    p1: cleanPayment(input.payments.p1),
    p2: cleanPayment(input.payments.p2),
    p3: cleanPayment(input.payments.p3),
  }
}

function cleanPayment(payment: Job["payments"]["p1"]): Job["payments"]["p1"] {
  if (!payment.paid) return { amount: payment.amount, paid: false, paidDate: null }
  return { amount: payment.amount, paid: true, paidDate: payment.paidDate }
}

function applyIdentity(job: Job, input: JobInput): Job {
  return {
    ...job,
    customerName: input.customerName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    address: input.address.trim(),
    quote: input.quote,
    promiseDate: input.promiseDate,
    sequence: [...input.sequence],
    payments: cleanPayments(input),
  }
}

export function saveDraft(data: SchedulerData, input: JobInput, today: string): ActionResult {
  const error = validateJobInput({ ...input, stage: "L1" }, today)
  if (error) return { ok: false, error }
  const id = crypto.randomUUID()
  const job: Job = {
    id,
    number: data.nextNumber,
    customerName: input.customerName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    address: input.address.trim(),
    quote: input.quote,
    promiseDate: input.promiseDate,
    acceptedDate: today,
    stage: "L1",
    sequence: [...input.sequence],
    payments: cleanPayments(input),
    days: [],
    missesPromise: false,
    onCalendar: false,
  }
  return {
    ok: true,
    jobId: id,
    warnings: [],
    data: { ...data, nextNumber: data.nextNumber + 1, jobs: [...data.jobs, job] },
  }
}

export function scheduleNewJob(data: SchedulerData, input: JobInput, today: string): ActionResult {
  const error = validateJobInput({ ...input, stage: "L2" }, today)
  if (error) return { ok: false, error }
  const id = crypto.randomUUID()
  const job: Job = {
    id,
    number: data.nextNumber,
    customerName: input.customerName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    address: input.address.trim(),
    quote: input.quote,
    promiseDate: input.promiseDate,
    acceptedDate: today,
    stage: "L2",
    sequence: [...input.sequence],
    payments: cleanPayments(input),
    days: [],
    missesPromise: false,
    onCalendar: true,
  }
  const drafted: SchedulerData = {
    ...data,
    nextNumber: data.nextNumber + 1,
    jobs: [...data.jobs, job],
  }
  const scheduled = rescheduleUnlocked(drafted, today)
  const placed = scheduled.data.jobs.find((item) => item.id === id)
  if (!placed || placed.days.length === 0) {
    return {
      ok: false,
      error: scheduled.warnings.find((warning) => warning.includes(`#${job.number}`)) ??
        "There isn't enough open crew time to put this job on the calendar.",
    }
  }
  return {
    ok: true,
    data: scheduled.data,
    jobId: id,
    warnings: scheduled.warnings.filter((warning) => warning.includes(`#${job.number}`)),
  }
}

export function updateJob(
  data: SchedulerData,
  jobId: string,
  input: JobInput,
  today: string,
  options?: { replaceSchedule?: boolean },
): ActionResult {
  const current = data.jobs.find((job) => job.id === jobId)
  if (!current) return { ok: false, error: "That job is no longer on the schedule." }
  if (isComplete(current)) {
    return { ok: false, error: "This job is complete. Paid work in L5 can't be changed." }
  }
  const error = validateJobInput(input, today, current)
  if (error) return { ok: false, error }

  let job = applyIdentity(current, input)
  job.stage = input.stage
  const sequenceChanged = input.sequence.join("-") !== current.sequence.join("-")
  const startChanged = Boolean(input.startDate && input.startDate !== current.days[0]?.date)
  const promiseChanged = input.promiseDate !== current.promiseDate

  const shouldPlace = options?.replaceSchedule !== false
  if (shouldPlace && (sequenceChanged || startChanged) && (job.onCalendar || input.startDate)) {
    const start = input.startDate || current.days[0]?.date
    if (!start) {
      job = { ...job, days: [], missesPromise: false }
    } else {
      const draft: SchedulerData = {
        ...data,
        jobs: data.jobs.map((item) => (item.id === jobId ? job : item)),
      }
      const placed = placeSingleJob(draft, jobId, start)
      if ("error" in placed) return { ok: false, error: placed.error }
      job = { ...job, days: placed.days, missesPromise: placed.missesPromise, onCalendar: true }
    }
  } else if ((promiseChanged || !shouldPlace) && job.days.length > 0) {
    const end = job.days[job.days.length - 1].date
    job = { ...job, missesPromise: end > job.promiseDate }
  }

  return {
    ok: true,
    jobId,
    warnings: job.missesPromise
      ? [`${jobTitle(job)} now finishes after the promised delivery date.`]
      : [],
    data: {
      ...data,
      jobs: data.jobs.map((item) => (item.id === jobId ? job : item)),
    },
  }
}

export function sendExistingToEstimator(
  data: SchedulerData,
  jobId: string,
  today: string,
): ActionResult {
  const current = data.jobs.find((job) => job.id === jobId)
  if (!current) return { ok: false, error: "That job is no longer on the schedule." }
  if (isComplete(current)) {
    return { ok: false, error: "This job is complete. Paid work in L5 can't be changed." }
  }
  if (isLocked(current)) {
    return { ok: false, error: "Locked jobs stay where they are. Move the stage back to L2 to let the estimator place it." }
  }
  const prepared: SchedulerData = {
    ...data,
    jobs: data.jobs.map((job) =>
      job.id === jobId
        ? { ...job, onCalendar: true, stage: job.stage === "L1" ? "L2" : job.stage }
        : job,
    ),
  }
  const scheduled = rescheduleUnlocked(prepared, today)
  const placed = scheduled.data.jobs.find((job) => job.id === jobId)
  if (!placed || placed.days.length === 0) {
    return {
      ok: false,
      error:
        scheduled.warnings.find((warning) => warning.includes(`#${current.number}`)) ??
        "There isn't enough open crew time to put this job on the calendar.",
    }
  }
  return { ok: true, data: scheduled.data, jobId, warnings: scheduled.warnings }
}

export function rerunEstimator(data: SchedulerData, today: string): ActionResult {
  const scheduled = rescheduleUnlocked(data, today)
  return { ok: true, data: scheduled.data, warnings: scheduled.warnings }
}

export function saveAndRerun(data: SchedulerData, jobId: string, input: JobInput, today: string): ActionResult {
  const willLock = input.stage === "L3" || input.stage === "L4" || input.stage === "L5"
  const saved = updateJob(data, jobId, input, today, { replaceSchedule: willLock })
  if (!saved.ok) return saved
  const current = saved.data.jobs.find((job) => job.id === jobId)
  if (!current || isComplete(current) || isLocked(current)) return saved
  if (!current.onCalendar) return sendExistingToEstimator(saved.data, jobId, today)
  return rerunEstimator(saved.data, today)
}

export function deleteJob(data: SchedulerData, jobId: string): ActionResult {
  const current = data.jobs.find((job) => job.id === jobId)
  if (!current) return { ok: false, error: "That job is no longer on the schedule." }
  if (isComplete(current)) {
    return { ok: false, error: "Completed paid jobs stay on the books." }
  }
  return {
    ok: true,
    warnings: [],
    data: { ...data, jobs: data.jobs.filter((job) => job.id !== jobId) },
  }
}

export function addStaffMember(data: SchedulerData, name: string): ActionResult {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: "Enter a name for this person." }
  if (data.staff.some((person) => person.name.toLowerCase() === trimmed.toLowerCase())) {
    return { ok: false, error: "There's already someone with that name." }
  }
  return {
    ok: true,
    warnings: [],
    data: {
      ...data,
      staff: [...data.staff, { id: crypto.randomUUID(), name: trimmed }],
    },
  }
}

export function renameStaffMember(data: SchedulerData, staffId: string, name: string): ActionResult {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: "Enter a name for this person." }
  if (
    data.staff.some(
      (person) => person.id !== staffId && person.name.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    return { ok: false, error: "There's already someone with that name." }
  }
  return {
    ok: true,
    warnings: [],
    data: {
      ...data,
      staff: data.staff.map((person) => (person.id === staffId ? { ...person, name: trimmed } : person)),
    },
  }
}

export function removeStaffMember(data: SchedulerData, staffId: string): ActionResult {
  const person = data.staff.find((item) => item.id === staffId)
  if (!person) return { ok: false, error: "That person is no longer on the crew." }
  const assigned = data.jobs.some((job) =>
    job.days.some((day) => day.shopStaffId === staffId || day.fieldStaffId === staffId),
  )
  if (assigned) {
    return {
      ok: false,
      error: `${person.name} is still assigned on the calendar. Move that work before removing them.`,
    }
  }
  return {
    ok: true,
    warnings: [],
    data: {
      ...data,
      staff: data.staff.filter((item) => item.id !== staffId),
      timeOff: data.timeOff.filter((entry) => entry.staffId !== staffId),
    },
  }
}

export function addTimeOff(
  data: SchedulerData,
  entry: Omit<TimeOff, "id">,
  today: string,
): ActionResult {
  if (!data.staff.some((person) => person.id === entry.staffId)) {
    return { ok: false, error: "Choose a person on the crew." }
  }
  if (!isValidISODate(entry.start) || !isValidISODate(entry.end)) {
    return { ok: false, error: "Enter a start and end date." }
  }
  if (entry.start > entry.end) return { ok: false, error: "The end date has to be on or after the start." }
  if (eachDate(entry.start, entry.end, 121).length > 120) {
    return { ok: false, error: "Time off can't run longer than 120 days." }
  }
  const conflict = lockedConflict(data, entry.staffId, entry.start, entry.end)
  if (conflict) return { ok: false, error: conflict }
  const next: SchedulerData = {
    ...data,
    timeOff: [...data.timeOff, { ...entry, id: crypto.randomUUID(), note: entry.note.trim() }],
  }
  const scheduled = rescheduleUnlocked(next, today)
  return {
    ok: true,
    data: scheduled.data,
    warnings: [
      "Unlocked jobs were fitted around this time off.",
      ...scheduled.warnings,
    ],
  }
}

export function removeTimeOff(data: SchedulerData, timeOffId: string, today: string): ActionResult {
  if (!data.timeOff.some((entry) => entry.id === timeOffId)) {
    return { ok: false, error: "That time off entry is already gone." }
  }
  const next: SchedulerData = {
    ...data,
    timeOff: data.timeOff.filter((entry) => entry.id !== timeOffId),
  }
  const scheduled = rescheduleUnlocked(next, today)
  return {
    ok: true,
    data: scheduled.data,
    warnings: ["Unlocked jobs were fitted back into the open days.", ...scheduled.warnings],
  }
}
