import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: "KERN-R Studio — Video Editor",
  description: "Professional browser-based video editor",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full w-full overflow-hidden bg-[#09090d] text-white" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
