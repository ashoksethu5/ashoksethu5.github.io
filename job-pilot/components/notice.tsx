import { cn } from "@/lib/utils"

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "locked" | "danger"
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-4 py-3 text-sm leading-6 ring-1",
        tone === "info" && "bg-[#f8efe7] text-[#3f2a24] ring-[#e4d5c8]",
        tone === "warning" && "bg-amber-50 text-amber-950 ring-amber-200",
        tone === "locked" && "bg-[#560e10]/6 text-[#560e10] ring-[#560e10]/15",
        tone === "danger" && "bg-rose-50 text-rose-900 ring-rose-200",
      )}
    >
      {children}
    </div>
  )
}
