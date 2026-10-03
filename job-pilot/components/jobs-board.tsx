"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Check } from "lucide-react"
import { BoardSkeleton } from "@/components/board-skeleton"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMoney } from "@/lib/money"
import { formatShort } from "@/lib/dates"
import { useScheduler } from "@/lib/store"
import {
  formatSequence,
  isComplete,
  isLocked,
  jobPath,
  STAGE_LABEL,
  type Job,
  type PaymentKey,
  type Stage,
} from "@/lib/types"
import { cn } from "@/lib/utils"

const FILTERS = [
  { value: "all", label: "All jobs" },
  { value: "L1", label: "L1 · Quote accepted" },
  { value: "L2", label: "L2 · Scheduled" },
  { value: "L3", label: "L3 · Schedule sent" },
  { value: "L4", label: "L4 · In progress" },
  { value: "L5", label: "L5 · Completed" },
  { value: "paid", label: "Paid in full" },
]

const SORTS = [
  { value: "promise", label: "Promise date" },
  { value: "quote", label: "Quote, high to low" },
  { value: "number", label: "Job number" },
  { value: "customer", label: "Customer" },
]

function StateMark({ job }: { job: Job }) {
  const closed = isComplete(job)
  const locked = isLocked(job)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        closed && "bg-[#241816] text-white",
        !closed && locked && "bg-[#560e10] text-white",
        !closed && !locked && "border border-dashed border-[#560e10] text-[#560e10]",
      )}
    >
      {closed ? "Complete" : `${job.stage} · ${locked ? "Locked" : "Unlocked"}`}
    </span>
  )
}

function PaidMarks({ job }: { job: Job }) {
  const keys: PaymentKey[] = ["p1", "p2", "p3"]
  return (
    <div className="flex gap-2">
      {keys.map((key) => {
        const paid = job.payments[key].paid
        return (
          <span key={key} className={cn("inline-flex items-center gap-0.5 text-xs font-medium", paid ? "text-emerald-800" : "text-[#a8988c]")}>
            {key.toUpperCase()}
            {paid ? <Check className="size-3.5" aria-label="paid" /> : <span className="sr-only">unpaid</span>}
          </span>
        )
      })}
    </div>
  )
}

export function JobsBoard() {
  const { ready, data } = useScheduler()
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [sort, setSort] = useState("promise")

  const jobs = useMemo(() => {
    if (!data) return []
    const needle = query.trim().toLowerCase()
    const filtered = data.jobs.filter((job) => {
      if (filter === "paid" && !isComplete(job)) return false
      if (filter !== "all" && filter !== "paid" && job.stage !== (filter as Stage)) return false
      if (!needle) return true
      return `${job.number} ${job.customerName} ${job.address}`.toLowerCase().includes(needle)
    })
    return filtered.sort((a, b) => {
      if (sort === "quote") return b.quote - a.quote
      if (sort === "number") return a.number - b.number
      if (sort === "customer") return a.customerName.localeCompare(b.customerName)
      return a.promiseDate.localeCompare(b.promiseDate) || a.number - b.number
    })
  }, [data, filter, query, sort])

  if (!ready || !data) return <BoardSkeleton />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#241816]">Jobs</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6e564c]">
            Quotes accepted for door refinishing. Filter by lifecycle, check the promised date, and see which jobs the estimator is still allowed to move.
          </p>
        </div>
        <Link href="/quotes/new" className={cn(buttonVariants({ size: "lg" }), "bg-[#a86324] text-white hover:bg-[#8f5420]")}>
          New quote
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search customer, job number, address"
          aria-label="Search jobs"
          className="h-10 sm:max-w-sm"
        />
        <Select items={FILTERS} value={filter} onValueChange={(value) => setFilter(value ?? "all")}>
          <SelectTrigger className="h-10 w-full sm:w-52" aria-label="Filter by state">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select items={SORTS} value={sort} onValueChange={(value) => setSort(value ?? "promise")}>
          <SelectTrigger className="h-10 w-full sm:w-48" aria-label="Sort jobs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data.jobs.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-12 text-center ring-1 ring-[#e4d5c8]">
          <h2 className="text-lg font-semibold">No quotes yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6e564c]">
            Add a customer, quote, promised date, and the shop/field sequence. Sending it to the estimator places it on the calendar.
          </p>
          <Link href="/quotes/new" className={cn(buttonVariants({ size: "lg" }), "mt-4 bg-[#a86324] text-white hover:bg-[#8f5420]")}>
            New quote
          </Link>
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl bg-white px-6 py-10 text-center ring-1 ring-[#e4d5c8]">
          <h2 className="text-lg font-semibold">No jobs match</h2>
          <p className="mt-2 text-sm text-[#6e564c]">Try another filter or clear the search.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl bg-white ring-1 ring-[#e4d5c8] md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Quote</TableHead>
                  <TableHead>Promise</TableHead>
                  <TableHead>S/F sequence</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className={job.missesPromise ? "bg-amber-50/70" : undefined}>
                    <TableCell className="font-medium">#{job.number}</TableCell>
                    <TableCell>
                      <div>{job.customerName}</div>
                      {!job.onCalendar && <div className="text-xs text-[#6e564c]">Draft, not on the calendar</div>}
                      {job.missesPromise && <div className="text-xs text-amber-800">Finishes after the promised date</div>}
                    </TableCell>
                    <TableCell>
                      <StateMark job={job} />
                    </TableCell>
                    <TableCell>{formatMoney(job.quote)}</TableCell>
                    <TableCell>{formatShort(job.promiseDate)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatSequence(job.sequence)}</TableCell>
                    <TableCell>
                      <PaidMarks job={job} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={jobPath(job.id)} className="text-sm font-medium text-[#560e10] underline-offset-4 hover:underline">
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="space-y-3 md:hidden">
            {jobs.map((job) => (
              <Link key={job.id} href={jobPath(job.id)} className="block rounded-xl bg-white p-4 ring-1 ring-[#e4d5c8]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-[#6e564c]">#{job.number}</p>
                    <p className="font-semibold">{job.customerName}</p>
                  </div>
                  <StateMark job={job} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-[#6e564c]">Quote</dt>
                    <dd>{formatMoney(job.quote)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#6e564c]">Promise</dt>
                    <dd>{formatShort(job.promiseDate)}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-[#6e564c]">Sequence</dt>
                    <dd className="font-mono text-xs">{formatSequence(job.sequence)}</dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <PaidMarks job={job} />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
      <p className="text-xs leading-5 text-[#6e564c]">
        {STAGE_LABEL.L1.title} and {STAGE_LABEL.L2.title.toLowerCase()} stay unlocked. Once a job is marked schedule sent, in progress, or completed, the estimator works around it.
      </p>
    </div>
  )
}
