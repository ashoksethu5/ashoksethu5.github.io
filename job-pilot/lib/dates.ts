export function todayISO(now = new Date()): string {
  return toISODate(now)
}

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const date = parseISODate(iso)
  return toISODate(date) === iso
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function compareISO(a: string, b: string): number {
  if (a === b) return 0
  return a < b ? -1 : 1
}

export function startOfWeekMonday(iso: string): string {
  const date = parseISODate(iso)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return toISODate(date)
}

export function startOfMonth(iso: string): string {
  const date = parseISODate(iso)
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function eachDate(start: string, end: string, limit = 400): string[] {
  if (start > end) return []
  const dates: string[] = []
  let cursor = start
  for (let i = 0; i < limit && cursor <= end; i++) {
    dates.push(cursor)
    cursor = addDays(cursor, 1)
  }
  return dates
}

export function weekdayIndex(iso: string): number {
  return parseISODate(iso).getDay()
}

export function formatMedium(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function formatShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function formatWeekday(iso: string): string {
  return parseISODate(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function formatWeekOf(monday: string): string {
  const end = addDays(monday, 4)
  const startDate = parseISODate(monday)
  const endDate = parseISODate(end)
  const sameMonth = startDate.getMonth() === endDate.getMonth()
  const startLabel = startDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
  const endLabel = endDate.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  })
  return `Week of ${startLabel}–${endLabel}`
}

export function formatDayHeading(iso: string): { weekday: string; day: string } {
  const date = parseISODate(iso)
  return {
    weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
    day: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }
}
