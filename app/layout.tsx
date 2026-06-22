import type { Metadata } from "next"
import "./globals.css"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { QueryProvider } from "@/components/providers/QueryProvider"
import { Toaster } from "@/components/providers/ToastProvider"

export const metadata: Metadata = {
  title: "MOTM KAM Portal",
  description: "Key Account Management Operations Portal — MOTM Technologies",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-slate-100">
        <SessionProvider>
          <QueryProvider>
            <Toaster>
              {children}
            </Toaster>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
