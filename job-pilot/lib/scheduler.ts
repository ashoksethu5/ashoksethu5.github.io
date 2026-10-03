import { addDays, formatWeekday } from "@/lib/dates"
import { holidaySpan, isClosedDay } from "@/lib/holidays"
import {
  isLocked,
  jobTitle,
  type Assignment,
  type Job,
  type Pattern,
  type SchedulerData,
  type StaffMember,
  type TimeOff,
} from "@/lib/types"

type Slot = {
  jobId: string
  jobNumber: number
  side: "S" | "F"
}

export type Occupancy = Map<string, Map<string, Slot>>

type PlaceArgs = {
  sequence: Pattern[]
  staff: StaffMember[]
  timeOff: TimeOff[]
  occupied: Occupancy
  holidays: Map<string, string>
  preferredShop: string | null
  preferredField: string | null
}

export function staffOffOn(date: string, timeOff: TimeOff[]): Set<string> {
  const off = new Set<string>()
  for (const entry of timeOff) {
    if (entry.start <= date && date <= entry.end) off.add(entry.staffId)
  }
  return off
}

export function buildOccupancy(jobs: Job[]): Occupancy {
  const occupied: Occupancy = new Map()
  for (const job of jobs) {
    for (const day of job.days) {
      let row = occupied.get(day.date)
      if (!row) {
        row = new Map()
        occupied.set(day.date, row)
      }
      if (day.shopStaffId) {
        row.set(day.shopStaffId, { jobId: job.id, jobNumber: job.number, side: "S" })
      }
      if (day.fieldStaffId) {
        row.set(day.fieldStaffId, { jobId: job.id, jobNumber: job.number, side: "F" })
      }
    }
  }
  return occupied
}

function availableStaff(date: string, staff: StaffMember[], timeOff: TimeOff[]): StaffMember[] {
  const off = staffOffOn(date, timeOff)
  return staff.filter((person) => !off.has(person.id))
}

function nextOpenDay(
  from: string,
  includeStart: boolean,
  staff: StaffMember[],
  timeOff: TimeOff[],
  holidays: Map<string, string>,
): string | null {
  let date = includeStart ? from : addDays(from, 1)
  for (let i = 0; i < 400; i++) {
    if (!isClosedDay(date, holidays) && availableStaff(date, staff, timeOff).length > 0) {
      return date
    }
    date = addDays(date, 1)
  }
  return null
}

function pickStaff(
  date: string,
  staff: StaffMember[],
  timeOff: TimeOff[],
  occupied: Occupancy,
  exclude: Set<string>,
  prefer: string | null,
): string | null {
  const off = staffOffOn(date, timeOff)
  const booked = occupied.get(date)
  const free = staff.filter(
    (person) => !off.has(person.id) && !booked?.has(person.id) && !exclude.has(person.id),
  )
  if (prefer && free.some((person) => person.id === prefer)) return prefer
  return free[0]?.id ?? null
}

function placeFrom(start: string, args: PlaceArgs): { days: Assignment[] } | { error: string } {
  if (isClosedDay(start, args.holidays)) {
    return { error: `${formatWeekday(start)} is a weekend or holiday. Pick another first day.` }
  }
  if (availableStaff(start, args.staff, args.timeOff).length === 0) {
    return { error: `${formatWeekday(start)} has no crew in. Pick another first day.` }
  }

  const days: Assignment[] = []
  let shopPrefer = args.preferredShop
  let fieldPrefer = args.preferredField
  let date = start

  for (let index = 0; index < args.sequence.length; index++) {
    if (index > 0) {
      const next = nextOpenDay(date, false, args.staff, args.timeOff, args.holidays)
      if (!next) return { error: "Could not find another open workday for this sequence." }
      date = next
    }

    const pattern = args.sequence[index]
    const exclude = new Set<string>()
    let shopStaffId: string | null = null
    let fieldStaffId: string | null = null

    if (pattern === "F" || pattern === "SF") {
      fieldStaffId = pickStaff(date, args.staff, args.timeOff, args.occupied, exclude, fieldPrefer)
      if (!fieldStaffId) {
        return {
          error: `${formatWeekday(date)} needs a field tech, and every available person is already booked.`,
        }
      }
      exclude.add(fieldStaffId)
      fieldPrefer = fieldStaffId
    }

    if (pattern === "S" || pattern === "SF") {
      shopStaffId = pickStaff(date, args.staff, args.timeOff, args.occupied, exclude, shopPrefer)
      if (!shopStaffId) {
        return {
          error: `${formatWeekday(date)} needs a shop tech, and every available person is already booked.`,
        }
      }
      shopPrefer = shopStaffId
    }

    days.push({ date, pattern, shopStaffId, fieldStaffId })
  }

  return { days }
}

function occupy(occupied: Occupancy, job: Job) {
  for (const day of job.days) {
    let row = occupied.get(day.date)
    if (!row) {
      row = new Map()
      occupied.set(day.date, row)
    }
    if (day.shopStaffId) {
      row.set(day.shopStaffId, { jobId: job.id, jobNumber: job.number, side: "S" })
    }
    if (day.fieldStaffId) {
      row.set(day.fieldStaffId, { jobId: job.id, jobNumber: job.number, side: "F" })
    }
  }
}

