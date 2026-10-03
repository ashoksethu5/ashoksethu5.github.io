"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BoardSkeleton } from "@/components/board-skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMedium, startOfMonth, todayISO } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { linesInRange, rangeBounds, slotLabel, summarize, type RevenueRangeId } from "@/lib/revenue"
import { useScheduler } from "@/lib/store"
import { cn } from "@/lib/utils"

const RANGES: { id: RevenueRangeId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "mtd", label: "Month to date" },
  { id: "custom", label: "Custom" },
]

function isRange(value: string | null): value is RevenueRangeId {
  return value === "today" || value === "week" || value === "mtd" || value === "custom"
}

export function RevenueBoard() {
  const params = useSearchParams()
  const initial = params.get("range")
  const { ready, data } = useScheduler()
  const today = todayISO()
  const [range, setRange] = useState<RevenueRangeId>(isRange(initial) ? initial : "mtd")
  const [customStart, setCustomStart] = useState(startOfMonth(today))
  const [customEnd, setCustomEnd] = useState(today)

  const bounds = useMemo(
    () => rangeBounds(range, today, { start: customStart, end: customEnd }),
    [customEnd, customStart, range, today],
  )

  if (!ready || !data) return <BoardSkeleton />

  const lines = linesInRange(data.jobs, bounds.start, bounds.end)
  const totals = summarize(lines)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revenue</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[#6e564c]">
          Scheduled is money not collected yet: the first deposit from the day the quote is accepted, the second once work has started, and the final payment once the job is complete. Income is any deposit marked paid, counted on the paid date.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
        {RANGES.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={range === item.id ? "default" : "outline"}
            aria-pressed={range === item.id}
            onClick={() => setRange(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {range === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="range-start">From</Label>
            <Input id="range-start" type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="range-end">To</Label>
            <Input id="range-end" type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="h-10" />
          </div>
        </div>
      )}

      <p className="text-sm text-[#6e564c]">{bounds.label}</p>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 ring-1 ring-[#e4d5c8]">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#6e564c] uppercase">Scheduled</p>
          <p className="mt-2 text-2xl font-semibold text-[#560e10]">{formatMoney(totals.scheduled)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 ring-1 ring-[#e4d5c8]">
          <p className="text-xs font-semibold tracking-[0.14em] text-[#6e564c] uppercase">Income</p>
          <p className="mt-2 text-2xl font-semibold text-[#241816]">{formatMoney(totals.income)}</p>
        </div>
        <div className="rounded-xl bg-[#560e10] p-4 text-white">
          <p className="text-xs font-semibold tracking-[0.14em] text-white/70 uppercase">Total</p>
          <p className="mt-2 text-2xl font-semibold">{formatMoney(totals.scheduled + totals.income)}</p>
        </div>
      </div>

      {lines.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-10 text-center ring-1 ring-[#e4d5c8]">
          <h2 className="text-lg font-semibold">Nothing in this range</h2>
          <p className="mt-2 text-sm text-[#6e564c]">Scheduled deposits and paid income will show up here once jobs have dates that fall in the range.</p>
        </div>
      ) : (
        <>
          <section className="overflow-hidden rounded-xl bg-white ring-1 ring-[#e4d5c8]">
            <div className="border-b border-[#e4d5c8] px-4 py-3">
              <h2 className="text-sm font-semibold">By day</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Income</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totals.byDay.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{formatMedium(day.date)}</TableCell>
                    <TableCell>{formatMoney(day.scheduled)}</TableCell>
                    <TableCell>{formatMoney(day.income)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className="overflow-hidden rounded-xl bg-white ring-1 ring-[#e4d5c8]">
            <div className="border-b border-[#e4d5c8] px-4 py-3">
              <h2 className="text-sm font-semibold">Deposits</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={`${line.jobId}-${line.slot}-${line.kind}-${line.date}`}>
                    <TableCell>{formatMedium(line.date)}</TableCell>
                    <TableCell>
                      <Link href={`/jobs/${line.jobId}`} className="font-medium text-[#560e10] hover:underline">
                        #{line.jobNumber} {line.customerName}
                      </Link>
                    </TableCell>
                    <TableCell>{slotLabel(line.slot)}</TableCell>
                    <TableCell>
                      <span className={cn("text-xs font-medium", line.kind === "income" ? "text-emerald-800" : "text-[#a86324]")}>
                        {line.kind === "income" ? "Income" : "Scheduled"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(line.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </>
      )}
    </div>
  )
}
