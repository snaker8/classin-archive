import type { Metadata } from "next"
import { Outfit, Manrope } from "next/font/google"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: '--font-outfit',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ["latin"],
  variable: '--font-manrope',
  display: 'swap',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${outfit.variable} ${manrope.variable}`}>
      <body className={manrope.className}>{children}</body>
    </html>
  )
}
