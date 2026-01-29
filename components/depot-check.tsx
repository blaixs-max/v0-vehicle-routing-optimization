"use client"

import React from "react"

import { useDepotStore } from "@/lib/depot-store"
import { useDepots } from "@/lib/hooks/use-depot-data"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

export function DepotCheck({ children }: { children: React.ReactNode }) {
  const selectedDepotId = useDepotStore((state) => state.selectedDepotId)
  const setSelectedDepot = useDepotStore((state) => state.setSelectedDepot)
  const clearSelectedDepot = useDepotStore((state) => state.clearSelectedDepot)
  const { data: depots, isLoading } = useDepots()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Clean up ALL old storage keys on mount (one-time cleanup)
    if (typeof window !== 'undefined') {
      const oldKeys = ['depot-selection', 'depot-selection-v2']
      oldKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          console.log(`[v0] Removing old storage key: ${key}`)
          localStorage.removeItem(key)
        }
      })
    }

    // FORCE FIX: If depot-3 is selected, force change to depot-2 (Ankara Depo)
    if (selectedDepotId === 'depot-3' && typeof window !== 'undefined') {
      console.log("[v0] 🔧 FORCE FIX: depot-3 detected, switching to depot-2 (Ankara Depo)")
      // Force set depot-2
      setSelectedDepot('depot-2')
      console.log("[v0] ✅ Forced depot selection to depot-2")
      window.location.reload() // Force page reload to apply changes
      return
    }

    // If depots are loaded, validate the selected depot
    if (depots && depots.length > 0) {
      if (selectedDepotId) {
        const isValidDepot = depots.some(d => d.id === selectedDepotId)
        if (!isValidDepot) {
          console.log("[v0] ⚠️ INVALID DEPOT ID - Old hardcoded format detected")
          console.log("[v0] Stored depot ID:", selectedDepotId)
          console.log("[v0] Valid depot IDs:", depots.map(d => d.id))
          console.log("[v0] Clearing invalid depot and redirecting to selection...")
          clearSelectedDepot()
          // Clear localStorage manually to ensure it's reset
          if (typeof window !== 'undefined') {
            localStorage.removeItem('depot-selection')
            localStorage.removeItem('depot-selection-v2')
          }
          router.push("/select-depot")
          return
        }
      }
    }
    
    // If no depot selected and not already on select-depot page, redirect
    if (!selectedDepotId && pathname !== "/select-depot" && depots && depots.length > 0) {
      console.log("[v0] No depot selected, redirecting to selection page...")
      router.push("/select-depot")
    }
  }, [selectedDepotId, depots, pathname, router, clearSelectedDepot, setSelectedDepot])

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
