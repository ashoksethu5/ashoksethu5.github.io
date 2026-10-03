"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  deleteJob,
  rerunEstimator,
  saveAndRerun,
  saveDraft,
  scheduleNewJob,
  sendExistingToEstimator,
  updateJob,
  type ActionResult,
} from "@/lib/actions"
import { todayISO } from "@/lib/dates"
import { emptySchedule } from "@/lib/seed"
import type { JobInput, SchedulerData } from "@/lib/types"

const STORAGE_KEY = "refinishpro-scheduler-v2"

type StoreValue = {
  ready: boolean
  data: SchedulerData | null
  scheduleNew: (input: JobInput) => ActionResult
  saveDraft: (input: JobInput) => ActionResult
  updateJob: (id: string, input: JobInput) => ActionResult
  sendToEstimator: (id: string) => ActionResult
  saveAndRerun: (id: string, input: JobInput) => ActionResult
  rerun: () => ActionResult
  removeJob: (id: string) => ActionResult
}

const StoreContext = createContext<StoreValue | null>(null)

function isSchedulerData(value: unknown): value is SchedulerData {
  if (!value || typeof value !== "object") return false
  const data = value as SchedulerData
  return data.version === 1 && Array.isArray(data.jobs) && Array.isArray(data.staff) && Array.isArray(data.timeOff)
}

function loadingResult(): ActionResult {
  return { ok: false, error: "The schedule is still loading." }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<SchedulerData | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw && isSchedulerData(JSON.parse(raw) as unknown)) {
        setData(JSON.parse(raw) as SchedulerData)
        setReady(true)
        return
      }
    } catch {
      // Ignore a broken saved schedule and start empty.
    }
    setData(emptySchedule())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || !data) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data, ready])

  const value = useMemo<StoreValue>(() => {
    const commit = (result: ActionResult): ActionResult => {
      if (result.ok) setData(result.data)
      return result
    }
    return {
      ready,
      data,
      scheduleNew: (input) => (data ? commit(scheduleNewJob(data, input, todayISO())) : loadingResult()),
      saveDraft: (input) => (data ? commit(saveDraft(data, input, todayISO())) : loadingResult()),
      updateJob: (id, input) => (data ? commit(updateJob(data, id, input, todayISO())) : loadingResult()),
      sendToEstimator: (id) =>
        data ? commit(sendExistingToEstimator(data, id, todayISO())) : loadingResult(),
      saveAndRerun: (id, input) =>
        data ? commit(saveAndRerun(data, id, input, todayISO())) : loadingResult(),
      rerun: () => (data ? commit(rerunEstimator(data, todayISO())) : loadingResult()),
      removeJob: (id) => (data ? commit(deleteJob(data, id)) : loadingResult()),
    }
  }, [data, ready])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useScheduler() {
  const store = useContext(StoreContext)
  if (!store) throw new Error("useScheduler must be used within StoreProvider")
  return store
}
