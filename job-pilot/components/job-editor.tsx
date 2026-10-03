"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Notice } from "@/components/notice"
import { SequenceBuilder } from "@/components/sequence-builder"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatMedium, formatWeekday, todayISO } from "@/lib/dates"
import { formatMoney, parseMoney } from "@/lib/money"
import { useScheduler } from "@/lib/store"
import {
  isComplete,
  isLocked,
  patternLabel,
  STAGE_LABEL,
  STAGE_ORDER,
  type Job,
  type JobInput,
  type Pattern,
  type Stage,
} from "@/lib/types"
import { cn } from "@/lib/utils"

type FormState = {
  customerName: string
  phone: string
  email: string
  address: string
  quote: string
  promiseDate: string
  sequence: Pattern[]
  stage: Stage
  startDate: string
  amounts: Record<"p1" | "p2" | "p3", string>
  paid: Record<"p1" | "p2" | "p3", boolean>
  paidDates: Record<"p1" | "p2" | "p3", string>
}

function toForm(job: Job): FormState {
  return {
    customerName: job.customerName,
    phone: job.phone,
    email: job.email,
    address: job.address,
    quote: (job.quote / 100).toFixed(2),
    promiseDate: job.promiseDate,
    sequence: job.sequence,
    stage: job.stage,
    startDate: job.days[0]?.date ?? "",
    amounts: {
      p1: (job.payments.p1.amount / 100).toFixed(2),
      p2: (job.payments.p2.amount / 100).toFixed(2),
      p3: (job.payments.p3.amount / 100).toFixed(2),
    },
    paid: {
      p1: job.payments.p1.paid,
      p2: job.payments.p2.paid,
      p3: job.payments.p3.paid,
    },
    paidDates: {
      p1: job.payments.p1.paidDate ?? "",
      p2: job.payments.p2.paidDate ?? "",
      p3: job.payments.p3.paidDate ?? "",
    },
  }
}

