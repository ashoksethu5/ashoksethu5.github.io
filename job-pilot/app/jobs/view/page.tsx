"use client"

import Link from "next/link"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { BoardSkeleton } from "@/components/board-skeleton"
import { JobEditor } from "@/components/job-editor"
import { buttonVariants } from "@/components/ui/button"
import { useScheduler } from "@/lib/store"
import { cn } from "@/lib/utils"

function JobPage() {
  const params = useSearchParams()
  const id = params.get("id") ?? ""
  const { ready, data } = useScheduler()

  if (!ready || !data) return <BoardSkeleton />

  const job = data.jobs.find((item) => item.id === id)
  if (!job) {
    return (
      <div className="rounded-xl bg-white px-6 py-12 text-center ring-1 ring-[#e4d5c8]">
        <h1 className="text-xl font-semibold">This job isn&apos;t on the schedule</h1>
        <p className="mt-2 text-sm text-[#6e564c]">It may have been removed in this browser.</p>
        <Link href="/" className={cn(buttonVariants(), "mt-4")}>
          Back to jobs
        </Link>
      </div>
    )
  }

  return <JobEditor key={job.id} job={job} />
}

export default function JobRoute() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <JobPage />
    </Suspense>
  )
}
