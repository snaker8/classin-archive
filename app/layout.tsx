import type { Metadata, Viewport } from "next"
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

export const metadata: Metadata = {
  title: 'ClassIn Archive',
  description: '학습 자료 포털',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className={`${outfit.variable} ${manrope.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}
