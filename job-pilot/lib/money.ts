const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})

export function formatMoney(cents: number): string {
  return currency.format(cents / 100)
}

export function parseMoney(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,]/g, "")
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null
  const [whole, fraction = ""] = cleaned.split(".")
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2))
  if (!Number.isSafeInteger(cents)) return null
  return cents
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function splitEven(total: number): [number, number, number] {
  const base = Math.floor(total / 3)
  const remainder = total - base * 3
  return [
    base + (remainder > 0 ? 1 : 0),
    base + (remainder > 1 ? 1 : 0),
    base,
  ]
}

export function paymentSum(payments: { amount: number }[]): number {
  return payments.reduce((sum, payment) => sum + payment.amount, 0)
}
