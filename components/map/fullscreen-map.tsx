"use client"

import { useEffect, useRef, useState } from "react"
import type { Depot, Vehicle, Customer } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { Warehouse, Users, Layers } from "lucide-react"

interface FullscreenMapProps {
  depots: Depot[]
  vehicles: Vehicle[]
  customers: Customer[]
  loading: boolean
}

export function FullscreenMap({ depots, vehicles, customers, loading }: FullscreenMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const layersRef = useRef<{ depots: any; vehicles: any; customers: any } | null>(null)
  const [mapReady, setMapReady] = useState(false)

  const [showDepots, setShowDepots] = useState(true)
  const [showVehicles, setShowVehicles] = useState(true)
  const [showCustomers, setShowCustomers] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link")
      link.id = "leaflet-css"
      link.rel = "stylesheet"
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(link)
    }

    if (!document.getElementById("leaflet-js")) {
      const script = document.createElement("script")
      script.id = "leaflet-js"
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      script.onload = () => setMapReady(true)
      document.head.appendChild(script)
    } else if ((window as any).L) {
      setMapReady(true)
    }
  }, [])

  // Harita olustur
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return
    const L = (window as any).L
    if (!L) return

    mapInstanceRef.current = L.map(mapRef.current).setView([39.9334, 32.8597], 6)

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(mapInstanceRef.current)

    layersRef.current = {
      depots: L.layerGroup().addTo(mapInstanceRef.current),
      vehicles: L.layerGroup().addTo(mapInstanceRef.current),
      customers: L.layerGroup().addTo(mapInstanceRef.current),
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [mapReady])

  // Markerlari guncelle
  useEffect(() => {
    if (!mapReady || !layersRef.current) return
    const L = (window as any).L
    if (!L) return

    // Depo layer
    layersRef.current.depots.clearLayers()
    if (showDepots) {
      depots.forEach((depot) => {
        const icon = L.divIcon({
          className: "custom-icon",
          html: `<div style="background:#1E40AF;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7v10l10 5 10-5V7L12 2z"/></svg>
          </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })

        L.marker([depot.lat, depot.lng], { icon })
          .bindPopup(`<strong>${depot.name}</strong><br/>${depot.city}<br/>Kapasite: ${depot.capacity} palet`)
          .addTo(layersRef.current!.depots)
      })
    }

    // Customer layer
    layersRef.current.customers.clearLayers()
    if (showCustomers) {
      customers.forEach((customer) => {
        const icon = L.divIcon({
          className: "custom-icon",
          html: `<div style="background:#F97316;width:20px;height:20px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.2);"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })

        L.marker([customer.lat, customer.lng], { icon })
          .bindPopup(
            `<strong>${customer.name}</strong><br/>${customer.address}<br/>Talep: ${customer.demand_pallet} palet`,
          )
          .addTo(layersRef.current!.customers)
      })
    }
  }, [depots, customers, showDepots, showCustomers, showVehicles, mapReady])

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Filter Controls */}
      <div className="absolute top-4 right-4 z-[1000]">
        <Button variant="secondary" size="icon" onClick={() => setShowFilters(!showFilters)} className="shadow-lg">
          <Layers className="w-4 h-4" />
        </Button>

        {showFilters && (
          <Card className="absolute top-12 right-0 p-4 w-48 shadow-lg">
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={showDepots} onCheckedChange={(checked) => setShowDepots(checked as boolean)} />
                <Warehouse className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Depolar</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={showCustomers} onCheckedChange={(checked) => setShowCustomers(checked as boolean)} />
                <Users className="w-4 h-4 text-orange-500" />
                <span className="text-sm">Musteriler</span>
              </label>
            </div>
          </Card>
        )}
      </div>

      {(loading || !mapReady) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-[1000]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}
    </div>
  )
}
