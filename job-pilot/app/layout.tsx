import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"
import { Shell } from "@/components/shell"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "Job scheduler · RefinishPro",
  description:
    "Schedule door refinishing jobs across shop and field crews, keep promised dates, and track scheduled revenue against income.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  )
}
