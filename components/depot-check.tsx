"use client"

import React from "react"

import { useDepotStore } from "@/lib/depot-store"
import { useDepots } from "@/lib/hooks/use-depot-data"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

export function DepotCheck({ children }: { children: React.ReactNode }) {
  const selectedDepotId = useDepotStore((state) => state.selectedDepotId)
  const clearSelectedDepot = useDepotStore((state) => state.clearSelectedDepot)
  const { data: depots, isLoading } = useDepots()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // If depots are loaded, validate the selected depot
    if (depots && depots.length > 0) {
      if (selectedDepotId) {
        const isValidDepot = depots.some(d => d.id === selectedDepotId)
        if (!isValidDepot) {
          console.log("[v0] Invalid depot ID detected (old format), clearing:", selectedDepotId)
          clearSelectedDepot()
          // Will redirect to select-depot on next render
          return
        }
      }
    }
    
    // If no depot selected and not already on select-depot page, redirect
    if (!selectedDepotId && pathname !== "/select-depot" && depots && depots.length > 0) {
      router.push("/select-depot")
    }
  }, [selectedDepotId, depots, pathname, router, clearSelectedDepot])

  // Show loading state while checking depots
  if (isLoading) {
    return null
  }

  // If no depot selected, don't render children (will redirect)
  if (!selectedDepotId && pathname !== "/select-depot") {
    return null
  }

  return <>{children}</>
}
