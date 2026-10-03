"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { BoardSkeleton } from "@/components/board-skeleton"
import { SequenceBuilder } from "@/components/sequence-builder"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { todayISO } from "@/lib/dates"
import { centsToInput, formatMoney, parseMoney, splitEven } from "@/lib/money"
import { useScheduler } from "@/lib/store"
import type { JobInput, Pattern } from "@/lib/types"

const EMPTY_PAYMENTS = { p1: "", p2: "", p3: "" }

export function QuoteForm() {
  const router = useRouter()
  const { ready, scheduleNew, saveDraft } = useScheduler()
  const [customerName, setCustomerName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [quote, setQuote] = useState("")
  const [promiseDate, setPromiseDate] = useState("")
  const [deposits, setDeposits] = useState(EMPTY_PAYMENTS)
  const [splitEdited, setSplitEdited] = useState(false)
  const [sequence, setSequence] = useState<Pattern[]>(["F", "SF", "F"])
  const [error, setError] = useState<string | null>(null)

  if (!ready) return <BoardSkeleton />

  const quoteCents = parseMoney(quote)
  const depositCents = {
    p1: parseMoney(deposits.p1),
    p2: parseMoney(deposits.p2),
    p3: parseMoney(deposits.p3),
  }
  const depositReady = depositCents.p1 != null && depositCents.p2 != null && depositCents.p3 != null
  const depositTotal = depositReady ? depositCents.p1! + depositCents.p2! + depositCents.p3! : null
  const balanced = quoteCents != null && depositTotal != null && quoteCents === depositTotal

  function updateQuote(value: string) {
    setQuote(value)
    const cents = parseMoney(value)
    if (cents != null && !splitEdited) {
      const [p1, p2, p3] = splitEven(cents)
      setDeposits({ p1: centsToInput(p1), p2: centsToInput(p2), p3: centsToInput(p3) })
    }
  }

  function updateDeposit(key: "p1" | "p2" | "p3", value: string) {
    setSplitEdited(true)
    setDeposits((current) => ({ ...current, [key]: value }))
  }

  function splitQuote() {
    if (quoteCents == null) {
      setError("Enter the quote amount before splitting the deposits.")
      return
    }
    const [p1, p2, p3] = splitEven(quoteCents)
    setDeposits({ p1: centsToInput(p1), p2: centsToInput(p2), p3: centsToInput(p3) })
    setSplitEdited(false)
    setError(null)
  }

  function buildInput(): JobInput | null {
    if (quoteCents == null || depositCents.p1 == null || depositCents.p2 == null || depositCents.p3 == null) {
      setError("Enter the quote and all three deposits in dollars, like 4800 or 1600.50.")
      return null
    }
    setError(null)
    return {
      customerName,
      phone,
      email,
      address,
      quote: quoteCents,
      promiseDate,
      sequence,
      stage: "L1",
      startDate: null,
      payments: {
        p1: { amount: depositCents.p1, paid: false, paidDate: null },
        p2: { amount: depositCents.p2, paid: false, paidDate: null },
        p3: { amount: depositCents.p3, paid: false, paidDate: null },
      },
    }
  }

  function onDraft() {
    const input = buildInput()
    if (!input) return
    const result = saveDraft(input)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success("Draft saved. It is not on the calendar yet.")
    router.push(`/jobs/${result.jobId}`)
  }

  function onSchedule() {
    const input = buildInput()
    if (!input) return
    const result = scheduleNew({ ...input, stage: "L2" })
    if (!result.ok) {
      setError(result.error)
      toast.error(result.error)
      return
    }
    toast.success("Job placed on the calendar.")
    for (const warning of result.warnings) toast.warning(warning)
    router.push(`/calendar?job=${result.jobId}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New job — quote entry</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6e564c]">
            Capture the quote, the promised delivery date, the deposit split, and the shop/field sequence. Sending it to the estimator places the work on the next open crew days.
          </p>
        </div>
        <span className="rounded-full border border-dashed border-[#560e10] px-3 py-1 text-xs font-medium text-[#560e10]">
          L1 · Draft
        </span>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quote</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl bg-[#f8efe7] p-4">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#6e564c] uppercase">Customer</p>
              <div className="space-y-1.5">
                <Label htmlFor="customer-name">Name</Label>
                <Input id="customer-name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Maria Alvarez" className="h-10 bg-white" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="customer-phone">Phone</Label>
                  <Input id="customer-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(313) 555-0142" className="h-10 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input id="customer-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="maria@email.com" className="h-10 bg-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer-address">Address</Label>
                <Input id="customer-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="1842 Seminole St, Detroit, MI" className="h-10 bg-white" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quote-amount">Quote amount (Q)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#6e564c]">$</span>
                <Input id="quote-amount" inputMode="decimal" value={quote} onChange={(event) => updateQuote(event.target.value)} placeholder="4800" className="h-10 pl-7" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promise-date">Committed delivery date (D)</Label>
              <Input id="promise-date" type="date" value={promiseDate} onChange={(event) => setPromiseDate(event.target.value)} className="h-10" />
              <p className="text-xs text-[#6e564c]">The estimator tries to finish on or before this date.</p>
            </div>

            <div className="space-y-3 rounded-xl bg-[#f8efe7] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold tracking-[0.14em] text-[#6e564c] uppercase">Deposit split · P1 + P2 + P3 = Q</p>
                <Button type="button" variant="outline" size="sm" onClick={splitQuote}>
                  Split evenly
                </Button>
              </div>
              {(["p1", "p2", "p3"] as const).map((key, index) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`deposit-${key}`}>
                    {key.toUpperCase()} · {["First deposit, at acceptance", "Second deposit, when work starts", "Final payment, when work is done"][index]}
                  </Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-[#6e564c]">$</span>
                    <Input
                      id={`deposit-${key}`}
                      inputMode="decimal"
                      value={deposits[key]}
                      onChange={(event) => updateDeposit(key, event.target.value)}
                      className="h-10 bg-white pl-7"
                    />
                  </div>
                </div>
              ))}
              <p className={balanced ? "text-sm text-emerald-800" : "text-sm text-[#6e564c]"} role="status">
                {depositTotal == null || quoteCents == null
                  ? "The three deposits have to add up to the quote."
                  : balanced
                    ? `Deposits match the quote at ${formatMoney(quoteCents)}.`
                    : `Deposits total ${formatMoney(depositTotal)}. They need to equal ${formatMoney(quoteCents)}.`}
              </p>
            </div>
          </div>
          <SequenceBuilder sequence={sequence} onChange={setSequence} />
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDraft}>
            Save draft
          </Button>
          <Button type="button" className="bg-[#a86324] text-white hover:bg-[#8f5420]" onClick={onSchedule}>
            Send to estimator
          </Button>
        </CardFooter>
      </Card>
      <p className="text-xs text-[#6e564c]">Paid dates can&apos;t be later than today ({todayISO()}). Amounts lock once a deposit is marked paid.</p>
    </div>
  )
}
