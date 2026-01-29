"use client"

import React from "react"

import { useDepotStore } from "@/lib/depot-store"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

export function DepotCheck({ children }: { children: React.ReactNode }) {
  const selectedDepotId = useDepotStore((state) => state.selectedDepotId)
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    console.log("[v0] Depot Check - selectedDepotId:", selectedDepotId, "pathname:", pathname)
    
    // Give time for state to initialize
    const timer = setTimeout(() => {
      setIsChecking(false)
      
      // If no depot selected and not already on select-depot page, redirect
      if (!selectedDepotId && pathname !== "/select-depot") {
        console.log("[v0] Redirecting to /select-depot")
        router.push("/select-depot")
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [selectedDepotId, pathname, router])

  // Show loading during initial check
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Yükleniyor...</p>
        </div>
      </div>
    )
  }

  // If no depot selected and not on select-depot page, show loading
  if (!selectedDepotId && pathname !== "/select-depot") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Depo seçim sayfasına yönlendiriliyor...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
