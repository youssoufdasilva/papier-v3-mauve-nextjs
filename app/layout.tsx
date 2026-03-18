import { Geist_Mono, Outfit } from "next/font/google"

import "./globals.css"
import { ServiceWorkerRegister } from "@/components/papier/service-worker-register"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("antialiased", fontMono.variable, "font-sans", outfit.variable)}>
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <ServiceWorkerRegister />
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
