"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/", label: "Scheduler" },
  { href: "/jobs", label: "Jobs" },
]

function DoorMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="size-5">
      <rect x="7" y="4" width="18" height="24" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="20.5" cy="16.5" r="1.3" fill="currentColor" />
    </svg>
  )
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="bg-[#560e10] text-[13px] text-white/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
          <span>Detroit crew schedule</span>
          <span className="hidden sm:inline">Shop and field · weekdays only</span>
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b border-[#e4d5c8] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="mr-auto flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-[#560e10] text-white">
              <DoorMark />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-wide text-[#241816]">RefinishPro</span>
              <span className="block text-xs text-[#6e564c]">Job scheduler</span>
            </span>
          </Link>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto" aria-label="Primary">
            {LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/" || pathname.startsWith("/calendar")
                  : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap",
                    active ? "bg-[#560e10] text-white" : "text-[#3f2a24] hover:bg-[#f3e8df]",
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
          <Link href="/quotes/new" className={cn(buttonVariants({ size: "lg" }), "bg-[#a86324] text-white hover:bg-[#8f5420]")}>
            New quote
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="border-t border-[#e4d5c8] px-4 py-4 text-center text-xs text-[#6e564c]">
        Jobs stay in this browser. Locked work (L3–L5) stays put when the estimator runs.
      </footer>
    </div>
  )
}
