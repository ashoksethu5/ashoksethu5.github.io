"use client"

import { useState } from "react"
import { toast } from "sonner"
import { BoardSkeleton } from "@/components/board-skeleton"
import { Button } from "@/components/ui/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatMedium, todayISO } from "@/lib/dates"
import { holidaysForYear } from "@/lib/holidays"
import { useScheduler } from "@/lib/store"
import type { TimeOffKind } from "@/lib/types"

export function StaffBoard() {
  const { ready, data, addStaff, renameStaff, removeStaff, addTimeOff, removeTimeOff, reset } = useScheduler()
  const [name, setName] = useState("")
  const [draftNames, setDraftNames] = useState<Record<string, string>>({})
  const [staffId, setStaffId] = useState("")
  const [kind, setKind] = useState<TimeOffKind>("vacation")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  if (!ready || !data) return <BoardSkeleton />

  const today = todayISO()
  const year = Number(today.slice(0, 4))
  const holidays = [...holidaysForYear(year).entries()].sort((a, b) => a[0].localeCompare(b[0]))
  const people = data.staff.map((person) => ({ value: person.id, label: person.name }))
  const selectedStaff = staffId || data.staff[0]?.id || ""

  function report(result: { ok: boolean; error?: string; warnings?: string[] }, success: string) {
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.")
      toast.error(result.error ?? "Something went wrong.")
      return
    }
    setError(null)
    toast.success(success)
    for (const warning of result.warnings ?? []) toast.warning(warning)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6e564c]">
          Everyone can work shop or field, but only one of those on a given day. Block vacation or sick time for a stretch of days, and the estimator will move unlocked jobs around it.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-900 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      <section className="rounded-xl bg-white p-4 ring-1 ring-[#e4d5c8] sm:p-5">
        <h2 className="text-lg font-semibold">Crew · {data.staff.length}</h2>
        {data.staff.length === 0 ? (
          <p className="mt-2 text-sm text-[#6e564c]">No one is on the crew yet. Add a name to open up calendar capacity.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#e4d5c8]">
            {data.staff.map((person) => (
              <li key={person.id} className="flex flex-wrap items-center gap-2 py-3">
                <Label htmlFor={`staff-${person.id}`} className="sr-only">
                  Name for {person.name}
                </Label>
                <Input
                  id={`staff-${person.id}`}
                  value={draftNames[person.id] ?? person.name}
                  onChange={(event) => setDraftNames({ ...draftNames, [person.id]: event.target.value })}
                  className="h-10 max-w-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const result = renameStaff(person.id, draftNames[person.id] ?? person.name)
                    report(result, "Name updated.")
                  }}
                >
                  Save name
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    const result = removeStaff(person.id)
                    report(result, `${person.name} removed.`)
                  }}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const result = addStaff(name)
            if (result.ok) setName("")
            report(result, "Added to the crew.")
          }}
        >
          <Label htmlFor="new-staff" className="sr-only">
            New staff name
          </Label>
          <Input id="new-staff" value={name} onChange={(event) => setName(event.target.value)} placeholder="Staff F" className="h-10 max-w-xs" />
          <Button type="submit" className="bg-[#560e10] text-white hover:bg-[#3f0a0c]">
            Add person
          </Button>
        </form>
      </section>

      <section className="rounded-xl bg-white p-4 ring-1 ring-[#e4d5c8] sm:p-5">
        <h2 className="text-lg font-semibold">Time off</h2>
        <p className="mt-1 text-sm text-[#6e564c]">Use a date range for several vacation or sick days in a row.</p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6"
          onSubmit={(event) => {
            event.preventDefault()
            const result = addTimeOff({ staffId: selectedStaff, start, end, kind, note })
            if (result.ok) {
              setStart("")
              setEnd("")
              setNote("")
            }
            report(result, "Time off added.")
          }}
        >
          <div className="space-y-1.5 lg:col-span-2">
            <Label>Person</Label>
            <Select
              items={people}
              value={selectedStaff}
              onValueChange={(value) => setStaffId(value ?? "")}
              disabled={people.length === 0}
            >
              <SelectTrigger className="h-10 w-full" aria-label="Person">
                <SelectValue placeholder="Choose someone" />
              </SelectTrigger>
              <SelectContent>
                {people.map((person) => (
                  <SelectItem key={person.value} value={person.value}>
                    {person.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="off-kind">Type</Label>
            <Select
              items={[
                { value: "vacation", label: "Vacation" },
                { value: "sick", label: "Sick" },
              ]}
              value={kind}
              onValueChange={(value) => setKind((value as TimeOffKind) ?? "vacation")}
            >
              <SelectTrigger id="off-kind" className="h-10 w-full" aria-label="Time off type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="sick">Sick</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="off-start">Start</Label>
            <Input id="off-start" type="date" value={start} onChange={(event) => setStart(event.target.value)} className="h-10" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="off-end">End</Label>
            <Input id="off-end" type="date" value={end} onChange={(event) => setEnd(event.target.value)} className="h-10" required />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label htmlFor="off-note">Note</Label>
            <Input id="off-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Family trip" className="h-10" />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="bg-[#a86324] text-white hover:bg-[#8f5420]" disabled={!selectedStaff}>
              Block days
            </Button>
          </div>
        </form>

        {data.timeOff.length === 0 ? (
          <p className="mt-4 text-sm text-[#6e564c]">No vacation or sick days are on the books.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#e4d5c8]">
            {[...data.timeOff]
              .sort((a, b) => a.start.localeCompare(b.start))
              .map((entry) => {
                const person = data.staff.find((item) => item.id === entry.staffId)
                return (
                  <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {person?.name ?? "Former crew"} · {entry.kind === "sick" ? "Sick" : "Vacation"}
                      </p>
                      <p className="text-[#6e564c]">
                        {formatMedium(entry.start)} – {formatMedium(entry.end)}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </p>
                    </div>
                    <Button type="button" variant="ghost" onClick={() => report(removeTimeOff(entry.id), "Time off removed.")}>
                      Remove
                    </Button>
                  </li>
                )
              })}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 ring-1 ring-[#e4d5c8] sm:p-5">
        <h2 className="text-lg font-semibold">{year} holidays</h2>
        <p className="mt-1 text-sm text-[#6e564c]">These days are blocked. If a holiday falls on a weekend, the observed weekday is closed instead.</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {holidays.map(([date, holiday]) => (
            <li key={date} className={date < today ? "text-sm text-[#a8988c]" : "text-sm text-[#241816]"}>
              <span className="font-medium">{holiday}</span>
              <span className="text-[#6e564c]"> · {formatMedium(date)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl bg-[#f8efe7] p-4 ring-1 ring-[#e4d5c8]">
        <h2 className="text-sm font-semibold">Sample schedule</h2>
        <p className="mt-1 text-sm leading-6 text-[#6e564c]">
          Reset brings back the Detroit sample jobs, five crew, and one vacation. Anything you&apos;ve added in this browser is replaced.
        </p>
        <Button type="button" variant="outline" className="mt-3" onClick={() => setConfirmReset(true)}>
          Reset sample data
        </Button>
      </section>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset the sample schedule?</DialogTitle>
            <DialogDescription>
              Jobs, crew names, and time off saved in this browser will be replaced with the original sample.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#560e10] text-white hover:bg-[#3f0a0c]"
              onClick={() => {
                reset()
                setConfirmReset(false)
                setDraftNames({})
                toast.success("Sample schedule restored.")
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
