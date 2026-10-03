export function BoardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-8 w-48 rounded-lg bg-[#eadfd4]" />
      <div className="h-28 rounded-xl bg-[#eadfd4]" />
      <div className="h-80 rounded-xl bg-[#eadfd4]" />
      <p className="sr-only">Loading the schedule</p>
    </div>
  )
}
