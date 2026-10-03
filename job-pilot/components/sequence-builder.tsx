import { Button } from "@/components/ui/button"
import { formatSequence, patternLabel, peakCrew, type Pattern } from "@/lib/types"
import { cn } from "@/lib/utils"

const OPTIONS: { value: Pattern; code: string; label: string }[] = [
  { value: "S", code: "S", label: "Shop" },
  { value: "F", code: "F", label: "Field" },
  { value: "SF", code: "SF", label: "Both" },
]

export function SequenceBuilder({
  sequence,
  onChange,
  disabled = false,
}: {
  sequence: Pattern[]
  onChange: (sequence: Pattern[]) => void
  disabled?: boolean
}) {
  const peak = peakCrew(sequence)

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-[#6e564c] uppercase">S/F day sequence</p>
          <p className="mt-1 font-mono text-sm text-[#241816]">{formatSequence(sequence) || "Add a day"}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || sequence.length >= 40}
          onClick={() => onChange([...sequence, "F"])}
        >
          Add day
        </Button>
      </div>
      <div className="space-y-2">
        {sequence.map((pattern, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2 rounded-xl bg-[#f8efe7] px-3 py-2">
            <span className="w-12 text-xs font-semibold tracking-wide text-[#6e564c] uppercase">Day {index + 1}</span>
            <div className="flex flex-1 gap-1" role="group" aria-label={`Day ${index + 1} work type`}>
              {OPTIONS.map((option) => {
                const selected = pattern === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => {
                      const next = [...sequence]
                      next[index] = option.value
                      onChange(next)
                    }}
                    className={cn(
                      "h-8 flex-1 rounded-lg px-2 text-xs font-medium transition-colors disabled:opacity-50",
                      selected ? "bg-[#560e10] text-white" : "bg-white text-[#3f2a24] ring-1 ring-[#e4d5c8] hover:bg-white",
                    )}
                  >
                    {option.code} {option.label}
                  </button>
                )
              })}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || sequence.length === 1}
              aria-label={`Remove day ${index + 1}`}
              onClick={() => onChange(sequence.filter((_, dayIndex) => dayIndex !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-[#e4d5c8]">
        <p className="text-xs font-semibold tracking-[0.14em] text-[#6e564c] uppercase">Staff required</p>
        <p className="mt-1 text-sm text-[#241816]">
          Peak: {peak} {peak === 1 ? "person" : "people"} / day
          {peak > 1 ? ". Shop + field days need one person in the shop and one in the field." : ". A single S or F day needs one person."}
        </p>
        <p className="mt-1 text-xs text-[#6e564c]">
          {sequence.map((pattern) => patternLabel(pattern)).join(" · ") || "Choose shop, field, or both for each work day."} Weekends and holidays are skipped when this lands on the calendar.
        </p>
      </div>
    </div>
  )
}
