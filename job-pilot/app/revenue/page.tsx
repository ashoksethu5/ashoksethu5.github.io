import { Suspense } from "react"
import { BoardSkeleton } from "@/components/board-skeleton"
import { RevenueBoard } from "@/components/revenue-board"

export default function RevenuePage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <RevenueBoard />
    </Suspense>
  )
}
