"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { BoardSkeleton } from "@/components/board-skeleton"
import { Button } from "@/components/ui/button"
import { addDays, formatDayHeading, formatShort, formatWeekOf, startOfWeekMonday, todayISO } from "@/lib/dates"
import { holidaySpan } from "@/lib/holidays"
import { useScheduler } from "@/lib/store"
import { isLocked, jobPath, patternLabel, type Job, type TimeOff } from "@/lib/types"
import { cn } from "@/lib/utils"

function assignmentFor(job: Job, date: string, staffId: string) {
  const day = job.days.find((item) => item.date === date)
  if (!day) return null
  if (day.shopStaffId !== staffId && day.fieldStaffId !== staffId) return null
  return day
}

function offOn(timeOff: TimeOff[], staffId: string, date: string) {
  return timeOff.find((entry) => entry.staffId === staffId && entry.start <= date && date <= entry.end) ?? null
}

export function CalendarBoard() {
  const params = useSearchParams()
  const focusId = params.get("job")
  const { ready, data, rerun } = useScheduler()
  const today = todayISO()
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(today))

  const focusJob = data?.jobs.find((job) => job.id === focusId)
  const focusDate = focusJob?.days[0]?.date

  useEffect(() => {
    if (focusDate) setWeekStart(startOfWeekMonday(focusDate))
  }, [focusDate])

  const holidays = useMemo(() => holidaySpan(weekStart, 14, 7), [weekStart])
  const days = [0, 1, 2, 3, 4].map((offset) => addDays(weekStart, offset))

  if (!ready || !data) return <BoardSkeleton />

  const weekJobs = data.jobs.filter((job) => job.days.some((day) => day.date >= days[0] && day.date <= days[4]))
  const misses = data.jobs.filter((job) => job.onCalendar && job.missesPromise)

  function onRerun() {
    const result = rerun()
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    if (result.warnings.length === 0) toast.success("Unlocked jobs are fitted around locked work.")
    for (const warning of result.warnings) toast.warning(warning)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scheduler</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6e564c]">
            One row per person. A solid block is locked (L3–L5). A dashed block can still be moved. Stripes are national holidays, and no job work lands on them.
          </p>
        </div>
        <Button type="button" className="bg-[#a86324] text-white hover:bg-[#8f5420]" onClick={onRerun}>
          Re-run estimator
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{formatWeekOf(weekStart)}</h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            Previous
          </Button>
          <Button type="button" variant="outline" onClick={() => setWeekStart(startOfWeekMonday(today))}>
            This week
          </Button>
          <Button type="button" variant="outline" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Next
          </Button>
        </div>
      </div>

      {misses.length > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950 ring-1 ring-amber-200">
          {misses.map((job) => (
            <p key={job.id}>
              <Link href={jobPath(job.id)} className="font-medium underline-offset-4 hover:underline">
                #{job.number} {job.customerName}
              </Link>{" "}
              finishes after {formatShort(job.promiseDate)}.
            </p>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-[#e4d5c8]">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-32 bg-[#f8efe7] px-3 py-3 text-left text-xs font-semibold tracking-wide text-[#6e564c] uppercase">
                Crew
              </th>
              {days.map((date) => {
                const holiday = holidays.get(date)
                const available = data.staff.filter(
                  (person) => !data.timeOff.some((entry) => entry.staffId === person.id && entry.start <= date && date <= entry.end),
                ).length
                const booked = new Set(
                  data.jobs.flatMap((job) =>
                    job.days
                      .filter((day) => day.date === date)
                      .flatMap((day) => [day.shopStaffId, day.fieldStaffId].filter(Boolean)),
                  ),
                ).size
                return (
                  <th
                    key={date}
                    className={cn(
                      "min-w-36 px-2 py-3 text-left font-medium",
                      holiday
                        ? "bg-[repeating-linear-gradient(-45deg,#fff,#fff_6px,#f3e4e4_6px,#f3e4e4_12px)]"
                        : date === today && "bg-[#f8efe7]",
                    )}
                  >
                    <div>{formatDayHeading(date).weekday}</div>
                    <div className="text-xs font-normal text-[#6e564c]">{formatDayHeading(date).day}</div>
                    {holiday ? <div className="text-xs font-normal text-[#560e10]">{holiday}</div> : <div className="text-xs font-normal text-[#6e564c]">{booked}/{available || data.staff.length} booked</div>}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {data.staff.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#6e564c]">
                  The crew list is empty, so new jobs cannot be placed yet.
                </td>
              </tr>
            ) : (
              data.staff.map((person) => (
                <tr key={person.id} className="border-t border-[#e4d5c8]">
                  <th className="sticky left-0 z-10 bg-white px-3 py-3 text-left font-semibold">{person.name}</th>
                  {days.map((date) => {
                    const holiday = holidays.get(date)
                    const off = offOn(data.timeOff, person.id, date)
                    const match = data.jobs
                      .map((job) => ({ job, day: assignmentFor(job, date, person.id) }))
                      .find((item) => item.day)
                    return (
                      <td
                        key={date}
                        className={cn(
                          "px-2 py-2 align-top",
                          holiday && "bg-[repeating-linear-gradient(-45deg,#fff,#fff_6px,#f6ecec_6px,#f6ecec_12px)]",
                        )}
                      >
                        {holiday ? (
                          <span className="text-xs text-[#6e564c]">Closed</span>
                        ) : off ? (
                          <span className="inline-flex rounded-md border border-dashed border-[#c4b2a4] bg-[#f6f1ec] px-2 py-1 text-xs text-[#6e564c]">
                            {off.kind === "sick" ? "Sick" : "Vacation"}
                          </span>
                        ) : match?.day ? (
                          <Link
                            href={jobPath(match.job.id)}
                            aria-label={`Job ${match.job.number} ${match.job.customerName}, ${patternLabel(match.day.pattern)}, ${isLocked(match.job) ? "locked" : "unlocked"}`}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs font-medium",
                              isLocked(match.job)
                                ? "bg-[#560e10] text-white"
                                : "border border-dashed border-[#560e10] bg-white text-[#560e10]",
                              focusId === match.job.id && "ring-2 ring-[#a86324] ring-offset-2",
                            )}
                          >
                            <span>#{match.job.number}</span>
                            <span
                              className={cn(
                                "rounded px-1 py-0.5 text-[10px] font-semibold",
                                match.day.pattern === "F" && (isLocked(match.job) ? "bg-white/20" : "bg-[#560e10] text-white"),
                                match.day.pattern !== "F" && "bg-[#a86324] text-white",
                              )}
                            >
                              {match.day.pattern}
                            </span>
                          </Link>
                        ) : (
                          <span className="sr-only">Open</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#6e564c]">
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-8 rounded-sm bg-[#560e10]" /> Locked, L3–L5
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-8 rounded-sm border border-dashed border-[#560e10]" /> Unlocked, can be moved
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block rounded-sm bg-[#a86324] px-1 text-[10px] font-semibold text-white">S</span> Shop
        </li>
        <li className="inline-flex items-center gap-2">
          <span className="inline-block rounded-sm bg-[#560e10] px-1 text-[10px] font-semibold text-white">F</span> Field
        </li>
        <li>Striped column = public holiday</li>
      </ul>

      <section className="rounded-xl bg-white p-4 ring-1 ring-[#e4d5c8]">
        <h2 className="text-sm font-semibold">Jobs this week</h2>
        {weekJobs.length === 0 ? (
          <p className="mt-2 text-sm text-[#6e564c]">No jobs on these five work days.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[#e4d5c8]">
            {weekJobs.map((job) => {
              const start = job.days[0]?.date
              const end = job.days[job.days.length - 1]?.date
              return (
                <li key={job.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <Link href={jobPath(job.id)} className="font-medium text-[#560e10] hover:underline">
                    #{job.number} {job.customerName}
                  </Link>
                  <span className="text-[#6e564c]">
                    {start && end ? `${formatShort(start)} – ${formatShort(end)}` : "Unscheduled"} · {isLocked(job) ? "Locked" : "Unlocked"}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
