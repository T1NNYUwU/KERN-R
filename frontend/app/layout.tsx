import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: "KERN-R Studio — Professional Video Editor",
  description: "High-performance browser-based video editing creative studio.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "KERN-R Studio — Professional Video Editor",
    description: "High-performance browser-based video editing creative studio.",
    siteName: "kerntemplate",
    url: "https://kerntemplate.online",
    type: "website",
  },
  alternates: {
    canonical: "https://kerntemplate.online",
  },
  robots: {
    index: true,
    follow: true,
  }
}

import { AuthProvider } from "../contexts/AuthContext"
import { Toaster } from "sonner"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "kerntemplate",
    "url": "https://kerntemplate.online/",
    "description": "High-performance browser-based video editing creative studio."
  }

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full w-full overflow-hidden bg-[#09090d] text-white" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <AuthProvider>
          {children}
          <Toaster theme="dark" position="top-right" closeButton richColors />
        </AuthProvider>
      </body>
    </html>
  )
}
