import { Suspense } from "react"
import { BoardSkeleton } from "@/components/board-skeleton"
import { CalendarBoard } from "@/components/calendar-board"

export default function HomePage() {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <CalendarBoard />
    </Suspense>
  )
}
