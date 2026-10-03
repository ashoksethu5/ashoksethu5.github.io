import { addDays, parseISODate, toISODate } from "@/lib/dates"

function nthWeekday(year: number, monthIndex: number, weekday: number, n: number): Date {
  const date = new Date(year, monthIndex, 1)
  const delta = (weekday - date.getDay() + 7) % 7
  date.setDate(1 + delta + (n - 1) * 7)
  return date
}

function lastWeekday(year: number, monthIndex: number, weekday: number): Date {
  const date = new Date(year, monthIndex + 1, 0)
  const delta = (date.getDay() - weekday + 7) % 7
  date.setDate(date.getDate() - delta)
  return date
}

function observed(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day)
  if (date.getDay() === 6) date.setDate(date.getDate() - 1)
  if (date.getDay() === 0) date.setDate(date.getDate() + 1)
  return toISODate(date)
}

const FIXED: { month: number; day: number; name: string }[] = [
  { month: 1, day: 1, name: "New Year's Day" },
  { month: 6, day: 19, name: "Juneteenth" },
  { month: 7, day: 4, name: "Independence Day" },
  { month: 11, day: 11, name: "Veterans Day" },
  { month: 12, day: 25, name: "Christmas Day" },
]

export function holidaysForYear(year: number): Map<string, string> {
  const holidays = new Map<string, string>()
  for (const holiday of FIXED) {
    holidays.set(observed(year, holiday.month, holiday.day), holiday.name)
  }
  holidays.set(toISODate(nthWeekday(year, 0, 1, 3)), "Martin Luther King Jr. Day")
  holidays.set(toISODate(nthWeekday(year, 1, 1, 3)), "Presidents Day")
  holidays.set(toISODate(lastWeekday(year, 4, 1)), "Memorial Day")
  holidays.set(toISODate(nthWeekday(year, 8, 1, 1)), "Labor Day")
  holidays.set(toISODate(nthWeekday(year, 9, 1, 2)), "Columbus Day")
  holidays.set(toISODate(nthWeekday(year, 10, 4, 4)), "Thanksgiving")
  return holidays
}

export function holidayMap(from: string, to: string): Map<string, string> {
  const startYear = parseISODate(from).getFullYear() - 1
  const endYear = parseISODate(to).getFullYear() + 1
  const holidays = new Map<string, string>()
  for (let year = startYear; year <= endYear; year++) {
    for (const [date, name] of holidaysForYear(year)) {
      if (date >= from && date <= to) holidays.set(date, name)
    }
  }
  return holidays
}

export function isWeekend(iso: string): boolean {
  const day = parseISODate(iso).getDay()
  return day === 0 || day === 6
}

export function isClosedDay(iso: string, holidays: Map<string, string>): boolean {
  return isWeekend(iso) || holidays.has(iso)
}

export function holidaySpan(anchor: string, daysAhead = 420, daysBehind = 21): Map<string, string> {
  return holidayMap(addDays(anchor, -daysBehind), addDays(anchor, daysAhead))
}
