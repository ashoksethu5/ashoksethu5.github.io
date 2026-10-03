import { addDays, startOfWeekMonday } from "@/lib/dates"
import { holidaySpan } from "@/lib/holidays"
import { splitEven } from "@/lib/money"
import { buildOccupancy, findPlacement, rescheduleUnlocked } from "@/lib/scheduler"
import type { Job, Pattern, SchedulerData, Stage, TimeOff } from "@/lib/types"

function payments(total: number, paid: { p1?: string; p2?: string; p3?: string }) {
  const [p1, p2, p3] = splitEven(total)
  const slot = (amount: number, date?: string) => ({
    amount,
    paid: Boolean(date),
    paidDate: date ?? null,
  })
  return {
    p1: slot(p1, paid.p1),
    p2: slot(p2, paid.p2),
    p3: slot(p3, paid.p3),
  }
}

function blankJob(input: {
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
  onCalendar: boolean
  paid?: { p1?: string; p2?: string; p3?: string }
}): Job {
  return {
    ...input,
    payments: payments(input.quote, input.paid ?? {}),
    days: [],
    missesPromise: false,
  }
}

export function createSeed(today: string): SchedulerData {
  const monday = startOfWeekMonday(today)
  const previousMonday = addDays(monday, -7)
  const staff = [
    { id: "staff-a", name: "Staff A" },
    { id: "staff-b", name: "Staff B" },
    { id: "staff-c", name: "Staff C" },
    { id: "staff-d", name: "Staff D" },
    { id: "staff-e", name: "Staff E" },
  ]

  const kowalski = blankJob({
    id: "job-kowalski",
    number: 1044,
    customerName: "Helen Kowalski",
    phone: "(313) 555-0144",
    email: "helen.kowalski@email.com",
    address: "1450 Chicago Blvd, Detroit, MI 48206",
    quote: 330000,
    promiseDate: addDays(previousMonday, 2),
    acceptedDate: addDays(previousMonday, -6),
    stage: "L5",
    sequence: ["F", "SF"],
    onCalendar: true,
  })

  const alvarez = blankJob({
    id: "job-alvarez",
    number: 1042,
    customerName: "Maria Alvarez",
    phone: "(313) 555-0142",
    email: "maria.alvarez@email.com",
    address: "1842 Seminole St, Detroit, MI 48214",
    quote: 480000,
    promiseDate: addDays(monday, 5),
    acceptedDate: addDays(monday, -8),
    stage: "L3",
    sequence: ["F", "SF", "SF", "F", "F"],
    onCalendar: true,
  })

  const holidays = holidaySpan(previousMonday, 40, 10)
  const kowalskiPlace = findPlacement({
    sequence: kowalski.sequence,
    earliest: previousMonday,
    promiseDate: kowalski.promiseDate,
    staff,
    timeOff: [],
    occupied: new Map(),
    holidays,
    fixedStart: previousMonday,
  })
  if ("days" in kowalskiPlace) {
    kowalski.days = kowalskiPlace.days
    kowalski.missesPromise = false
    const start = kowalski.days[0].date
    const end = kowalski.days[kowalski.days.length - 1].date
    kowalski.payments = payments(kowalski.quote, { p1: kowalski.acceptedDate, p2: start, p3: end })
  }

  const occupied = buildOccupancy([kowalski])
  const alvarezPlace = findPlacement({
    sequence: alvarez.sequence,
    earliest: monday,
    promiseDate: alvarez.promiseDate,
    staff,
    timeOff: [],
    occupied,
    holidays,
    fixedStart: monday,
  })
  if ("days" in alvarezPlace) {
    alvarez.days = alvarezPlace.days
    const start = alvarez.days[0].date
    const end = alvarez.days[alvarez.days.length - 1].date
    alvarez.promiseDate = end > alvarez.promiseDate ? end : alvarez.promiseDate
    alvarez.missesPromise = end > alvarez.promiseDate
    let stage: Stage = "L3"
    if (start <= today) stage = "L4"
    if (end <= today) stage = "L5"
    alvarez.stage = stage
    alvarez.payments = payments(alvarez.quote, {
      p1: alvarez.acceptedDate <= today ? alvarez.acceptedDate : undefined,
      p2: stage === "L4" || stage === "L5" ? start : undefined,
    })
  }

  const vacationStart = addDays(monday, 7)
  const vacationEnd = addDays(monday, 8)
  const busy = new Set<string>()
  for (const day of alvarez.days) {
    if (day.date < vacationStart || day.date > vacationEnd) continue
    if (day.shopStaffId) busy.add(day.shopStaffId)
    if (day.fieldStaffId) busy.add(day.fieldStaffId)
  }
  const vacationStaff = staff.find((person) => person.id === "staff-c" && !busy.has(person.id)) ?? staff.find((person) => !busy.has(person.id))
  const timeOff: TimeOff[] = vacationStaff
    ? [
        {
          id: "off-sample",
          staffId: vacationStaff.id,
          start: vacationStart,
          end: vacationEnd,
          kind: "vacation",
          note: "Out both days",
        },
      ]
    : []

  const chen = blankJob({
    id: "job-chen",
    number: 1043,
    customerName: "David Chen",
    phone: "(313) 555-0190",
    email: "david.chen@email.com",
    address: "90 Watson St, Detroit, MI 48201",
    quote: 210000,
    promiseDate: addDays(monday, 11),
    acceptedDate: today,
    stage: "L2",
    sequence: ["S", "S", "F"],
    onCalendar: true,
    paid: { p1: today },
  })

  const torres = blankJob({
    id: "job-torres",
    number: 1045,
    customerName: "Luis Torres",
    phone: "(313) 555-0174",
    email: "luis.torres@email.com",
    address: "620 Virginia Park, Detroit, MI 48202",
    quote: 560000,
    promiseDate: addDays(monday, 16),
    acceptedDate: today,
    stage: "L2",
    sequence: ["SF", "SF", "F", "F", "F"],
    onCalendar: true,
    paid: { p1: today },
  })

  const okonkwo = blankJob({
    id: "job-okonkwo",
    number: 1046,
    customerName: "Amaka Okonkwo",
    phone: "(313) 555-0166",
    email: "amaka.okonkwo@email.com",
    address: "4114 W Grand Blvd, Detroit, MI 48208",
    quote: 275000,
    promiseDate: addDays(monday, 21),
    acceptedDate: today,
    stage: "L1",
    sequence: ["F", "F", "SF"],
    onCalendar: false,
  })

  const seeded: SchedulerData = {
    version: 1,
    staff,
    timeOff,
    nextNumber: 1047,
    jobs: [alvarez, chen, kowalski, torres, okonkwo],
  }

  return rescheduleUnlocked(seeded, today).data
}
