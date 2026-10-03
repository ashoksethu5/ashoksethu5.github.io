import { Suspense } from "react"
import { BoardSkeleton } from "@/components/board-skeleton"
import { CalendarBoard } from "@/components/calendar-board"

export default function CalendarPage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <CalendarBoard />
    </Suspense>
  )
}