export function findPlacement(args: {
  sequence: Pattern[]
  earliest: string
  promiseDate: string
  staff: StaffMember[]
  timeOff: TimeOff[]
  occupied: Occupancy
  holidays: Map<string, string>
  fixedStart?: string
  preferredShop?: string | null
  preferredField?: string | null
}): { days: Assignment[]; missesPromise: boolean } | { error: string } {
  if (args.sequence.length === 0) return { error: "Add at least one work day." }
  if (args.staff.length === 0) return { error: "Add staff before scheduling work." }

  const placeArgs: PlaceArgs = {
    sequence: args.sequence,
    staff: args.staff,
    timeOff: args.timeOff,
    occupied: args.occupied,
    holidays: args.holidays,
    preferredShop: args.preferredShop ?? null,
    preferredField: args.preferredField ?? null,
  }

  if (args.fixedStart) {
    const placed = placeFrom(args.fixedStart, placeArgs)
    if ("error" in placed) return placed
    const end = placed.days[placed.days.length - 1]?.date ?? args.fixedStart
    return { days: placed.days, missesPromise: end > args.promiseDate }
  }

  let probe = args.earliest
  let firstFit: Assignment[] | null = null
  for (let attempt = 0; attempt < 180; attempt++) {
    const start = nextOpenDay(probe, true, args.staff, args.timeOff, args.holidays)
    if (!start) break
    const placed = placeFrom(start, placeArgs)
    if ("days" in placed) {
      const end = placed.days[placed.days.length - 1].date
      if (!firstFit) firstFit = placed.days
      if (end <= args.promiseDate) {
        return { days: placed.days, missesPromise: false }
      }
    }
    probe = addDays(start, 1)
  }

  if (firstFit) {
    const end = firstFit[firstFit.length - 1].date
    return { days: firstFit, missesPromise: end > args.promiseDate }
  }

  return {
    error: "There aren't enough open crew days in the next six months to place this sequence.",
  }
}

function cloneData(data: SchedulerData): SchedulerData {
  return {
    ...data,
    staff: data.staff.map((person) => ({ ...person })),
    timeOff: data.timeOff.map((entry) => ({ ...entry })),
    jobs: data.jobs.map((job) => ({
      ...job,
      sequence: [...job.sequence],
      days: job.days.map((day) => ({ ...day })),
      payments: {
        p1: { ...job.payments.p1 },
        p2: { ...job.payments.p2 },
        p3: { ...job.payments.p3 },
      },
    })),
  }
}

export function rescheduleUnlocked(
  data: SchedulerData,
  today: string,
): { data: SchedulerData; warnings: string[] } {
  const next = cloneData(data)
  const holidays = holidaySpan(today)
  const occupied = buildOccupancy(next.jobs.filter((job) => isLocked(job)))
  const warnings: string[] = []
  const queue = next.jobs
    .filter((job) => job.onCalendar && !isLocked(job))
    .sort((a, b) => {
      if (a.promiseDate !== b.promiseDate) return a.promiseDate < b.promiseDate ? -1 : 1
      if (a.quote !== b.quote) return b.quote - a.quote
      return a.number - b.number
    })

  for (const job of queue) {
    const placed = findPlacement({
      sequence: job.sequence,
      earliest: today,
      promiseDate: job.promiseDate,
      staff: next.staff,
      timeOff: next.timeOff,
      occupied,
      holidays,
    })
    if ("error" in placed) {
      job.days = []
      job.missesPromise = true
      warnings.push(`${jobTitle(job)} could not be placed. ${placed.error}`)
      continue
    }
    job.days = placed.days
    job.missesPromise = placed.missesPromise
    occupy(occupied, job)
    if (placed.missesPromise) {
      const end = placed.days[placed.days.length - 1]?.date
      warnings.push(
        `${jobTitle(job)} finishes ${end ? formatWeekday(end) : "late"}, after the promised ${formatWeekday(job.promiseDate)}.`,
      )
    }
  }

  return { data: next, warnings }
}

export function placeSingleJob(
  data: SchedulerData,
  jobId: string,
  start: string,
): { days: Assignment[]; missesPromise: boolean } | { error: string } {
  const job = data.jobs.find((item) => item.id === jobId)
  if (!job) return { error: "That job is no longer on the schedule." }
  const others = data.jobs.filter((item) => item.id !== jobId)
  const occupied = buildOccupancy(others)
  const holidays = holidaySpan(start < data.jobs[0]?.acceptedDate ? start : job.acceptedDate, 240, 400)
  const range = holidaySpan(start, 240, 30)
  for (const [date, name] of range) holidays.set(date, name)

  return findPlacement({
    sequence: job.sequence,
    earliest: start,
    promiseDate: job.promiseDate,
    staff: data.staff,
    timeOff: data.timeOff,
    occupied,
    holidays,
    fixedStart: start,
    preferredShop: job.days.find((day) => day.shopStaffId)?.shopStaffId ?? null,
    preferredField: job.days.find((day) => day.fieldStaffId)?.fieldStaffId ?? null,
  })
}

export function lockedConflict(
  data: SchedulerData,
  staffId: string,
  start: string,
  end: string,
): string | null {
  const person = data.staff.find((item) => item.id === staffId)
  const name = person?.name ?? "This person"
  for (const job of data.jobs) {
    if (!isLocked(job)) continue
    for (const day of job.days) {
      if (day.date < start || day.date > end) continue
      if (day.shopStaffId === staffId || day.fieldStaffId === staffId) {
        return `${name} is on ${jobTitle(job)} on ${formatWeekday(day.date)}. Move that locked job, or pick different days.`
      }
    }
  }
  return null
}
