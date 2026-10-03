import { paymentSum } from "./money"
import { holidaysForYear, holidayMap } from "./holidays"
import { findPlacement, rescheduleUnlocked } from "./scheduler"
import { createSeed } from "./seed"
import { linesInRange, summarize } from "./revenue"
import { isComplete, isLocked, type Job, type SchedulerData, type StaffMember } from "./types"

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function staff(count: number): StaffMember[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `s${index}`,
    name: `Staff ${index + 1}`,
  }))
}

function job(partial: Partial<Job> & Pick<Job, "id" | "number" | "sequence" | "promiseDate">): Job {
  return {
    customerName: "Test Customer",
    phone: "",
    email: "",
    address: "",
    quote: 100000,
    acceptedDate: "2026-10-01",
    stage: "L2",
    payments: {
      p1: { amount: 40000, paid: false, paidDate: null },
      p2: { amount: 30000, paid: false, paidDate: null },
      p3: { amount: 30000, paid: false, paidDate: null },
    },
    days: [],
    missesPromise: false,
    onCalendar: true,
    ...partial,
  }
}

function data(jobs: Job[], people = staff(2), timeOff: SchedulerData["timeOff"] = []): SchedulerData {
  return { version: 1, jobs, staff: people, timeOff, nextNumber: 2000 }
}

const holidays2026 = holidaysForYear(2026)
assert(holidays2026.get("2026-10-12") === "Columbus Day", "Columbus Day 2026")
assert(holidays2026.get("2026-07-03") === "Independence Day", "Independence Day observed Friday")
assert(holidays2026.get("2026-11-26") === "Thanksgiving", "Thanksgiving 2026")
assert(holidays2026.get("2026-09-07") === "Labor Day", "Labor Day 2026")
assert(!holidayMap("2026-10-01", "2026-10-20").has("2026-07-03"), "range filter")

const weekend = findPlacement({
  sequence: ["S", "S"],
  earliest: "2026-10-02",
  promiseDate: "2026-10-09",
  staff: staff(1),
  timeOff: [],
  occupied: new Map(),
  holidays: holidayMap("2026-10-01", "2026-10-31"),
  fixedStart: "2026-10-02",
})
assert("days" in weekend, "weekend placement should fit")
if ("days" in weekend) {
  assert(weekend.days.map((day) => day.date).join(",") === "2026-10-02,2026-10-05", "skip weekend")
}

const holidaySkip = findPlacement({
  sequence: ["F", "F"],
  earliest: "2026-10-09",
  promiseDate: "2026-10-16",
  staff: staff(1),
  timeOff: [],
  occupied: new Map(),
  holidays: holidayMap("2026-10-01", "2026-10-31"),
  fixedStart: "2026-10-09",
})
assert("days" in holidaySkip, "holiday placement should fit")
if ("days" in holidaySkip) {
  assert(
    holidaySkip.days.map((day) => day.date).join(",") === "2026-10-09,2026-10-13",
    `skip Columbus Day, got ${"days" in holidaySkip ? holidaySkip.days.map((day) => day.date).join(",") : ""}`,
  )
}

const tight = rescheduleUnlocked(
  data([
    job({ id: "early", number: 1, sequence: ["F"], promiseDate: "2026-10-05", quote: 1000 }),
    job({ id: "rich", number: 2, sequence: ["F"], promiseDate: "2026-10-05", quote: 9000 }),
  ], staff(1)),
  "2026-10-05",
)
const early = tight.data.jobs.find((item) => item.id === "early")
const rich = tight.data.jobs.find((item) => item.id === "rich")
assert(rich?.days[0]?.date === "2026-10-05", `higher quote takes the only tech, got ${rich?.days[0]?.date}`)
assert(early?.days[0]?.date === "2026-10-06", `lower quote moves to Tuesday, got ${early?.days[0]?.date}`)

const commitment = rescheduleUnlocked(
  data([
    job({ id: "soon", number: 1, sequence: ["F"], promiseDate: "2026-10-05", quote: 1000 }),
    job({ id: "later", number: 2, sequence: ["F"], promiseDate: "2026-10-08", quote: 9000 }),
  ], staff(1)),
  "2026-10-05",
)
assert(commitment.data.jobs.find((item) => item.id === "soon")?.days[0]?.date === "2026-10-05", "earlier promise wins")
assert(commitment.data.jobs.find((item) => item.id === "later")?.days[0]?.date === "2026-10-06", "later promise waits")