export function JobEditor({ job }: { job: Job }) {
  const router = useRouter()
  const { updateJob, saveAndRerun, removeJob, data } = useScheduler()
  const [form, setForm] = useState<FormState>(() => toForm(job))
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const closed = isComplete(job)
  const today = todayISO()

  useEffect(() => {
    setForm(toForm(job))
    setError(null)
  }, [job])

  const staffName = (id: string | null) => data?.staff.find((person) => person.id === id)?.name ?? "Unassigned"

  function buildInput(): JobInput | null {
    const quote = parseMoney(form.quote)
    const p1 = parseMoney(form.amounts.p1)
    const p2 = parseMoney(form.amounts.p2)
    const p3 = parseMoney(form.amounts.p3)
    if (quote == null || p1 == null || p2 == null || p3 == null) {
      setError("Enter the quote and deposits in dollars.")
      return null
    }
    return {
      customerName: form.customerName,
      phone: form.phone,
      email: form.email,
      address: form.address,
      quote,
      promiseDate: form.promiseDate,
      sequence: form.sequence,
      stage: form.stage,
      startDate: form.startDate || null,
      payments: {
        p1: { amount: p1, paid: form.paid.p1, paidDate: form.paid.p1 ? form.paidDates.p1 || null : null },
        p2: { amount: p2, paid: form.paid.p2, paidDate: form.paid.p2 ? form.paidDates.p2 || null : null },
        p3: { amount: p3, paid: form.paid.p3, paidDate: form.paid.p3 ? form.paidDates.p3 || null : null },
      },
    }
  }

  function onSave() {
    const input = buildInput()
    if (!input) return
    const result = updateJob(job.id, input)
    if (!result.ok) {
      setError(result.error)
      toast.error(result.error)
      return
    }
    setError(null)
    toast.success("Job saved.")
    for (const warning of result.warnings) toast.warning(warning)
  }

  function onEstimate() {
    const input = buildInput()
    if (!input) return
    const result = saveAndRerun(job.id, input)
    if (!result.ok) {
      setError(result.error)
      toast.error(result.error)
      return
    }
    setError(null)
    const placingDraft = !job.onCalendar
    toast.success(placingDraft ? "Job placed on the calendar." : "Unlocked jobs were placed again.")
    for (const warning of result.warnings) toast.warning(warning)
    if (placingDraft) router.push(`/?job=${result.jobId ?? job.id}`)
  }

  function onDelete() {
    const result = removeJob(job.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success("Job removed.")
    router.push("/")
  }

  const quoteCents = parseMoney(form.quote)
  const depositValues = [form.amounts.p1, form.amounts.p2, form.amounts.p3].map(parseMoney)
  const depositTotal = depositValues.every((value) => value != null)
    ? depositValues.reduce((sum, value) => sum + (value ?? 0), 0)
    : null

  return (
    <div className="space-y-5">
      <div>
        <Link href="/" className="text-sm font-medium text-[#560e10] hover:underline">
          Jobs
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-[#6e564c] uppercase">Job #{job.number}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{job.customerName}</h1>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium",
              closed && "bg-[#241816] text-white",
              !closed && isLocked(job) && "bg-[#560e10] text-white",
              !closed && !isLocked(job) && "border border-dashed border-[#560e10] text-[#560e10]",
            )}
          >
            {closed ? "Complete" : `${job.stage} · ${isLocked(job) ? "Locked" : "Unlocked"}`}
          </span>
        </div>
      </div>

      {closed && (
        <Notice tone="locked">This job is complete. The work is in L5 and every deposit is marked paid, so the record is closed.</Notice>
      )}
      {!closed && isLocked(job) && (
        <Notice>Locked on the calendar. The estimator will schedule other jobs around these dates. You can still edit details until it is paid in full.</Notice>
      )}
      {!job.onCalendar && <Notice tone="warning">This quote is a draft. It is not on the calendar yet.</Notice>}
      {job.missesPromise && job.days.length > 0 && (
        <Notice tone="warning">
          The last work day is {formatMedium(job.days[job.days.length - 1].date)}, after the promised {formatMedium(job.promiseDate)}.
        </Notice>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={form.customerName} disabled={closed} onChange={(event) => setForm({ ...form, customerName: event.target.value })} className="h-10" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input id="edit-phone" value={form.phone} disabled={closed} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email</Label>
                <Input id="edit-email" type="email" value={form.email} disabled={closed} onChange={(event) => setForm({ ...form, email: event.target.value })} className="h-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-address">Address</Label>
              <Input id="edit-address" value={form.address} disabled={closed} onChange={(event) => setForm({ ...form, address: event.target.value })} className="h-10" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-5 gap-1" role="group" aria-label="Job stage">
              {STAGE_ORDER.map((stage) => (
                <button
                  key={stage}
                  type="button"
                  disabled={closed}
                  aria-pressed={form.stage === stage}
                  onClick={() => setForm({ ...form, stage })}
                  className={cn(
                    "h-10 rounded-lg text-sm font-semibold disabled:opacity-60",
                    form.stage === stage ? "bg-[#560e10] text-white" : "bg-[#f8efe7] text-[#3f2a24]",
                  )}
                >
                  {stage}
                </button>
              ))}
            </div>
            <p className="text-sm leading-6 text-[#3f2a24]">
              <span className="font-medium">{STAGE_LABEL[form.stage].title}.</span> {STAGE_LABEL[form.stage].detail}
            </p>
            {form.stage === "L5" && form.paid.p1 && form.paid.p2 && form.paid.p3 && !closed && (
              <p className="text-sm text-amber-900">Saving now closes this job. After that, nothing on it can be changed.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quote and deposits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-quote">Quote (Q)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#6e564c]">$</span>
                <Input id="edit-quote" inputMode="decimal" disabled={closed} value={form.quote} onChange={(event) => setForm({ ...form, quote: event.target.value })} className="h-10 pl-7" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-promise">Committed delivery date (D)</Label>
              <Input id="edit-promise" type="date" disabled={closed} value={form.promiseDate} onChange={(event) => setForm({ ...form, promiseDate: event.target.value })} className="h-10" />
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {(["p1", "p2", "p3"] as const).map((key) => {
              const amountLocked = job.payments[key].paid || closed
              return (
                <div key={key} className="space-y-2 rounded-xl bg-[#f8efe7] p-3">
                  <Label htmlFor={`amount-${key}`}>{key.toUpperCase()}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#6e564c]">$</span>
                    <Input
                      id={`amount-${key}`}
                      inputMode="decimal"
                      disabled={amountLocked}
                      value={form.amounts[key]}
                      onChange={(event) => setForm({ ...form, amounts: { ...form.amounts, [key]: event.target.value } })}
                      className="h-10 bg-white pl-7"
                    />
                  </div>
                  {amountLocked && !closed && <p className="text-xs text-[#6e564c]">Uncheck paid and save before changing this amount.</p>}
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.paid[key]}
                      disabled={closed}
                      onCheckedChange={(checked) =>
                        setForm({
                          ...form,
                          paid: { ...form.paid, [key]: checked },
                          paidDates: { ...form.paidDates, [key]: checked ? form.paidDates[key] || today : "" },
                        })
                      }
                    />
                    Paid
                  </label>
                  {form.paid[key] && (
                    <div className="space-y-1.5">
                      <Label htmlFor={`paid-${key}`}>Paid date</Label>
                      <Input
                        id={`paid-${key}`}
                        type="date"
                        max={today}
                        disabled={closed}
                        value={form.paidDates[key]}
                        onChange={(event) => setForm({ ...form, paidDates: { ...form.paidDates, [key]: event.target.value } })}
                        className="h-10 bg-white"
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-sm text-[#6e564c]">
            {quoteCents != null && depositTotal != null
              ? `Deposits total ${formatMoney(depositTotal)} against a ${formatMoney(quoteCents)} quote.`
              : "Enter dollar amounts for the quote and each deposit."}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work sequence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <SequenceBuilder sequence={form.sequence} disabled={closed} onChange={(sequence) => setForm({ ...form, sequence })} />
          {job.onCalendar && (
            <div className="space-y-1.5">
              <Label htmlFor="start-date">First work day</Label>
              <Input
                id="start-date"
                type="date"
                disabled={closed}
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                className="h-10 max-w-xs"
              />
              <p className="text-xs leading-5 text-[#6e564c]">
                Saving a new first day or sequence refits this job around everyone else. Re-running the estimator can still move it while it is L1 or L2.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {job.days.length === 0 ? (
            <p className="text-sm text-[#6e564c]">No days placed yet.</p>
          ) : (
            <ul className="divide-y divide-[#e4d5c8]">
              {job.days.map((day) => (
                <li key={day.date} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="font-medium">{formatWeekday(day.date)}</span>
                  <span>{patternLabel(day.pattern)}</span>
                  <span className="text-[#6e564c]">
                    {day.pattern !== "F" && `Shop ${staffName(day.shopStaffId)}`}
                    {day.pattern === "SF" && " · "}
                    {day.pattern !== "S" && `Field ${staffName(day.fieldStaffId)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {!closed && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setConfirming(true)}>
            Remove job
          </Button>
          {!isLocked(job) && (
            <Button type="button" variant="outline" onClick={onEstimate}>
              {job.onCalendar ? "Re-run estimator" : "Send to estimator"}
            </Button>
          )}
          <Button type="button" className="bg-[#a86324] text-white hover:bg-[#8f5420]" onClick={onSave}>
            Save changes
          </Button>
        </div>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove job #{job.number}?</DialogTitle>
            <DialogDescription>
              {job.customerName} will leave the job list and the calendar. This does not touch completed paid jobs.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
              Keep job
            </Button>
            <Button type="button" variant="destructive" onClick={onDelete}>
              Remove job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