const lockedJob = job({
  id: "locked",
  number: 9,
  sequence: ["F"],
  promiseDate: "2026-10-05",
  stage: "L4",
  days: [{ date: "2026-10-05", pattern: "F", shopStaffId: null, fieldStaffId: "s0" }],
})
const around = rescheduleUnlocked(
  data([
    lockedJob,
    job({ id: "open", number: 10, sequence: ["F"], promiseDate: "2026-10-05" }),
  ], staff(1)),
  "2026-10-05",
)
assert(around.data.jobs.find((item) => item.id === "locked")?.days[0]?.date === "2026-10-05", "locked day stays")
assert(around.data.jobs.find((item) => item.id === "open")?.days[0]?.date === "2026-10-06", "unlocked moves around lock")

const vacation = rescheduleUnlocked(
  data(
    [job({ id: "off", number: 3, sequence: ["SF"], promiseDate: "2026-10-05" })],
    staff(2),
    [{ id: "v", staffId: "s0", start: "2026-10-05", end: "2026-10-05", kind: "vacation", note: "" }],
  ),
  "2026-10-05",
)
assert(vacation.data.jobs[0]?.days[0]?.date === "2026-10-06", "SF waits until two people are in")
assert(vacation.data.jobs[0]?.missesPromise === true, "missing Monday is past the promise")

const both = findPlacement({
  sequence: ["SF"],
  earliest: "2026-10-05",
  promiseDate: "2026-10-05",
  staff: staff(2),
  timeOff: [],
  occupied: new Map(),
  holidays: holidayMap("2026-10-01", "2026-10-31"),
  fixedStart: "2026-10-05",
})
assert("days" in both, "SF with two people")
if ("days" in both) {
  assert(both.days[0].shopStaffId !== both.days[0].fieldStaffId, "shop and field are different people")
}

const seeded = createSeed("2026-10-02")
const alvarez = seeded.jobs.find((item) => item.id === "job-alvarez")
const chen = seeded.jobs.find((item) => item.id === "job-chen")
const torres = seeded.jobs.find((item) => item.id === "job-torres")
const okonkwo = seeded.jobs.find((item) => item.id === "job-okonkwo")
const kowalski = seeded.jobs.find((item) => item.id === "job-kowalski")
assert(alvarez && isLocked(alvarez) && alvarez.days.length === 5, "Alvarez is a locked 5-day job")
assert(chen && chen.onCalendar && chen.days.length === 3, `Chen should be scheduled, days=${chen?.days.length}`)
assert(torres && torres.days.length === 5, `Torres should be scheduled, days=${torres?.days.length}`)
assert(okonkwo && !okonkwo.onCalendar && okonkwo.days.length === 0, "draft stays off the calendar")
assert(kowalski && isComplete(kowalski), "Kowalski is paid in full")
for (const item of seeded.jobs) {
  assert(paymentSum([item.payments.p1, item.payments.p2, item.payments.p3]) === item.quote, `${item.customerName} deposits`)
}

const seen = new Map<string, string>()
for (const item of seeded.jobs) {
  for (const day of item.days) {
    for (const staffId of [day.shopStaffId, day.fieldStaffId]) {
      if (!staffId) continue
      const key = `${day.date}:${staffId}`
      assert(!seen.has(key), `double booked ${key} on ${item.customerName} and ${seen.get(key)}`)
      seen.set(key, item.customerName)
    }
  }
}
const again = rescheduleUnlocked(seeded, "2026-10-02")
assert(
  again.data.jobs.find((item) => item.id === "job-alvarez")?.days.map((day) => day.date).join() ===
    alvarez?.days.map((day) => day.date).join(),
  "estimator does not move locked work",
)

const alvarezLines = linesInRange([alvarez!], "2026-10-02", "2026-10-02")
const scheduledFinal = alvarezLines.find((line) => line.slot === "p3" && line.kind === "scheduled")
assert(scheduledFinal, "unpaid final payment is scheduled on the last work day")
const chenIncome = linesInRange([chen!], "2026-10-02", "2026-10-02").find((line) => line.kind === "income")
assert(chenIncome?.slot === "p1", "paid first deposit counts as income")
const chenScheduled = summarize(linesInRange([chen!], "2026-10-01", "2026-12-31"))
assert(chenScheduled.scheduled === 0, "L2 job does not schedule the second deposit yet")

console.log("scheduler tests passed")
